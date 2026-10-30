import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { create } from 'zustand'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ClipboardPaste,
  Copy,
  Eye,
  EyeOff,
  File,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  List,
  Pencil,
  RefreshCw,
  Scissors,
  Search,
  Star,
  StarOff,
  Trash2,
  X
} from 'lucide-react'
import {
  openContextMenu,
  openInTessera,
  useLanguage,
  useLatest,
  usePluginTranslation,
  type MenuItem,
  type WidgetProps
} from '@tessera/plugin-sdk'
import type { FileEntry, FileFavorite, FilePlace, FolderListing } from '@shared/files'
import { isValidFileName } from '@shared/files'
import { NAVIGATE_EVENT, openFavorite, useFavorites, type NavigateDetail } from './favorites'
import styles from './FilesWidget.module.css'

interface FilesConfig {
  path?: string
  view?: 'list' | 'grid'
  showHidden?: boolean
  sort?: 'name' | 'modified' | 'size'
  descending?: boolean
}

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico'])
const REFRESH_MS = 4000

/** Presse-papiers des fichiers (entre les blocs Fichiers de Tessera). */
const useFileClipboard = create<{ value: { mode: 'copy' | 'cut'; paths: string[] } | null }>()(
  () => ({ value: null })
)

function formatSize(bytes: number | null, language: string): string {
  if (bytes === null) return ''
  const units = language === 'en' ? ['B', 'KB', 'MB', 'GB', 'TB'] : ['o', 'Ko', 'Mo', 'Go', 'To']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toLocaleString(language, { maximumFractionDigits: unit === 0 || value >= 100 ? 0 : 1 })} ${units[unit]}`
}

/** Gestionnaire de fichiers : un dossier, ses fichiers, et les opérations courantes. */
export function FilesWidget({ config, setConfig }: WidgetProps<FilesConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const api = window.tessera.files
  const [places, setPlaces] = useState<FilePlace[]>([])
  const path = config.path || places.find((place) => place.id === 'home')?.path || ''
  const [listing, setListing] = useState<FolderListing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<{ back: string[]; forward: string[] }>({
    back: [],
    forward: []
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [anchor, setAnchor] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FileEntry[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [icons, setIcons] = useState<Record<string, string | null>>({})
  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({})
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [wide, setWide] = useState(true)
  const favorites = useFavorites()
  const clipboard = useFileClipboard((state) => state.value)
  const rootRef = useRef<HTMLDivElement>(null)
  const view = config.view ?? 'list'
  const showHidden = config.showHidden ?? false
  const sort = config.sort ?? 'name'
  const descending = config.descending ?? false
  // Dossier affiché : une réponse arrivée après un changement de dossier (dossier lent) ou de
  // recherche est ignorée, sinon elle remplacerait le contenu du dossier courant
  const pathRef = useLatest(path)
  const searchToken = useRef(0)

  useEffect(() => {
    void api.places().then(setPlaces)
  }, [api])

  // Largeur du bloc : le panneau des emplacements disparaît quand il est étroit
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 560))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const load = useCallback(
    (target: string) => {
      if (!target) return
      api
        .list(target)
        .then((result) => {
          if (target !== pathRef.current) return
          setListing(result)
          setError(null)
        })
        .catch(() => target === pathRef.current && setError(t('cannotOpen', { path: target })))
    },
    [api, t, pathRef]
  )

  useEffect(() => {
    load(path)
    if (results !== null) return
    const timer = window.setInterval(() => !document.hidden && load(path), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [path, load, results])

  const go = (target: string, record = true): void => {
    if (!target || target === path) return
    if (record) setHistory((current) => ({ back: [...current.back, path].slice(-50), forward: [] }))
    searchToken.current += 1
    setSearching(false)
    setSelected(new Set())
    setResults(null)
    setQuery('')
    setConfig({ path: target })
  }

  // Bloc Favoris : « ouvrir ce dossier »
  useEffect(() => {
    const onNavigate = (event: Event): void => {
      const detail = (event as CustomEvent<NavigateDetail>).detail
      if (detail.handled || !rootRef.current?.isConnected) return
      detail.handled = true
      go(detail.path)
    }
    window.addEventListener(NAVIGATE_EVENT, onNavigate)
    return () => window.removeEventListener(NAVIGATE_EVENT, onNavigate)
  })

  const entries = useMemo(() => {
    const list = (results ?? listing?.entries ?? []).filter((entry) => showHidden || !entry.hidden)
    const factor = descending ? -1 : 1
    return [...list].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      if (sort === 'modified') return factor * (a.modifiedAt - b.modifiedAt)
      if (sort === 'size') return factor * ((a.size ?? 0) - (b.size ?? 0))
      return factor * a.name.localeCompare(b.name, language, { numeric: true, sensitivity: 'base' })
    })
  }, [results, listing, showHidden, sort, descending, language])

  // Icônes de Windows (et aperçus d'images en grille) des fichiers affichés. Les dossiers
  // gardent l'icône de dossier de Tessera (Windows leur donne celle d'un disque).
  useEffect(() => {
    const missing = entries
      .filter((entry) => !entry.isDirectory && !(entry.path in icons))
      .slice(0, 200)
      .map((entry) => entry.path)
    if (missing.length === 0) return
    let cancelled = false
    void api.icons(missing).then((found) => !cancelled && setIcons((old) => ({ ...old, ...found })))
    return () => {
      cancelled = true
    }
  }, [entries, icons, api])

  useEffect(() => {
    if (view !== 'grid') return
    const missing = entries
      .filter((entry) => IMAGE.has(entry.extension) && !(entry.path in thumbnails))
      .slice(0, 40)
    if (missing.length === 0) return
    let cancelled = false
    void Promise.all(
      missing.map(async (entry) => [entry.path, await api.thumbnail(entry.path)] as const)
    ).then(
      (found) => !cancelled && setThumbnails((old) => ({ ...old, ...Object.fromEntries(found) }))
    )
    return () => {
      cancelled = true
    }
  }, [view, entries, thumbnails, api])

  const flash = (text: string): void => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 3000)
  }

  const report = (result: { done: number; failed: { path: string }[] }): void => {
    if (result.failed.length > 0) flash(t('failed', { count: result.failed.length }))
    load(path)
  }

  const open = (entry: FileEntry): void => {
    if (entry.isDirectory) {
      go(entry.path)
      return
    }
    // Dans le bloc qui doit l'afficher (programme habituel, bloc prioritaire), sinon Windows
    openInTessera(entry.path).catch(() => flash(t('cannotOpenFile')))
  }

  const selectedPaths = (): string[] =>
    entries.filter((entry) => selected.has(entry.path)).map((e) => e.path)

  const copy = (mode: 'copy' | 'cut'): void => {
    const paths = selectedPaths()
    if (paths.length === 0) return
    useFileClipboard.setState({ value: { mode, paths } })
    flash(t(mode === 'copy' ? 'copied' : 'cut', { count: paths.length }))
  }

  /** Colle dans le dossier affiché, ou dans `target` (dossier de la liste, favori…). */
  const paste = (target = path): void => {
    const clipboard = useFileClipboard.getState().value
    if (!clipboard || !target) return
    const { mode, paths } = clipboard
    if (mode === 'cut') useFileClipboard.setState({ value: null })
    void (mode === 'copy' ? api.copy(paths, target) : api.move(paths, target)).then(report)
  }

  const trash = (paths = selectedPaths()): void => {
    if (paths.length === 0) return
    void api.trash(paths).then((result) => {
      setSelected(new Set())
      report(result)
    })
  }

  const createFolder = (): void => {
    if (!path) return
    void api
      .createFolder(path, t('newFolder'))
      .then((created) => {
        load(path)
        setSelected(new Set([created]))
        setRenaming(created)
      })
      .catch(() => flash(t('failed', { count: 1 })))
  }

  const finishRename = (entry: FileEntry, name: string): void => {
    setRenaming(null)
    if (name === entry.name) return
    if (!isValidFileName(name)) {
      flash(t('invalidName'))
      return
    }
    void api
      .rename(entry.path, name)
      .then((renamed) => {
        setSelected(new Set([renamed]))
        load(path)
      })
      .catch(() => flash(t('renameFailed')))
  }

  const runSearch = (): void => {
    const text = query.trim()
    const token = ++searchToken.current
    if (!text || !path) {
      setResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    api
      .search(path, text)
      .then((found) => token === searchToken.current && setResults(found))
      .catch(() => token === searchToken.current && flash(t('searchFailed')))
      .finally(() => token === searchToken.current && setSearching(false))
  }

  /** Clic : sélection simple, Ctrl (ajout), Maj (plage). */
  const select = (entry: FileEntry, event: React.MouseEvent): void => {
    if (event.shiftKey && anchor) {
      const from = entries.findIndex((item) => item.path === anchor)
      const to = entries.findIndex((item) => item.path === entry.path)
      const [start, end] = from < to ? [from, to] : [to, from]
      setSelected(new Set(entries.slice(start, end + 1).map((item) => item.path)))
      return
    }
    if (event.ctrlKey) {
      const next = new Set(selected)
      if (next.has(entry.path)) next.delete(entry.path)
      else next.add(entry.path)
      setSelected(next)
    } else {
      setSelected(new Set([entry.path]))
    }
    setAnchor(entry.path)
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (renaming || (event.target as HTMLElement).closest('input')) return
    const key = event.key.toLowerCase()
    if (event.ctrlKey && key === 'a') setSelected(new Set(entries.map((entry) => entry.path)))
    else if (event.ctrlKey && key === 'c') copy('copy')
    else if (event.ctrlKey && key === 'x') copy('cut')
    else if (event.ctrlKey && key === 'v') paste()
    else if (key === 'delete') trash()
    else if (key === 'f2' && selected.size === 1) setRenaming([...selected][0])
    else if (key === 'f5') load(path)
    else if (key === 'backspace' && listing?.parent) go(listing.parent)
    else if (key === 'enter' && selected.size === 1) {
      const entry = entries.find((item) => selected.has(item.path))
      if (entry) open(entry)
    } else return
    event.preventDefault()
  }

  /* ---------- Glisser-déposer ---------- */

  const onDragStart = (entry: FileEntry, event: React.DragEvent): void => {
    event.preventDefault()
    const paths = selected.has(entry.path) ? selectedPaths() : [entry.path]
    api.drag(paths)
  }

  const onDragOver = (event: React.DragEvent, target: string): void => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    // Explorateur : même lecteur = déplacer, autre lecteur = copier ; Ctrl copie toujours
    event.dataTransfer.dropEffect = event.ctrlKey ? 'copy' : 'move'
    setDropTarget(target)
  }

  const onDrop = (event: React.DragEvent, target: string): void => {
    event.preventDefault()
    event.stopPropagation()
    setDropTarget(null)
    const sources = api.pathsOf([...event.dataTransfer.files])
    if (sources.length === 0 || !target) return
    const sameDrive = sources.every(
      (source) => source.slice(0, 2).toLowerCase() === target.slice(0, 2).toLowerCase()
    )
    void (event.ctrlKey || !sameDrive ? api.copy(sources, target) : api.move(sources, target)).then(
      report
    )
  }

  /* ---------- Menus ---------- */

  const isFavorite = (target: string): boolean =>
    favorites.some((favorite) => favorite.path.toLowerCase() === target.toLowerCase())

  /*
   * Menus du clic droit, toujours dans le même ordre : ouvrir, Explorateur | couper, copier,
   * coller | renommer, copier le chemin, favoris | corbeille. Partout dans le bloc (jamais le
   * menu du bloc lui-même).
   */

  const favoriteItem = (target: string): MenuItem =>
    isFavorite(target)
      ? {
          label: t('unfavorite'),
          icon: StarOff,
          onSelect: () => void api.setFavorite(target, false)
        }
      : { label: t('favorite'), icon: Star, onSelect: () => void api.setFavorite(target, true) }

  const copyPathItem = (target: string): MenuItem => ({
    label: t('copyPath'),
    icon: Copy,
    onSelect: () => void navigator.clipboard.writeText(target)
  })

  const pasteIntoItem = (target: string): MenuItem => ({
    label: t('pasteInto'),
    icon: ClipboardPaste,
    disabled: !clipboard,
    onSelect: () => paste(target)
  })

  const entryMenu = (entry: FileEntry): MenuItem[] => {
    const many = selected.has(entry.path) && selected.size > 1
    const single = (items: MenuItem[]): MenuItem[] => (many ? [] : items)
    const folder = (items: MenuItem[]): MenuItem[] => (entry.isDirectory && !many ? items : [])
    return [
      ...single([
        {
          label: t('open'),
          icon: entry.isDirectory ? FolderOpen : File,
          onSelect: () => open(entry)
        }
      ]),
      { label: t('showInExplorer'), icon: Folder, onSelect: () => void api.show(entry.path) },
      'separator',
      { label: t('cutAction'), icon: Scissors, onSelect: () => copy('cut') },
      { label: t('copy'), icon: Copy, onSelect: () => copy('copy') },
      ...folder([pasteIntoItem(entry.path)]),
      'separator',
      ...single([
        { label: t('rename'), icon: Pencil, onSelect: () => setRenaming(entry.path) },
        copyPathItem(entry.path)
      ]),
      ...folder([favoriteItem(entry.path)]),
      'separator',
      { label: t('trash'), icon: Trash2, danger: true, onSelect: () => trash() }
    ]
  }

  /** Fond de la liste et reste du bloc : le dossier affiché. */
  const backgroundMenu = (): MenuItem[] => [
    { label: t('newFolderHere'), icon: FolderPlus, onSelect: createFolder },
    { label: t('showInExplorer'), icon: Folder, onSelect: () => void api.show(path) },
    'separator',
    { label: t('paste'), icon: ClipboardPaste, disabled: !clipboard, onSelect: () => paste() },
    'separator',
    { label: t('refresh'), icon: RefreshCw, onSelect: () => load(path) },
    copyPathItem(path),
    favoriteItem(path)
  ]

  /** Favori ou emplacement du panneau de gauche. */
  const placeMenu = (target: string, isDirectory = true): MenuItem[] =>
    isDirectory
      ? [
          { label: t('openHere'), icon: FolderOpen, onSelect: () => go(target) },
          { label: t('showInExplorer'), icon: Folder, onSelect: () => void api.show(target) },
          'separator',
          pasteIntoItem(target),
          'separator',
          copyPathItem(target),
          favoriteItem(target)
        ]
      : [
          {
            label: t('open'),
            icon: File,
            onSelect: () => void openInTessera(target).catch(() => flash(t('cannotOpenFile')))
          },
          { label: t('showInExplorer'), icon: Folder, onSelect: () => void api.show(target) },
          'separator',
          copyPathItem(target),
          favoriteItem(target)
        ]

  const entryIcon = (entry: FileEntry, size: number): React.JSX.Element => {
    const thumb = view === 'grid' ? thumbnails[entry.path] : null
    if (thumb) return <img className={styles.thumbnail} src={thumb} alt="" />
    const icon = entry.isDirectory ? null : icons[entry.path]
    if (icon) return <img src={icon} alt="" width={size} height={size} />
    return entry.isDirectory ? (
      <Folder size={size} className={styles.folderIcon} aria-hidden />
    ) : (
      <File size={size} aria-hidden />
    )
  }

  const renderName = (entry: FileEntry): React.JSX.Element =>
    renaming === entry.path ? (
      <RenameInput
        initial={entry.name}
        onDone={(name) => finishRename(entry, name)}
        onCancel={() => setRenaming(null)}
      />
    ) : (
      <span className={styles.name} title={results ? entry.path : entry.name}>
        {entry.name}
      </span>
    )

  const crumbs = path
    ? path
        .split('\\')
        .filter(Boolean)
        .map((part, index, parts) => ({
          name: part,
          path: parts.slice(0, index + 1).join('\\') + (index === 0 ? '\\' : '')
        }))
    : []
  const selectedSize = entries
    .filter((entry) => selected.has(entry.path))
    .reduce((sum, entry) => sum + (entry.size ?? 0), 0)

  return (
    <div
      ref={rootRef}
      className={styles.files}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onContextMenu={openContextMenu(backgroundMenu)}
    >
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.iconButton}
          title={t('back')}
          aria-label={t('back')}
          disabled={history.back.length === 0}
          onClick={() => {
            const target = history.back.at(-1)
            if (!target) return
            setHistory({ back: history.back.slice(0, -1), forward: [path, ...history.forward] })
            go(target, false)
          }}
        >
          <ArrowLeft size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('forward')}
          aria-label={t('forward')}
          disabled={history.forward.length === 0}
          onClick={() => {
            const [target, ...rest] = history.forward
            if (!target) return
            setHistory({ back: [...history.back, path], forward: rest })
            go(target, false)
          }}
        >
          <ArrowRight size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('up')}
          aria-label={t('up')}
          disabled={!listing?.parent}
          onClick={() => listing?.parent && go(listing.parent)}
        >
          <ArrowUp size={15} aria-hidden />
        </button>
        {editingPath !== null ? (
          <form
            className={styles.pathForm}
            onSubmit={(event) => {
              event.preventDefault()
              go(editingPath.trim())
              setEditingPath(null)
            }}
          >
            <input
              className={styles.pathInput}
              value={editingPath}
              autoFocus
              aria-label={t('path')}
              onChange={(event) => setEditingPath(event.target.value)}
              onBlur={() => setEditingPath(null)}
              onKeyDown={(event) => event.key === 'Escape' && setEditingPath(null)}
            />
          </form>
        ) : (
          <div
            className={styles.breadcrumb}
            title={t('editPath')}
            onDoubleClick={() => setEditingPath(path)}
            onClick={(event) => event.target === event.currentTarget && setEditingPath(path)}
          >
            {crumbs.map((crumb, index) => (
              <button
                key={crumb.path}
                type="button"
                className={styles.crumb}
                data-current={index === crumbs.length - 1}
                onClick={() => go(crumb.path)}
                onDragOver={(event) => onDragOver(event, crumb.path)}
                onDrop={(event) => onDrop(event, crumb.path)}
              >
                {crumb.name}
              </button>
            ))}
          </div>
        )}
        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault()
            runSearch()
          }}
        >
          <Search size={13} aria-hidden />
          <input
            value={query}
            placeholder={t('search')}
            aria-label={t('search')}
            onChange={(event) => {
              setQuery(event.target.value)
              if (!event.target.value) setResults(null)
            }}
          />
          {(query || results) && (
            <button
              type="button"
              className={styles.clearSearch}
              title={t('clearSearch')}
              aria-label={t('clearSearch')}
              onClick={() => {
                setQuery('')
                setResults(null)
              }}
            >
              <X size={12} aria-hidden />
            </button>
          )}
        </form>
        <button
          type="button"
          className={styles.iconButton}
          title={t('newFolder')}
          aria-label={t('newFolder')}
          onClick={createFolder}
        >
          <FolderPlus size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={showHidden ? t('hideHidden') : t('showHidden')}
          aria-label={showHidden ? t('hideHidden') : t('showHidden')}
          onClick={() => setConfig({ showHidden: !showHidden })}
        >
          {showHidden ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={view === 'list' ? t('gridView') : t('listView')}
          aria-label={view === 'list' ? t('gridView') : t('listView')}
          onClick={() => setConfig({ view: view === 'list' ? 'grid' : 'list' })}
        >
          {view === 'list' ? <LayoutGrid size={15} aria-hidden /> : <List size={15} aria-hidden />}
        </button>
      </div>

      <div className={styles.body}>
        {wide && (
          <nav className={styles.places} aria-label={t('places')}>
            {favorites.length > 0 && (
              <>
                <h4>{t('favorites')}</h4>
                {favorites.map((favorite: FileFavorite) => (
                  <button
                    key={favorite.path}
                    type="button"
                    className={styles.place}
                    data-active={favorite.path === path}
                    title={favorite.path}
                    // Un dossier s'ouvre dans ce bloc, un fichier comme depuis le bloc Favoris
                    onClick={() =>
                      favorite.isDirectory
                        ? go(favorite.path)
                        : void openFavorite(favorite).catch(() => flash(t('cannotOpenFile')))
                    }
                    onContextMenu={openContextMenu(() =>
                      placeMenu(favorite.path, favorite.isDirectory)
                    )}
                    onDragOver={(event) => favorite.isDirectory && onDragOver(event, favorite.path)}
                    onDrop={(event) => favorite.isDirectory && onDrop(event, favorite.path)}
                  >
                    <Star size={14} aria-hidden /> <span>{favorite.name}</span>
                  </button>
                ))}
              </>
            )}
            <h4>{t('places')}</h4>
            {places.map((place) => (
              <button
                key={place.path}
                type="button"
                className={styles.place}
                data-active={place.path === path}
                title={place.path}
                onClick={() => go(place.path)}
                onContextMenu={openContextMenu(() => placeMenu(place.path))}
                onDragOver={(event) => onDragOver(event, place.path)}
                onDrop={(event) => onDrop(event, place.path)}
              >
                {place.kind === 'drive' ? (
                  <HardDrive size={14} aria-hidden />
                ) : (
                  <Folder size={14} aria-hidden />
                )}
                <span>{place.kind === 'folder' ? t(`folder.${place.id}`) : place.name}</span>
              </button>
            ))}
          </nav>
        )}

        <div
          className={styles.content}
          data-drop={dropTarget === path}
          onClick={(event) => event.target === event.currentTarget && setSelected(new Set())}
          onContextMenu={openContextMenu(backgroundMenu)}
          onDragOver={(event) => onDragOver(event, path)}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setDropTarget(null)
          }}
          onDrop={(event) => onDrop(event, path)}
        >
          {error ? (
            <p className={styles.empty}>{error}</p>
          ) : searching ? (
            <p className={styles.empty}>{t('searching')}</p>
          ) : entries.length === 0 ? (
            <p className={styles.empty}>{results ? t('noResults') : t('emptyFolder')}</p>
          ) : view === 'list' ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  {(['name', 'modified', 'size'] as const).map((key) => (
                    <th key={key}>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig(
                            sort === key
                              ? { descending: !descending }
                              : { sort: key, descending: false }
                          )
                        }
                      >
                        {t(`column.${key}`)}
                        {sort === key ? (descending ? ' ↓' : ' ↑') : ''}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.path}
                    data-selected={selected.has(entry.path)}
                    data-hidden={entry.hidden}
                    data-drop={dropTarget === entry.path}
                    draggable={renaming !== entry.path}
                    onClick={(event) => select(entry, event)}
                    onDoubleClick={() => open(entry)}
                    onContextMenu={(event) => {
                      if (!selected.has(entry.path)) setSelected(new Set([entry.path]))
                      openContextMenu(() => entryMenu(entry))(event)
                    }}
                    onDragStart={(event) => onDragStart(entry, event)}
                    onDragOver={(event) => entry.isDirectory && onDragOver(event, entry.path)}
                    onDrop={(event) => entry.isDirectory && onDrop(event, entry.path)}
                  >
                    <td className={styles.nameCell}>
                      {entryIcon(entry, 16)}
                      {renderName(entry)}
                    </td>
                    <td className={styles.muted}>
                      {new Date(entry.modifiedAt).toLocaleString(language, {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td className={styles.muted}>{formatSize(entry.size, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className={styles.grid}>
              {entries.map((entry) => (
                <li
                  key={entry.path}
                  className={styles.tile}
                  data-selected={selected.has(entry.path)}
                  data-hidden={entry.hidden}
                  data-drop={dropTarget === entry.path}
                  draggable={renaming !== entry.path}
                  title={entry.path}
                  onClick={(event) => select(entry, event)}
                  onDoubleClick={() => open(entry)}
                  onContextMenu={(event) => {
                    if (!selected.has(entry.path)) setSelected(new Set([entry.path]))
                    openContextMenu(() => entryMenu(entry))(event)
                  }}
                  onDragStart={(event) => onDragStart(entry, event)}
                  onDragOver={(event) => entry.isDirectory && onDragOver(event, entry.path)}
                  onDrop={(event) => entry.isDirectory && onDrop(event, entry.path)}
                >
                  <span className={styles.tileIcon}>{entryIcon(entry, 32)}</span>
                  {renderName(entry)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.status}>
        <span>
          {message ??
            (selected.size > 0
              ? t('selection', { count: selected.size, size: formatSize(selectedSize, language) })
              : t('items', { count: entries.length }))}
        </span>
        {listing?.truncated && !results && <span>{t('truncated')}</span>}
        {selected.size > 0 && (
          <span className={styles.statusActions}>
            <button
              type="button"
              title={t('copy')}
              aria-label={t('copy')}
              onClick={() => copy('copy')}
            >
              <Copy size={13} aria-hidden />
            </button>
            <button
              type="button"
              title={t('cutAction')}
              aria-label={t('cutAction')}
              onClick={() => copy('cut')}
            >
              <Scissors size={13} aria-hidden />
            </button>
            <button
              type="button"
              title={t('trash')}
              aria-label={t('trash')}
              onClick={() => trash()}
            >
              <Trash2 size={13} aria-hidden />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

/** Champ de renommage : Entrée valide, Échap annule (nom sans l'extension sélectionné). */
function RenameInput({
  initial,
  onDone,
  onCancel
}: {
  initial: string
  onDone: (name: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const input = ref.current
    if (!input) return
    input.focus()
    const dot = initial.lastIndexOf('.')
    input.setSelectionRange(0, dot > 0 ? dot : initial.length)
  }, [initial])
  return (
    <input
      ref={ref}
      className={styles.renameInput}
      value={value}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onDone(value.trim())}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onDone(value.trim())
        else if (event.key === 'Escape') onCancel()
        event.stopPropagation()
      }}
    />
  )
}
