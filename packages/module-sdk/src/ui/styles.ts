/**
 * Styles des composants du SDK, repris de l'interface de Tessera (mêmes variables CSS : ils
 * suivent le thème et la couleur d'accent). Injectés une fois, au démarrage du bloc ; les
 * classes commencent par `tessera-` pour ne pas gêner celles du module.
 */
const CSS = `
.tessera-button{display:inline-flex;align-items:center;justify-content:center;gap:.4375rem;padding:.4375rem .875rem;border:1px solid transparent;border-radius:var(--radius-sm);font-weight:600;white-space:nowrap;cursor:pointer;transition:background 120ms ease,border-color 120ms ease}
.tessera-button:disabled{opacity:.5;cursor:default}
.tessera-button:focus-visible,.tessera-switch:focus-visible,.tessera-segment:focus-visible,.tessera-select:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.tessera-button[data-variant="primary"]{background:var(--color-accent);color:var(--color-on-accent)}
.tessera-button[data-variant="primary"]:hover:not(:disabled){background:var(--color-accent-hover)}
.tessera-button[data-variant="secondary"]{background:var(--color-surface);border-color:var(--color-border)}
.tessera-button[data-variant="secondary"]:hover:not(:disabled){background:var(--color-surface-hover)}
.tessera-button[data-variant="ghost"]{background:none;color:var(--color-text-muted)}
.tessera-button[data-variant="ghost"]:hover:not(:disabled){background:var(--color-surface-hover);color:var(--color-text)}
.tessera-button[data-variant="danger"]{background:none;color:var(--color-danger)}
.tessera-button[data-variant="danger"]:hover:not(:disabled){background:var(--color-danger-soft)}
.tessera-segmented{display:inline-flex;padding:3px;gap:2px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md)}
.tessera-segment{display:inline-flex;align-items:center;gap:.375rem;padding:.3125rem .75rem;background:none;border:none;border-radius:calc(var(--radius-md) - 3px);color:var(--color-text-muted);white-space:nowrap;cursor:pointer}
.tessera-segment:hover{color:var(--color-text)}
.tessera-segment[aria-checked="true"]{background:var(--color-accent);color:var(--color-on-accent);font-weight:600}
.tessera-switch{position:relative;flex-shrink:0;width:40px;height:22px;padding:0;background:var(--color-border);border:none;border-radius:999px;cursor:pointer;transition:background 150ms ease}
.tessera-switch[aria-checked="true"]{background:var(--color-accent)}
.tessera-switch-thumb{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgb(0 0 0 / .3);transition:transform 150ms ease}
.tessera-switch[aria-checked="true"] .tessera-switch-thumb{transform:translateX(18px);background:var(--color-on-accent)}
.tessera-select-wrapper{position:relative;display:inline-flex}
.tessera-select{appearance:none;width:100%;min-width:8rem;padding:.4375rem 2.25rem .4375rem .75rem;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm)}
.tessera-select:hover{border-color:var(--color-text-muted)}
.tessera-select-chevron{position:absolute;right:.625rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--color-text-muted)}
.tessera-dialog{width:min(28rem,calc(100vw - 1rem));max-height:calc(100vh - 1rem);padding:0;background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-border);border-radius:var(--radius-lg);box-shadow:0 12px 32px rgb(0 0 0 / .3)}
.tessera-dialog::backdrop{background:rgb(0 0 0 / .45)}
.tessera-dialog-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.75rem .75rem .5rem 1rem}
.tessera-dialog-header h2{margin:0;font-size:1rem;font-weight:600}
.tessera-dialog-close{display:grid;place-items:center;width:28px;height:28px;padding:0;background:none;border:none;border-radius:var(--radius-sm);color:var(--color-text-muted);cursor:pointer}
.tessera-dialog-close:hover{background:var(--color-surface-hover);color:var(--color-text)}
.tessera-dialog-body{padding:0 1rem 1rem}
.tessera-dialog-message{margin:0 0 1rem;color:var(--color-text-muted)}
.tessera-dialog-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:.5rem}
`

let injected = false

export function injectStyles(): void {
  if (injected) return
  injected = true
  const style = document.createElement('style')
  style.dataset.tessera = 'sdk'
  style.textContent = CSS
  // En premier : les styles du module passent après et peuvent les modifier
  document.head.prepend(style)
}
