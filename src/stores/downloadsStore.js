import { create } from 'zustand';
import surahs from '../data/surahs.json';
import scholars from '../data/scholars.json';
import paras from '../data/paras.json';
import playbackUrls from '../data/playbackUrls.json';

const DB_NAME = 'TarjumaOfflineDB';
const DB_VERSION = 1;
const STORE_AUDIO = 'offline_audio';
const STORE_TIMINGS = 'offline_timings';
const STORE_TEXT = 'offline_text';

// Helper to open IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_TIMINGS)) {
        db.createObjectStore(STORE_TIMINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_TEXT)) {
        db.createObjectStore(STORE_TEXT, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
};

// Helper: Reciter audio URL resolver
const getScholarAudioUrl = (scholarId, surahId) => {
  const surahStr = String(surahId).padStart(3, '0');
  if (scholarId === 'scholar-5' || scholarId === 'scholar-6') {
    return `https://server11.mp3quran.net/hazza/${surahStr}.mp3`;
  }
  const SCHOLAR_QURANICAUDIO_MAP = {
    'scholar-1': 'yasser_ad-dussary',
    'scholar-2': 'mishaari_raashid_al_3afaasee',
    'scholar-3': 'abdurrahmaan_as-sudays',
    'scholar-4': 'maher_256',
    'scholar-5': 'hazza_al_balushi',
    'scholar-6': 'hazza_al_balushi',
    'scholar-7': 'sa3ood_al-shuraym',
    'scholar-8': 'abu_bakr_ash-shaatree',
    'scholar-9': 'abdul_basit_murattal',
  };
  const folder = SCHOLAR_QURANICAUDIO_MAP[scholarId] || 'yasser_ad-dussary';
  return `https://download.quranicaudio.com/quran/${folder}/${surahStr}.mp3`;
};

// Key format: `${itemType}_${itemId}_m${mode}_s${scholarId}`
export const getDownloadKey = (itemType, itemId, mode, scholarId) => {
  return `${itemType}_${itemId}_m${mode}_s${scholarId}`;
};

const useDownloadsStore = create((set, get) => ({
  downloads: [],           // Array of download metadata items
  downloadProgress: {},    // { [key]: number (0 to 100) }
  downloadingKeys: new Set(),
  abortControllers: {},    // { [key]: AbortController }
  totalStorageBytes: 0,
  isInitialized: false,

  // Helper method for key lookup
  getDownloadKey: (itemType, itemId, mode, scholarId) => getDownloadKey(itemType, itemId, mode, scholarId),

  // Initialize and load saved downloads list from IndexedDB
  initDownloads: async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_AUDIO, 'readonly');
      const store = tx.objectStore(STORE_AUDIO);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        const metadataList = items.map(item => ({
          key: item.key,
          itemType: item.itemType,
          itemId: item.itemId,
          mode: item.mode,
          scholarId: item.scholarId,
          title: item.title,
          subtitle: item.subtitle,
          size: item.size || 0,
          downloadedAt: item.downloadedAt,
        }));
        const totalBytes = metadataList.reduce((acc, i) => acc + (i.size || 0), 0);
        set({ downloads: metadataList, totalStorageBytes: totalBytes, isInitialized: true });
      };
    } catch (err) {
      console.warn('Failed to init downloads DB:', err);
      set({ isInitialized: true });
    }
  },

  // Check if a specific track is downloaded
  isDownloaded: (itemType, itemId, mode, scholarId) => {
    const key = getDownloadKey(itemType, itemId, mode, scholarId);
    return get().downloads.some(d => d.key === key);
  },

  // Check if downloading right now
  isDownloading: (itemType, itemId, mode, scholarId) => {
    const key = getDownloadKey(itemType, itemId, mode, scholarId);
    return get().downloadingKeys.has(key);
  },

  // Download track (Surah or Para)
  downloadTrack: async (itemType, itemId, mode, scholarId) => {
    const key = getDownloadKey(itemType, itemId, mode, scholarId);
    if (get().isDownloaded(itemType, itemId, mode, scholarId)) {
      return;
    }
    if (get().downloadingKeys.has(key)) {
      return;
    }

    // Set downloading state + create abort controller
    const abortController = new AbortController();
    const newDownloading = new Set(get().downloadingKeys);
    newDownloading.add(key);
    set({
      downloadingKeys: newDownloading,
      downloadProgress: { ...get().downloadProgress, [key]: 0 },
      abortControllers: { ...get().abortControllers, [key]: abortController }
    });

    try {
      // 1. Resolve Audio URL
      let audioUrl = '';
      if (mode === 1) {
        audioUrl = getScholarAudioUrl(scholarId, itemId);
      } else if (mode === 2) {
        audioUrl = playbackUrls.mode2_juz_urls[String(itemId)] || `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`;
      } else if (mode === 3) {
        audioUrl = playbackUrls.mode3_juz_urls[String(itemId)] || `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3`;
      } else if (mode === 4) {
        audioUrl = playbackUrls.mode4_surah_urls[String(itemId)] || getScholarAudioUrl(scholarId, itemId);
      } else if (mode === 5) {
        audioUrl = playbackUrls.mode5_surah_urls[String(itemId)] || getScholarAudioUrl(scholarId, itemId);
      }

      if (!audioUrl) throw new Error('Audio URL could not be resolved');

      // 2. Fetch Audio Blob with progress
      const response = await fetch(audioUrl, { signal: abortController.signal });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      // If Content-Length header is omitted by CORS CDN, use realistic estimate based on content type
      const estimatedTotal = total > 0 ? total : (itemType === 'surah' ? 7 * 1024 * 1024 : 10 * 1024 * 1024);
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        
        const calcTotal = total > 0 ? total : Math.max(loaded + 512 * 1024, estimatedTotal);
        const pct = Math.min(99, Math.round((loaded / calcTotal) * 100));
        set(state => ({
          downloadProgress: { ...state.downloadProgress, [key]: pct }
        }));
      }

      const audioBlob = new Blob(chunks, { type: 'audio/mp3' });
      const size = audioBlob.size;

      // Title & Subtitle resolution
      let title = '';
      let subtitle = '';
      if (itemType === 'surah') {
        const s = surahs.find(item => item.id === itemId);
        title = s ? s.name_transliteration : `Surah ${itemId}`;
        const sc = scholars.find(item => item.id === scholarId);
        subtitle = sc ? sc.name_transliteration : '';
      } else {
        const p = paras.find(item => item.id === itemId);
        title = `Para ${itemId} · ${p ? p.name_transliteration : ''}`;
        subtitle = `Mode ${mode} Recitation`;
      }

      // Save audio blob into IndexedDB
      const db = await openDB();
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      const store = tx.objectStore(STORE_AUDIO);

      const record = {
        key,
        itemType,
        itemId,
        mode,
        scholarId,
        title,
        subtitle,
        size,
        downloadedAt: new Date().toISOString(),
        audioBlob,
      };

      await new Promise((res, rej) => {
        const req = store.put(record);
        req.onsuccess = res;
        req.onerror = rej;
      });

      // Also pre-fetch and store Surah text and timings if Surah
      if (itemType === 'surah') {
        try {
          const textRes = await fetch(`https://api.alquran.cloud/v1/surah/${itemId}/editions/quran-simple-clean,ur.jalandhry`);
          if (textRes.ok) {
            const textJson = await textRes.json();
            const txT = db.transaction(STORE_TEXT, 'readwrite');
            txT.objectStore(STORE_TEXT).put({ key: `surah_${itemId}`, data: textJson.data });
          }
        } catch (e) {
          console.warn('Offline text fetch failed:', e);
        }
      }

      // Update Zustand state
      const newDownloadingSet = new Set(get().downloadingKeys);
      newDownloadingSet.delete(key);
      const updatedAbortControllers = { ...get().abortControllers };
      delete updatedAbortControllers[key];

      const newDownloadItem = {
        key,
        itemType,
        itemId,
        mode,
        scholarId,
        title,
        subtitle,
        size,
        downloadedAt: new Date().toISOString(),
      };

      const updatedDownloads = [...get().downloads, newDownloadItem];
      const updatedTotalBytes = updatedDownloads.reduce((acc, i) => acc + (i.size || 0), 0);

      const updatedProgress = { ...get().downloadProgress };
      delete updatedProgress[key];

      set({
        downloads: updatedDownloads,
        downloadingKeys: newDownloadingSet,
        downloadProgress: updatedProgress,
        totalStorageBytes: updatedTotalBytes,
        abortControllers: updatedAbortControllers,
      });

      console.log(`Successfully downloaded offline track: ${key}`);
    } catch (err) {
      const newDownloadingSet = new Set(get().downloadingKeys);
      newDownloadingSet.delete(key);
      const updatedProgress = { ...get().downloadProgress };
      delete updatedProgress[key];
      const updatedAbortControllers = { ...get().abortControllers };
      delete updatedAbortControllers[key];
      set({ downloadingKeys: newDownloadingSet, downloadProgress: updatedProgress, abortControllers: updatedAbortControllers });
      if (err.name !== 'AbortError') {
        console.error(`Failed to download track ${key}:`, err);
        alert(`Download failed: ${err.message || 'Network error'}`);
      }
    }
  },

  // Cancel an in-progress download
  cancelDownload: (key) => {
    const { abortControllers, downloadingKeys, downloadProgress } = get();
    const controller = abortControllers[key];
    if (controller) {
      controller.abort();
    }
    const newDownloadingSet = new Set(downloadingKeys);
    newDownloadingSet.delete(key);
    const updatedProgress = { ...downloadProgress };
    delete updatedProgress[key];
    const updatedControllers = { ...abortControllers };
    delete updatedControllers[key];
    set({ downloadingKeys: newDownloadingSet, downloadProgress: updatedProgress, abortControllers: updatedControllers });
  },

  // Retrieve Blob Object URL for offline playback
  getOfflineAudioUrl: async (itemType, itemId, mode, scholarId) => {
    const key = getDownloadKey(itemType, itemId, mode, scholarId);
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_AUDIO, 'readonly');
      const store = tx.objectStore(STORE_AUDIO);
      return new Promise((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.audioBlob) {
            const objectUrl = URL.createObjectURL(req.result.audioBlob);
            resolve(objectUrl);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      console.warn('Failed to fetch offline audio blob:', err);
      return null;
    }
  },

  // Delete downloaded track
  deleteDownload: async (key) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      const store = tx.objectStore(STORE_AUDIO);
      await new Promise((res, rej) => {
        const req = store.delete(key);
        req.onsuccess = res;
        req.onerror = rej;
      });

      const updatedDownloads = get().downloads.filter(d => d.key !== key);
      const updatedTotalBytes = updatedDownloads.reduce((acc, i) => acc + (i.size || 0), 0);
      set({ downloads: updatedDownloads, totalStorageBytes: updatedTotalBytes });
    } catch (err) {
      console.error('Failed to delete download:', err);
    }
  }
}));

export default useDownloadsStore;
