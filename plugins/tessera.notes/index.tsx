import { definePlugin } from '@tessera/plugin-sdk'
import { NotesWidget } from './NotesWidget'

export default definePlugin({
  widgets: {
    notes: NotesWidget
  },
  translations: {
    fr: {
      newNoteTitle: 'Nouvelle note',
      newNote: 'Nouvelle note',
      addNote: 'Nouvelle note ou import',
      importNotes: 'Importer des notes…',
      groups: {
        today: 'Aujourd’hui',
        yesterday: 'Hier',
        week: '7 derniers jours',
        month: '30 derniers jours',
        older: 'Plus ancien'
      },
      notes: 'Notes',
      chooseNote: 'Choisir une note',
      empty: 'Aucune note pour le moment.',
      createFirst: 'Créer une note',
      titleLabel: 'Titre de la note',
      placeholder: 'Écris ici…',
      save: 'Enregistrer (Ctrl+S)',
      status: { saved: 'Enregistré', unsaved: 'Modifié', saving: 'Enregistrement…' },
      openFolder: 'Ouvrir le dossier des notes',
      delete: 'Supprimer la note',
      preview: 'Aperçu',
      editSource: 'Modifier le texte',
      format: { label: 'Format', plain: 'Texte', markdown: 'Markdown', rich: 'Riche' },
      errors: {
        exists: 'Une note porte déjà ce nom.',
        'invalid-name': 'Ce titre contient des caractères interdits : < > : " / \\ | ? *',
        'not-found': 'Cette note n’existe plus.',
        permission: 'Accès aux fichiers refusé.',
        io: 'Opération impossible.'
      },
      confirm: {
        cancel: 'Annuler',
        unsavedTitle: 'Modifications non enregistrées',
        unsavedMessage: 'La note « {{title}} » contient des modifications non enregistrées.',
        save: 'Enregistrer',
        discard: 'Ne pas enregistrer',
        deleteTitle: 'Supprimer la note ?',
        deleteMessage: 'La note « {{title}} » sera envoyée à la Corbeille de Windows.',
        delete: 'Supprimer',
        convertTitle: 'Changer le format ?',
        convertMessage:
          'Passer du texte riche au format « {{format}} » peut faire perdre une partie de la mise en forme. L’ancienne version sera envoyée à la Corbeille.',
        convert: 'Changer le format'
      },
      toolbar: {
        bold: 'Gras',
        italic: 'Italique',
        underline: 'Souligné',
        strike: 'Barré',
        heading1: 'Titre 1',
        heading2: 'Titre 2',
        bulletList: 'Liste à puces',
        orderedList: 'Liste numérotée',
        taskList: 'Liste de tâches',
        quote: 'Citation',
        code: 'Bloc de code',
        undo: 'Annuler',
        redo: 'Rétablir'
      }
    },
    en: {
      newNoteTitle: 'New note',
      newNote: 'New note',
      addNote: 'New note or import',
      importNotes: 'Import notes…',
      groups: {
        today: 'Today',
        yesterday: 'Yesterday',
        week: 'Previous 7 days',
        month: 'Previous 30 days',
        older: 'Older'
      },
      notes: 'Notes',
      chooseNote: 'Choose a note',
      empty: 'No notes yet.',
      createFirst: 'Create a note',
      titleLabel: 'Note title',
      placeholder: 'Write here…',
      save: 'Save (Ctrl+S)',
      status: { saved: 'Saved', unsaved: 'Modified', saving: 'Saving…' },
      openFolder: 'Open the notes folder',
      delete: 'Delete note',
      preview: 'Preview',
      editSource: 'Edit text',
      format: { label: 'Format', plain: 'Text', markdown: 'Markdown', rich: 'Rich' },
      errors: {
        exists: 'A note with this name already exists.',
        'invalid-name': 'This title contains forbidden characters: < > : " / \\ | ? *',
        'not-found': 'This note no longer exists.',
        permission: 'File access denied.',
        io: 'Operation failed.'
      },
      confirm: {
        cancel: 'Cancel',
        unsavedTitle: 'Unsaved changes',
        unsavedMessage: 'The note “{{title}}” has unsaved changes.',
        save: 'Save',
        discard: 'Don’t save',
        deleteTitle: 'Delete this note?',
        deleteMessage: 'The note “{{title}}” will be moved to the Windows Recycle Bin.',
        delete: 'Delete',
        convertTitle: 'Change format?',
        convertMessage:
          'Switching from rich text to “{{format}}” may lose some formatting. The previous version will be moved to the Recycle Bin.',
        convert: 'Change format'
      },
      toolbar: {
        bold: 'Bold',
        italic: 'Italic',
        underline: 'Underline',
        strike: 'Strikethrough',
        heading1: 'Heading 1',
        heading2: 'Heading 2',
        bulletList: 'Bulleted list',
        orderedList: 'Numbered list',
        taskList: 'Task list',
        quote: 'Quote',
        code: 'Code block',
        undo: 'Undo',
        redo: 'Redo'
      }
    }
  }
})
