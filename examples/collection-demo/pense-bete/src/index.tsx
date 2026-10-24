import { definePlugin } from '@tessera/module-sdk'
import { PenseBete } from './PenseBete'

export default definePlugin({
  widgets: {
    liste: PenseBete
  },
  translations: {
    fr: {
      placeholder: 'Ajouter une tâche…',
      add: 'Ajouter',
      remaining_one: '{{count}} tâche à faire',
      remaining_other: '{{count}} tâches à faire',
      remove: 'Supprimer',
      clear: 'Tout effacer',
      clearTitle: 'Tout effacer ?',
      clearMessage: 'Toutes les tâches de ce bloc seront supprimées.',
      cancel: 'Annuler'
    },
    en: {
      placeholder: 'Add a task…',
      add: 'Add',
      remaining_one: '{{count}} task to do',
      remaining_other: '{{count}} tasks to do',
      remove: 'Delete',
      clear: 'Clear all',
      clearTitle: 'Clear all?',
      clearMessage: 'All the tasks of this block will be deleted.',
      cancel: 'Cancel'
    }
  }
})
