import { parseManifest, type PluginManifest } from '@shared/plugins'

/**
 * Manifestes des extensions intégrées (dossier `plugins/`), compilés avec l'app et relus côté
 * processus principal.
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

export function getBuiltInManifest(pluginId: string): PluginManifest | undefined {
  return manifests.get(pluginId)
}

/** Dossiers de fichiers (permission `files`) des extensions intégrées, en minuscules. */
export function builtInFileFolders(): Set<string> {
  return new Set(
    [...manifests.values()].flatMap((manifest) =>
      manifest.files ? [manifest.files.folder.toLowerCase()] : []
    )
  )
}
