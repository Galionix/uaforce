import { getFilePath } from '@ex/utils/getFilePath';

import { ResourceManifest, ResourceStore } from './stores/ResourceStore';

export class ResourceLoaderController {
  private store: ResourceStore;

  constructor() {
    this.store = new ResourceStore();
  }
//   private manifestTimestamps: Map<string, number> = new Map();
//   private isManifestExpired(path: string, ttlMs: number = 60 * 60 * 1000): boolean {
//     const manifestKey = getFilePath(path);
//     const lastFetch = this.manifestTimestamps.get(manifestKey);
//     if (!lastFetch) return true; // Никогда не загружали — значит протух
//     const now = Date.now();
//     return now - lastFetch >= ttlMs;
//   }
  private isSavedFileValid(
    path: string,
    oldManifest: ResourceManifest,
    newManifest: ResourceManifest
  ): boolean {
    const fileName = path.split('/').pop();
    if (!fileName) return false;

    const oldFile = oldManifest?.files?.find(f => f.fileName === fileName);
    const newFile = newManifest?.files?.find(f => f.fileName === fileName);

    if (!oldFile || !newFile) return false;

    return oldFile.hash === newFile.hash;
  }
  private async fetchFileFromServer(path: string) {
    const response = await fetch(`/api/resource/get?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error(`Failed to fetch ${path}`);
    return await response.blob();
  }

    public async fetchNewManifest(path: string): Promise<ResourceManifest> {
    const response = await fetch(`/api/resource/manifest?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error('Failed to fetch manifest');
    const manifest = await response.json();
    await this.store.saveManifest(getFilePath(path), manifest);
    return manifest;
    }

//     public async getResource(path: string): Promise<Blob> {
//     //   check in manifest if file still valid

//     let blob = await this.store.getFile(path);
//     console.log('stored blob: ', blob);
//     if (!blob) {
//       console.log(`Not found in cache: ${path}`);
//       blob = await this.fetchFileFromServer(path);
//       await this.store.saveFile({ path, blob });
//     } else {
//       console.log(`Loaded from cache: ${path}`);
//     }
//     return blob;
    //   }
    // public async getResource(path: string): Promise<Blob> {
    //     console.log('path: ', path);
    //     const oldManifest = await this.store.getManifest(path);
    //     console.log('oldManifest: ', oldManifest);

    //     const newManifest = await this.fetchNewManifest(path);
    //     console.log('newManifest: ', newManifest);

    //     const isValid = !oldManifest ? false : this.isSavedFileValid(path, oldManifest, newManifest);

    //     let blob: Blob | undefined = undefined;

    //     if (isValid) {
    //         console.log('isValid: ', isValid);
    //       blob = await this.store.getFile(path);
    //       if (blob) {
    //         console.log(`Loaded valid from cache: ${path}`);
    //         return blob;
    //       }
    //     }

    //     console.log(`Cache miss or outdated: ${path}`);
    //     blob = await this.fetchFileFromServer(path);
    //     await this.store.saveFile({ path, blob });

    //     return blob;
    //   }
    private isStoredManifestExpired(lastFetchedAt: number, ttlMs: number = 60 * 60 * 1000): boolean {
        const dateCompareForManifest =  Date.now() - lastFetchedAt >= ttlMs;
        console.log('dateCompareForManifest: ', dateCompareForManifest);
        return dateCompareForManifest
      }
    public async getResource(path: string): Promise<Blob> {
        const manifestKey = getFilePath(path);
        const oldManifest = await this.store.getManifest(path);
        console.log('_______oldManifest: ', oldManifest);

        let newManifest = oldManifest?.manifest;

        if (!oldManifest || this.isStoredManifestExpired(oldManifest?.lastFetchedAt)) {
          console.log(`Manifest expired for: ${manifestKey}`);
          newManifest = await this.fetchNewManifest(path);
        //   this.manifestTimestamps.set(manifestKey, Date.now());
        } else {
          console.log(`Manifest fresh for: ${manifestKey}`);
        }

        const isValid = oldManifest && newManifest
          ? this.isSavedFileValid(path, oldManifest.manifest, newManifest)
          : false;

        let blob: Blob | undefined;

        if (isValid) {
          blob = await this.store.getFile(path);
          if (blob) {
            console.log(`Loaded valid from cache: ${path}`);
            return blob;
          }
        }

        console.log(`Cache miss or outdated: ${path}`);
        blob = await this.fetchFileFromServer(path);
        await this.store.saveFile({ path, blob });

        return blob;
      }

}
