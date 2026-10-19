import type { TesseraApi } from './index'

declare global {
  interface Window {
    tessera: TesseraApi
  }
}
