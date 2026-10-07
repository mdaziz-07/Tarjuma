/**
 * Smart Wi-Fi Prefetching Service
 * Automatically pre-downloads the next 2-3 chapters or Paras in the current listening queue
 * whenever connected to an unmetered Wi-Fi network.
 */

import usePlayerStore from '../stores/playerStore';
import usePreferencesStore from '../stores/preferencesStore';
import useDownloadsStore from '../stores/downloadsStore';

let isPrefetching = false;

/**
 * Checks if the device is currently on an unmetered, Wi-Fi or fast connection
 */
export function isUnmeteredWifiConnection() {
  if (typeof navigator === 'undefined' || !navigator.onLine) {
    return false;
  }

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    // If user has data saver on, do not prefetch
    if (conn.saveData) return false;

    // If explicit type is known, ensure it is wifi or ethernet
    if (conn.type && conn.type !== 'wifi' && conn.type !== 'ethernet') {
      return false;
    }

    // Avoid slow networks
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
      return false;
    }
  }

  return true;
}

/**
 * Trigger background prefetch for the next 2-3 items in the listening queue
 */
export async function triggerSmartWifiPrefetch() {
  const { smartWifiPrefetchEnabled } = usePreferencesStore.getState();
  if (!smartWifiPrefetchEnabled) return;

  if (!isUnmeteredWifiConnection()) return;
  if (isPrefetching) return;

  isPrefetching = true;
  try {
    const player = usePlayerStore.getState();
    const downloads = useDownloadsStore.getState();
    const { currentSurahId, currentJuzId, currentMode, currentScholarId, activeQueue } = player;

    const targets = [];

    if (activeQueue && Array.isArray(activeQueue) && activeQueue.length > 0) {
      const isJuzMode = currentMode === 2 || currentMode === 3;
      const currentId = isJuzMode ? currentJuzId : currentSurahId;
      const curIdx = activeQueue.findIndex(item => item.id === currentId && !!item.isPara === isJuzMode);
      const startIdx = curIdx >= 0 ? curIdx + 1 : 0;
      const nextItems = activeQueue.slice(startIdx, startIdx + 3);

      for (const itm of nextItems) {
        targets.push({
          itemType: itm.isPara ? 'juz' : 'surah',
          itemId: itm.id,
          mode: currentMode,
          scholarId: currentScholarId
        });
      }
    } else if (currentMode === 2 || currentMode === 3) {
      for (let offset = 1; offset <= 3; offset++) {
        const nextJuz = currentJuzId + offset;
        if (nextJuz <= 30) {
          targets.push({
            itemType: 'juz',
            itemId: nextJuz,
            mode: currentMode,
            scholarId: currentScholarId
          });
        }
      }
    } else {
      for (let offset = 1; offset <= 3; offset++) {
        const nextSurah = currentSurahId + offset;
        if (nextSurah <= 114) {
          targets.push({
            itemType: 'surah',
            itemId: nextSurah,
            mode: currentMode,
            scholarId: currentScholarId
          });
        }
      }
    }

    // Sequentially pre-download each track that is not yet downloaded or downloading
    for (const t of targets) {
      const alreadyDownloaded = downloads.isDownloaded(t.itemType, t.itemId, t.mode, t.scholarId);
      const alreadyDownloading = downloads.isDownloading(t.itemType, t.itemId, t.mode, t.scholarId);

      if (!alreadyDownloaded && !alreadyDownloading) {
        try {
          await downloads.downloadTrack(t.itemType, t.itemId, t.mode, t.scholarId);
          // 800ms cooldown between downloads to avoid saturation
          await new Promise(r => setTimeout(r, 800));
        } catch (e) {
          console.warn(`Smart Wi-Fi prefetch skipped for ${t.itemType} ${t.itemId}:`, e);
        }
      }
    }
  } catch (err) {
    console.warn('Smart Wi-Fi prefetching error:', err);
  } finally {
    isPrefetching = false;
  }
}
