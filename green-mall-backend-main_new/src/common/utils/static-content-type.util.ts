import { openSync, readSync, closeSync } from 'fs';

const FALLBACK_CONTENT_TYPE = 'application/octet-stream';

const SIGNATURES: Array<{ mimeType: string; offset: number; bytes: number[] }> = [
  { mimeType: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { mimeType: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  { mimeType: 'image/bmp', offset: 0, bytes: [0x42, 0x4d] },
  { mimeType: 'image/tiff', offset: 0, bytes: [0x49, 0x49, 0x2a, 0x00] },
  { mimeType: 'image/tiff', offset: 0, bytes: [0x4d, 0x4d, 0x00, 0x2a] },
  { mimeType: 'image/avif', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mimeType: 'image/svg+xml', offset: 0, bytes: [0x3c, 0x3f, 0x78, 0x6d, 0x6c] },
  { mimeType: 'image/svg+xml', offset: 0, bytes: [0x3c, 0x73, 0x76, 0x67] },
  { mimeType: 'video/mp4', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mimeType: 'video/webm', offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  { mimeType: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  { mimeType: 'application/zip', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
];

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

/**
 * Uploaded files are stored under a random name without an extension, so
 * `express.static` cannot infer a content type and falls back to
 * `application/octet-stream`, which browsers refuse to render in `<img>`.
 * Detect the real type from the leading bytes and report it to the client.
 */
export function detectContentTypeFromFile(filePath: string): string {
  const extension = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  const byExtension = EXTENSION_CONTENT_TYPES[extension];
  if (byExtension) {
    return byExtension;
  }

  let descriptor: number | undefined;
  try {
    descriptor = openSync(filePath, 'r');
    const header = Buffer.alloc(16);
    const bytesRead = readSync(descriptor, header, 0, header.length, 0);
    const matches = SIGNATURES.find(
      ({ offset, bytes }) =>
        bytes.every((byte, index) => header[offset + index] === byte) &&
        offset + bytes.length <= bytesRead,
    );
    return matches?.mimeType ?? FALLBACK_CONTENT_TYPE;
  } catch {
    return FALLBACK_CONTENT_TYPE;
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }
}
