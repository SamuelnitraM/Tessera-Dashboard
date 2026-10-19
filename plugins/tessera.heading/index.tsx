import { definePlugin } from '@tessera/plugin-sdk'
import { HeadingWidget } from './HeadingWidget'

export default definePlugin({
  widgets: {
    heading: HeadingWidget
  },
  translations: {
    fr: { placeholder: 'Titre de section', inputLabel: 'Texte du titre' },
    en: { placeholder: 'Section heading', inputLabel: 'Heading text' }
  }
})
