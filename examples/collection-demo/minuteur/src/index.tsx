import { definePlugin } from '@tessera/module-sdk'
import { Minuteur } from './Minuteur'

export default definePlugin({
  widgets: {
    minuteur: Minuteur
  },
  translations: {
    fr: {
      start: 'Démarrer',
      pause: 'Pause',
      resume: 'Reprendre',
      reset: 'Remettre à zéro',
      done: 'Minuteur terminé',
      doneBody_one: '{{count}} minute écoulée.',
      doneBody_other: '{{count}} minutes écoulées.'
    },
    en: {
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      reset: 'Reset',
      done: 'Timer finished',
      doneBody_one: '{{count}} minute is up.',
      doneBody_other: '{{count}} minutes are up.'
    }
  }
})
