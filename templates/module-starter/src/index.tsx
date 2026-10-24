import { definePlugin } from '@tessera/module-sdk'
import { CounterWidget } from './CounterWidget'

// Un composant par widget du manifeste (clé = son « type »), et les textes du module
export default definePlugin({
  widgets: {
    compteur: CounterWidget
  },
  translations: {
    fr: {
      add: 'Ajouter {{step}}',
      reset: 'Remettre à zéro',
      clicks_one: '{{count}} clic',
      clicks_other: '{{count}} clics'
    },
    en: {
      add: 'Add {{step}}',
      reset: 'Reset',
      clicks_one: '{{count}} click',
      clicks_other: '{{count}} clicks'
    }
  }
})
