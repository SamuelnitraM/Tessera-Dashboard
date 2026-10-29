import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AppAudio, AudioEndpoint, AudioFlow, AudioState } from '@shared/header-bar'
import { Select } from '../ui/Select'
import { HeaderPopover } from './HeaderPopover'
import { formatPercent, usePolling } from './helpers'
import { PanelTitle } from './parts'
import styles from './Widgets.module.css'

const REFRESH_MS = 2500
/** Après un réglage, la valeur lue dans Windows est ignorée un instant (elle arrive en retard). */
const LOCAL_MS = 1500
/** Molette sur le bouton : pas du volume. */
const WHEEL_STEP = 2

/** Haut-parleur barré, ou avec plus ou moins d'ondes selon le volume. */
function VolumeIcon({
  volume,
  muted
}: {
  volume: number | null
  muted: boolean
}): React.JSX.Element {
  if (muted || volume === null || volume === 0) return <VolumeX size={16} aria-hidden />
  if (volume < 34) return <Volume size={16} aria-hidden />
  if (volume < 67) return <Volume1 size={16} aria-hidden />
  return <Volume2 size={16} aria-hidden />
}

/**
 * Valeurs réglées par l'utilisateur, appliquées tout de suite à l'affichage et envoyées à
 * Windows sans attendre (au plus toutes les 80 ms pendant qu'on fait glisser le curseur).
 */
function useLocalAudio(state: AudioState | null): {
  audio: AudioState | null
  setVolume: (flow: AudioFlow, value: number) => void
  setMute: (flow: AudioFlow, value: boolean) => void
} {
  const [local, setLocal] = useState<{ value: AudioState; until: number } | null>(null)
  const sendTimer = useRef(0)
  const pendingVolume = useRef<{ flow: AudioFlow; value: number } | null>(null)
  useEffect(() => {
    if (!local) return
    const timer = window.setTimeout(() => setLocal(null), Math.max(0, local.until - Date.now()))
    return () => window.clearTimeout(timer)
  }, [local])
  const audio = local?.value ?? state

  const change = (flow: AudioFlow, patch: Partial<AudioEndpoint>): void => {
    if (!audio) return
    setLocal({
      value: { ...audio, [flow]: { ...audio[flow], ...patch } },
      until: Date.now() + LOCAL_MS
    })
  }

  return {
    audio,
    setVolume: (flow, value) => {
      change(flow, { volume: value, muted: false })
      pendingVolume.current = { flow, value }
      if (sendTimer.current) return
      sendTimer.current = window.setTimeout(() => {
        sendTimer.current = 0
        const next = pendingVolume.current
        pendingVolume.current = null
        if (!next) return
        void window.tessera.headerBar.setVolume(next.flow, next.value).catch(() => undefined)
        if (audio?.[next.flow].muted) {
          void window.tessera.headerBar.setMute(next.flow, false).catch(() => undefined)
        }
      }, 80)
    },
    setMute: (flow, value) => {
      change(flow, { muted: value })
      void window.tessera.headerBar.setMute(flow, value).catch(() => undefined)
    }
  }
}

/** Son : volume dans la barre (molette pour le régler), sortie et micro dans le panneau. */
export function SoundItem(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { data, failed, refresh } = usePolling(() => window.tessera.headerBar.audio(), REFRESH_MS)
  const { audio, setVolume, setMute } = useLocalAudio(data)
  const output = audio?.output

  return (
    <HeaderPopover
      label={
        output?.volume != null
          ? `${t('headerBar.names.sound')} · ${output.muted ? t('headerBar.sound.muted') : formatPercent(output.volume, i18n.language)}`
          : t('headerBar.names.sound')
      }
      onWheel={(event) => {
        if (!output || output.volume === null) return
        const step = event.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP
        setVolume('output', Math.max(0, Math.min(100, output.volume + step)))
      }}
      button={
        <>
          <VolumeIcon volume={output?.volume ?? null} muted={output?.muted ?? false} />
          {output?.volume != null && (
            <span className={styles.chipValue} data-muted={output.muted}>
              {formatPercent(output.volume, i18n.language)}
            </span>
          )}
        </>
      }
    >
      {() => (
        <SoundPanel
          audio={audio}
          failed={failed}
          onVolume={setVolume}
          onMute={setMute}
          onRefresh={refresh}
        />
      )}
    </HeaderPopover>
  )
}

function EndpointControls({
  flow,
  endpoint,
  onVolume,
  onMute,
  onDevice
}: {
  flow: AudioFlow
  endpoint: AudioEndpoint
  onVolume: (flow: AudioFlow, value: number) => void
  onMute: (flow: AudioFlow, value: boolean) => void
  onDevice: () => void
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const output = flow === 'output'
  const current = endpoint.devices.find((device) => device.isDefault)
  const muteLabel = output
    ? endpoint.muted
      ? t('headerBar.sound.unmute')
      : t('headerBar.sound.mute')
    : endpoint.muted
      ? t('headerBar.sound.micUnmute')
      : t('headerBar.sound.micMute')

  return (
    <section className={styles.endpoint}>
      <PanelTitle title={output ? t('headerBar.sound.output') : t('headerBar.sound.input')} />
      {endpoint.devices.length === 0 || !current ? (
        <p className={styles.muted}>
          {output ? t('headerBar.sound.noOutput') : t('headerBar.sound.noInput')}
        </p>
      ) : (
        <>
          {endpoint.devices.length > 1 ? (
            <Select
              value={current.id}
              aria-label={
                output ? t('headerBar.sound.outputDevice') : t('headerBar.sound.inputDevice')
              }
              options={endpoint.devices.map((device) => ({ value: device.id, label: device.name }))}
              onChange={(id) =>
                void window.tessera.headerBar
                  .setAudioDevice(id)
                  .catch(() => undefined)
                  .finally(onDevice)
              }
            />
          ) : (
            <p className={styles.deviceName}>{current.name}</p>
          )}
          <div className={styles.volumeRow}>
            <button
              type="button"
              className={styles.iconButton}
              data-active={endpoint.muted}
              title={muteLabel}
              aria-label={muteLabel}
              onClick={() => onMute(flow, !endpoint.muted)}
            >
              {output ? (
                <VolumeIcon volume={endpoint.volume} muted={endpoint.muted} />
              ) : endpoint.muted ? (
                <MicOff size={16} aria-hidden />
              ) : (
                <Mic size={16} aria-hidden />
              )}
            </button>
            <input
              type="range"
              className={styles.slider}
              min={0}
              max={100}
              value={endpoint.volume ?? 0}
              data-muted={endpoint.muted}
              aria-label={output ? t('headerBar.sound.volume') : t('headerBar.sound.micVolume')}
              onChange={(event) => onVolume(flow, Number(event.target.value))}
            />
            <span className={styles.volumeValue}>
              {formatPercent(endpoint.volume ?? 0, i18n.language)}
            </span>
          </div>
        </>
      )}
    </section>
  )
}

/** Réglage d'un programme, affiché tout de suite (Windows le confirme un peu plus tard). */
interface LocalApp {
  volume: number
  muted: boolean
}

/**
 * Programmes qui jouent du son (ou dont le volume a été baissé) : un volume chacun, réglable
 * sans toucher au volume général. Rien quand aucun programme n'en joue.
 */
function AppsVolume(): React.JSX.Element | null {
  const { t, i18n } = useTranslation()
  const { data } = usePolling(() => window.tessera.headerBar.appAudio(), REFRESH_MS)
  const [local, setLocal] = useState<Record<string, LocalApp>>({})
  const pending = useRef(new Map<string, number>())
  const timer = useRef(0)
  const forget = useRef(new Map<string, number>())
  useEffect(() => {
    const timers = forget.current
    return () => {
      window.clearTimeout(timer.current)
      for (const id of timers.values()) window.clearTimeout(id)
    }
  }, [])
  if (!data || data.length === 0) return null

  const shown = (item: AppAudio): AppAudio => ({ ...item, ...local[item.id] })
  // Valeur lue dans Windows de nouveau prise en compte un instant après
  const remember = (id: string, value: LocalApp): void => {
    setLocal((current) => ({ ...current, [id]: value }))
    window.clearTimeout(forget.current.get(id))
    forget.current.set(
      id,
      window.setTimeout(() => {
        forget.current.delete(id)
        setLocal((current) => {
          const next = { ...current }
          delete next[id]
          return next
        })
      }, LOCAL_MS)
    )
  }
  // Au plus toutes les 80 ms pendant qu'on fait glisser un curseur
  const setVolume = (id: string, volume: number): void => {
    remember(id, { volume, muted: false })
    pending.current.set(id, volume)
    if (timer.current) return
    timer.current = window.setTimeout(() => {
      timer.current = 0
      for (const [app, value] of pending.current) {
        void window.tessera.headerBar.setAppVolume(app, { volume: value }).catch(() => undefined)
      }
      pending.current.clear()
    }, 80)
  }
  const toggleMute = (item: AppAudio): void => {
    remember(item.id, { volume: item.volume, muted: !item.muted })
    void window.tessera.headerBar
      .setAppVolume(item.id, { muted: !item.muted })
      .catch(() => undefined)
  }

  return (
    <section className={styles.endpoint}>
      <PanelTitle title={t('headerBar.sound.apps')} />
      {data.map(shown).map((item) => {
        const label = item.muted
          ? t('headerBar.sound.appUnmute', { name: item.name })
          : t('headerBar.sound.appMute', { name: item.name })
        return (
          <div key={item.id} className={styles.volumeRow}>
            <button
              type="button"
              className={styles.iconButton}
              data-active={item.muted}
              title={label}
              aria-label={label}
              onClick={() => toggleMute(item)}
            >
              {item.icon ? (
                <img
                  src={item.icon}
                  alt=""
                  width={16}
                  height={16}
                  className={styles.appIcon}
                  data-muted={item.muted}
                />
              ) : (
                <VolumeIcon volume={item.volume} muted={item.muted} />
              )}
            </button>
            <span className={styles.appName} title={item.name}>
              {item.name}
            </span>
            <input
              type="range"
              className={styles.slider}
              min={0}
              max={100}
              value={item.muted ? 0 : item.volume}
              data-muted={item.muted}
              aria-label={t('headerBar.sound.appVolume', { name: item.name })}
              onChange={(event) => setVolume(item.id, Number(event.target.value))}
            />
            <span className={styles.volumeValue}>
              {formatPercent(item.muted ? 0 : item.volume, i18n.language)}
            </span>
          </div>
        )
      })}
    </section>
  )
}

function SoundPanel({
  audio,
  failed,
  onVolume,
  onMute,
  onRefresh
}: {
  audio: AudioState | null
  failed: boolean
  onVolume: (flow: AudioFlow, value: number) => void
  onMute: (flow: AudioFlow, value: boolean) => void
  onRefresh: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  if (!audio) {
    return (
      <div className={styles.sound}>
        <PanelTitle title={t('headerBar.names.sound')} />
        <p className={styles.muted}>
          {failed ? t('headerBar.unavailable') : t('headerBar.loading')}
        </p>
      </div>
    )
  }
  return (
    <div className={styles.sound}>
      <EndpointControls
        flow="output"
        endpoint={audio.output}
        onVolume={onVolume}
        onMute={onMute}
        onDevice={onRefresh}
      />
      <AppsVolume />
      <EndpointControls
        flow="input"
        endpoint={audio.input}
        onVolume={onVolume}
        onMute={onMute}
        onDevice={onRefresh}
      />
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function SoundBlock(): React.JSX.Element {
  const { data, failed, refresh } = usePolling(() => window.tessera.headerBar.audio(), REFRESH_MS)
  const { audio, setVolume, setMute } = useLocalAudio(data)
  return (
    <SoundPanel
      audio={audio}
      failed={failed}
      onVolume={setVolume}
      onMute={setMute}
      onRefresh={refresh}
    />
  )
}
