/**
 * Fichier ou page ouvert depuis Tessera (pièce jointe, bloc Fichiers, lien d'un mail, d'une page
 * web…), avec ce que Windows en ferait : l'interface choisit le bloc qui l'affiche.
 */
export interface OpenTarget {
  kind: 'file' | 'url'
  /** Chemin complet du fichier, ou adresse normalisée (http ou https). */
  target: string
  /** Fichier : application de Tessera qui est son programme habituel (`null` : aucune). */
  appId: string | null
  /** Fichier : navigateur installé qui est son programme habituel (`null` : pas un navigateur). */
  browserId: string | null
}
