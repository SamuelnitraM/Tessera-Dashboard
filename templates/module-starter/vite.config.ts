import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tesseraModule } from '@tessera/module-sdk/vite'

// tesseraModule() construit le module dans dist/ (index.js, index.css, manifest.json)
export default defineConfig({
  plugins: [react(), tesseraModule()]
})
