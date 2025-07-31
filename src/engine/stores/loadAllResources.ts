import { Dispatch, SetStateAction } from 'react';

import { RESOURCE_PATHS } from '@ex/constants/resources';

import { ResourceLoaderController } from '../ResourceLoaderController';

export async function loadAllResources(
  setLoadInfo: Dispatch<
    SetStateAction<{
      current: number;
      total: number;
      message: string;
    }>
        >,
    onStart: () => void
) {
    onStart()
  const resLoad = new ResourceLoaderController();

  const total = RESOURCE_PATHS.length;
  let loaded = 0;

  for (const path of RESOURCE_PATHS) {
    try {
      setLoadInfo({
        current: loaded,
        message: "Loading " + path,
        total,
      });
      await resLoad.getResource(path);
      loaded++;
      console.log(`✅ Loaded: ${path} (${loaded}/${total})`);
    } catch (err) {
      console.error(`❌ Failed to load: ${path}`, err);
    } finally {

    }
  }

  setLoadInfo({
    current: total,
    message: `🎉 All resources processed! Loaded: ${loaded}/${total}`,
    total,
  });
  console.log(`🎉 All resources processed! Loaded: ${loaded}/${total}`);
}

// loadAllResources().catch(console.error);
