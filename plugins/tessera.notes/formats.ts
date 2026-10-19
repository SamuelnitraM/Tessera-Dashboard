import type { PluginFileEntry } from '@tessera/plugin-sdk'

/**
 * Une note = un fichier du dossier Notes. Son format est donné par son extension :
 * `.txt` texte brut, `.md` Markdown, `.html` texte riche.
 */
export type NoteFormat = 'plain' | 'markdown' | 'rich'

export const NOTE_FORMATS: NoteFormat[] = ['plain', 'markdown', 'rich']

const EXTENSIONS: Record<NoteFormat, string> = {
  plain: '.txt',
  markdown: '.md',
  rich: '.html'
}

export interface Note {
  /** Nom du fichier (ex. `Courses.md`). */
  name: string
  /** Nom sans extension, affiché comme titre. */
  title: string
  format: NoteFormat
  modifiedAt: number
}

/** Reconnaît une note à partir d'un fichier ; `null` pour les autres fichiers du dossier. */
export function toNote(entry: PluginFileEntry): Note | null {
  const lower = entry.name.toLowerCase()
  for (const format of NOTE_FORMATS) {
    const extension = EXTENSIONS[format]
    if (lower.endsWith(extension) && entry.name.length > extension.length) {
      return {
        name: entry.name,
        title: entry.name.slice(0, -extension.length),
        format,
        modifiedAt: entry.modifiedAt
      }
    }
  }
  return null
}

export function noteFileName(title: string, format: NoteFormat): string {
  return title + EXTENSIONS[format]
}

/** Titre libre : « Nouvelle note », sinon « Nouvelle note (2) », « (3) »… */
export function uniqueTitle(base: string, notes: readonly Note[]): string {
  const taken = new Set(notes.map((note) => note.title.toLowerCase()))
  if (!taken.has(base.toLowerCase())) return base
  let index = 2
  while (taken.has(`${base} (${index})`.toLowerCase())) index++
  return `${base} (${index})`
}

// ---------------------------------------------------------------------------
// Fichiers de texte riche : un document HTML complet (lisible dans un navigateur),
// dont seul le contenu de <body> est édité.
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)
}

/** Contenu tel qu'il est écrit sur le disque. */
export function toFileContent(content: string, format: NoteFormat, title: string): string {
  if (format !== 'rich') return content
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    `<body>${content}</body>`,
    '</html>',
    ''
  ].join('\n')
}

/** Contenu à éditer, à partir du fichier lu sur le disque. */
export function fromFileContent(file: string, format: NoteFormat): string {
  if (format !== 'rich') return file
  // Fichier HTML complet : on ne garde que <body> ; sinon c'est déjà un fragment
  if (!/<body[\s>]/i.test(file)) return file
  return new DOMParser().parseFromString(file, 'text/html').body.innerHTML
}
