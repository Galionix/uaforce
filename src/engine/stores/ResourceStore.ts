interface ResourceData {
    path: string; // Пример: 'audio/music/track1.mp3'
    blob: Blob;
  }

  interface ResourceMetadata {
    fileName: string;
    ext: string;
    size: number;
    lastModified: string;
    hash: string;
  }

  interface ResourceManifest {
    generatedAt: string;
    manifestHash: string;
    files: ResourceMetadata[];
  }

  export class ResourceStore {
    private dbName: string;
    private filesStoreName: string;
    private metadataStoreName: string;
    private dbPromise: Promise<IDBDatabase>;

    private initializedAt: number;

    constructor(dbName = 'ResourcesDB') {
      this.dbName = dbName;
      this.filesStoreName = 'files';
      this.metadataStoreName = 'metadata';
      this.initializedAt = Date.now();
      this.dbPromise = this.openDB();
    }

    private openDB(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 2);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.filesStoreName)) {
            db.createObjectStore(this.filesStoreName);
          }
          if (!db.objectStoreNames.contains(this.metadataStoreName)) {
            db.createObjectStore(this.metadataStoreName);
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    public async saveFile(data: ResourceData) {
      const db = await this.dbPromise;
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.filesStoreName, 'readwrite');
        const store = tx.objectStore(this.filesStoreName);
        store.put(data.blob, data.path);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    public async getFile(path: string): Promise<Blob | undefined> {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.filesStoreName, 'readonly');
        const store = tx.objectStore(this.filesStoreName);
        const req = store.get(path);

        req.onsuccess = () => resolve(req.result as Blob | undefined);
        req.onerror = () => reject(req.error);
      });
    }

    public async deleteFile(path: string) {
      const db = await this.dbPromise;
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.filesStoreName, 'readwrite');
        const store = tx.objectStore(this.filesStoreName);
        store.delete(path);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    public async saveManifest(path:string, manifest: ResourceManifest) {
      const db = await this.dbPromise;
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.metadataStoreName, 'readwrite');
        const store = tx.objectStore(this.metadataStoreName);
        store.put(manifest, path);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    public async getManifest(): Promise<ResourceManifest | undefined> {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.metadataStoreName, 'readonly');
        const store = tx.objectStore(this.metadataStoreName);
        const req = store.get('manifest');
        req.onsuccess = () => resolve(req.result as ResourceManifest | undefined);
        req.onerror = () => reject(req.error);
      });
    }

    public async clearManifest() {
      const db = await this.dbPromise;
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.metadataStoreName, 'readwrite');
        const store = tx.objectStore(this.metadataStoreName);
        store.delete('manifest');

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }
