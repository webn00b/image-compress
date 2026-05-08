/// <reference lib="webworker" />
import Pica from 'pica';

const picaInstance = Pica({
  features: ['js', 'wasm', 'cib'],
  createCanvas: (w: number, h: number) => new OffscreenCanvas(w, h) as unknown as HTMLCanvasElement,
} as Parameters<typeof Pica>[0]);

export function computeResizeDimsByMaxSide(
  width: number,
  height: number,
  maxSide: number,
): { w: number; h: number } | null {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return null;
  const scale = maxSide / longest;
  return {
    w: Math.max(1, Math.round(width * scale)),
    h: Math.max(1, Math.round(height * scale)),
  };
}

export function computeResizeDimsByScale(
  width: number,
  height: number,
  factor: number,
): { w: number; h: number } | null {
  if (!Number.isFinite(factor) || factor <= 1) return null;
  return {
    w: Math.max(1, Math.round(width / factor)),
    h: Math.max(1, Math.round(height / factor)),
  };
}

export async function resizeImageData(src: ImageData, targetW: number, targetH: number): Promise<ImageData> {
  let srcBitmap: ImageBitmap | null = null;
  try {
    srcBitmap = await createImageBitmap(src);
    const dstCanvas = new OffscreenCanvas(targetW, targetH);

    await picaInstance.resize(
      srcBitmap as unknown as HTMLCanvasElement,
      dstCanvas as unknown as HTMLCanvasElement,
      { quality: 3, alpha: true },
    );

    const dstCtx = dstCanvas.getContext('2d');
    if (!dstCtx) throw new Error('Failed to acquire 2D context for destination');
    return dstCtx.getImageData(0, 0, targetW, targetH);
  } catch (picaErr) {
    return fallbackResize(src, targetW, targetH, picaErr);
  } finally {
    srcBitmap?.close();
  }
}

async function fallbackResize(
  src: ImageData,
  targetW: number,
  targetH: number,
  cause: unknown,
): Promise<ImageData> {
  console.warn('pica resize failed, falling back to canvas drawImage:', cause);
  let curCanvas: OffscreenCanvas = new OffscreenCanvas(src.width, src.height);
  const initCtx = curCanvas.getContext('2d');
  if (!initCtx) throw new Error('No 2D context');
  initCtx.putImageData(src, 0, 0);

  let curW = src.width;
  let curH = src.height;
  while (curW > targetW * 2 && curH > targetH * 2) {
    const nextW = Math.max(targetW, Math.floor(curW / 2));
    const nextH = Math.max(targetH, Math.floor(curH / 2));
    const next = new OffscreenCanvas(nextW, nextH);
    const nctx = next.getContext('2d');
    if (!nctx) throw new Error('No 2D context');
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = 'high';
    nctx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);
    curCanvas = next;
    curW = nextW;
    curH = nextH;
  }

  if (curW !== targetW || curH !== targetH) {
    const final = new OffscreenCanvas(targetW, targetH);
    const fctx = final.getContext('2d');
    if (!fctx) throw new Error('No 2D context');
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, targetW, targetH);
    curCanvas = final;
  }

  const finalCtx = curCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2D context');
  return finalCtx.getImageData(0, 0, targetW, targetH);
}
