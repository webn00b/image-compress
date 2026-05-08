declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@jsquash/jpeg/encode' {
  export default function encode(data: ImageData, options?: { quality?: number }): Promise<ArrayBuffer>;
}
declare module '@jsquash/jpeg/decode' {
  export default function decode(data: ArrayBuffer): Promise<ImageData>;
}
declare module '@jsquash/webp/encode' {
  export default function encode(data: ImageData, options?: { quality?: number; lossless?: number }): Promise<ArrayBuffer>;
}
declare module '@jsquash/webp/decode' {
  export default function decode(data: ArrayBuffer): Promise<ImageData>;
}
declare module '@jsquash/avif/encode' {
  export default function encode(data: ImageData, options?: { quality?: number; speed?: number }): Promise<ArrayBuffer>;
}
declare module '@jsquash/avif/decode' {
  export default function decode(data: ArrayBuffer): Promise<ImageData>;
}
declare module '@jsquash/png/encode' {
  export default function encode(data: ImageData): Promise<ArrayBuffer>;
}
declare module '@jsquash/png/decode' {
  export default function decode(data: ArrayBuffer): Promise<ImageData>;
}

declare module 'pica' {
  interface PicaInstance {
    resize(
      from: ImageData | HTMLCanvasElement | OffscreenCanvas | ImageBitmap,
      to: HTMLCanvasElement | OffscreenCanvas,
      options?: { quality?: 0 | 1 | 2 | 3; alpha?: boolean }
    ): Promise<HTMLCanvasElement | OffscreenCanvas>;
  }
  function pica(opts?: { features?: string[] }): PicaInstance;
  export default pica;
}

declare module 'upng-js' {
  export function encode(
    imgs: ArrayBuffer[] | Uint8Array[],
    width: number,
    height: number,
    cnum: number,
    delays?: number[],
  ): ArrayBuffer;
  export function encodeLL(
    imgs: ArrayBuffer[] | Uint8Array[],
    width: number,
    height: number,
    cc: number,
    ac: number,
    depth: number,
    delays?: number[],
  ): ArrayBuffer;
  export function decode(buffer: ArrayBuffer): {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    tabs: Record<string, unknown>;
    data: Uint8Array;
  };
  export function toRGBA8(img: ReturnType<typeof decode>): ArrayBuffer[];
  const _default: {
    encode: typeof encode;
    encodeLL: typeof encodeLL;
    decode: typeof decode;
    toRGBA8: typeof toRGBA8;
  };
  export default _default;
}

declare module 'libheif-js' {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(imageData: ImageData, cb: (data: ImageData | null) => void): void;
  }
  export interface HeifDecoder {
    decode(buffer: ArrayBuffer | Uint8Array): HeifImage[];
  }
  const libheif: () => { HeifDecoder: new () => HeifDecoder };
  export default libheif;
}
