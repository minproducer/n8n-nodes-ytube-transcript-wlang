// ❌ Sai: import { ... } from 'eslint/config'
// ✅ Đúng:
import eslintPluginJs from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      js: eslintPluginJs,
    },
    rules: {
      ...eslintPluginJs.configs.recommended.rules,
    },
  },
];
