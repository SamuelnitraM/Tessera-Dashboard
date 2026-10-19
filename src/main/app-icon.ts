import { deflateSync } from 'node:zlib'
import { nativeImage, type NativeImage } from 'electron'
import { resolveAccentColor, type HexColor } from '@shared/settings'
import { getResourcePath } from './paths'
import { getSettings } from './settings-store'
import { getSystemPreferences } from './system'

/**
 * Icônes de l'app (fenêtre, barre des tâches, zone de notification) aux couleurs de l'accent.
 * Le logo (trois tuiles) est redessiné en PNG à la volée, dans les tailles utiles à Windows.
 */

type Rgb = [number, number, number]

/** Tuiles du logo, dans un carré de 256 : x0, y0, x1, y1. Même dessin que resources/icon.png. */
const TILES: [number, number, number, number][] = [
  [16, 16, 120, 240],
  [136, 16, 240, 120],
  [136, 136, 240, 240]
]
const RADIUS = 26

function hexToRgb(hex: HexColor): Rgb {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as Rgb
}

/** Mélange avec du blanc (`amount` = part de blanc, de 0 à 1). */
function lighten([r, g, b]: Rgb, amount: number): Rgb {
  return [r, g, b].map((channel) => Math.round(channel + (255 - channel) * amount)) as Rgb
}

/** Dessine le logo en RGBA (anti-crénelage par suréchantillonnage 4×4). */
function drawLogo(size: number, colors: Rgb[]): Buffer {
  const scale = size / 256
  const radius = RADIUS * scale
  const tiles = TILES.map(([x0, y0, x1, y1]) => [x0 * scale, y0 * scale, x1 * scale, y1 * scale])
  const samples = 4
  const pixels = Buffer.alloc(size * size * 4)

  const tileAt = (px: number, py: number): number => {
    for (let index = 0; index < tiles.length; index++) {
      const [x0, y0, x1, y1] = tiles[index]
      if (px < x0 || px > x1 || py < y0 || py > y1) continue
      const cx = Math.min(Math.max(px, x0 + radius), x1 - radius)
      const cy = Math.min(Math.max(py, y0 + radius), y1 - radius)
      if ((px - cx) ** 2 + (py - cy) ** 2 <= radius * radius) return index
    }
    return -1
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let red = 0
      let green = 0
      let blue = 0
      let covered = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const tile = tileAt(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples)
          if (tile < 0) continue
          red += colors[tile][0]
          green += colors[tile][1]
          blue += colors[tile][2]
          covered++
        }
      }
      if (!covered) continue
      const offset = (y * size + x) * 4
      pixels[offset] = Math.round(red / covered)
      pixels[offset + 1] = Math.round(green / covered)
      pixels[offset + 2] = Math.round(blue / covered)
      pixels[offset + 3] = Math.round((covered / (samples * samples)) * 255)
    }
  }
  return pixels
}

/** Encode des pixels RGBA en PNG. */
function encodePng(size: number, rgba: Buffer): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc32 = (data: Buffer): number => {
    let c = 0xffffffff
    for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }

  // Chaque ligne d'image commence par un octet de filtre (0 = aucun)
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++)
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // 8 bits par canal
  header[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/** Image multi-résolution : Windows choisit la bonne taille selon la mise à l'échelle. */
function buildImage(sizes: number[], colors: Rgb[]): NativeImage {
  const base = sizes[0]
  const image = nativeImage.createEmpty()
  for (const size of sizes) {
    image.addRepresentation({
      scaleFactor: size / base,
      buffer: encodePng(size, drawLogo(size, colors))
    })
  }
  return image
}

export interface AppIcons {
  window: NativeImage
  tray: NativeImage
}

/** Icônes selon les réglages : aux couleurs de l'accent, ou celles d'origine. */
export function getAppIcons(): AppIcons {
  const { appearance } = getSettings()
  if (!appearance.accentIcon) {
    return {
      window: nativeImage.createFromPath(getResourcePath('icon.png')),
      tray: nativeImage.createFromPath(getResourcePath('tray-icon.png'))
    }
  }
  const accent = hexToRgb(
    resolveAccentColor(appearance.accentColor, getSystemPreferences().accentColor)
  )
  const colors = [accent, lighten(accent, 0.3), lighten(accent, 0.55)]
  return {
    window: buildImage([256], colors),
    tray: buildImage([16, 24, 32], colors)
  }
}
