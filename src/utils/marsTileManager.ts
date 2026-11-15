import * as THREE from 'three';

export type MarsSurfaceMode = 'fusion' | 'ctx' | 'viking';

export interface TileCoord {
  z: number;
  row: number;
  col: number;
  key: string;
}

export interface TileBounds {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

export interface ComposedTileTextures {
  key: string;
  z: number;
  row: number;
  col: number;
  mode: MarsSurfaceMode;
  colorTexture: THREE.CanvasTexture;
  bumpTexture: THREE.CanvasTexture;
  hasCtx: boolean;
  hasHirise: boolean;
}

export const JEZERO_HIRISE_BBOX = {
  lonMin: 77.2229331,
  lonMax: 77.583964,
  latMin: 18.3067994,
  latMax: 18.669315,
};

const MAX_VIKING_ZOOM = 7;
const MAX_MOLA_ZOOM = 5;
const MAX_CTX_ZOOM = 12;
const MIN_HIRISE_ZOOM = 9;
const MAX_HIRISE_ZOOM = 14;

export function getGridDimensions(z: number): { cols: number; rows: number } {
  return {
    cols: 1 << (z + 1),
    rows: 1 << z,
  };
}

export function wrapTileCol(col: number, cols: number): number {
  return ((col % cols) + cols) % cols;
}

export function latLonToTileCoord(
  latDeg: number,
  lonDeg: number,
  z: number
): TileCoord {
  const { cols, rows } = getGridDimensions(z);
  const wrappedLon = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  const clampedLat = THREE.MathUtils.clamp(latDeg, -89.99, 89.99);
  const col = Math.min(cols - 1, Math.max(0, Math.floor(((wrappedLon + 180) / 360) * cols)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((90 - clampedLat) / 180) * rows)));
  return {
    z,
    row,
    col,
    key: `${z}/${row}/${col}`,
  };
}

export function getTileBounds(z: number, row: number, col: number): TileBounds {
  const { cols, rows } = getGridDimensions(z);
  const lonMin = -180 + (col / cols) * 360;
  const lonMax = -180 + ((col + 1) / cols) * 360;
  const latMax = 90 - (row / rows) * 180;
  const latMin = 90 - ((row + 1) / rows) * 180;
  return { lonMin, lonMax, latMin, latMax };
}

export function tileIntersectsJezeroHirise(bounds: TileBounds): boolean {
  return (
    bounds.lonMax >= JEZERO_HIRISE_BBOX.lonMin &&
    bounds.lonMin <= JEZERO_HIRISE_BBOX.lonMax &&
    bounds.latMax >= JEZERO_HIRISE_BBOX.latMin &&
    bounds.latMin <= JEZERO_HIRISE_BBOX.latMax
  );
}

function vikingTileUrl(z: number, row: number, col: number): string {
  return `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/${z}/${row}/${col}.jpg`;
}

function molaTileUrl(z: number, row: number, col: number): string {
  return `https://trek.nasa.gov/tiles/Mars/EQ/mola128_mola64_merge_90Nto90S_SimpleC_clon0/1.0.0/default/default028mm/${z}/${row}/${col}.png`;
}

function ctxTileUrl(z: number, row: number, col: number): string {
  return `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/${z}/${row}/${col}`;
}

function jezeroHiriseTileUrl(z: number, row: number, col: number): string {
  return `https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/${z}/${row}/${col}.png`;
}

interface AncestorSlice {
  z: number;
  row: number;
  col: number;
  subX: number;
  subY: number;
  scale: number;
}

function getAncestorSlice(
  z: number,
  row: number,
  col: number,
  maxZ: number
): AncestorSlice {
  if (z <= maxZ) {
    return { z, row, col, subX: 0, subY: 0, scale: 1 };
  }
  const shift = z - maxZ;
  const scale = 1 << shift;
  return {
    z: maxZ,
    row: row >> shift,
    col: col >> shift,
    subX: col & (scale - 1),
    subY: row & (scale - 1),
    scale,
  };
}

function loadCorsImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawCroppedFromGlobal(
  ctx: CanvasRenderingContext2D,
  globalCanvas: HTMLCanvasElement,
  bounds: TileBounds,
  outSize: number
): void {
  const gw = globalCanvas.width;
  const gh = globalCanvas.height;
  const sx = ((bounds.lonMin + 180) / 360) * gw;
  const sw = ((bounds.lonMax - bounds.lonMin) / 360) * gw;
  const sy = ((90 - bounds.latMax) / 180) * gh;
  const sh = ((bounds.latMax - bounds.latMin) / 180) * gh;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(globalCanvas, sx, sy, sw, sh, 0, 0, outSize, outSize);
}

function drawSlicedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slice: AncestorSlice,
  outSize: number
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const sx = (slice.subX / slice.scale) * iw;
  const sy = (slice.subY / slice.scale) * ih;
  const sw = iw / slice.scale;
  const sh = ih / slice.scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outSize, outSize);
}

function applyLuminanceDetailFusion(
  basePixels: Uint8ClampedArray,
  detailPixels: Uint8ClampedArray,
  strength: number
): boolean {
  let coveredCount = 0;
  for (let i = 0; i < basePixels.length; i += 4) {
    const alpha = detailPixels[i + 3] / 255;
    if (alpha <= 0.01) continue;
    coveredCount++;

    const lum = detailPixels[i] / 255;
    // Center around 1.0 when CTX/HiRISE midtone is ~0.5 so authentic Martian regional albedo is preserved
    const targetScale = 0.36 + 1.28 * lum;
    const mod = 1 + alpha * strength * (targetScale - 1);

    basePixels[i] = Math.min(255, Math.max(0, Math.round(basePixels[i] * mod)));
    basePixels[i + 1] = Math.min(255, Math.max(0, Math.round(basePixels[i + 1] * mod)));
    basePixels[i + 2] = Math.min(255, Math.max(0, Math.round(basePixels[i + 2] * mod)));
    basePixels[i + 3] = 255;
  }
  return coveredCount > 0;
}

interface PendingJob {
  cacheKey: string;
  z: number;
  row: number;
  col: number;
  mode: MarsSurfaceMode;
  priority: number;
  resolve: (result: ComposedTileTextures | null) => void;
}

export class MarsTileManager {
  private readonly imageCache = new Map<string, Promise<HTMLImageElement | null>>();
  private readonly textureCache = new Map<string, ComposedTileTextures>();
  private readonly inflightJobs = new Map<string, Promise<ComposedTileTextures | null>>();
  private readonly queue: PendingJob[] = [];
  private activeFetches = 0;
  private readonly maxConcurrent = 6;
  private readonly maxTextureEntries = 96;
  private readonly maxImageEntries = 140;
  private activeDesiredKeys = new Set<string>();
  private disposed = false;

  constructor(
    private readonly baselineColorCanvas: HTMLCanvasElement | null,
    private readonly baselineElevationCanvas: HTMLCanvasElement | null,
    private readonly maxAnisotropy: number,
    private readonly onPendingCountChange?: (count: number) => void
  ) {}

  setDesiredKeys(keys: Set<string>): void {
    this.activeDesiredKeys = keys;
  }

  getCached(cacheKey: string): ComposedTileTextures | undefined {
    const hit = this.textureCache.get(cacheKey);
    if (hit) {
      // Refresh LRU position
      this.textureCache.delete(cacheKey);
      this.textureCache.set(cacheKey, hit);
    }
    return hit;
  }

  requestTile(
    z: number,
    row: number,
    col: number,
    mode: MarsSurfaceMode,
    priority: number
  ): Promise<ComposedTileTextures | null> {
    if (this.disposed) return Promise.resolve(null);
    const cacheKey = `${mode}:${z}/${row}/${col}`;

    const cached = this.getCached(cacheKey);
    if (cached) return Promise.resolve(cached);

    const existing = this.inflightJobs.get(cacheKey);
    if (existing) return existing;

    const promise = new Promise<ComposedTileTextures | null>((resolve) => {
      this.queue.push({ cacheKey, z, row, col, mode, priority, resolve });
      this.queue.sort((a, b) => a.priority - b.priority);
      this.pumpQueue();
    });

    this.inflightJobs.set(cacheKey, promise);
    promise.finally(() => {
      this.inflightJobs.delete(cacheKey);
    });

    return promise;
  }

  private pumpQueue(): void {
    this.onPendingCountChange?.(this.activeFetches + this.queue.length);

    while (!this.disposed && this.activeFetches < this.maxConcurrent && this.queue.length > 0) {
      const job = this.queue.shift()!;
      const tileId = `${job.z}/${job.row}/${job.col}`;
      if (this.activeDesiredKeys.size > 0 && !this.activeDesiredKeys.has(tileId)) {
        job.resolve(null);
        continue;
      }

      this.activeFetches++;
      this.onPendingCountChange?.(this.activeFetches + this.queue.length);

      this.buildComposedTile(job.z, job.row, job.col, job.mode, job.cacheKey)
        .then((res) => {
          if (res && !this.disposed) {
            this.putTextureCache(job.cacheKey, res);
          } else if (res && this.disposed) {
            res.colorTexture.dispose();
            res.bumpTexture.dispose();
          }
          job.resolve(this.disposed ? null : res);
        })
        .catch(() => {
          job.resolve(null);
        })
        .finally(() => {
          this.activeFetches--;
          this.pumpQueue();
        });
    }
  }

  private putTextureCache(key: string, entry: ComposedTileTextures): void {
    const prev = this.textureCache.get(key);
    if (prev && prev !== entry) {
      prev.colorTexture.dispose();
      prev.bumpTexture.dispose();
      this.textureCache.delete(key);
    }
    this.textureCache.set(key, entry);

    if (this.textureCache.size > this.maxTextureEntries) {
      for (const [candidateKey, candidateVal] of this.textureCache.entries()) {
        if (this.textureCache.size <= this.maxTextureEntries) break;
        const tileId = `${candidateVal.z}/${candidateVal.row}/${candidateVal.col}`;
        if (!this.activeDesiredKeys.has(tileId)) {
          candidateVal.colorTexture.dispose();
          candidateVal.bumpTexture.dispose();
          this.textureCache.delete(candidateKey);
        }
      }
    }
  }

  private fetchImageCached(key: string, url: string): Promise<HTMLImageElement | null> {
    const existing = this.imageCache.get(key);
    if (existing) {
      this.imageCache.delete(key);
      this.imageCache.set(key, existing);
      return existing;
    }

    const promise = loadCorsImage(url).then((img) => {
      if (!img) {
        this.imageCache.delete(key);
      }
      return img;
    });

    this.imageCache.set(key, promise);
    if (this.imageCache.size > this.maxImageEntries) {
      const oldest = this.imageCache.keys().next().value;
      if (oldest) this.imageCache.delete(oldest);
    }
    return promise;
  }

  private async buildComposedTile(
    z: number,
    row: number,
    col: number,
    mode: MarsSurfaceMode,
    cacheKey: string
  ): Promise<ComposedTileTextures | null> {
    if (typeof document === 'undefined' || this.disposed) return null;

    const bounds = getTileBounds(z, row, col);
    const vikingSlice = getAncestorSlice(z, row, col, MAX_VIKING_ZOOM);
    const molaSlice = getAncestorSlice(z, row, col, MAX_MOLA_ZOOM);

    const needsCtx = mode !== 'viking';
    const ctxZ = Math.min(z, MAX_CTX_ZOOM);
    const ctxSlice = getAncestorSlice(z, row, col, ctxZ);

    const wantsHirise =
      mode !== 'viking' &&
      z >= MIN_HIRISE_ZOOM &&
      tileIntersectsJezeroHirise(bounds);
    const hiriseZ = Math.min(z, MAX_HIRISE_ZOOM);

    const [vikingImg, molaImg, ctxImg, hiriseImg] = await Promise.all([
      this.fetchImageCached(
        `vik:${vikingSlice.z}/${vikingSlice.row}/${vikingSlice.col}`,
        vikingTileUrl(vikingSlice.z, vikingSlice.row, vikingSlice.col)
      ),
      this.fetchImageCached(
        `mola:${molaSlice.z}/${molaSlice.row}/${molaSlice.col}`,
        molaTileUrl(molaSlice.z, molaSlice.row, molaSlice.col)
      ),
      needsCtx
        ? this.fetchImageCached(
            `ctx:${ctxSlice.z}/${ctxSlice.row}/${ctxSlice.col}`,
            ctxTileUrl(ctxSlice.z, ctxSlice.row, ctxSlice.col)
          )
        : Promise.resolve(null),
      wantsHirise
        ? this.fetchImageCached(
            `hirise:${hiriseZ}/${row}/${col}`,
            jezeroHiriseTileUrl(hiriseZ, row, col)
          )
        : Promise.resolve(null),
    ]);

    if (this.disposed) return null;

    const outSize = needsCtx ? 512 : 256;

    // 1. Build color canvas
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = outSize;
    colorCanvas.height = outSize;
    const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: needsCtx });
    if (!colorCtx) return null;

    if (mode === 'ctx') {
      // Dark desaturated Mars base where CTX orbital strips have gaps
      colorCtx.fillStyle = '#141110';
      colorCtx.fillRect(0, 0, outSize, outSize);
      if (vikingImg) {
        colorCtx.save();
        colorCtx.globalAlpha = 0.25;
        drawSlicedImage(colorCtx, vikingImg, vikingSlice, outSize);
        colorCtx.restore();
      }
    } else if (vikingImg) {
      drawSlicedImage(colorCtx, vikingImg, vikingSlice, outSize);
    } else if (this.baselineColorCanvas) {
      drawCroppedFromGlobal(colorCtx, this.baselineColorCanvas, bounds, outSize);
    } else {
      colorCtx.fillStyle = '#6B3D2E';
      colorCtx.fillRect(0, 0, outSize, outSize);
    }

    let hasCtx = false;
    let hasHirise = false;

    if (mode === 'ctx') {
      if (ctxImg) {
        drawSlicedImage(colorCtx, ctxImg, ctxSlice, outSize);
        hasCtx = true;
      }
      if (hiriseImg) {
        colorCtx.imageSmoothingEnabled = true;
        colorCtx.imageSmoothingQuality = 'high';
        colorCtx.drawImage(hiriseImg, 0, 0, outSize, outSize);
        hasHirise = true;
      }
    } else if (mode === 'fusion' && (ctxImg || hiriseImg)) {
      const baseData = colorCtx.getImageData(0, 0, outSize, outSize);
      const scratch = document.createElement('canvas');
      scratch.width = outSize;
      scratch.height = outSize;
      const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });

      if (scratchCtx) {
        if (ctxImg) {
          scratchCtx.clearRect(0, 0, outSize, outSize);
          drawSlicedImage(scratchCtx, ctxImg, ctxSlice, outSize);
          const ctxData = scratchCtx.getImageData(0, 0, outSize, outSize);
          hasCtx = applyLuminanceDetailFusion(baseData.data, ctxData.data, 0.92);
        }
        if (hiriseImg) {
          scratchCtx.clearRect(0, 0, outSize, outSize);
          scratchCtx.imageSmoothingEnabled = true;
          scratchCtx.imageSmoothingQuality = 'high';
          scratchCtx.drawImage(hiriseImg, 0, 0, outSize, outSize);
          const hiData = scratchCtx.getImageData(0, 0, outSize, outSize);
          hasHirise = applyLuminanceDetailFusion(baseData.data, hiData.data, 0.96);
        }
        colorCtx.putImageData(baseData, 0, 0);
      }
    }

    // 2. Build genuine MOLA DEM bump canvas (alpha=0 deepest Hellas mapped strictly onto black #000)
    const bumpSize = 256;
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = bumpSize;
    bumpCanvas.height = bumpSize;
    const bumpCtx = bumpCanvas.getContext('2d');
    if (!bumpCtx) return null;

    bumpCtx.fillStyle = '#000000';
    bumpCtx.fillRect(0, 0, bumpSize, bumpSize);
    if (molaImg) {
      drawSlicedImage(bumpCtx, molaImg, molaSlice, bumpSize);
    } else if (this.baselineElevationCanvas) {
      drawCroppedFromGlobal(bumpCtx, this.baselineElevationCanvas, bounds, bumpSize);
    }

    const colorTexture = new THREE.CanvasTexture(colorCanvas);
    colorTexture.colorSpace = THREE.SRGBColorSpace;
    colorTexture.wrapS = THREE.ClampToEdgeWrapping;
    colorTexture.wrapT = THREE.ClampToEdgeWrapping;
    colorTexture.minFilter = THREE.LinearMipmapLinearFilter;
    colorTexture.magFilter = THREE.LinearFilter;
    colorTexture.generateMipmaps = true;
    colorTexture.anisotropy = this.maxAnisotropy;
    colorTexture.needsUpdate = true;

    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    bumpTexture.colorSpace = THREE.NoColorSpace;
    bumpTexture.wrapS = THREE.ClampToEdgeWrapping;
    bumpTexture.wrapT = THREE.ClampToEdgeWrapping;
    bumpTexture.minFilter = THREE.LinearMipmapLinearFilter;
    bumpTexture.magFilter = THREE.LinearFilter;
    bumpTexture.generateMipmaps = true;
    bumpTexture.anisotropy = this.maxAnisotropy;
    bumpTexture.needsUpdate = true;

    return {
      key: cacheKey,
      z,
      row,
      col,
      mode,
      colorTexture,
      bumpTexture,
      hasCtx,
      hasHirise,
    };
  }

  disposeAll(): void {
    this.disposed = true;
    this.queue.length = 0;
    for (const entry of this.textureCache.values()) {
      entry.colorTexture.dispose();
      entry.bumpTexture.dispose();
    }
    this.textureCache.clear();
    this.imageCache.clear();
  }
}
