import { getTranslation } from '../i18n'
import { captureCursorDisplay, showOverlay } from './screenshot'

/**
 * Pipette de la barre des pages : l'écran sous la souris est figé dans une fenêtre au-dessus
 * de tout (les applications insérées dans les blocs comprises), avec une loupe ; un clic prend
 * la couleur du pixel, Échap annule. Renvoie `#rrggbb`, ou `null`.
 */
export async function pickColor(): Promise<string | null> {
  // Le panneau du widget vient de se fermer : on laisse l'écran se redessiner
  await new Promise((done) => setTimeout(done, 300))
  const { display, image } = await captureCursorDisplay()
  const { width, height } = image.getSize()
  const hash = await showOverlay(display, {
    'screen.png': image.toPNG(),
    'index.html': pickerPage(getTranslation().headerBar.eyedropper.hint, width)
  })
  const match = /^pick:(\d+),(\d+)$/.exec(hash ?? '')
  if (!match) return null
  const x = Math.min(width - 1, Number(match[1]))
  const y = Math.min(height - 1, Number(match[2]))
  // Image BGRA
  const pixel = image.crop({ x, y, width: 1, height: 1 }).toBitmap()
  const hex = (value: number): string => value.toString(16).padStart(2, '0')
  return `#${hex(pixel[2])}${hex(pixel[1])}${hex(pixel[0])}`
}

/** Page de la pipette : image figée, loupe (pixels agrandis) qui suit la souris. */
function pickerPage(hint: string, imageWidth: number): string {
  const escaped = hint.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src file:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>
html,body{margin:0;height:100%;overflow:hidden;cursor:crosshair;user-select:none;background:#000}
img{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
#loupe{position:fixed;display:none;width:132px;height:132px;border:3px solid #fff;border-radius:50%;box-shadow:0 4px 18px rgba(0,0,0,.5);background-image:url(screen.png);background-repeat:no-repeat;image-rendering:pixelated;pointer-events:none}
#loupe::after{content:'';position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-6px 0 0 -6px;border:1px solid #fff;outline:1px solid #000}
#hint{position:fixed;top:24px;left:50%;transform:translateX(-50%);padding:8px 14px;border-radius:8px;background:rgba(20,20,24,.85);color:#fff;font:13px "Segoe UI",sans-serif;pointer-events:none}
</style></head>
<body><img src="screen.png" alt=""><div id="loupe"></div><div id="hint">${escaped}</div>
<script>
const loupe = document.getElementById('loupe')
const ZOOM = 10, SIZE = 132
// Pixels réels de l'image par pixel de la page
const ratio = ${imageWidth} / innerWidth
const pixel = (event) => [Math.floor(event.clientX * ratio), Math.floor(event.clientY * ratio)]
addEventListener('pointermove', (event) => {
  const [x, y] = pixel(event)
  Object.assign(loupe.style, {
    display: 'block',
    left: (event.clientX + 20) + 'px',
    top: (event.clientY + 20) + 'px',
    backgroundSize: (${imageWidth} * ZOOM) + 'px auto',
    backgroundPosition: (SIZE / 2 - 3 - (x + 0.5) * ZOOM) + 'px ' + (SIZE / 2 - 3 - (y + 0.5) * ZOOM) + 'px'
  })
})
addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return
  location.hash = 'pick:' + pixel(event).join(',')
})
addEventListener('keydown', (event) => { if (event.key === 'Escape') location.hash = 'cancel' })
addEventListener('contextmenu', (event) => { event.preventDefault(); location.hash = 'cancel' })
</script></body></html>`
}
