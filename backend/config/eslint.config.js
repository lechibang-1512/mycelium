import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { 
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Accessibility rules
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
    },
  },
  // Node / server-side files (CommonJS)
  {
    files: [
      'backend/routes/**',
      'backend/services/**',
      'backend/server.cjs',
      'backend/config/**',
      'backend/middleware/**',
      'backend/utils/**',
      'backend/utils/permissions.js',
      'scripts/**',
      '*.cjs',
      '**/*.cjs',
      '**/scripts/**',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Warn on console usage in server-side code; allow console.warn and console.error
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Shared files (work in both Node.js and browser)
  {
    files: ['shared/**'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  // Public/browser-side vanilla JS served from public/js — expose common globals
  {
    files: ['public/js/**'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, bootstrap: true, DOMPurify: true, zxcvbn: true },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  // Test files (Mocha)
  {
    files: ['scripts/tests/**', 'tests/**', '**/*.test.js', '**/tests/**'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node, ...globals.mocha },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
])