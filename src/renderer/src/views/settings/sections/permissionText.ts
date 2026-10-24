import { useTranslation } from 'react-i18next'
import { INTEGRATION_NAMES } from '@shared/integrations'
import { PLUGIN_FILES_ROOT, type PluginManifest, type PluginPermission } from '@shared/plugins'

/** Explication d'une permission, telle qu'affichée à l'utilisateur. */
export function usePermissionText(): (
  permission: PluginPermission,
  manifest: PluginManifest,
  folder?: string
) => string {
  const { t } = useTranslation()
  return (permission, manifest, folder) => {
    switch (permission) {
      case 'files':
        return t('settings.extensions.filesPermission', {
          folder: folder ?? `Documents\\${PLUGIN_FILES_ROOT}\\${manifest.files?.folder ?? ''}`
        })
      case 'network':
        return t('settings.extensions.networkPermission', { list: manifest.network.join(', ') })
      case 'integrations':
        return t('settings.extensions.integrationsPermission', {
          list: (manifest.integrations ?? []).map((id) => INTEGRATION_NAMES[id]).join(', ')
        })
      default:
        return t(`settings.extensions.${permission}Permission`)
    }
  }
}
