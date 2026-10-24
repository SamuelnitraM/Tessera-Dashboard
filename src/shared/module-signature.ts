/**
 * Signature des paquets de modules (facultative).
 *
 * L'éditeur crée une fois une paire de clés Ed25519 (`tessera-module keygen`) et garde la clé
 * privée pour lui. `tessera-module pack --key …` ajoute au paquet `signature.json` :
 * - `files` : l'empreinte SHA-256 de chaque fichier du paquet ;
 * - `publicKey` : la clé publique de l'éditeur (DER SPKI, base64) ;
 * - `signature` : la signature Ed25519 de `signatureMessage(files)` (base64).
 *
 * À l'installation, Tessera vérifie la signature et chaque fichier (un fichier ajouté, retiré ou
 * modifié la rend invalide). Puis « confiance à la première utilisation » : une fois un module
 * installé avec une clé, ses mises à jour doivent être signées par la même clé. L'utilisateur
 * voit l'empreinte de la clé ; un module non signé est signalé comme tel.
 *
 * Partagé entre le processus principal (vérification) et l'outil `tessera-module` (signature).
 */

export const SIGNATURE_FILE = 'signature.json'
export const SIGNATURE_ALGORITHM = 'ed25519'

export interface PackageSignature {
  algorithm: typeof SIGNATURE_ALGORITHM
  /** Clé publique de l'éditeur : DER SPKI, en base64. */
  publicKey: string
  /** Signature de `signatureMessage(files)`, en base64. */
  signature: string
  /** Chemin dans le paquet -> empreinte SHA-256 (hexadécimal, minuscules). */
  files: Record<string, string>
}

/** Texte signé : une ligne par fichier, triées, pour un résultat indépendant de l'ordre. */
export function signatureMessage(files: Record<string, string>): string {
  const lines = Object.keys(files)
    .sort()
    .map((path) => `${files[path]}  ${path}`)
  return `tessera-signature-v1\n${lines.join('\n')}\n`
}

/** Vérifie la forme de `signature.json` (pas la signature elle-même). */
export function parseSignature(input: unknown): PackageSignature | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const raw = input as Record<string, unknown>
  if (raw.algorithm !== SIGNATURE_ALGORITHM) return null
  if (typeof raw.publicKey !== 'string' || typeof raw.signature !== 'string') return null
  if (typeof raw.files !== 'object' || raw.files === null || Array.isArray(raw.files)) return null
  const files: Record<string, string> = {}
  for (const [path, hash] of Object.entries(raw.files)) {
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) return null
    files[path] = hash
  }
  return {
    algorithm: SIGNATURE_ALGORITHM,
    publicKey: raw.publicKey,
    signature: raw.signature,
    files
  }
}

/**
 * Empreinte lisible d'une clé publique (à partir de son SHA-256 en hexadécimal) : 16 caractères
 * en 4 groupes, ex. `3F2A 9C1B 7D44 E0A8`. C'est elle que l'éditeur publie sur son site.
 */
export function formatFingerprint(sha256Hex: string): string {
  return sha256Hex.slice(0, 16).toUpperCase().match(/.{4}/g)?.join(' ') ?? ''
}
