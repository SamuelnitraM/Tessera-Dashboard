/// <reference lib="dom" />
// (Ce script tourne dans une page web : il a besoin des types du navigateur.)
import { contextBridge } from 'electron'

/**
 * Script de Tessera exécuté dans chaque page web intégrée (onglets d'applications, widgets web),
 * avant les scripts de la page. Il n'expose aucune API de Tessera à la page.
 *
 * Clés d'accès (passkeys) : les pages de connexion (Discord…) demandent souvent une proposition
 * « discrète » de clé d'accès dès leur ouverture. Electron l'affiche sous forme de fenêtre
 * « Sécurité Windows » bloquante. On indique donc à la page que ce mode n'est pas disponible ;
 * la connexion par clé d'accès reste possible quand l'utilisateur la choisit.
 */
contextBridge.executeInMainWorld({
  func: () => {
    const credential = window.PublicKeyCredential
    if (credential?.isConditionalMediationAvailable) {
      credential.isConditionalMediationAvailable = () => Promise.resolve(false)
    }

    // Si la page fait quand même une demande « discrète », elle reste en attente (sans fenêtre)
    // jusqu'à ce que la page l'annule elle-même
    const credentials = navigator.credentials
    if (credentials?.get) {
      const originalGet = credentials.get.bind(credentials)
      credentials.get = (options?: CredentialRequestOptions) => {
        if (options?.mediation !== 'conditional') return originalGet(options)
        return new Promise<Credential | null>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () =>
            reject(new DOMException('Demande annulée', 'AbortError'))
          )
        })
      }
    }
  }
})
