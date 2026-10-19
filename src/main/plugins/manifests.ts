import { parseManifest, type PluginManifest, type PluginPermission } from '@shared/plugins'

/**
 * Manifestes des extensions intégrées, relus côté processus principal.
 * C'est d'ici (et non de l'interface) que viennent les permissions : l'interface ne peut pas
 * s'attribuer un accès que l'extension n'a pas déclaré.
 */
const files = import.meta.glob<unknown>('../../../plugins/*/manifest.json', {
  eager: true,
  import: 'default'
})

const manifests = new Map<string, PluginManifest>()
for (const raw of Object.values(files)) {
  const result = parseManifest(raw)
  if (result.ok) manifests.set(result.manifest.id, result.manifest)
}

export function getPluginManifest(pluginId: string): PluginManifest | undefined {
  return manifests.get(pluginId)
}

export function hasPermission(pluginId: string, permission: PluginPermission): boolean {
  return manifests.get(pluginId)?.permissions.includes(permission) ?? false
}
