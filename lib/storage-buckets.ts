import { supabase } from '@/lib/supabase';

/**
 * Storage bucket configuration
 */
export interface BucketConfig {
  name: string;
  public: boolean;
  allowedMimeTypes?: string[];
  fileSizeLimit?: number; // in bytes
}

/**
 * Create storage buckets if they don't exist
 * Note: This requires service role key or admin access
 * Should be run as a setup script or admin API route
 */
export async function createStorageBuckets(configs: BucketConfig[]): Promise<{
  created: string[];
  existing: string[];
  errors: Array<{ bucket: string; error: string }>;
}> {
  const created: string[] = [];
  const existing: string[] = [];
  const errors: Array<{ bucket: string; error: string }> = [];

  // List existing buckets
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    throw new Error(`Failed to list buckets: ${listError.message}`);
  }

  const existingBucketNames = buckets?.map(b => b.name) || [];

  for (const config of configs) {
    if (existingBucketNames.includes(config.name)) {
      existing.push(config.name);
      continue;
    }

    try {
      const { error: createError } = await supabase.storage.createBucket(config.name, {
        public: config.public,
        allowedMimeTypes: config.allowedMimeTypes,
        fileSizeLimit: config.fileSizeLimit,
      });

      if (createError) {
        errors.push({ bucket: config.name, error: createError.message });
      } else {
        created.push(config.name);
      }
    } catch (error: any) {
      errors.push({ bucket: config.name, error: error.message || 'Unknown error' });
    }
  }

  return { created, existing, errors };
}

/**
 * Get default bucket configurations for CRM
 */
export function getDefaultBucketConfigs(): BucketConfig[] {
  return [
    {
      name: 'service-sheets',
      public: true,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    },
    {
      name: 'parts-diagrams',
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    },
    {
      name: 'appliance-images',
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    },
  ];
}

