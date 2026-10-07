import dailyTadabburList from '../data/dailyTadabbur.json';

/**
 * Returns the deterministic verse of the day based on the current calendar date.
 * Guarantees that every morning brings a fresh verse, and all users see the same
 * consistent verse throughout that day.
 */
export function getTodayTadabbur() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  // Stable date-hashed index
  const index = Math.abs(dayOfYear + now.getFullYear() * 17) % dailyTadabburList.length;
  return dailyTadabburList[index] || dailyTadabburList[0];
}

/**
 * Formats today's date for display (e.g., "Wednesday, 9 Sep")
 */
export function getFormattedTodayDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Builds clean, formatted copyable text for the Tadabbur reflection.
 */
export function formatTadabburShareText(item, lang = 'urdu') {
  const translation = lang === 'hindi' ? item.translationHindi : item.translationUrdu;
  const langLabel = lang === 'hindi' ? 'Hindi Translation' : 'Urdu Translation';

  return `✨ *Daily Tadabbur · Audio Reflection*\n` +
    `📖 *Surah ${item.surahName} (${item.ayahNumber})*\n` +
    `🏷️ *Theme:* ${item.theme}\n\n` +
    `"${item.arabic}"\n\n` +
    `🔹 *${langLabel}:*\n${translation}\n\n` +
    `💡 *Reflection:* ${item.reflection}\n\n` +
    `🎧 Listen with high-quality recitation on Tarjuma App:\n` +
    `https://tarjumaapp.vercel.app`;
}

/**
 * Cross-platform image sharing handler:
 * - Uses Capacitor Share / Filesystem on mobile apps.
 * - Uses Web Share API (navigator.share with File Blob) in modern mobile browsers.
 * - Falls back to direct download and clipboard copy.
 */
export async function shareTadabburImageFile({ blob, filename = 'daily-tadabbur.png', title, text }) {
  if (!blob) return false;

  const file = new File([blob], filename, { type: 'image/png' });

  // 1. Try Capacitor Native Share if running in native app
  try {
    const { Share } = await import('@capacitor/share');
    const { Filesystem, Directory } = await import('@capacitor/filesystem');

    // Convert blob to base64, stripping the data:image/png;base64, prefix
    const reader = new FileReader();
    const base64Promise = new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result;
        // Filesystem.writeFile expects raw base64 without the data URI prefix
        const base64Only = result.split(',')[1] || result;
        resolve(base64Only);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const base64Data = await base64Promise;

    // Write to Cache directory so the file persists during share intent
    const savedFile = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache
    });

    // Get the native content:// URI for the cached file
    const fileUri = savedFile.uri;

    // In Capacitor Share on Android, `files: [fileUri]` invokes FileProvider to attach
    // the image to Intent.EXTRA_STREAM with MIME type image/png.
    // If text is provided, it is set as Intent.EXTRA_TEXT (e.g. caption in WhatsApp).
    await Share.share({
      title: title || 'Daily Tadabbur',
      text: text || undefined,
      files: [fileUri],
      dialogTitle: 'Share Daily Tadabbur'
    });
    return true;
  } catch (nativeErr) {
    console.warn('Capacitor native share unavailable or failed:', nativeErr?.message);
    // Fall back to Web Share API
  }

  // 2. Web Share API with File support
  if (navigator.canShare) {
    try {
      if (text && navigator.canShare({ files: [file], text })) {
        await navigator.share({ files: [file], text, title: title || 'Daily Tadabbur' });
        return true;
      } else if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title || 'Daily Tadabbur' });
        return true;
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') return true; // User cancelled
      console.warn('Web file share failed:', shareErr);
    }
  }

  // 3. Copy image directly to clipboard if supported (for desktop & WhatsApp Web paste)
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    }
  } catch (clipErr) {
    console.warn('Clipboard image copy fallback failed:', clipErr);
  }

  // 4. Fallback: return false so the caller can decide what to do (e.g. show a message)
  // We intentionally do NOT auto-download here — user must tap "Save Image" explicitly.
  return false;
}

/**
 * Trigger immediate browser download of the image blob
 */
export function downloadBlob(blob, filename = 'daily-tadabbur.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Direct WhatsApp text & link share fallback
 */
export function shareToWhatsApp(text) {
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}
