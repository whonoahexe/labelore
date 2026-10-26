// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    // `.planning/**` (quick-260923-lju): GSD planning artifacts, not shipped application code —
    // a sketch's own reference extraction script (`.planning/sketches/006-context-brief/
    // extract-context.reference.mjs`) is the first non-markdown file to land there, and it is
    // deliberately excluded from `git add` per this repo's convention (planning state stays out
    // of version-controlled source); linting it the same way `fixtures/**` and
    // `test/__golden__/**` are already excluded below keeps `npm run lint` scoped to the code
    // this project actually ships.
    ignores: ['node_modules/**', 'dist/**', 'fixtures/**', 'test/__golden__/**', '.planning/**'],
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
      'test/**/*.mjs',
      '.claude/cloud/*.mjs',
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
  {
    // NAV-09: the project slug is prefixed in exactly one place. A router link, navigate call or
    // location reader imported straight from react-router would skip it, so the web layer takes
    // them from nav.tsx. (A `type To` import and useSearchParams stay allowed.)
    files: ['src/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-router',
              importNames: ['Link', 'NavLink', 'useNavigate', 'useLocation'],
              message: 'Use src/web/nav.tsx so the project slug is prefixed in one place.',
            },
          ],
        },
      ],
    },
  },
  {
    // The two modules that own the prefixing: the wrappers themselves, and the router, which
    // builds the slug-free route tree and the gate in front of it.
    files: ['src/web/nav.tsx', 'src/web/app-router.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
