import { definePlugin } from '@tessera/plugin-sdk'
import { ClockWidget } from './ClockWidget'

export default definePlugin({
  widgets: {
    clock: ClockWidget
  }
})
