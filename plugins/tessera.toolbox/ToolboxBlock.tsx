import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from '@tessera/plugin-sdk'
import { BlockSizeContext } from '../../src/renderer/src/components/headerbar/helpers'
import { TimerPanel, type TimerMode } from '../../src/renderer/src/components/headerbar/TimerItem'
import styles from './ToolboxBlock.module.css'

/**
 * Widget de la barre des pages en bloc : le même panneau que dans la barre (mêmes réglages,
 * même état : un minuteur lancé dans la barre tourne aussi dans le bloc). La taille du bloc
 * est transmise au panneau, qui s'étoffe quand il est grand (Météo, Système, Agenda).
 */
export function ToolboxBlock({ children }: { children: React.ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      setSize((previous) =>
        previous?.width === width && previous.height === height ? previous : { width, height }
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className={styles.block}>
      <BlockSizeContext.Provider value={size ?? { width: 0, height: 0 }}>
        {children}
      </BlockSizeContext.Provider>
    </div>
  )
}

/** Minuteur : chaque bloc garde son mode (compte à rebours ou Concentration). */
export function TimerBlock({
  config,
  setConfig
}: WidgetProps<{ mode?: TimerMode }>): React.JSX.Element {
  return (
    <ToolboxBlock>
      <TimerPanel
        mode={config.mode === 'focus' ? 'focus' : 'countdown'}
        onMode={(mode) => setConfig({ mode })}
      />
    </ToolboxBlock>
  )
}
