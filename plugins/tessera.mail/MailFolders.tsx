import {
  Archive,
  FilePen,
  Inbox,
  Mails,
  OctagonAlert,
  PenSquare,
  Send,
  Star,
  Tag,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import { usePluginTranslation, type MailFolder, type MailFolderKind } from '@tessera/plugin-sdk'
import { useFolderName } from './useFolders'
import styles from './MailWidget.module.css'

const ICONS: Record<MailFolderKind, LucideIcon> = {
  inbox: Inbox,
  starred: Star,
  sent: Send,
  drafts: FilePen,
  all: Mails,
  archive: Archive,
  spam: OctagonAlert,
  trash: Trash2,
  label: Tag
}

interface MailFoldersProps {
  folders: MailFolder[] | null
  current: string
  onSelect: (folder: MailFolder) => void
  onCompose: () => void
}

/** Menu des dossiers, comme celui de Gmail : « Nouveau message », dossiers, libellés. */
export function MailFolders({
  folders,
  current,
  onSelect,
  onCompose
}: MailFoldersProps): React.JSX.Element {
  const t = usePluginTranslation()
  const name = useFolderName()
  const system = (folders ?? []).filter((folder) => folder.kind !== 'label')
  const labels = (folders ?? []).filter((folder) => folder.kind === 'label')

  const item = (folder: MailFolder): React.JSX.Element => {
    const Icon = ICONS[folder.kind]
    return (
      <li key={folder.id}>
        <button
          type="button"
          className={styles.folder}
          data-active={folder.id === current}
          data-unread={!!folder.unread}
          title={name(folder)}
          onClick={() => onSelect(folder)}
        >
          <Icon size={15} aria-hidden />
          <span className={styles.folderName}>{name(folder)}</span>
          {!!folder.unread && <span className={styles.folderCount}>{folder.unread}</span>}
        </button>
      </li>
    )
  }

  return (
    <nav className={styles.folders} aria-label={t('folders.title')}>
      <button type="button" className={styles.composeButton} onClick={onCompose}>
        <PenSquare size={16} aria-hidden />
        {t('compose')}
      </button>
      <ul className={styles.folderList}>{system.map(item)}</ul>
      {labels.length > 0 && (
        <>
          <p className={styles.folderHeading}>{t('folders.labels')}</p>
          <ul className={styles.folderList}>{labels.map(item)}</ul>
        </>
      )}
    </nav>
  )
}
