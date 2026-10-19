import { Editor } from '@tiptap/core'
import type { NoteFormat } from './formats'
import { richExtensions } from './richExtensions'

/**
 * Conversion du contenu d'une note d'un format à l'autre.
 * - Texte brut <-> Markdown : le texte est conservé tel quel (le Markdown est du texte).
 * - Markdown <-> texte riche : via TipTap (analyse et écriture du Markdown).
 * - Texte riche -> texte brut : on garde le texte, sans mise en forme.
 */
export function convertNote(content: string, from: NoteFormat, to: NoteFormat): string {
  if (from === to) return content
  if (from !== 'rich' && to !== 'rich') return content

  return withEditor((editor) => {
    if (to === 'rich') {
      if (from === 'markdown') editor.commands.setContent(content, { contentType: 'markdown' })
      else editor.commands.setContent(plainToHtml(content))
      return editor.getHTML()
    }
    if (to === 'plain') return htmlToPlain(content)
    editor.commands.setContent(content)
    return editor.getMarkdown()
  })
}

/**
 * Texte riche -> texte brut lisible : un paragraphe par bloc, les listes gardent
 * leurs puces (« - », « 1. », « [ ] » / « [x] ») et leur indentation.
 */
function htmlToPlain(html: string): string {
  const body = new DOMParser().parseFromString(html, 'text/html').body
  const lines: string[] = []

  const textOf = (element: Element): string => {
    const copy = element.cloneNode(true) as Element
    copy.querySelectorAll('ul, ol').forEach((list) => list.remove())
    return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
  }

  /** Une ligne par élément de liste, puis ses sous-listes indentées. */
  const walkList = (list: Element, indent: string): void => {
    let index = 1
    for (const item of list.children) {
      const checked = item.getAttribute('data-checked')
      const marker =
        checked !== null
          ? checked === 'true'
            ? '[x] '
            : '[ ] '
          : list.tagName === 'OL'
            ? `${index++}. `
            : '- '
      lines.push(indent + marker + textOf(item))
      // Sous-listes (directement dans l'élément, ou dans le <div> d'une tâche)
      for (const nested of item.querySelectorAll(':scope > ul, :scope > ol, :scope > div > ul')) {
        walkList(nested, indent + '  ')
      }
    }
  }

  const walk = (parent: Element, indent: string): void => {
    for (const child of parent.children) {
      const tag = child.tagName
      if (tag === 'UL' || tag === 'OL') {
        walkList(child, indent)
        lines.push('')
      } else if (tag === 'PRE') {
        lines.push(child.textContent ?? '', '')
      } else if (/^(P|H[1-6]|BLOCKQUOTE)$/.test(tag)) {
        lines.push(indent + (tag === 'BLOCKQUOTE' ? '> ' : '') + textOf(child), '')
      } else {
        walk(child, indent)
      }
    }
  }

  walk(body, '')
  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}

/** Passer du texte riche à un autre format peut perdre de la mise en forme. */
export function isLossyConversion(from: NoteFormat, to: NoteFormat): boolean {
  return from === 'rich' && to !== 'rich'
}

/** Éditeur TipTap invisible, détruit après usage. */
function withEditor<T>(operation: (editor: Editor) => T): T {
  const editor = new Editor({ extensions: richExtensions() })
  try {
    return operation(editor)
  } finally {
    editor.destroy()
  }
}

function plainToHtml(text: string): string {
  const escape = (line: string): string =>
    line.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.split('\n').map(escape).join('<br>')}</p>`)
    .join('')
}
