import { definePlugin } from '@tessera/plugin-sdk'
import { AgendaBlock } from '../../src/renderer/src/components/headerbar/AgendaItem'
import { CalculatorPanel } from '../../src/renderer/src/components/headerbar/CalculatorItem'
import { ClipboardHistoryBlock } from '../../src/renderer/src/components/headerbar/ClipboardHistoryItem'
import { ConverterPanel } from '../../src/renderer/src/components/headerbar/ConverterItem'
import { EyedropperBlock } from '../../src/renderer/src/components/headerbar/EyedropperItem'
import { MediaBlock } from '../../src/renderer/src/components/headerbar/MediaItem'
import { NotePanel } from '../../src/renderer/src/components/headerbar/NoteItem'
import { ScreenshotBlock } from '../../src/renderer/src/components/headerbar/ScreenshotItem'
import { SoundBlock } from '../../src/renderer/src/components/headerbar/SoundItem'
import { StopwatchPanel } from '../../src/renderer/src/components/headerbar/StopwatchItem'
import { SystemBlock } from '../../src/renderer/src/components/headerbar/SystemItem'
import { WeatherBlock } from '../../src/renderer/src/components/headerbar/WeatherItem'
import { TimerBlock, ToolboxBlock } from './ToolboxBlock'

/** Widgets de la barre des pages en blocs (voir ToolboxBlock). */
const block = (Panel: () => React.JSX.Element) => (): React.JSX.Element => (
  <ToolboxBlock>
    <Panel />
  </ToolboxBlock>
)

export default definePlugin({
  widgets: {
    weather: block(WeatherBlock),
    media: block(MediaBlock),
    sound: block(SoundBlock),
    system: block(SystemBlock),
    clipboard: block(ClipboardHistoryBlock),
    calculator: block(CalculatorPanel),
    timer: TimerBlock,
    stopwatch: block(StopwatchPanel),
    agenda: block(AgendaBlock),
    converter: block(ConverterPanel),
    eyedropper: block(EyedropperBlock),
    screenshot: block(ScreenshotBlock),
    note: block(NotePanel)
  }
})
