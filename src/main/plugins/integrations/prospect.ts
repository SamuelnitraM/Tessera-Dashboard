import { shell } from 'electron'
import type {
  ProspectFollowUp,
  ProspectHealth,
  ProspectJob,
  ProspectStatistics
} from '@shared/integrations'
import { field, integrationError, isRecord } from './common'

/**
 * Connecteur Prospect Solution (https://github.com/SamuelnitraM/ProspectSolution).
 *
 * Son API locale n'a pas d'authentification : elle ne répond qu'aux pages servies par elle-même
 * et aux clients sans en-tête Origin. Les requêtes partent donc d'ici (processus principal),
 * uniquement vers 127.0.0.1, et seulement sur les routes listées ci-dessous : lecture, plus
 * l'annulation d'une tâche. Aucune écriture dans les données de prospection.
 */

const TIMEOUT_MS = 4000

function validPort(port: unknown): number {
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1024 || port > 65535) {
    throw integrationError('invalid', 'Port invalide.')
  }
  return port
}

/** Routes autorisées (méthode, chemin) : rien d'autre n'est envoyé à l'application. */
type Route =
  | ['GET', '/api/health']
  | ['GET', '/api/statistics']
  | ['GET', '/api/follow-ups']
  | ['GET', '/api/jobs']
  | ['POST', `/api/jobs/${number}/cancel`]

class Unreachable extends Error {}

async function request(port: unknown, [method, path]: Route): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`http://127.0.0.1:${validPort(port)}${path}`, {
      method,
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('[invalid]')) throw error
    throw new Unreachable()
  }
  if (!response.ok) throw integrationError('failed', `HTTP ${response.status}`)
  try {
    return await response.json()
  } catch {
    throw integrationError('failed', 'Réponse illisible.')
  }
}

/** Requête vers une application qui doit répondre (sinon erreur `unavailable`). */
async function requireResponse(port: unknown, route: Route): Promise<unknown> {
  try {
    return await request(port, route)
  } catch (error) {
    if (error instanceof Unreachable) throw integrationError('unavailable', 'Prospect Solution')
    throw error
  }
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const count = (value: unknown): number => (typeof value === 'number' ? value : 0)

function counters(value: unknown): Record<string, number> {
  const result: Record<string, number> = {}
  if (isRecord(value)) {
    for (const [key, total] of Object.entries(value)) {
      if (typeof total === 'number') result[key] = total
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// API du connecteur
// ---------------------------------------------------------------------------

/** Qui répond sur le port ? Prospect Solution (avec sa version d'API), un autre programme, ou rien. */
export async function getProspectHealth(port: unknown): Promise<ProspectHealth> {
  try {
    const body = await request(port, ['GET', '/api/health'])
    const version = field(body, 'api_version')
    return typeof version === 'number'
      ? { status: 'ready', apiVersion: version }
      : { status: 'other-service', apiVersion: null }
  } catch (error) {
    if (error instanceof Unreachable) return { status: 'offline', apiVersion: null }
    if (error instanceof Error && error.message.startsWith('[invalid]')) throw error
    return { status: 'other-service', apiVersion: null }
  }
}

export async function getProspectStatistics(port: unknown): Promise<ProspectStatistics> {
  const body = await requireResponse(port, ['GET', '/api/statistics'])
  return {
    total: count(field(body, 'total')),
    withoutPhone: count(field(body, 'without_phone')),
    followUpsDue: count(field(body, 'follow_ups_due')),
    byStatus: counters(field(body, 'by_status')),
    byOpportunity: counters(field(body, 'by_opportunity'))
  }
}

/** Relances dues aujourd'hui (seulement les champs affichés, pas la fiche complète). */
export async function getProspectFollowUps(port: unknown): Promise<ProspectFollowUp[]> {
  const body = await requireResponse(port, ['GET', '/api/follow-ups'])
  if (!Array.isArray(body)) return []
  return body
    .filter((row) => typeof field(row, 'id') === 'number')
    .slice(0, 200)
    .map((row) => ({
      id: field(row, 'id') as number,
      name: text(field(row, 'name')) ?? '?',
      city: text(field(row, 'city')),
      phone: text(field(row, 'phone')),
      status: text(field(row, 'status')) ?? 'new',
      nextFollowUp: text(field(row, 'next_follow_up')),
      category: text(field(row, 'category_label'))
    }))
}

export async function getProspectJobs(port: unknown): Promise<ProspectJob[]> {
  const body = await requireResponse(port, ['GET', '/api/jobs'])
  if (!Array.isArray(body)) return []
  return body
    .filter((job) => typeof field(job, 'id') === 'number')
    .map((job) => {
      const total = field(job, 'progress_total')
      return {
        id: field(job, 'id') as number,
        kind: text(field(job, 'kind')) ?? '',
        label: text(field(job, 'label')) ?? '',
        status: text(field(job, 'status')) ?? 'running',
        progressCurrent: count(field(job, 'progress_current')),
        progressTotal: typeof total === 'number' ? total : null,
        message: text(field(job, 'message')),
        error: text(field(job, 'error')),
        createdAt: text(field(job, 'created_at')),
        finishedAt: text(field(job, 'finished_at'))
      }
    })
}

export async function cancelProspectJob(port: unknown, jobId: unknown): Promise<boolean> {
  if (typeof jobId !== 'number' || !Number.isInteger(jobId) || jobId < 0) {
    throw integrationError('invalid', 'Tâche invalide.')
  }
  const body = await requireResponse(port, ['POST', `/api/jobs/${jobId}/cancel`])
  return field(body, 'cancelled') === true
}

/** Appelle un numéro d'une relance : lien `tel:` confié à Windows (application Téléphone…). */
export async function callProspect(phone: unknown): Promise<void> {
  if (typeof phone !== 'string' || !/^\+?[0-9 ().-]{4,30}$/.test(phone.trim())) {
    throw integrationError('invalid', 'Numéro invalide.')
  }
  await shell.openExternal(`tel:${phone.replace(/[^0-9+]/g, '')}`)
}
