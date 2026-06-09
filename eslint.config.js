// Config de ESLint (flat, ESLint 9). Linter del frontend: atrapa imports/variables
// sin usar, errores de tipo y —lo más importante acá— las reglas de los hooks de
// React (deps de useEffect/useCallback), que es donde se esconden bugs sutiles.
// No incluye reglas de formato (no hay Prettier): no reformatea el código.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // No linteamos artefactos ni el design system (assets de terceros).
  { ignores: ['dist', 'node_modules', 'rfdd-design-system'] },

  // App (browser): React + TS.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Archivos de config que corren en Node (vite.config.ts).
  {
    files: ['*.ts', '*.js'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
)
