import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@jofr/capacitor-media-session';
import usePlayerStore from '../stores/playerStore';
import usePreferencesStore from '../stores/preferencesStore';
import useInsightsStore from '../stores/insightsStore';
import useDownloadsStore from '../stores/downloadsStore';
import playbackUrls from '../data/playbackUrls.json';
import surahs from '../data/surahs.json';
import scholars from '../data/scholars.json';
import paras from '../data/paras.json';
import backgroundSounds from '../data/backgroundSounds.json';
import { getSoundUrl } from '../data/soundAssets';
import { getScholarPhotoUrl, getScholarPhotoBase64 } from '../data/scholarImages';
import { supabase } from '../utils/supabaseClient';
import { triggerSmartWifiPrefetch } from '../services/prefetchService';

// Reciter map to EveryAyah identifiers (legacy fallback)
const SCHOLAR_RECITER_MAP = {
  'scholar-1': 'Yasser_Ad-Dussary_128kbps',
  'scholar-2': 'Alafasy_128kbps',
  'scholar-3': 'Abdurrahmaan_As-Sudais_192kbps',
  'scholar-4': 'Maher_AlMuaiqly_64kbps',
  'scholar-5': 'Hazza_Al_Balushi_128kbps',
  'scholar-6': 'Hazza_Al_Balushi_128kbps',
};

// Reciter folder name map on download.quranicaudio.com
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

// Helper to resolve scholar audio URL
const getScholarAudioUrl = (scholarId, surahId) => {
  const surahStr = String(surahId).padStart(3, '0');
  if (scholarId === 'scholar-5' || scholarId === 'scholar-6') {
    return `https://server11.mp3quran.net/hazza/${surahStr}.mp3`;
  }
  const folder = SCHOLAR_QURANICAUDIO_MAP[scholarId] || 'yasser_ad-dussary';
  return `https://download.quranicaudio.com/quran/${folder}/${surahStr}.mp3`;
};

// Crossfading Loop Player for background sounds using Howler & Web Audio API
class CrossfadingLoopPlayer {
  constructor(src, volume, isPlaying) {
    this.src = src;
    this.targetVolume = volume;
    this.isPlaying = isPlaying;
    this.activeHowl = null;
    this.fadeTimeout = null;
    this.isDestroyed = false;
  }

  setVolume(vol) {
    this.targetVolume = vol;
    if (this.activeHowl) {
      this.activeHowl.volume(vol);
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.activeHowl) {
      this.activeHowl.pause();
    }
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
  }

  play() {
    this.isPlaying = true;
    if (this.activeHowl) {
      if (!this.activeHowl.playing()) {
        this.activeHowl.volume(this.targetVolume);
        this.activeHowl.play();
        this.scheduleNextFade();
      }
    } else {
      this.startNextCycle();
    }
  }

  startNextCycle() {
    if (this.isDestroyed) return;

    const nextHowl = new Howl({
      src: [this.src],
      format: ['mp3'],
      volume: 0,
      html5: false, // Precision loop and fades require Web Audio API
      onload: () => {
        if (this.isDestroyed) {
          nextHowl.unload();
          return;
        }
        this.scheduleNextFade();
      },
      onplay: () => {
        this.scheduleNextFade();
      }
    });

    if (this.activeHowl) {
      const prevHowl = this.activeHowl;
      const fadeTime = 3000;

      if (this.isPlaying) {
        nextHowl.play();
        nextHowl.fade(0, this.targetVolume, fadeTime);
        prevHowl.fade(prevHowl.volume(), 0, fadeTime);
      }

      setTimeout(() => {
        prevHowl.stop();
        prevHowl.unload();
      }, fadeTime + 500);
    } else {
      if (this.isPlaying) {
        nextHowl.play();
        nextHowl.fade(0, this.targetVolume, 1000);
      }
    }

    this.activeHowl = nextHowl;
  }

  scheduleNextFade() {
    if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
    if (!this.isPlaying || !this.activeHowl) return;

    const duration = this.activeHowl.duration();
    if (!duration || isNaN(duration) || duration <= 0) {
      this.fadeTimeout = setTimeout(() => this.scheduleNextFade(), 1000);
      return;
    }

    const seek = this.activeHowl.seek() || 0;
    const fadeTime = 3; // 3 seconds crossfade
    const timeRemaining = duration - seek;
    const triggerDelay = (timeRemaining - fadeTime) * 1000;

    if (triggerDelay > 0) {
      this.fadeTimeout = setTimeout(() => {
        this.startNextCycle();
      }, triggerDelay);
    } else {
      this.startNextCycle();
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
    if (this.activeHowl) {
      this.activeHowl.stop();
      this.activeHowl.unload();
      this.activeHowl = null;
    }
    if (this.src && this.src.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(this.src);
      } catch (err) {
        console.warn('Failed to revoke object URL:', err);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level refs so MediaSession handlers (which run outside React) can
// directly drive the audio objects without going through the Zustand → Effect
// → Howl chain (which is blocked by Android AudioContext restrictions when
// triggered by a media key event rather than a direct user tap).
// ─────────────────────────────────────────────────────────────────────────────
let _recitationHowlRef = null;   // set inside the hook, readable from handlers
let _ambientPlayerRef = null;
export let playCurrentAudioTrackGlobal = null;

export function getRecitationHowl() { return _recitationHowlRef; }

export default function useAudioEngine() {
  const store = usePlayerStore();
  const preferencesStore = usePreferencesStore();

  const recitationHowlRef = useRef(null);
  const ambientPlayerRef = useRef(null);
  const loadedUrlRef = useRef(null);

  // Keep refs of current values to access inside callbacks without closing over stale state
  const stateRef = useRef({
    isPlaying: false,
    currentSurahId: 1,
    currentJuzId: 1,
    currentAyah: 1,
    currentScholarId: 'scholar-1',
    currentMode: 1,
    recitationVolume: 80,
    backgroundVolume: 40,
    playbackSpeed: 1.0,
    selectedBackgroundSound: 'none',
    isMuted: false,
  });

  // Keep stateRef up to date
  useEffect(() => {
    stateRef.current = {
      isPlaying: store.isPlaying,
      currentSurahId: store.currentSurahId,
      currentJuzId: store.currentJuzId,
      currentAyah: store.currentAyah,
      currentScholarId: store.currentScholarId,
      currentMode: store.currentMode,
      recitationVolume: store.recitationVolume,
      backgroundVolume: store.backgroundVolume,
      playbackSpeed: store.playbackSpeed,
      selectedBackgroundSound: store.selectedBackgroundSound,
      isMuted: store.isMuted,
    };
  }, [
    store.isPlaying, store.currentSurahId, store.currentJuzId, store.currentAyah,
    store.currentScholarId, store.currentMode, store.recitationVolume,
    store.backgroundVolume, store.playbackSpeed, store.selectedBackgroundSound,
    store.isMuted
  ]);

  // Set global handler reference for background actions
  useEffect(() => {
    playCurrentAudioTrackGlobal = playCurrentAudioTrack;
    return () => {
      playCurrentAudioTrackGlobal = null;
    };
  }, []);

  // Dynamic progress tracker & estimated ayah highlighting
  useEffect(() => {
    let animationFrameId;

    const updateProgress = () => {
      const activeHowl = recitationHowlRef.current;
      if (activeHowl && activeHowl.playing()) {
        const currentPos = activeHowl.seek() || 0;
        store.setCurrentTime(currentPos);

        // Match the active Ayah for highlighting text in Surah-wise modes using precision timings
        if (store.ayahTimings && store.ayahTimings.length > 0) {
          const matchingAyah = store.ayahTimings.find(t => currentPos >= t.from && currentPos <= t.to);
          if (matchingAyah) {
            if (matchingAyah.number !== store.currentAyah) {
              store.setCurrentAyahOnly(matchingAyah.number);
            }
          }
        } else {
          // Fallback to simple division
          const surah = surahs.find(s => s.id === store.currentSurahId);
          if (surah && store.duration > 0) {
            const ayahCount = surah.ayah_count;
            const timePerAyah = store.duration / ayahCount;
            const estimatedAyah = Math.min(ayahCount, Math.floor(currentPos / timePerAyah) + 1);
            if (estimatedAyah !== store.currentAyah) {
              store.setCurrentAyahOnly(estimatedAyah);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };

    if (store.isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [store.isPlaying, store.duration, store.currentSurahId, store.currentAyah, store.ayahTimings]);

  // Sync seek requests
  useEffect(() => {
    if (store.seekTime !== null) {
      const activeHowl = recitationHowlRef.current;
      if (activeHowl) {
        activeHowl.seek(store.seekTime);

        // Sync position state to OS on seek immediately
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
          try {
            navigator.mediaSession.setPositionState({
              duration: store.duration,
              playbackRate: store.playbackSpeed,
              position: store.seekTime
            });
            if (Capacitor.isNativePlatform()) {
              MediaSession.setPositionState({
                duration: store.duration,
                playbackRate: store.playbackSpeed,
                position: store.seekTime
              }).catch(() => { });
            }
          } catch (e) { }
        }
      }
      store.clearSeek();
    }
  }, [store.seekTime, store.duration, store.playbackSpeed]);

  // Sync playback progress with Supabase periodically during play or immediately on state changes
  useEffect(() => {
    if (!store.userId || !store.isHydrated) return;

    let lastSave = 0;

    const saveProgress = async () => {
      try {
        const { currentSurahId, currentJuzId, currentAyah, currentMode, currentScholarId, currentTime } = store;
        const isJuzMode = currentMode === 2 || currentMode === 3;
        const contentType = isJuzMode ? 'juz' : 'surah';
        const contentId = isJuzMode ? currentJuzId : currentSurahId;

        const { error } = await supabase
          .from('user_playback_progress')
          .upsert({
            user_id: store.userId,
            content_type: contentType,
            content_id: contentId,
            mode: currentMode,
            scholar_id: currentScholarId,
            playback_position_sec: Math.round(currentTime),
            last_ayah_index: currentAyah,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,content_type,content_id,mode' });

        // Save to local memory map immediately
        const memory = JSON.parse(localStorage.getItem('tarjuma_mode_memory') || '{}');
        memory[currentMode] = {
          contentId: contentId,
          ayah: currentAyah,
          currentTime: currentTime,
          scholarId: currentScholarId
        };
        localStorage.setItem('tarjuma_mode_memory', JSON.stringify(memory));

        if (isJuzMode) {
          const juzProgress = JSON.parse(localStorage.getItem('tarjuma_juz_progress') || '{}');
          juzProgress[currentJuzId] = {
            ayah: currentAyah,
            currentTime: currentTime,
            mode: currentMode
          };
          localStorage.setItem('tarjuma_juz_progress', JSON.stringify(juzProgress));
        } else {
          const surahProgress = JSON.parse(localStorage.getItem('tarjuma_surah_progress') || '{}');
          surahProgress[currentSurahId] = {
            ayah: currentAyah,
            currentTime: currentTime,
            scholarId: currentScholarId,
            mode: currentMode
          };
          localStorage.setItem('tarjuma_surah_progress', JSON.stringify(surahProgress));
        }

        if (error) {
          console.error('Error syncing playback progress to Supabase:', error);
        }
      } catch (err) {
        console.error('Failed to sync playback progress to Supabase:', err);
      }
    };

    if (store.isPlaying) {
      const interval = setInterval(() => {
        const now = Date.now();
        if (now - lastSave > 8000) { // Sync every 8 seconds during active playback
          saveProgress();
          lastSave = now;
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // Sync immediately when paused or track shifts
      saveProgress();
    }
  }, [store.isPlaying, store.currentSurahId, store.currentJuzId, store.currentAyah, store.userId]);

  // Handle listening session tracking for insights
  useEffect(() => {
    const insightsStore = useInsightsStore.getState();
    let intervalId;

    if (store.isPlaying) {
      // Start session
      insightsStore.startSession(store.currentMode, store.currentScholarId, store.currentSurahId);

      let lastTime = Date.now();
      intervalId = setInterval(() => {
        const now = Date.now();
        const diffSeconds = (now - lastTime) / 1000;
        lastTime = now;
        insightsStore.updateSession(diffSeconds);
      }, 1000);
    } else {
      // End session
      insightsStore.endSession();
    }

    return () => {
      clearInterval(intervalId);
      insightsStore.endSession();
    };
  }, [store.isPlaying, store.currentMode, store.currentScholarId, store.currentSurahId]);

  // Load and play the active track based on mode
  const playCurrentAudioTrack = async () => {
    // Read directly from the Zustand stores to ensure we always have the absolute latest synchronous state
    const storeState = usePlayerStore.getState();
    const currentSurahId = storeState.currentSurahId;
    const currentJuzId = storeState.currentJuzId;
    const currentScholarId = storeState.currentScholarId;
    const currentMode = storeState.currentMode;
    const recitationVolume = storeState.recitationVolume;
    const playbackSpeed = storeState.playbackSpeed;
    const isPlaying = storeState.isPlaying;
    const isMuted = storeState.isMuted;

    const isJuzMode = currentMode === 2 || currentMode === 3;
    const itemType = isJuzMode ? 'juz' : 'surah';
    const itemId = isJuzMode ? currentJuzId : currentSurahId;

    // Check if item is downloaded in downloadsStore
    let targetUrl = await useDownloadsStore.getState().getOfflineAudioUrl(itemType, itemId, currentMode, currentScholarId);
    let isOffline = !!targetUrl;

    if (!targetUrl) {
      // Resolve remote URL based on active mode (1 to 5)
      if (currentMode === 1) {
        targetUrl = getScholarAudioUrl(currentScholarId, currentSurahId);
      } else if (currentMode === 2) {
        targetUrl = playbackUrls.mode2_juz_urls[String(currentJuzId)] || `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`;
      } else if (currentMode === 3) {
        targetUrl = playbackUrls.mode3_juz_urls[String(currentJuzId)] || `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3`;
      } else if (currentMode === 4) {
        targetUrl = playbackUrls.mode4_surah_urls[String(currentSurahId)] || getScholarAudioUrl(currentScholarId, currentSurahId);
      } else if (currentMode === 5) {
        targetUrl = playbackUrls.mode5_surah_urls[String(currentSurahId)] || getScholarAudioUrl(currentScholarId, currentSurahId);
      }
    }

    // Do not reload if the same URL is already playing
    if (targetUrl === loadedUrlRef.current && recitationHowlRef.current) {
      if (isPlaying && !recitationHowlRef.current.playing()) {
        recitationHowlRef.current.play();
      } else if (!isPlaying && recitationHowlRef.current.playing()) {
        recitationHowlRef.current.pause();
      }
      return;
    }

    // Unload current
    if (recitationHowlRef.current) {
      recitationHowlRef.current.stop();
      recitationHowlRef.current.unload();
      recitationHowlRef.current = null;
    }

    loadedUrlRef.current = targetUrl;
    const targetVolume = isMuted ? 0 : recitationVolume / 100;

    const handlePlaybackEnd = () => {
      const state = usePlayerStore.getState();
      
      // Register completed Surah in preferences store
      if (state.currentMode === 1 || state.currentMode === 4 || state.currentMode === 5) {
        preferencesStore.getState().addCompletedSurah(state.currentSurahId);
      }

      // If playing a Surah triggered by a scheduled/broadcast notification, restore user's previous playback!
      if (state.notificationPreviousPlaybackBackup) {
        state.restorePlaybackFromBackup();
        return;
      }

      if (store.sleepTimerMinutes === 'endOfTrack') {
        store.pause();
        store.setSleepTimer(null);
        return;
      }
      if (state.currentMode === 2 || state.currentMode === 3) {
        store.nextJuz();
      } else {
        store.nextSurah();
      }
    };

    store.setIsLoadingAudio(true);
    store.setDuration(0); // Reset duration on new track load to prevent progress line jumping

    recitationHowlRef.current = new Howl({
      src: [targetUrl],
      html5: true, // Crucial for large files/continuous streams to prevent page freezing and conserve memory
      format: ['mp3'], // Explicitly specify mp3 format so Blob URLs parse duration and allow seeking
      volume: targetVolume,
      rate: playbackSpeed,
      onload: () => {
        if (recitationHowlRef.current) {
          const trackDuration = recitationHowlRef.current.duration();
          if (trackDuration && trackDuration > 0) {
            store.setDuration(trackDuration);
          }
          // Seek to stored position if any
          const savedTime = store.currentTime;
          if (savedTime > 0) {
            try {
              recitationHowlRef.current.seek(savedTime);
            } catch (e) {
              console.warn('Seek on load warning:', e);
            }
          }
          // Safety lock: if the store says we are paused, guarantee the audio is paused when it loads
          if (!store.isPlaying) {
            recitationHowlRef.current.pause();
            if (ambientPlayerRef.current) {
              ambientPlayerRef.current.pause();
            }
          }
        }
        store.setIsLoadingAudio(false);
      },
      onloaderror: (id, err) => {
        console.error("Howler failed to load main track:", err);
        store.setIsLoadingAudio(false);
      },
      onplayerror: (id, err) => {
        console.error("Howler failed to play main track:", err);
        store.setIsLoadingAudio(false);
      },
      onend: handlePlaybackEnd,
    });

    if (isPlaying) {
      recitationHowlRef.current.play();
    } else {
      recitationHowlRef.current.pause();
    }

    // Keep module-level ref in sync for MediaSession handlers
    _recitationHowlRef = recitationHowlRef.current;
  };

  // Keep module-level ambient ref in sync
  useEffect(() => {
    _ambientPlayerRef = ambientPlayerRef.current;
  });

  // Sync isPlaying state
  useEffect(() => {
    const activeHowl = recitationHowlRef.current;
    if (store.isPlaying) {
      if (activeHowl && !activeHowl.playing()) {
        activeHowl.play();
      } else if (!activeHowl) {
        playCurrentAudioTrack();
      }

      if (ambientPlayerRef.current) {
        ambientPlayerRef.current.play();
      }

      // Trigger background prefetch for next 2-3 tracks if enabled on unmetered Wi-Fi
      triggerSmartWifiPrefetch();
    } else {
      // Bug fix: Remove activeHowl.playing() check to ensure pause is called even when loading/buffering
      if (activeHowl) {
        activeHowl.pause();
      }

      if (ambientPlayerRef.current) {
        ambientPlayerRef.current.pause();
      }
    }
  }, [store.isPlaying]);

  // Sync state variables
  useEffect(() => {
    playCurrentAudioTrack();
  }, [store.currentSurahId, store.currentJuzId, store.currentScholarId, store.currentMode]);

  // Sync volumes
  useEffect(() => {
    const vol = store.isMuted ? 0 : store.recitationVolume / 100;
    if (recitationHowlRef.current) recitationHowlRef.current.volume(vol);
  }, [store.recitationVolume, store.isMuted]);

  useEffect(() => {
    const vol = store.isMuted ? 0 : store.backgroundVolume / 100;
    if (ambientPlayerRef.current) {
      ambientPlayerRef.current.setVolume(vol);
    }
  }, [store.backgroundVolume, store.isMuted]);

  // Sync speed rate
  useEffect(() => {
    if (recitationHowlRef.current) recitationHowlRef.current.rate(store.playbackSpeed);
  }, [store.playbackSpeed]);

  // Sync background sound selection
  useEffect(() => {
    let active = true;

    async function initAmbientSound() {
      // Destroy old player
      if (ambientPlayerRef.current) {
        ambientPlayerRef.current.destroy();
        ambientPlayerRef.current = null;
      }

      const soundId = store.selectedBackgroundSound;
      if (soundId === 'none') return;

      const sound = backgroundSounds.find(s => s.id === soundId);
      if (!sound) return;

      let finalSrc = getSoundUrl(sound);
      if (!finalSrc) return;

      if (!sound.isPreinstalled) {
        try {
          const cache = await caches.open('background-sounds-cache');
          const match = await cache.match(sound.url);
          if (match) {
            const blob = await match.blob();
            finalSrc = URL.createObjectURL(blob);
          }
        } catch (err) {
          console.warn('Failed to load sound from Cache API:', err);
        }
      }

      if (!active) {
        if (finalSrc && finalSrc.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(finalSrc);
          } catch (err) {
            console.warn('Failed to revoke object URL on clean exit:', err);
          }
        }
        return;
      }

      const targetVolume = store.isMuted ? 0 : store.backgroundVolume / 100;
      ambientPlayerRef.current = new CrossfadingLoopPlayer(finalSrc, targetVolume, store.isPlaying);
      if (store.isPlaying) {
        ambientPlayerRef.current.play();
      } else {
        ambientPlayerRef.current.pause();
      }
    }

    initAmbientSound();

    return () => {
      active = false;
    };
  }, [store.selectedBackgroundSound]);

  // Sync sleep timer with 30-second gradual fade-out
  useEffect(() => {
    if (store.sleepTimerMinutes === null || store.sleepTimerMinutes === 'endOfTrack') {
      // Ensure normal volume is restored if timer was canceled
      const activeHowl = recitationHowlRef.current;
      const baseRecVol = store.isMuted ? 0 : store.recitationVolume / 100;
      const baseAmbVol = store.isMuted ? 0 : store.backgroundVolume / 100;
      if (activeHowl) activeHowl.volume(baseRecVol);
      if (ambientPlayerRef.current) ambientPlayerRef.current.setVolume(baseAmbVol);
      return;
    }

    const checkTimer = setInterval(() => {
      const now = Date.now();
      if (!store.sleepTimerEnd) return;

      const remaining = store.sleepTimerEnd - now;
      const activeHowl = recitationHowlRef.current;
      const baseRecVol = store.isMuted ? 0 : store.recitationVolume / 100;
      const baseAmbVol = store.isMuted ? 0 : store.backgroundVolume / 100;

      if (remaining <= 0) {
        clearInterval(checkTimer);
        // Pause and reset timer
        store.pause();
        store.setSleepTimer(null);
        // Restore base volumes for next playback session
        if (activeHowl) activeHowl.volume(baseRecVol);
        if (ambientPlayerRef.current) ambientPlayerRef.current.setVolume(baseAmbVol);
      } else if (remaining <= 30000) {
        // Gradually decrease playback volume over the final 30 seconds rather than cutting off abruptly
        const fadeFactor = Math.max(0, remaining / 30000);
        if (activeHowl) activeHowl.volume(baseRecVol * fadeFactor);
        if (ambientPlayerRef.current) ambientPlayerRef.current.setVolume(baseAmbVol * fadeFactor);
      }
    }, 500);

    return () => {
      clearInterval(checkTimer);
    };
  }, [store.sleepTimerMinutes, store.sleepTimerEnd, store.recitationVolume, store.backgroundVolume, store.isMuted]);

  // Fetch Surah text when Surah changes
  useEffect(() => {
    store.fetchSurahText(store.currentSurahId);
  }, [store.currentSurahId]);

  // Helper: build current MediaSession metadata payload
  const buildMediaSessionPayload = () => {
    const surah = surahs.find(s => s.id === store.currentSurahId) || surahs[0];
    const activeJuz = paras.find(p => p.id === store.currentJuzId) || paras[0];
    
    let artist = '';
    let artworkUrl = '';
    
    let activeScholarId = store.currentScholarId;
    if (store.currentMode === 2 || store.currentMode === 4) {
      // Mixed mode: Mishary Rashid Alafasy & Jalandhary
      const afasy = scholars.find(s => s.id === 'scholar-2') || scholars[0];
      artist = 'Mishary Rashid Alafasy -- Jalandhary';
      artworkUrl = getScholarPhotoUrl(afasy);
      activeScholarId = afasy.id;
    } else if (store.currentMode === 3 || store.currentMode === 5) {
      // Translation only: Fateh Muhammed Jalandhary
      const jalandhary = scholars.find(s => s.id === 'scholar-jalandhary') || scholars[0];
      artist = jalandhary.name_transliteration;
      artworkUrl = getScholarPhotoUrl(jalandhary);
      activeScholarId = jalandhary.id;
    } else {
      // Mode 1: Arabic recitation only (selectable scholar)
      const scholar = scholars.find(s => s.id === store.currentScholarId) || scholars[0];
      artist = scholar.name_transliteration;
      artworkUrl = getScholarPhotoUrl(scholar);
      activeScholarId = scholar.id;
    }

    const isJuzMode = store.currentMode === 2 || store.currentMode === 3;
    const currentId = isJuzMode ? store.currentJuzId : store.currentSurahId;
    const isFavorite = isJuzMode
      ? (preferencesStore.favoriteJuzIds || []).includes(currentId)
      : (preferencesStore.favoriteSurahIds || []).includes(currentId);

    return {
      title: isJuzMode
        ? `Para ${store.currentJuzId} · ${activeJuz ? activeJuz.name_transliteration : ''}`
        : surah.name_transliteration,
      artist,
      album: isJuzMode ? 'Para-wise Recitation' : 'Surah-wise Recitation',
      artworkUrl: artworkUrl || 'https://images.unsplash.com/photo-1609599006353-e629f1d40f4e?w=500',
      isFavorite,
      scholarId: activeScholarId,
    };
  };

  // Push full metadata + playback state to both Web API and native plugin
  const pushMediaSession = async (isPlaying) => {
    const { title, artist, album, artworkUrl, isFavorite, scholarId } = buildMediaSessionPayload();
    const state = isPlaying ? 'playing' : 'paused';

    // Convert local artwork to Base64 so native Android MediaSession can decode Bitmap without localhost/network issues
    let finalArtworkUrl = artworkUrl;
    try {
      if (artworkUrl && !artworkUrl.startsWith('http') && !artworkUrl.startsWith('data:')) {
        const base64 = await getScholarPhotoBase64(scholarId || artworkUrl);
        if (base64) finalArtworkUrl = base64;
      }
    } catch (e) {
      console.warn('Error resolving base64 artwork:', e);
    }

    if ('mediaSession' in navigator) {
      try {
        const webArtworkUrl = (finalArtworkUrl.startsWith('data:') || finalArtworkUrl.startsWith('http'))
          ? finalArtworkUrl
          : new URL(finalArtworkUrl, window.location.href).href;

        navigator.mediaSession.metadata = new window.MediaMetadata({
          title, artist, album,
          artwork: [
            { src: webArtworkUrl, sizes: '256x256', type: 'image/png' },
            { src: webArtworkUrl, sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = state;
      } catch (e) { /* ignore */ }
    }

    if (Capacitor.isNativePlatform()) {
      MediaSession.setMetadata({
        title, artist, album,
        artwork: [{ src: finalArtworkUrl, sizes: '256x256', type: 'image/png' }],
        isFavorite,
      }).catch(err => console.warn('Native MediaSession setMetadata failed:', err));
      MediaSession.setPlaybackState({ playbackState: state })
        .catch(err => console.warn('Native MediaSession setPlaybackState failed:', err));
    }
  };

  // Push native action handlers (idempotent — safe to call multiple times)
  const registerNativeActionHandlers = () => {
    if (!Capacitor.isNativePlatform()) return;

    // Play handler: directly drive the Howl object AND update Zustand state.
    // Calling store.play() alone is not enough on Android — the Zustand → React
    // effect → howl.play() chain is blocked by AudioContext restrictions when
    // triggered from a media key rather than a direct user tap. By also calling
    // _recitationHowlRef.play() (the module-level ref) we bypass that restriction.
    MediaSession.setActionHandler({ action: 'play' }, () => {
      store.play();
      const howl = _recitationHowlRef;
      if (howl && !howl.playing()) {
        try { howl.play(); } catch (e) { /* ignore */ }
      } else if (!howl) {
        playCurrentAudioTrack();
      }
      if (_ambientPlayerRef) {
        try { _ambientPlayerRef.play(); } catch (e) { /* ignore */ }
      }
    }).catch(() => {});

    // Pause handler: directly pause the Howl object AND update Zustand state.
    MediaSession.setActionHandler({ action: 'pause' }, () => {
      store.pause();
      const howl = _recitationHowlRef;
      if (howl && howl.playing()) {
        try { howl.pause(); } catch (e) { /* ignore */ }
      }
      if (_ambientPlayerRef) {
        try { _ambientPlayerRef.pause(); } catch (e) { /* ignore */ }
      }
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
      store.previousAyah();
      playCurrentAudioTrack();
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
      store.nextAyah();
      playCurrentAudioTrack();
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'favourite' }, () => {
      const state = usePlayerStore.getState();
      const isJuzMode = state.currentMode === 2 || state.currentMode === 3;
      if (isJuzMode) {
        usePreferencesStore.getState().toggleFavoriteJuz(state.currentJuzId);
      } else {
        usePreferencesStore.getState().toggleFavoriteSurah(state.currentSurahId);
      }
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'seekto' }, (data) => {
      if (data && data.seekTime !== undefined) {
        store.seek(data.seekTime);
      }
    }).catch(() => {});
  };

  // Sync Media Session API (lockscreen, notifications, dynamic status bar capsule widgets)
  useEffect(() => {
    pushMediaSession(store.isPlaying);

    // When playback starts, schedule a deferred re-sync to cover the async
    // service-bind window (the foreground service may still be connecting).
    if (store.isPlaying) {
      const t = setTimeout(() => {
        pushMediaSession(true);
        registerNativeActionHandlers();
        // Also re-push position state so the scrubber is live immediately
        const activeHowl = recitationHowlRef.current;
        const pos = activeHowl ? (activeHowl.seek() || 0) : store.currentTime;
        if (store.duration > 0 && pos >= 0 && pos <= store.duration) {
          if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
            try {
              navigator.mediaSession.setPositionState({
                duration: store.duration,
                playbackRate: store.playbackSpeed,
                position: pos,
              });
            } catch (e) { /* ignore */ }
          }
          if (Capacitor.isNativePlatform()) {
            MediaSession.setPositionState({
              duration: store.duration,
              playbackRate: store.playbackSpeed,
              position: pos,
            }).catch(() => {});
          }
        }
      }, 600);
      return () => clearTimeout(t);
    }
  }, [
    store.currentSurahId,
    store.currentJuzId,
    store.currentScholarId,
    store.currentMode,
    store.isPlaying,
    preferencesStore.favoriteSurahIds,
    preferencesStore.favoriteJuzIds
  ]);

  // Sync Media Session Action Handlers
  // Web action handlers are registered once at mount.
  // Native handlers are registered here AND re-registered whenever play starts
  // (see the deferred re-sync inside the metadata effect above).
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => store.play());
        navigator.mediaSession.setActionHandler('pause', () => store.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => store.previousAyah());
        navigator.mediaSession.setActionHandler('nexttrack', () => store.nextAyah());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) store.seek(details.seekTime);
        });
      } catch (e) {
        console.warn('Failed to set Web MediaSession action handlers:', e);
      }
    }

    // Register native handlers immediately (service is always running now)
    registerNativeActionHandlers();

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
      if (Capacitor.isNativePlatform()) {
        MediaSession.setActionHandler({ action: 'play' }, null).catch(() => {});
        MediaSession.setActionHandler({ action: 'pause' }, null).catch(() => {});
        MediaSession.setActionHandler({ action: 'previoustrack' }, null).catch(() => {});
        MediaSession.setActionHandler({ action: 'nexttrack' }, null).catch(() => {});
        MediaSession.setActionHandler({ action: 'favourite' }, null).catch(() => {});
        MediaSession.setActionHandler({ action: 'seekto' }, null).catch(() => {});
      }
    };
  }, []);

  // Update Media Session Position State
  // Fires on status/duration/speed changes AND every 5 s during active playback
  // so the lock-screen scrubber stays accurate.
  useEffect(() => {
    const pushPosition = (pos) => {
      if (store.duration <= 0 || pos < 0 || pos > store.duration) return;

      if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({
            duration: store.duration,
            playbackRate: store.playbackSpeed,
            position: pos,
          });
        } catch (e) { /* ignore */ }
      }

      if (Capacitor.isNativePlatform()) {
        MediaSession.setPositionState({
          duration: store.duration,
          playbackRate: store.playbackSpeed,
          position: pos,
        }).catch(() => {});
      }
    };

    // Immediate push on state change
    const pos = recitationHowlRef.current ? (recitationHowlRef.current.seek() || store.currentTime) : store.currentTime;
    pushPosition(pos);

    // Periodic push every 5 s during active playback
    if (!store.isPlaying) return;
    const interval = setInterval(() => {
      const livePos = recitationHowlRef.current ? (recitationHowlRef.current.seek() || 0) : 0;
      pushPosition(livePos);
    }, 5000);
    return () => clearInterval(interval);
  }, [store.isPlaying, store.duration, store.playbackSpeed]);
}
