import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['dist', 'node_modules', 'coverage', 'docs', 'public'],
    },
    js.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                caughtErrors: 'none',
                ignoreRestSiblings: true,
            }],
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        },
    },
    {
        files: ['scripts/**/*.js', 'backend/jobs/**/*.js'],
        rules: {
            'no-console': 'off',
        },
    },
];
