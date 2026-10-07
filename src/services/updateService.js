import { Capacitor } from '@capacitor/core';
import { DEFAULT_UPDATE_NOTES_TEXT } from '../data/changelogs';

/**
 * updateService.js — In-App APK Download & Install
 * 
 * Downloads APK files with progress tracking using native Capacitor Filesystem streaming,
 * saves to device cache, and triggers the Android package installer via
 * @capacitor-community/file-opener.
 * Also manages "What's New" changelog display after updates.
 */

export const DEFAULT_APK_URL = 'https://tarjumaapp.vercel.app/Tarjuma.apk';

const STORAGE_KEYS = {
  LAST_SEEN_VERSION: 'tarjuma_last_seen_version',
  PENDING_UPDATE_NOTES: 'tarjuma_pending_update_notes',
};

/**
 * Download an APK file with progress tracking.
 * Uses native Filesystem.downloadFile on Android to avoid memory limitations
 * with large APK packages.
 * 
 * @param {string} url - The APK download URL
 * @param {(percent: number) => void} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - The local file URI / path of the downloaded APK
 */
export async function downloadApk(url, onProgress) {
  const downloadUrl = (url && typeof url === 'string' && url.trim().length > 0)
    ? (url.endsWith('.apk') ? url.trim() : `${url.replace(/\/+$/, '')}/Tarjuma.apk`)
    : DEFAULT_APK_URL;

  // 1. Native Android Platform (Capacitor)
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');

    let progressListener = null;
    try {
      if (onProgress) {
        progressListener = await Filesystem.addListener('progress', (status) => {
          if (status && status.contentLength && status.contentLength > 0 && status.bytes != null) {
            const pct = Math.min(100, Math.round((status.bytes / status.contentLength) * 100));
            onProgress(pct);
          }
        });
      }

      // Download directly via native Android streaming into app Cache
      const result = await Filesystem.downloadFile({
        url: downloadUrl,
        path: 'tarjuma-update.apk',
        directory: Directory.Cache,
        progress: true,
      });

      if (onProgress) onProgress(100);
      return result.path || 'tarjuma-update.apk';
    } catch (err) {
      console.warn('Native downloadFile failed, attempting fallback download:', err);
      try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`, { cause: err });
        const blob = await response.blob();
        const base64Data = await blobToBase64(blob);
        const writeResult = await Filesystem.writeFile({
          path: 'tarjuma-update.apk',
          data: base64Data,
          directory: Directory.Cache,
        });
        if (onProgress) onProgress(100);
        return writeResult.uri;
      } catch (fallbackErr) {
        console.error('All in-app download attempts failed:', fallbackErr);
        window.open(downloadUrl, '_system');
        throw new Error(`Download failed. Opening in browser: ${err.message || fallbackErr.message}`, { cause: fallbackErr });
      }
    } finally {
      if (progressListener && typeof progressListener.remove === 'function') {
        try {
          await progressListener.remove();
        } catch {
          // Ignore listener removal error
        }
      }
    }
  }

  // 2. Web Browser Fallback
  if (onProgress) onProgress(50);
  window.open(downloadUrl, '_blank');
  if (onProgress) onProgress(100);
  return downloadUrl;
}

/**
 * Install a downloaded APK file by opening it with the Android package installer.
 * @param {string} fileUri - The local file URI or path from downloadApk()
 * @param {string} fallbackUrl - Web download URL if native installer cannot launch
 */
export async function installApk(fileUri, fallbackUrl = DEFAULT_APK_URL) {
  const safeFallbackUrl = fallbackUrl || DEFAULT_APK_URL;

  if (Capacitor.isNativePlatform()) {
    try {
      const { FileOpener } = await import('@capacitor-community/file-opener');
      await FileOpener.open({
        filePath: fileUri,
        contentType: 'application/vnd.android.package-archive',
        openWithDefault: true,
      });
    } catch (err) {
      console.error('Failed to open APK installer via FileOpener:', err);
      window.open(safeFallbackUrl, '_system');
      throw new Error(`Could not open package installer automatically. Opening in browser: ${err.message}`, { cause: err });
    }
  } else {
    window.open(safeFallbackUrl, '_blank');
  }
}

/**
 * Store pending update notes so we can show "What's New" after the update completes.
 * Call this BEFORE the user starts the download/install.
 * @param {string} version - The version being updated to
 * @param {string} notes - The changelog/release notes
 */
export function storePendingUpdateNotes(version, notes) {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_UPDATE_NOTES, JSON.stringify({
      version,
      notes,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('Failed to store pending update notes:', e);
  }
}

/**
 * Check if we should show a "What's New" modal after an app update.
 * Returns the changelog notes if we just updated, or null if not.
 * @param {string} currentVersion - The current running app version
 * @returns {{ version: string, notes: string } | null}
 */
export function checkWhatsNew(currentVersion) {
  try {
    const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION);
    const pendingRaw = localStorage.getItem(STORAGE_KEYS.PENDING_UPDATE_NOTES);

    // If we've already shown What's New for this version, skip
    if (lastSeen === currentVersion) return null;

    // Check if we have stored notes from a recent update
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw);
        if (pending.version === currentVersion && pending.notes) {
          return { version: pending.version, notes: pending.notes };
        }
      } catch (e) {
        console.warn('Failed to parse pending update notes:', e);
      }
    }

    // Version changed or first time on this version → show What's New with default release notes
    return { version: currentVersion, notes: DEFAULT_UPDATE_NOTES_TEXT };
  } catch (e) {
    console.warn('Failed to check What\'s New:', e);
    return null;
  }
}

/**
 * Dismiss the "What's New" modal and mark the current version as seen.
 * @param {string} currentVersion
 */
export function dismissWhatsNew(currentVersion) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, currentVersion);
    localStorage.removeItem(STORAGE_KEYS.PENDING_UPDATE_NOTES);
  } catch (e) {
    console.warn('Failed to dismiss What\'s New:', e);
  }
}

/**
 * Parse update notes string into an array of individual bullet points.
 * Handles various formats: newline-separated, bullet points (•, -, *), numbered lists.
 * @param {string} notes - Raw notes text
 * @returns {string[]} - Array of individual change lines
 */
export function parseUpdateNotes(notes) {
  if (!notes || typeof notes !== 'string') return [];

  return notes
    .split(/\n/)
    .map(line => line.trim())
    .map(line => line.replace(/^[-*•▸▹→➡–]\s*/, ''))  // Strip bullet chars
    .map(line => line.replace(/^\d+[.)]\s*/, ''))       // Strip numbered list
    .filter(line => line.length > 0);
}

// ── Internal Helpers ──

/**
 * Convert a Blob to a base64 string (without the data:... prefix).
 * Uses FileReader for compatibility with large files.
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        // Remove the "data:application/octet-stream;base64," prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('FileReader returned null'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
