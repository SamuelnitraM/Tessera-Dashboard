import { useEffect, useState } from 'react'
import { BellRing, ExternalLink, Play, Trash2, TriangleAlert, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  BUILT_IN_SOUNDS,
  customSound,
  DEFAULT_SOUND,
  resolveSound,
  sourceSettings,
  type NotificationSource,
  type SourceSettings
} from '@shared/notifications'
import { SourceIcon } from '../../../components/notifications/SourceIcon'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Switch } from '../../../components/ui/Switch'
import { useNotificationSources } from '../../../hooks/useNotificationSources'
import { forgetSound, playSound } from '../../../lib/sounds'
import { useSettingsStore } from '../../../stores/settings'
import styles from '../settings.module.css'
import { SettingRow, SettingsCard } from '../SettingRow'

/** Notifications : bannières, sons, Ne pas déranger, réglages par application, sons importés. */
export function NotificationsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings.notifications)
  const update = useSettingsStore((state) => state.update)
  const { sources } = useNotificationSources()
  const [soundError, setSoundError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)

  // Notifications coupées dans Windows : les bannières ne peuvent pas s'afficher
  useEffect(() => {
    let active = true
    void window.tessera.notifications.bannersBlocked().then((value) => active && setBlocked(value))
    return () => {
      active = false
    }
  }, [])

  const soundOptions = [
    { value: 'system', label: t('settings.notifications.sounds.system') },
    { value: 'none', label: t('settings.notifications.sounds.none') },
    ...BUILT_IN_SOUNDS.map((sound) => ({
      value: sound,
      label: t(`settings.notifications.sounds.${sound}`)
    })),
    ...settings.sounds.map((sound) => ({ value: customSound(sound.id), label: sound.name }))
  ]

  const setSource = (source: NotificationSource, patch: Partial<SourceSettings>): void =>
    void update({
      notifications: {
        sources: {
          ...settings.sources,
          [source]: { ...sourceSettings(settings, source), ...patch }
        }
      }
    })

  const importSound = async (): Promise<void> => {
    setSoundError(null)
    try {
      await window.tessera.notifications.importSound()
    } catch (error) {
      setSoundError(
        (error as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '')
      )
    }
  }

  return (
    <>
      <SettingsCard>
        <SettingRow
          label={t('settings.notifications.banners.label')}
          description={t('settings.notifications.banners.description')}
        >
          {({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.banners}
              onChange={(banners) => void update({ notifications: { banners } })}
            />
          )}
        </SettingRow>
        {blocked && settings.banners && (
          <div className={styles.warning} role="alert">
            <TriangleAlert size={16} aria-hidden />
            <p>{t('settings.notifications.blocked')}</p>
            <Button
              icon={ExternalLink}
              onClick={() => void window.tessera.notifications.openSystemSettings()}
            >
              {t('settings.notifications.openWindowsSettings')}
            </Button>
          </div>
        )}
        <SettingRow
          label={t('settings.notifications.sound.label')}
          description={t('settings.notifications.sound.description')}
        >
          {({ labelId }) => (
            <div className={styles.inline}>
              <Select
                aria-labelledby={labelId}
                value={settings.sound}
                options={soundOptions}
                onChange={(sound) => void update({ notifications: { sound } })}
              />
              <PlayButton sound={settings.sound} volume={settings.volume} />
            </div>
          )}
        </SettingRow>
        <SettingRow
          label={t('settings.notifications.volume.label')}
          description={t('settings.notifications.volume.description')}
        >
          {({ labelId }) => (
            <div className={styles.inline}>
              <input
                type="range"
                className={styles.range}
                min={0}
                max={100}
                step={5}
                value={settings.volume}
                aria-labelledby={labelId}
                onChange={(event) =>
                  void update({ notifications: { volume: Number(event.target.value) } })
                }
              />
              <span className={styles.rangeValue}>{settings.volume} %</span>
            </div>
          )}
        </SettingRow>
        <div className={styles.cardFooter}>
          <Button icon={BellRing} onClick={() => void window.tessera.notifications.test()}>
            {t('settings.notifications.test')}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title={t('settings.notifications.dndTitle')}>
        <SettingRow
          label={t('settings.notifications.dnd.label')}
          description={t('settings.notifications.dnd.description')}
        >
          {({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.doNotDisturb}
              onChange={(doNotDisturb) => void update({ notifications: { doNotDisturb } })}
            />
          )}
        </SettingRow>
        <SettingRow
          label={t('settings.notifications.schedule.label')}
          description={t('settings.notifications.schedule.description')}
        >
          {({ labelId }) => (
            <div className={styles.inline}>
              <Switch
                aria-labelledby={labelId}
                checked={settings.schedule.enabled}
                onChange={(enabled) =>
                  void update({ notifications: { schedule: { ...settings.schedule, enabled } } })
                }
              />
              <span>{t('settings.notifications.schedule.from')}</span>
              <TimeInput
                value={settings.schedule.from}
                label={t('settings.notifications.schedule.from')}
                onChange={(from) =>
                  void update({ notifications: { schedule: { ...settings.schedule, from } } })
                }
              />
              <span>{t('settings.notifications.schedule.to')}</span>
              <TimeInput
                value={settings.schedule.to}
                label={t('settings.notifications.schedule.to')}
                onChange={(to) =>
                  void update({ notifications: { schedule: { ...settings.schedule, to } } })
                }
              />
            </div>
          )}
        </SettingRow>
      </SettingsCard>

      <SettingsCard title={t('settings.notifications.sourcesTitle')}>
        <p className={styles.cardIntro}>{t('settings.notifications.sourcesIntro')}</p>
        <ul className={styles.sourceList}>
          {sources.map((info) => {
            const own = sourceSettings(settings, info.source)
            return (
              <li key={info.source} className={styles.sourceRow} data-disabled={!own.enabled}>
                <span className={styles.appIcon}>
                  <SourceIcon info={info} size={20} />
                </span>
                <span className={styles.sourceName}>{info.name}</span>
                <Select
                  aria-label={t('settings.notifications.soundFor', { name: info.name })}
                  value={own.sound}
                  options={[
                    { value: DEFAULT_SOUND, label: t('settings.notifications.soundDefault') },
                    ...soundOptions
                  ]}
                  onChange={(sound) => setSource(info.source, { sound })}
                />
                <PlayButton
                  sound={resolveSound(settings, info.source)}
                  volume={settings.volume}
                  label={t('settings.notifications.soundFor', { name: info.name })}
                />
                <SegmentedControl
                  aria-label={t('settings.notifications.priorityFor', { name: info.name })}
                  value={own.priority}
                  onChange={(priority) => setSource(info.source, { priority })}
                  options={[
                    { value: 'normal', label: t('settings.notifications.priorityNormal') },
                    { value: 'high', label: t('settings.notifications.priorityHigh') }
                  ]}
                />
                <Switch
                  aria-label={t('settings.notifications.enabled', { name: info.name })}
                  checked={own.enabled}
                  onChange={(enabled) => setSource(info.source, { enabled })}
                />
              </li>
            )
          })}
        </ul>
      </SettingsCard>

      <SettingsCard title={t('settings.notifications.soundsTitle')}>
        <p className={styles.cardIntro}>{t('settings.notifications.soundsIntro')}</p>
        {settings.sounds.length === 0 ? (
          <p className={styles.cardIntro}>{t('settings.notifications.noSounds')}</p>
        ) : (
          <ul className={styles.sourceList}>
            {settings.sounds.map((sound) => (
              <li key={sound.id} className={styles.sourceRow}>
                <span className={styles.sourceName}>{sound.name}</span>
                <PlayButton sound={customSound(sound.id)} volume={settings.volume} />
                <button
                  type="button"
                  className={styles.iconButton}
                  data-danger
                  title={t('settings.notifications.deleteSound')}
                  aria-label={`${t('settings.notifications.deleteSound')} : ${sound.name}`}
                  onClick={() => {
                    forgetSound(customSound(sound.id))
                    void window.tessera.notifications.deleteSound(sound.id)
                  }}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {soundError && <p className={styles.extensionError}>{soundError}</p>}
        <div className={styles.cardFooter}>
          <Button icon={Upload} onClick={() => void importSound()}>
            {t('settings.notifications.importSound')}
          </Button>
        </div>
      </SettingsCard>
    </>
  )
}

/** Écoute d'un son (le son de Windows ne peut être joué que par une bannière). */
function PlayButton({
  sound,
  volume,
  label
}: {
  sound: string
  volume: number
  label?: string
}): React.JSX.Element {
  const { t } = useTranslation()
  const text = label ?? t('settings.notifications.play')
  return (
    <button
      type="button"
      className={styles.iconButton}
      title={text}
      aria-label={text}
      disabled={sound === 'system' || sound === 'none'}
      onClick={() => void playSound(sound, volume)}
    >
      <Play size={16} aria-hidden />
    </button>
  )
}

/** Heure « HH:MM », enregistrée en quittant le champ. */
function TimeInput({
  value,
  label,
  onChange
}: {
  value: string
  label: string
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <input
      type="time"
      className={`${styles.input} ${styles.time}`}
      defaultValue={value}
      aria-label={label}
      onBlur={(event) => {
        const next = event.currentTarget.value
        if (/^\d{2}:\d{2}$/.test(next) && next !== value) onChange(next)
      }}
    />
  )
}
