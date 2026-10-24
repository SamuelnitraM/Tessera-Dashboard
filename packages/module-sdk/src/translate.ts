import type { Language } from '../../../src/shared/settings'

/**
 * Traductions d'un module, sans dépendance (même syntaxe que les extensions intégrées) :
 * - `{{nom}}` est remplacé par la valeur `nom` ;
 * - avec une valeur `count`, la clé `cle_one` ou `cle_other` (règles de pluriel de la langue)
 *   est préférée à `cle` ;
 * - `a.b` désigne la clé `b` de l'objet `a` ;
 * - un texte absent est cherché en anglais, puis la clé elle-même est affichée.
 */

/** Textes d'un module : `{ fr: { cle: 'texte' }, en: { … } }`. */
export type PluginTranslations = Partial<Record<Language, Record<string, unknown>>>

export type TranslateFunction = (key: string, values?: Record<string, unknown>) => string

function lookup(strings: Record<string, unknown> | undefined, key: string): string | undefined {
  let current: unknown = strings
  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

export function createTranslator(
  translations: PluginTranslations | undefined,
  language: Language
): TranslateFunction {
  const plural = new Intl.PluralRules(language)
  const find = (key: string, count: unknown): string | undefined => {
    for (const strings of [translations?.[language], translations?.en]) {
      if (typeof count === 'number') {
        const text =
          lookup(strings, `${key}_${plural.select(count)}`) ?? lookup(strings, `${key}_other`)
        if (text !== undefined) return text
      }
      const text = lookup(strings, key)
      if (text !== undefined) return text
    }
    return undefined
  }
  return (key, values = {}) =>
    (find(key, values.count) ?? key).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match
    )
}
