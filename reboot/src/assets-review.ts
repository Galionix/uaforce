import * as pc from 'playcanvas';
import './assets-review.css';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const status = document.querySelector<HTMLElement>('#status')!;
const orbit = document.querySelector<HTMLInputElement>('#orbit')!;
const zoom = document.querySelector<HTMLInputElement>('#zoom')!;
const animation = document.querySelector<HTMLSelectElement>('#animation')!;

async function boot() {
  const device = await pc.createGraphicsDevice(canvas, { deviceTypes: ['webgl2'], antialias: true });
  const app = new pc.Application(canvas, { graphicsDevice: device });
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  device.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
  app.scene.ambientLight = new pc.Color(0.65, 0.69, 0.58);
  app.scene.exposure = 1.15;

  const camera = new pc.Entity('Asset inspection camera');
  camera.addComponent('camera', { clearColor: new pc.Color(0.15, 0.18, 0.12), farClip: 5000 });
  app.root.addChild(camera);

  const light = new pc.Entity('Key light');
  light.addComponent('light', { type: 'directional', color: new pc.Color(1, 0.92, 0.73), intensity: 1.4 });
  light.setEulerAngles(45, 30, 0);
  app.root.addChild(light);

  let center = new pc.Vec3();
  let radius = 15;
  const updateCamera = () => {
    const angle = Number(orbit.value) * Math.PI / 180;
    const distance = radius * Number(zoom.value) * 2.6;
    camera.setPosition(center.x + Math.cos(angle) * distance, center.y + distance * 0.48, center.z + Math.sin(angle) * distance);
    camera.lookAt(center);
  };
  orbit.addEventListener('input', updateCamera);
  zoom.addEventListener('input', updateCamera);
  document.querySelector('#reset')!.addEventListener('click', () => {
    orbit.value = '65'; zoom.value = '0.8'; updateCamera();
  });

  const resize = () => app.resizeCanvas(canvas.parentElement!.clientWidth, window.innerWidth <= 540 ? 320 : 420);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement!);
  resize();
  app.start();

  const asset = await new Promise<pc.Asset>((resolve, reject) => {
    app.assets.loadFromUrl('/assets/uaforce_test_scene1.glb', 'container', (error, loaded) => {
      if (error || !loaded) reject(new Error(String(error ?? 'Missing asset')));
      else resolve(loaded);
    });
  });
  // PlayCanvas documents this property, but 2.22.1 omits it from the interface declaration.
  const resource = asset.resource as pc.ContainerResource & { animations: pc.Asset[] };
  const model = resource.instantiateRenderEntity();
  app.root.addChild(model);

  const renders = model.findComponents('render') as pc.RenderComponent[];
  const meshes = renders.flatMap(render => render.meshInstances);
  // Frame the reusable authored props, not the much larger editor ground/death planes.
  // The full original scene remains imported and unchanged.
  const boxes = meshes.filter(mesh => /box/i.test(mesh.node.name));
  const framed = boxes.length ? boxes : meshes.filter(mesh => !/death|plane/i.test(mesh.node.name));
  if (framed.length) {
    const bounds = framed[0].aabb.clone();
    for (const mesh of framed.slice(1)) bounds.add(mesh.aabb);
    center = bounds.center.clone();
    radius = Math.max(2, bounds.halfExtents.length());
  }
  updateCamera();

  if (resource.animations.length) {
    model.addComponent('anim', { activate: false });
    resource.animations.forEach((clip, index) => {
      const option = document.createElement('option');
      option.value = String(index); option.textContent = (clip.resource as pc.AnimTrack).name || clip.name;
      animation.appendChild(option);
    });
    animation.addEventListener('change', () => {
      if (!model.anim) return;
      if (animation.value === '') {
        model.anim.playing = false;
        return;
      }
      const clip = resource.animations[Number(animation.value)];
      model.anim.assignAnimation('preview', clip.resource as pc.AnimTrack);
      model.anim.baseLayer?.play('preview');
      model.anim.playing = true;
    });
  }
  status.textContent = `Початковий GLB завантажено: ${meshes.length} мешів · ${resource.animations.length} анімацій · 216 КБ`;
  document.addEventListener('visibilitychange', () => { app.autoRender = !document.hidden; });
  window.addEventListener('pagehide', () => { observer.disconnect(); app.destroy(); }, { once: true });
}

boot().catch((error: unknown) => {
  console.error(error);
  status.textContent = `Не вдалося завантажити сцену: ${error instanceof Error ? error.message : String(error)}`;
});
