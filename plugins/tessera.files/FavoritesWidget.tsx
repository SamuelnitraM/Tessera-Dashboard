import { useEffect, useState } from 'react'
import { Copy, File, Folder, FolderOpen, FolderPlus, StarOff } from 'lucide-react'
import { openContextMenu, usePluginTranslation, type MenuItem } from '@tessera/plugin-sdk'
import type { FileFavorite } from '@shared/files'
import { openFavorite, useFavorites } from './favorites'
import styles from './FilesWidget.module.css'

/** Emplacement de dépôt pendant un glisser : avant ou après ce favori. */
interface DropMark {
  path: string
  after: boolean
}

/**
 * Dossiers favoris : un clic ouvre le dossier dans un bloc Fichiers de la page (sinon dans
 * l'Explorateur), un fichier dans son application habituelle. On les réordonne en les glissant :
 * une barre montre où le favori va se placer.
 */
export function FavoritesWidget(): React.JSX.Element {
  const t = usePluginTranslation()
  const favorites = useFavorites()
  const [icons, setIcons] = useState<Record<string, string | null>>({})
  const [dragged, setDragged] = useState<string | null>(null)
  const [mark, setMark] = useState<DropMark | null>(null)
  const api = window.tessera.files

  useEffect(() => {
    const missing = favorites.filter((item) => !item.isDirectory && !(item.path in icons))
    if (missing.length === 0) return
    let cancelled = false
    void api
      .icons(missing.map((item) => item.path))
      .then((found) => !cancelled && setIcons((old) => ({ ...old, ...found })))
    return () => {
      cancelled = true
    }
  }, [favorites, icons, api])

  const add = (): void =>
    void api.pickFolder().then((path) => {
      if (path) void api.setFavorite(path, true)
    })

  const menu = (favorite: FileFavorite): MenuItem[] => [
    {
      label: t('open'),
      icon: favorite.isDirectory ? FolderOpen : File,
      onSelect: () => void openFavorite(favorite)
    },
    { label: t('showInExplorer'), icon: Folder, onSelect: () => void api.show(favorite.path) },
    {
      label: t('copyPath'),
      icon: Copy,
      onSelect: () => void navigator.clipboard.writeText(favorite.path)
    },
    'separator',
    {
      label: t('unfavorite'),
      icon: StarOff,
      danger: true,
      onSelect: () => void api.setFavorite(favorite.path, false)
    }
  ]

  const drop = (): void => {
    if (!dragged || !mark || dragged === mark.path) return
    const order = favorites.map((item) => item.path).filter((path) => path !== dragged)
    const index = order.indexOf(mark.path)
    order.splice(mark.after ? index + 1 : index, 0, dragged)
    void api.reorderFavorites(order)
  }

  return (
    <div
      className={styles.favorites}
      onContextMenu={openContextMenu([
        { label: t('addFavorite'), icon: FolderPlus, onSelect: add }
      ])}
    >
      <ul className={styles.favoriteGrid}>
        <li>
          <button type="button" className={styles.addTile} onClick={add} title={t('addFavorite')}>
            <FolderPlus size={28} aria-hidden />
            <span>{t('add')}</span>
          </button>
        </li>
        {favorites.map((favorite) => (
          <li
            key={favorite.path}
            draggable
            data-dragged={dragged === favorite.path}
            data-mark={mark?.path === favorite.path ? (mark.after ? 'after' : 'before') : undefined}
            onDragStart={(event) => {
              setDragged(favorite.path)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => {
              setDragged(null)
              setMark(null)
            }}
            onDragOver={(event) => {
              if (!dragged) return
              event.preventDefault()
              // Moitié gauche : avant ce favori ; moitié droite : après
              const box = event.currentTarget.getBoundingClientRect()
              const after = event.clientX > box.left + box.width / 2
              const next = dragged === favorite.path ? null : { path: favorite.path, after }
              if (next?.path !== mark?.path || next?.after !== mark?.after) setMark(next)
            }}
            onDrop={(event) => {
              event.preventDefault()
              drop()
              setMark(null)
            }}
          >
            <button
              type="button"
              className={styles.favorite}
              title={favorite.path}
              onClick={() => void openFavorite(favorite)}
              onContextMenu={openContextMenu(() => menu(favorite))}
            >
              {favorite.isDirectory ? (
                <Folder size={28} className={styles.folderIcon} aria-hidden />
              ) : icons[favorite.path] ? (
                <img src={icons[favorite.path] ?? ''} alt="" width={28} height={28} />
              ) : (
                <File size={28} aria-hidden />
              )}
              <span>{favorite.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {favorites.length === 0 && <p className={styles.favoritesHint}>{t('noFavorites')}</p>}
    </div>
  )
}
