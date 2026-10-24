import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import {
  checkBuild,
  generateSigningKey,
  moduleEntries,
  PackageError,
  readCollection,
  readManifest,
  readSigningKey,
  signEntries,
  SIGNING_KEY_FILE,
  writeZip,
  type SigningKey,
  type ZipEntry
} from './package'

/**
 * Outil `tessera-module` : valider, signer et empaqueter un module ou une collection.
 * Sans dépendance : il fonctionne avec Node.js seul (22.12 ou plus récent).
 */

const HELP = `tessera-module : outils des modules Tessera Dashboard

  tessera-module validate [dossier]
      Vérifie manifest.json (et la construction dans dist/, si elle existe).

  tessera-module pack [dossier] [--out fichier.tessera] [--key clé.pem | --no-sign]
      Empaquette le module construit (dist/) en <id>-<version>.tessera.

  tessera-module pack-collection <collection.json> <dossier du module>… [--out …] [--key …]
      Réunit plusieurs modules construits en une collection.

  tessera-module keygen [--out clé.pem]
      Crée la clé qui signe tes paquets (${SIGNING_KEY_FILE} par défaut).
      Garde-la précieusement et ne la partage jamais : sans elle, tu ne pourras plus publier
      de mise à jour de tes modules (Tessera exige la même clé).

Signature : avec --key, ou si ${SIGNING_KEY_FILE} se trouve dans le dossier du projet.
Le dossier par défaut est le dossier courant.`

interface Options {
  positional: string[]
  out: string | null
  key: string | null
  noSign: boolean
}

function parseArgs(args: string[]): Options {
  const options: Options = { positional: [], out: null, key: null, noSign: false }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--out') options.out = args[++index] ?? null
    else if (arg === '--key') options.key = args[++index] ?? null
    else if (arg === '--no-sign') options.noSign = true
    else options.positional.push(arg)
  }
  return options
}

/** Dossier construit d'un projet : `dist/` s'il contient le manifeste, sinon le dossier lui-même. */
function buildFolder(project: string): string {
  const dist = join(project, 'dist')
  return existsSync(join(dist, 'manifest.json')) ? dist : project
}

/** Clé de signature : `--key`, sinon celle du dossier du projet si elle existe. */
function signingKey(options: Options, project: string): SigningKey | null {
  if (options.noSign) return null
  if (options.key) return readSigningKey(resolve(options.key))
  const local = join(project, SIGNING_KEY_FILE)
  return existsSync(local) ? readSigningKey(local) : null
}

function size(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function signatureLine(key: SigningKey | null): string {
  return key
    ? `  signé, empreinte ${key.fingerprint}`
    : '  non signé (voir « tessera-module keygen »)'
}

function validate(project: string): void {
  const manifest = readManifest(join(project, 'manifest.json'))
  console.log(
    `✓ manifest.json : ${manifest.id} v${manifest.version}, ${manifest.widgets.length} widget(s)`
  )
  if (existsSync(join(project, 'dist', 'manifest.json'))) {
    checkBuild(join(project, 'dist'))
    console.log('✓ dist/ : construction complète')
  } else {
    console.log('… dist/ absent : lance la construction (npm run build) avant d’empaqueter.')
  }
}

function write(target: string, entries: ZipEntry[], key: SigningKey | null): number {
  const archive = writeZip(key ? signEntries(entries, key) : entries)
  writeFileSync(target, archive)
  return archive.length
}

function pack(project: string, options: Options): void {
  const folder = buildFolder(project)
  const manifest = checkBuild(folder)
  const target = resolve(options.out ?? join(project, `${manifest.id}-${manifest.version}.tessera`))
  const key = signingKey(options, project)
  const bytes = write(target, moduleEntries(folder), key)
  console.log(`✓ ${basename(target)} (${size(bytes)}) : ${manifest.id} v${manifest.version}`)
  console.log(signatureLine(key))
}

function packCollection(collectionPath: string, projects: string[], options: Options): void {
  const collection = readCollection(collectionPath)
  const entries: ZipEntry[] = [{ name: 'collection.json', data: readFileSync(collectionPath) }]
  const found = new Set<string>()
  for (const project of projects) {
    const folder = buildFolder(resolve(project))
    const manifest = checkBuild(folder)
    if (!collection.modules.includes(manifest.id)) {
      throw new PackageError(
        `${manifest.id} n’est pas listé dans « modules » de ${collectionPath}.`
      )
    }
    if (found.has(manifest.id)) throw new PackageError(`${manifest.id} est donné deux fois.`)
    found.add(manifest.id)
    entries.push(...moduleEntries(folder, `modules/${manifest.id}/`))
  }
  const missing = collection.modules.filter((id) => !found.has(id))
  if (missing.length > 0) throw new PackageError(`Modules manquants : ${missing.join(', ')}.`)

  const base = dirname(resolve(collectionPath))
  const target = resolve(
    options.out ?? join(base, `${collection.id}-${collection.version}.tessera`)
  )
  const key = signingKey(options, base)
  const bytes = write(target, entries, key)
  console.log(
    `✓ ${basename(target)} (${size(bytes)}) : collection ${collection.id} v${collection.version}, ${found.size} module(s)`
  )
  console.log(signatureLine(key))
}

function keygen(options: Options): void {
  const target = resolve(options.out ?? SIGNING_KEY_FILE)
  if (existsSync(target)) {
    throw new PackageError(`${target} existe déjà : une clé n’est jamais remplacée.`)
  }
  const key = generateSigningKey(target)
  console.log(`✓ Clé créée : ${target}`)
  console.log(`  Empreinte : ${key.fingerprint} (à publier, par exemple sur ton site)`)
  console.log(
    '  Garde ce fichier en lieu sûr, hors de tout dépôt public (ajoute *.pem au .gitignore).'
  )
}

function main(argv: string[]): void {
  const [command, ...rest] = argv
  const options = parseArgs(rest)
  const { positional } = options
  switch (command) {
    case 'validate':
      validate(resolve(positional[0] ?? '.'))
      break
    case 'pack':
      pack(resolve(positional[0] ?? '.'), options)
      break
    case 'pack-collection':
      if (positional.length < 2) {
        throw new PackageError('Usage : pack-collection <collection.json> <module>…')
      }
      packCollection(positional[0], positional.slice(1), options)
      break
    case 'keygen':
      keygen(options)
      break
    default:
      console.log(HELP)
      if (command && command !== 'help' && command !== '--help') process.exitCode = 1
  }
}

try {
  main(process.argv.slice(2))
} catch (error) {
  console.error(`✗ ${error instanceof PackageError ? error.message : String(error)}`)
  process.exitCode = 1
}
