import type { SettingsSection } from '../../stores/navigation'

/** Réglage trouvé par la recherche des paramètres. */
export interface SettingsEntry {
  section: SettingsSection
  label: string
  description?: string
}

/** Section où s'affiche chaque groupe de textes de `settings.*` (traductions). */
const SECTION_OF: Record<string, SettingsSection> = {
  language: 'general',
  window: 'general',
  theme: 'appearance',
  accent: 'appearance',
  accentIcon: 'appearance',
  headerAlign: 'appearance',
  sidebar: 'appearance',
  screenButtons: 'appearance',
  screenRows: 'appearance',
  notifications: 'notifications',
  applications: 'applications',
  accounts: 'accounts',
  extensions: 'extensions',
  shortcuts: 'shortcuts',
  about: 'about'
}

type Texts = { [key: string]: string | Texts }

/**
 * Réglages qu'on peut chercher, tirés des traductions de la langue affichée (`settings.*`) :
 * chaque groupe qui a un libellé (`label`, avec sa `description`), et les titres des cartes
 * (`title`, `…Title`). Rien à tenir à jour à la main : un nouveau réglage est trouvé dès qu'il a
 * ses textes.
 */
export function settingsEntries(settings: Texts): SettingsEntry[] {
  const entries: SettingsEntry[] = []
  const visit = (node: Texts, section: SettingsSection): void => {
    const { label, description } = node
    if (typeof label === 'string' && !label.includes('{{')) {
      entries.push({
        section,
        label,
        ...(typeof description === 'string' && { description })
      })
    }
    for (const [key, value] of Object.entries(node)) {
      if (typeof value !== 'string') visit(value, section)
      else if ((key === 'title' || key.endsWith('Title')) && !value.includes('{{')) {
        entries.push({ section, label: value })
      }
    }
  }
  for (const [key, section] of Object.entries(SECTION_OF)) {
    const node = settings[key]
    if (node && typeof node !== 'string') visit(node, section)
  }
  // Un même libellé dans une même section (titre de carte et réglage du même nom) : une fois
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const key = `${entry.section}:${entry.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Texte sans accents ni majuscules, pour comparer. */
const simplify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * Réglages dont le libellé ou la description contient tous les mots cherchés (accents et
 * majuscules ignorés) ; ceux dont le libellé les contient d'abord.
 */
export function searchSettings(entries: SettingsEntry[], query: string): SettingsEntry[] {
  const words = simplify(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const scored: { entry: SettingsEntry; inLabel: boolean }[] = []
  for (const entry of entries) {
    const label = simplify(entry.label)
    const text = `${label} ${simplify(entry.description ?? '')}`
    if (!words.every((word) => text.includes(word))) continue
    scored.push({ entry, inLabel: words.every((word) => label.includes(word)) })
  }
  return scored.sort((a, b) => Number(b.inLabel) - Number(a.inLabel)).map(({ entry }) => entry)
}
