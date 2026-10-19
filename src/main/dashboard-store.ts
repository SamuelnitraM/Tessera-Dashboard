import { sanitizeDashboard, type Dashboard } from '@shared/dashboard'
import { JsonStore } from './json-store'

/** Pages, widgets et dispositions : `%APPDATA%/Tessera Dashboard/dashboard.json` */
const store = new JsonStore<Dashboard>('dashboard.json', sanitizeDashboard)

export const loadDashboard = (): Dashboard => store.load()
export const getDashboard = (): Dashboard => store.get()
export const flushDashboard = (): void => store.flush()

/** Remplace tout le tableau de bord (revalidé avant d'être sauvegardé). */
export const saveDashboard = (dashboard: unknown): Dashboard => store.set(dashboard)
