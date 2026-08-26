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
