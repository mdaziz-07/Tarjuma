import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../utils/supabaseClient';
import usePlayerStore from './playerStore';

const usePreferencesStore = create(
  persist(
    (set, get) => ({
      // User ID
      userId: null,

      // Playback preferences
      defaultMode: 1,
      defaultScholarId: 'scholar-1',
      defaultPlaybackSpeed: 1.0,
      autoPlayNextSurah: true,

      // Display preferences
      arabicTextSize: 'MEDIUM', // SMALL, MEDIUM, LARGE
      showTranslation: true,
      translationLanguage: 'Hindi',
      keepScreenAwake: true,

      // Recitation goals
      dailyGoalMinutes: 15,
      goalRemindersEnabled: false,
      goalReminderTime: '08:00',

      // Audio preferences
      audioQuality: 'STANDARD', // STANDARD, HIGH
      defaultBackgroundSound: 'none',

      // Sleep timer presets
      sleepTimerPresets: [15, 30, 60],

      // Smart Wi-Fi Prefetching
      smartWifiPrefetchEnabled: false,

      // Scholar
      lastSelectedScholarId: 'scholar-1',

      // Favorites
      favoriteSurahIds: [],
      favoriteJuzIds: [],

      // Profile Preferences
      displayName: 'Reader',
      avatarId: 'moon',
      completedSurahIds: [],

      // Made For You Custom Ordering
      madeForYouOrder: [],

      // Onboarding Preferences
      onboardingCompleted: false,
      onboardingCompletedAt: null,

      // Actions
      setUserId: (id) => set({ userId: id }),
      setMadeForYouOrder: (order) => {
        set({ madeForYouOrder: order });
        get().saveToSupabase();
      },
      setOnboardingCompleted: (completed) => {
        set({ 
          onboardingCompleted: completed, 
          onboardingCompletedAt: completed ? new Date().toISOString() : null 
        });
        get().saveToSupabase();
      },
      setDisplayName: (name) => {
        set({ displayName: name });
        get().saveToSupabase();
      },
      setAvatarId: (id) => {
        set({ avatarId: id });
        get().saveToSupabase();
      },
      addCompletedSurah: (id) => {
        set((state) => {
          const list = state.completedSurahIds || [];
          if (list.includes(id)) return {};
          return { completedSurahIds: [...list, id] };
        });
        get().saveToSupabase();
      },

      setDefaultMode: (mode) => {
        set({ defaultMode: mode });
        get().saveToSupabase();
      },
      setDefaultScholar: (id) => {
        set({ defaultScholarId: id, lastSelectedScholarId: id });
        get().saveToSupabase();
      },
      setDefaultPlaybackSpeed: (speed) => {
        set({ defaultPlaybackSpeed: speed });
        get().saveToSupabase();
      },
      setAutoPlayNextSurah: (val) => set({ autoPlayNextSurah: val }),
      setArabicTextSize: (size) => {
        set({ arabicTextSize: size });
        get().saveToSupabase();
      },
      setShowTranslation: (val) => {
        set({ showTranslation: val });
        get().saveToSupabase();
      },
      setKeepScreenAwake: (val) => set({ keepScreenAwake: val }),
      setDailyGoalMinutes: (mins) => {
        set({ dailyGoalMinutes: mins });
        get().saveToSupabase();
      },
      setGoalReminders: (enabled) => {
        set({ goalRemindersEnabled: enabled });
        get().saveToSupabase();
      },
      setGoalReminderTime: (time) => {
        set({ goalReminderTime: time });
        get().saveToSupabase();
      },
      setAudioQuality: (quality) => {
        set({ audioQuality: quality });
        get().saveToSupabase();
      },
      setSmartWifiPrefetchEnabled: (enabled) => {
        set({ smartWifiPrefetchEnabled: enabled });
        get().saveToSupabase();
      },
      setDefaultBackgroundSound: (sound) => {
        set({ defaultBackgroundSound: sound });
        get().saveToSupabase();
      },
      setLastSelectedScholar: (id) => {
        set({ lastSelectedScholarId: id });
        get().saveToSupabase();
      },
      toggleFavoriteSurah: (id) => {
        set((state) => {
          const list = state.favoriteSurahIds || [];
          const isFav = list.includes(id);
          return {
            favoriteSurahIds: isFav ? list.filter(fid => fid !== id) : [...list, id]
          };
        });
        get().saveToSupabase();
      },
      toggleFavoriteJuz: (id) => {
        set((state) => {
          const list = state.favoriteJuzIds || [];
          const isFav = list.includes(id);
          return {
            favoriteJuzIds: isFav ? list.filter(fid => fid !== id) : [...list, id]
          };
        });
        get().saveToSupabase();
      },

      // Sync methods
      saveToSupabase: async () => {
        const state = get();
        if (!state.userId) return;

        try {
          const playerState = usePlayerStore.getState();

          const { error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: state.userId,
              default_mode: state.defaultMode,
              default_scholar_id: state.defaultScholarId,
              daily_goal_minutes: state.dailyGoalMinutes,
              playback_speed: state.defaultPlaybackSpeed,
              arabic_font_size: state.arabicTextSize,
              show_translation: state.showTranslation,
              audio_quality: state.audioQuality,
              selected_bg_sound: state.defaultBackgroundSound,
              goal_reminders_enabled: state.goalRemindersEnabled,
              goal_reminder_time: state.goalReminderTime,
              favorite_surah_ids: state.favoriteSurahIds || [],
              favorite_juz_ids: state.favoriteJuzIds || [],
              display_name: state.displayName,
              avatar_id: state.avatarId,
              completed_surah_ids: state.completedSurahIds || [],
              recitation_volume: playerState.recitationVolume,
              bg_sound_volume: playerState.backgroundVolume,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.error('Error upserting user preferences to Supabase:', error);
          }
        } catch (err) {
          console.error('Failed to save preferences to Supabase:', err);
        }
      },

      hydrateFromSupabase: async (userId) => {
        set({ userId });
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) {
            console.error('Error loading preferences from Supabase:', error);
            return;
          }

          if (data) {
            set({
              defaultMode: data.default_mode ?? get().defaultMode,
              defaultScholarId: data.default_scholar_id ?? get().defaultScholarId,
              lastSelectedScholarId: data.default_scholar_id ?? get().lastSelectedScholarId,
              dailyGoalMinutes: data.daily_goal_minutes ?? get().dailyGoalMinutes,
              defaultPlaybackSpeed: data.playback_speed ?? get().defaultPlaybackSpeed,
              arabicTextSize: data.arabic_font_size ?? get().arabicTextSize,
              showTranslation: data.show_translation ?? get().showTranslation,
              audioQuality: data.audio_quality ?? get().audioQuality,
              defaultBackgroundSound: data.selected_bg_sound ?? get().defaultBackgroundSound,
              favoriteSurahIds: data.favorite_surah_ids ?? get().favoriteSurahIds,
              favoriteJuzIds: data.favorite_juz_ids ?? get().favoriteJuzIds,
              displayName: data.display_name ?? get().displayName,
              avatarId: data.avatar_id ?? get().avatarId,
              completedSurahIds: data.completed_surah_ids ?? get().completedSurahIds,
              goalRemindersEnabled: data.goal_reminders_enabled ?? get().goalRemindersEnabled,
              goalReminderTime: data.goal_reminder_time ?? get().goalReminderTime,
            });

            // Sync to player store
            const playerState = usePlayerStore.getState();
            
            // Only overwrite player's mode/scholar if it is in a fresh, unplayed state
            const isUnplayed = playerState.currentTime === 0 && playerState.currentSurahId === 1 && playerState.currentAyah === 1;

            usePlayerStore.setState({
              recitationVolume: data.recitation_volume !== null ? Math.round(data.recitation_volume) : playerState.recitationVolume,
              backgroundVolume: data.bg_sound_volume !== null ? Math.round(data.bg_sound_volume) : playerState.backgroundVolume,
              playbackSpeed: data.playback_speed ?? playerState.playbackSpeed,
              selectedBackgroundSound: data.selected_bg_sound ?? playerState.selectedBackgroundSound,
              ...(isUnplayed ? {
                currentMode: data.default_mode ?? playerState.currentMode,
                currentScholarId: data.default_scholar_id ?? playerState.currentScholarId,
              } : {})
            });
          } else {
            // Document doesn't exist, create it initially
            await get().saveToSupabase();
          }
        } catch (err) {
          console.error('Failed to hydrate preferences:', err);
        }
      }
    }),
    {
      name: 'tarjuma-preferences',
    }
  )
);

export default usePreferencesStore;
