import { useState } from 'react'
import { ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ModulePreview, ModulePreviewItem, ModuleSelection } from '@shared/modules'
import { localize, type PluginPermission } from '@shared/plugins'
import { PluginIcon } from '../../../components/PluginIcon'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Switch } from '../../../components/ui/Switch'
import { useResolvedLanguage } from '../../../stores/settings'
import dialogStyles from '../../../components/ui/Dialog.module.css'
import styles from '../settings.module.css'
import { PermissionLine } from './ModulePermissions'
import { usePermissionText } from './permissionText'

interface InstallModuleDialogProps {
  preview: ModulePreview
  onInstall: (selection: ModuleSelection[]) => void
  onCancel: () => void
}

/** Choix de l'utilisateur pour chaque module : l'installer, et les permissions accordées. */
type Choices = Record<string, { install: boolean; granted: PluginPermission[] }>

/** Compare deux versions sémantiques (sans les suffixes de préversion). */
function compareVersions(a: string, b: string): number {
  const parts = (version: string): number[] =>
    version
      .split('-')[0]
      .split('.')
      .map((part) => Number(part) || 0)
  const [left, right] = [parts(a), parts(b)]
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return (left[index] ?? 0) - (right[index] ?? 0)
  }
  return 0
}

/** Permission demandée pour la première fois par cette version. */
const isNewPermission = (item: ModulePreviewItem, permission: PluginPermission): boolean =>
  !!item.installed && !item.installed.permissions.includes(permission)

/**
 * Permissions cochées au départ : toutes pour une première installation ; pour une mise à jour,
 * celles déjà accordées plus les nouvelles (un refus passé est respecté).
 */
function defaultGrants(item: ModulePreviewItem): PluginPermission[] {
  const permissions = item.manifest?.permissions ?? []
  const { installed } = item
  if (!installed) return [...permissions]
  return permissions.filter(
    (permission) => installed.granted.includes(permission) || isNewPermission(item, permission)
  )
}

/**
 * Fenêtre de consentement avant d'installer un module ou une collection : qui l'a développé,
 * ce qu'il apporte et ce qu'il demande. Chaque permission peut être refusée dès l'installation.
 */
export function InstallModuleDialog({
  preview,
  onInstall,
  onCancel
}: InstallModuleDialogProps): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const [choices, setChoices] = useState<Choices>(() =>
    Object.fromEntries(
      preview.modules
        .filter((item) => item.manifest && !item.error)
        .map((item) => [item.id, { install: true, granted: defaultGrants(item) }])
    )
  )

  const installable = preview.modules.filter((item) => choices[item.id])
  const first = preview.modules[0]
  const collection = preview.collection
  const name = collection
    ? localize(collection.name, language)
    : first?.manifest
      ? localize(first.manifest.name, language)
      : (first?.id ?? '')
  const author = collection?.author ?? first?.manifest?.author ?? '?'
  const title = collection
    ? t('settings.extensions.install.titleCollection', { name })
    : preview.source === 'dev'
      ? t('settings.extensions.install.titleDev', { name })
      : t('settings.extensions.install.title', { name })

  const selection: ModuleSelection[] = installable
    .filter((item) => choices[item.id].install)
    .map((item) => ({ id: item.id, granted: choices[item.id].granted }))

  const update = (id: string, patch: Partial<Choices[string]>): void =>
    setChoices((current) => ({ ...current, [id]: { ...current[id], ...patch } }))

  return (
    <Dialog title={title} open onClose={onCancel}>
      <p className={dialogStyles.message}>
        {collection
          ? t('settings.extensions.install.introCollection', { author })
          : t('settings.extensions.install.intro', { author })}
      </p>

      {preview.source === 'package' &&
        (preview.publisher ? (
          <p className={styles.installSignature} data-signed="true">
            <ShieldCheck size={16} aria-hidden />
            {t('settings.extensions.install.signed', { fingerprint: preview.publisher })}
          </p>
        ) : (
          <p className={styles.installSignature} data-signed="false">
            <ShieldAlert size={16} aria-hidden />
            {t('settings.extensions.install.unsigned')}
          </p>
        ))}

      <ul className={styles.installList}>
        {preview.modules.map((item) => (
          <InstallItem
            key={item.id}
            item={item}
            choice={choices[item.id]}
            selectable={!!collection}
            onChange={(patch) => update(item.id, patch)}
          />
        ))}
      </ul>
      {installable.length === 0 && (
        <p className={styles.extensionError}>{t('settings.extensions.install.nothing')}</p>
      )}

      <div className={dialogStyles.actions}>
        <Button onClick={onCancel}>{t('settings.extensions.install.cancel')}</Button>
        <Button
          variant="primary"
          disabled={selection.length === 0}
          onClick={() => onInstall(selection)}
        >
          {preview.source === 'dev'
            ? t('settings.extensions.install.confirmDev')
            : t('settings.extensions.install.confirm')}
        </Button>
      </div>
    </Dialog>
  )
}

interface InstallItemProps {
  item: ModulePreviewItem
  choice: Choices[string] | undefined
  /** Collection : chaque module peut être installé ou non. */
  selectable: boolean
  onChange: (patch: Partial<Choices[string]>) => void
}

function InstallItem({ item, choice, selectable, onChange }: InstallItemProps): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const permissionText = usePermissionText()
  const { manifest, installed } = item
  const name = manifest ? localize(manifest.name, language) : item.id

  let status: string | null = null
  if (manifest && installed) {
    const order = compareVersions(manifest.version, installed.version)
    status =
      order > 0
        ? t('settings.extensions.install.update', { from: installed.version, to: manifest.version })
        : order < 0
          ? t('settings.extensions.install.downgrade', { from: installed.version })
          : t('settings.extensions.install.reinstall', { from: installed.version })
  }

  return (
    <li className={styles.installItem} data-enabled={!!choice?.install}>
      <div className={styles.extensionHeader}>
        <span className={styles.extensionIcon} data-size="small">
          {item.error ? (
            <TriangleAlert size={16} aria-hidden />
          ) : (
            <PluginIcon name={manifest?.widgets[0]?.icon} size={16} />
          )}
        </span>
        <span className={styles.rowLabel}>{name}</span>
        {manifest && <span className={styles.extensionMeta}>v{manifest.version}</span>}
        {selectable && choice && (
          <span className={styles.installToggle}>
            <Switch
              aria-label={t('settings.extensions.install.select', { name })}
              checked={choice.install}
              onChange={(install) => onChange({ install })}
            />
          </span>
        )}
      </div>

      {item.error ? (
        <p className={styles.extensionError}>
          {t('settings.extensions.install.invalid')} — {item.error}
        </p>
      ) : (
        manifest &&
        choice && (
          <>
            <p className={styles.rowDescription}>{localize(manifest.description, language)}</p>
            <p className={styles.extensionMeta}>
              {t('settings.extensions.author', { author: manifest.author })} ·{' '}
              {t('settings.extensions.widgets', {
                list: manifest.widgets.map((widget) => localize(widget.name, language)).join(', ')
              })}
            </p>
            {status && <p className={styles.extensionMeta}>{status}</p>}
            {choice.install &&
              (manifest.permissions.length === 0 ? (
                <p className={styles.extensionMeta}>
                  {t('settings.extensions.install.noPermissions')}
                </p>
              ) : (
                manifest.permissions.map((permission) => (
                  <PermissionLine
                    key={permission}
                    permission={permission}
                    text={permissionText(permission, manifest)}
                    granted={choice.granted.includes(permission)}
                    badge={
                      isNewPermission(item, permission)
                        ? t('settings.extensions.install.newPermission')
                        : undefined
                    }
                    onChange={(granted) =>
                      onChange({
                        granted: granted
                          ? [...choice.granted, permission]
                          : choice.granted.filter((other) => other !== permission)
                      })
                    }
                  />
                ))
              ))}
          </>
        )
      )}
    </li>
  )
}
