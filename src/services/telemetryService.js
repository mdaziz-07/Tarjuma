import { getAggregatedTelemetry, updateTelemetryAggregates } from './adminService';

// Anonymous telemetry tracker
let sessionStartTime = Date.now();
let hasInitializedSession = false;

export const recordAppOpenTelemetry = async () => {
  if (hasInitializedSession) return;
  hasInitializedSession = true;
  sessionStartTime = Date.now();

  try {
    const data = await getAggregatedTelemetry();
    if (!data) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastActiveDate = localStorage.getItem('tarjuma_last_telemetry_date');

    let updatedDau = data.dau || 0;
    if (lastActiveDate !== todayStr) {
      updatedDau += 1;
      localStorage.setItem('tarjuma_last_telemetry_date', todayStr);
    }

    const updated = {
      ...data,
      dau: updatedDau,
      totalSessions: (data.totalSessions || 0) + 1
    };

    // Update in background — errors are silently ignored in production
    updateTelemetryAggregates(updated).catch(() => {});
  } catch (err) {
    // SECURITY: Silent fail in production — no error details leaked
    if (import.meta.env.DEV) console.warn('Telemetry log skipped:', err);
  }
};

export const recordSurahPlayTelemetry = async (surahId) => {
  try {
    const data = await getAggregatedTelemetry();
    if (!data || !data.topSurahs) return;

    const surahsList = [...data.topSurahs];
    const targetIdx = surahsList.findIndex(s => s.id === Number(surahId));

    if (targetIdx >= 0) {
      surahsList[targetIdx] = {
        ...surahsList[targetIdx],
        plays: (surahsList[targetIdx].plays || 0) + 1
      };
    } else {
      surahsList.push({
        id: Number(surahId),
        name: `Surah ${surahId}`,
        plays: 1
      });
    }

    // Sort descending
    surahsList.sort((a, b) => (b.plays || 0) - (a.plays || 0));

    const updated = {
      ...data,
      topSurahs: surahsList.slice(0, 15)
    };

    updateTelemetryAggregates(updated).catch(() => {});
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Playback telemetry skipped:', err);
  }
};

export const recordScholarSelectTelemetry = async (scholarId) => {
  try {
    const data = await getAggregatedTelemetry();
    if (!data || !data.topScholars) return;

    const scholarsList = [...data.topScholars];
    const idx = scholarsList.findIndex(s => s.id === scholarId);
    if (idx >= 0) {
      scholarsList[idx] = {
        ...scholarsList[idx],
        share: (scholarsList[idx].share || 0) + 1
      };
    }

    const updated = {
      ...data,
      topScholars: scholarsList
    };

    updateTelemetryAggregates(updated).catch(() => {});
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Scholar telemetry skipped:', err);
  }
};
