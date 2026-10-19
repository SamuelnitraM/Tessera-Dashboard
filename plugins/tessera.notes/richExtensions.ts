import type { Extensions } from '@tiptap/core'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

/**
 * Extensions TipTap du texte riche : titres, listes, citations, code, liens, soulignement
 * (StarterKit), listes de tâches, texte indicatif, et conversion Markdown.
 */
export function richExtensions(placeholder = ''): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: true, autolink: true }
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder }),
    Markdown
  ]
}
