import { app } from 'electron'
import { APP_NAME } from '@shared/app'
import { MODULE_PACKAGE_EXTENSION, type ModulePreview } from '@shared/modules'
import { previewPackage } from './plugins/modules'
import { getSettings } from './settings-store'

/**
 * Lancement de la version installée : avec Windows (réglage, activé par défaut), et par un
 * double-clic sur un fichier `.tessera` (association créée par l'installeur).
 */

/** Argument ajouté au lancement avec Windows : Tessera démarre dans la zone de notification. */
export const HIDDEN_ARG = '--hidden'

export const isLaunchedHidden = (argv: string[] = process.argv): boolean =>
  argv.includes(HIDDEN_ARG)

/** Inscrit (ou retire) Tessera des programmes lancés à l'ouverture de la session. */
export function applyLaunchAtStartup(): void {
  // En développement, l'exécutable est celui d'Electron : rien à inscrire
  if (!app.isPackaged) return
  app.setLoginItemSettings({
    openAtLogin: getSettings().window.launchAtStartup,
    path: process.execPath,
    args: [HIDDEN_ARG],
    name: APP_NAME
  })
}

/** Paquet de module donné en argument (double-clic sur un `.tessera`). */
export function packageFromArgs(argv: string[]): string | null {
  const suffix = `.${MODULE_PACKAGE_EXTENSION}`
  return argv.slice(1).find((arg) => arg.toLowerCase().endsWith(suffix)) ?? null
}

/**
 * Paquet ouvert, en attente : l'interface est prévenue, et le récupère elle-même (aussi à son
 * démarrage, si elle n'était pas encore prête).
 */
let pending: ModulePreview | null = null
let listener: () => void = () => {}

/**
 * Prépare l'installation d'un paquet ouvert depuis l'Explorateur : la fenêtre de consentement
 * s'affiche dans Paramètres → Widgets et modules.
 */
export async function openPackage(path: string): Promise<void> {
  try {
    pending = await previewPackage(path)
    listener()
  } catch (error) {
    console.warn('[startup] Paquet illisible :', path, error)
  }
}

export function setOpenedPackageListener(callback: () => void): void {
  listener = callback
}

/** Paquet en attente, remis une seule fois à l'interface. */
export function takeOpenedPackage(): ModulePreview | null {
  const preview = pending
  pending = null
  return preview
}
