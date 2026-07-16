// .github/eslint.config.mjs
// Minimal ESLint 9 flat config for `npx eslint@9 src cli --config .github/eslint.config.mjs`.
// Deliberately dependency-free (no @eslint/js, no plugins) so it runs via `npx eslint@9`
// without anything else installed. Keep this file small — it exists to catch obvious
// mistakes (undefined vars, leftover `var`, loose equality), not to enforce a style guide.

export default [
  {
    ignores: [
      'node_modules/**',
      'tests/fixtures/**',
      'tests/test-fixtures/**',
      'cli/test-fixtures/**',
      'reports/**',
      'deploy-packages/**',
      'examples/**',
    ],
  },
  {
    files: ['src/**/*.mjs', 'cli/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Buffer: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        AbortController: 'readonly',
        structuredClone: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-console': 'off',
    },
  },
];
