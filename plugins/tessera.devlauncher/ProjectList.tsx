import { useMemo, useState } from 'react'
import { LoaderCircle, Play, Search, Star } from 'lucide-react'
import {
  Select,
  useLanguage,
  usePluginTranslation,
  type DevLauncherProject
} from '@tessera/plugin-sdk'
import styles from './DevLauncherWidget.module.css'

interface ProjectListProps {
  projects: DevLauncherProject[]
  connected: boolean
  launching: string | null
  chosenProfiles: Record<string, string>
  onChooseProfile: (path: string, profile: string) => void
  onLaunch: (project: string, profile: string | null) => void
}

/** Projets de DevLauncher : favoris, récents, puis tous les autres, avec recherche. */
export function ProjectList({
  projects,
  connected,
  launching,
  chosenProfiles,
  onChooseProfile,
  onLaunch
}: ProjectListProps): React.JSX.Element {
  const t = usePluginTranslation()
  const [search, setSearch] = useState('')

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matching = projects.filter(
      (project) =>
        !query ||
        project.name.toLowerCase().includes(query) ||
        (project.type ?? '').toLowerCase().includes(query)
    )
    const favorites = matching.filter((project) => project.favorite)
    const recents = matching
      .filter((project) => !project.favorite && project.recent !== null)
      .sort((a, b) => (a.recent ?? 0) - (b.recent ?? 0))
    const others = matching.filter((project) => !project.favorite && project.recent === null)
    return [
      { key: 'favorites', projects: favorites },
      { key: 'recents', projects: recents },
      { key: 'all', projects: others }
    ].filter((group) => group.projects.length > 0)
  }, [projects, search])

  return (
    <div className={styles.projects}>
      <label className={`${styles.search} no-drag`}>
        <Search size={14} aria-hidden />
        <input
          type="search"
          value={search}
          placeholder={t('search')}
          aria-label={t('search')}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <div className={styles.scroll}>
        {groups.length === 0 && <p className={styles.empty}>{t('noProjects')}</p>}
        {groups.map((group) => (
          <section key={group.key}>
            <h4 className={styles.groupTitle}>{t(`groups.${group.key}`)}</h4>
            <ul className={styles.list}>
              {group.projects.map((project) => (
                <ProjectRow
                  key={project.path}
                  project={project}
                  connected={connected}
                  launching={launching === project.name}
                  busy={launching !== null}
                  profile={chosenProfiles[project.path]}
                  onChooseProfile={(profile) => onChooseProfile(project.path, profile)}
                  onLaunch={(profile) => onLaunch(project.name, profile)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function ProjectRow({
  project,
  connected,
  launching,
  busy,
  profile,
  onChooseProfile,
  onLaunch
}: {
  project: DevLauncherProject
  connected: boolean
  launching: boolean
  busy: boolean
  profile: string | undefined
  onChooseProfile: (profile: string) => void
  onLaunch: (profile: string | null) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  // Profil choisi dans le bloc, sinon le dernier utilisé dans DevLauncher
  const selected =
    profile && project.profiles.includes(profile)
      ? profile
      : project.lastProfile && project.profiles.includes(project.lastProfile)
        ? project.lastProfile
        : (project.profiles[0] ?? null)

  const details = [
    project.type,
    project.launchCount > 0 ? t('launchCount', { count: project.launchCount }) : null,
    project.lastLaunchAt
      ? t('lastLaunch', {
          date: new Date(project.lastLaunchAt).toLocaleDateString(language, {
            day: 'numeric',
            month: 'short'
          })
        })
      : null
  ].filter(Boolean)

  return (
    <li className={styles.row} title={project.path}>
      <div className={styles.rowText}>
        <span className={styles.rowName}>
          {project.favorite && <Star size={12} className={styles.star} aria-hidden />}
          {project.name}
        </span>
        {details.length > 0 && <span className={styles.rowMeta}>{details.join(' · ')}</span>}
      </div>
      {project.profiles.length > 1 && selected && (
        <div className={`${styles.profile} no-drag`}>
          <Select
            value={selected}
            onChange={onChooseProfile}
            aria-label={t('profile')}
            options={project.profiles.map((name) => ({ value: name, label: name }))}
          />
        </div>
      )}
      <button
        type="button"
        className={`${styles.launch} no-drag`}
        disabled={!connected || busy}
        title={connected ? t('launchProject', { project: project.name }) : t('needsMcp')}
        aria-label={t('launchProject', { project: project.name })}
        onClick={() => onLaunch(selected)}
      >
        {launching ? (
          <LoaderCircle size={16} className={styles.spin} aria-hidden />
        ) : (
          <Play size={16} aria-hidden />
        )}
      </button>
    </li>
  )
}
