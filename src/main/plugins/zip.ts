import { crc32, inflateRawSync } from 'node:zlib'
import { PACKAGE_LIMITS } from '@shared/modules'

/**
 * Lecture des paquets `.tessera` (archives zip), sans dépendance.
 *
 * Un paquet vient d'un inconnu : tout ce qui pourrait écrire hors du dossier d'installation ou
 * saturer le disque est refusé, au lieu d'être « corrigé » :
 * - chemins absolus, lecteurs (`C:`), `..`, barres obliques inverses, caractères interdits ;
 * - liens symboliques, fichiers chiffrés, ZIP64, méthodes autres que « stocké » et « deflate » ;
 * - doublons (y compris à la casse près, Windows ne distinguant pas `A.js` de `a.js`) ;
 * - trop de fichiers, ou trop gros une fois décompressés (bombe de décompression) : la taille
 *   annoncée est vérifiée avant, et la décompression est bornée à cette taille ;
 * - contenu altéré (somme de contrôle CRC-32).
 */

export class UnsafePackageError extends Error {}

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
/** Dernier en-tête (22 octets) + commentaire de 65 535 octets au plus. */
const EOCD_SEARCH = 22 + 0xffff

/** Segment de chemin accepté : pas de caractère interdit par Windows (ni de contrôle). */
const isValidSegment = (segment: string): boolean =>
  segment.length > 0 &&
  ![...segment].some((char) => char.charCodeAt(0) < 32 || '<>:"|?*\\/'.includes(char))
/** Noms réservés par Windows, même avec une extension (`con.js`). */
const RESERVED_NAME = /^(?:con|prn|aux|nul|com\d|lpt\d)(?:\..*)?$/i

function unsafe(message: string): never {
  throw new UnsafePackageError(message)
}

/** Vérifie qu'un nom d'entrée est un chemin relatif simple, et le renvoie. */
export function checkEntryPath(name: string): string {
  if (name.length === 0 || name.length > 260) unsafe(`Nom de fichier invalide : « ${name} ».`)
  if (name.includes('\\')) unsafe(`Barre oblique inverse interdite : « ${name} ».`)
  if (name.startsWith('/') || /^[a-zA-Z]:/.test(name)) unsafe(`Chemin absolu : « ${name} ».`)
  const segments = name.split('/')
  for (const segment of segments) {
    if (segment === '..' || segment === '.') unsafe(`Chemin relatif interdit : « ${name} ».`)
    if (!isValidSegment(segment) || RESERVED_NAME.test(segment) || /[. ]$/.test(segment)) {
      unsafe(`Nom de fichier invalide : « ${name} ».`)
    }
  }
  return name
}

/**
 * Lit une archive zip. Renvoie ses fichiers (chemin relatif -> contenu) ; les dossiers sont
 * implicites. Lève `UnsafePackageError` pour toute archive refusée.
 */
export function readZip(data: Buffer): Map<string, Buffer> {
  if (data.length > PACKAGE_LIMITS.archiveBytes) unsafe('Archive trop volumineuse.')

  // Fin du répertoire central : cherchée depuis la fin (après un éventuel commentaire)
  let eocd = -1
  for (let offset = data.length - 22; offset >= Math.max(0, data.length - EOCD_SEARCH); offset--) {
    if (data.readUInt32LE(offset) === EOCD_SIGNATURE) {
      eocd = offset
      break
    }
  }
  if (eocd < 0) unsafe('Ce fichier n’est pas une archive zip.')

  const diskEntries = data.readUInt16LE(eocd + 8)
  const totalEntries = data.readUInt16LE(eocd + 10)
  const centralSize = data.readUInt32LE(eocd + 12)
  const centralOffset = data.readUInt32LE(eocd + 16)
  if (data.readUInt16LE(eocd + 4) !== 0 || diskEntries !== totalEntries) {
    unsafe('Archive en plusieurs parties non prise en charge.')
  }
  if (totalEntries === 0xffff || centralOffset === 0xffffffff) unsafe('ZIP64 non pris en charge.')
  if (totalEntries > PACKAGE_LIMITS.entries) unsafe('Trop de fichiers dans l’archive.')
  if (centralOffset + centralSize > eocd) unsafe('Archive corrompue.')

  const files = new Map<string, Buffer>()
  const seen = new Set<string>()
  let declaredTotal = 0
  let offset = centralOffset

  for (let index = 0; index < totalEntries; index++) {
    if (offset + 46 > eocd || data.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      unsafe('Archive corrompue (répertoire central).')
    }
    const flags = data.readUInt16LE(offset + 8)
    const method = data.readUInt16LE(offset + 10)
    const crc = data.readUInt32LE(offset + 16)
    const compressedSize = data.readUInt32LE(offset + 20)
    const size = data.readUInt32LE(offset + 24)
    const nameLength = data.readUInt16LE(offset + 28)
    const extraLength = data.readUInt16LE(offset + 30)
    const commentLength = data.readUInt16LE(offset + 32)
    const madeBy = data.readUInt16LE(offset + 4) >> 8
    const externalAttributes = data.readUInt32LE(offset + 38)
    const localOffset = data.readUInt32LE(offset + 42)
    const rawName = data.subarray(offset + 46, offset + 46 + nameLength)
    // Bit 11 : nom en UTF-8. Sinon, seuls les noms ASCII sont acceptés (pas de devinette)
    const name = rawName.toString(flags & 0x800 ? 'utf8' : 'latin1')
    if (!(flags & 0x800) && /[^\x20-\x7e]/.test(name)) unsafe(`Nom non UTF-8 : « ${name} ».`)
    offset += 46 + nameLength + extraLength + commentLength

    if (flags & 0x1) unsafe('Archive chiffrée non prise en charge.')
    if (size === 0xffffffff || compressedSize === 0xffffffff) unsafe('ZIP64 non pris en charge.')
    // Unix (3) : type de fichier dans les bits hauts. Lien symbolique = 0o120000
    if (madeBy === 3 && ((externalAttributes >>> 16) & 0o170000) === 0o120000) {
      unsafe(`Lien symbolique interdit : « ${name} ».`)
    }
    // MS-DOS : attribut « point d'analyse » (lien, jonction)
    if (externalAttributes & 0x400) unsafe(`Lien interdit : « ${name} ».`)

    const isFolder = name.endsWith('/')
    const path = checkEntryPath(isFolder ? name.slice(0, -1) : name)
    const key = path.toLowerCase()
    if (seen.has(key)) unsafe(`Fichier en double : « ${path} ».`)
    seen.add(key)
    if (isFolder) continue

    declaredTotal += size
    if (declaredTotal > PACKAGE_LIMITS.totalBytes) unsafe('Archive trop volumineuse décompressée.')
    files.set(path, readEntry(data, localOffset, method, compressedSize, size, crc, path))
  }

  // Un même nom ne peut pas être à la fois un fichier et un dossier (`a` et `a/b.js`)
  const fileKeys = new Set([...files.keys()].map((path) => path.toLowerCase()))
  for (const key of fileKeys) {
    for (let end = key.indexOf('/'); end >= 0; end = key.indexOf('/', end + 1)) {
      if (fileKeys.has(key.slice(0, end))) unsafe(`Conflit de chemin : « ${key} ».`)
    }
  }
  return files
}

function readEntry(
  data: Buffer,
  localOffset: number,
  method: number,
  compressedSize: number,
  size: number,
  crc: number,
  path: string
): Buffer {
  if (localOffset + 30 > data.length || data.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) {
    unsafe(`Archive corrompue (« ${path} »).`)
  }
  const start =
    localOffset + 30 + data.readUInt16LE(localOffset + 26) + data.readUInt16LE(localOffset + 28)
  if (start + compressedSize > data.length) unsafe(`Archive tronquée (« ${path} »).`)
  const raw = data.subarray(start, start + compressedSize)

  let content: Buffer
  if (method === 0) {
    content = Buffer.from(raw)
  } else if (method === 8) {
    try {
      // Décompression bornée à la taille annoncée : une bombe s'arrête là
      content = inflateRawSync(raw, { maxOutputLength: Math.max(size, 1) })
    } catch {
      unsafe(`Fichier illisible ou plus gros qu’annoncé : « ${path} ».`)
    }
  } else {
    unsafe(`Méthode de compression non prise en charge (« ${path} »).`)
  }
  if (content.length !== size) unsafe(`Taille incorrecte : « ${path} ».`)
  if (crc32(content) !== crc) unsafe(`Fichier altéré (somme de contrôle) : « ${path} ».`)
  return content
}
