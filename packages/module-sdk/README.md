# @tessera/module-sdk

SDK des modules [Tessera Dashboard](https://github.com/SamuelnitraM/Tessera-Dashboard) : pont avec l'app, hooks, composants, extension Vite et outil `tessera-module` (valider, signer, empaqueter).

SDK for [Tessera Dashboard](https://github.com/SamuelnitraM/Tessera-Dashboard) modules: bridge with the app, hooks, components, Vite plugin and the `tessera-module` tool (validate, sign, package).

```tsx
import { definePlugin, usePluginTranslation, type WidgetProps } from '@tessera/module-sdk'
```

- Documentation (français) : [docs/modules/fr](https://github.com/SamuelnitraM/Tessera-Dashboard/blob/main/docs/modules/fr/README.md)
- Documentation (English): [docs/modules/en](https://github.com/SamuelnitraM/Tessera-Dashboard/blob/main/docs/modules/en/README.md)
- Modèle / template : `templates/module-starter`

Construire le SDK depuis le dépôt / build from the repository: `npm run sdk:build`; archive: `npm run sdk:pack`.

Licence MIT.
