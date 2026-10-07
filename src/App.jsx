import React, { useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import TabBar from './components/TabBar/TabBar';
import MiniPlayer from './components/MiniPlayer/MiniPlayer';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import InsightsScreen from './screens/InsightsScreen/InsightsScreen';
import LibraryScreen from './screens/LibraryScreen/LibraryScreen';
import SettingsScreen from './screens/SettingsScreen/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen/ProfileScreen';
import PlayerScreen from './screens/PlayerScreen/PlayerScreen';
import BackgroundSoundSheet from './screens/BackgroundSoundSheet/BackgroundSoundSheet';
import QueueSheet from './screens/QueueSheet/QueueSheet';
import ScholarPickerScreen from './screens/ScholarPickerScreen/ScholarPickerScreen';
import MadeForYouScreen from './screens/MadeForYouScreen/MadeForYouScreen';
import OnboardingScreen from './screens/OnboardingScreen/OnboardingScreen';
import usePreferencesStore from './stores/preferencesStore';
import usePlayerStore from './stores/playerStore';
import useInsightsStore from './stores/insightsStore';
import useAudioEngine from './hooks/useAudioEngine';
import useNotificationEngine from './hooks/useNotificationEngine';
import useScrollDirection from './hooks/useScrollDirection';
import { sendImmediateNotification } from './utils/notificationService';
import { App as CapApp } from '@capacitor/app';
import { supabase } from './utils/supabaseClient';
import scholars from './data/scholars.json';
import { ArrowUpCircle, Sparkles, Download, CheckCircle2, X, BookOpen } from 'lucide-react';
import { prefetchAppAssets } from './utils/prefetch';
import AdminScreen from './screens/AdminScreen/AdminScreen';
import { getAppGlobalConfig, getActiveHeroBanner, getRemoteConfigKey } from './services/adminService';
import { recordAppOpenTelemetry } from './services/telemetryService';
import { downloadApk, installApk, storePendingUpdateNotes, checkWhatsNew, dismissWhatsNew, parseUpdateNotes } from './services/updateService';
import { CURRENT_APP_VERSION } from './data/changelogs';
import './App.css';

function AppLayout({ maintenanceConfig }) {
  const location = useLocation();
  const navigate = useNavigate();
  const onboardingCompleted = usePreferencesStore(state => state.onboardingCompleted);

  const isPlayerRoute = ['/player', '/background-sound', '/queue', '/onboarding', '/admin/456123', '/scholar-picker'].includes(location.pathname);
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPlayerScreen = location.pathname === '/player';

  // Initialize global engines
  useAudioEngine();
  useNotificationEngine();

  // ── Scroll-responsive navigation collapse ──
  const { isCollapsed, resetCollapse } = useScrollDirection();
  const [forceExpanded, setForceExpanded] = React.useState(false);
  const forceExpandTimer = useRef(null);

  // Track last active tab route so dismissing /player reveals the tab underneath instead of a black background
  const lastTabLocationRef = useRef({ pathname: '/' });
  const tabPaths = ['/', '/insights', '/library', '/settings', '/profile'];
  if (tabPaths.includes(location.pathname)) {
    lastTabLocationRef.current = location;
  }

  const routesLocation = isPlayerScreen ? lastTabLocationRef.current : location;
  const hidePersistentChrome = ['/background-sound', '/queue', '/onboarding', '/scholar-picker'].includes(location.pathname) || isAdminRoute;

  // Reset collapse when route changes (new screen starts at scrollTop=0) and purge any stray drag clones
  React.useEffect(() => {
    resetCollapse();
    setForceExpanded(false);
    document.querySelectorAll('.mfy-drag-clone').forEach(el => el.remove());
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, [location.pathname, resetCollapse]);

  // When collapsed FAB is tapped, expand temporarily so user can pick a tab
  const handleFabTap = useCallback(() => {
    setForceExpanded(true);
    clearTimeout(forceExpandTimer.current);
    forceExpandTimer.current = setTimeout(() => setForceExpanded(false), 3000);
  }, []);

  // When a tab is selected, collapse again immediately
  const handleTabSelect = useCallback(() => {
    setForceExpanded(false);
    clearTimeout(forceExpandTimer.current);
  }, []);

  // Effective collapsed state — only collapsed if not force-expanded
  const navCollapsed = isCollapsed && !forceExpanded;

  // Cleanup force-expand timer on unmount
  React.useEffect(() => {
    return () => clearTimeout(forceExpandTimer.current);
  }, []);

  // If onboarding is not completed, force redirect to /onboarding (unless accessing admin route)
  if (!onboardingCompleted && location.pathname !== '/onboarding' && !isAdminRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>

      {/* Global Maintenance Banner */}
      {maintenanceConfig?.isActive && !isAdminRoute && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 9999,
            backgroundColor: maintenanceConfig.bannerType === 'error' ? '#991b1b' : '#b45309',
            color: '#ffffff',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '600',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            lineHeight: 1.4
          }}
        >
          <span>⚠️ {maintenanceConfig.message || 'Scheduled system maintenance in progress.'}</span>
          {maintenanceConfig.estimatedEndTime && (
            <span style={{ opacity: 0.85, fontSize: '11.5px' }}>({maintenanceConfig.estimatedEndTime})</span>
          )}
        </div>
      )}

      {/* SVG Filters for Liquid Glass */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <filter id="liquid-glass-refraction">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" seed="2" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="liquid-glass-glow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <Routes location={routesLocation}>
        {/* Onboarding screen */}
        <Route path="/onboarding" element={<OnboardingScreen />} />

        {/* Tab screens */}
        <Route path="/" element={<HomeScreen />} />
        <Route path="/insights" element={<InsightsScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />

        {/* Modal/overlay screens */}
        <Route path="/player" element={<PlayerScreen />} />
        <Route path="/background-sound" element={<BackgroundSoundSheet />} />
        <Route path="/queue" element={<QueueSheet />} />

        {/* Full-screen push */}
        <Route path="/scholar-picker" element={<ScholarPickerScreen />} />
        <Route path="/made-for-you" element={<MadeForYouScreen />} />

        {/* Secret Admin Route */}
        <Route path="/admin/456123" element={<AdminScreen />} />
      </Routes>

      {/* When on /player, render PlayerScreen as an overlay above the active Tab Screen */}
      {isPlayerScreen && <PlayerScreen />}

      {/* iOS Progressive Fading Header Blur (hidden on Player Screen) */}
      {!isPlayerScreen && location.pathname !== '/onboarding' && (
        <div className="ios-header-blur" aria-hidden="true" />
      )}

      {/* Persistent chrome (hidden on sheets/modal screens, rendered on tab screens and under player overlay) */}
      {!hidePersistentChrome && (
        <>
          <MiniPlayer collapsed={navCollapsed} />
          <TabBar
            collapsed={navCollapsed}
            onFabTap={handleFabTap}
            onTabSelect={handleTabSelect}
          />
        </>
      )}
    </>
  );
}

export default function App() {
  const arabicTextSize = usePreferencesStore(state => state.arabicTextSize);
  const onboardingCompleted = usePreferencesStore(state => state.onboardingCompleted);

  // Dynamic Arabic Text Size Token Application
  React.useEffect(() => {
    const size = (arabicTextSize || 'MEDIUM').toLowerCase();
    document.documentElement.setAttribute('data-arabic-size', size);
  }, [arabicTextSize]);

  React.useEffect(() => {
    prefetchAppAssets();
  }, []);

  // Time-Based Theme Accents
  React.useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      // Night theme from 6 PM (18:00) to 6 AM (06:00)
      const isNight = hour >= 18 || hour < 6;
      if (isNight) {
        document.documentElement.classList.add('theme-night');
        document.documentElement.classList.remove('theme-day');
      } else {
        document.documentElement.classList.add('theme-day');
        document.documentElement.classList.remove('theme-night');
      }
    };
    updateTheme();
    const interval = setInterval(updateTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Pre-cache scholar images on first app open
  React.useEffect(() => {
    const cacheScholarImages = async () => {
      try {
        if (localStorage.getItem('tarjuma_images_cached_optimized_v1') === 'true') {
          return;
        }
        if ('caches' in window) {
          const cache = await caches.open('scholar-images');
          const promises = scholars
            .map(s => s.photo_url)
            .filter(Boolean)
            .map(async (url) => {
              try {
                const match = await cache.match(url);
                if (!match) {
                  const response = await fetch(url);
                  if (response.ok) {
                    await cache.put(url, response);
                  }
                }
              } catch (e) {
                console.warn(`Failed to pre-cache image: ${url}`, e);
              }
            });
          await Promise.all(promises);
          localStorage.setItem('tarjuma_images_cached_optimized_v1', 'true');
          console.log('Pre-cached all scholar images successfully.');
        }
      } catch (err) {
        console.warn('Failed to pre-cache scholar images:', err);
      }
    };
    cacheScholarImages();
  }, []);

  // Supabase Authentication Setup with Silent Re-Auth
  React.useEffect(() => {
    const initAuth = async () => {
      try {
        let deviceUuid = localStorage.getItem('tarjuma_device_uuid_override');
        if (!deviceUuid) {
          try {
            const { PersistentUuid } = await import('@capgo/capacitor-persistent-uuid');
            const res = await PersistentUuid.getId();
            deviceUuid = res.id;
          } catch (e) {
            console.warn('Capacitor Persistent UUID plugin not available, using localStorage fallback');
            deviceUuid = localStorage.getItem('tarjuma_device_uuid');
            if (!deviceUuid) {
              deviceUuid = 'web_' + Math.random().toString(36).substring(2, 15);
              localStorage.setItem('tarjuma_device_uuid', deviceUuid);
            }
          }
        }

        let user = null;

        if (deviceUuid) {
          console.log('Retrieved persistent device UUID:', deviceUuid);
          const email = `device_${deviceUuid}@tarjuma.app`;
          const password = `pass_${deviceUuid}`;

          try {
            // Check if mapping exists in custom table
            const { data: mapping, error: mapError } = await supabase
              .from('device_user_mappings')
              .select('user_id')
              .eq('device_uuid', deviceUuid)
              .maybeSingle();

            if (mapping && mapping.user_id) {
              console.log('Found mapping for device. Logging in silently...', mapping.user_id);
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
              });

              if (!signInError) {
                user = signInData.user;
              } else {
                console.warn('Silent sign-in failed, trying sign-up as fallback:', signInError);
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                  email,
                  password
                });
                if (!signUpError && signUpData.user) {
                  user = signUpData.user;
                  await supabase.from('device_user_mappings').upsert({
                    device_uuid: deviceUuid,
                    user_id: user.id
                  });
                }
              }
            } else {
              console.log('No mapping found. Registering new device user...');
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password
              });

              if (!signUpError && signUpData.user) {
                user = signUpData.user;
                // Save mapping to database
                await supabase.from('device_user_mappings').insert({
                  device_uuid: deviceUuid,
                  user_id: user.id
                });
              } else {
                console.warn('Sign-up failed:', signUpError);
              }
            }
          } catch (dbErr) {
            console.warn('Database error during silent re-auth (mapping table may be missing):', dbErr);
            // Fallback: try to sign in with password directly, in case table is missing but user exists
            try {
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
              });
              if (!signInError) {
                user = signInData.user;
              } else {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                  email,
                  password
                });
                if (!signUpError) {
                  user = signUpData.user;
                }
              }
            } catch (fallbackErr) {
              console.error('Fallback credential auth failed:', fallbackErr);
            }
          }
        }

        // Global fallback to anonymous sign-in if all above methods fail
        if (!user) {
          console.log('Falling back to anonymous sign-in...');
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user;
          if (!user) {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            user = data.user;
          }
        }

        if (user) {
          console.log('Supabase authenticated successfully:', user.id);

          // Hydrate stores
          usePlayerStore.getState().setUserId(user.id);
          usePreferencesStore.getState().hydrateFromSupabase(user.id);
          usePlayerStore.getState().hydrateFromSupabase(user.id);
          useInsightsStore.getState().hydrateFromSupabase(user.id);
        }
      } catch (err) {
        console.error('Failed to initialize Supabase connection:', err);
      }
    };

    initAuth();
  }, []);

  // Semantic version comparison helper: returns -1 if v1 < v2, 1 if v1 > v2, 0 if equal
  const compareVersions = (v1, v2) => {
    if (!v1 && !v2) return 0;
    if (!v1) return -1;
    if (!v2) return 1;
    const p1 = String(v1).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const p2 = String(v2).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 < num2) return -1;
      if (num1 > num2) return 1;
    }
    return 0;
  };

  // State for update, maintenance, and What's New overlays
  const [updateInfo, setUpdateInfo] = React.useState(null);
  const [localVersion, setLocalVersion] = React.useState('2.1.0');
  const [maintenanceConfig, setMaintenanceConfig] = React.useState(null);
  const [downloadState, setDownloadState] = React.useState({ status: 'idle', progress: 0, error: null });
  const [whatsNewInfo, setWhatsNewInfo] = React.useState(null);
  const [showWhatsNewModal, setShowWhatsNewModal] = React.useState(false);

  // When onboarding is completed (or skipped), provide a smooth 1.5s delay before showing the Changelog card
  React.useEffect(() => {
    let timer = null;
    if (whatsNewInfo && !updateInfo && onboardingCompleted) {
      timer = setTimeout(() => {
        setShowWhatsNewModal(true);
      }, 1500);
    } else {
      setShowWhatsNewModal(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [whatsNewInfo, updateInfo, onboardingCompleted]);

  const handleCloseWhatsNew = () => {
    dismissWhatsNew(localVersion);
    setWhatsNewInfo(null);
    setShowWhatsNewModal(false);
  };

  // Consolidated Version and App Config Evaluation
  const checkAppVersionAndConfig = React.useCallback(async () => {
    try {
      let localVer = '2.1.0';
      try {
        const info = await CapApp.getInfo();
        if (info && info.version) {
          localVer = info.version;
          setLocalVersion(localVer);
        }
      } catch (e) {
        console.warn('Capacitor App plugin not available, using default local version');
      }

      // Check if we should show "What's New" after a recent update
      const whatsNew = checkWhatsNew(localVer);
      if (whatsNew) {
        setWhatsNewInfo(whatsNew);
      }

      const globalCfg = await getAppGlobalConfig();
      if (globalCfg) {
        if (globalCfg.maintenance_mode) {
          setMaintenanceConfig(globalCfg.maintenance_mode);
        }

        // If What's New has no stored notes, try to use remote notes
        if (whatsNew && !whatsNew.notes && globalCfg.update_notes) {
          setWhatsNewInfo(prev => prev ? { ...prev, notes: globalCfg.update_notes } : null);
        }

        const latestVersion = globalCfg.latest_version || '2.1.0';
        const minSupportedVersion = globalCfg.min_supported_version || '1.0.0';
        let apkUrl = globalCfg.apk_url || 'https://tarjumaapp.vercel.app/Tarjuma.apk';
        if (!apkUrl.endsWith('.apk') && apkUrl.includes('tarjumaapp.vercel.app')) {
          apkUrl = `${apkUrl.replace(/\/+$/, '')}/Tarjuma.apk`;
        }
        const isStrictForce = Boolean(globalCfg.force_update);

        const isBelowLatest = compareVersions(localVer, latestVersion) < 0;
        const isBelowMin = compareVersions(localVer, minSupportedVersion) < 0;

        // Send local notification ONLY if user is genuinely below the latest version
        if (isBelowLatest) {
          const lastNotifiedKey = 'tarjuma_last_notified_update_version';
          if (localStorage.getItem(lastNotifiedKey) !== latestVersion) {
            await sendImmediateNotification(
              'New Update Available 🚀',
              `Version ${latestVersion} is now available! Please update the app for the latest features and fixes.`
            );
            localStorage.setItem(lastNotifiedKey, latestVersion);
          }
        }

        // Determine if modal should be shown
        if (isBelowMin) {
          setUpdateInfo({
            latestVersion,
            apkUrl,
            isForce: true,
            notes: globalCfg.update_notes || 'This build is deprecated. Please update to continue.'
          });
        } else if (isBelowLatest) {
          setUpdateInfo({
            latestVersion,
            apkUrl,
            isForce: isStrictForce,
            notes: globalCfg.update_notes
          });
        } else {
          setUpdateInfo(null);
        }
      }
    } catch (err) {
      console.error('Failed to check app configuration:', err);
    }
  }, []);

  React.useEffect(() => {
    // Record anonymous session telemetry
    recordAppOpenTelemetry();

    // Initial version & config check
    checkAppVersionAndConfig();

    // Real-time Supabase listener on app_config for instant update broadcasts & maintenance alerts
    const channel = supabase
      .channel('app_config_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        (payload) => {
          const key = payload.new?.key;
          if (key === 'global_app_config' || key === 'latest_version' || key === 'latest_push_broadcast') {
            checkAppVersionAndConfig();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkAppVersionAndConfig]);

  return (
    <BrowserRouter>
      <AppLayout maintenanceConfig={maintenanceConfig} />

      {/* App Update Popup Overlay */}
      {updateInfo && (
        <div className="update-overlay">
          <div className="glass-card update-modal">
            <div className="update-icon-container">
              {downloadState.status === 'downloading' ? (
                <Download size={48} className="update-icon downloading" />
              ) : downloadState.status === 'installing' ? (
                <CheckCircle2 size={48} className="update-icon installing" />
              ) : (
                <ArrowUpCircle size={48} className="update-icon" />
              )}
            </div>
            <h2 className="update-title">
              {downloadState.status === 'downloading'
                ? 'Downloading Update...'
                : downloadState.status === 'installing'
                  ? 'Installing...'
                  : updateInfo.isForce ? 'Update Required ⚠️' : 'New Update Available'}
            </h2>

            {/* Download progress bar */}
            {downloadState.status === 'downloading' && (
              <div className="update-progress-container">
                <div className="update-progress-bar">
                  <div
                    className="update-progress-fill"
                    style={{ width: `${downloadState.progress}%` }}
                  />
                </div>
                <span className="update-progress-text">{downloadState.progress}%</span>
              </div>
            )}

            {/* Error message */}
            {downloadState.error && (
              <p className="update-error">{downloadState.error}</p>
            )}

            {downloadState.status === 'idle' && (
              <>
                <p className="update-description">
                  {updateInfo.isForce
                    ? 'A critical update is required to continue listening. Please update the Tarjuma app now.'
                    : 'A newer version of the Tarjuma app is available with performance fixes and new recitations.'}
                </p>

                {/* Changelog / What's New */}
                {updateInfo.notes && (
                  <div className="update-changelog">
                    <h4 className="update-changelog-title">What's New</h4>
                    <ul className="update-changelog-list">
                      {parseUpdateNotes(updateInfo.notes).map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <div className="update-version-info">
              <span className="version-tag current">v{localVersion}</span>
              <span className="version-divider">→</span>
              <span className="version-tag latest">v{updateInfo.latestVersion}</span>
            </div>
            <div className="update-actions">
              <button
                className="update-btn primary"
                disabled={downloadState.status === 'downloading' || downloadState.status === 'installing'}
                onClick={async () => {
                  try {
                    setDownloadState({ status: 'downloading', progress: 0, error: null });
                    // Store notes for post-update What's New
                    storePendingUpdateNotes(updateInfo.latestVersion, updateInfo.notes);
                    const fileUri = await downloadApk(updateInfo.apkUrl, (progress) => {
                      setDownloadState(prev => ({ ...prev, progress }));
                    });
                    setDownloadState({ status: 'installing', progress: 100, error: null });
                    await installApk(fileUri, updateInfo.apkUrl);
                  } catch (err) {
                    console.error('In-app update failed:', err);
                    setDownloadState({ status: 'idle', progress: 0, error: err.message || 'Download failed. Try again.' });
                  }
                }}
              >
                {downloadState.status === 'downloading'
                  ? `Downloading... ${downloadState.progress}%`
                  : downloadState.status === 'installing'
                    ? 'Opening Installer...'
                    : downloadState.error ? 'Retry Download' : 'Download & Install'}
              </button>
              {downloadState.error && (
                <button
                  type="button"
                  className="update-btn secondary"
                  style={{ marginTop: '8px', fontSize: '13px' }}
                  onClick={() => window.open(updateInfo.apkUrl, '_system')}
                >
                  Download Directly via Browser 🌐
                </button>
              )}
              {!updateInfo.isForce && downloadState.status === 'idle' && (
                <button
                  className="update-btn secondary"
                  onClick={() => { setUpdateInfo(null); setDownloadState({ status: 'idle', progress: 0, error: null }); }}
                >
                  Later
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* What's New / Changelog Floating Centered Card — shown with 1.5s delay after onboarding is completed or skipped */}
      {showWhatsNewModal && !updateInfo && onboardingCompleted && (
        <div className="update-overlay whats-new-overlay">
          <div className="glass-card update-modal whats-new-modal">
            <button
              className="whats-new-close"
              onClick={handleCloseWhatsNew}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <div className="update-icon-container whats-new-icon-container">
              <BookOpen size={30} className="whats-new-icon" />
            </div>
            <h2 className="update-title">What's New in v{whatsNewInfo?.version || CURRENT_APP_VERSION}</h2>
            {whatsNewInfo?.notes ? (
              <div className="update-changelog whats-new-changelog">
                <ul className="update-changelog-list">
                  {parseUpdateNotes(whatsNewInfo.notes).map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="update-description">
                Tarjuma has been updated with new features, performance improvements and bug fixes.
              </p>
            )}
            <div className="update-actions">
              <button
                className="update-btn primary"
                onClick={handleCloseWhatsNew}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}
