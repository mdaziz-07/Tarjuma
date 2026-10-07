import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Flame, Award, Volume2, Bell, ChevronRight, X, Clock, Play, Pause, Circle,
  CloudRain, Bird, Waves, Wind, Cat, Moon, Droplets, Fish, Bug, Palmtree, CloudLightning, Music
} from 'lucide-react';
import usePreferencesStore from '../../stores/preferencesStore';
import usePlayerStore from '../../stores/playerStore';
import scholars from '../../data/scholars.json';
import scholarImagesMap from '../../data/scholarImages';
import backgroundSounds from '../../data/backgroundSounds.json';
import { getSoundUrl } from '../../data/soundAssets';
import { requestNotificationPermission } from '../../utils/notificationService';
import { Capacitor } from '@capacitor/core';
import './OnboardingScreen.css';

const SOUND_ICON_MAP = {
  'circle-off': Circle,
  'cloud-rain': CloudRain,
  'bird': Bird,
  'flame': Flame,
  'waves': Waves,
  'wind': Wind,
  'cat': Cat,
  'moon': Moon,
  'droplets': Droplets,
  'fish': Fish,
  'cricket': Bug,
  'wave-cove': Palmtree,
  'cloud-lightning': CloudLightning,
};

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const preferencesStore = usePreferencesStore();
  const playerStore = usePlayerStore();

  const [currentScreen, setCurrentScreen] = useState(1); // 1 to 7
  const [selectedScholar, setSelectedScholar] = useState('scholar-1'); // Default: Yasser Al-Dosari
  const [dailyGoal, setDailyGoal] = useState(20); // Default: 20 min
  const [activePreviewSound, setActivePreviewSound] = useState(null); // Active sound ID being previewed
  const previewAudioRef = useRef(null);

  // Filter scholars for selection (reciters only)
  const reciters = scholars.filter(s => s.id !== 'scholar-jalandhary');

  // Handle background sound previews
  const toggleSoundPreview = (soundId) => {
    // If clicking the active preview, stop it
    if (activePreviewSound === soundId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setActivePreviewSound(null);
      return;
    }

    // Stop existing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    const sound = backgroundSounds.find(s => s.id === soundId);
    const soundUrl = getSoundUrl(sound);
    if (!sound || !soundUrl) return;

    // Play 6 second preview
    const audio = new Audio(soundUrl);
    audio.volume = 0.5;
    previewAudioRef.current = audio;
    setActivePreviewSound(soundId);

    audio.play().catch(err => console.warn('Audio preview failed:', err));

    setTimeout(() => {
      if (previewAudioRef.current === audio) {
        audio.pause();
        previewAudioRef.current = null;
        setActivePreviewSound(null);
      }
    }, 6000);
  };

  // Helper to stop any active audio preview
  const stopSoundPreview = () => {
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
      } catch (e) { }
      previewAudioRef.current = null;
    }
    setActivePreviewSound(null);
  };

  // Stop audio preview when changing onboarding screens or unmounting
  useEffect(() => {
    stopSoundPreview();
    return () => {
      stopSoundPreview();
    };
  }, [currentScreen]);

  // Request notifications permission — only triggered by explicit button tap, not on startup
  const handleEnableNotifications = async () => {
    try {
      const granted = await requestNotificationPermission();
      preferencesStore.setGoalReminders(granted);
    } catch (e) {
      console.warn('Notification permission request failed:', e);
    }
    // Move to Screen 7 regardless of permission result
    setCurrentScreen(7);
  };

  // Skip onboarding: Apply all defaults and exit
  const handleSkip = () => {
    // Apply silent defaults
    preferencesStore.setDefaultScholar('scholar-1');
    preferencesStore.setDailyGoalMinutes(20);
    preferencesStore.setGoalReminders(false);
    preferencesStore.setOnboardingCompleted(true);
    navigate('/');
  };

  // Complete onboarding: Apply user selections and exit
  const handleFinish = () => {
    // Apply preferences
    preferencesStore.setDefaultScholar(selectedScholar);
    preferencesStore.setDailyGoalMinutes(dailyGoal);
    preferencesStore.setOnboardingCompleted(true);
    
    // Reset player store to match default scholar immediately
    playerStore.setCurrentScholar(selectedScholar);

    navigate('/');
  };

  // Navigation handlers
  const goNext = () => {
    if (currentScreen < 7) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const goBack = () => {
    if (currentScreen > 1) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  // SVG semicircular progress details (r=90, length=282.7)
  const arcLength = 282.7;
  const progressPercent = dailyGoal / 60;
  const strokeDashoffset = arcLength * (1 - progressPercent);

  // Render active screen specification
  return (
    <div className="onboarding-container liquid-glass-canvas">
      {/* ── Global Header (Progress Bar & Skip/Back buttons) ── */}
      {currentScreen > 1 && currentScreen < 7 && (
        <div className="onboarding-global-header">
          {/* Back Chevron */}
          <button className="onb-back-btn glass-btn-circle" onClick={goBack} aria-label="Back">
            <ArrowLeft size={16} color="#ffffff" />
          </button>

          {/* Progress Segments */}
          <div className="onb-progress-indicator">
            {[2, 3, 4, 5, 6].map((screenIdx) => {
              let fillClass = 'upcoming';
              if (screenIdx === currentScreen) fillClass = 'active';
              else if (screenIdx < currentScreen) fillClass = 'completed';
              return (
                <div key={screenIdx} className={`onb-progress-pill ${fillClass}`} />
              );
            })}
          </div>

          {/* Skip Button */}
          <button className="onb-skip-btn glass-chip" onClick={handleSkip}>
            Skip
          </button>
        </div>
      )}

      {/* ── Screen Layout Switcher ── */}
      <div className="onboarding-screen-content">
        
        {/* Screen 1: Welcome */}
        {currentScreen === 1 && (
          <div className="onb-screen-welcome fade-in-scale">
            <div className="onb-logo-container">
              {/* Real Tarjuma app logo */}
              <img
                src="/tarjuma_logo.png"
                alt="Tarjuma"
                className="onb-logo-img"
              />
              <div className="onb-logo-glow" />
            </div>
            
            <h1 className="onb-welcome-title">Tarjuma</h1>
            <p className="onb-welcome-subtitle">Listen to the Quran. Understand every word.</p>

            <div className="onb-welcome-bottom">
              <button className="cta-btn primary-glass-btn" onClick={goNext}>
                Get Started
              </button>
              <button className="onb-welcome-skip-link" onClick={handleSkip}>
                Already familiar with Tarjuma? Skip intro
              </button>
            </div>
          </div>
        )}

        {/* Screen 2: Content Modes */}
        {currentScreen === 2 && (
          <div className="onb-screen-modes onb-card-layout">
            <div className="onb-header-group">
              <h2 className="onb-screen-title">Five ways to listen</h2>
              <p className="onb-screen-subtitle">Choose how you experience each recitation.</p>
            </div>

            <div className="onb-modes-stack">
              <div className="onb-mode-glass-card">
                <div className="onb-mode-card-header">
                  <Volume2 size={16} />
                  <span>Arabic Only · Surah-wise</span>
                  <span className="onb-mode-badge-pill">Multiple Reciters</span>
                </div>
                <p className="onb-mode-card-desc">Pure Arabic recitation — choose your favourite reciter.</p>
              </div>

              <div className="onb-mode-glass-card">
                <div className="onb-mode-card-header">
                  <Flame size={16} />
                  <span>Arabic + Hindi · Para-wise</span>
                </div>
                <p className="onb-mode-card-desc">Full Para recitation with Hindi translation after every Ayah.</p>
              </div>

              <div className="onb-mode-glass-card">
                <div className="onb-mode-card-header">
                  <Clock size={16} />
                  <span>Hindi Only · Para-wise</span>
                </div>
                <p className="onb-mode-card-desc">Just the meaning — perfect for commutes.</p>
              </div>

              <div className="onb-mode-glass-card">
                <div className="onb-mode-card-header">
                  <Award size={16} />
                  <span>Arabic + Hindi · Surah-wise</span>
                </div>
                <p className="onb-mode-card-desc">Surah by Surah, recitation and meaning together.</p>
              </div>

              <div className="onb-mode-glass-card">
                <div className="onb-mode-card-header">
                  <Play size={16} />
                  <span>Hindi Only · Surah-wise</span>
                </div>
                <p className="onb-mode-card-desc">Surah-wise Hindi translation only, great for focused understanding.</p>
              </div>
            </div>

            <button className="cta-btn primary-glass-btn onb-footer-btn" onClick={goNext}>
              Continue
            </button>
          </div>
        )}

        {/* Screen 3: Reciters */}
        {currentScreen === 3 && (
          <div className="onb-screen-reciters onb-card-layout">
            <div className="onb-header-group">
              <h2 className="onb-screen-title">Choose your reciter</h2>
              <p className="onb-screen-subtitle">You can always switch reciters later.</p>
            </div>

            <div className="onb-reciters-grid">
              {reciters.map((reciter) => {
                const isSelected = selectedScholar === reciter.id;
                const reciterImg = scholarImagesMap[reciter.id] || reciter.photo_url;

                return (
                  <div 
                    key={reciter.id} 
                    className={`onb-reciter-card glass-panel ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedScholar(reciter.id)}
                  >
                    <div className="onb-reciter-avatar-holder">
                      {reciterImg ? (
                        <img 
                          src={reciterImg} 
                          alt={reciter.name_transliteration} 
                          className="onb-reciter-img"
                        />
                      ) : (
                        <div className="onb-reciter-avatar-placeholder" />
                      )}
                      {isSelected && (
                        <div className="onb-reciter-checked-badge">
                          <Check size={8} color="#000000" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="onb-reciter-name">{reciter.name_transliteration}</span>
                    <span className="onb-reciter-tag">
                      {reciter.recording_type === 'FULL_QURAN' ? 'Full Quran' : 'Selected Surahs'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button className="cta-btn primary-glass-btn onb-footer-btn" onClick={goNext}>
              Next
            </button>
          </div>
        )}

        {/* Screen 4: Daily Goal */}
        {currentScreen === 4 && (
          <div className="onb-screen-goal onb-card-layout">
            <div className="onb-header-group">
              <h2 className="onb-screen-title">Set a daily goal</h2>
              <p className="onb-screen-subtitle">Even a few minutes a day builds a lasting habit.</p>
            </div>

            {/* Semicircular Arc Display */}
            <div className="onb-arc-wrapper">
              <svg width="240" height="140" viewBox="0 0 240 140" className="onb-svg-arc">
                <path
                  d="M 30,120 A 90,90 0 0,1 210,120"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 30,120 A 90,90 0 0,1 210,120"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={arcLength}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
                />
              </svg>
              <div className="onb-arc-center-content">
                <span className="onb-arc-val">{dailyGoal}</span>
                <span className="onb-arc-lbl">minutes</span>
              </div>
            </div>

            {/* Quick Select Pills */}
            <div className="onb-goal-pills-row">
              {[10, 20, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  className={`onb-goal-pill glass-chip ${dailyGoal === mins ? 'selected' : ''}`}
                  onClick={() => setDailyGoal(mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <button className="cta-btn primary-glass-btn onb-footer-btn" onClick={goNext}>
              Next
            </button>
          </div>
        )}

        {/* Screen 5: Background Sounds */}
        {currentScreen === 5 && (
          <div className="onb-screen-sounds onb-card-layout">
            <div className="onb-header-group">
              <h2 className="onb-screen-title">Recitation, layered with calm</h2>
              <p className="onb-screen-subtitle">Mix in gentle ambient sound while you listen.</p>
            </div>

            {/* Sounds grid collection */}
            <div className="onb-sounds-circles-grid">
              {backgroundSounds.filter(s => s.id !== 'none').slice(0, 6).map((sound) => {
                const isPlaying = activePreviewSound === sound.id;
                const IconComponent = SOUND_ICON_MAP[sound.icon] || Music;
                return (
                  <div key={sound.id} className="onb-sound-circle-wrapper">
                    <button 
                      className={`onb-sound-circle-btn glass-panel ${isPlaying ? 'playing' : ''}`}
                      onClick={() => toggleSoundPreview(sound.id)}
                      aria-label={`Preview ${sound.name}`}
                    >
                      <IconComponent size={28} />
                    </button>
                    <span className="onb-sound-circle-name">{sound.name}</span>
                  </div>
                );
              })}
            </div>

            <button className="cta-btn primary-glass-btn onb-footer-btn" onClick={goNext}>
              Next
            </button>
          </div>
        )}

        {/* Screen 6: Notifications Permission */}
        {currentScreen === 6 && (
          <div className="onb-screen-notifications onb-card-layout">
            <div className="onb-header-group">
              <h2 className="onb-screen-title">Stay on track</h2>
              <p className="onb-screen-subtitle">Get a gentle reminder to protect your streak and reach your daily goal.</p>
            </div>

            {/* Lock screen preview */}
            <div className="onb-lockscreen-preview glass-panel">
              <div className="onb-notification-header">
                <div className="onb-notification-logo">T</div>
                <span className="onb-notification-app-name">Tarjuma</span>
                <span className="onb-notification-time">now</span>
              </div>
              <p className="onb-notification-body">Don't lose your streak — 20 minutes left today</p>
            </div>

            {/* Checkmark benefits list */}
            <div className="onb-benefits-list">
              <div className="onb-benefit-item">
                <Check size={14} className="onb-benefit-icon" />
                <span>Daily goal reminders</span>
              </div>
              <div className="onb-benefit-item">
                <Check size={14} className="onb-benefit-icon" />
                <span>Streak protection alerts</span>
              </div>
            </div>

            <div className="onb-notification-actions">
              <button className="cta-btn primary-glass-btn" onClick={handleEnableNotifications}>
                Enable Notifications
              </button>
              <button className="onb-welcome-skip-link" onClick={() => setCurrentScreen(7)}>
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Screen 7: All Set */}
        {currentScreen === 7 && (
          <div className="onb-screen-allset fade-in-scale">
            <div className="onb-checkmark-ring-container">
              <div className="onb-checkmark-ring">
                <Check size={36} color="#ffffff" strokeWidth={3} className="onb-checkmark-check" />
              </div>
              <div className="onb-checkmark-ring-glow" />
            </div>

            <h2 className="onb-welcome-title">You're all set</h2>
            <p className="onb-welcome-subtitle">
              {(scholars.find(s => s.id === selectedScholar) || scholars[0]).name_transliteration} · {dailyGoal} minutes a day
            </p>

            <button className="cta-btn primary-glass-btn onb-footer-btn" onClick={handleFinish}>
              Start Listening
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
