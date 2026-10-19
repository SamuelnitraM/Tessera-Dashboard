import type { Language } from '../settings'
import { en } from './en'
import { fr, type Translation } from './fr'

export type { Translation }

export const translations: Record<Language, Translation> = { fr, en }

/** Remplace les `{{variables}}` d'un texte traduit (même syntaxe qu'i18next). */
export function interpolate(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => values[name] ?? match)
}
