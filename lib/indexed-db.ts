/**
 * IndexedDB wrapper for offline storage
 */
class IndexedDBWrapper {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = '1shotCRM', version: number = 1) {
    this.dbName = dbName;
    this.version = version;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncQueueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: false });
          syncQueueStore.createIndex('status', 'status', { unique: false });
          syncQueueStore.createIndex('created_at', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expires_at', 'expires_at', { unique: false });
        }
      };
    });
  }

  async addSyncQueueItem(item: {
    id?: string;
    operation: 'create' | 'update' | 'delete';
    entity_type: string;
    entity_id?: string;
    payload: any;
    status?: 'pending' | 'syncing' | 'completed' | 'failed';
    retry_count?: number;
  }): Promise<string> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      const itemWithDefaults = {
        id: item.id || crypto.randomUUID(),
        ...item,
        status: item.status || 'pending',
        retry_count: item.retry_count || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const request = store.add(itemWithDefaults);
      request.onsuccess = () => resolve(itemWithDefaults.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueueItems(status?: 'pending' | 'syncing' | 'completed' | 'failed'): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');
      
      if (status) {
        const index = store.index('status');
        const request = index.getAll(status);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      }
    });
  }

  async updateSyncQueueItem(id: string, updates: Partial<any>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (!item) {
          reject(new Error('Item not found'));
          return;
        }

        const updatedItem = {
          ...item,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        const putRequest = store.put(updatedItem);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteSyncQueueItem(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const item = {
        key,
        value,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      };

      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(key: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const item = request.result;
        if (!item) {
          resolve(null);
          return;
        }

        // Check if expired
        if (new Date(item.expires_at) < new Date()) {
          // Delete expired item
          const deleteTransaction = this.db!.transaction(['cache'], 'readwrite');
          deleteTransaction.objectStore('cache').delete(key);
          resolve(null);
          return;
        }

        resolve(item.value);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDB = new IndexedDBWrapper();

