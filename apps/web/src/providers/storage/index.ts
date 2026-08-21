import 'server-only'
import { env } from '@/lib/env'
import { ProviderRegistry } from '../registry'
import type { StorageProvider } from './types'
import { LocalStorageProvider } from './adapters/local'
import { S3StorageProvider } from './adapters/s3'
import { SupabaseStorageProvider } from './adapters/supabase'

let registry: ProviderRegistry<StorageProvider> | null = null

export function storageProviders(): ProviderRegistry<StorageProvider> {
  if (!registry) {
    registry = new ProviderRegistry<StorageProvider>(
      [
        new LocalStorageProvider(env.storage.localDir),
        new S3StorageProvider(env.storage.s3),
        new SupabaseStorageProvider(env.storage.supabase),
      ],
      env.storage.provider,
      'local',
    )
  }
  return registry
}

export function storage(): StorageProvider {
  return storageProviders().get()
}

export * from './types'
