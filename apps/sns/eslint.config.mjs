import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', 'node_modules/**', 'src/generated/**'] },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // ドメイン層は純関数のみ。ORM・フレームワーク・Providerへ依存させない。
    files: ['src/features/**/domain.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/client', '@/server/*', 'next/*', '@/lib/ai/*', '@/lib/search/*'],
              message: 'domain layer must remain free of infrastructure dependencies.',
            },
          ],
        },
      ],
    },
  },
  {
    // 具体Adapterはレジストリ経由でのみ解決する。
    files: ['src/features/**', 'src/app/**', 'src/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/lib/ai/adapters/*', '@/lib/search/adapters/*'], message: 'use the provider registry instead of importing a concrete adapter.' },
          ],
        },
      ],
    },
  },
]

export default config
