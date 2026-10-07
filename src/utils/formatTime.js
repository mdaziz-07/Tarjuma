/**
 * Format seconds into human-readable time strings
 */

export function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMinutes(totalMinutes) {
  if (!totalMinutes || totalMinutes < 1) return '0 m';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} m`;
}

export function formatTimeRemaining(seconds) {
  if (!seconds || seconds <= 0) return '-0:00';
  return '-' + formatTime(seconds);
}

export function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  return formatMinutes(mins);
}
