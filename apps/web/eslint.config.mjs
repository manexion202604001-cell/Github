import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'src/generated/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Domain layer must stay pure: no ORM, no provider SDKs, no framework.
    files: ['src/features/**/domain.ts', 'src/features/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@prisma/client', '@/server/*', 'next/*', '@/providers/*'], message: 'domain layer must remain free of infrastructure dependencies.' },
          ],
        },
      ],
    },
  },
  {
    // Only adapters may talk to a concrete vendor.
    files: ['src/features/**', 'src/app/**', 'src/components/**', 'src/jobs/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/providers/*/adapters/*'], message: 'use the provider registry instead of importing a concrete adapter.' },
          ],
        },
      ],
    },
  },
]

export default config
