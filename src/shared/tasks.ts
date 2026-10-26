/** Module Tâches : listes locales et listes Google Tasks. */

export interface TaskList {
  /** `local:<id>` ou `google:<compte>:<liste>`. */
  id: string
  name: string
  source: 'local' | 'google'
  /** Adresse du compte Google. */
  account: string | null
}

export interface Task {
  /** `local:<id>` ou identifiant Google. */
  id: string
  listId: string
  title: string
  notes: string
  /** Échéance `AAAA-MM-JJ`. */
  due: string | null
  done: boolean
  updatedAt: number
}

export interface TasksState {
  lists: TaskList[]
  tasks: Task[]
  /** Comptes Google (Tâches) et leur erreur éventuelle. */
  accounts: { id: string; email: string; error: string | null }[]
}

/** Création ou modification d'une tâche (sans `id` : nouvelle tâche). */
export interface TaskInput {
  id?: string
  listId: string
  title: string
  notes: string
  due: string | null
  done: boolean
}
