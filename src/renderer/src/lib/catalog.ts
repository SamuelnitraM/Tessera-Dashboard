import { PLUGIN_CATEGORIES, type PluginCategory } from '@shared/plugins'

/** Texte comparable : minuscules, sans accents (« vidéo » trouve « Vidéo » et « video »). */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Chaque mot de la recherche apparaît dans l'un des textes (recherche vide : tout passe). */
export function matchesSearch(query: string, texts: string[]): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalize(texts.join(' '))
  return words.every((word) => haystack.includes(word))
}

/**
 * Éléments regroupés par catégorie, dans l'ordre des catégories (les vides sont omises), et
 * triés par nom dans chacune.
 */
export function groupByCategory<T>(
  items: T[],
  categoryOf: (item: T) => PluginCategory,
  nameOf: (item: T) => string
): { category: PluginCategory; items: T[] }[] {
  return PLUGIN_CATEGORIES.map((category) => ({
    category,
    items: items
      .filter((item) => categoryOf(item) === category)
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
  })).filter((group) => group.items.length > 0)
}
