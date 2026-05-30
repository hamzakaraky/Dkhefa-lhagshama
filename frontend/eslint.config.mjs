// Flat ESLint config (ESLint 9 + Next 16). Replaces the removed `next lint`
// wrapper and the legacy `.eslintrc.json`. `eslint-config-next` ships flat
// config arrays for ESLint 9; we spread them and keep our two rule overrides.
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
  {
    rules: {
      // Carried over from the previous .eslintrc.json.
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      // New React-Compiler-era rules (added by eslint-config-next 16). They flag
      // the established mount-fetch `useEffect(() => load(), [load])` pattern and
      // `Date.now()` in render across this codebase. Demote to warnings so they
      // surface without blocking CI; revisit as a dedicated cleanup.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]

export default config
