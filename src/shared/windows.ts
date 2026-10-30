/**
 * Fenêtres de Tessera : chaque page est affichée par une seule fenêtre. La fenêtre principale
 * affiche toutes les pages qui ne sont pas dans une autre ; les autres naissent d'un onglet de
 * page glissé hors d'une fenêtre (ou de « Ouvrir dans une nouvelle fenêtre »).
 */

/** Pages d'une fenêtre, envoyées par le processus principal à chaque changement. */
export interface WindowPages {
  /** Fenêtre principale : elle affiche toutes les pages, sauf celles des autres fenêtres. */
  primary: boolean
  /** Fenêtre secondaire : ses pages (vide pour la principale). */
  pageIds: string[]
  /** Pages affichées par les autres fenêtres. */
  elsewhere: string[]
  /** Applications ouvertes en onglet dans les autres fenêtres (elles restent ouvertes). */
  appsElsewhere: string[]
  /** Nombre de fenêtres de Tessera ouvertes. */
  windowCount: number
}

export const SINGLE_WINDOW: WindowPages = {
  primary: true,
  pageIds: [],
  elsewhere: [],
  appsElsewhere: [],
  windowCount: 1
}

/** La fenêtre affiche cette page. */
export const showsPage = (pages: WindowPages, pageId: string): boolean =>
  pages.primary ? !pages.elsewhere.includes(pageId) : pages.pageIds.includes(pageId)

/** Où est allé un onglet de page lâché : resté dans sa fenêtre, une autre fenêtre, une nouvelle. */
export type PageDrop = 'same' | 'moved' | 'new'

/** Demande de l'autre fenêtre : aller à une page (et donner le focus à un de ses blocs). */
export interface WindowNavigate {
  pageId: string
  blockId?: string
}
