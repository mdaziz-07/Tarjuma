import { supabase } from '../utils/supabaseClient';
import surahs from '../data/surahs.json';
import scholars from '../data/scholars.json';
import { DEFAULT_UPDATE_NOTES_TEXT, CURRENT_APP_VERSION } from '../data/changelogs';

// Admin password is stored remotely in Supabase app_config (key: 'admin_password')
// SECURITY: No hardcoded fallback — password must be set in the database

// Default Curated Collections (real template playlists for the app)
export const DEFAULT_CURATED_PLAYLISTS = [
  {
    id: 'favourites',
    title: 'Favourites Mix',
    subtitle: 'Specially made for You',
    creator: 'by Quranify',
    description: 'Your bookmarked Surahs and Paras, compiled in one mix.',
    gradient: 'linear-gradient(135deg, #e0245e 0%, #f65288 100%)',
    shadowColor: 'rgba(224, 36, 94, 0.3)',
    isDynamic: true,
    order: 0,
    isActive: true,
  },
  {
    id: 'focus',
    title: 'For Focus & Work Mix',
    subtitle: 'Specially made for You',
    creator: 'by Quranify',
    description: 'Immersive audio crafted to help you enter a deep, uninterrupted flow.',
    gradient: 'linear-gradient(135deg, #d82e1b 0%, #f6941b 100%)',
    shadowColor: 'rgba(216, 46, 27, 0.3)',
    surahIds: [2, 3, 4, 5, 23, 25],
    order: 1,
    isActive: true,
  },
  {
    id: 'sleep',
    title: 'For Sleep Mix',
    subtitle: 'Specially made for You',
    creator: 'by Quranify',
    description: 'Soft recitations to calm your mind and drift into peaceful sleep.',
    gradient: 'linear-gradient(135deg, #1b68d6 0%, #a824e8 100%)',
    shadowColor: 'rgba(27, 104, 214, 0.3)',
    surahIds: [1, 32, 36, 55, 56, 67],
    order: 2,
    isActive: true,
  },
  {
    id: 'study',
    title: 'For Study Mix',
    subtitle: 'Specially made for You',
    creator: 'by Quranify',
    description: 'Recitations and ambient tones to help you stay clear, focused, and engaged.',
    gradient: 'linear-gradient(135deg, #0f864e 0%, #15c8a4 100%)',
    shadowColor: 'rgba(15, 134, 78, 0.3)',
    surahIds: [10, 18, 19, 20, 24, 31, 39],
    order: 3,
    isActive: true,
  }
];

// Default In-App Hero Banners (empty by default unless created by admin)
export const DEFAULT_HERO_BANNERS = [];

// Default App Configuration
export const DEFAULT_APP_CONFIG = {
  min_supported_version: '1.0.0',
  latest_version: CURRENT_APP_VERSION,
  apk_url: 'https://tarjumaapp.vercel.app/Tarjuma.apk',
  update_notes: DEFAULT_UPDATE_NOTES_TEXT,
  force_update: false,
  maintenance_mode: {
    isActive: false,
    message: '',
    bannerType: 'warning',
    estimatedEndTime: ''
  }
};

// Default Notification Campaigns (empty by default)
export const DEFAULT_NOTIFICATION_CAMPAIGNS = [];

// Helper: Clear any legacy fake caches from localStorage
const sanitizeLegacyCache = (key, data) => {
  if (!data) return null;
  // If telemetry has old fake DAU 1420
  if (key === 'telemetry_aggregated_metrics' && data.dau === 1420 && data.mau === 18450) {
    localStorage.removeItem(`admin_cache_${key}`);
    return null;
  }
  // If feedback contains old dummy ids
  if (key === 'user_feedback_list' && Array.isArray(data)) {
    const hasDummy = data.some(f => f.id === 'fb_101' || f.id === 'fb_102');
    if (hasDummy) {
      localStorage.removeItem(`admin_cache_${key}`);
      return null;
    }
  }
  // If campaigns contains old dummy campaigns
  if (key === 'notification_campaigns' && Array.isArray(data)) {
    const hasDummy = data.some(c => c.id === 'notif_friday_kahf');
    if (hasDummy) {
      localStorage.removeItem(`admin_cache_${key}`);
      return null;
    }
  }
  return data;
};

// Helper: Fetch a JSON config key from Supabase app_config
export const getRemoteConfigKey = async (key, fallback) => {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data || !data.value) {
      // Check localStorage cached value
      const localVal = localStorage.getItem(`admin_cache_${key}`);
      if (localVal) {
        try {
          const parsed = JSON.parse(localVal);
          const sanitized = sanitizeLegacyCache(key, parsed);
          if (sanitized !== null) return sanitized;
        } catch (e) {
          return localVal;
        }
      }
      return fallback;
    }

    try {
      const parsed = JSON.parse(data.value);
      const sanitized = sanitizeLegacyCache(key, parsed);
      if (sanitized !== null) {
        localStorage.setItem(`admin_cache_${key}`, data.value);
        return sanitized;
      }
      return fallback;
    } catch (parseErr) {
      return data.value;
    }
  } catch (err) {
    // SECURITY: Mask error details — do not expose internals
    if (import.meta.env.DEV) console.warn(`Config fetch failed [${key}]:`, err);
    return fallback;
  }
};

// Helper: Save a JSON config key to Supabase app_config
export const setRemoteConfigKey = async (key, value) => {
  try {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(`admin_cache_${key}`, stringVal);

    const { error } = await supabase
      .from('app_config')
      .upsert({
        key,
        value: stringVal,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      if (import.meta.env.DEV) console.error(`Config save failed [${key}]:`, error);
      return { success: false, error: { message: 'Unable to save configuration', code: 'CONFIG_SAVE_FAILED' } };
    }
    return { success: true };
  } catch (err) {
    if (import.meta.env.DEV) console.error(`Config save failed [${key}]:`, err);
    return { success: false, error: { message: 'Unable to save configuration', code: 'CONFIG_SAVE_FAILED' } };
  }
};

// -------------------------------------------------------------
// 1. Authentication
// -------------------------------------------------------------
export const verifyAdminPassword = async (inputPassword) => {
  try {
    if (!inputPassword || typeof inputPassword !== 'string' || inputPassword.length < 6) {
      return false;
    }
    const savedPassword = await getRemoteConfigKey('admin_password', null);
    // SECURITY: Only compare against the remotely stored password — no hardcoded fallback
    if (!savedPassword) {
      if (import.meta.env.DEV) console.warn('Admin password not configured in Supabase app_config');
      return false;
    }
    const isValid = inputPassword === savedPassword;
    if (isValid) {
      sessionStorage.setItem('tarjuma_admin_session', 'authenticated_' + Date.now());
    }
    return isValid;
  } catch (err) {
    // SECURITY: Deny access on error — never fall back to hardcoded credentials
    if (import.meta.env.DEV) console.error('Admin auth check failed:', err);
    return false;
  }
};

export const isSessionAuthenticated = () => {
  const token = sessionStorage.getItem('tarjuma_admin_session');
  return !!token && token.startsWith('authenticated_');
};

export const clearAdminSession = () => {
  sessionStorage.removeItem('tarjuma_admin_session');
};

export const updateAdminPassword = async (newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }
  return await setRemoteConfigKey('admin_password', newPassword);
};

// -------------------------------------------------------------
// 2. Curated Playlists & Collections
// -------------------------------------------------------------
export const getCuratedPlaylists = async () => {
  return await getRemoteConfigKey('curated_playlists', DEFAULT_CURATED_PLAYLISTS);
};

export const saveCuratedPlaylists = async (playlists) => {
  return await setRemoteConfigKey('curated_playlists', playlists);
};

// -------------------------------------------------------------
// 3. Dynamic Hero Announcements & Banners
// -------------------------------------------------------------
export const getHeroBanners = async () => {
  return await getRemoteConfigKey('hero_banners', DEFAULT_HERO_BANNERS);
};

export const saveHeroBanners = async (banners) => {
  return await setRemoteConfigKey('hero_banners', banners);
};

export const getActiveHeroBanner = async () => {
  const banners = await getHeroBanners();
  if (!banners || !Array.isArray(banners)) return null;

  const nowStr = new Date().toISOString().split('T')[0];
  const activeBanner = banners.find(b => {
    if (!b.isActive) return false;
    if (b.startDate && b.startDate > nowStr) return false;
    if (b.endDate && b.endDate < nowStr) return false;
    return true;
  });

  return activeBanner || null;
};

// -------------------------------------------------------------
// 4. Version Control & Maintenance Mode
// -------------------------------------------------------------
export const getAppGlobalConfig = async () => {
  return await getRemoteConfigKey('global_app_config', DEFAULT_APP_CONFIG);
};

export const saveAppGlobalConfig = async (config) => {
  // Normalize apk_url so it always targets Tarjuma.apk
  let normalizedApkUrl = config.apk_url || 'https://tarjumaapp.vercel.app/Tarjuma.apk';
  if (!normalizedApkUrl.endsWith('.apk') && normalizedApkUrl.includes('tarjumaapp.vercel.app')) {
    normalizedApkUrl = `${normalizedApkUrl.replace(/\/+$/, '')}/Tarjuma.apk`;
  }
  const cleanConfig = {
    ...config,
    apk_url: normalizedApkUrl
  };

  if (cleanConfig.latest_version) {
    await setRemoteConfigKey('latest_version', cleanConfig.latest_version);
  }
  await setRemoteConfigKey('apk_url', normalizedApkUrl);
  return await setRemoteConfigKey('global_app_config', cleanConfig);
};

// -------------------------------------------------------------
// 5. Push Notification Campaigns & Logs
// -------------------------------------------------------------
export const getNotificationCampaigns = async () => {
  return await getRemoteConfigKey('notification_campaigns', DEFAULT_NOTIFICATION_CAMPAIGNS);
};

export const saveNotificationCampaigns = async (campaigns) => {
  return await setRemoteConfigKey('notification_campaigns', campaigns);
};

export const DEFAULT_SCHEDULED_NOTIFICATION_RULES = [
  {
    id: 'rule_friday_kahf',
    title: 'Friday Blessing 🕌',
    body: 'Whoever reads Surah Al-Kahf on Friday will have light between the two Fridays.',
    action: 'play_surah',
    targetId: '18',
    days: [5], // Friday
    time: '09:00',
    isActive: true
  },
  {
    id: 'rule_night_mulk',
    title: 'Night Protection 🌙',
    body: 'Recite Surah Al-Mulk before sleeping for protection and blessings in the grave.',
    action: 'play_surah',
    targetId: '67',
    days: [0, 1, 2, 3, 4, 5, 6], // Every day
    time: '21:30',
    isActive: true
  },
  {
    id: 'rule_monday_thursday',
    title: 'Sunnah Recitation 📖',
    body: 'Deeds are presented on Mondays & Thursdays. Start your day with Surah Ya-Sin.',
    action: 'play_surah',
    targetId: '36',
    days: [1, 4], // Monday & Thursday
    time: '07:00',
    isActive: true
  }
];

export const getScheduledNotificationRules = async () => {
  return await getRemoteConfigKey('scheduled_notification_rules', DEFAULT_SCHEDULED_NOTIFICATION_RULES);
};

export const saveScheduledNotificationRules = async (rules) => {
  return await setRemoteConfigKey('scheduled_notification_rules', rules);
};

export const broadcastNotificationCampaign = async (campaign) => {
  try {
    const existing = await getNotificationCampaigns();
    const newEntry = {
      ...campaign,
      id: campaign.id || 'camp_' + Date.now(),
      sentAt: new Date().toISOString(),
      sentCount: campaign.sentCount || 1,
      clickedCount: 0,
      status: 'Broadcasted'
    };

    const updated = [newEntry, ...(Array.isArray(existing) ? existing : [])];
    const saveListRes = await saveNotificationCampaigns(updated);
    if (saveListRes && saveListRes.success === false) {
      return { success: false, error: saveListRes.error || { message: 'Database save failed' } };
    }

    // Also set active_broadcast for instant in-app receiver trigger
    const broadcastRes = await setRemoteConfigKey('latest_push_broadcast', newEntry);
    if (broadcastRes && broadcastRes.success === false) {
      return { success: false, error: broadcastRes.error || { message: 'Push broadcast trigger failed' } };
    }

    return { success: true, campaign: newEntry };
  } catch (err) {
    if (import.meta.env.DEV) console.error('Campaign broadcast failed:', err);
    return { success: false, error: { message: err.message || 'Unable to broadcast campaign', code: 'BROADCAST_FAILED' } };
  }
};

export const testSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('app_config').select('key').limit(1);
    if (error) throw error;
    return { connected: true, details: 'Connected to Supabase Cloud' };
  } catch (err) {
    return { connected: false, error: err.message || 'Connection failed' };
  }
};

// -------------------------------------------------------------
// 6. User Feedback & Feature Requests
// -------------------------------------------------------------
export const getUserFeedbackList = async () => {
  return await getRemoteConfigKey('user_feedback_list', []);
};

export const submitUserFeedback = async (feedbackData) => {
  try {
    // SECURITY: Input validation — reject malformed or oversized payloads
    if (!feedbackData || typeof feedbackData !== 'object') {
      return { success: false, error: { message: 'Invalid feedback data', code: 'INVALID_INPUT' } };
    }
    const message = String(feedbackData.message || '').slice(0, 2000);
    const title = String(feedbackData.title || 'Feedback').slice(0, 200);
    const category = String(feedbackData.category || 'general').slice(0, 50);
    const rating = Math.max(1, Math.min(5, Math.round(Number(feedbackData.rating) || 5)));
    const userId = feedbackData.userId || 'anonymous_user';
    const feedbackId = 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    // 1. Insert into app_feedback table — enforces PostgreSQL rate limiting trigger (max 5/hr)
    const { error: dbError } = await supabase
      .from('app_feedback')
      .insert({
        id: feedbackId,
        user_id: userId,
        rating,
        category,
        title,
        message,
        status: 'new',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      if (dbError.message?.includes('Rate limit exceeded')) {
        return {
          success: false,
          error: {
            message: 'Rate limit reached: Maximum 5 feedback submissions per hour. Please try again later.',
            code: 'RATE_LIMITED'
          }
        };
      }
      if (import.meta.env.DEV) console.warn('Database feedback insert note:', dbError);
    }

    // 2. Sync to user_feedback_list in app_config for Admin Panel instant sync
    const list = await getUserFeedbackList();
    const newEntry = {
      id: feedbackId,
      userId,
      rating,
      category,
      title,
      message,
      createdAt: new Date().toISOString(),
      status: 'new',
      adminNote: ''
    };

    const updated = [newEntry, ...list.slice(0, 99)]; // Keep max 100 entries in cache
    await setRemoteConfigKey('user_feedback_list', updated);
    return { success: true, entry: newEntry };
  } catch (err) {
    if (import.meta.env.DEV) console.error('Feedback submission failed:', err);
    return { success: false, error: { message: 'Unable to process request', code: 'FEEDBACK_FAILED' } };
  }
};

export const updateFeedbackStatus = async (feedbackId, status, adminNote = '') => {
  try {
    const list = await getUserFeedbackList();
    const updated = list.map(item => {
      if (item.id === feedbackId) {
        return {
          ...item,
          status: status || item.status,
          adminNote: adminNote !== undefined ? adminNote : item.adminNote
        };
      }
      return item;
    });
    await setRemoteConfigKey('user_feedback_list', updated);
    return { success: true };
  } catch (err) {
    if (import.meta.env.DEV) console.error('Feedback status update failed:', err);
    return { success: false, error: { message: 'Unable to update status', code: 'UPDATE_FAILED' } };
  }
};

// -------------------------------------------------------------
// 7. Telemetry & Real Analytics from Database
// -------------------------------------------------------------
export const getAggregatedTelemetry = async () => {
  try {
    // 1. Query device / user count from device_user_mappings
    const { count: deviceCount } = await supabase
      .from('device_user_mappings')
      .select('*', { count: 'exact', head: true });

    // 2. Query listening sessions from Supabase
    const { data: sessions, error: sessErr } = await supabase
      .from('listening_sessions')
      .select('*');

    if (sessErr) {
      console.warn('Could not query listening_sessions table:', sessErr);
    }

    const allSessions = sessions || [];
    const totalSessions = allSessions.length;

    // Calculate real DAU / MAU based on session dates & unique users
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dauUsers = new Set();
    const mauUsers = new Set();
    let totalDurationSeconds = 0;
    const surahPlays = {};
    const scholarPlays = {};

    allSessions.forEach(s => {
      const sDate = new Date(s.started_at || s.session_date);
      if (sDate >= oneDayAgo && s.user_id) {
        dauUsers.add(s.user_id);
      }
      if (sDate >= thirtyDaysAgo && s.user_id) {
        mauUsers.add(s.user_id);
      }

      if (s.duration_seconds) {
        totalDurationSeconds += s.duration_seconds;
      }

      // Content counts
      if (s.content_id) {
        surahPlays[s.content_id] = (surahPlays[s.content_id] || 0) + 1;
      }

      // Scholar counts
      if (s.scholar_id) {
        scholarPlays[s.scholar_id] = (scholarPlays[s.scholar_id] || 0) + 1;
      }
    });

    const avgDuration = totalSessions > 0
      ? Math.round((totalDurationSeconds / totalSessions / 60) * 10) / 10
      : 0;

    const topSurahs = Object.entries(surahPlays)
      .map(([id, plays]) => {
        const surah = surahs.find(s => String(s.id) === String(id));
        return {
          id: Number(id),
          name: surah ? surah.name_transliteration : `Surah ${id}`,
          plays
        };
      })
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 7);

    const totalScholarPlays = Object.values(scholarPlays).reduce((a, b) => a + b, 0);
    const topScholars = Object.entries(scholarPlays)
      .map(([id, count]) => {
        const scholar = scholars.find(sc => sc.id === id);
        return {
          id,
          name: scholar ? scholar.name_transliteration : id,
          share: totalScholarPlays > 0 ? Math.round((count / totalScholarPlays) * 100) : 0
        };
      })
      .sort((a, b) => b.share - a.share)
      .slice(0, 5);

    const dau = dauUsers.size > 0 ? dauUsers.size : (deviceCount || 0);
    const mau = mauUsers.size > 0 ? mauUsers.size : (deviceCount || 0);

    return {
      dau,
      mau,
      totalSessions,
      avgSessionDurationMinutes: avgDuration,
      topSurahs,
      topScholars
    };
  } catch (err) {
    if (import.meta.env.DEV) console.error('Telemetry fetch failed:', err);
    return {
      dau: 0,
      mau: 0,
      totalSessions: 0,
      avgSessionDurationMinutes: 0,
      topSurahs: [],
      topScholars: []
    };
  }
};

export const updateTelemetryAggregates = async (newAggregates) => {
  return await setRemoteConfigKey('telemetry_aggregated_metrics', newAggregates);
};
