import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronRight, Play, Headphones, Download, Volume2, Info, Moon, Type, Globe, Smartphone, Target, Bell, Clock, HardDrive, Wifi, Star, MessageSquare, FileText, ExternalLink, Share2, Copy, Check, ShieldAlert, Eye, EyeOff, X, Sparkles } from 'lucide-react';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import usePreferencesStore from '../../stores/preferencesStore';
import usePlayerStore from '../../stores/playerStore';
import { supabase } from '../../utils/supabaseClient';
import { requestNotificationPermission } from '../../utils/notificationService';
import { submitUserFeedback } from '../../services/adminService';
import ClockPicker from '../../components/ClockPicker/ClockPicker';
import './SettingsScreen.css';

const MODE_LABELS = {
  1: 'Arabic Only (Surah)',
  2: 'Arabic + Hindi (Para)',
  3: 'Hindi Only (Para)',
  4: 'Arabic + Hindi (Surah)',
  5: 'Arabic Surah-wise'
};

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5];
const TEXT_SIZE_OPTIONS = ['SMALL', 'MEDIUM', 'LARGE'];
const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const QUALITY_OPTIONS = ['STANDARD', 'HIGH'];

export default function SettingsScreen() {
  const {
    defaultMode, setDefaultMode,
    defaultPlaybackSpeed, setDefaultPlaybackSpeed,
    autoPlayNextSurah, setAutoPlayNextSurah,
    arabicTextSize, setArabicTextSize,
    keepScreenAwake, setKeepScreenAwake,
    dailyGoalMinutes, setDailyGoalMinutes,
    goalRemindersEnabled, setGoalReminders,
    goalReminderTime, setGoalReminderTime,
    audioQuality, setAudioQuality,
    smartWifiPrefetchEnabled, setSmartWifiPrefetchEnabled,
  } = usePreferencesStore();

  const { userId } = usePreferencesStore();
  const setHideMiniPlayer = usePlayerStore(state => state.setHideMiniPlayer);
  const [expandedSetting, setExpandedSetting] = useState(null);
  const [showClockPicker, setShowClockPicker] = useState(false);
  const [appVersion, setAppVersion] = useState('2.1.0');

  // Sync / Backup States
  const [syncKey, setSyncKey] = useState(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [restoreKeyInput, setRestoreKeyInput] = useState('');
  const [syncStatus, setSyncStatus] = useState({ type: null, message: '' });
  const [copied, setCopied] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // In-App Feedback States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('feature_request');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Automatically hide mini player whenever a modal or clock picker is opened
  useEffect(() => {
    const isAnyModalOpen = showSyncModal || showClockPicker || showFeedbackModal;
    setHideMiniPlayer(isAnyModalOpen);
    return () => setHideMiniPlayer(false);
  }, [showSyncModal, showClockPicker, showFeedbackModal, setHideMiniPlayer]);

  useEffect(() => {
    const fetchSyncKey = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('device_user_mappings')
          .select('sync_key')
          .eq('user_id', userId)
          .maybeSingle();

        if (data && data.sync_key) {
          setSyncKey(data.sync_key);
        }
      } catch (err) {
        console.warn('Failed to fetch sync key on mount:', err);
      }
    };
    fetchSyncKey();
  }, [userId]);

  const handleGenerateKey = async () => {
    if (!userId) return;
    setIsGeneratingKey(true);
    setSyncStatus({ type: null, message: '' });

    try {
      // 1. Resolve UUID
      let targetUuid = null;
      try {
        const { PersistentUuid } = await import('@capgo/capacitor-persistent-uuid');
        const res = await PersistentUuid.getId();
        targetUuid = res.id;
      } catch (e) {
        targetUuid = localStorage.getItem('tarjuma_device_uuid') || localStorage.getItem('tarjuma_device_uuid_override');
      }

      if (!targetUuid) {
        // Generate fallback
        targetUuid = 'web_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('tarjuma_device_uuid', targetUuid);
      }

      // Generate unique TRJM-XXXX-YYYY key
      const generateKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segment = (len) => {
          let s = '';
          for (let i = 0; i < len; i++) {
            s += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return s;
        };
        return `TRJM-${segment(4)}-${segment(4)}`;
      };

      const newKey = generateKey();

      const { error: upsertErr } = await supabase
        .from('device_user_mappings')
        .upsert({
          device_uuid: targetUuid,
          user_id: userId,
          sync_key: newKey
        });

      if (upsertErr) throw upsertErr;

      setSyncKey(newKey);
      setSyncStatus({ type: 'success', message: 'Backup key generated successfully!' });
    } catch (err) {
      console.error('Failed to generate sync key:', err);
      setSyncStatus({ type: 'error', message: 'Failed to generate key. Try again.' });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyKey = async () => {
    if (!syncKey) return;
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(syncKey);
      } else {
        // Fallback for Capacitor/Android WebView
        const textArea = document.createElement('textarea');
        textArea.value = syncKey;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // Last resort: prompt user to copy manually
      window.prompt('Copy this key:', syncKey);
    }
  };

  const handleRestoreBackup = async () => {
    const key = restoreKeyInput.trim().toUpperCase();
    if (!key) return;

    setSyncStatus({ type: 'info', message: 'Restoring backup data...' });

    try {
      const { data, error } = await supabase
        .from('device_user_mappings')
        .select('device_uuid')
        .eq('sync_key', key)
        .maybeSingle();

      if (error || !data) {
        setSyncStatus({ type: 'error', message: 'Invalid Backup Key. Please check and try again.' });
        return;
      }

      // Found the device uuid mapping!
      localStorage.setItem('tarjuma_device_uuid_override', data.device_uuid);
      setSyncStatus({ type: 'success', message: 'Data synced successfully! Reloading app...' });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Failed to restore backup:', err);
      setSyncStatus({ type: 'error', message: 'Sync failed. Check connection and try again.' });
    }
  };

  useEffect(() => {
    async function loadAppVersion() {
      try {
        const info = await App.getInfo();
        if (info && info.version) {
          setAppVersion(info.version);
        }
      } catch (e) {
        console.warn('Capacitor App plugin not available, using default version');
      }
    }
    loadAppVersion();
  }, []);

  const handleOpenFeedbackModal = (category = 'feature_request') => {
    setFeedbackCategory(category);
    setFeedbackTitle('');
    setFeedbackMsg('');
    setFeedbackRating(5);
    setFeedbackSuccess(false);
    setShowFeedbackModal(true);
  };

  const handleSubmitInAppFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackTitle.trim() || !feedbackMsg.trim()) return;

    setIsSendingFeedback(true);
    try {
      let deviceUuid = localStorage.getItem('tarjuma_device_uuid') || 'anonymous_user';
      const res = await submitUserFeedback({
        userId: deviceUuid,
        rating: feedbackRating,
        category: feedbackCategory,
        title: feedbackTitle,
        message: feedbackMsg
      });

      if (res.success) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSuccess(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to submit in-app feedback:', err);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleFeedbackClick = (type) => {
    const isBug = type === 'bug';
    const email = 'tarjumaapp@proton.me';
    const subject = isBug
      ? `[Tarjuma App v${appVersion}] Bug Report`
      : `[Tarjuma App v${appVersion}] Feature Request`;

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const body = isBug
      ? `Assalamu Alaikum Tarjuma Team,\n\nI would like to report an issue in the Tarjuma app:\n\n---\nIssue Description:\n[Please describe the bug or issue you encountered]\n\nSteps to Reproduce:\n1. \n2. \n3. \n\nExpected Behavior:\n\nActual Behavior:\n\n---\nApp Version: ${appVersion}\nDevice Info: ${userAgent}\n---`
      : `Assalamu Alaikum Tarjuma Team,\n\nI would like to suggest a feature or enhancement for the Tarjuma app:\n\n---\nFeature Request:\n[Please describe the feature, new reciter, or improvement you would like to see]\n\nWhy this would be helpful:\n\n---\nApp Version: ${appVersion}\n---`;

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const handleShareApp = async () => {
    const shareMessage = "Assalamalaikum! Check out Tarjuma, a beautiful Quran listening app with translations and ambient background sounds.";
    const shareUrl = "https://tarjumaapp.vercel.app";

    try {
      const { Share } = await import('@capacitor/share');
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: 'Tarjuma App',
          text: shareMessage,
          url: shareUrl,
          dialogTitle: 'Share Tarjuma App',
        });
        return;
      }
    } catch (e) {
      console.warn('Capacitor Share plugin not available, using fallback', e);
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tarjuma App',
          text: shareMessage,
          url: shareUrl,
        });
      } catch (err) {
        console.warn('Web share failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
        alert('Link and share message copied to clipboard!');
      } catch (err) {
        console.error('Clipboard copy failed', err);
      }
    }
  };

  const toggleDropdown = (setting) => {
    setExpandedSetting(expandedSetting === setting ? null : setting);
  };

  return (
    <div className="screen settings-screen" id="settings-screen">
      <div className="screen-header">
        <h1 className="text-title">Settings</h1>
      </div>

      {/* Playback */}
      <section className="settings-group">
        <h3 className="settings-group-title">Playback</h3>
        <div className="glass-card settings-card">
          <div className="settings-row-container">
            <div className="settings-row" onClick={() => toggleDropdown('mode')}>
              <div className="settings-row-left">
                <Play size={18} color="var(--color-orange)" />
                <span>Default content mode</span>
              </div>
              <div className="settings-row-right">
                <span className="text-secondary">{MODE_LABELS[defaultMode]}</span>
                <ChevronRight size={16} color="var(--color-muted)" className={expandedSetting === 'mode' ? 'rotate-90' : ''} />
              </div>
            </div>

            {expandedSetting === 'mode' && (
              <div className="inline-settings-dropdown">
                {[1, 2, 3, 4, 5].map(m => (
                  <button
                    key={m}
                    className={`dropdown-option ${defaultMode === m ? 'active' : ''}`}
                    onClick={() => {
                      setDefaultMode(m);
                      setExpandedSetting(null);
                    }}
                  >
                    <span>{MODE_LABELS[m]}</span>
                    {defaultMode === m && <span className="check-icon">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="divider" />

          <div className="settings-row-container">
            <div className="settings-row" onClick={() => toggleDropdown('speed')}>
              <div className="settings-row-left">
                <Headphones size={18} color="var(--color-orange)" />
                <span>Playback speed</span>
              </div>
              <div className="settings-row-right">
                <span className="text-secondary">{defaultPlaybackSpeed}×</span>
                <ChevronRight size={16} color="var(--color-muted)" className={expandedSetting === 'speed' ? 'rotate-90' : ''} />
              </div>
            </div>

            {expandedSetting === 'speed' && (
              <div className="inline-settings-dropdown">
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`dropdown-option ${defaultPlaybackSpeed === s ? 'active' : ''}`}
                    onClick={() => {
                      setDefaultPlaybackSpeed(s);
                      setExpandedSetting(null);
                    }}
                  >
                    <span>{s}×</span>
                    {defaultPlaybackSpeed === s && <span className="check-icon">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={() => setAutoPlayNextSurah(!autoPlayNextSurah)}>
            <div className="settings-row-left">
              <Play size={18} color="var(--color-orange)" />
              <span>Auto-play next Surah</span>
            </div>
            <div className={`toggle-switch ${autoPlayNextSurah ? 'active' : ''}`} />
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={() => setSmartWifiPrefetchEnabled(!smartWifiPrefetchEnabled)}>
            <div className="settings-row-left">
              <Wifi size={18} color="var(--color-orange)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>Smart Wi-Fi prefetching</span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Auto-download next 2–3 chapters in queue over Wi-Fi
                </span>
              </div>
            </div>
            <div className={`toggle-switch ${smartWifiPrefetchEnabled ? 'active' : ''}`} />
          </div>
        </div>
      </section>

      {/* Display */}
      <section className="settings-group">
        <h3 className="settings-group-title">Display</h3>
        <div className="glass-card settings-card">
          <div className="settings-row-container">
            <div className="settings-row" onClick={() => toggleDropdown('textSize')}>
              <div className="settings-row-left">
                <Type size={18} color="var(--color-orange)" />
                <span>Arabic text size</span>
              </div>
              <div className="settings-row-right">
                <span className="text-secondary">
                  {arabicTextSize === 'SMALL' ? 'Small' : arabicTextSize === 'LARGE' ? 'Large' : 'Medium'}
                </span>
                <ChevronRight size={16} color="var(--color-muted)" className={expandedSetting === 'textSize' ? 'rotate-90' : ''} />
              </div>
            </div>

            {expandedSetting === 'textSize' && (
              <div className="inline-settings-dropdown">
                {TEXT_SIZE_OPTIONS.map(size => {
                  const label = size === 'SMALL' ? 'Small' : size === 'LARGE' ? 'Large' : 'Medium';
                  return (
                    <button
                      key={size}
                      className={`dropdown-option ${arabicTextSize === size ? 'active' : ''}`}
                      onClick={() => {
                        setArabicTextSize(size);
                        setExpandedSetting(null);
                      }}
                    >
                      <span>{label}</span>
                      {arabicTextSize === size && <span className="check-icon">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>



          <div className="divider" />

          <div className="settings-row" onClick={() => setKeepScreenAwake(!keepScreenAwake)}>
            <div className="settings-row-left">
              <Smartphone size={18} color="var(--color-orange)" />
              <span>Screen keep-awake</span>
            </div>
            <div className={`toggle-switch ${keepScreenAwake ? 'active' : ''}`} />
          </div>
        </div>
      </section>

      {/* Recitation Goals */}
      <section className="settings-group">
        <h3 className="settings-group-title">Recitation Goals</h3>
        <div className="glass-card settings-card">
          <div className="settings-row-container">
            <div className="settings-row" onClick={() => toggleDropdown('dailyGoal')}>
              <div className="settings-row-left">
                <Target size={18} color="var(--color-orange)" />
                <span>Daily goal</span>
              </div>
              <div className="settings-row-right">
                <span className="text-secondary">{dailyGoalMinutes} minutes</span>
                <ChevronRight size={16} color="var(--color-muted)" className={expandedSetting === 'dailyGoal' ? 'rotate-90' : ''} />
              </div>
            </div>

            {expandedSetting === 'dailyGoal' && (
              <div className="inline-settings-dropdown">
                {DAILY_GOAL_OPTIONS.map(g => (
                  <button
                    key={g}
                    className={`dropdown-option ${dailyGoalMinutes === g ? 'active' : ''}`}
                    onClick={() => {
                      setDailyGoalMinutes(g);
                      setExpandedSetting(null);
                    }}
                  >
                    <span>{g} minutes</span>
                    {dailyGoalMinutes === g && <span className="check-icon">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={async () => {
            const nextVal = !goalRemindersEnabled;
            if (nextVal) {
              await requestNotificationPermission();
            }
            setGoalReminders(nextVal);
          }}>
            <div className="settings-row-left">
              <Bell size={18} color="var(--color-orange)" />
              <span>Goal reminders</span>
            </div>
            <div className={`toggle-switch ${goalRemindersEnabled ? 'active' : ''}`} />
          </div>

          {goalRemindersEnabled && (
            <>
              <div className="divider" />
              <div className="settings-row" onClick={() => setShowClockPicker(true)}>
                <div className="settings-row-left">
                  <Clock size={18} color="var(--color-orange)" />
                  <span>Reminder time</span>
                </div>
                <div className="settings-row-right">
                  <span className="text-secondary">{goalReminderTime}</span>
                  <ChevronRight size={16} color="var(--color-muted)" />
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Account & Data */}
      <section className="settings-group">
        <h3 className="settings-group-title">Account & Data</h3>
        <div className="glass-card settings-card">
          <div className="settings-row" onClick={() => setShowSyncModal(true)}>
            <div className="settings-row-left">
              <HardDrive size={18} color="var(--color-muted)" />
              <span>Data Sync & Backup</span>
            </div>
            <div className="settings-row-right">
              <span className="text-secondary">{syncKey ? 'Linked' : 'Not Generated'}</span>
              <ChevronRight size={16} color="var(--color-muted)" />
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="settings-group">
        <h3 className="settings-group-title">About</h3>
        <div className="glass-card settings-card">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <div className="settings-row-left">
              <Info size={18} color="var(--color-muted)" />
              <span>App version</span>
            </div>
            <div className="settings-row-right">
              <span className="text-secondary" style={{ fontWeight: '600' }}>v{appVersion}</span>
            </div>
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={() => handleFeedbackClick('bug')}>
            <div className="settings-row-left">
              <MessageSquare size={18} color="var(--color-muted)" />
              <span>Report Bug</span>
            </div>
            <ChevronRight size={16} color="var(--color-muted)" />
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={() => handleFeedbackClick('feature')}>
            <div className="settings-row-left">
              <MessageSquare size={18} color="var(--color-muted)" />
              <span>Request Feature</span>
            </div>
            <ChevronRight size={16} color="var(--color-muted)" />
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={handleShareApp}>
            <div className="settings-row-left">
              <Share2 size={18} color="var(--color-muted)" />
              <span>Share App</span>
            </div>
            <ChevronRight size={16} color="var(--color-muted)" />
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={() => window.open('https://forms.gle/51EzxYnAeyVArd6j6', '_blank')}>
            <div className="settings-row-left">
              <Star size={18} color="var(--color-muted)" />
              <span>Rate the app</span>
            </div>
            <ExternalLink size={16} color="var(--color-muted)" />
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={() => window.open('https://tarjumaapp.vercel.app/privacy-policy', '_blank')}>
            <div className="settings-row-left">
              <FileText size={18} color="var(--color-muted)" />
              <span>Privacy Policy</span>
            </div>
            <ExternalLink size={16} color="var(--color-muted)" />
          </div>

          <div className="divider" />

          <div className="settings-row" onClick={() => window.open('https://tarjumaapp.vercel.app/terms', '_blank')}>
            <div className="settings-row-left">
              <FileText size={18} color="var(--color-muted)" />
              <span>Terms of Service</span>
            </div>
            <ExternalLink size={16} color="var(--color-muted)" />
          </div>
        </div>
      </section>

      {showSyncModal && ReactDOM.createPortal(
        <div className="profile-modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="glass-sheet profile-modal-content sync-modal-content" onClick={e => e.stopPropagation()}>
            <div className="drag-handle" onClick={() => setShowSyncModal(false)} />

            <button className="profile-close-btn" onClick={() => setShowSyncModal(false)}>
              <X size={20} />
            </button>

            <div className="profile-modal-body sync-modal-body">
              {/* Header Title */}
              <div className="profile-title-container">
                <HardDrive size={18} color="var(--color-muted)" />
                <span className="profile-title-label">Data Sync & Backup</span>
              </div>

              <p className="sync-description" style={{ textAlign: 'center', marginBottom: '24px' }}>
                Generate a backup key to sync your historical streaks, custom settings, and favorites to another device.
              </p>

              {syncKey ? (
                /* Alphanumeric backup key card */
                <div className="sync-key-card">
                  <span className="sync-key-label">Unique Sync / Backup Key</span>
                  <div className="sync-key-display-row">
                    <span className="sync-key-value">
                      {showKey ? syncKey : '••••-••••-••••'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="sync-copy-btn"
                        onClick={() => setShowKey(!showKey)}
                        aria-label={showKey ? "Hide Key" : "Show Key"}
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button className="sync-copy-btn" onClick={handleCopyKey} aria-label="Copy Key">
                        {copied ? <Check size={16} color="var(--color-green)" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  <span className="sync-key-hint">Save this key in a secure location.</span>
                </div>
              ) : (
                <button
                  className="sync-generate-btn"
                  onClick={handleGenerateKey}
                  disabled={isGeneratingKey}
                >
                  {isGeneratingKey ? 'Generating...' : 'Generate Data Backup Key'}
                </button>
              )}

              <div className="divider" style={{ margin: '24px 0' }} />

              {/* Restore panel */}
              <div className="sync-restore-panel">
                <span className="sync-restore-label">Restore Existing Backup</span>
                <div className="sync-restore-input-row">
                  <input
                    type="text"
                    placeholder="Enter key (e.g. TRJM-XXXX-YYYY)"
                    className="sync-restore-input"
                    value={restoreKeyInput}
                    onChange={(e) => setRestoreKeyInput(e.target.value)}
                    maxLength={19}
                  />
                  <button
                    className="sync-restore-submit-btn"
                    onClick={handleRestoreBackup}
                    disabled={!restoreKeyInput.trim()}
                  >
                    Restore
                  </button>
                </div>
              </div>

              {syncStatus.message && (
                <div className={`sync-status-msg ${syncStatus.type}`} style={{ marginTop: '16px' }}>
                  {syncStatus.type === 'error' && <ShieldAlert size={14} style={{ marginRight: 6 }} />}
                  <span>{syncStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        , document.body)}

      {showFeedbackModal && ReactDOM.createPortal(
        <div className="profile-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="glass-sheet profile-modal-content sync-modal-content" style={{ maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="drag-handle" onClick={() => setShowFeedbackModal(false)} />

            <button className="profile-close-btn" onClick={() => setShowFeedbackModal(false)}>
              <X size={20} />
            </button>

            <div className="profile-modal-body sync-modal-body">
              <div className="profile-title-container">
                <MessageSquare size={18} color="var(--color-muted)" />
                <span className="profile-title-label">Feedback & Feature Request</span>
              </div>

              {feedbackSuccess ? (
                <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <Check size={48} color="#34d399" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ color: '#ffffff', margin: '0 0 8px' }}>JazakAllah Khair!</h3>
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                    Your feedback has been received directly by the Tarjuma development team.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitInAppFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Category Selector */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                      Feedback Type
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'feature_request', label: 'Feature Request' },
                        { id: 'bug_report', label: 'Bug Report' },
                        { id: 'reciter_request', label: 'Reciter Request' },
                        { id: 'general', label: 'General Feedback' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`glass-pill ${feedbackCategory === cat.id ? 'active' : ''}`}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: feedbackCategory === cat.id ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '20px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setFeedbackCategory(cat.id)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                      Overall App Experience
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          onClick={() => setFeedbackRating(star)}
                        >
                          <Star
                            size={24}
                            fill={star <= feedbackRating ? '#fbbf24' : 'none'}
                            color={star <= feedbackRating ? '#fbbf24' : '#64748b'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                      Topic / Title
                    </label>
                    <input
                      type="text"
                      className="sync-restore-input"
                      style={{ width: '100%', borderRadius: '8px' }}
                      placeholder="Brief summary..."
                      value={feedbackTitle}
                      onChange={e => setFeedbackTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Details */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                      Details / Suggestions
                    </label>
                    <textarea
                      className="sync-restore-input"
                      rows={3}
                      style={{ width: '100%', borderRadius: '8px', padding: '10px' }}
                      placeholder="Tell us what you loved or what we can improve..."
                      value={feedbackMsg}
                      onChange={e => setFeedbackMsg(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="sync-restore-submit-btn"
                    style={{ width: '100%', marginTop: '6px', height: '42px' }}
                    disabled={isSendingFeedback}
                  >
                    {isSendingFeedback ? 'Submitting...' : 'Send Feedback to Tarjuma Team'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
        , document.body)}

      {showClockPicker && (
        <ClockPicker
          value={goalReminderTime}
          onChange={setGoalReminderTime}
          onClose={() => setShowClockPicker(false)}
        />
      )}
    </div>
  );
}
