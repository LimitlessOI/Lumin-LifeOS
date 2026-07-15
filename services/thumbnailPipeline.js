/**
 * SYNOPSIS: Exports setupThumbnailSEO — services/thumbnailPipeline.js.
 */
import sharp from 'sharp';

export function setupThumbnailSEO(imageBuffer, options) {
  const { width, height, format, quality } = options;
  
  return sharp(imageBuffer)
    .resize(width, height)
    .toFormat(format, { quality })
    .toBuffer()
    .then(buffer => ({
      buffer,
      metadata: {
        width,
        height,
        format,
        quality
      }
    }));
}

export function generateSEODescription(title, description) {
  const maxLength = 160;
  let seoDescription = `${title}: ${description}`;
  if (seoDescription.length > maxLength) {
    seoDescription = seoDescription.substring(0, maxLength - 3) + '...';
  }
  return seoDescription;
}

export const DEFAULT_THUMBNAIL_OPTIONS = {
  width: 200,
  height: 200,
  format: 'jpeg',
  quality: 80
};