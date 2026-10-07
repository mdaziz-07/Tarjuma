/**
 * Appends Cloudinary's dynamic optimization flags directly into a Cloudinary URL string.
 * This automatically compresses the image, scales it down, and serves it in modern WebP/AVIF formats.
 *
 * @param {string} url - The original Cloudinary image URL.
 * @param {number} width - The target width in pixels (defaults to 300).
 * @param {number} height - The target height in pixels (defaults to 300).
 * @returns {string} - The optimized Cloudinary URL.
 */
export function getOptimizedCloudinaryUrl(url, width = 300, height = 300) {
  if (!url || typeof url !== 'string') return url;

  if (url.includes('res.cloudinary.com')) {
    // Avoid double-applying transformations if they are already present
    if (url.includes('/upload/w_') || url.includes('/upload/f_auto')) {
      return url;
    }

    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const prefix = url.substring(0, uploadIndex + 8); // e.g. "https://res.cloudinary.com/demo/image/upload/"
      const suffix = url.substring(uploadIndex + 8);
      // Append w_X,h_Y,c_fill,g_face,f_auto,q_auto
      return `${prefix}w_${width},h_${height},c_fill,g_face,f_auto,q_auto/${suffix}`;
    }
  }

  return url;
}
