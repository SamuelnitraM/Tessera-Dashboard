/**
 * Signature de code de l'installeur et de l'application (electron-builder appelle cette
 * fonction pour chaque .exe, voir `win.signtoolOptions.sign` dans electron-builder.yml).
 *
 * La commande vient de la variable d'environnement `TESSERA_SIGN_COMMAND` (secret du dépôt dans
 * l'action « Version »), où `{file}` est remplacé par le fichier à signer. Elle dépend du
 * fournisseur du certificat (voir docs/distribution.md). Sans elle, rien n'est signé : les
 * constructions locales et les versions publiées avant d'avoir un certificat restent valables.
 */
import { execSync } from 'node:child_process'

export default async function sign(configuration) {
  const command = process.env.TESSERA_SIGN_COMMAND
  if (!command) return
  console.log(`  • signature de ${configuration.path}`)
  execSync(command.replaceAll('{file}', `"${configuration.path}"`), { stdio: 'inherit' })
}
