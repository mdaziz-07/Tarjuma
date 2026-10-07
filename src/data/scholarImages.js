import yasserImg from '../assets/scholars/YaseerAlDosari.webp';
import afasyImg from '../assets/scholars/MisharyRashidAlafasy.webp';
import sudaisImg from '../assets/scholars/AbdulRahmanAlSudais.webp';
import muaiqlyImg from '../assets/scholars/MaherAlMuaiqly.webp';
import balushiImg from '../assets/scholars/HazzaAlBalushi.webp';
import kumarovImg from '../assets/scholars/YergenKumarov.webp';
import jalandharyImg from '../assets/scholars/FatehMuhammedJalandhary.webp';
import shuraimImg from '../assets/scholars/Sa\'udash-Shuraim.webp';
import shatriImg from '../assets/scholars/AbuBakrAl-Shatri.webp';
import samadImg from '../assets/scholars/AbdulBasetAbdulSamad.webp';

export const scholarImagesMap = {
  'scholar-1': yasserImg,
  'scholar-2': afasyImg,
  'scholar-3': sudaisImg,
  'scholar-4': muaiqlyImg,
  'scholar-5': balushiImg,
  'scholar-6': kumarovImg,
  'scholar-jalandhary': jalandharyImg,
  'scholar-7': shuraimImg,
  'scholar-8': shatriImg,
  'scholar-9': samadImg,
};

export function getScholarPhotoUrl(scholarOrId) {
  if (!scholarOrId) return '';
  const id = typeof scholarOrId === 'string'
    ? scholarOrId
    : typeof scholarOrId === 'number'
      ? `scholar-${scholarOrId}`
      : (scholarOrId.id || scholarOrId.scholar_id || scholarOrId.scholarId);

  if (id && scholarImagesMap[id]) {
    return scholarImagesMap[id];
  }
  if (id && scholarImagesMap[`scholar-${id}`]) {
    return scholarImagesMap[`scholar-${id}`];
  }
  if (typeof scholarOrId === 'object' && scholarOrId.photo_url) {
    return scholarOrId.photo_url;
  }
  return '';
}

// In-memory cache for Base64 artwork so native Android MediaSession can load Bitmaps without network issues
const base64ArtworkCache = new Map();

export async function getScholarPhotoBase64(scholarOrIdOrUrl) {
  if (!scholarOrIdOrUrl) return '';
  if (typeof scholarOrIdOrUrl === 'string' && scholarOrIdOrUrl.startsWith('data:')) return scholarOrIdOrUrl;

  // Determine URL — support both scholar ID/object and direct URL/path string
  let url = '';
  if (typeof scholarOrIdOrUrl === 'string' && (scholarOrIdOrUrl.includes('/') || scholarOrIdOrUrl.includes('.'))) {
    url = scholarOrIdOrUrl;
  } else {
    url = getScholarPhotoUrl(scholarOrIdOrUrl);
  }

  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (base64ArtworkCache.has(url)) return base64ArtworkCache.get(url);
  if (typeof scholarOrIdOrUrl === 'string' && base64ArtworkCache.has(scholarOrIdOrUrl)) {
    return base64ArtworkCache.get(scholarOrIdOrUrl);
  }

  return new Promise((resolve) => {
    // 1. Try fetch + blob + readAsDataURL (fastest and most reliable for bundled assets in Capacitor/browser)
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
            base64ArtworkCache.set(url, dataUrl);
            if (typeof scholarOrIdOrUrl === 'string') {
              base64ArtworkCache.set(scholarOrIdOrUrl, dataUrl);
            }
            resolve(dataUrl);
          } else {
            fallbackCanvas(resolve);
          }
        };
        reader.onerror = () => fallbackCanvas(resolve);
        reader.readAsDataURL(blob);
      })
      .catch(() => fallbackCanvas(resolve));

    // 2. Fallback to Image + Canvas
    function fallbackCanvas(done) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 256, 256);
            const dataUrl = canvas.toDataURL('image/png');
            base64ArtworkCache.set(url, dataUrl);
            done(dataUrl);
          } catch (err) {
            console.warn('Canvas conversion failed for scholar photo:', err);
            done(url);
          }
        };
        img.onerror = () => done(url);
        img.src = url;
      } catch (e) {
        done(url);
      }
    }
  });
}

// Pre-warm artworks on app load
export function preloadScholarArtworks() {
  Object.keys(scholarImagesMap).forEach(key => {
    getScholarPhotoBase64(key).catch(() => {});
  });
}

// Auto-trigger preload in browser/Capacitor environment
if (typeof window !== 'undefined') {
  setTimeout(() => preloadScholarArtworks(), 100);
}

export default scholarImagesMap;
