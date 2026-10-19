import { join } from 'node:path'
import { app } from 'electron'
import { readJsonFile, writeJsonFile } from './json-file'

type Listener<T> = (next: T, previous: T) => void

/** Délai avant écriture : plusieurs changements rapprochés (ex. sélecteur de couleur) = 1 écriture. */
const SAVE_DELAY_MS = 300

/**
 * Données JSON sauvegardées dans le dossier de l'app (`%APPDATA%/Tessera Dashboard/`).
 * Chaque valeur passe par `sanitize` : à la lecture du disque comme à chaque modification.
 */
export class JsonStore<T> {
  private value: T
  private saveTimer: NodeJS.Timeout | undefined
  private readonly listeners = new Set<Listener<T>>()

  constructor(
    private readonly fileName: string,
    private readonly sanitize: (input: unknown) => T
  ) {
    this.value = sanitize(undefined)
  }

  private get path(): string {
    return join(app.getPath('userData'), this.fileName)
  }

  /** Charge le fichier. À appeler une fois, au démarrage (après `app.whenReady`). */
  load(): T {
    this.value = this.sanitize(readJsonFile(this.path))
    return this.value
  }

  get(): T {
    return this.value
  }

  /** Remplace la valeur, prévient les abonnés et programme la sauvegarde. */
  set(input: unknown): T {
    const previous = this.value
    const next = this.sanitize(input)
    if (JSON.stringify(next) === JSON.stringify(previous)) return previous

    this.value = next
    this.scheduleSave()
    for (const listener of this.listeners) listener(next, previous)
    return next
  }

  /** S'abonne aux changements. Renvoie la fonction de désabonnement. */
  onChange(listener: Listener<T>): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Écrit immédiatement les changements en attente (appelé avant de quitter). */
  flush(): void {
    if (!this.saveTimer) return
    clearTimeout(this.saveTimer)
    this.saveTimer = undefined
    writeJsonFile(this.path, this.value)
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DELAY_MS)
  }
}
