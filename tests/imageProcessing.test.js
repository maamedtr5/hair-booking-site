// tests/imageProcessing.test.js
//
// Pure unit tests (no database, no network) for the admin photo pipeline in
// src/utils/imageProcessing.js. Fixtures are generated with sharp so the
// tests exercise the REAL decoder, which is the actual security boundary.
import sharp from 'sharp';
import {
  processServiceImage,
  ImageValidationError,
  MAX_UPLOAD_BYTES,
} from '../src/utils/imageProcessing.js';

const solid = (width, height, channels = 3) =>
  sharp({ create: { width, height, channels, background: { r: 120, g: 80, b: 60 } } });

const jpeg = (w = 800, h = 600) => solid(w, h).jpeg().toBuffer();
const png = (w = 800, h = 600) => solid(w, h).png().toBuffer();
const webp = (w = 800, h = 600) => solid(w, h).webp().toBuffer();

describe('processServiceImage — accepted input', () => {
  test.each([
    ['jpeg', jpeg],
    ['png', png],
    ['webp', webp],
  ])('accepts a valid %s and returns webp', async (_name, make) => {
    const out = await processServiceImage(await make());
    expect(out.mimeType).toBe('image/webp');
    expect(out.width).toBe(800);
    expect(out.height).toBe(600);
    expect(out.byteSize).toBe(out.data.length);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe('webp');
  });

  test('downsizes anything over 1200px on its longest side, keeping aspect ratio', async () => {
    const out = await processServiceImage(await jpeg(3000, 2000));
    expect(out.width).toBe(1200);
    expect(out.height).toBe(800);
  });

  test('never enlarges a small-but-valid photo', async () => {
    const out = await processServiceImage(await jpeg(300, 300));
    expect(out.width).toBe(300);
    expect(out.height).toBe(300);
  });

  test('strips EXIF metadata (including GPS) from the stored image', async () => {
    const withExif = await solid(800, 600)
      .jpeg()
      .withExif({ IFD0: { Copyright: 'secret-owner' }, IFD3: { GPSLatitudeRef: 'N' } })
      .toBuffer();
    // sanity: the fixture really does carry EXIF
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const out = await processServiceImage(withExif);
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from('secret-owner'))).toBe(false);
  });

  test('applies EXIF orientation and reports the displayed dimensions', async () => {
    const rotated = await solid(800, 400).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const out = await processServiceImage(rotated);
    // orientation 6 = 90deg: a 800x400 file is displayed 400x800
    expect(out.width).toBe(400);
    expect(out.height).toBe(800);
  });
});

describe('processServiceImage — rejected input', () => {
  const expectRejected = async (buf) => {
    await expect(processServiceImage(buf)).rejects.toBeInstanceOf(ImageValidationError);
  };

  test('rejects SVG (stored-XSS vector), even when it is well-formed', async () => {
    await expectRejected(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><script>alert(1)</script></svg>'),
    );
  });

  test('rejects HTML and arbitrary text disguised as an image', async () => {
    await expectRejected(Buffer.from('<html><script>alert(1)</script></html>'));
    await expectRejected(Buffer.from('definitely not an image'));
  });

  test('rejects GIF (decodable, but not an allowed format)', async () => {
    const gif = await solid(400, 400).gif().toBuffer();
    await expectRejected(gif);
  });

  test('rejects other decodable formats such as TIFF and AVIF', async () => {
    await expectRejected(await solid(400, 400).tiff().toBuffer());
    await expectRejected(await solid(400, 400).avif().toBuffer());
  });

  test('rejects a truncated/corrupt JPEG', async () => {
    const good = await jpeg();
    await expectRejected(good.subarray(0, Math.floor(good.length / 2)));
  });

  test('rejects an image smaller than the minimum dimension', async () => {
    await expectRejected(await jpeg(150, 600));
  });

  test('rejects empty, missing and non-buffer input', async () => {
    await expectRejected(Buffer.alloc(0));
    await expectRejected(undefined);
    await expectRejected('a string, not a buffer');
  });

  test('rejects a buffer over the upload cap', async () => {
    await expectRejected(Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1));
  });

  test('rejects a decompression bomb (tiny file, enormous bitmap)', async () => {
    // 10000x10000 = 100 MP of one colour compresses to a few KB but would
    // need ~300 MB to decode — over the 40 MP limitInputPixels guard.
    const bomb = await solid(10000, 10000).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(MAX_UPLOAD_BYTES);
    await expectRejected(bomb);
  });

  test('rejection messages never leak decoder internals', async () => {
    const err = await processServiceImage(Buffer.from('garbage bytes')).catch((e) => e);
    expect(err).toBeInstanceOf(ImageValidationError);
    expect(err.status).toBe(400);
    expect(err.message).not.toMatch(/\b(vips|libvips|sharp)\b|\bat \S+\.js|node_modules/i);
  });
});
