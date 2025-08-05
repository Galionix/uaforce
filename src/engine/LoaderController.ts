import { AbstractAssetTask, AssetsManager, FilesInput, Scene } from '@babylonjs/core';

import { MapController } from './MapController';
import { ChunkStore } from './stores/ChunkStore';

export class ChunksLoaderController {
  private chunkStore: ChunkStore;

  private onSuccess: (tasks: AbstractAssetTask[]) => void;
  private scene: Scene;
  private loadedChunks: string[] = [];
  private mapController: MapController;

  constructor(onSuccess: (tasks: AbstractAssetTask[]) => void, scene: Scene, mapController:MapController) {
    this.chunkStore = new ChunkStore();
    this.mapController = mapController;
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
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }
    // Track progress if needed
    // await this.trackProgress(response, reader);
    // need to find a way to track loading progress
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      console.log(`Total content length: ${contentLength} bytes`);
    }

    if (!response.ok) throw new Error("Chunk load failed");

    const blob = await this.trackProgressAndGetBlob(chunkId, response, reader);



    // Track loading progress
    // const reader = response.body?.getReader();
    // await this.trackProgress(response, reader);

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
        console.log('format: ', format);
        console.log('position: ', position);
        console.log('metadata: ', metadata);
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
    await this.chunkStore.saveManifest(manifest);
    return manifest;
  }

  /**
   * Основной публичный метод — загружает чанк и текстуру, цепляет к AssetsManager.
   */
  public async loadChunk(position: string) {
    const metadataExpired = await this.chunkStore.isExpired();
    if (metadataExpired) {
      const manifest = await this.fetchNewChunksManifest();

      await this.chunkStore.deleteChangedChunks();
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
    // const textureBlob = await this.getChunkBlob(position, "png");
    // FilesInput.FilesToLoad[`${position}-ground-texture.png`] =
    //   textureBlob as File;
    // const textureURL = URL.createObjectURL(textureBlob);
    // const textureTask = assetsManager.addTextureTask(
    //   "groundTexture",
    //   textureURL
    // );

    assetsManager.onFinish = this.onSuccess;

    assetsManager.load();
  }
  private async trackProgressAndGetBlob(
    chunkId: string,
    response: Response,
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<Blob> {
    let receivedBytes = 0;
    const contentLength = response.headers.get('Content-Length');
    const chunks: Uint8Array[] = [];

    if (contentLength) {
      console.log(`Total content length: ${contentLength} bytes`);
    } else {
      console.log('Content-Length header not available');
    }

    // Читаем поток по частям и сохраняем данные
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value); // Сохраняем каждый чанк
      receivedBytes += value.length;

      // Показываем прогресс
      if (contentLength) {
        const percentage = (receivedBytes / parseInt(contentLength)) * 100;
        this.mapController.setLoadInfo({
          current: receivedBytes,
          total: parseInt(contentLength),
          message: `Loading chunk ${chunkId} ${receivedBytes} bytes`,
        });
        console.log(`Download progress: ${percentage.toFixed(2)}%`);
      } else {
        console.log(`Received ${receivedBytes} bytes`);
      }
    }

    // Создаем blob из всех собранных чанков
    const uint8Array = new Uint8Array(receivedBytes);
    let offset = 0;

    for (const chunk of chunks) {
      uint8Array.set(chunk, offset);
      offset += chunk.length;
    }

    // Определяем MIME тип на основе формата
    // const mimeType = format === 'glb' ? 'model/gltf-binary' : 'image/png';

    return new Blob([uint8Array], { type: 'model/gltf-binary' });
  }
}
