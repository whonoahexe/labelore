// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'fixtures/**', 'test/__golden__/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Leading underscore signals an intentionally-unused parameter (e.g. an external callback
      // signature this codebase must conform to, such as MiniSearch's tokenize/processTerm
      // (text, fieldName) shape, where fieldName is part of the contract but not always consumed).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      '*.config.{js,ts}',
      'src/cli/**/*.ts',
      'src/planning-fs/**/*.ts',
      'src/planning-repo/**/*.ts',
      'src/server/**/*.ts',
      'test/**/*.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['src/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    ...reactHooks.configs.flat.recommended,
  },
);
