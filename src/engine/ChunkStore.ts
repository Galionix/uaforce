const ENABLE_IMMIDEATE_MANIFEST_CHECK = true;
interface ChunkData {
  id: string; // Например: 'x1y1'
  format: "glb" | "png";
  blob: Blob; // Сохраняем сам Blob
}

type MetadataEntry = {
  fileName: string;
  size: number;
  lastModified: string;
  hash: string;
  chunkName: string;
  ext: "glb" | "png";
};
interface ManifestData {
  generatedAt: string;
  manifestHash: string;
  chunksMetadata: MetadataEntry[];
}

export class ChunkStore {
  private dbName: string;
  private chunksStoreName: string;
  private metadataStoreName: string;
  private dbPromise: Promise<IDBDatabase>;
  // updates after save
  private _isManifestHashChanged = false;
  private _changedChunks: MetadataEntry[] = [];
  private initializedAt;

  constructor(dbName = "ChunksDB") {
    this.initializedAt = Date.now(); // время инициализации в миллисекундах

    this.dbName = dbName;
    this.chunksStoreName = "chunks";
    this.metadataStoreName = "metadata";
    this.dbPromise = this.openDB();
  }

  public async isExpired() {
    if (ENABLE_IMMIDEATE_MANIFEST_CHECK) return true;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // миллисекунды в 1 час
    const manifestExists = await this.getManifestFromDB();
    console.log("manifestExists: ", manifestExists);
    return now - this.initializedAt >= oneHour || !manifestExists;
  }
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 3);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.chunksStoreName)) {
          db.createObjectStore(this.chunksStoreName);
        }
        if (!db.objectStoreNames.contains(this.metadataStoreName)) {
          db.createObjectStore(this.metadataStoreName);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // === Работа с чанками ===

  public async saveChunk(data: ChunkData): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.chunksStoreName, "readwrite");
      const store = tx.objectStore(this.chunksStoreName);
      const key = `${data.id}.${data.format}`;
      store.put(data.blob, key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getChunk(
    id: string,
    format: "glb" | "png"
  ): Promise<Blob | undefined> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.chunksStoreName, "readonly");
      const store = tx.objectStore(this.chunksStoreName);
      const key = `${id}.${format}`;
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteChangedChunks() {
    this.changedChunks.forEach(async (metadata) => {
      await this.deleteChunk(metadata.chunkName, metadata.ext);
      console.log("deleted from cache!!: ", metadata.chunkName, metadata.ext);
    });
  }
  public async deleteChunk(id: string, format: "glb" | "png"): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.chunksStoreName, "readwrite");
      const store = tx.objectStore(this.chunksStoreName);
      const key = `${id}.${format}`;
      store.delete(key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // === Работа с метаданными ===

  // updates after save
  //   get isManifestChanged() {
  //     return this._isManifestChanged;
  //   }
  get changedChunks() {
    return this._changedChunks;
  }
  public async saveManifest(newManifestToSave: ManifestData): Promise<void> {
    console.log("checking");
    console.log("new manifest: ", newManifestToSave);
    const existingManifest = await this.getManifestFromDB();
    console.log("existing manifest: ", existingManifest);
    this._isManifestHashChanged =
      newManifestToSave.manifestHash !== existingManifest?.manifestHash;
    if (this._isManifestHashChanged && existingManifest) {
      //   calculate changed chunks
      this._changedChunks = [];

      newManifestToSave.chunksMetadata.forEach((existingMetadata) => {
        const inTact = existingManifest.chunksMetadata.find((ch) => {
          if (
            ch.fileName === existingMetadata.fileName &&
            ch.hash === existingMetadata.hash
          )
            return true;
        });
        console.log(existingMetadata.fileName, " inTact: ", !!inTact);
        if (!inTact) {
          this._changedChunks.push(existingMetadata);
        }
        console.log("this._changedChunks: ", this._changedChunks);
      });
    }
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.metadataStoreName, "readwrite");
      const store = tx.objectStore(this.metadataStoreName);
      store.put(newManifestToSave, "manifest");

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getManifestFromDB(): Promise<ManifestData | undefined> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.metadataStoreName, "readonly");
      const store = tx.objectStore(this.metadataStoreName);
      const request = store.get("manifest");

      request.onsuccess = () =>
        resolve(request.result as ManifestData | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  public async clearManifest(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.metadataStoreName, "readwrite");
      const store = tx.objectStore(this.metadataStoreName);
      store.delete("manifest");

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
