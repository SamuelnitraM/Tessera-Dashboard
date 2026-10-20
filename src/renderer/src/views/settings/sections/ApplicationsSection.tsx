import { useState } from 'react'
import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  FolderOpen,
  Globe,
  List,
  Plus,
  ShieldOff,
  SquareArrowOutUpRight,
  Trash2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UserApp } from '@shared/user-apps'
import { normalizeWebUrl, OPEN_IN_TESSERA, WEB_APP_PRESETS, type WebApp } from '@shared/web-apps'
import { AppIcon } from '../../../components/AppIcon'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { useDeleteApp } from '../../../hooks/useDeleteApp'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useBrowsers } from '../../../hooks/useBrowsers'
import { useNavigationStore } from '../../../stores/navigation'
import { pickInstalledApp } from '../../../stores/programPicker'
import { useSettingsStore } from '../../../stores/settings'
import styles from '../settings.module.css'
import { SettingRow, SettingsCard } from '../SettingRow'

/**
 * Applications de l'utilisateur, dans l'ordre du menu latéral : applications web (sites) et
 * applications installées (programmes du PC). Ajout, modification, ordre et suppression.
 */
export function ApplicationsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const apps = useSettingsStore((state) => state.settings.apps.items)
  const update = useSettingsStore((state) => state.update)
  const navigate = useNavigationStore((state) => state.navigate)
  const [toDelete, setToDelete] = useState<UserApp | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)
  const browsers = useBrowsers()

  const save = (items: UserApp[]): void => void update({ apps: { items } })

  const addApp = (name: string, url: string): void => {
    const app: WebApp = {
      kind: 'web',
      id: crypto.randomUUID(),
      name,
      url,
      icon: null,
      openWith: OPEN_IN_TESSERA
    }
    save([...apps, app])
  }

  const patchApp = (id: string, patch: Partial<WebApp> | { name: string }): void =>
    save(apps.map((app) => (app.id === id ? ({ ...app, ...patch } as UserApp) : app)))

  const move = (index: number, offset: -1 | 1): void => {
    const items = [...apps]
    const [app] = items.splice(index, 1)
    items.splice(index + offset, 0, app)
    save(items)
  }

  // Application installée fermée, connexion d'une application web effacée
  const deleteApp = useDeleteApp()
  const onQuit = useSettingsStore((state) => state.settings.apps.onQuit)

  /** Application installée choisie avec la fenêtre de sélection de Windows. */
  const pickExe = async (): Promise<void> => {
    setPickError(null)
    try {
      await window.tessera.desktopApps.pick()
    } catch (error) {
      setPickError(
        (error as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '')
      )
    }
  }

  return (
    <>
      <p className={styles.sectionIntro}>{t('settings.applications.intro')}</p>
      {browsers.length > 0 && (
        <p className={styles.sectionIntro}>{t('settings.applications.browserHint')}</p>
      )}

      {apps.length > 0 && (
        <ul className={styles.appList}>
          {apps.map((app, index) => (
            <li key={app.id} className={styles.appRow}>
              <span className={styles.appIcon}>
                <AppIcon app={app} size={22} />
              </span>
              <div className={styles.appFields}>
                <input
                  className={styles.input}
                  defaultValue={app.name}
                  maxLength={40}
                  aria-label={t('settings.applications.name')}
                  onBlur={(event) => {
                    const name = event.currentTarget.value.trim()
                    if (name && name !== app.name) patchApp(app.id, { name })
                    else event.currentTarget.value = app.name
                  }}
                />
                {app.kind === 'web' ? (
                  <>
                    <UrlInput
                      value={app.url}
                      onCommit={(url) => url !== app.url && patchApp(app.id, { url, icon: null })}
                    />
                    {/* Onglet de Tessera, ou fenêtre d'un navigateur installé (Brave…) */}
                    <select
                      className={styles.input}
                      value={
                        browsers.some((browser) => browser.id === app.openWith)
                          ? app.openWith
                          : OPEN_IN_TESSERA
                      }
                      aria-label={t('settings.applications.openWith')}
                      title={t('settings.applications.openWith')}
                      onChange={(event) => patchApp(app.id, { openWith: event.target.value })}
                    >
                      <option value={OPEN_IN_TESSERA}>{t('settings.applications.tessera')}</option>
                      {browsers.map((browser) => (
                        <option key={browser.id} value={browser.id}>
                          {browser.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  // Le programme lancé ne se modifie pas : on supprime et on rajoute l'application
                  <p className={styles.appPath} title={`${app.path} ${app.args}`.trim()}>
                    <AppWindow size={13} aria-hidden />
                    {t('settings.applications.installed')} · {app.path}
                  </p>
                )}
              </div>
              <div className={styles.appActions}>
                <IconButton
                  icon={ArrowUp}
                  label={t('settings.applications.moveUp')}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                />
                <IconButton
                  icon={ArrowDown}
                  label={t('settings.applications.moveDown')}
                  disabled={index === apps.length - 1}
                  onClick={() => move(index, 1)}
                />
                <IconButton
                  icon={SquareArrowOutUpRight}
                  label={t('settings.applications.open')}
                  onClick={() => navigate({ type: 'app', appId: app.id })}
                />
                {app.kind === 'web' && (
                  <IconButton
                    icon={ShieldOff}
                    label={t('settings.applications.resetPermissions')}
                    onClick={() => void window.tessera.web.resetPermissions(app.id)}
                  />
                )}
                <IconButton
                  icon={Trash2}
                  label={t('settings.applications.delete')}
                  danger
                  onClick={() => setToDelete(app)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <SettingsCard>
        <SettingRow
          label={t('settings.applications.onQuit.label')}
          description={t('settings.applications.onQuit.description')}
        >
          {({ labelId }) => (
            <Select
              aria-labelledby={labelId}
              value={onQuit}
              onChange={(value) => void update({ apps: { onQuit: value } })}
              options={[
                { value: 'close', label: t('settings.applications.onQuit.close') },
                { value: 'restore', label: t('settings.applications.onQuit.restore') }
              ]}
            />
          )}
        </SettingRow>
      </SettingsCard>

      <SettingsCard title={t('settings.applications.addInstalledTitle')}>
        <p className={styles.cardIntro}>{t('settings.applications.installedIntro')}</p>
        <div className={styles.installedActions}>
          <Button variant="primary" icon={List} onClick={() => void pickInstalledApp()}>
            {t('settings.applications.fromStartMenu')}
          </Button>
          <Button icon={FolderOpen} onClick={() => void pickExe()}>
            {t('settings.applications.fromFile')}
          </Button>
        </div>
        {pickError && <p className={styles.extensionError}>{pickError}</p>}
      </SettingsCard>

      <SettingsCard title={t('settings.applications.addTitle')}>
        <div className={styles.presets}>
          {WEB_APP_PRESETS.map((preset) => {
            const added = apps.some(
              (app) => app.kind === 'web' && app.url === normalizeWebUrl(preset.url)
            )
            return (
              <button
                key={preset.url}
                type="button"
                className={styles.preset}
                disabled={added}
                onClick={() => addApp(preset.name, normalizeWebUrl(preset.url)!)}
              >
                {added ? '✓' : <Plus size={14} aria-hidden />}
                {preset.name}
              </button>
            )
          })}
        </div>
        <CustomAppForm onAdd={addApp} />
      </SettingsCard>

      <ConfirmDialog
        open={toDelete !== null}
        title={t('settings.applications.deleteTitle', { name: toDelete?.name ?? '' })}
        message={
          toDelete?.kind === 'desktop'
            ? t('settings.applications.deleteInstalledMessage')
            : t('settings.applications.deleteMessage')
        }
        onClose={() => setToDelete(null)}
        actions={[
          { label: t('settings.applications.cancel'), onClick: () => setToDelete(null) },
          {
            label: t('settings.applications.delete'),
            variant: 'danger',
            onClick: () => {
              if (toDelete) void deleteApp(toDelete)
              setToDelete(null)
            }
          }
        ]}
      />
    </>
  )
}

/** Adresse modifiable, validée en quittant le champ. */
function UrlInput({
  value,
  onCommit
}: {
  value: string
  onCommit: (url: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [invalid, setInvalid] = useState(false)
  return (
    <input
      className={styles.input}
      defaultValue={value}
      data-invalid={invalid}
      aria-label={t('settings.applications.url')}
      aria-invalid={invalid}
      onChange={() => setInvalid(false)}
      onBlur={(event) => {
        const url = normalizeWebUrl(event.currentTarget.value)
        if (!url) {
          setInvalid(true)
          return
        }
        event.currentTarget.value = url
        onCommit(url)
      }}
    />
  )
}

/** Ajout d'une application à partir d'une adresse quelconque. */
function CustomAppForm({
  onAdd
}: {
  onAdd: (name: string, url: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [invalid, setInvalid] = useState(false)

  const submit = (event: React.FormEvent): void => {
    event.preventDefault()
    const url = normalizeWebUrl(address)
    if (!url) {
      setInvalid(true)
      return
    }
    onAdd(name.trim() || new URL(url).hostname.replace(/^www\./, ''), url)
    setName('')
    setAddress('')
  }

  return (
    <form className={styles.customApp} onSubmit={submit}>
      <input
        className={styles.input}
        value={name}
        maxLength={40}
        placeholder={t('settings.applications.namePlaceholder')}
        aria-label={t('settings.applications.name')}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        className={styles.input}
        value={address}
        placeholder={t('settings.applications.urlPlaceholder')}
        aria-label={t('settings.applications.url')}
        aria-invalid={invalid}
        data-invalid={invalid}
        onChange={(event) => {
          setAddress(event.target.value)
          setInvalid(false)
        }}
      />
      <Button type="submit" variant="primary" icon={Plus} disabled={!address.trim()}>
        {t('settings.applications.add')}
      </Button>
      {invalid && <p className={styles.extensionError}>{t('settings.applications.invalidUrl')}</p>}
    </form>
  )
}

interface IconButtonProps {
  icon: typeof Globe
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={styles.iconButton}
      title={label}
      aria-label={label}
      data-danger={danger}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden />
    </button>
  )
}
