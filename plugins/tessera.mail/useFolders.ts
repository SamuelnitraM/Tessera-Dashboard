import { useEffect, useState } from 'react'
import {
  FOLDER_ORDER,
  useMail,
  useMailArrivals,
  usePluginTranslation,
  type MailFolder
} from '@tessera/plugin-sdk'

/** Dossiers habituels d'abord (dans l'ordre de Gmail), puis libellés par ordre alphabétique. */
function sortFolders(folders: MailFolder[]): MailFolder[] {
  return [...folders].sort((a, b) => {
    const order = FOLDER_ORDER.indexOf(a.kind) - FOLDER_ORDER.indexOf(b.kind)
    return order || a.name.localeCompare(b.name)
  })
}

/** Dossiers et libellés du compte, rechargés à l'arrivée de nouveaux mails (compteurs). */
export function useFolders(accountId: string): MailFolder[] | null {
  const mail = useMail()
  const arrivals = useMailArrivals(accountId)
  const [folders, setFolders] = useState<MailFolder[] | null>(null)
  useEffect(() => {
    let active = true
    mail.folders(accountId).then(
      (result) => active && setFolders(sortFolders(result)),
      () => active && setFolders([])
    )
    return () => {
      active = false
    }
  }, [mail, accountId, arrivals])
  return folders
}

/** Nom affiché d'un dossier : traduit pour les dossiers habituels, tel quel pour un libellé. */
export function useFolderName(): (folder: MailFolder | undefined) => string {
  const t = usePluginTranslation()
  return (folder) =>
    !folder
      ? t('folders.inbox')
      : folder.kind === 'label'
        ? folder.name
        : t(`folders.${folder.kind}`)
}
