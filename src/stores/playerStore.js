import { create } from 'zustand';
import scholars from '../data/scholars.json';
import surahs from '../data/surahs.json';
import { supabase } from '../utils/supabaseClient';
import usePreferencesStore from './preferencesStore';
import { recordSurahPlayTelemetry, recordScholarSelectTelemetry } from '../services/telemetryService';

const getInitialPlaybackState = () => {
  const chosenScholar = localStorage.getItem('tarjuma_chosen_scholar');
  try {
    const memory = JSON.parse(localStorage.getItem('tarjuma_mode_memory') || '{}');
    const modes = Object.keys(memory).map(Number);
    if (modes.length > 0) {
      // Find mode entry with largest timestamp or latest saved
      const lastSavedMode = modes[modes.length - 1];
      const mem = memory[lastSavedMode];
      if (mem) {
        const isJuz = lastSavedMode === 2 || lastSavedMode === 3;
        return {
          currentMode: lastSavedMode,
          currentScholarId: chosenScholar || mem.scholarId || 'scholar-1',
          currentSurahId: !isJuz ? (mem.contentId || 1) : 1,
          currentJuzId: isJuz ? (mem.contentId || 1) : 1,
          currentAyah: mem.ayah || 1,
          currentTime: mem.currentTime || 0,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse initial playback memory:', e);
  }
  return {
    currentMode: 1,
    currentScholarId: chosenScholar || 'scholar-1',
    currentSurahId: 1,
    currentJuzId: 1,
    currentAyah: 1,
    currentTime: 0,
  };
};

const initialState = getInitialPlaybackState();

const usePlayerStore = create((set, get) => ({
  // User ID
  userId: null,

  // Current playback state
  isPlaying: false,
  currentMode: initialState.currentMode,
  currentSurahId: initialState.currentSurahId,
  currentJuzId: initialState.currentJuzId,
  currentAyah: initialState.currentAyah,
  currentScholarId: initialState.currentScholarId,
  isLoadingAudio: false,
  isHydrated: true,
  
  // Progress
  currentTime: initialState.currentTime,
  duration: 0,        // total duration of current audio track
  totalElapsed: 0,    // (legacy) total elapsed for progress
  totalDuration: 0,   // (legacy) total duration
  
  // Playback settings
  playbackSpeed: 1.0,
  isShuffled: false,
  repeatMode: 'none', // 'none', 'one', 'all'
  
  // Queue
  queue: [],
  queueIndex: 0,
  
  // Active queue from mix/playlist (empty = use full list)
  activeQueue: [],        // Array of { id, isPara, title, badge }
  activeQueueSource: '', // Name/title of the mix or playlist
  
  // Volume
  recitationVolume: 100,
  backgroundVolume: 100,
  isMuted: false,
  
  // Background sound
  selectedBackgroundSound: 'none',
  
  // Sleep timer
  sleepTimerMinutes: null,
  sleepTimerEnd: null,
  
  // Seek trigger
  seekTime: null,
  
  // UI state
  showArabicText: true,
  showTranslation: false,
  hideMiniPlayer: false,
  setHideMiniPlayer: (hide) => set({ hideMiniPlayer: !!hide }),
  
  // Timings
  ayahTimings: [],
  
  // Dynamic Text loading
  surahData: null,
  isLoadingText: false,
  
  // Ayah display data (fallback mock)
  currentAyahData: {
    number: 1,
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    translation: 'अल्लाह के नाम से जो बड़ा मेहरबान निहायत रहम वाला है',
    surahId: 1,
  },
  previousAyahData: null,
  nextAyahData: {
    number: 2,
    arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    translation: 'सब तारीफ़ अल्लाह के लिए है जो तमाम जहानों का पालनहार है',
    surahId: 1,
  },

  // Notification playback backup state for returning after scheduled Surah plays
  notificationPreviousPlaybackBackup: null,
  savePlaybackBackupForNotification: () => {
    const state = get();
    if (!state.notificationPreviousPlaybackBackup) {
      set({
        notificationPreviousPlaybackBackup: {
          currentMode: state.currentMode,
          currentScholarId: state.currentScholarId,
          currentSurahId: state.currentSurahId,
          currentJuzId: state.currentJuzId,
          currentAyah: state.currentAyah,
          currentTime: state.currentTime,
          isPlaying: state.isPlaying,
          activeQueue: state.activeQueue || [],
          activeQueueSource: state.activeQueueSource || ''
        }
      });
    }
  },
  restorePlaybackFromBackup: () => {
    const backup = get().notificationPreviousPlaybackBackup;
    if (!backup) return;
    const isJuzMode = backup.currentMode === 2 || backup.currentMode === 3;
    set({
      currentMode: backup.currentMode,
      currentScholarId: backup.currentScholarId,
      currentSurahId: backup.currentSurahId,
      currentJuzId: backup.currentJuzId,
      currentAyah: backup.currentAyah,
      currentTime: backup.currentTime,
      seekTime: backup.currentTime,
      isPlaying: backup.isPlaying,
      activeQueue: backup.activeQueue,
      activeQueueSource: backup.activeQueueSource,
      notificationPreviousPlaybackBackup: null
    });
    get().fetchSurahText(backup.currentSurahId);
    if (!isJuzMode) {
      get().fetchSurahTimings(backup.currentSurahId, backup.currentScholarId);
    }
  },
  clearPlaybackBackup: () => {
    set({ notificationPreviousPlaybackBackup: null });
  },
  playSurahFromNotification: (surahId) => {
    get().savePlaybackBackupForNotification();
    get().setMode(1);
    get().setCurrentSurah(Number(surahId));
    get().play();
  },
  playJuzFromNotification: (juzId) => {
    get().savePlaybackBackupForNotification();
    get().setMode(2);
    get().setCurrentJuz(Number(juzId));
    get().play();
  },

  // Actions
  play: (options = {}) => {
    const { skipRewind = false } = options;
    const { isPlaying, currentTime } = get();
    // Resume Rewind: Automatically rewind audio by 3 seconds when resuming after a pause or call
    if (!isPlaying && !skipRewind && currentTime > 1) {
      const rewoundTime = Math.max(0, currentTime - 3);
      set({
        currentTime: rewoundTime,
        seekTime: rewoundTime,
        isPlaying: true
      });
    } else {
      set({ isPlaying: true });
    }
  },
  pause: () => set({ isPlaying: false }),
  togglePlay: () => {
    const { isPlaying, currentTime } = get();
    if (!isPlaying) {
      // Resume Rewind: Automatically rewind audio by 3 seconds when resuming
      if (currentTime > 1) {
        const rewoundTime = Math.max(0, currentTime - 3);
        set({
          currentTime: rewoundTime,
          seekTime: rewoundTime,
          isPlaying: true
        });
      } else {
        set({ isPlaying: true });
      }
    } else {
      set({ isPlaying: false });
    }
  },
  setIsLoadingAudio: (isLoading) => set({ isLoadingAudio: isLoading }),
  
  setCurrentSurah: (surahId) => {
    const surah = surahs.find(s => s.id === surahId);
    const juzId = surah ? surah.juz_start : 1;
    
    // Check if there is saved progress for this surahId
    const surahProgress = JSON.parse(localStorage.getItem('tarjuma_surah_progress') || '{}');
    const saved = surahProgress[surahId];
    
    // Preserve the user's active/chosen scholar
    const activeScholar = get().currentScholarId || localStorage.getItem('tarjuma_chosen_scholar') || 'scholar-1';
    
    if (saved) {
      set({ 
        currentSurahId: surahId,
        currentJuzId: juzId,
        currentAyah: saved.ayah || 1, 
        currentTime: saved.currentTime || 0,
        seekTime: saved.currentTime || 0,
        duration: 0,
        currentScholarId: activeScholar
      });
    } else {
      set({ 
        currentSurahId: surahId,
        currentJuzId: juzId,
        currentAyah: 1, 
        currentTime: 0,
        seekTime: 0,
        duration: 0,
        currentScholarId: activeScholar
      });
    }
    get().fetchSurahText(surahId);
    get().fetchSurahTimings(surahId, activeScholar);
    recordSurahPlayTelemetry(surahId);
  },
  
  setCurrentJuz: (juzId) => {
    const firstSurah = surahs.find(s => s.juz_start === juzId) || surahs.find(s => s.juz_start <= juzId && s.juz_end >= juzId) || surahs[0];
    
    // Check if there is saved progress for this juzId
    const juzProgress = JSON.parse(localStorage.getItem('tarjuma_juz_progress') || '{}');
    const saved = juzProgress[juzId];
    
    if (saved) {
      set({
        currentJuzId: juzId,
        currentSurahId: firstSurah.id,
        currentAyah: saved.ayah || 1,
        currentTime: saved.currentTime || 0,
        seekTime: saved.currentTime || 0,
        duration: 0
      });
    } else {
      set({
        currentJuzId: juzId,
        currentSurahId: firstSurah.id,
        currentAyah: 1,
        currentTime: 0,
        seekTime: 0,
        duration: 0
      });
    }
    get().fetchSurahText(firstSurah.id);
    recordSurahPlayTelemetry(firstSurah.id);
  },
  
  setCurrentAyah: (ayahNum) => {
    const state = get();
    const timings = state.ayahTimings;
    let targetTime = 0;
    
    if (timings && timings.length > 0) {
      const match = timings.find(t => t.number === ayahNum);
      if (match) {
        targetTime = match.from;
      }
    } else {
      const surah = surahs.find(s => s.id === state.currentSurahId);
      if (surah && state.duration > 0) {
        targetTime = (ayahNum - 1) * (state.duration / surah.ayah_count);
      }
    }
    
    set({ 
      currentAyah: ayahNum, 
      currentTime: targetTime,
      seekTime: targetTime
    });
    get().updateAyahData();
  },

  setCurrentAyahOnly: (ayahNum) => {
    set({ currentAyah: ayahNum });
    get().updateAyahData();
  },
  
  setCurrentScholar: (scholarId) => {
    set({ currentScholarId: scholarId });
    try {
      localStorage.setItem('tarjuma_chosen_scholar', scholarId);
      const memory = JSON.parse(localStorage.getItem('tarjuma_mode_memory') || '{}');
      if (memory[1]) {
        memory[1].scholarId = scholarId;
      }
      localStorage.setItem('tarjuma_mode_memory', JSON.stringify(memory));
    } catch (e) {
      console.warn('Failed to persist scholar selection:', e);
    }
    get().fetchSurahTimings(get().currentSurahId, scholarId);
    recordScholarSelectTelemetry(scholarId);
  },
  
  setMode: (mode) => {
    const oldMode = get().currentMode;
    const isJuzMode = oldMode === 2 || oldMode === 3;
    const memory = JSON.parse(localStorage.getItem('tarjuma_mode_memory') || '{}');
    
    // Save previous state for oldMode
    memory[oldMode] = {
      contentId: isJuzMode ? get().currentJuzId : get().currentSurahId,
      ayah: get().currentAyah,
      currentTime: get().currentTime,
      scholarId: get().currentScholarId
    };
    localStorage.setItem('tarjuma_mode_memory', JSON.stringify(memory));

    // Load state for the new mode
    const newMemory = memory[mode];
    const chosenScholar = localStorage.getItem('tarjuma_chosen_scholar') || get().currentScholarId;
    if (newMemory) {
      const isNewJuzMode = mode === 2 || mode === 3;
      set({
        currentMode: mode,
        currentScholarId: mode === 1 ? chosenScholar : (newMemory.scholarId || chosenScholar),
        currentTime: newMemory.currentTime || 0,
        currentAyah: newMemory.ayah || 1,
        seekTime: newMemory.currentTime || 0,
        duration: 0,
        ...(isNewJuzMode ? { currentJuzId: newMemory.contentId } : { currentSurahId: newMemory.contentId })
      });
      
      const contentId = newMemory.contentId;
      if (!isNewJuzMode) {
        get().fetchSurahText(contentId);
      } else {
        const firstSurah = surahs.find(s => s.juz_start === contentId) || surahs.find(s => s.juz_start <= contentId && s.juz_end >= contentId) || surahs[0];
        get().fetchSurahText(firstSurah.id);
      }
    } else {
      const isNewJuzMode = mode === 2 || mode === 3;
      set({
        currentMode: mode,
        currentTime: 0,
        currentAyah: 1,
        seekTime: 0,
        duration: 0,
        ...(isNewJuzMode ? { currentJuzId: 1 } : { currentSurahId: 1 })
      });
      get().fetchSurahText(1);
    }
    if (mode === 1) {
      set({ showTranslation: false });
    }
    get().updateAyahData();
  },
  
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  
  cycleSpeed: async () => {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const current = get().playbackSpeed;
    const idx = speeds.indexOf(current);
    const next = speeds[(idx + 1) % speeds.length];
    set({ playbackSpeed: next });
    
    const prefStore = usePreferencesStore.getState();
    if (prefStore.userId) prefStore.saveToSupabase();
  },
  
  nextAyah: () => {
    const state = get();
    // If in Juz mode (2 or 3): Skip next goes to next Juz
    if (state.currentMode === 2 || state.currentMode === 3) {
      get().nextJuz();
      return;
    }
    // Otherwise, Surah-wise: Skip next goes to next Surah
    get().nextSurah();
  },
  
  previousAyah: () => {
    const state = get();
    // If in Juz mode (2 or 3): Skip prev goes to previous Juz
    if (state.currentMode === 2 || state.currentMode === 3) {
      get().previousJuz();
      return;
    }
    // Otherwise, Surah-wise: Skip prev goes to previous Surah
    get().previousSurah();
  },
  
  nextSurah: () => {
    const nextId = Math.min(114, get().currentSurahId + 1);
    get().setCurrentSurah(nextId);
  },
  
  previousSurah: () => {
    const prevId = Math.max(1, get().currentSurahId - 1);
    get().setCurrentSurah(prevId);
  },
  
  nextJuz: () => {
    const nextJuzId = Math.min(30, get().currentJuzId + 1);
    get().setCurrentJuz(nextJuzId);
  },
  
  previousJuz: () => {
    const prevJuzId = Math.max(1, get().currentJuzId - 1);
    get().setCurrentJuz(prevJuzId);
  },
  
  setRecitationVolume: async (vol) => {
    set({ recitationVolume: vol });
    const prefStore = usePreferencesStore.getState();
    if (prefStore.userId) prefStore.saveToSupabase();
  },
  setBackgroundVolume: async (vol) => {
    set({ backgroundVolume: vol });
    const prefStore = usePreferencesStore.getState();
    if (prefStore.userId) prefStore.saveToSupabase();
  },
  toggleMute: () => set(state => ({ isMuted: !state.isMuted })),
  
  setBackgroundSound: (soundId) => set({ selectedBackgroundSound: soundId }),
  
  setActiveQueue: (items, sourceName = '') => set({ activeQueue: items || [], activeQueueSource: sourceName }),
  clearActiveQueue: () => set({ activeQueue: [], activeQueueSource: '' }),
  
  toggleShuffle: () => set(state => ({ isShuffled: !state.isShuffled })),
  
  cycleRepeat: () => {
    const modes = ['none', 'all', 'one'];
    const current = get().repeatMode;
    const idx = modes.indexOf(current);
    set({ repeatMode: modes[(idx + 1) % modes.length] });
  },
  
  setSleepTimer: (minutes) => {
    if (minutes === null) {
      set({ sleepTimerMinutes: null, sleepTimerEnd: null });
    } else if (minutes === 'endOfTrack') {
      set({ sleepTimerMinutes: 'endOfTrack', sleepTimerEnd: null });
    } else {
      set({ 
        sleepTimerMinutes: minutes,
        sleepTimerEnd: Date.now() + minutes * 60 * 1000 
      });
    }
  },
  
  toggleArabicText: () => set(state => ({ showArabicText: !state.showArabicText })),
  toggleTranslation: () => set(state => ({ showTranslation: !state.showTranslation })),
  
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (dur) => set({ duration: dur }),
  setTotalElapsed: (t) => set({ totalElapsed: t }),
  setTotalDuration: (d) => set({ totalDuration: d }),
  
  // API Fetch for Quran Arabic & Hindi Translation text
  fetchSurahText: async (surahId) => {
    const state = get();
    if (state.surahData && state.surahData[0].number === surahId) {
      state.updateAyahData();
      return;
    }
    
    set({ isLoadingText: true });
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/editions/quran-simple-clean,ur.jalandhry`);
      const json = await res.json();
      if (json.code === 200 && json.data && json.data.length === 2) {
        set({ surahData: json.data, isLoadingText: false });
        get().updateAyahData();
        get().fetchSurahTimings(surahId, get().currentScholarId);
      } else {
        set({ isLoadingText: false });
      }
    } catch (err) {
      console.error("Failed to fetch surah text:", err);
      set({ isLoadingText: false });
      get().updateAyahData();
    }
  },
  
  updateAyahData: () => {
    const state = get();
    const { surahData, currentAyah, currentSurahId } = state;
    
    if (!surahData || surahData[0].number !== currentSurahId) {
      const currentSurah = surahs.find(s => s.id === currentSurahId);
      const name = currentSurah ? currentSurah.name_transliteration : 'Surah';
      
      set({
        currentAyahData: {
          number: currentAyah,
          arabic: `(Surah ${currentSurahId}:${currentAyah} - Recitation Mode)`,
          translation: `Listen to Surah ${name} Ayah ${currentAyah} with translation.`,
          surahId: currentSurahId,
        },
        previousAyahData: currentAyah > 1 ? {
          number: currentAyah - 1,
          arabic: `(Surah ${currentSurahId}:${currentAyah - 1})`,
          translation: `Previous Ayah ${currentAyah - 1}`,
          surahId: currentSurahId,
        } : null,
        nextAyahData: {
          number: currentAyah + 1,
          arabic: `(Surah ${currentSurahId}:${currentAyah + 1})`,
          translation: `Next Ayah ${currentAyah + 1}`,
          surahId: currentSurahId,
        }
      });
      return;
    }
    
    const ayahsArabic = surahData[0].ayahs;
    const ayahsHindi = surahData[1].ayahs;
    const idx = currentAyah - 1;
    
    if (idx >= 0 && idx < ayahsArabic.length) {
      const current = {
        number: currentAyah,
        arabic: ayahsArabic[idx].text,
        translation: ayahsHindi[idx].text,
        surahId: currentSurahId,
      };
      
      const prev = idx > 0 ? {
        number: currentAyah - 1,
        arabic: ayahsArabic[idx - 1].text,
        translation: ayahsHindi[idx - 1].text,
        surahId: currentSurahId,
      } : null;
      
      const next = idx < ayahsArabic.length - 1 ? {
        number: currentAyah + 1,
        arabic: ayahsArabic[idx + 1].text,
        translation: ayahsHindi[idx + 1].text,
        surahId: currentSurahId,
      } : null;
      
      set({
        currentAyahData: current,
        previousAyahData: prev,
        nextAyahData: next,
      });
    }
  },
  
  seek: (time) => set({ seekTime: time, currentTime: time }),
  clearSeek: () => set({ seekTime: null }),
  
  getCurrentScholar: () => {
    const state = get();
    return scholars.find(s => s.id === state.currentScholarId) || scholars[0];
  },
  
  fetchSurahTimings: async (surahId, scholarId) => {
    const SCHOLAR_QDC_MAP = {
      'scholar-1': 97, // Yasser Ad Dussary
      'scholar-2': 7,  // Mishari Rashid al-`Afasy
      'scholar-3': 3,  // Abdur-Rahman as-Sudais
      'scholar-7': 10, // Saud ash-Shuraim
      'scholar-8': 4,  // Abu Bakr al-Shatri
      'scholar-9': 2,  // AbdulBaset AbdulSamad
    };
    const reciterId = SCHOLAR_QDC_MAP[scholarId] || 97;
    try {
      const res = await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/${reciterId}/audio_files?chapter=${surahId}&segments=true`);
      const json = await res.json();
      if (json && json.audio_files && json.audio_files.length > 0) {
        const file = json.audio_files[0];
        if (file.verse_timings) {
          const timings = file.verse_timings.map(vt => {
            const ayahNum = parseInt(vt.verse_key.split(':')[1]);
            return {
              number: ayahNum,
              from: vt.timestamp_from / 1000,
              to: vt.timestamp_to / 1000
            };
          });
          set({ ayahTimings: timings });
          return;
        }
      }
      set({ ayahTimings: [] });
    } catch (err) {
      console.error("Failed to fetch surah timings:", err);
      set({ ayahTimings: [] });
    }
  },

  setUserId: (id) => set({ userId: id }),

  hydrateFromSupabase: async (userId) => {
    set({ userId });
    try {
      const { data, error } = await supabase
        .from('user_playback_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching progress from Supabase:', error);
        set({ isHydrated: true });
        return;
      }

      if (data && data.length > 0) {
        // Build local memory map from Supabase records
        const memory = JSON.parse(localStorage.getItem('tarjuma_mode_memory') || '{}');
        const surahProgress = JSON.parse(localStorage.getItem('tarjuma_surah_progress') || '{}');
        const juzProgress = JSON.parse(localStorage.getItem('tarjuma_juz_progress') || '{}');

        data.forEach(item => {
          memory[item.mode] = {
            contentId: item.content_id,
            ayah: item.last_ayah_index || 1,
            currentTime: item.playback_position_sec || 0,
            scholarId: item.scholar_id
          };
          if (item.content_type === 'surah') {
            surahProgress[item.content_id] = {
              ayah: item.last_ayah_index || 1,
              currentTime: item.playback_position_sec || 0,
              scholarId: item.scholar_id,
              mode: item.mode
            };
          } else if (item.content_type === 'juz') {
            juzProgress[item.content_id] = {
              ayah: item.last_ayah_index || 1,
              currentTime: item.playback_position_sec || 0,
              mode: item.mode
            };
          }
        });
        localStorage.setItem('tarjuma_mode_memory', JSON.stringify(memory));
        localStorage.setItem('tarjuma_surah_progress', JSON.stringify(surahProgress));
        localStorage.setItem('tarjuma_juz_progress', JSON.stringify(juzProgress));

        // Find the most recently updated record
        const sorted = [...data].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        const mostRecent = sorted[0];

        if (mostRecent) {
          const isJuzMode = mostRecent.mode === 2 || mostRecent.mode === 3;
          set({
            currentMode: mostRecent.mode,
            currentScholarId: mostRecent.scholar_id,
            currentTime: mostRecent.playback_position_sec || 0,
            currentAyah: mostRecent.last_ayah_index || 1,
            ...(isJuzMode ? { currentJuzId: mostRecent.content_id } : { currentSurahId: mostRecent.content_id })
          });
          
          if (!isJuzMode) {
            get().fetchSurahText(mostRecent.content_id);
          } else {
            const firstSurah = surahs.find(s => s.juz_start === mostRecent.content_id) || surahs.find(s => s.juz_start <= mostRecent.content_id && s.juz_end >= mostRecent.content_id) || surahs[0];
            get().fetchSurahText(firstSurah.id);
          }
        }
      }
      set({ isHydrated: true });
    } catch (err) {
      console.error('Failed to hydrate playback progress:', err);
      set({ isHydrated: true });
    }
  }
}));

export default usePlayerStore;
