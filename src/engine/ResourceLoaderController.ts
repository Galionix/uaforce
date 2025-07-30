import { getFilePath } from '@ex/utils/getFilePath';

import { ResourceStore } from './stores/ResourceStore';

export class ResourceLoaderController {
  private store: ResourceStore;

  constructor() {
    this.store = new ResourceStore();
  }

  private async fetchFileFromServer(path: string) {
    const response = await fetch(`/api/resource/get?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error(`Failed to fetch ${path}`);
    return await response.blob();
  }

    public async fetchNewManifest(path: string): Promise<any> {
    //   `/api/chunks/${chunkId}?format=${format}`
    const response = await fetch(`/api/resource/manifest?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error('Failed to fetch manifest');
    const manifest = await response.json();
    await this.store.saveManifest(getFilePath(path), manifest);
    return manifest;
    }

  public async getResource(path: string): Promise<Blob> {
    let blob = await this.store.getFile(path);
    console.log('stored blob: ', blob);
    if (!blob) {
      console.log(`Not found in cache: ${path}`);
      blob = await this.fetchFileFromServer(path);
      await this.store.saveFile({ path, blob });
    } else {
      console.log(`Loaded from cache: ${path}`);
    }
    return blob;
  }

//   public async updateManifest(manifest: any) {
//     await this.store.saveManifest(manifest);
//   }
}
