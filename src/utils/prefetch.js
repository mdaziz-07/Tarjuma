import scholars from '../data/scholars.json';
import backgroundSounds from '../data/backgroundSounds.json';

export async function prefetchAppAssets() {
  // 1. Prefetch background sounds into Cache API cache
  try {
    const soundCache = await caches.open('background-sounds-cache');
    const soundUrls = backgroundSounds
      .filter(s => !s.isPreinstalled && s.url)
      .map(s => s.url);

    soundUrls.forEach(async (url) => {
      try {
        const match = await soundCache.match(url);
        if (!match) {
          await soundCache.add(url);
          console.log('[Prefetch] Cached background sound:', url);
        }
      } catch (err) {
        console.warn('[Prefetch] Failed to cache sound:', url, err);
      }
    });
  } catch (e) {
    console.warn('[Prefetch] Cache API sound prefetch error:', e);
  }

  // 2. Prefetch scholar images using standard Image preloading
  try {
    const imageUrls = scholars
      .filter(s => s.photo_url)
      .map(s => s.photo_url);

    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
    console.log('[Prefetch] Preloaded all scholar images');
  } catch (e) {
    console.warn('[Prefetch] Image prefetch error:', e);
  }
}
