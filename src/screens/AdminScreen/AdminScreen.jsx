import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock, Eye, EyeOff, LayoutDashboard, ListMusic, Bell, Image,
  ShieldAlert, BarChart3, MessageSquare, Settings, Check, Plus,
  Trash2, ArrowUp, ArrowDown, Edit2, Send, RefreshCw, LogOut,
  Database, Smartphone, Play, ExternalLink, Calendar, Star,
  Info, AlertTriangle, X, CheckCircle, Search, Sparkles, Palette
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import surahs from '../../data/surahs.json';
import paras from '../../data/paras.json';
import scholars from '../../data/scholars.json';
import {
  verifyAdminPassword,
  isSessionAuthenticated,
  clearAdminSession,
  updateAdminPassword,
  getCuratedPlaylists,
  saveCuratedPlaylists,
  getHeroBanners,
  saveHeroBanners,
  getAppGlobalConfig,
  saveAppGlobalConfig,
  getNotificationCampaigns,
  broadcastNotificationCampaign,
  getScheduledNotificationRules,
  saveScheduledNotificationRules,
  getUserFeedbackList,
  updateFeedbackStatus,
  getAggregatedTelemetry
} from '../../services/adminService';
import { sendImmediateNotification } from '../../utils/notificationService';
import './AdminScreen.css';

export const GRADIENT_PALETTES = [
  { name: 'Rose Ruby', gradient: 'linear-gradient(135deg, #e0245e 0%, #f65288 100%)', accent: '#f65288' },
  { name: 'Flame Amber', gradient: 'linear-gradient(135deg, #d82e1b 0%, #f6941b 100%)', accent: '#f6941b' },
  { name: 'Ocean Twilight', gradient: 'linear-gradient(135deg, #1b68d6 0%, #a824e8 100%)', accent: '#a824e8' },
  { name: 'Emerald Mint', gradient: 'linear-gradient(135deg, #0f864e 0%, #15c8a4 100%)', accent: '#15c8a4' },
  { name: 'Royal Purple', gradient: 'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)', accent: '#ba68c8' },
  { name: 'Midnight Dark', gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', accent: '#f59e0b' },
  { name: 'Golden Sunset', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', accent: '#f59e0b' },
  { name: 'Cyber Neon', gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', accent: '#06b6d4' },
  { name: 'Cosmic Violet', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', accent: '#8b5cf6' },
  { name: 'Deep Forest', gradient: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', accent: '#10b981' },
  { name: 'Coral Peach', gradient: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)', accent: '#fb7185' },
  { name: 'Slate Minimal', gradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)', accent: '#64748b' }
];

export const SOLID_PALETTES = [
  { name: 'Navy Slate', solid: '#0f172a', accent: '#38bdf8' },
  { name: 'Deep Royal', solid: '#1e3a8a', accent: '#60a5fa' },
  { name: 'Forest Green', solid: '#064e3b', accent: '#34d399' },
  { name: 'Wine Rose', solid: '#701a75', accent: '#f472b6' },
  { name: 'Amber Rust', solid: '#7c2d12', accent: '#fb923c' },
  { name: 'Indigo Night', solid: '#312e81', accent: '#818cf8' },
  { name: 'Charcoal', solid: '#18181b', accent: '#a1a1aa' },
  { name: 'Crimson Red', solid: '#991b1b', accent: '#f87171' },
  { name: 'Teal Ocean', solid: '#115e59', accent: '#2dd4bf' },
  { name: 'Deep Emerald', solid: '#047857', accent: '#34d399' },
  { name: 'Dark Bronze', solid: '#78350f', accent: '#fbbf24' },
  { name: 'Velvet Purple', solid: '#581c87', accent: '#c084fc' }
];

export const DAYS_OF_WEEK = [
  { id: 0, label: 'Sun', full: 'Sunday' },
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
];

export const getDaySummaryText = (days = []) => {
  if (!days || days.length === 0) return 'No days selected';
  if (days.length === 7) return 'Every Day';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays (Mon - Fri)';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends (Sat & Sun)';
  if (days.length === 1 && days[0] === 5) return 'Fridays Only 🕌';
  if (days.length === 2 && days.includes(1) && days.includes(4)) return 'Mondays & Thursdays (Sunnah)';
  return days.map(d => DAYS_OF_WEEK.find(x => x.id === d)?.label || d).join(', ');
};

export default function AdminScreen() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(isSessionAuthenticated());
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Active Dashboard Tab
  const [activeTab, setActiveTab] = useState('overview'); // overview, playlists, campaigns, banners, version, telemetry, feedback, settings

  // Core Data States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [syncStatusMsg, setSyncStatusMsg] = useState({ type: null, text: '' });

  // Playlists State
  const [playlists, setPlaylists] = useState([]);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistSearchSurah, setPlaylistSearchSurah] = useState('');
  const [playlistColorTab, setPlaylistColorTab] = useState('gradients'); // 'gradients', 'solids', 'custom-gradient', 'custom-solid'
  const [playlistCustomGrad, setPlaylistCustomGrad] = useState({ c1: '#e0245e', c2: '#f65288', angle: '135deg' });
  const [playlistCustomSolid, setPlaylistCustomSolid] = useState('#1e3a8a');

  // Hero Banners State
  const [banners, setBanners] = useState([]);
  const [editingBanner, setEditingBanner] = useState(null);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerColorTab, setBannerColorTab] = useState('gradients'); // 'gradients', 'solids', 'custom-gradient', 'custom-solid'
  const [bannerCustomGrad, setBannerCustomGrad] = useState({ c1: '#1b68d6', c2: '#a824e8', angle: '135deg' });
  const [bannerCustomSolid, setBannerCustomSolid] = useState('#1e3a8a');

  // App Global Config State & Dirty Checking
  const [appConfig, setAppConfig] = useState(null);
  const [originalAppConfig, setOriginalAppConfig] = useState(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Notifications State
  const [campaignSubTab, setCampaignSubTab] = useState('schedules'); // 'schedules', 'broadcast', 'logs'
  const [scheduledRules, setScheduledRules] = useState([]);
  const [originalScheduledRules, setOriginalScheduledRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    body: '',
    action: 'play_surah',
    targetId: '18',
    scheduledType: 'one_time',
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Telemetry State
  const [telemetry, setTelemetry] = useState(null);

  // Feedback State
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState('all');

  // Change Password State
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Dirty State Computations
  const isAppConfigDirty = useMemo(() => {
    if (!appConfig || !originalAppConfig) return false;
    return JSON.stringify(appConfig) !== JSON.stringify(originalAppConfig);
  }, [appConfig, originalAppConfig]);

  const isRulesDirty = useMemo(() => {
    return JSON.stringify(scheduledRules) !== JSON.stringify(originalScheduledRules);
  }, [scheduledRules, originalScheduledRules]);

  const isCampaignDirty = useMemo(() => {
    return Boolean(newCampaign.title.trim() && newCampaign.body.trim());
  }, [newCampaign]);

  const isPasswordDirty = useMemo(() => {
    return Boolean(
      newAdminPass &&
      confirmAdminPass &&
      newAdminPass.length >= 6 &&
      newAdminPass === confirmAdminPass
    );
  }, [newAdminPass, confirmAdminPass]);

  // Load all remote data on auth
  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      const [pl, bn, cfg, cmp, fb, tel, rules] = await Promise.all([
        getCuratedPlaylists(),
        getHeroBanners(),
        getAppGlobalConfig(),
        getNotificationCampaigns(),
        getUserFeedbackList(),
        getAggregatedTelemetry(),
        getScheduledNotificationRules()
      ]);

      setPlaylists(pl || []);
      setBanners(bn || []);
      setAppConfig(cfg);
      setOriginalAppConfig(JSON.parse(JSON.stringify(cfg || {})));
      setCampaigns(cmp || []);
      setFeedbackList(fb || []);
      setTelemetry(tel);
      setScheduledRules(rules || []);
      setOriginalScheduledRules(JSON.parse(JSON.stringify(rules || [])));
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsVerifying(true);

    try {
      const isValid = await verifyAdminPassword(passwordInput);
      if (isValid) {
        setIsAuthenticated(true);
      } else {
        setAuthError('Invalid Admin Password. Please verify and try again.');
      }
    } catch (err) {
      setAuthError('Connection error during authentication.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const showNotificationToast = (type, text) => {
    setSyncStatusMsg({ type, text });
    setTimeout(() => {
      setSyncStatusMsg({ type: null, text: '' });
    }, 4000);
  };

  // --------------------------------------------------------------------------
  // Playlists Operations
  // --------------------------------------------------------------------------
  const handleMovePlaylist = async (index, direction) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= playlists.length) return;

    const updated = [...playlists];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    const reordered = updated.map((item, idx) => ({ ...item, order: idx }));
    setPlaylists(reordered);
    await saveCuratedPlaylists(reordered);
    showNotificationToast('success', 'Playlists reordered and synced to app.');
  };

  const handleOpenEditPlaylist = (playlist) => {
    setEditingPlaylist({ ...playlist });
    if (playlist.gradient) {
      setPlaylistColorTab('gradients');
    } else {
      setPlaylistColorTab('solids');
      setPlaylistCustomSolid(playlist.solidColor || '#1e3a8a');
    }
    setShowPlaylistModal(true);
  };

  const handleSavePlaylistModal = async (e) => {
    e.preventDefault();
    if (!editingPlaylist || !editingPlaylist.title.trim()) return;

    let updated = [...playlists];
    if (editingPlaylist.isNew) {
      const newEntry = {
        ...editingPlaylist,
        id: editingPlaylist.id || 'pl_' + Date.now(),
        order: playlists.length,
        isNew: undefined,
      };
      updated.push(newEntry);
    } else {
      updated = updated.map(p => p.id === editingPlaylist.id ? editingPlaylist : p);
    }

    setPlaylists(updated);
    setShowPlaylistModal(false);
    setEditingPlaylist(null);

    const res = await saveCuratedPlaylists(updated);
    if (res.success !== false) {
      showNotificationToast('success', 'Playlist saved and published to Home screen.');
    }
  };

  const handleDeletePlaylist = async (id) => {
    if (!window.confirm('Are you sure you want to delete this curated playlist?')) return;
    const updated = playlists.filter(p => p.id !== id);
    setPlaylists(updated);
    await saveCuratedPlaylists(updated);
    showNotificationToast('success', 'Playlist removed.');
  };

  // --------------------------------------------------------------------------
  // Banners Operations
  // --------------------------------------------------------------------------
  const handleOpenEditBanner = (banner) => {
    setEditingBanner({ ...banner });
    if (banner.gradient) {
      setBannerColorTab('gradients');
    } else {
      setBannerColorTab('solids');
      setBannerCustomSolid(banner.bgColor || '#1e3a8a');
    }
    setShowBannerModal(true);
  };

  const handleSaveBannerModal = async (e) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title.trim()) return;

    let updated = [...banners];
    if (editingBanner.isNew) {
      const newEntry = {
        ...editingBanner,
        id: editingBanner.id || 'bn_' + Date.now(),
        isNew: undefined,
      };
      updated.push(newEntry);
    } else {
      updated = updated.map(b => b.id === editingBanner.id ? editingBanner : b);
    }

    setBanners(updated);
    setShowBannerModal(false);
    setEditingBanner(null);

    await saveHeroBanners(updated);
    showNotificationToast('success', 'Hero Announcement Banner saved and synced.');
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Delete this announcement banner?')) return;
    const updated = banners.filter(b => b.id !== id);
    setBanners(updated);
    await saveHeroBanners(updated);
    showNotificationToast('success', 'Banner removed.');
  };

  // --------------------------------------------------------------------------
  // App Global Config / Maintenance & Version Operations
  // --------------------------------------------------------------------------
  const handleSaveAppConfig = async () => {
    if (!appConfig || !isAppConfigDirty) return;
    setIsSavingConfig(true);
    try {
      const res = await saveAppGlobalConfig(appConfig);
      if (res.success !== false) {
        setOriginalAppConfig(JSON.parse(JSON.stringify(appConfig)));
        showNotificationToast('success', 'Version & Maintenance status deployed globally to all devices!');
      } else {
        showNotificationToast('error', 'Failed to deploy configuration.');
      }
    } catch (err) {
      showNotificationToast('error', 'Deployment error.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // --------------------------------------------------------------------------
  // Push Notification Campaign Dispatcher
  // --------------------------------------------------------------------------
  const handleBroadcastCampaign = async (e) => {
    e.preventDefault();
    if (!isCampaignDirty) return;

    setIsBroadcasting(true);
    try {
      const res = await broadcastNotificationCampaign(newCampaign);
      if (res.success) {
        setCampaigns(prev => [res.campaign, ...prev]);
        setNewCampaign({
          title: '',
          body: '',
          action: 'play_surah',
          targetId: '18',
          scheduledType: 'one_time'
        });
        showNotificationToast('success', 'Push notification campaign dispatched to all devices via Supabase Cloud!');
      } else {
        showNotificationToast('error', `Failed to dispatch: ${res.error?.message || 'Database save failed'}`);
      }
    } catch (err) {
      showNotificationToast('error', `Failed to dispatch broadcast: ${err.message || 'Network error'}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Scheduled Recurring Notification Rules Operations (Day-by-Day)
  // --------------------------------------------------------------------------
  const handleSaveScheduledRules = async () => {
    if (!isRulesDirty) return;
    setIsSavingRules(true);
    try {
      const res = await saveScheduledNotificationRules(scheduledRules);
      if (res && res.error) {
        showNotificationToast('error', 'Failed to deploy scheduled notification rules.');
      } else {
        setOriginalScheduledRules(JSON.parse(JSON.stringify(scheduledRules)));
        showNotificationToast('success', 'Scheduled notification rules deployed to all devices!');
      }
    } catch (err) {
      showNotificationToast('error', 'Error deploying notification rules.');
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleToggleRuleActive = (ruleId) => {
    setScheduledRules(prev => prev.map(r => r.id === ruleId ? { ...r, isActive: !r.isActive } : r));
  };

  const handleDeleteRule = (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled notification rule?')) return;
    setScheduledRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleDuplicateRule = (rule) => {
    const duplicated = {
      ...rule,
      id: 'rule_' + Date.now(),
      title: `${rule.title} (Copy)`,
      isActive: false
    };
    setScheduledRules(prev => [duplicated, ...prev]);
    showNotificationToast('success', 'Notification schedule duplicated.');
  };

  const handleOpenEditRule = (rule = null) => {
    if (rule) {
      setEditingRule({ ...rule, days: Array.isArray(rule.days) ? [...rule.days] : [0, 1, 2, 3, 4, 5, 6] });
    } else {
      setEditingRule({
        id: 'rule_' + Date.now(),
        title: 'Daily Reflection 📖',
        body: 'Take 5 minutes today to reflect upon the words of the Quran.',
        action: 'play_surah',
        targetId: '18',
        days: [5], // Friday default
        time: '09:00',
        isActive: true,
        isNew: true
      });
    }
    setShowRuleModal(true);
  };

  const handleSaveRuleModal = (e) => {
    e.preventDefault();
    if (!editingRule || !editingRule.title.trim() || !editingRule.body.trim()) return;
    if (!editingRule.days || editingRule.days.length === 0) {
      alert('Please select at least one day for this notification schedule.');
      return;
    }

    if (editingRule.isNew) {
      const newRule = { ...editingRule, id: editingRule.id || 'rule_' + Date.now() };
      delete newRule.isNew;
      setScheduledRules(prev => [newRule, ...prev]);
    } else {
      setScheduledRules(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
    }
    setShowRuleModal(false);
    setEditingRule(null);
  };

  // --------------------------------------------------------------------------
  // Feedback Status Updates
  // --------------------------------------------------------------------------
  const handleUpdateFeedback = async (id, status, adminNote) => {
    const res = await updateFeedbackStatus(id, status, adminNote);
    if (res.success) {
      setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, status, adminNote } : f));
      showNotificationToast('success', 'Feedback status updated.');
    }
  };

  // --------------------------------------------------------------------------
  // Password Change
  // --------------------------------------------------------------------------
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!isPasswordDirty) return;

    setIsUpdatingPassword(true);
    try {
      const res = await updateAdminPassword(newAdminPass);
      if (res.success) {
        setNewAdminPass('');
        setConfirmAdminPass('');
        showNotificationToast('success', 'Admin Password changed successfully.');
      } else {
        alert(res.error || 'Failed to update password');
      }
    } catch (err) {
      alert('Error updating password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // --------------------------------------------------------------------------
  // Filtered Feedback
  // --------------------------------------------------------------------------
  const filteredFeedback = useMemo(() => {
    if (feedbackFilter === 'all') return feedbackList;
    return feedbackList.filter(f => f.category === feedbackFilter || f.status === feedbackFilter);
  }, [feedbackList, feedbackFilter]);

  // --------------------------------------------------------------------------
  // If Not Authenticated: Render Password Login Gate
  // --------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="admin-auth-screen">
        <div className="admin-auth-card">
          <div className="admin-auth-header">
            <div className="admin-auth-logo-badge">
              <Lock size={26} />
            </div>
            <h1 className="admin-auth-title">Tarjuma Admin Center</h1>
            <p className="admin-auth-subtitle">
              Enter your secure admin key to access remote application controls.
            </p>
          </div>

          {authError && (
            <div className="admin-error-box">
              <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="admin-auth-form">
            <div className="admin-input-group">
              <label className="admin-input-label">Admin Security Key / Password</label>
              <div className="admin-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="admin-input"
                  placeholder="Enter admin password..."
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="admin-input-addon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="admin-btn-primary"
              style={{ marginTop: '8px', width: '100%', height: '44px' }}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={18} className="spin" /> Verifying...
                </>
              ) : (
                <>
                  <Lock size={18} /> Enter Admin Dashboard
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Main Admin Dashboard
  // --------------------------------------------------------------------------
  return (
    <div className="admin-app-root">
      <div className="admin-dashboard-container">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-brand-icon">T</div>
            <div>
              <h2 className="admin-brand-title">Tarjuma Control</h2>
              <span className="admin-brand-badge">Admin 2.5</span>
            </div>
          </div>

          <nav className="admin-sidebar-nav">
            <span className="admin-nav-section-label">Dashboard</span>
            <button
              className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </button>

            <span className="admin-nav-section-label">Content</span>
            <button
              className={`admin-nav-item ${activeTab === 'playlists' ? 'active' : ''}`}
              onClick={() => setActiveTab('playlists')}
            >
              <ListMusic size={16} />
              <span>Curated Collections</span>
              <span className="admin-nav-badge">{playlists.length}</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'campaigns' ? 'active' : ''}`}
              onClick={() => setActiveTab('campaigns')}
            >
              <Bell size={16} />
              <span>Push Campaigns</span>
              <span className="admin-nav-badge">{campaigns.length}</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'banners' ? 'active' : ''}`}
              onClick={() => setActiveTab('banners')}
            >
              <Image size={16} />
              <span>Hero Banners</span>
              <span className="admin-nav-badge">{banners.length}</span>
            </button>

            <span className="admin-nav-section-label">System</span>
            <button
              className={`admin-nav-item ${activeTab === 'version' ? 'active' : ''}`}
              onClick={() => setActiveTab('version')}
            >
              <ShieldAlert size={16} />
              <span>Version &amp; Maintenance</span>
              {appConfig?.maintenance_mode?.isActive && (
                <span className="admin-nav-badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}>LIVE</span>
              )}
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => setActiveTab('telemetry')}
            >
              <BarChart3 size={16} />
              <span>Analytics</span>
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              <MessageSquare size={16} />
              <span>Feedback</span>
              {feedbackList.length > 0 && (
                <span className="admin-nav-badge">{feedbackList.length}</span>
              )}
            </button>

            <button
              className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-user-info">
              <div className="admin-user-avatar">ADM</div>
              <div className="admin-user-meta">
                <span className="admin-user-name">Executive Master</span>
                <span className="admin-user-role">Tarjuma Core</span>
              </div>
            </div>
            <button className="admin-btn-secondary" onClick={handleLogout} style={{ width: '100%' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          {/* Top Bar */}
          <header className="admin-top-header">
            <div className="admin-header-title-wrap">
              <h1 className="admin-header-title">
                {activeTab === 'overview' && 'Executive Overview'}
                {activeTab === 'playlists' && 'Curated Playlists & "Trending" Collections'}
                {activeTab === 'campaigns' && 'Push Notifications & Campaign Center'}
                {activeTab === 'banners' && 'In-App Hero Banners & Announcements'}
                {activeTab === 'version' && 'App Version Control & Maintenance Mode'}
                {activeTab === 'telemetry' && 'Anonymous Usage Analytics & Telemetry'}
                {activeTab === 'feedback' && 'User Feedback & Feature Requests'}
                {activeTab === 'settings' && 'Security & Database Connection'}
              </h1>
              <div className="admin-status-indicator">
                <span className="admin-status-dot" />
                <span>Supabase Live Sync</span>
              </div>
            </div>

            <div className="admin-header-actions">
              {syncStatusMsg.text && (
                <div className={`admin-toast ${syncStatusMsg.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
                  {syncStatusMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {syncStatusMsg.text}
                </div>
              )}
              <button className="admin-btn-secondary" onClick={loadAllData} title="Refresh Remote Data">
                <RefreshCw size={14} /> Sync
              </button>
              <a href="/" target="_blank" rel="noreferrer" className="admin-btn-secondary" title="Open App in New Tab">
                <ExternalLink size={14} /> Live Preview
              </a>
            </div>
          </header>

          {/* Content Body */}
          <div className="admin-content-body">
            {isLoadingData ? (
              <div className="admin-loading-state">
                <div className="admin-loading-ring" />
                <p style={{ margin: 0, fontSize: '13px' }}>Synchronizing with Supabase...</p>
              </div>
            ) : (
              <>
                {/* ------------------------------------------------------------- */}
                {/* TAB 1: OVERVIEW */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'overview' && (
                  <div>
                    {/* Metrics Grid */}
                    <div className="admin-metrics-grid">
                      <div className="admin-metric-card">
                        <div className="admin-metric-header">
                          <span>Daily Active Users</span>
                          <div className="admin-metric-icon" style={{ color: '#FAFAFA' }}><Smartphone size={16} /></div>
                        </div>
                        <div className="admin-metric-value">{telemetry?.dau != null ? telemetry.dau.toLocaleString() : '—'}</div>
                        <div className="admin-metric-subtext">Hardware-linked devices · 24h</div>
                      </div>

                      <div className="admin-metric-card">
                        <div className="admin-metric-header">
                          <span>Curated Playlists</span>
                          <div className="admin-metric-icon" style={{ color: '#10b981' }}><ListMusic size={16} /></div>
                        </div>
                        <div className="admin-metric-value">{playlists.length}</div>
                        <div className="admin-metric-subtext">Live on Home screen</div>
                      </div>

                      <div className="admin-metric-card">
                        <div className="admin-metric-header">
                          <span>Active Banners</span>
                          <div className="admin-metric-icon" style={{ color: '#f59e0b' }}><Image size={16} /></div>
                        </div>
                        <div className="admin-metric-value">
                          {banners.filter(b => b.isActive).length}<span style={{ fontSize: '15px', color: '#71717A', fontWeight: 400 }}>/{banners.length}</span>
                        </div>
                        <div className="admin-metric-subtext">Scheduled promo cards</div>
                      </div>

                      <div className="admin-metric-card">
                        <div className="admin-metric-header">
                          <span>Maintenance Mode</span>
                          <div className="admin-metric-icon" style={{ color: appConfig?.maintenance_mode?.isActive ? '#f43f5e' : '#10b981' }}><ShieldAlert size={16} /></div>
                        </div>
                        <div className="admin-metric-value" style={{ color: appConfig?.maintenance_mode?.isActive ? '#f43f5e' : '#10b981', fontSize: '18px', letterSpacing: '0.5px' }}>
                          {appConfig?.maintenance_mode?.isActive ? '● ACTIVE' : '○ OFFLINE'}
                        </div>
                        <div className="admin-metric-subtext">Global alert broadcast</div>
                      </div>
                    </div>

                    {/* Quick Action Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                      {/* Maintenance & Version Quick Controller */}
                      <div className="admin-card">
                        <div className="admin-card-header">
                          <h3 className="admin-card-title"><ShieldAlert size={18} /> Emergency Controls</h3>
                          {isAppConfigDirty && (
                            <span className="admin-tag admin-tag-amber">Unsaved Changes</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div className="admin-switch-container">
                            <div className="admin-switch-label">
                              <span className="admin-switch-title">Maintenance Mode Banner</span>
                              <span className="admin-switch-desc">Displays a global alert across the app</span>
                            </div>
                            <div
                              className={`admin-toggle-switch ${appConfig?.maintenance_mode?.isActive ? 'on' : ''}`}
                              onClick={() => {
                                setAppConfig(prev => ({
                                  ...prev,
                                  maintenance_mode: {
                                    ...prev?.maintenance_mode,
                                    isActive: !prev?.maintenance_mode?.isActive
                                  }
                                }));
                              }}
                            >
                              <div className="admin-toggle-handle" />
                            </div>
                          </div>

                          <div className="admin-switch-container">
                            <div className="admin-switch-label">
                              <span className="admin-switch-title">Enforce Minimum App Version</span>
                              <span className="admin-switch-desc">Block older builds with mandatory update modal</span>
                            </div>
                            <div
                              className={`admin-toggle-switch ${appConfig?.force_update ? 'on' : ''}`}
                              onClick={() => {
                                setAppConfig(prev => ({
                                  ...prev,
                                  force_update: !prev.force_update
                                }));
                              }}
                            >
                              <div className="admin-toggle-handle" />
                            </div>
                          </div>

                          <button
                            className={`admin-btn-primary ${!isAppConfigDirty ? 'admin-btn-inactive-grey' : 'admin-btn-active-dirty'}`}
                            onClick={handleSaveAppConfig}
                            disabled={!isAppConfigDirty || isSavingConfig}
                          >
                            {isSavingConfig ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                            {isAppConfigDirty ? 'Save & Apply Controls (Changes Detected)' : 'No Changes to Save'}
                          </button>
                        </div>
                      </div>

                      {/* Quick Campaign Composer */}
                      <div className="admin-card">
                        <div className="admin-card-header">
                          <h3 className="admin-card-title"><Bell size={18} /> Quick Push Notification</h3>
                        </div>
                        <form onSubmit={handleBroadcastCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="admin-input-group">
                            <label className="admin-input-label">Title</label>
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="e.g. Friday Blessing 📖"
                              value={newCampaign.title}
                              onChange={e => setNewCampaign({ ...newCampaign, title: e.target.value })}
                              required
                            />
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Message Body</label>
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="e.g. Read Surah Al-Kahf today..."
                              value={newCampaign.body}
                              onChange={e => setNewCampaign({ ...newCampaign, body: e.target.value })}
                              required
                            />
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Deep-Link Target</label>
                            <select
                              className="admin-input"
                              value={newCampaign.action + ':' + newCampaign.targetId}
                              onChange={e => {
                                const [action, targetId] = e.target.value.split(':');
                                setNewCampaign({ ...newCampaign, action, targetId });
                              }}
                            >
                              <option value="play_surah:18">Surah Al-Kahf (18)</option>
                              <option value="play_surah:36">Surah Ya-Sin (36)</option>
                              <option value="play_surah:67">Surah Al-Mulk (67)</option>
                              <option value="play_surah:55">Surah Ar-Rahman (55)</option>
                              <option value="open_scholar:mishary">Mishary Rashid Reciter</option>
                              <option value="open_zen:zen">Zen Immersion Mode</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className={`admin-btn-primary ${!isCampaignDirty ? 'admin-btn-inactive-grey' : 'admin-btn-active-dirty'}`}
                            disabled={!isCampaignDirty || isBroadcasting}
                          >
                            {isBroadcasting ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                            {isCampaignDirty ? 'Broadcast Push Notification' : 'Enter Title & Body to Broadcast'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 2: CURATED PLAYLISTS & TRENDING COLLECTIONS */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'playlists' && (
                  <div>
                    <div className="admin-card">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title"><ListMusic size={20} /> Curated Home-Screen Collections</h3>
                          <p className="admin-card-subtitle">
                            Create, customize colors/gradients, and reorder playlists displayed under "Made For You" on the app Home Screen.
                          </p>
                        </div>
                        <button
                          className="admin-btn-primary"
                          onClick={() => {
                            setEditingPlaylist({
                              id: 'pl_' + Date.now(),
                              title: 'New Curated Mix',
                              subtitle: 'Specially made for You',
                              creator: 'by Quranify',
                              description: 'Curated recitations crafted for tranquil reflection.',
                              gradient: 'linear-gradient(135deg, #d82e1b 0%, #f6941b 100%)',
                              accentColor: '#f6941b',
                              surahIds: [1, 2, 36, 67],
                              isDynamic: false,
                              isActive: true,
                              isNew: true,
                            });
                            setPlaylistColorTab('gradients');
                            setShowPlaylistModal(true);
                          }}
                        >
                          <Plus size={16} /> Add New Collection
                        </button>
                      </div>

                      <div className="playlist-items-grid">
                        {playlists.map((playlist, idx) => (
                          <div key={playlist.id} className="playlist-admin-card">
                            {/* Color identity strip */}
                            <div
                              className="playlist-color-strip"
                              style={{ background: playlist.gradient || playlist.solidColor || playlist.accentColor || '#6366f1' }}
                            />

                            <div className="playlist-admin-header">
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span className="playlist-order-badge">#{idx + 1}</span>
                                <h4 className="playlist-admin-title">{playlist.title}</h4>
                                <p className="playlist-admin-subtitle">{playlist.subtitle} · {playlist.creator}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <button
                                  className="admin-btn-secondary"
                                  style={{ padding: '6px 8px' }}
                                  disabled={idx === 0}
                                  onClick={() => handleMovePlaylist(idx, 'up')}
                                  title="Move Up"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  className="admin-btn-secondary"
                                  style={{ padding: '6px 8px' }}
                                  disabled={idx === playlists.length - 1}
                                  onClick={() => handleMovePlaylist(idx, 'down')}
                                  title="Move Down"
                                >
                                  <ArrowDown size={13} />
                                </button>
                              </div>
                            </div>

                            <p className="playlist-admin-description">{playlist.description}</p>

                            <div>
                              <span className="admin-input-label" style={{ marginBottom: '6px', display: 'block' }}>
                                {playlist.isDynamic ? 'Dynamic · Bookmarks' : `Content · ${playlist.surahIds?.length || 0} items`}
                              </span>
                              <div className="playlist-surah-tags">
                                {playlist.isDynamic ? (
                                  <span className="playlist-surah-chip">User's Favorites</span>
                                ) : (
                                  (playlist.surahIds || []).slice(0, 5).map(sId => {
                                    const s = surahs.find(item => item.id === sId);
                                    return (
                                      <span key={sId} className="playlist-surah-chip">
                                        {s ? s.name_transliteration : `Surah ${sId}`}
                                      </span>
                                    );
                                  })
                                )}
                                {!playlist.isDynamic && (playlist.surahIds?.length || 0) > 5 && (
                                  <span className="playlist-surah-chip" style={{ color: '#FAFAFA', borderColor: 'rgba(250,250,250,0.15)', background: 'rgba(250,250,250,0.08)' }}>+{(playlist.surahIds?.length || 0) - 5} more</span>
                                )}
                              </div>
                            </div>

                            <div className="playlist-admin-actions">
                              <button
                                className="admin-btn-secondary"
                                onClick={() => handleOpenEditPlaylist(playlist)}
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              {!playlist.isDynamic && (
                                <button
                                  className="admin-btn-danger"
                                  onClick={() => handleDeletePlaylist(playlist.id)}
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 3: PUSH CAMPAIGNS & DAY-OF-WEEK RECURRING SCHEDULES */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'campaigns' && (
                  <div className="campaigns-tab-wrapper">
                    {/* Sub-tab Navigation Bar */}
                    <div className="admin-subtabs-nav">
                      <button
                        type="button"
                        className={`admin-subtab-btn ${campaignSubTab === 'schedules' ? 'active' : ''}`}
                        onClick={() => setCampaignSubTab('schedules')}
                      >
                        <Calendar size={16} />
                        <span>Automated Day Schedules &amp; Multi-Notifications</span>
                        <span className="admin-subtab-badge">{scheduledRules.length}</span>
                      </button>

                      <button
                        type="button"
                        className={`admin-subtab-btn ${campaignSubTab === 'broadcast' ? 'active' : ''}`}
                        onClick={() => setCampaignSubTab('broadcast')}
                      >
                        <Send size={16} />
                        <span>Instant Push Broadcast</span>
                      </button>

                      <button
                        type="button"
                        className={`admin-subtab-btn ${campaignSubTab === 'logs' ? 'active' : ''}`}
                        onClick={() => setCampaignSubTab('logs')}
                      >
                        <BarChart3 size={16} />
                        <span>Campaign Logs &amp; CTR</span>
                        <span className="admin-subtab-badge">{campaigns.length}</span>
                      </button>
                    </div>

                    {/* ------------------------------------------------------------------ */}
                    {/* SUBTAB 1: AUTOMATED DAY-BY-DAY SCHEDULES & MULTI-NOTIFICATION RULES */}
                    {/* ------------------------------------------------------------------ */}
                    {campaignSubTab === 'schedules' && (
                      <div>
                        <div className="admin-card">
                          <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ flex: 1, minWidth: '280px' }}>
                              <h3 className="admin-card-title"><Calendar size={20} /> Automated Day-of-Week Notification Rules</h3>
                              <p className="admin-card-subtitle">
                                Configure multiple automated reminders for specific days of the week (e.g. Friday Surah Al-Kahf, Mon/Thu Sunnah recitation, Night Protection, Morning Light). Devices automatically receive these notifications on the selected days and times.
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={() => handleOpenEditRule(null)}
                              >
                                <Plus size={16} /> Add Day Schedule
                              </button>
                              <button
                                type="button"
                                className={`admin-btn-primary ${!isRulesDirty ? 'admin-btn-inactive-grey' : 'admin-btn-active-dirty'}`}
                                disabled={!isRulesDirty || isSavingRules}
                                onClick={handleSaveScheduledRules}
                              >
                                {isSavingRules ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                                {isRulesDirty ? 'Save & Deploy Schedules' : 'Schedules Deployed & Synced'}
                              </button>
                            </div>
                          </div>

                          {/* List of Scheduled Notification Rules */}
                          {scheduledRules.length === 0 ? (
                            <div className="admin-empty-state">
                              <Calendar size={48} color="#71717A" />
                              <h4 style={{ color: '#FAFAFA', margin: '12px 0 4px' }}>No Notification Schedules Configured</h4>
                              <p style={{ color: '#A1A1AA', fontSize: '13px', margin: '0 0 16px' }}>
                                Set up recurring day-by-day notifications to keep users engaged with specific Surahs and recitations.
                              </p>
                              <button
                                type="button"
                                className="admin-btn-primary"
                                onClick={() => handleOpenEditRule(null)}
                              >
                                <Plus size={16} /> Create First Schedule
                              </button>
                            </div>
                          ) : (
                            <div className="scheduled-rules-grid">
                              {scheduledRules.map((rule) => {
                                const days = Array.isArray(rule.days) ? rule.days : [];
                                return (
                                  <div key={rule.id} className={`rule-card-item ${rule.isActive ? 'active' : 'inactive'}`}>
                                    <div className="rule-card-header">
                                      <div className="rule-card-title-group">
                                        <span className={`rule-status-badge ${rule.isActive ? 'badge-active' : 'badge-disabled'}`}>
                                          {rule.isActive ? 'ACTIVE' : 'PAUSED'}
                                        </span>
                                        <h4 className="rule-card-title">{rule.title}</h4>
                                      </div>
                                      <div
                                        className={`admin-toggle-switch ${rule.isActive ? 'on' : ''}`}
                                        title={rule.isActive ? 'Click to Pause' : 'Click to Activate'}
                                        onClick={() => handleToggleRuleActive(rule.id)}
                                      >
                                        <div className="admin-toggle-handle" />
                                      </div>
                                    </div>

                                    <p className="rule-card-body">{rule.body}</p>

                                    {/* Meta info: Time and Days */}
                                    <div className="rule-card-meta-row">
                                      <div className="rule-meta-pill time-pill">
                                        <span>🕒 {rule.time || '09:00'}</span>
                                      </div>
                                      <div className="rule-meta-pill days-summary-pill">
                                        <span>📅 {getDaySummaryText(rule.days)}</span>
                                      </div>
                                    </div>

                                    {/* Day-of-week Pills Display */}
                                    <div className="rule-days-chips-row">
                                      {DAYS_OF_WEEK.map(d => {
                                        const isDaySelected = days.includes(d.id);
                                        return (
                                          <span
                                            key={d.id}
                                            className={`day-chip-mini ${isDaySelected ? 'selected' : ''}`}
                                          >
                                            {d.label}
                                          </span>
                                        );
                                      })}
                                    </div>

                                    {/* Deep-link Action Target Badge */}
                                    <div className="rule-target-badge">
                                      <span className="rule-target-label">Action:</span>
                                      <span className="rule-target-val">
                                        {rule.action === 'play_surah' && `📖 Surah ${rule.targetId} (${surahs.find(s => String(s.id) === String(rule.targetId))?.name_transliteration || 'Surah'})`}
                                        {rule.action === 'play_para' && `📚 Para ${rule.targetId}`}
                                        {rule.action === 'open_scholar' && `🎧 Reciter (${scholars.find(s => s.id === rule.targetId)?.name_transliteration || 'Reciter'})`}
                                        {rule.action === 'open_zen' && '🧘 Zen Immersion Mode'}
                                        {rule.action === 'open_library' && '📑 Quran Library'}
                                        {rule.action === 'external_url' && `🔗 Link: ${rule.targetId}`}
                                        {!rule.action && '📱 Open App'}
                                      </span>
                                    </div>

                                    {/* Rule Actions */}
                                    <div className="rule-card-actions">
                                      <button
                                        type="button"
                                        className="admin-btn-secondary"
                                        style={{ padding: '6px 10px', fontSize: '12px' }}
                                        onClick={() => handleOpenEditRule(rule)}
                                      >
                                        <Edit2 size={13} /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-btn-secondary"
                                        style={{ padding: '6px 10px', fontSize: '12px' }}
                                        onClick={() => handleDuplicateRule(rule)}
                                        title="Duplicate this schedule"
                                      >
                                        <Plus size={13} /> Clone
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-btn-danger"
                                        style={{ padding: '6px 10px', fontSize: '12px' }}
                                        onClick={() => handleDeleteRule(rule.id)}
                                      >
                                        <Trash2 size={13} /> Delete
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------------------------ */}
                    {/* SUBTAB 2: ONE-TIME INSTANT PUSH BROADCAST COMPOSER */}
                    {/* ------------------------------------------------------------------ */}
                    {campaignSubTab === 'broadcast' && (
                      <div>
                        <div className="admin-card">
                          <div className="admin-card-header">
                            <div>
                              <h3 className="admin-card-title"><Send size={20} /> Instant Push Notification Broadcast</h3>
                              <p className="admin-card-subtitle">
                                Dispatch an immediate push alert to all connected user devices in real-time via Supabase Cloud.
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '12px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                                Supabase Cloud Connected
                              </span>
                            </div>
                          </div>

                          <form onSubmit={handleBroadcastCampaign} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            <div className="admin-input-group">
                              <label className="admin-input-label">Notification Title</label>
                              <input
                                type="text"
                                className="admin-input"
                                placeholder="e.g. Daily Quran Reminder 📖"
                                value={newCampaign.title}
                                onChange={e => setNewCampaign({ ...newCampaign, title: e.target.value })}
                                required
                              />
                            </div>

                            <div className="admin-input-group">
                              <label className="admin-input-label">Deep-Link Target Action</label>
                              <select
                                className="admin-input"
                                value={newCampaign.action}
                                onChange={e => setNewCampaign({ ...newCampaign, action: e.target.value })}
                              >
                                <option value="play_surah">Play Specific Surah</option>
                                <option value="play_para">Play Specific Para / Juz</option>
                                <option value="open_scholar">Open Specific Reciter / Scholar</option>
                                <option value="open_zen">Open Zen Immersion Mode</option>
                                <option value="open_library">Open Library Screen</option>
                                <option value="external_url">Open External URL</option>
                              </select>
                            </div>

                            {newCampaign.action === 'play_surah' && (
                              <div className="admin-input-group">
                                <label className="admin-input-label">Select Surah Target</label>
                                <select
                                  className="admin-input"
                                  value={newCampaign.targetId}
                                  onChange={e => setNewCampaign({ ...newCampaign, targetId: e.target.value })}
                                >
                                  {surahs.map(s => (
                                    <option key={s.id} value={s.id}>{s.id}. {s.name_transliteration} ({s.name_arabic})</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {newCampaign.action === 'play_para' && (
                              <div className="admin-input-group">
                                <label className="admin-input-label">Select Para / Juz Target</label>
                                <select
                                  className="admin-input"
                                  value={newCampaign.targetId}
                                  onChange={e => setNewCampaign({ ...newCampaign, targetId: e.target.value })}
                                >
                                  {paras.map(p => (
                                    <option key={p.id} value={p.id}>Para {p.id}: {p.name_transliteration}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {newCampaign.action === 'open_scholar' && (
                              <div className="admin-input-group">
                                <label className="admin-input-label">Select Reciter / Scholar</label>
                                <select
                                  className="admin-input"
                                  value={newCampaign.targetId}
                                  onChange={e => setNewCampaign({ ...newCampaign, targetId: e.target.value })}
                                >
                                  {scholars.map(s => (
                                    <option key={s.id} value={s.id}>{s.name_transliteration}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                              <label className="admin-input-label">Notification Body</label>
                              <textarea
                                className="admin-input"
                                rows={3}
                                placeholder="Type the message that will appear on user lockscreens..."
                                value={newCampaign.body}
                                onChange={e => setNewCampaign({ ...newCampaign, body: e.target.value })}
                                required
                              />
                            </div>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="admin-btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={async () => {
                                  if (!newCampaign.title) {
                                    showNotificationToast('error', 'Please enter at least a title to test notification.');
                                    return;
                                  }
                                  const success = await sendImmediateNotification(
                                    newCampaign.title,
                                    newCampaign.body || 'Test notification from Admin panel',
                                    { action: newCampaign.action, targetId: newCampaign.targetId }
                                  );
                                  if (success) {
                                    showNotificationToast('success', 'Local test notification triggered on this device!');
                                  } else {
                                    showNotificationToast('error', 'Please allow notification permissions in your browser/device settings.');
                                  }
                                }}
                              >
                                <Bell size={16} /> Test on This Device
                              </button>
                              <button
                                type="submit"
                                className={`admin-btn-primary ${!isCampaignDirty ? 'admin-btn-inactive-grey' : 'admin-btn-active-dirty'}`}
                                disabled={!isCampaignDirty || isBroadcasting}
                              >
                                {isBroadcasting ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                                {isCampaignDirty ? 'Broadcast Campaign to All Devices' : 'Fill Notification Details to Send'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------------------------ */}
                    {/* SUBTAB 3: CAMPAIGN PERFORMANCE & CTR LOGS */}
                    {/* ------------------------------------------------------------------ */}
                    {campaignSubTab === 'logs' && (
                      <div>
                        <div className="admin-card">
                          <div className="admin-card-header">
                            <h3 className="admin-card-title"><BarChart3 size={18} /> Notification Logs &amp; Performance (CTR)</h3>
                          </div>

                          <div className="admin-table-container">
                            <table className="admin-table">
                              <thead>
                                <tr>
                                  <th>Campaign Title</th>
                                  <th>Target Action</th>
                                  <th>Sent At</th>
                                  <th>Audience Reach</th>
                                  <th>Opened / CTR</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {campaigns.map(camp => {
                                  const ctr = camp.sentCount > 0 ? ((camp.clickedCount / camp.sentCount) * 100).toFixed(1) : '0.0';
                                  return (
                                    <tr key={camp.id}>
                                      <td>
                                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{camp.title}</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{camp.body}</div>
                                      </td>
                                      <td>
                                        <span className="admin-tag admin-tag-blue">
                                          {camp.action} ({camp.targetId || 'global'})
                                        </span>
                                      </td>
                                      <td>{new Date(camp.sentAt).toLocaleString()}</td>
                                      <td>{camp.sentCount?.toLocaleString()} devices</td>
                                      <td>
                                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>{camp.clickedCount}</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>({ctr}%)</span>
                                      </td>
                                      <td>
                                        <span className="admin-tag admin-tag-green">{camp.status}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 4: HERO BANNERS & ANNOUNCEMENTS */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'banners' && (
                  <div>
                    <div className="admin-card">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title"><Image size={20} /> Home Screen Hero Banners</h3>
                          <p className="admin-card-subtitle">
                            Configure gradient or solid promo cards with deep link triggers and start/expiry timers.
                          </p>
                        </div>
                        <button
                          className="admin-btn-primary"
                          onClick={() => {
                            setEditingBanner({
                              id: 'bn_' + Date.now(),
                              title: 'Ramadan Mubarak Special',
                              subtitle: 'Explore our selected daily juz recitation playlist.',
                              badge: 'COMMUNITY',
                              gradient: 'linear-gradient(135deg, #1b68d6 0%, #a824e8 100%)',
                              bgColor: '#1e3a8a',
                              textColor: '#ffffff',
                              ctaText: 'Explore Now',
                              ctaAction: 'open_scholar',
                              ctaTarget: 'mishary',
                              isActive: true,
                              startDate: new Date().toISOString().split('T')[0],
                              endDate: '2027-12-31',
                              isNew: true,
                            });
                            setBannerColorTab('gradients');
                            setShowBannerModal(true);
                          }}
                        >
                          <Plus size={16} /> Add Announcement Banner
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                        {banners.map(banner => (
                          <div key={banner.id} style={{ background: '#0e1118', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }}>
                            {/* Live Card Preview */}
                            <div
                              className="admin-banner-preview-card"
                              style={{
                                background: banner.gradient || banner.bgColor || '#1e3a8a',
                                color: banner.textColor || '#ffffff'
                              }}
                            >
                              <span className="admin-banner-preview-badge">{banner.badge || 'UPDATE'}</span>
                              <h4 className="admin-banner-preview-title">{banner.title}</h4>
                              <p className="admin-banner-preview-subtitle">{banner.subtitle}</p>
                              <span className="admin-banner-preview-cta">{banner.ctaText || 'Learn More'}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#94a3b8', margin: '12px 0' }}>
                              <div><strong>Schedule:</strong> {banner.startDate || 'Immediate'} → {banner.endDate || 'No Expiry'}</div>
                              <div><strong>Target Action:</strong> {banner.ctaAction} ({banner.ctaTarget || 'None'})</div>
                              <div>
                                <strong>Status:</strong>{' '}
                                <span className={`admin-tag ${banner.isActive ? 'admin-tag-green' : 'admin-tag-slate'}`}>
                                  {banner.isActive ? 'Active' : 'Disabled'}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                              <button
                                className="admin-btn-secondary"
                                onClick={() => handleOpenEditBanner(banner)}
                              >
                                <Edit2 size={14} /> Edit Banner
                              </button>
                              <button
                                className="admin-btn-danger"
                                onClick={() => handleDeleteBanner(banner.id)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 5: VERSION CONTROL & MAINTENANCE */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'version' && (
                  <div>
                    <div className="admin-card">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title"><ShieldAlert size={20} /> Remote Versioning &amp; Maintenance Control</h3>
                          <p className="admin-card-subtitle">
                            Configure minimum supported version to enforce updates, manage APK links, and trigger global maintenance alerts.
                          </p>
                        </div>
                        {isAppConfigDirty && (
                          <span className="admin-tag admin-tag-amber">
                            ● Unsaved Changes Detected
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                        {/* Version Parameters */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="admin-input-group">
                            <label className="admin-input-label">Minimum Supported Version (Strict Blocking)</label>
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="e.g. 1.0.0"
                              value={appConfig?.min_supported_version || ''}
                              onChange={e => setAppConfig({ ...appConfig, min_supported_version: e.target.value })}
                            />
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              Clients running builds below this version will be blocked with a mandatory update screen.
                            </span>
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Latest App Version (Recommended Target)</label>
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="e.g. 2.0.0"
                              value={appConfig?.latest_version || ''}
                              onChange={e => setAppConfig({ ...appConfig, latest_version: e.target.value })}
                            />
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Direct APK Download &amp; Install URL</label>
                            <input
                              type="url"
                              className="admin-input"
                              placeholder="https://tarjumaapp.vercel.app/Tarjuma.apk"
                              value={appConfig?.apk_url || ''}
                              onChange={e => setAppConfig({ ...appConfig, apk_url: e.target.value })}
                            />
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              Direct APK binary link for in-app updater: <code>https://tarjumaapp.vercel.app/Tarjuma.apk</code>
                            </span>
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Update Release Notes</label>
                            <textarea
                              className="admin-input"
                              rows={3}
                              placeholder="Describe what's new in this release..."
                              value={appConfig?.update_notes || ''}
                              onChange={e => setAppConfig({ ...appConfig, update_notes: e.target.value })}
                            />
                          </div>

                          <div className="admin-switch-container">
                            <div className="admin-switch-label">
                              <span className="admin-switch-title">Force Immediate Update for Older Clients</span>
                              <span className="admin-switch-desc">Makes update modal non-dismissible for users on older builds</span>
                            </div>
                            <div
                              className={`admin-toggle-switch ${appConfig?.force_update ? 'on' : ''}`}
                              onClick={() => setAppConfig({ ...appConfig, force_update: !appConfig.force_update })}
                            >
                              <div className="admin-toggle-handle" />
                            </div>
                          </div>
                        </div>

                        {/* Maintenance Parameters */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="admin-switch-container">
                            <div className="admin-switch-label">
                              <span className="admin-switch-title">Global Maintenance Banner</span>
                              <span className="admin-switch-desc">Displays sticky alert bar on top of the app</span>
                            </div>
                            <div
                              className={`admin-toggle-switch ${appConfig?.maintenance_mode?.isActive ? 'on' : ''}`}
                              onClick={() => setAppConfig({
                                ...appConfig,
                                maintenance_mode: {
                                  ...appConfig.maintenance_mode,
                                  isActive: !appConfig?.maintenance_mode?.isActive
                                }
                              })}
                            >
                              <div className="admin-toggle-handle" />
                            </div>
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Maintenance Banner Message</label>
                            <textarea
                              className="admin-input"
                              rows={3}
                              placeholder="e.g. Scheduled server maintenance in progress..."
                              value={appConfig?.maintenance_mode?.message || ''}
                              onChange={e => setAppConfig({
                                ...appConfig,
                                maintenance_mode: {
                                  ...appConfig.maintenance_mode,
                                  message: e.target.value
                                }
                              })}
                            />
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Banner Style / Severity</label>
                            <select
                              className="admin-input"
                              value={appConfig?.maintenance_mode?.bannerType || 'warning'}
                              onChange={e => setAppConfig({
                                ...appConfig,
                                maintenance_mode: {
                                  ...appConfig.maintenance_mode,
                                  bannerType: e.target.value
                                }
                              })}
                            >
                              <option value="warning">Warning (Amber)</option>
                              <option value="info">Informational (Blue)</option>
                              <option value="error">Critical Downtime (Red)</option>
                            </select>
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Estimated Completion Time</label>
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="e.g. 19:30 UTC"
                              value={appConfig?.maintenance_mode?.estimatedEndTime || ''}
                              onChange={e => setAppConfig({
                                ...appConfig,
                                maintenance_mode: {
                                  ...appConfig.maintenance_mode,
                                  estimatedEndTime: e.target.value
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '24px', borderTop: '1px solid #1e293b', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className={`admin-btn-primary ${!isAppConfigDirty ? 'admin-btn-inactive-grey' : 'admin-btn-active-dirty'}`}
                          onClick={handleSaveAppConfig}
                          disabled={!isAppConfigDirty || isSavingConfig}
                        >
                          {isSavingConfig ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                          {isAppConfigDirty ? 'Deploy Version & Maintenance Settings Globally' : 'No Changes to Deploy'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 6: TELEMETRY & ANALYTICS */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'telemetry' && (
                  <div>
                    {/* High-level metrics */}
                    <div className="admin-metrics-grid">
                      <div className="admin-metric-card">
                        <div className="admin-metric-header">
                          <span>Active Devices (DAU)</span>
                          <div className="admin-metric-icon"><Smartphone size={18} /></div>
                        </div>
                        <div className="admin-metric-value">{telemetry?.dau != null ? telemetry.dau.toLocaleString() : '—'}</div>
                        <div className="admin-metric-subtext">Active in past 24 hours</div>
                      </div>

                      <div className="admin-metric-card">
                        <div className="admin-metric-header">
                          <span>Monthly Active (MAU)</span>
                          <div className="admin-metric-icon"><BarChart3 size={18} /></div>
                        </div>
                        <div className="admin-metric-value">{telemetry?.mau != null ? telemetry.mau.toLocaleString() : '—'}</div>
                        <div className="admin-metric-subtext">Unique monthly devices</div>
                      </div>

                      <div className="admin-metric-card">
                        <div className="admin-metric-header">
                          <span>Total Sessions</span>
                          <div className="admin-metric-icon"><Play size={18} /></div>
                        </div>
                        <div className="admin-metric-value">{telemetry?.totalSessions != null ? telemetry.totalSessions.toLocaleString() : '—'}</div>
                        <div className="admin-metric-subtext">Total audio streams started</div>
                      </div>

                      <div className="admin-metric-card">
                        <div className="admin-metric-header">
                          <span>Avg Session Duration</span>
                          <div className="admin-metric-icon"><CheckCircle size={18} /></div>
                        </div>
                        <div className="admin-metric-value">{telemetry?.avgSessionDurationMinutes != null ? `${telemetry.avgSessionDurationMinutes} min` : '—'}</div>
                        <div className="admin-metric-subtext">Average per session</div>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                      <div className="admin-card">
                        <div className="admin-card-header">
                          <h3 className="admin-card-title"><BarChart3 size={18} /> Top Streamed Surahs</h3>
                        </div>
                        <div style={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer>
                            <BarChart data={telemetry?.topSurahs || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#141923', border: '1px solid #334155', borderRadius: '8px' }} />
                              <Bar dataKey="plays" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="admin-card">
                        <div className="admin-card-header">
                          <h3 className="admin-card-title"><Star size={18} /> Reciter Share Distribution</h3>
                        </div>
                        <div style={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={telemetry?.topScholars || []}
                                dataKey="share"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                {(telemetry?.topScholars || []).map((entry, index) => {
                                  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#141923', border: '1px solid #334155', borderRadius: '8px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 7: FEEDBACK & FEATURE REQUESTS */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'feedback' && (
                  <div>
                    <div className="admin-card">
                      <div className="admin-card-header">
                        <div>
                          <h3 className="admin-card-title"><MessageSquare size={20} /> User In-App Feedback</h3>
                          <p className="admin-card-subtitle">
                            Review bug reports, recitation requests, and general user feedback.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {['all', 'new', 'in_progress', 'resolved'].map(f => (
                            <button
                              key={f}
                              className={`color-mode-btn ${feedbackFilter === f ? 'active' : ''}`}
                              onClick={() => setFeedbackFilter(f)}
                            >
                              {f === 'all' ? 'All Feedback' : f.replace('_', ' ').toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>User &amp; Rating</th>
                              <th>Category</th>
                              <th>Message</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredFeedback.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                  No feedback entries found in this category.
                                </td>
                              </tr>
                            ) : (
                              filteredFeedback.map(item => (
                                <tr key={item.id}>
                                  <td style={{ whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{item.userId}</div>
                                    <div style={{ color: '#f59e0b', fontSize: '12px' }}>★ {item.rating}/5</div>
                                  </td>
                                  <td>
                                    <span className="admin-tag admin-tag-blue">{item.category}</span>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '2px' }}>{item.title}</div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.message}</div>
                                  </td>
                                  <td>
                                    <span className={`admin-tag ${item.status === 'resolved' ? 'admin-tag-green' : item.status === 'in_progress' ? 'admin-tag-amber' : 'admin-tag-slate'}`}>
                                      {item.status || 'new'}
                                    </span>
                                  </td>
                                  <td>
                                    <select
                                      className="admin-input"
                                      style={{ padding: '4px 8px', fontSize: '11.5px', height: 'auto' }}
                                      value={item.status || 'new'}
                                      onChange={e => handleUpdateFeedback(item.id, e.target.value, item.adminNote)}
                                    >
                                      <option value="new">New</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="resolved">Resolved</option>
                                    </select>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 8: SECURITY & DATABASE SETTINGS */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'settings' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                      {/* Change Password Card */}
                      <div className="admin-card">
                        <div className="admin-card-header">
                          <h3 className="admin-card-title"><Lock size={18} /> Update Admin Password</h3>
                        </div>

                        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div className="admin-input-group">
                            <label className="admin-input-label">New Password</label>
                            <input
                              type="password"
                              className="admin-input"
                              placeholder="Enter minimum 6 characters..."
                              value={newAdminPass}
                              onChange={e => setNewAdminPass(e.target.value)}
                              required
                            />
                          </div>

                          <div className="admin-input-group">
                            <label className="admin-input-label">Confirm New Password</label>
                            <input
                              type="password"
                              className="admin-input"
                              placeholder="Re-type new password..."
                              value={confirmAdminPass}
                              onChange={e => setConfirmAdminPass(e.target.value)}
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            className={`admin-btn-primary ${!isPasswordDirty ? 'admin-btn-inactive-grey' : 'admin-btn-active-dirty'}`}
                            disabled={!isPasswordDirty || isUpdatingPassword}
                          >
                            {isUpdatingPassword ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                            {isPasswordDirty ? 'Save New Password' : 'Enter Matching Passwords (min 6 chars)'}
                          </button>
                        </form>
                      </div>

                      {/* Database & Export Card */}
                      <div className="admin-card">
                        <div className="admin-card-header">
                          <h3 className="admin-card-title"><Database size={18} /> Database &amp; Backup</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                            Download a full snapshot of all curated collections, active banners, notification logs, and app parameters.
                          </p>

                          <button
                            className="admin-btn-secondary"
                            onClick={() => {
                              const snapshot = {
                                exportedAt: new Date().toISOString(),
                                playlists,
                                banners,
                                appConfig,
                                campaigns,
                                feedbackList,
                                telemetry
                              };
                              const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `tarjuma_admin_backup_${Date.now()}.json`;
                              a.click();
                            }}
                          >
                            <Database size={16} /> Export Complete JSON Backup
                          </button>

                          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                            <span className="admin-input-label" style={{ marginBottom: '6px', display: 'block' }}>
                              Supabase Remote Target
                            </span>
                            <code style={{ fontSize: '11px', background: '#0e1118', padding: '6px 10px', borderRadius: '4px', color: '#38bdf8', display: 'block' }}>
                              wcprerrxiscklakhtmax.supabase.co
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT / CREATE PLAYLIST (CONTAINED - NO OVERFLOW) */}
      {/* ------------------------------------------------------------- */}
      {showPlaylistModal && editingPlaylist && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-container">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {editingPlaylist.isNew ? 'Create Curated Collection' : 'Edit Curated Collection'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                onClick={() => {
                  setShowPlaylistModal(false);
                  setEditingPlaylist(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlaylistModal}>
              <div className="admin-modal-body">
                {/* Live Card Preview */}
                <div>
                  <span className="admin-input-label" style={{ marginBottom: '6px' }}>Live Card Preview</span>
                  <div
                    style={{
                      background: editingPlaylist.gradient || editingPlaylist.solidColor || '#1e3a8a',
                      borderRadius: '14px',
                      padding: '16px 18px',
                      color: '#ffffff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)'
                    }}
                  >
                    <span style={{ fontSize: '10.5px', fontWeight: '800', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      {editingPlaylist.subtitle || 'Specially made for You'}
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0 2px' }}>
                      {editingPlaylist.title || 'Collection Title'}
                    </h3>
                    <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
                      {editingPlaylist.creator || 'by Quranify'} · {editingPlaylist.isDynamic ? 'Bookmarks' : `${editingPlaylist.surahIds?.length || 0} Surahs`}
                    </p>
                  </div>
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Collection Title</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editingPlaylist.title}
                    onChange={e => setEditingPlaylist({ ...editingPlaylist, title: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Subtitle &amp; Tagline</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editingPlaylist.subtitle}
                    onChange={e => setEditingPlaylist({ ...editingPlaylist, subtitle: e.target.value })}
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Description</label>
                  <textarea
                    className="admin-input"
                    rows={2}
                    value={editingPlaylist.description}
                    onChange={e => setEditingPlaylist({ ...editingPlaylist, description: e.target.value })}
                  />
                </div>

                {/* Color & Gradient System */}
                <div className="color-picker-section">
                  <label className="admin-input-label">
                    <span>Card Theme &amp; Color Style</span>
                    <span style={{ color: '#818cf8', textTransform: 'none' }}>
                      {editingPlaylist.gradient ? 'Gradient Active' : 'Solid Active'}
                    </span>
                  </label>

                  <div className="color-mode-tabs">
                    <button
                      type="button"
                      className={`color-mode-btn ${playlistColorTab === 'gradients' ? 'active' : ''}`}
                      onClick={() => setPlaylistColorTab('gradients')}
                    >
                      Curated Gradients
                    </button>
                    <button
                      type="button"
                      className={`color-mode-btn ${playlistColorTab === 'solids' ? 'active' : ''}`}
                      onClick={() => setPlaylistColorTab('solids')}
                    >
                      Solid Colors
                    </button>
                    <button
                      type="button"
                      className={`color-mode-btn ${playlistColorTab === 'custom-gradient' ? 'active' : ''}`}
                      onClick={() => setPlaylistColorTab('custom-gradient')}
                    >
                      Custom Gradient
                    </button>
                    <button
                      type="button"
                      className={`color-mode-btn ${playlistColorTab === 'custom-solid' ? 'active' : ''}`}
                      onClick={() => setPlaylistColorTab('custom-solid')}
                    >
                      Custom Hex
                    </button>
                  </div>

                  {playlistColorTab === 'gradients' && (
                    <div className="color-swatch-row">
                      {GRADIENT_PALETTES.map(item => (
                        <button
                          key={item.name}
                          type="button"
                          className={`color-swatch-btn ${editingPlaylist.gradient === item.gradient ? 'selected' : ''}`}
                          style={{ background: item.gradient }}
                          title={item.name}
                          onClick={() => {
                            setEditingPlaylist({
                              ...editingPlaylist,
                              gradient: item.gradient,
                              solidColor: undefined,
                              accentColor: item.accent
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {playlistColorTab === 'solids' && (
                    <div className="color-swatch-row">
                      {SOLID_PALETTES.map(item => (
                        <button
                          key={item.name}
                          type="button"
                          className={`color-swatch-btn ${!editingPlaylist.gradient && editingPlaylist.solidColor === item.solid ? 'selected' : ''}`}
                          style={{ backgroundColor: item.solid }}
                          title={item.name}
                          onClick={() => {
                            setEditingPlaylist({
                              ...editingPlaylist,
                              solidColor: item.solid,
                              gradient: undefined,
                              accentColor: item.accent
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {playlistColorTab === 'custom-gradient' && (
                    <div className="custom-gradient-grid">
                      <div className="admin-input-group">
                        <label className="admin-input-label">Color 1 (Start)</label>
                        <div className="custom-color-input-wrap">
                          <input
                            type="color"
                            value={playlistCustomGrad.c1}
                            onChange={e => {
                              const next = { ...playlistCustomGrad, c1: e.target.value };
                              setPlaylistCustomGrad(next);
                              setEditingPlaylist({
                                ...editingPlaylist,
                                gradient: `linear-gradient(${next.angle}, ${next.c1} 0%, ${next.c2} 100%)`,
                                solidColor: undefined
                              });
                            }}
                          />
                          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{playlistCustomGrad.c1}</span>
                        </div>
                      </div>

                      <div className="admin-input-group">
                        <label className="admin-input-label">Color 2 (End)</label>
                        <div className="custom-color-input-wrap">
                          <input
                            type="color"
                            value={playlistCustomGrad.c2}
                            onChange={e => {
                              const next = { ...playlistCustomGrad, c2: e.target.value };
                              setPlaylistCustomGrad(next);
                              setEditingPlaylist({
                                ...editingPlaylist,
                                gradient: `linear-gradient(${next.angle}, ${next.c1} 0%, ${next.c2} 100%)`,
                                solidColor: undefined
                              });
                            }}
                          />
                          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{playlistCustomGrad.c2}</span>
                        </div>
                      </div>

                      <div className="admin-input-group">
                        <label className="admin-input-label">Angle</label>
                        <select
                          className="admin-input"
                          style={{ padding: '6px 10px', height: 'auto', fontSize: '12px' }}
                          value={playlistCustomGrad.angle}
                          onChange={e => {
                            const next = { ...playlistCustomGrad, angle: e.target.value };
                            setPlaylistCustomGrad(next);
                            setEditingPlaylist({
                              ...editingPlaylist,
                              gradient: `linear-gradient(${next.angle}, ${next.c1} 0%, ${next.c2} 100%)`,
                              solidColor: undefined
                            });
                          }}
                        >
                          <option value="135deg">135° (Diagonal)</option>
                          <option value="90deg">90° (Horizontal)</option>
                          <option value="180deg">180° (Vertical)</option>
                          <option value="45deg">45° (Top-Right)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {playlistColorTab === 'custom-solid' && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="custom-color-input-wrap" style={{ flex: 1 }}>
                        <input
                          type="color"
                          value={playlistCustomSolid}
                          onChange={e => {
                            setPlaylistCustomSolid(e.target.value);
                            setEditingPlaylist({
                              ...editingPlaylist,
                              solidColor: e.target.value,
                              gradient: undefined,
                              accentColor: e.target.value
                            });
                          }}
                        />
                        <input
                          type="text"
                          className="admin-input"
                          style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}
                          value={playlistCustomSolid}
                          onChange={e => {
                            setPlaylistCustomSolid(e.target.value);
                            if (e.target.value.startsWith('#')) {
                              setEditingPlaylist({
                                ...editingPlaylist,
                                solidColor: e.target.value,
                                gradient: undefined,
                                accentColor: e.target.value
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Picker */}
                {!editingPlaylist.isDynamic && (
                  <div className="admin-input-group">
                    <label className="admin-input-label">
                      <span>Select Included Surahs</span>
                      <span style={{ color: '#E4E4E7' }}>Selected: {editingPlaylist.surahIds?.length || 0}</span>
                    </label>

                    <div style={{ position: 'relative', marginBottom: '4px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: '#71717A' }} />
                      <input
                        type="text"
                        className="admin-input"
                        style={{ paddingLeft: '32px', fontSize: '12px', height: '36px' }}
                        placeholder="Search Surah name or number..."
                        value={playlistSearchSurah}
                        onChange={e => setPlaylistSearchSurah(e.target.value)}
                      />
                    </div>

                    <div className="surah-select-grid">
                      {surahs
                        .filter(s =>
                          !playlistSearchSurah ||
                          s.name_transliteration.toLowerCase().includes(playlistSearchSurah.toLowerCase()) ||
                          String(s.id) === playlistSearchSurah
                        )
                        .map(s => {
                          const isSelected = (editingPlaylist.surahIds || []).includes(s.id);
                          return (
                            <div
                              key={s.id}
                              className={`surah-select-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                const current = editingPlaylist.surahIds || [];
                                const next = isSelected
                                  ? current.filter(id => id !== s.id)
                                  : [...current, s.id];
                                setEditingPlaylist({ ...editingPlaylist, surahIds: next });
                              }}
                            >
                              <span>{s.id}.</span>
                              <span style={{ fontWeight: 600 }}>{s.name_transliteration}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setShowPlaylistModal(false);
                    setEditingPlaylist(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  <Check size={16} /> Save Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT / CREATE HERO BANNER (CONTAINED - NO OVERFLOW) */}
      {/* ------------------------------------------------------------- */}
      {showBannerModal && editingBanner && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-container">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {editingBanner.isNew ? 'Create In-App Hero Banner' : 'Edit Hero Banner'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', padding: '4px' }}
                onClick={() => {
                  setShowBannerModal(false);
                  setEditingBanner(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBannerModal}>
              <div className="admin-modal-body">
                {/* Live Card Preview */}
                <div>
                  <span className="admin-input-label" style={{ marginBottom: '6px' }}>Live Banner Preview</span>
                  <div
                    className="admin-banner-preview-card"
                    style={{
                      background: editingBanner.gradient || editingBanner.bgColor || '#1e3a8a',
                      color: editingBanner.textColor || '#ffffff'
                    }}
                  >
                    <span className="admin-banner-preview-badge">{editingBanner.badge || 'PROMO'}</span>
                    <h4 className="admin-banner-preview-title">{editingBanner.title || 'Banner Title'}</h4>
                    <p className="admin-banner-preview-subtitle">{editingBanner.subtitle || 'Banner subtitle text...'}</p>
                    <span className="admin-banner-preview-cta">{editingBanner.ctaText || 'Learn More'}</span>
                  </div>
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Banner Title</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editingBanner.title}
                    onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Subtitle Description</label>
                  <textarea
                    className="admin-input"
                    rows={2}
                    value={editingBanner.subtitle}
                    onChange={e => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div className="admin-input-group">
                    <label className="admin-input-label">Badge Text</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingBanner.badge}
                      onChange={e => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                    />
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-input-label">CTA Button Label</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={editingBanner.ctaText}
                      onChange={e => setEditingBanner({ ...editingBanner, ctaText: e.target.value })}
                    />
                  </div>
                </div>

                {/* Color & Gradient System */}
                <div className="color-picker-section">
                  <label className="admin-input-label">
                    <span>Banner Background Styling</span>
                    <span style={{ color: '#E4E4E7', textTransform: 'none' }}>
                      {editingBanner.gradient ? 'Gradient Active' : 'Solid Active'}
                    </span>
                  </label>

                  <div className="color-mode-tabs">
                    <button
                      type="button"
                      className={`color-mode-btn ${bannerColorTab === 'gradients' ? 'active' : ''}`}
                      onClick={() => setBannerColorTab('gradients')}
                    >
                      Curated Gradients
                    </button>
                    <button
                      type="button"
                      className={`color-mode-btn ${bannerColorTab === 'solids' ? 'active' : ''}`}
                      onClick={() => setBannerColorTab('solids')}
                    >
                      Solid Colors
                    </button>
                    <button
                      type="button"
                      className={`color-mode-btn ${bannerColorTab === 'custom-gradient' ? 'active' : ''}`}
                      onClick={() => setBannerColorTab('custom-gradient')}
                    >
                      Custom Gradient
                    </button>
                    <button
                      type="button"
                      className={`color-mode-btn ${bannerColorTab === 'custom-solid' ? 'active' : ''}`}
                      onClick={() => setBannerColorTab('custom-solid')}
                    >
                      Custom Hex
                    </button>
                  </div>

                  {bannerColorTab === 'gradients' && (
                    <div className="color-swatch-row">
                      {GRADIENT_PALETTES.map(item => (
                        <button
                          key={item.name}
                          type="button"
                          className={`color-swatch-btn ${editingBanner.gradient === item.gradient ? 'selected' : ''}`}
                          style={{ background: item.gradient }}
                          title={item.name}
                          onClick={() => {
                            setEditingBanner({
                              ...editingBanner,
                              gradient: item.gradient,
                              bgColor: undefined
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {bannerColorTab === 'solids' && (
                    <div className="color-swatch-row">
                      {SOLID_PALETTES.map(item => (
                        <button
                          key={item.name}
                          type="button"
                          className={`color-swatch-btn ${!editingBanner.gradient && editingBanner.bgColor === item.solid ? 'selected' : ''}`}
                          style={{ backgroundColor: item.solid }}
                          title={item.name}
                          onClick={() => {
                            setEditingBanner({
                              ...editingBanner,
                              bgColor: item.solid,
                              gradient: undefined
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {bannerColorTab === 'custom-gradient' && (
                    <div className="custom-gradient-grid">
                      <div className="admin-input-group">
                        <label className="admin-input-label">Color 1 (Start)</label>
                        <div className="custom-color-input-wrap">
                          <input
                            type="color"
                            value={bannerCustomGrad.c1}
                            onChange={e => {
                              const next = { ...bannerCustomGrad, c1: e.target.value };
                              setBannerCustomGrad(next);
                              setEditingBanner({
                                ...editingBanner,
                                gradient: `linear-gradient(${next.angle}, ${next.c1} 0%, ${next.c2} 100%)`,
                                bgColor: undefined
                              });
                            }}
                          />
                          <span style={{ fontSize: '11px', color: '#A1A1AA' }}>{bannerCustomGrad.c1}</span>
                        </div>
                      </div>

                      <div className="admin-input-group">
                        <label className="admin-input-label">Color 2 (End)</label>
                        <div className="custom-color-input-wrap">
                          <input
                            type="color"
                            value={bannerCustomGrad.c2}
                            onChange={e => {
                              const next = { ...bannerCustomGrad, c2: e.target.value };
                              setBannerCustomGrad(next);
                              setEditingBanner({
                                ...editingBanner,
                                gradient: `linear-gradient(${next.angle}, ${next.c1} 0%, ${next.c2} 100%)`,
                                bgColor: undefined
                              });
                            }}
                          />
                          <span style={{ fontSize: '11px', color: '#A1A1AA' }}>{bannerCustomGrad.c2}</span>
                        </div>
                      </div>

                      <div className="admin-input-group">
                        <label className="admin-input-label">Angle</label>
                        <select
                          className="admin-input"
                          style={{ padding: '6px 10px', height: 'auto', fontSize: '12px' }}
                          value={bannerCustomGrad.angle}
                          onChange={e => {
                            const next = { ...bannerCustomGrad, angle: e.target.value };
                            setBannerCustomGrad(next);
                            setEditingBanner({
                              ...editingBanner,
                              gradient: `linear-gradient(${next.angle}, ${next.c1} 0%, ${next.c2} 100%)`,
                              bgColor: undefined
                            });
                          }}
                        >
                          <option value="135deg">135° (Diagonal)</option>
                          <option value="90deg">90° (Horizontal)</option>
                          <option value="180deg">180° (Vertical)</option>
                          <option value="45deg">45° (Top-Right)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {bannerColorTab === 'custom-solid' && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="custom-color-input-wrap" style={{ flex: 1 }}>
                        <input
                          type="color"
                          value={bannerCustomSolid}
                          onChange={e => {
                            setBannerCustomSolid(e.target.value);
                            setEditingBanner({
                              ...editingBanner,
                              bgColor: e.target.value,
                              gradient: undefined
                            });
                          }}
                        />
                        <input
                          type="text"
                          className="admin-input"
                          style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}
                          value={bannerCustomSolid}
                          onChange={e => {
                            setBannerCustomSolid(e.target.value);
                            if (e.target.value.startsWith('#')) {
                              setEditingBanner({
                                ...editingBanner,
                                bgColor: e.target.value,
                                gradient: undefined
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Scheduling Timers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div className="admin-input-group">
                    <label className="admin-input-label">Start Date</label>
                    <input
                      type="date"
                      className="admin-input"
                      value={editingBanner.startDate || ''}
                      onChange={e => setEditingBanner({ ...editingBanner, startDate: e.target.value })}
                    />
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-input-label">Expiry Date</label>
                    <input
                      type="date"
                      className="admin-input"
                      value={editingBanner.endDate || ''}
                      onChange={e => setEditingBanner({ ...editingBanner, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-switch-container">
                  <div className="admin-switch-label">
                    <span className="admin-switch-title">Active Status</span>
                    <span className="admin-switch-desc">Show on Home Screen within date window</span>
                  </div>
                  <div
                    className={`admin-toggle-switch ${editingBanner.isActive ? 'on' : ''}`}
                    onClick={() => setEditingBanner({ ...editingBanner, isActive: !editingBanner.isActive })}
                  >
                    <div className="admin-toggle-handle" />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setShowBannerModal(false);
                    setEditingBanner(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  <Check size={16} /> Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT / CREATE SCHEDULED NOTIFICATION RULE */}
      {/* ------------------------------------------------------------- */}
      {showRuleModal && editingRule && (
        <div className="admin-modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="admin-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color="#6366f1" />
                <h3 className="admin-modal-title">
                  {editingRule.isNew ? 'Create Day-by-Day Notification Schedule' : 'Edit Notification Schedule'}
                </h3>
              </div>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowRuleModal(false);
                  setEditingRule(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRuleModal}>
              <div className="admin-modal-body">
                {/* Notification Title */}
                <div className="admin-input-group">
                  <label className="admin-input-label">Notification Title &amp; Emoji</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Friday Blessing 🕌"
                    value={editingRule.title}
                    onChange={e => setEditingRule({ ...editingRule, title: e.target.value })}
                    required
                  />
                </div>

                {/* Message Body */}
                <div className="admin-input-group">
                  <label className="admin-input-label">Message Body</label>
                  <textarea
                    className="admin-input"
                    rows={2}
                    placeholder="e.g. Whoever reads Surah Al-Kahf on Friday will have light between the two Fridays."
                    value={editingRule.body}
                    onChange={e => setEditingRule({ ...editingRule, body: e.target.value })}
                    required
                  />
                </div>

                {/* Delivery Time & Deep-Link Action */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div className="admin-input-group">
                    <label className="admin-input-label">Scheduled Time (24-Hour)</label>
                    <input
                      type="time"
                      className="admin-input"
                      value={editingRule.time || '09:00'}
                      onChange={e => setEditingRule({ ...editingRule, time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-input-label">Deep-Link Action</label>
                    <select
                      className="admin-input"
                      value={editingRule.action || 'play_surah'}
                      onChange={e => setEditingRule({ ...editingRule, action: e.target.value })}
                    >
                      <option value="play_surah">Play Specific Surah</option>
                      <option value="play_para">Play Specific Para / Juz</option>
                      <option value="open_scholar">Open Specific Reciter</option>
                      <option value="open_zen">Open Zen Immersion Mode</option>
                      <option value="open_library">Open Quran Library</option>
                      <option value="external_url">Open External URL</option>
                    </select>
                  </div>
                </div>

                {/* Deep-Link Target Specific Dropdowns */}
                {editingRule.action === 'play_surah' && (
                  <div className="admin-input-group">
                    <label className="admin-input-label">Target Surah</label>
                    <select
                      className="admin-input"
                      value={editingRule.targetId || '18'}
                      onChange={e => setEditingRule({ ...editingRule, targetId: e.target.value })}
                    >
                      {surahs.map(s => (
                        <option key={s.id} value={s.id}>{s.id}. {s.name_transliteration} ({s.name_arabic})</option>
                      ))}
                    </select>
                  </div>
                )}

                {editingRule.action === 'play_para' && (
                  <div className="admin-input-group">
                    <label className="admin-input-label">Target Para / Juz</label>
                    <select
                      className="admin-input"
                      value={editingRule.targetId || '1'}
                      onChange={e => setEditingRule({ ...editingRule, targetId: e.target.value })}
                    >
                      {paras.map(p => (
                        <option key={p.id} value={p.id}>Para {p.id}: {p.name_transliteration}</option>
                      ))}
                    </select>
                  </div>
                )}

                {editingRule.action === 'open_scholar' && (
                  <div className="admin-input-group">
                    <label className="admin-input-label">Target Reciter / Scholar</label>
                    <select
                      className="admin-input"
                      value={editingRule.targetId || 'scholar-2'}
                      onChange={e => setEditingRule({ ...editingRule, targetId: e.target.value })}
                    >
                      {scholars.map(s => (
                        <option key={s.id} value={s.id}>{s.name_transliteration}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Days of Week Selector Section */}
                <div className="admin-input-group" style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="admin-input-label" style={{ margin: 0 }}>Select Days of the Week</label>
                    <span style={{ fontSize: '12px', color: '#E4E4E7', fontWeight: 600 }}>
                      {getDaySummaryText(editingRule.days)}
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="day-presets-row">
                    <button
                      type="button"
                      className="day-preset-btn"
                      onClick={() => setEditingRule({ ...editingRule, days: [0, 1, 2, 3, 4, 5, 6] })}
                    >
                      Every Day
                    </button>
                    <button
                      type="button"
                      className="day-preset-btn"
                      onClick={() => setEditingRule({ ...editingRule, days: [5] })}
                    >
                      Fridays Only 🕌
                    </button>
                    <button
                      type="button"
                      className="day-preset-btn"
                      onClick={() => setEditingRule({ ...editingRule, days: [1, 4] })}
                    >
                      Mon &amp; Thu (Sunnah)
                    </button>
                    <button
                      type="button"
                      className="day-preset-btn"
                      onClick={() => setEditingRule({ ...editingRule, days: [1, 2, 3, 4, 5] })}
                    >
                      Weekdays
                    </button>
                    <button
                      type="button"
                      className="day-preset-btn"
                      onClick={() => setEditingRule({ ...editingRule, days: [0, 6] })}
                    >
                      Weekends
                    </button>
                  </div>

                  {/* Interactive 7-Day Toggle Buttons */}
                  <div className="day-pills-selector-grid">
                    {DAYS_OF_WEEK.map(d => {
                      const isSelected = (editingRule.days || []).includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`day-selector-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            const cur = Array.isArray(editingRule.days) ? [...editingRule.days] : [];
                            const next = isSelected ? cur.filter(x => x !== d.id) : [...cur, d.id].sort((a,b) => a - b);
                            setEditingRule({ ...editingRule, days: next });
                          }}
                        >
                          <span className="day-pill-short">{d.label}</span>
                          <span className="day-pill-dot" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Toggle Switch */}
                <div className="admin-switch-container" style={{ marginTop: '10px' }}>
                  <div className="admin-switch-label">
                    <span className="admin-switch-title">Schedule Status</span>
                    <span className="admin-switch-desc">Enable notification to trigger on the selected days &amp; time</span>
                  </div>
                  <div
                    className={`admin-toggle-switch ${editingRule.isActive ? 'on' : ''}`}
                    onClick={() => setEditingRule({ ...editingRule, isActive: !editingRule.isActive })}
                  >
                    <div className="admin-toggle-handle" />
                  </div>
                </div>

                {/* Live Mobile Notification Preview Box */}
                <div className="rule-live-preview-box">
                  <span className="preview-box-label">📱 Mobile Lockscreen Notification Preview</span>
                  <div className="mock-lockscreen-notification">
                    <div className="mock-notif-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="mock-notif-icon">📖</div>
                        <span className="mock-notif-app-name">TARJUMA</span>
                      </div>
                      <span className="mock-notif-time">{editingRule.time || '09:00'}</span>
                    </div>
                    <div className="mock-notif-title">{editingRule.title || 'Notification Title'}</div>
                    <div className="mock-notif-body">{editingRule.body || 'Message body text will appear here...'}</div>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setShowRuleModal(false);
                    setEditingRule(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary">
                  <Check size={16} /> Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
