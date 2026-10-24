import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  type KeyObject
} from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { crc32, deflateRawSync } from 'node:zlib'
import {
  formatFingerprint,
  SIGNATURE_ALGORITHM,
  SIGNATURE_FILE,
  signatureMessage,
  type PackageSignature
} from '../../../src/shared/module-signature'
import {
  parseCollection,
  reservedPermissionError,
  type CollectionManifest
} from '../../../src/shared/modules'
import { parseManifest, type PluginManifest } from '../../../src/shared/plugins'

/**
 * Validation et empaquetage des modules (outil `tessera-module` et extension Vite), sans
 * dépendance. Les règles sont celles de Tessera : le même code valide le manifeste ici et
 * à l'installation.
 */

export class PackageError extends Error {}

/** Lit et valide un `manifest.json`. */
export function readManifest(path: string): PluginManifest {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    throw new PackageError(`${path} : JSON illisible (${(error as Error).message}).`)
  }
  const result = parseManifest(raw)
  if (!result.ok) throw new PackageError(`${path} → ${result.error}`)
  if (result.manifest.id.startsWith('tessera.')) {
    throw new PackageError(`${path} → id : le préfixe « tessera. » est réservé à Tessera.`)
  }
  if (result.manifest.widgets.length === 0) {
    throw new PackageError(`${path} → widgets : au moins un widget attendu.`)
  }
  const reserved = reservedPermissionError(result.manifest.permissions)
  if (reserved) throw new PackageError(`${path} → ${reserved}`)
  return result.manifest
}

/** Lit et valide un `collection.json`. */
export function readCollection(path: string): CollectionManifest {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    throw new PackageError(`${path} : JSON illisible (${(error as Error).message}).`)
  }
  const result = parseCollection(raw)
  if (!result.ok) throw new PackageError(`${path} → ${result.error}`)
  return result.collection
}

/** Fichiers d'un dossier construit (chemins avec `/`), sans fichiers cachés ni cartes de code. */
export function listFiles(folder: string): string[] {
  const files: string[] = []
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const path = join(current, entry.name)
      if (entry.isSymbolicLink()) throw new PackageError(`Lien interdit dans un paquet : ${path}`)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) files.push(relative(folder, path).split(sep).join('/'))
    }
  }
  walk(folder)
  return files.sort()
}

/** Vérifie un dossier construit : manifeste valide et script principal présent. */
export function checkBuild(folder: string): PluginManifest {
  const manifest = readManifest(join(folder, 'manifest.json'))
  // Avant de parcourir le dossier : un projet non construit contient node_modules
  if (!existsSync(join(folder, ...manifest.entry.split('/')))) {
    throw new PackageError(
      `Script principal « ${manifest.entry} » absent de ${folder} (lance d’abord la construction : npm run build).`
    )
  }
  listFiles(folder)
  return manifest
}

// ---------------------------------------------------------------------------
// Écriture d'une archive zip
// ---------------------------------------------------------------------------

export interface ZipEntry {
  /** Chemin dans l'archive, avec `/`. */
  name: string
  data: Buffer
}

/** Archive zip : fichiers compressés (deflate), noms en UTF-8, dates fixes (reproductible). */
export function writeZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  // 1er janvier 2020, au format MS-DOS : une même construction donne le même paquet
  const dosTime = 0
  const dosDate = ((2020 - 1980) << 9) | (1 << 5) | 1

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const compressed = deflateRawSync(entry.data, { level: 9 })
    const stored = compressed.length >= entry.data.length
    const content = stored ? entry.data : compressed
    const crc = crc32(entry.data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version nécessaire
    local.writeUInt16LE(0x800, 6) // noms en UTF-8
    local.writeUInt16LE(stored ? 0 : 8, 8)
    local.writeUInt16LE(dosTime, 10)
    local.writeUInt16LE(dosDate, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(content.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    chunks.push(local, name, content)

    const header = Buffer.alloc(46)
    header.writeUInt32LE(0x02014b50, 0)
    header.writeUInt16LE(20, 4) // créé par : MS-DOS, version 2.0
    header.writeUInt16LE(20, 6)
    header.writeUInt16LE(0x800, 8)
    header.writeUInt16LE(stored ? 0 : 8, 10)
    header.writeUInt16LE(dosTime, 12)
    header.writeUInt16LE(dosDate, 14)
    header.writeUInt32LE(crc, 16)
    header.writeUInt32LE(content.length, 20)
    header.writeUInt32LE(entry.data.length, 24)
    header.writeUInt16LE(name.length, 28)
    header.writeUInt32LE(offset, 42)
    central.push(header, name)

    offset += local.length + name.length + content.length
  }

  const centralBuffer = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBuffer.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...chunks, centralBuffer, end])
}

/** Contenu d'un module construit, à placer dans l'archive sous `prefix`. */
export function moduleEntries(folder: string, prefix = ''): ZipEntry[] {
  return listFiles(folder)
    .filter((name) => !name.endsWith('.map'))
    .map((name) => {
      const path = join(folder, ...name.split('/'))
      if (statSync(path).size > 50 * 1024 * 1024) {
        throw new PackageError(`Fichier trop volumineux pour un paquet : ${path}`)
      }
      return { name: `${prefix}${name}`, data: readFileSync(path) }
    })
}

// ---------------------------------------------------------------------------
// Signature (facultative, voir src/shared/module-signature.ts)
// ---------------------------------------------------------------------------

/** Nom par défaut de la clé de signature, dans le dossier du projet. */
export const SIGNING_KEY_FILE = 'tessera-signing-key.pem'

export interface SigningKey {
  privateKey: KeyObject
  /** Clé publique : DER SPKI, en base64. */
  publicKey: string
  fingerprint: string
}

function toSigningKey(privateKey: KeyObject): SigningKey {
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new PackageError('La clé de signature doit être une clé Ed25519 (tessera-module keygen).')
  }
  const der = createPublicKey(privateKey).export({ format: 'der', type: 'spki' })
  return {
    privateKey,
    publicKey: der.toString('base64'),
    fingerprint: formatFingerprint(createHash('sha256').update(der).digest('hex'))
  }
}

/** Crée une clé Ed25519 et l'enregistre (PEM PKCS#8, lisible seulement par l'utilisateur). */
export function generateSigningKey(path: string): SigningKey {
  const { privateKey } = generateKeyPairSync('ed25519')
  writeFileSync(path, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 })
  return toSigningKey(privateKey)
}

export function readSigningKey(path: string): SigningKey {
  try {
    return toSigningKey(createPrivateKey(readFileSync(path, 'utf8')))
  } catch (error) {
    if (error instanceof PackageError) throw error
    throw new PackageError(`Clé de signature illisible : ${path} (${(error as Error).message}).`)
  }
}

/** Ajoute `signature.json` : empreinte de chaque fichier, signée avec la clé de l'éditeur. */
export function signEntries(entries: ZipEntry[], key: SigningKey): ZipEntry[] {
  const files: Record<string, string> = {}
  for (const entry of entries) {
    files[entry.name] = createHash('sha256').update(entry.data).digest('hex')
  }
  const signature: PackageSignature = {
    algorithm: SIGNATURE_ALGORITHM,
    publicKey: key.publicKey,
    signature: sign(null, Buffer.from(signatureMessage(files), 'utf8'), key.privateKey).toString(
      'base64'
    ),
    files
  }
  return [
    ...entries,
    { name: SIGNATURE_FILE, data: Buffer.from(JSON.stringify(signature, null, 2), 'utf8') }
  ]
}
