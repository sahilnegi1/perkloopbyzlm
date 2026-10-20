/**
 * Minimal typing for the BarcodeDetector API (Chrome/Edge/Android WebView).
 * Not yet in the standard TS lib — see https://wicg.github.io/shape-detection-api/
 * Feature-detect with `"BarcodeDetector" in window` before use.
 */
declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(source: ImageBitmapSource): Promise<{ rawValue: string; format: string }[]>;
}
