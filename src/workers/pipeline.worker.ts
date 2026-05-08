/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { ProcessTaskInput, ProcessTaskOutput } from '../types';
import { decodeToImageData } from '../pipeline/decode';
import { encodeImageData } from '../pipeline/encode';
import { computeResizeDimsByMaxSide, computeResizeDimsByScale, resizeImageData } from '../pipeline/resize';
import { searchQualityForTargetSize } from '../pipeline/targetSize';
import { mimeForFormat } from '../pipeline/format';

export type ProgressCallback = (progress: number, stage: string) => void;

const api = {
  async process(input: ProcessTaskInput, onProgress: ProgressCallback): Promise<ProcessTaskOutput> {
    const { buffer, mime, settings } = input;

    onProgress(0.05, 'Decoding');
    let imageData = await decodeToImageData(buffer, mime);
    onProgress(0.2, 'Decoded');

    if (settings.resizeEnabled) {
      const dims =
        settings.resizeMode === 'scale'
          ? computeResizeDimsByScale(imageData.width, imageData.height, settings.scaleFactor)
          : computeResizeDimsByMaxSide(imageData.width, imageData.height, settings.maxSide);
      if (dims) {
        onProgress(0.25, 'Resizing');
        imageData = await resizeImageData(imageData, dims.w, dims.h);
        onProgress(0.5, 'Resized');
      }
    }

    let outBuffer: ArrayBuffer;
    let usedQuality = settings.quality;

    if (settings.targetSizeEnabled && settings.targetSizeKb > 0 && settings.format !== 'png') {
      const targetBytes = settings.targetSizeKb * 1024;
      onProgress(0.55, 'Searching quality');
      const result = await searchQualityForTargetSize(
        imageData,
        settings.format,
        targetBytes,
        settings.pngColors,
        (i, total) => {
          onProgress(0.55 + (0.4 * i) / total, `Encoding (${i}/${total})`);
        },
      );
      outBuffer = result.buffer;
      usedQuality = result.quality;
    } else {
      onProgress(0.6, 'Encoding');
      outBuffer = await encodeImageData(imageData, settings.format, {
        quality: settings.quality,
        pngColors: settings.pngColors,
      });
    }

    onProgress(1, 'Done');

    const output: ProcessTaskOutput = {
      buffer: outBuffer,
      width: imageData.width,
      height: imageData.height,
      format: settings.format,
      quality: usedQuality,
      outputMime: mimeForFormat(settings.format),
      pngColors: settings.format === 'png' ? settings.pngColors : 0,
    };

    return Comlink.transfer(output, [outBuffer]);
  },
};

export type PipelineApi = typeof api;

Comlink.expose(api);
