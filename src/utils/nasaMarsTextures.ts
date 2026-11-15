import * as THREE from 'three';

export interface NasaMarsDatasetInfo {
  id: string;
  name: string;
  source: string;
  wmtsCapabilitiesUrl: string;
  projection: string;
  resolution: string;
  assetPath: string;
  role: string;
}

export const NASA_MARS_DATASETS: NasaMarsDatasetInfo[] = [
  {
    id: 'viking-mdim21-color',
    name: 'Mars Viking MDIM 2.1 Global Color Mosaic (232 m)',
    source: 'NASA Solar System Treks / Mars Trek (USGS Astrogeology)',
    wmtsCapabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml',
    projection: 'urn:ogc:def:crs:EPSG::104905 (Simple Cylindrical / Equirectangular)',
    resolution: '2048 × 1024 baseline (Zoom 2) + progressive regional streaming up to Zoom 7',
    assetPath: '/nasa/mars_viking_mdim21_2048.jpg',
    role: 'Planetary surface color / albedo baseline and regional color tiles',
  },
  {
    id: 'caltech-ctx-beta01',
    name: 'Global MRO CTX Mosaic Beta01 (~5 m/px)',
    source: 'Caltech Murray Lab / NASA JPL / MSSS (Esri Astrogeology & Mars Trek)',
    wmtsCapabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0/WMTSCapabilities.xml',
    projection: 'urn:ogc:def:crs:EPSG::104905 (Simple Cylindrical / Equirectangular)',
    resolution: '512 × 512 px panchromatic tiles streamed on zoom (Zoom 3–12, up to ~5 m/px)',
    assetPath: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{row}/{col}',
    role: 'High-resolution orbital geomorphology detail fused with Viking color or viewed panchromatically',
  },
  {
    id: 'mgs-mola-dem',
    name: 'MGS MOLA Global Digital Elevation Model (128/64 ppd merge)',
    source: 'NASA Mars Global Surveyor MOLA Science Team / Mars Trek',
    wmtsCapabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/mola128_mola64_merge_90Nto90S_SimpleC_clon0/1.0.0/WMTSCapabilities.xml',
    projection: 'urn:ogc:def:crs:EPSG::104905 (Simple Cylindrical / Equirectangular)',
    resolution: '2048 × 1024 baseline (Zoom 2) + regional elevation relief streaming up to Zoom 5',
    assetPath: '/nasa/mars_mola_dem_2048.png',
    role: 'True physical surface geometric displacement, surface normals, and bump relief',
  },
  {
    id: 'jezero-hirise-ortho',
    name: 'Jezero Crater HiRISE 25 cm OrthoMosaic',
    source: 'NASA/JPL/University of Arizona / Mars Trek',
    wmtsCapabilitiesUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml',
    projection: 'urn:ogc:def:crs:EPSG::104905 (Simple Cylindrical / Equirectangular)',
    resolution: '256 × 256 px regional tiles (Zoom 9–14, strictly within Jezero Crater 77.22°–77.58° E, 18.31°–18.67° N)',
    assetPath:
      'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/{z}/{row}/{col}.png',
    role: 'Local high-resolution crater & fan-delta detail upon close zoom into Jezero Crater',
  },
];

export interface LoadedMarsTextures {
  colorMap: THREE.Texture;
  elevationMap: THREE.Texture;
  colorCanvas: HTMLCanvasElement | null;
  elevationCanvas: HTMLCanvasElement | null;
  sampleElevationNormalized: (latDeg: number, lonDeg: number) => number;
}

let cachedPromise: Promise<LoadedMarsTextures> | null = null;

function loadImageTexture(
  loader: THREE.TextureLoader,
  url: string,
  colorSpace: THREE.ColorSpace,
  anisotropy: number
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = colorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = anisotropy;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      (err) => {
        reject(
          err instanceof Error
            ? err
            : new Error(`Failed to load NASA planetary texture: ${url}`)
        );
      }
    );
  });
}

function textureToCanvas(texture: THREE.Texture): HTMLCanvasElement | null {
  const image = texture.image as HTMLImageElement | HTMLCanvasElement | undefined;
  if (!image || typeof document === 'undefined') return null;

  try {
    const width = 'naturalWidth' in image ? image.naturalWidth : image.width;
    const height = 'naturalHeight' in image ? image.naturalHeight : image.height;
    if (!width || !height) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  } catch {
    return null;
  }
}

function buildElevationSampler(
  elevationCanvas: HTMLCanvasElement | null
): (latDeg: number, lonDeg: number) => number {
  if (!elevationCanvas) {
    return () => 0.45;
  }

  try {
    const width = elevationCanvas.width;
    const height = elevationCanvas.height;
    const ctx = elevationCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return () => 0.45;

    const data = ctx.getImageData(0, 0, width, height).data;

    // Bilinear interpolation matching WebGL LinearFilter on the global MOLA texture
    return (latDeg: number, lonDeg: number) => {
      const wrappedLon = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
      const u = THREE.MathUtils.clamp(0.5 + wrappedLon / 360, 0, 1);
      const yNorm = THREE.MathUtils.clamp(0.5 - latDeg / 180, 0, 1);

      const fx = u * (width - 1);
      const fy = yNorm * (height - 1);
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = (x0 + 1) % width;
      const y1 = Math.min(height - 1, y0 + 1);
      const tx = fx - x0;
      const ty = fy - y0;

      const v00 = data[(y0 * width + x0) * 4] / 255;
      const v10 = data[(y0 * width + x1) * 4] / 255;
      const v01 = data[(y1 * width + x0) * 4] / 255;
      const v11 = data[(y1 * width + x1) * 4] / 255;

      const top = v00 + (v10 - v00) * tx;
      const bottom = v01 + (v11 - v01) * tx;
      return top + (bottom - top) * ty;
    };
  } catch {
    return () => 0.45;
  }
}

/**
 * Loads and caches the verified NASA Viking MDIM 2.1 global color mosaic and
 * MGS MOLA global DEM baseline textures. Rejects cleanly if assets fail to load.
 */
export function loadNasaMarsTextures(
  maxAnisotropy = 8
): Promise<LoadedMarsTextures> {
  if (cachedPromise) {
    return cachedPromise;
  }

  const loader = new THREE.TextureLoader();
  const anisotropy = Math.max(1, Math.min(16, maxAnisotropy));

  cachedPromise = Promise.all([
    loadImageTexture(
      loader,
      '/nasa/mars_viking_mdim21_2048.jpg',
      THREE.SRGBColorSpace,
      anisotropy
    ),
    loadImageTexture(
      loader,
      '/nasa/mars_mola_dem_2048.png',
      THREE.NoColorSpace,
      anisotropy
    ),
  ])
    .then(([colorMap, elevationMap]) => {
      const colorCanvas = textureToCanvas(colorMap);
      const elevationCanvas = textureToCanvas(elevationMap);
      return {
        colorMap,
        elevationMap,
        colorCanvas,
        elevationCanvas,
        sampleElevationNormalized: buildElevationSampler(elevationCanvas),
      };
    })
    .catch((err) => {
      cachedPromise = null;
      throw err;
    });

  return cachedPromise;
}

export function resetNasaMarsTextureCache(): void {
  cachedPromise = null;
}
