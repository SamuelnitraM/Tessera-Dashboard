import type { HostRect } from '@shared/desktop-apps'

/** Partie visible d'un élément, en tenant compte des conteneurs qui défilent. */
export function measure(element: HTMLElement): HostRect | null {
  const box = element.getBoundingClientRect()
  if (box.width < 1 || box.height < 1) return null
  let left = Math.max(box.left, 0)
  let top = Math.max(box.top, 0)
  let right = Math.min(box.right, window.innerWidth)
  let bottom = Math.min(box.bottom, window.innerHeight)
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent)
    if (overflowX === 'visible' && overflowY === 'visible') continue
    const clip = parent.getBoundingClientRect()
    left = Math.max(left, clip.left)
    top = Math.max(top, clip.top)
    right = Math.min(right, clip.right)
    bottom = Math.min(bottom, clip.bottom)
  }
  const rect: HostRect = { x: box.left, y: box.top, width: box.width, height: box.height }
  const visible = {
    x: left - box.left,
    y: top - box.top,
    width: right - left,
    height: bottom - top
  }
  const whole =
    visible.x <= 0.5 &&
    visible.y <= 0.5 &&
    visible.width >= box.width - 0.5 &&
    visible.height >= box.height - 0.5
  if (!whole) {
    rect.clip = {
      ...visible,
      width: Math.max(0, visible.width),
      height: Math.max(0, visible.height)
    }
  }
  return rect
}
