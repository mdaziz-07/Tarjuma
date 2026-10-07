import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import usePreferencesStore from '../stores/preferencesStore';
import usePlayerStore from '../stores/playerStore';
import { 
  scheduleDailyReminder, 
  cancelDailyReminder, 
  scheduleRecurringRules,
  sendImmediateNotification,
  checkNotificationPermission,
  requestNotificationPermission
} from '../utils/notificationService';
import { 
  getScheduledNotificationRules, 
  getRemoteConfigKey,
  getNotificationCampaigns 
} from '../services/adminService';
import { supabase } from '../utils/supabaseClient';

export default function useNotificationEngine() {
  const navigate = useNavigate();
  const { 
    goalRemindersEnabled, 
    goalReminderTime, 
    dailyGoalMinutes 
  } = usePreferencesStore();
  const { playSurahFromNotification, playJuzFromNotification, setCurrentScholar } = usePlayerStore();

  const lastTriggeredDateRef = useRef(localStorage.getItem('tarjuma_last_reminder_date') || '');
  const activeRulesRef = useRef([]);

  // Deep linking dispatcher helper
  const handleDeepLink = useCallback((action, targetId) => {
    if (!action) return;
    try {
      if (action === 'play_surah' && targetId) {
        playSurahFromNotification(Number(targetId));
        navigate('/player');
      } else if (action === 'play_para' && targetId) {
        playJuzFromNotification(Number(targetId));
        navigate('/player');
      } else if (action === 'open_scholar' && targetId) {
        setCurrentScholar(targetId);
        navigate('/scholar-picker');
      } else if (action === 'open_zen') {
        navigate('/zen');
      } else if (action === 'open_library') {
        navigate('/library');
      } else if (action === 'external_url' && targetId) {
        window.open(targetId, '_blank');
      }
    } catch (e) {
      console.warn('Deep link handling error:', e);
    }
  }, [navigate, playSurahFromNotification, playJuzFromNotification, setCurrentScholar]);

  // 1. Initial Permission Request & Personal Goal Reminder Native Scheduler sync
  useEffect(() => {
    if (goalRemindersEnabled && goalReminderTime) {
      scheduleDailyReminder(goalReminderTime, dailyGoalMinutes);
    } else {
      cancelDailyReminder();
    }
  }, [goalRemindersEnabled, goalReminderTime, dailyGoalMinutes]);

  // 2. Sync Remote Admin Recurring Campaign Schedules & Realtime Broadcasts
  useEffect(() => {
    // Request/verify notification permission on startup
    if (Capacitor.isNativePlatform()) {
      checkNotificationPermission().then(granted => {
        if (!granted) {
          requestNotificationPermission();
        }
      });
    }

    const syncRules = async () => {
      try {
        const rules = await getScheduledNotificationRules();
        if (Array.isArray(rules)) {
          activeRulesRef.current = rules;
          await scheduleRecurringRules(rules);
        }
      } catch (err) {
        console.warn('Failed to sync scheduled notification rules:', err);
      }
    };

    const checkForPendingBroadcasts = async () => {
      try {
        // 1. First check latest_push_broadcast key
        let candidate = await getRemoteConfigKey('latest_push_broadcast', null);

        // 2. If candidate is missing or marked as app_update, inspect notification_campaigns list
        if (!candidate || !candidate.title || candidate.type === 'app_update') {
          const campaigns = await getNotificationCampaigns();
          if (Array.isArray(campaigns) && campaigns.length > 0) {
            candidate = campaigns.find(c => c && c.title && c.type !== 'app_update');
          }
        }

        if (candidate && candidate.id && candidate.title && candidate.type !== 'app_update') {
          const lastSeen = localStorage.getItem('tarjuma_last_seen_broadcast_id');
          if (lastSeen !== candidate.id) {
            const sentAt = candidate.sentAt ? new Date(candidate.sentAt).getTime() : Date.now();
            const ageHours = (Date.now() - sentAt) / (1000 * 60 * 60);
            if (ageHours <= 72) {
              localStorage.setItem('tarjuma_last_seen_broadcast_id', candidate.id);
              sendImmediateNotification(candidate.title, candidate.body, {
                action: candidate.action,
                targetId: candidate.targetId
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to check latest push broadcast:', err);
      }
    };

    syncRules();
    checkForPendingBroadcasts();

    // Foreground poll every 25 seconds so users receive instant notifications even if WebSocket idled
    const pollInterval = setInterval(() => {
      checkForPendingBroadcasts();
    }, 25000);

    // App State Change listener: when app is brought to foreground / resumed from background
    let appStateListener = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          checkForPendingBroadcasts();
          syncRules();
        }
      }).then(res => {
        appStateListener = res;
      });
    }

    // Listen to Supabase Realtime changes for instant push broadcasts and rule updates
    const channel = supabase
      .channel('notification_engine_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        (payload) => {
          const key = payload.new?.key;
          if (key === 'scheduled_notification_rules') {
            syncRules();
          } else if (key === 'latest_push_broadcast' || key === 'notification_campaigns') {
            const raw = payload.new?.value;
            let broadcast = raw;
            if (typeof raw === 'string') {
              try {
                broadcast = JSON.parse(raw);
              } catch {
                // Ignore JSON parse failure
              }
            }
            if (Array.isArray(broadcast) && broadcast.length > 0) {
              broadcast = broadcast[0];
            }
            if (broadcast && broadcast.title && broadcast.type !== 'app_update') {
              const lastSeen = localStorage.getItem('tarjuma_last_seen_broadcast_id');
              if (lastSeen !== broadcast.id) {
                localStorage.setItem('tarjuma_last_seen_broadcast_id', broadcast.id || '');
                sendImmediateNotification(broadcast.title, broadcast.body, {
                  action: broadcast.action,
                  targetId: broadcast.targetId
                });
              }
            } else {
              checkForPendingBroadcasts();
            }
          }
        }
      )
      .subscribe();

    // Native Capacitor notification tap listener for deep-linking
    let listener = null;
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const extra = notificationAction.notification?.extra;
        if (extra) {
          handleDeepLink(extra.action, extra.targetId);
        }
      }).then(res => {
        listener = res;
      });
    }

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
      if (appStateListener && typeof appStateListener.remove === 'function') {
        appStateListener.remove();
      }
    };
  }, [handleDeepLink]);

  // 3. Web Browser Fallback background checker for goal reminders & recurring rules
  useEffect(() => {
    const checkTimeAndNotify = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const currentHoursStr = String(now.getHours()).padStart(2, '0');
      const currentMinutesStr = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHoursStr}:${currentMinutesStr}`;

      // 3A. Personal Daily Goal Reminder
      if (goalRemindersEnabled && goalReminderTime && lastTriggeredDateRef.current !== todayStr) {
        if (currentTimeStr === goalReminderTime) {
          sendImmediateNotification(
            'Quran Recitation Reminder 📖',
            `Time to complete your daily recitation goal of ${dailyGoalMinutes} minutes!`
          );
          lastTriggeredDateRef.current = todayStr;
          localStorage.setItem('tarjuma_last_reminder_date', todayStr);
        }
      }

      // 3B. Web Browser fallback for Admin Scheduled Rules
      if (!Capacitor.isNativePlatform() && Array.isArray(activeRulesRef.current)) {
        for (const rule of activeRulesRef.current) {
          if (!rule.isActive) continue;
          const days = Array.isArray(rule.days) ? rule.days : [0, 1, 2, 3, 4, 5, 6];
          if (days.includes(currentDay) && rule.time === currentTimeStr) {
            const ruleStorageKey = `tarjuma_rule_${rule.id}_${todayStr}`;
            if (!localStorage.getItem(ruleStorageKey)) {
              sendImmediateNotification(rule.title, rule.body, {
                action: rule.action,
                targetId: rule.targetId
              });
              localStorage.setItem(ruleStorageKey, 'true');
            }
          }
        }
      }
    };

    checkTimeAndNotify();
    const interval = setInterval(checkTimeAndNotify, 30000);
    return () => clearInterval(interval);
  }, [goalRemindersEnabled, goalReminderTime, dailyGoalMinutes]);
}
