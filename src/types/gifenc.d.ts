declare module "gifenc" {
  export function quantize(data: Uint8ClampedArray | Uint8Array, maxColors: number): number[][];
  export function applyPalette(data: Uint8ClampedArray | Uint8Array, palette: number[][]): Uint8Array;

  export interface GIFEncoderWriteFrameOptions {
    palette?: number[][];
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    repeat?: number;
    first?: boolean;
  }

  export interface GIFEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: GIFEncoderWriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(opts?: { auto?: boolean }): GIFEncoderInstance;
}
