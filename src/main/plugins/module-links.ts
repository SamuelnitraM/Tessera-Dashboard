import { dialog, shell } from 'electron'
import { getLanguage, getTranslation } from '../i18n'
import { getMainWindow } from '../window'
import { getModuleManifest } from './modules'

/**
 * Liens ouverts par les modules tiers (`openExternal` du SDK). L'utilisateur confirme chaque
 * site : sans cela, un module sans la permission « network » pourrait envoyer ce qu'il lit
 * (mails, fichiers) dans l'adresse d'une page ouverte dans le navigateur.
 */

/** Sites déjà acceptés par module, jusqu'à la fermeture de Tessera. */
const allowed = new Set<string>()

export async function openModuleLink(pluginId: string, address: string): Promise<boolean> {
  let url: URL
  try {
    url = new URL(address)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const key = `${pluginId}|${url.host}`
  if (!allowed.has(key)) {
    const manifest = getModuleManifest(pluginId)
    const name = manifest?.name?.[getLanguage()] ?? manifest?.name?.fr ?? pluginId
    const text = getTranslation().dialogs
    const fill = (value: string): string =>
      value.replace('{{module}}', name).replace('{{host}}', url.host).replace('{{url}}', url.href)
    const window = getMainWindow()
    const options: Electron.MessageBoxOptions = {
      type: 'question',
      title: text.openLinkTitle,
      message: fill(text.openLinkMessage),
      detail: fill(text.openLinkDetail),
      buttons: [text.openLinkAllow, text.openLinkCancel],
      defaultId: 1,
      cancelId: 1,
      checkboxLabel: text.openLinkRemember,
      noLink: true
    }
    const answer = window
      ? await dialog.showMessageBox(window, options)
      : await dialog.showMessageBox(options)
    if (answer.response !== 0) return false
    if (answer.checkboxChecked) allowed.add(key)
  }
  await shell.openExternal(url.href)
  return true
}
