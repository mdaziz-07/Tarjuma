import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../utils/supabaseClient';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const useInsightsStore = create(
  persist(
    (set, get) => ({
      userId: null,
      sessions: [],
      activeSession: null,

      startSession: (mode, scholarId, surahId) => {
        const session = {
          id: generateUUID(),
          date: new Date().toISOString().split('T')[0],
          mode,
          scholarId,
          surahId,
          durationSeconds: 0,
          timestampStart: Date.now(),
          timestampEnd: null,
        };
        set({ activeSession: session });
      },

      updateSession: (extraSeconds) => {
        set(state => {
          if (!state.activeSession) return {};
          return {
            activeSession: {
              ...state.activeSession,
              durationSeconds: state.activeSession.durationSeconds + extraSeconds,
            },
          };
        });
      },

      endSession: async () => {
        const { activeSession, sessions, userId } = get();
        if (!activeSession) return;
        
        const completed = {
          ...activeSession,
          timestampEnd: Date.now(),
        };

        set({
          sessions: [...sessions, completed],
          activeSession: null,
        });

        // Sync to Supabase in the background
        if (userId) {
          try {
            const isJuzMode = completed.mode === 2 || completed.mode === 3;
            const contentType = isJuzMode ? 'juz' : 'surah';
            const contentId = isJuzMode ? (completed.juzId || 1) : completed.surahId;

            const { error } = await supabase
              .from('listening_sessions')
              .insert({
                id: completed.id,
                user_id: userId,
                session_date: completed.date,
                mode: completed.mode,
                content_type: contentType,
                content_id: contentId,
                scholar_id: completed.scholarId,
                duration_seconds: Math.round(completed.durationSeconds),
                started_at: new Date(completed.timestampStart).toISOString(),
                ended_at: new Date(completed.timestampEnd).toISOString()
              });

            if (error) {
              console.error('Error saving session to Supabase:', error);
            }
          } catch (err) {
            console.error('Failed to sync session to Supabase:', err);
          }
        }
      },

      getTodayTotal: () => {
        const today = new Date().toISOString().split('T')[0];
        const { sessions, activeSession } = get();
        let total = sessions
          .filter(s => s.date === today)
          .reduce((sum, s) => sum + s.durationSeconds, 0);
        if (activeSession && activeSession.date === today) {
          total += activeSession.durationSeconds;
        }
        return total;
      },

      getSessionsForDate: (dateStr) => {
        return get().sessions.filter(s => s.date === dateStr);
      },

      getWeeklyData: () => {
        const data = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayTotal = get().sessions
            .filter(s => s.date === dateStr)
            .reduce((sum, s) => sum + s.durationSeconds, 0);
          data.push({
            day: d.toLocaleDateString('en', { weekday: 'short' }),
            date: dateStr,
            minutes: Math.round(dayTotal / 60),
          });
        }
        return data;
      },

      getTopReciters: () => {
        const { sessions } = get();
        const scholarMap = {};
        sessions.forEach(s => {
          if (s.scholarId) {
            if (!scholarMap[s.scholarId]) scholarMap[s.scholarId] = 0;
            scholarMap[s.scholarId] += s.durationSeconds;
          }
        });
        return Object.entries(scholarMap)
          .map(([id, seconds]) => ({ scholarId: id, seconds }))
          .sort((a, b) => b.seconds - a.seconds);
      },

      setUserId: (id) => set({ userId: id }),

      hydrateFromSupabase: async (userId) => {
        set({ userId });
        try {
          const { data, error } = await supabase
            .from('listening_sessions')
            .select('*')
            .eq('user_id', userId);

          if (error) {
            console.error('Error fetching sessions from Supabase:', error);
            return;
          }
          if (data && data.length > 0) {
            const localSessions = data.map(s => {
              const cType = s.content_type?.toLowerCase();
              return {
                id: s.id,
                date: s.session_date,
                mode: s.mode,
                scholarId: s.scholar_id,
                surahId: cType === 'surah' ? s.content_id : null,
                juzId: (cType === 'juz' || cType === 'para') ? s.content_id : null,
                durationSeconds: s.duration_seconds,
                timestampStart: new Date(s.started_at).getTime(),
                timestampEnd: new Date(s.ended_at).getTime(),
              };
            });

            set({ sessions: localSessions });
          }
        } catch (err) {
          console.error('Failed to hydrate insights sessions:', err);
        }
      },

      // Mock data for demo
      seedMockData: () => {
        const sessions = [];
        const scholars = ['scholar-1', 'scholar-2', 'scholar-3'];
        const now = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const numSessions = Math.floor(Math.random() * 3) + 1;
          
          for (let j = 0; j < numSessions; j++) {
            sessions.push({
              id: generateUUID(),
              date: dateStr,
              mode: Math.floor(Math.random() * 4) + 1,
              scholarId: scholars[Math.floor(Math.random() * scholars.length)],
              surahId: Math.floor(Math.random() * 114) + 1,
              durationSeconds: Math.floor(Math.random() * 1800) + 300,
              timestampStart: d.getTime(),
              timestampEnd: d.getTime() + 1800000,
            });
          }
        }
        set({ sessions });
      },
    }),
    {
      name: 'tarjuma-insights',
    }
  )
);

export default useInsightsStore;
