import { useEffect, useState } from 'react'
import {
  Boxes,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  PackagePlus,
  RotateCw,
  Trash2,
  TriangleAlert
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  getModuleErrorCode,
  MODULE_PACKAGE_EXTENSION,
  moduleErrorDetail,
  type InstalledModule,
  type ModulePreview,
  type ModuleSelection
} from '@shared/modules'
import { localize, PLUGIN_FILES_ROOT, type PluginManifest } from '@shared/plugins'
import { PluginIcon } from '../../../components/PluginIcon'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Switch } from '../../../components/ui/Switch'
import { getPlugins, type LoadedPlugin } from '../../../plugins/registry'
import { useDashboardStore } from '../../../stores/dashboard'
import { consumeOpenedPackage, useModules, useModulesStore } from '../../../stores/modules'
import { useResolvedLanguage, useSettingsStore } from '../../../stores/settings'
import dialogStyles from '../../../components/ui/Dialog.module.css'
import { SettingRow, SettingsCard } from '../SettingRow'
import styles from '../settings.module.css'
import { InstallModuleDialog } from './InstallModuleDialog'
import { PermissionLine } from './ModulePermissions'
import { usePermissionText } from './permissionText'

/**
 * Widgets intégrés et modules tiers : activation, permissions, installation (bouton ou fichier
 * `.tessera` déposé sur la page), désinstallation et mode développeur.
 */
export function ExtensionsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const developerMode = useSettingsStore((state) => state.settings.plugins.developerMode)
  const update = useSettingsStore((state) => state.update)
  // Se réaffiche quand un module est installé, rechargé ou désinstallé
  useModules()
  // Un paquet ouvert depuis l'Explorateur arrive avec sa fenêtre de consentement
  const [preview, setPreview] = useState<ModulePreview | null>(consumeOpenedPackage)
  useEffect(
    () =>
      useModulesStore.subscribe((state) => {
        if (state.opened) setPreview(consumeOpenedPackage())
      }),
    []
  )
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const describeError = (cause: unknown): string => {
    const code = getModuleErrorCode(cause)
    const detail = moduleErrorDetail(cause)
    return code
      ? t(`settings.extensions.errors.${code}`, { detail })
      : t('settings.extensions.errors.io', { detail })
  }

  const open = async (load: () => Promise<ModulePreview | null>): Promise<void> => {
    setError(null)
    try {
      const next = await load()
      if (next) setPreview(next)
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  const install = async (selection: ModuleSelection[]): Promise<void> => {
    if (!preview) return
    const { token } = preview
    setPreview(null)
    try {
      await window.tessera.modules.install(token, selection)
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  const cancel = (): void => {
    if (preview) void window.tessera.modules.cancel(preview.token)
    setPreview(null)
  }

  // Fichier .tessera déposé sur la page
  const isPackageDrag = (event: React.DragEvent): boolean =>
    [...event.dataTransfer.items].some((item) => item.kind === 'file')
  const onDrop = (event: React.DragEvent): void => {
    event.preventDefault()
    setDragging(false)
    const file = [...event.dataTransfer.files].find((candidate) =>
      candidate.name.toLowerCase().endsWith(`.${MODULE_PACKAGE_EXTENSION}`)
    )
    if (file) {
      void open(() => window.tessera.modules.previewFile(file))
      return
    }
    // Mode développeur : un dossier de module déposé est chargé comme avec « Charger un dossier »
    const folder = [...event.dataTransfer.items].find(
      (item) => item.kind === 'file' && item.webkitGetAsEntry()?.isDirectory
    )
    const folderFile = folder?.getAsFile()
    if (developerMode && folderFile) {
      void open(() => window.tessera.modules.previewDevFolder(folderFile))
    }
  }

  // Extensions intégrées, puis modules seuls, puis collections (regroupées)
  const plugins = getPlugins()
  const collections = new Map<string, LoadedPlugin[]>()
  for (const plugin of plugins) {
    const collection = plugin.module?.collection
    if (collection)
      collections.set(collection.id, [...(collections.get(collection.id) ?? []), plugin])
  }
  return (
    <div
      className={styles.extensionsPage}
      data-dragging={dragging}
      onDragOver={(event) => {
        if (!isPackageDrag(event)) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <p className={styles.sectionIntro}>{t('settings.extensions.intro')}</p>

      <div className={styles.extensionsToolbar}>
        <Button
          variant="primary"
          icon={PackagePlus}
          onClick={() => void open(() => window.tessera.modules.pickPackage())}
        >
          {t('settings.extensions.installButton')}
        </Button>
        <span className={styles.extensionMeta}>{t('settings.extensions.dropHint')}</span>
      </div>
      {error && (
        <p className={styles.extensionError} role="alert">
          {error}
        </p>
      )}

      <ul className={styles.extensionList}>
        {plugins
          .filter((plugin) => !plugin.module?.collection)
          .map((plugin) => (
            <ExtensionCard key={plugin.id} plugin={plugin} />
          ))}
        {[...collections].map(([id, members]) => (
          <CollectionGroup key={id} plugins={members} />
        ))}
      </ul>

      <SettingsCard title={t('settings.extensions.dev.title')}>
        <SettingRow
          label={t('settings.extensions.dev.title')}
          description={t('settings.extensions.dev.description')}
        >
          {({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={developerMode}
              onChange={(value) => void update({ plugins: { developerMode: value } })}
            />
          )}
        </SettingRow>
        {developerMode && (
          <div className={styles.extensionsToolbar}>
            <Button
              icon={FolderOpen}
              onClick={() => void open(() => window.tessera.modules.pickDevFolder())}
            >
              {t('settings.extensions.dev.load')}
            </Button>
          </div>
        )}
      </SettingsCard>

      {preview && <InstallModuleDialog preview={preview} onInstall={install} onCancel={cancel} />}
    </div>
  )
}

/** Modules d'une même collection : regroupés, dépliables, activables d'un coup. */
function CollectionGroup({ plugins }: { plugins: LoadedPlugin[] }): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const disabledPlugins = useSettingsStore((state) => state.settings.plugins.disabled)
  const update = useSettingsStore((state) => state.update)
  const [expanded, setExpanded] = useState(false)

  const collection = plugins[0].module?.collection
  const name = collection ? localize(collection.name, language) : ''
  const ids = plugins.map((plugin) => plugin.id)
  const enabled = ids.some((id) => !disabledPlugins.includes(id))

  const toggle = (checked: boolean): void => {
    const others = disabledPlugins.filter((id) => !ids.includes(id))
    void update({ plugins: { disabled: checked ? others : [...others, ...ids] } })
  }

  return (
    <li className={styles.collection} data-expanded={expanded}>
      <div className={styles.collectionHeader}>
        <button
          type="button"
          className={styles.collectionToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronRight size={16} aria-hidden className={styles.collectionChevron} />
          <Boxes size={18} aria-hidden />
          <span className={styles.rowLabel}>{name}</span>
          <span className={styles.badge}>{t('settings.extensions.collectionBadge')}</span>
          <span className={styles.extensionMeta}>
            {t('settings.extensions.collectionCount', { count: plugins.length })}
          </span>
        </button>
        <Switch
          aria-label={t('settings.extensions.toggle', { name })}
          checked={enabled}
          onChange={toggle}
        />
      </div>
      {expanded && (
        <ul className={styles.extensionList}>
          {plugins.map((plugin) => (
            <ExtensionCard key={plugin.id} plugin={plugin} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** Dossier auquel une extension intégrée a accès (permission « files »). */
function useFilesFolder(pluginId: string, enabled: boolean): string | undefined {
  const [folder, setFolder] = useState<string>()

  useEffect(() => {
    if (!enabled) return
    let active = true
    window.tessera.pluginFiles
      .getFolder(pluginId)
      .then((path) => active && setFolder(path))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [pluginId, enabled])

  return folder
}

function ExtensionCard({ plugin }: { plugin: LoadedPlugin }): React.JSX.Element {
  const { t } = useTranslation()
  const language = useResolvedLanguage()
  const disabledPlugins = useSettingsStore((state) => state.settings.plugins.disabled)
  const update = useSettingsStore((state) => state.update)
  const [uninstalling, setUninstalling] = useState(false)

  const { manifest, module } = plugin
  const name = manifest ? localize(manifest.name, language) : plugin.id
  const enabled = !disabledPlugins.includes(plugin.id)

  const toggle = (checked: boolean): void => {
    const disabled = checked
      ? disabledPlugins.filter((id) => id !== plugin.id)
      : [...disabledPlugins, plugin.id]
    void update({ plugins: { disabled } })
  }

  const badge = plugin.builtIn
    ? t('settings.extensions.builtIn')
    : module?.source === 'dev'
      ? t('settings.extensions.devBadge')
      : t('settings.extensions.module')

  return (
    <li className={styles.extension} data-enabled={enabled && !plugin.error}>
      <span className={styles.extensionIcon}>
        {plugin.error ? (
          <TriangleAlert size={20} aria-hidden />
        ) : (
          <PluginIcon name={manifest?.widgets[0]?.icon} />
        )}
      </span>

      <div className={styles.extensionBody}>
        <div className={styles.extensionHeader}>
          <span className={styles.rowLabel}>{name}</span>
          {manifest && <span className={styles.extensionMeta}>v{manifest.version}</span>}
          <span className={styles.badge}>{badge}</span>
        </div>

        {plugin.error ? (
          <p className={styles.extensionError}>
            {t('settings.extensions.invalid')} — {plugin.error}
          </p>
        ) : (
          manifest && (
            <>
              <p className={styles.rowDescription}>{localize(manifest.description, language)}</p>
              <p className={styles.extensionMeta}>
                {t('settings.extensions.author', { author: manifest.author })} ·{' '}
                {t('settings.extensions.widgets', {
                  list: manifest.widgets.map((widget) => localize(widget.name, language)).join(', ')
                })}
              </p>
              {module?.source === 'package' && (
                <p className={styles.extensionMeta}>
                  {module.publisher
                    ? t('settings.extensions.signed', { fingerprint: module.publisher })
                    : t('settings.extensions.unsigned')}
                </p>
              )}
              {module ? (
                <ModulePermissionList module={module} manifest={manifest} />
              ) : (
                <BuiltInPermissionList pluginId={plugin.id} manifest={manifest} />
              )}
            </>
          )
        )}

        {module && (
          <div className={styles.extensionActions}>
            {manifest?.homepage && (
              <Button
                variant="ghost"
                icon={ExternalLink}
                onClick={() => window.open(manifest.homepage ?? '', '_blank')}
              >
                {t('settings.extensions.homepage')}
              </Button>
            )}
            {module.source === 'dev' && (
              <Button
                variant="ghost"
                icon={RotateCw}
                onClick={() => void window.tessera.modules.reload(module.id)}
              >
                {t('settings.extensions.reload')}
              </Button>
            )}
            <Button variant="ghost" icon={Trash2} onClick={() => setUninstalling(true)}>
              {t('settings.extensions.uninstall')}
            </Button>
          </div>
        )}
      </div>

      {!plugin.error && (
        <Switch
          aria-label={t('settings.extensions.toggle', { name })}
          checked={enabled}
          onChange={toggle}
        />
      )}

      {module && uninstalling && (
        <UninstallDialog module={module} name={name} onClose={() => setUninstalling(false)} />
      )}
    </li>
  )
}

function BuiltInPermissionList({
  pluginId,
  manifest
}: {
  pluginId: string
  manifest: PluginManifest
}): React.JSX.Element {
  const permissionText = usePermissionText()
  const folder = useFilesFolder(pluginId, manifest.permissions.includes('files'))
  return (
    <>
      {manifest.permissions.map((permission) =>
        permission === 'files' && !folder ? null : (
          <PermissionLine
            key={permission}
            permission={permission}
            text={permissionText(permission, manifest, folder)}
          />
        )
      )}
    </>
  )
}

/** Permissions d'un module tiers : chacune peut être retirée ou accordée à tout moment. */
function ModulePermissionList({
  module,
  manifest
}: {
  module: InstalledModule
  manifest: PluginManifest
}): React.JSX.Element {
  const permissionText = usePermissionText()
  return (
    <>
      {manifest.permissions.map((permission) => (
        <PermissionLine
          key={permission}
          permission={permission}
          text={permissionText(permission, manifest)}
          granted={module.granted.includes(permission)}
          onChange={(granted) =>
            void window.tessera.modules.setGranted(
              module.id,
              granted
                ? [...module.granted, permission]
                : module.granted.filter((other) => other !== permission)
            )
          }
        />
      ))}
    </>
  )
}

/** Désinstallation : retirer aussi les blocs du module, et (au choix) ses fichiers. */
function UninstallDialog({
  module,
  name,
  onClose
}: {
  module: InstalledModule
  name: string
  onClose: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const pages = useDashboardStore((state) => state.dashboard.pages)
  const removeWidget = useDashboardStore((state) => state.removeWidget)
  const [removeBlocks, setRemoveBlocks] = useState(true)
  const [trashFiles, setTrashFiles] = useState(false)
  const [busy, setBusy] = useState(false)

  const blocks = pages.flatMap((page) =>
    page.widgets
      .filter((widget) => widget.type.startsWith(`${module.id}/`))
      .map((widget) => ({ pageId: page.id, widgetId: widget.id }))
  )
  const files = module.manifest?.files

  const confirm = async (): Promise<void> => {
    setBusy(true)
    if (removeBlocks) for (const block of blocks) removeWidget(block.pageId, block.widgetId)
    try {
      await window.tessera.modules.uninstall(module.id, { trashFiles: !!files && trashFiles })
    } finally {
      onClose()
    }
  }

  return (
    <Dialog title={t('settings.extensions.uninstallDialog.title', { name })} open onClose={onClose}>
      <p className={dialogStyles.message}>
        {module.source === 'dev'
          ? t('settings.extensions.uninstallDialog.messageDev')
          : t('settings.extensions.uninstallDialog.message')}
      </p>
      {blocks.length > 0 && (
        <SettingRow
          label={t('settings.extensions.uninstallDialog.removeBlocks', { count: blocks.length })}
        >
          {({ labelId }) => (
            <Switch aria-labelledby={labelId} checked={removeBlocks} onChange={setRemoveBlocks} />
          )}
        </SettingRow>
      )}
      {files && (
        <SettingRow
          label={t('settings.extensions.uninstallDialog.trashFiles', {
            folder: `Documents\\${PLUGIN_FILES_ROOT}\\${files.folder}`
          })}
        >
          {({ labelId }) => (
            <Switch aria-labelledby={labelId} checked={trashFiles} onChange={setTrashFiles} />
          )}
        </SettingRow>
      )}
      <div className={dialogStyles.actions}>
        <Button onClick={onClose}>{t('settings.extensions.install.cancel')}</Button>
        <Button variant="danger" disabled={busy} onClick={() => void confirm()}>
          {t('settings.extensions.uninstallDialog.confirm')}
        </Button>
      </div>
    </Dialog>
  )
}
