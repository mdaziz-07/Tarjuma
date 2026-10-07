import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Helper to request notification permissions (explicitly prompts user)
export const requestNotificationPermission = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        return req.display === 'granted';
      }
      return true;
    } else if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }
  } catch (err) {
    console.error('Failed to request notification permission:', err);
  }
  return false;
};

// Helper to check if permission is already granted (does NOT prompt user)
export const checkNotificationPermission = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } else if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
  } catch (err) {
    console.error('Failed to check notification permission:', err);
  }
  return false;
};

// Helper to schedule notifications (Capacitor Native daily notification triggers)
export const scheduleDailyReminder = async (timeStr, dailyGoalMinutes) => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Only schedule if permission is ALREADY granted (no automatic startup prompts)
      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) return;

      // Cancel existing reminder if any
      await LocalNotifications.cancel({ notifications: [{ id: 99 }] });

      const [hours, minutes] = timeStr.split(':').map(Number);
      
      // Create channel for Android 8.0+
      await LocalNotifications.createChannel({
        id: 'reminders',
        name: 'Daily Reminders',
        description: 'Quran recitation daily goals and reminders',
        importance: 5,
        visibility: 1
      });
      
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 99,
            title: 'Quran Recitation Reminder 📖',
            body: `Time to complete your daily recitation goal of ${dailyGoalMinutes} minutes!`,
            channelId: 'reminders',
            schedule: {
              on: {
                hour: hours,
                minute: minutes
              },
              repeats: true,
              allowWhileIdle: true
            },
            actionTypeId: 'reminders'
          }
        ]
      });
      console.log(`Native notification reminder scheduled daily at ${timeStr}`);
    } else {
      console.log(`Web environment: timer reminders will trigger via background loop at ${timeStr}`);
    }
  } catch (err) {
    console.error('Failed to schedule daily notification:', err);
  }
};

// Helper to cancel notifications
export const cancelDailyReminder = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({ notifications: [{ id: 99 }] });
      console.log('Native notification reminder cancelled.');
    }
  } catch (err) {
    console.error('Failed to cancel notifications:', err);
  }
};

// Helper to schedule recurring admin notification rules (Day-of-week & Multi-notification triggers)
export const scheduleRecurringRules = async (rules) => {
  try {
    if (!Array.isArray(rules)) return;

    if (Capacitor.isNativePlatform()) {
      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) return;

      // Cancel previous scheduled rule notifications (IDs 100 to 299)
      const existingIds = Array.from({ length: 200 }, (_, i) => ({ id: 100 + i }));
      await LocalNotifications.cancel({ notifications: existingIds });

      await LocalNotifications.createChannel({
        id: 'admin_campaigns',
        name: 'Quran Schedules & Reminders',
        description: 'Scheduled recitations, weekly Surah reminders, and special day alerts',
        importance: 5,
        visibility: 1
      });

      const notificationsToSchedule = [];
      let idCounter = 100;

      for (const rule of rules) {
        if (!rule.isActive) continue;
        const [hours, minutes] = (rule.time || '09:00').split(':').map(Number);
        const days = Array.isArray(rule.days) ? rule.days : [0, 1, 2, 3, 4, 5, 6];

        for (const day of days) {
          // Capacitor weekday: 1 = Sunday, 2 = Monday, ... 7 = Saturday
          const capWeekday = (day % 7) + 1;
          notificationsToSchedule.push({
            id: idCounter++,
            title: rule.title || 'Tarjuma Quran Reminder 📖',
            body: rule.body || 'Listen to Quran recitation today.',
            channelId: 'admin_campaigns',
            schedule: {
              on: {
                weekday: capWeekday,
                hour: hours,
                minute: minutes
              },
              repeats: true,
              allowWhileIdle: true
            },
            extra: {
              action: rule.action || 'open_app',
              targetId: rule.targetId || ''
            }
          });
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
        console.log(`Scheduled ${notificationsToSchedule.length} native recurring notifications.`);
      }
    }
  } catch (err) {
    console.error('Failed to schedule recurring notification rules:', err);
  }
};

// Trigger an immediate browser / native notification (with optional deep-linking extra data)
export const sendImmediateNotification = async (title, body, extraData = {}) => {
  try {
    let hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      hasPermission = await requestNotificationPermission();
    }
    if (!hasPermission) {
      console.warn('Cannot send notification: permission was not granted by user.');
      return false;
    }

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.createChannel({
        id: 'admin_campaigns',
        name: 'Quran Announcements & Reminders',
        description: 'Scheduled recitations, weekly Surah reminders, and instant alerts',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true
      });

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 10000) + 1000,
            title,
            body,
            channelId: 'admin_campaigns',
            schedule: { at: new Date(Date.now() + 200) },
            extra: extraData
          }
        ]
      });
      return true;
    } else if ('Notification' in window) {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        data: extraData
      });
      return true;
    }
  } catch (err) {
    console.error('Failed to send immediate notification:', err);
    return false;
  }
};
