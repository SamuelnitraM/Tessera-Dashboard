import { createHash, createPublicKey, verify } from 'node:crypto'
import {
  formatFingerprint,
  parseSignature,
  SIGNATURE_FILE,
  signatureMessage
} from '@shared/module-signature'
import { errorText } from '../i18n'
import { UnsafePackageError } from './zip'

/** Éditeur d'un paquet signé : sa clé publique et l'empreinte affichée à l'utilisateur. */
export interface PackagePublisher {
  /** Clé publique (DER SPKI, base64) : c'est elle qui est comparée aux mises à jour. */
  publicKey: string
  fingerprint: string
}

const sha256 = (data: Buffer): string => createHash('sha256').update(data).digest('hex')

/**
 * Vérifie la signature d'un paquet (voir @shared/module-signature). Renvoie l'éditeur, ou `null`
 * si le paquet n'est pas signé. Une signature présente mais fausse, ou un fichier qui ne
 * correspond pas à la liste signée (ajouté, retiré, modifié), refuse le paquet entier.
 */
export function verifyPackageSignature(files: Map<string, Buffer>): PackagePublisher | null {
  const content = files.get(SIGNATURE_FILE)
  if (!content) return null

  let signature
  try {
    signature = parseSignature(JSON.parse(content.toString('utf8')))
  } catch {
    signature = null
  }
  if (!signature)
    throw new UnsafePackageError(
      errorText('package', 'signatureUnreadable', { name: SIGNATURE_FILE })
    )

  // Chaque fichier du paquet est signé, et rien d'autre
  const signed = Object.keys(signature.files)
  const present = [...files.keys()].filter((path) => path !== SIGNATURE_FILE)
  if (signed.length !== present.length) {
    throw new UnsafePackageError(errorText('package', 'signatureFiles'))
  }
  for (const path of present) {
    const data = files.get(path) as Buffer
    if (signature.files[path] !== sha256(data)) {
      throw new UnsafePackageError(errorText('package', 'signatureModified', { name: path }))
    }
  }

  const valid = (() => {
    try {
      const key = createPublicKey({
        key: Buffer.from(signature.publicKey, 'base64'),
        format: 'der',
        type: 'spki'
      })
      if (key.asymmetricKeyType !== 'ed25519') return false
      return verify(
        null,
        Buffer.from(signatureMessage(signature.files), 'utf8'),
        key,
        Buffer.from(signature.signature, 'base64')
      )
    } catch {
      return false
    }
  })()
  if (!valid) throw new UnsafePackageError(errorText('package', 'signatureInvalid'))

  return {
    publicKey: signature.publicKey,
    fingerprint: formatFingerprint(sha256(Buffer.from(signature.publicKey, 'base64')))
  }
}
