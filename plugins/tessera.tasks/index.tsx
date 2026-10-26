import { definePlugin } from '@tessera/plugin-sdk'
import { TasksWidget } from './TasksWidget'

export default definePlugin({
  widgets: {
    tasks: TasksWidget
  },
  translations: {
    fr: {
      listView: 'Vue en liste',
      kanbanView: 'Vue kanban (une colonne par liste)',
      list: 'Liste affichée',
      local: 'locale',
      showDone: 'Afficher les tâches faites',
      hideDone: 'Masquer les tâches faites',
      newList: 'Nouvelle liste',
      newLocalList: 'Liste locale (dans Tessera)',
      newGoogleList: 'Liste Google Tasks ({{email}})',
      listName: 'Nom de la liste (Entrée pour créer)',
      refresh: 'Actualiser',
      loading: 'Chargement…',
      addTask: 'Ajouter une tâche (Entrée)…',
      noTasks: 'Aucune tâche.',
      deleteList: 'Supprimer cette liste',
      deleteListConfirm: 'Supprimer la liste « {{name}} » et toutes ses tâches ?',
      moveTo: 'Déplacer vers « {{name}} »',
      delete: 'Supprimer',
      markDone: 'Marquer comme faite',
      markUndone: 'Marquer comme à faire',
      noDue: 'sans échéance',
      due: 'Échéance',
      notes: 'Notes…',
      googleHint: 'Tes listes Google Tasks (celles du téléphone) peuvent s’afficher ici.',
      connectGoogle: 'Connecter Google Tasks',
      waiting: 'Connexion dans le navigateur…'
    },
    en: {
      listView: 'List view',
      kanbanView: 'Kanban view (one column per list)',
      list: 'Shown list',
      local: 'local',
      showDone: 'Show completed tasks',
      hideDone: 'Hide completed tasks',
      newList: 'New list',
      newLocalList: 'Local list (in Tessera)',
      newGoogleList: 'Google Tasks list ({{email}})',
      listName: 'List name (Enter to create)',
      refresh: 'Refresh',
      loading: 'Loading…',
      addTask: 'Add a task (Enter)…',
      noTasks: 'No tasks.',
      deleteList: 'Delete this list',
      deleteListConfirm: 'Delete the “{{name}}” list and all its tasks?',
      moveTo: 'Move to “{{name}}”',
      delete: 'Delete',
      markDone: 'Mark as done',
      markUndone: 'Mark as to do',
      noDue: 'no due date',
      due: 'Due date',
      notes: 'Notes…',
      googleHint: 'Your Google Tasks lists (the ones on your phone) can show up here.',
      connectGoogle: 'Connect Google Tasks',
      waiting: 'Signing in in the browser…'
    }
  }
})
