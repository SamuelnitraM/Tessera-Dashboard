/** Module Actualités : flux RSS / Atom suivis et leurs articles. */

export interface NewsFeed {
  id: string
  url: string
  title: string
  /** Site du flux (page d'accueil), si connu. */
  siteUrl: string | null
  /** Notification à chaque nouvel article. */
  notify: boolean
  /** Dernière erreur de lecture, `null` si tout va bien. */
  error: string | null
}

export interface NewsItem {
  id: string
  feedId: string
  title: string
  link: string
  /** Publication (horodatage), 0 si inconnue. */
  date: number
  /** Résumé en texte brut (quelques phrases). */
  summary: string
  image: string | null
  read: boolean
}

export interface NewsState {
  feeds: NewsFeed[]
  items: NewsItem[]
  updatedAt: number
}
