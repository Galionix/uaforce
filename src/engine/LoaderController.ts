import { AbstractAssetTask, AssetsManager, FilesInput, Scene } from '@babylonjs/core';

import { ChunkStore } from './stores/ChunkStore';

export class ChunksLoaderController {
  private chunkStore: ChunkStore;

  private onSuccess: (tasks: AbstractAssetTask[]) => void;
  private scene: Scene;
  private loadedChunks: string[] = [];

  constructor(

    onSuccess: (tasks: AbstractAssetTask[]) => void,
    scene: Scene
  ) {
    this.chunkStore = new ChunkStore();
    this.onSuccess = onSuccess;

    this.scene = scene;
  }

  private async loadChunkServerStrategy(
    chunkId: string,
    format: "glb" | "png"
  ) {
    const response = await fetch(`/api/chunks/${chunkId}?format=${format}`, {
      headers: {
        Authorization: `Bearer ${`userToken`}`,
      },
    });

    if (!response.ok) throw new Error("Chunk load failed");

    const blob = await response.blob();

    return blob;
  }
  /**
   * Загружает один чанк, если нужно — берёт из кэша или с сервера.
   * Регистрирует его в FilesInput и возвращает URL для использования в AssetsManager.
   */
  private async getChunkBlob(
    position: string,
    format: "glb" | "png"
  ): Promise<Blob> {
    let blob = await this.chunkStore.getChunk(position, format);
    if (blob) {
      console.log(`Found ${position + "." + format} in IndexedDB!`);
    } else {
      console.log(
        `No ${position + "." + format} in IndexedDB, fetching from server...`
      );
      const metadata = await this.chunkStore.getManifestFromDB();
      if (!metadata) {
        throw new Error(
          "Disaster! we dont have metadata to properly fetch chunk by its filename. we need filename here and not just chunkName (coords)"
        );
      }
      const fileName = metadata.chunksMetadata.find(
        (m) => m.chunkName === position && m.ext === format
      )?.fileName;
      if (!fileName) {
        throw new Error(
          "Disaster! we dont have metadata to properly fetch chunk by its filename. we need filename here and not just chunkName (coords). we dont find needed chunk in metadata!"
        );
      }
      blob = await this.loadChunkServerStrategy(fileName, format);
      await this.chunkStore.saveChunk({
        id: position,
        format,
        blob,
      });
    }
    return blob;
  }

  private async fetchNewChunksManifest() {
    const response = await fetch(`/api/chunks/metadata`, {
      headers: {
        Authorization: `Bearer ${`userToken`}`,
      },
    });

    if (!response.ok) throw new Error("Chunk load failed");
    const manifest = await response.json();
    console.log('manifest: ', manifest);
    await this.chunkStore.saveManifest(manifest);
    return manifest;
  }

  /**
   * Основной публичный метод — загружает чанк и текстуру, цепляет к AssetsManager.
   */
  public async loadChunk(position: string) {
    console.log("Load chunk:", position);
      const metadataExpired = await this.chunkStore.isExpired();
      console.log('this.chunkStore.changedChunks: ', this.chunkStore.changedChunks);
      console.log("metadataExpired: ", metadataExpired);
      if (metadataExpired) {
          const manifest = await this.fetchNewChunksManifest();
          console.log('manifest: ', manifest);
          console.log('this.chunkStore.changedChunks: ', this.chunkStore.changedChunks);

        await this.chunkStore.deleteChangedChunks();


      console.log("manifest: ", manifest);
    }
    const assetsManager = new AssetsManager(this.scene);
    assetsManager.useDefaultLoadingScreen = false;

    // 1) Загружаем GLB
    const meshBlob = await this.getChunkBlob(position, "glb");
    FilesInput.FilesToLoad[`${position}-ground-mesh.glb`] = meshBlob as File;
    const meshTask = assetsManager.addMeshTask(
      "meshTask",
      "",
      "file:",
      `${position}-ground-mesh.glb`
    );

    // 2) Загружаем PNG
    const textureBlob = await this.getChunkBlob(position, "png");
    FilesInput.FilesToLoad[`${position}-ground-texture.png`] =
      textureBlob as File;
    const textureURL = URL.createObjectURL(textureBlob);
    const textureTask = assetsManager.addTextureTask(
      "groundTexture",
      textureURL
    );

    assetsManager.onFinish = this.onSuccess;

    assetsManager.load();
  }
}
