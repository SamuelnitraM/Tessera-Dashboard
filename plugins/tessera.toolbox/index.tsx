import { definePlugin } from '@tessera/plugin-sdk'
import { AgendaBlock } from '../../src/renderer/src/components/headerbar/AgendaItem'
import { CalculatorPanel } from '../../src/renderer/src/components/headerbar/CalculatorItem'
import { ClipboardHistoryBlock } from '../../src/renderer/src/components/headerbar/ClipboardHistoryItem'
import { ClocksBlock } from '../../src/renderer/src/components/headerbar/ClocksItem'
import { ConverterPanel } from '../../src/renderer/src/components/headerbar/ConverterItem'
import { DateTimeBlock } from '../../src/renderer/src/components/headerbar/DateTimeItem'
import { EyedropperBlock } from '../../src/renderer/src/components/headerbar/EyedropperItem'
import { FocusBlock } from '../../src/renderer/src/components/headerbar/FocusItem'
import { MediaBlock } from '../../src/renderer/src/components/headerbar/MediaItem'
import { NotePanel } from '../../src/renderer/src/components/headerbar/NoteItem'
import { ScreenshotBlock } from '../../src/renderer/src/components/headerbar/ScreenshotItem'
import { SoundBlock } from '../../src/renderer/src/components/headerbar/SoundItem'
import { StopwatchPanel } from '../../src/renderer/src/components/headerbar/StopwatchItem'
import { SystemBlock } from '../../src/renderer/src/components/headerbar/SystemItem'
import { TimerBlock } from '../../src/renderer/src/components/headerbar/TimerItem'
import { WeatherBlock } from '../../src/renderer/src/components/headerbar/WeatherItem'
import { ToolboxBlock } from './ToolboxBlock'

/** Widgets de la barre des pages en blocs (voir ToolboxBlock). */
const block = (panel: () => React.JSX.Element) => (): React.JSX.Element => (
  <ToolboxBlock panel={panel} />
)

export default definePlugin({
  widgets: {
    datetime: block(DateTimeBlock),
    weather: block(WeatherBlock),
    media: block(MediaBlock),
    sound: block(SoundBlock),
    system: block(SystemBlock),
    clipboard: block(ClipboardHistoryBlock),
    calculator: block(CalculatorPanel),
    timer: block(TimerBlock),
    stopwatch: block(StopwatchPanel),
    focus: block(FocusBlock),
    clocks: block(ClocksBlock),
    agenda: block(AgendaBlock),
    converter: block(ConverterPanel),
    eyedropper: block(EyedropperBlock),
    screenshot: block(ScreenshotBlock),
    note: block(NotePanel)
  }
})
