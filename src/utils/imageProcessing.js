// src/utils/imageProcessing.js
//
// Every admin-uploaded service/category photo goes through here before it
// is stored. The raw upload is NEVER saved or served: it is decoded and
// re-encoded server-side, which is what actually makes it safe:
//
//   * Real format check — the file's decoded format must be JPEG, PNG or
//     WebP. The browser-supplied filename/Content-Type are attacker-
//     controlled and are NOT trusted (SVG/GIF/HTML-in-disguise all fail
//     here, which also rules out stored-XSS via SVG).
//   * Re-encoding drops every non-pixel byte: EXIF (including GPS
//     coordinates from a phone camera), embedded scripts, polyglot
//     payloads, trailing data.
//   * Decompression-bomb guard — limitInputPixels rejects a small file
//     that would decode to a gigantic bitmap and exhaust server memory.
//   * Normalised output — orientation applied, capped at 1200px on the
//     longest side, WebP. Keeps cards fast on mobile data and keeps DB
//     rows small (typically 40-200 KB).

import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB raw upload
export const ALLOWED_INPUT_FORMATS = new Set(['jpeg', 'png', 'webp']);
export const ALLOWED_INPUT_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_INPUT_PIXELS = 40_000_000; // ~40 megapixels, above any phone camera
const MIN_DIMENSION = 200; // px — smaller looks blurry when scaled to a card
const MAX_OUTPUT_DIMENSION = 1200;
const WEBP_QUALITY = 82;

// Not a plain `Error` subclass-by-accident: controllers match on this type
// to show the message to the admin. (errorMessages.safeErrorMessage only
// passes through base-class Errors, so this needs its own handling.)
export class ImageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageValidationError';
    this.status = 400;
  }
}

const sharpOptions = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' };

export async function processServiceImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImageValidationError('No image file was received. Please choose a photo to upload.');
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError('That photo is too large. Please use one under 5 MB.');
  }

  let meta;
  try {
    meta = await sharp(buffer, sharpOptions).metadata();
  } catch {
    throw new ImageValidationError('That file is not a valid image. Please upload a JPG, PNG or WebP photo.');
  }

  if (!ALLOWED_INPUT_FORMATS.has(meta.format)) {
    throw new ImageValidationError('Unsupported image type. Please upload a JPG, PNG or WebP photo.');
  }

  // EXIF orientation 5-8 means the stored width/height are swapped
  // relative to how the photo is actually displayed.
  const swapped = meta.orientation && meta.orientation >= 5;
  const shownWidth = swapped ? meta.height : meta.width;
  const shownHeight = swapped ? meta.width : meta.height;
  if (!shownWidth || !shownHeight || Math.min(shownWidth, shownHeight) < MIN_DIMENSION) {
    throw new ImageValidationError(
      `That photo is too small. Please use one at least ${MIN_DIMENSION}px on its shortest side.`,
    );
  }

  try {
    const { data, info } = await sharp(buffer, sharpOptions)
      .rotate() // apply EXIF orientation, then metadata is dropped on output
      .resize({
        width: MAX_OUTPUT_DIMENSION,
        height: MAX_OUTPUT_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      data,
      mimeType: 'image/webp',
      width: info.width,
      height: info.height,
      byteSize: data.length,
    };
  } catch {
    throw new ImageValidationError('That photo could not be processed. Please try a different file.');
  }
}
