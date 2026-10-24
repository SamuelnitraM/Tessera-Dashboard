import type { PluginManifest, PluginPermission } from '@shared/plugins'
import { getSettings } from '../settings-store'
import { getBuiltInManifest } from './builtin'
import { getGrantedPermissions, getModuleManifest } from './modules'

/**
 * Manifestes de toutes les extensions, relus côté processus principal : intégrées (compilées
 * avec l'app) et modules installés (dossier de l'app).
 * C'est d'ici (et non de l'interface) que viennent les permissions : l'interface ne peut pas
 * s'attribuer un accès que l'extension n'a pas déclaré.
 */

export function getPluginManifest(pluginId: string): PluginManifest | undefined {
  return getBuiltInManifest(pluginId) ?? getModuleManifest(pluginId)
}

/**
 * Une extension intégrée a les permissions de son manifeste. Un module tiers n'a que celles
 * déclarées dans son manifeste ET accordées par l'utilisateur, et aucune s'il est désactivé.
 */
export function hasPermission(pluginId: string, permission: PluginPermission): boolean {
  const builtIn = getBuiltInManifest(pluginId)
  if (builtIn) return builtIn.permissions.includes(permission)

  const manifest = getModuleManifest(pluginId)
  if (!manifest || getSettings().plugins.disabled.includes(pluginId)) return false
  return (
    manifest.permissions.includes(permission) &&
    getGrantedPermissions(pluginId).includes(permission)
  )
}
