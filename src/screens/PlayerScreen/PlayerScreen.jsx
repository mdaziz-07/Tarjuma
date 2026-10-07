import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Wind, ChevronDown, Star, Plus, Download, CheckCircle2, Check,
  SkipBack, SkipForward, Play, Pause,
  Moon, Volume2, BookOpen, ListMusic,
  Music, VolumeX, Loader2, X, Maximize2, Minimize2
} from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import usePreferencesStore from '../../stores/preferencesStore';
import useDownloadsStore, { getDownloadKey } from '../../stores/downloadsStore';
import usePlaylistStore from '../../stores/playlistStore';
import surahs from '../../data/surahs.json';
import scholars from '../../data/scholars.json';
import paras from '../../data/paras.json';
import { getScholarPhotoUrl } from '../../data/scholarImages';
import CachedImage from '../../components/CachedImage/CachedImage';
import { formatTime, formatTimeRemaining } from '../../utils/formatTime';
import './PlayerScreen.css';

export default function PlayerScreen() {
  const navigate = useNavigate();
  const [showVolumeMix, setShowVolumeMix] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showBgSound, setShowBgSound] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showAyahDropdown, setShowAyahDropdown] = useState(false);
  const [showScholarPicker, setShowScholarPicker] = useState(false);
  const [showSleepTimerPicker, setShowSleepTimerPicker] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  const {
    isPlaying, togglePlay, currentSurahId, currentJuzId, currentAyah,
    currentScholarId, currentMode, playbackSpeed, cycleSpeed,
    previousAyah, nextAyah, currentTime, duration,
    showArabicText, toggleArabicText,
    showTranslation, toggleTranslation,
    isMuted, toggleMute, selectedBackgroundSound,
    recitationVolume, backgroundVolume, setRecitationVolume, setBackgroundVolume,
    currentAyahData, previousAyahData, nextAyahData,
    surahData, ayahTimings,
    seek, sleepTimerMinutes, setSleepTimer,
    setMode, setCurrentSurah, setCurrentJuz, setCurrentScholar, setCurrentAyah,
    isLoadingAudio
  } = usePlayerStore();

  // In-Place Full Screen & Exit Transition States
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = React.useRef(false);
  const ayahListRef = React.useRef(null);
  const ayahItemRefs = React.useRef({});

  const {
    favoriteSurahIds = [],
    favoriteJuzIds = [],
    toggleFavoriteSurah,
    toggleFavoriteJuz
  } = usePreferencesStore();

  const { isDownloaded, isDownloading, downloadProgress, downloadTrack, deleteDownload, getDownloadKey } = useDownloadsStore();
  const { playlists, addItemToPlaylist, removeItemFromPlaylist, createPlaylist } = usePlaylistStore();

  const currentItemType = (currentMode === 2 || currentMode === 3) ? 'juz' : 'surah';
  const currentItemId = (currentMode === 2 || currentMode === 3) ? currentJuzId : currentSurahId;
  const currentDownloadKey = getDownloadKey(currentItemType, currentItemId, currentMode, currentScholarId);

  const isInAnyPlaylist = React.useMemo(() => {
    return (playlists || []).some(pl =>
      (pl.items || []).some(item => item.itemType === currentItemType && item.itemId === currentItemId)
    );
  }, [playlists, currentItemType, currentItemId]);

  const isItemDownloaded = isDownloaded(currentItemType, currentItemId, currentMode, currentScholarId);
  const isItemDownloading = isDownloading(currentItemType, currentItemId, currentMode, currentScholarId);
  const downloadPct = downloadProgress[currentDownloadKey] || 0;

  const handleDownloadClick = () => {
    if (isItemDownloading) {
      // Cancel / pause in-progress download
      useDownloadsStore.getState().cancelDownload(currentDownloadKey);
      return;
    }
    if (isItemDownloaded) {
      if (window.confirm('Delete this offline download?')) {
        deleteDownload(currentDownloadKey);
      }
    } else {
      downloadTrack(currentItemType, currentItemId, currentMode, currentScholarId);
    }
  };

  const handleAddToPlaylist = (playlistId) => {
    let title = '';
    if (currentItemType === 'surah') {
      const s = surahs.find(item => item.id === currentItemId);
      title = s ? s.name_transliteration : `Surah ${currentItemId}`;
    } else {
      const p = paras.find(item => item.id === currentItemId);
      title = `Para ${currentItemId} · ${p ? p.name_transliteration : ''}`;
    }
    addItemToPlaylist(playlistId, { itemType: currentItemType, itemId: currentItemId, title });
    // Don't close modal — user must press Done to close
  };

  // Screen Drag States (GPU accelerated translate3d)
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = React.useRef(0);
  const touchStartX = React.useRef(0);
  const isSwipeDown = React.useRef(false);

  // Bottom Sheets Drag States
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const sheetTouchStartY = React.useRef(0);

  const handleTouchStart = (e) => {
    if (isFullScreen) return;
    // Allow swipe-down gesture from the top ~120px of the player screen,
    // not just the tiny pill/handle — makes dismissal much easier
    const touchY = e.touches[0].clientY;
    const isInTopArea = touchY < 120;
    const isOnPill = e.target.closest('.player-top-pill');
    if (!isInTopArea && !isOnPill) {
      return;
    }

    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
    isSwipeDown.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartY.current || isFullScreen) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - touchStartY.current;
    const diffX = currentX - touchStartX.current;

    if (diffY > 0 && Math.abs(diffY) > Math.abs(diffX)) {
      setDragY(diffY);
      isSwipeDown.current = true;
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setTimeout(() => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }, 260);
  };

  const handleTouchEnd = (e) => {
    if (isFullScreen) return;
    if (isSwipeDown.current && dragY > 90) {
      if (e && e.cancelable) {
        e.preventDefault();
      }
      handleClose();
    } else {
      setDragY(0);
    }
    setIsDragging(false);
    touchStartY.current = 0;
    touchStartX.current = 0;
    isSwipeDown.current = false;
  };

  // Bottom Sheet Touch Drag Handlers
  const handleSheetTouchStart = (e) => {
    if (!e.target.closest('.drag-handle') && !e.target.closest('.content-sheet-header')) {
      return;
    }
    sheetTouchStartY.current = e.touches[0].clientY;
    setIsSheetDragging(true);
  };

  const handleSheetTouchMove = (e) => {
    if (!sheetTouchStartY.current) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - sheetTouchStartY.current;
    if (diffY > 0) {
      setSheetDragY(diffY);
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleSheetTouchEnd = (callback) => {
    if (sheetDragY > 100) {
      callback();
    }
    setSheetDragY(0);
    setIsSheetDragging(false);
    sheetTouchStartY.current = 0;
  };

  const surah = surahs.find(s => s.id === currentSurahId) || surahs[0];
  const scholar = scholars.find(s => s.id === currentScholarId) || scholars[0];
  const isJuzMode = currentMode === 2 || currentMode === 3;
  const activeJuz = paras.find(p => p.id === currentJuzId) || paras[0];
  const activeJuzName = activeJuz ? activeJuz.name_transliteration : '';

  const isFavorite = isJuzMode
    ? (favoriteJuzIds || []).includes(currentJuzId)
    : (favoriteSurahIds || []).includes(currentSurahId);

  const progress = (duration > 0 && isFinite(duration) && isFinite(currentTime))
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;

  const handleProgressDrag = (e) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(100, clickX / width));
    const targetTime = percentage * duration;
    seek(targetTime);
  };

  // Complete Verse Array for Real-Time Ayah Highlighting (Karaoke Sync)
  const allAyahs = React.useMemo(() => {
    if (surahData && surahData[0]?.ayahs && surahData[0].number === currentSurahId) {
      const ar = surahData[0].ayahs;
      const tr = surahData[1]?.ayahs || [];
      return ar.map((a, idx) => ({
        number: a.numberInSurah || idx + 1,
        arabic: a.text,
        translation: tr[idx]?.text || '',
        surahId: currentSurahId,
      }));
    }

    const count = surah ? surah.ayah_count : 7;
    return Array.from({ length: count }, (_, idx) => {
      const num = idx + 1;
      if (num === currentAyah && currentAyahData) {
        return currentAyahData;
      }
      return {
        number: num,
        arabic: `(${surah?.name_transliteration || 'Surah'} - Ayah ${num})`,
        translation: `Ayah ${num}`,
        surahId: currentSurahId,
      };
    });
  }, [surahData, currentSurahId, surah, currentAyah, currentAyahData]);

  // Smooth Auto-Scroll to Active Verse (Karaoke Sync)
  React.useEffect(() => {
    if (!currentAyah || !ayahItemRefs.current) return;
    const activeEl = ayahItemRefs.current[currentAyah];
    if (activeEl && ayahListRef.current) {
      requestAnimationFrame(() => {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      });
    }
  }, [currentAyah, isFullScreen]);

  const handleAyahClick = (ayahNum) => {
    if (isFullScreen) {
      setIsFullScreen(false);
      return;
    }
    setCurrentAyah(ayahNum);
    if (ayahTimings && ayahTimings.length > 0) {
      const timing = ayahTimings.find(t => t.number === ayahNum);
      if (timing && typeof timing.from === 'number') {
        seek(timing.from);
        return;
      }
    }
    if (duration > 0 && surah?.ayah_count > 0) {
      const timePerAyah = duration / surah.ayah_count;
      seek((ayahNum - 1) * timePerAyah);
    }
  };

  const handleScreenTap = (e) => {
    // Close ayah dropdown if open and tapped outside the wrapper
    if (showAyahDropdown && !e.target.closest('#ayah-selector-pill-wrapper')) {
      setShowAyahDropdown(false);
    }
    if (isFullScreen) {
      e.stopPropagation();
      setIsFullScreen(false);
    }
  };

  const handleVolumeDrag = (e, callback) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(100, (clickX / width) * 100));
    callback(Math.round(percentage));
  };

  const sleepTimerOptionLabel = currentMode === 2 || currentMode === 3 ? "End of Para" : "End of Surah";

  return (
    <div
      className={`player-screen ${isClosing ? 'is-closing' : ''} ${isFullScreen ? 'is-fullscreen' : ''}`}
      id="player-screen"
      onClick={handleScreenTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isClosing
          ? 'translate3d(0, 100%, 0)'
          : dragY > 0
            ? `translate3d(0, ${dragY}px, 0)`
            : 'none',
        transition: isDragging
          ? 'none'
          : 'transform 0.26s cubic-bezier(0.32, 0, 0.67, 0), opacity 0.26s ease',
        opacity: isClosing ? 0.85 : 1,
        willChange: 'transform, opacity'
      }}
    >
      {/* Background Photo */}
      <div className="player-bg">
        <div className="player-bg-gradient" />
      </div>

      {/* Header Protector */}
      <div className="player-header-protector" />

      {/* Top Pill (single indicator — no separate drag-handle to avoid double pill) */}
      <div
        className="player-top-pill"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
      />

      {/* Top Controls */}
      <div className="player-top-controls">
        <button
          className="glass-pill"
          onClick={() => navigate('/background-sound')}
          id="bg-sound-pill"
        >
          <Wind size={18} />
          <span>{selectedBackgroundSound === 'none' ? 'Sound' : selectedBackgroundSound}</span>
        </button>

        {/* Surah:Ayah Selector Pill (top-center) — PRD Section [C] */}
        {currentMode === 1 && (
          <div className="ayah-selector-pill-wrapper" id="ayah-selector-pill-wrapper">
            <button
              type="button"
              className="glass-pill ayah-selector-pill"
              id="ayah-selector-pill"
              onClick={(e) => {
                e.stopPropagation();
                setShowAyahDropdown(prev => !prev);
              }}
              aria-expanded={showAyahDropdown}
              aria-label="Select Ayah"
            >
              <ChevronDown size={15} strokeWidth={2.2} />
              <span>{currentSurahId}:{currentAyah}</span>
            </button>

            {/* Ayah Jump Dropdown */}
            {showAyahDropdown && (
              <div
                className="ayah-dropdown-panel"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="ayah-dropdown-header">
                  <span className="ayah-dropdown-title">{surah?.name_transliteration || 'Surah'}</span>
                  <button
                    className="ayah-dropdown-close"
                    onClick={(e) => { e.stopPropagation(); setShowAyahDropdown(false); }}
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="ayah-dropdown-grid">
                  {Array.from({ length: surah?.ayah_count || 7 }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      className={`ayah-dropdown-item ${currentAyah === num ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAyahClick(num);
                        setShowAyahDropdown(false);
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          className="glass-pill"
          onClick={() => setShowModeSelector(!showModeSelector)}
          id="mode-selector-pill"
        >
          <ChevronDown size={16} />
          <span>Mode {currentMode}</span>
        </button>
      </div>

      {/* Ayah Display — Real-time Ayah Highlighting (Karaoke Sync) */}
      <div className="player-ayah-area" ref={ayahListRef}>
        {allAyahs.map((item) => {
          const isActive = item.number === currentAyah;
          return (
            <div
              key={item.number}
              id={`ayah-block-${item.number}`}
              ref={el => { ayahItemRefs.current[item.number] = el; }}
              className={`ayah-block ${isActive ? 'ayah-current active' : 'ayah-inactive'}`}
              onClick={() => handleAyahClick(item.number)}
            >
              <div className="ayah-number-badge">
                <span>{currentSurahId}:{item.number}</span>
              </div>
              <p className={`ayah-arabic-text ${isActive ? 'active' : ''}`}>
                {item.arabic}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom Controls Area */}
      <div className="player-bottom">
        {/* Now Playing Info */}
        <div className="player-now-playing">
          {(currentMode === 2 || currentMode === 4) ? (
            <div className="player-double-photo-container">
              <div className="player-now-photo-wrapper left-above">
                {getScholarPhotoUrl(scholars.find(s => s.id === 'scholar-jalandhary')) ? (
                  <CachedImage
                    src={getScholarPhotoUrl(scholars.find(s => s.id === 'scholar-jalandhary'))}
                    alt="Fateh Muhammed Jalandhary"
                    className="player-now-photo-img"
                  />
                ) : (
                  <div className="mini-player-photo-placeholder double">
                    F
                  </div>
                )}
              </div>
              <div className="player-now-photo-wrapper right-below">
                {getScholarPhotoUrl(scholars.find(s => s.id === 'scholar-2')) ? (
                  <CachedImage
                    src={getScholarPhotoUrl(scholars.find(s => s.id === 'scholar-2'))}
                    alt="Mishary Rashid Alafasy"
                    className="player-now-photo-img"
                  />
                ) : (
                  <div className="mini-player-photo-placeholder double">
                    M
                  </div>
                )}
              </div>
            </div>
          ) : (currentMode === 3 || currentMode === 5) ? (
            <div className="player-now-photo">
              {getScholarPhotoUrl(scholars.find(s => s.id === 'scholar-jalandhary')) ? (
                <CachedImage
                  src={getScholarPhotoUrl(scholars.find(s => s.id === 'scholar-jalandhary'))}
                  alt="Fateh Muhammed Jalandhary"
                  className="player-now-photo-img-single"
                />
              ) : (
                <div className="mini-player-photo-placeholder-single">
                  F
                </div>
              )}
            </div>
          ) : (
            <div className="player-now-photo">
              {getScholarPhotoUrl(scholar) ? (
                <CachedImage
                  src={getScholarPhotoUrl(scholar)}
                  alt={scholar.name_transliteration}
                  className="player-now-photo-img-single"
                />
              ) : (
                <div className="mini-player-photo-placeholder-single">
                  {scholar.name_transliteration.charAt(0)}
                </div>
              )}
            </div>
          )}

          <div className="player-now-info">
            <span className="player-now-surah">
              {isJuzMode ? `Para ${currentJuzId} · ${activeJuzName}` : surah.name_transliteration}
            </span>
            {(currentMode === 2 || currentMode === 4) ? (
              <div className="player-now-scholar multi-scholar">
                <div className="reciter-line">
                  Recitation: <span className="name-bold">Mishary Rashid Alafasy</span>
                </div>
                <div className="translator-line">
                  Translation: <span className="name-bold">Fateh Muhammed Jalandhary</span>
                </div>
              </div>
            ) : (currentMode === 3 || currentMode === 5) ? (
              <span className="player-now-scholar">
                Fateh Muhammed Jalandhary
              </span>
            ) : (
              <span
                className={`player-now-scholar ${currentMode === 1 ? 'clickable-scholar' : ''}`}
                onClick={currentMode === 1 ? () => setShowScholarPicker(true) : undefined}
              >
                {scholar.name_transliteration}
              </span>
            )}
          </div>
          <div className="player-now-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className={`player-fav-btn player-add-btn ${isInAnyPlaylist ? 'in-playlist' : ''}`}
              onClick={() => setShowAddToPlaylistModal(true)}
              aria-label="Add to Playlist"
              title={isInAnyPlaylist ? "In Playlist" : "Add to Playlist"}
            >
              {isInAnyPlaylist ? <Check size={14} strokeWidth={2.8} color="#ffffff" /> : <Plus size={15} strokeWidth={2.8} />}
            </button>
            <button
              className="player-fav-btn"
              onClick={() => {
                if (isJuzMode) {
                  toggleFavoriteJuz(currentJuzId);
                } else {
                  toggleFavoriteSurah(currentSurahId);
                }
              }}
              aria-label="Favorite"
            >
              <Star size={22} fill={isFavorite ? 'white' : 'none'} />
            </button>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="player-controls">
          <div className="player-controls-side left">
            <button className="player-speed-btn" onClick={cycleSpeed}>
              {playbackSpeed}×
            </button>
          </div>

          <div className="player-controls-center">
            <button className="player-ctrl-btn" onClick={previousAyah} aria-label="Previous">
              <SkipBack size={28} fill="white" />
            </button>
            <button className="player-play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isLoadingAudio ? (
                <Loader2 size={32} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={32} fill="white" />
              ) : (
                <Play size={32} fill="white" />
              )}
            </button>
            <button className="player-ctrl-btn" onClick={nextAyah} aria-label="Next">
              <SkipForward size={28} fill="white" />
            </button>
          </div>

          <div className="player-controls-side right">
            <button
              className={`player-sleep-btn ${sleepTimerMinutes ? 'active' : ''}`}
              onClick={() => setShowSleepTimerPicker(true)}
              style={{ color: sleepTimerMinutes ? 'var(--color-white)' : 'white' }}
              aria-label="Sleep Timer"
            >
              <Moon size={22} fill={sleepTimerMinutes ? 'var(--color-white)' : 'none'} />
              {sleepTimerMinutes && (
                <span className="sleep-badge-text">
                  {sleepTimerMinutes === 'endOfTrack' ? 'End' : `${sleepTimerMinutes}m`}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="player-progress">
          <span className="player-time">{formatTime(currentTime)}</span>
          <div
            className="slider-track"
            onClick={handleProgressDrag}
            onTouchStart={handleProgressDrag}
            onTouchMove={handleProgressDrag}
          >
            <div className="slider-fill" style={{ width: `${progress}%` }} />
            <div className="slider-thumb" style={{ left: `${progress}%` }} />
          </div>
          <span className="player-time">-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>

        {/* Bottom Action Bar */}
        <div className="player-action-bar">
          <button
            className="player-action-btn"
            onClick={() => setShowVolumeMix(!showVolumeMix)}
            aria-label="Volume"
          >
            {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
          <button
            className={`player-action-btn ${isFullScreen ? 'active-zen' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsFullScreen(prev => !prev);
            }}
            aria-label={isFullScreen ? "Exit Full Screen" : "Full Screen (Show Arabic text only)"}
            title={isFullScreen ? "Exit Full Screen" : "Full Screen (Show Arabic text only)"}
          >
            {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          <button
            className={`player-action-btn ${isItemDownloaded ? 'active-download' : ''} ${isItemDownloading ? 'downloading-btn' : ''}`}
            onClick={handleDownloadClick}
            aria-label={isItemDownloading ? 'Cancel Download' : (isItemDownloaded ? 'Downloaded (Tap to delete)' : 'Download offline')}
            title={isItemDownloading ? 'Tap to cancel' : (isItemDownloaded ? 'Downloaded (Tap to delete)' : 'Download offline')}
          >
            {isItemDownloading ? (
              <div className="download-spinner-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontSize: '9px', lineHeight: 1, marginTop: '2px' }}>{downloadPct}%</span>
              </div>
            ) : isItemDownloaded ? (
              <Check size={13} strokeWidth={2.8} color="var(--color-green, #34c759)" />
            ) : (
              <Download size={22} />
            )}
          </button>

          <button
            className="player-action-btn"
            onClick={() => navigate('/queue')}
            aria-label="Queue"
          >
            <ListMusic size={22} />
          </button>
        </div>
      </div>

      {/* Volume Mix Panel */}
      {showVolumeMix && (
        <>
          <div className="overlay-backdrop" onClick={() => setShowVolumeMix(false)} />
          <div className="volume-mix-panel glass-sheet">
            <div className="drag-handle" onClick={() => setShowVolumeMix(false)} />
            <div className="volume-mix-row">
              <span className="volume-mix-label">Quran</span>
              <div className="volume-mix-slider">
                <VolumeX size={16} color="var(--color-muted)" />
                <div
                  className="slider-track"
                  style={{ flex: 1 }}
                  onClick={(e) => handleVolumeDrag(e, setRecitationVolume)}
                  onTouchStart={(e) => handleVolumeDrag(e, setRecitationVolume)}
                  onTouchMove={(e) => handleVolumeDrag(e, setRecitationVolume)}
                >
                  <div className="slider-fill" style={{ width: `${recitationVolume}%` }} />
                  <div
                    className="slider-thumb"
                    style={{ left: `${recitationVolume}%` }}
                  />
                </div>
                <Volume2 size={16} color="var(--color-muted)" />
              </div>
            </div>
            <div className="volume-mix-row">
              <span className="volume-mix-label">Background sound</span>
              <div className="volume-mix-slider">
                <Music size={16} color="var(--color-muted)" />
                <div
                  className="slider-track"
                  style={{ flex: 1 }}
                  onClick={(e) => handleVolumeDrag(e, setBackgroundVolume)}
                  onTouchStart={(e) => handleVolumeDrag(e, setBackgroundVolume)}
                  onTouchMove={(e) => handleVolumeDrag(e, setBackgroundVolume)}
                >
                  <div className="slider-fill" style={{ width: `${backgroundVolume}%` }} />
                  <div
                    className="slider-thumb"
                    style={{ left: `${backgroundVolume}%` }}
                  />
                </div>
                <Music size={16} color="var(--color-muted)" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mode Selector Dropdown */}
      {showModeSelector && (
        <>
          <div className="overlay-backdrop" style={{ zIndex: 110 }} onClick={() => setShowModeSelector(false)} />
          <div className="player-mode-dropdown glass-surface" style={{ zIndex: 120 }}>
            <span className="text-label" style={{ marginBottom: '8px', display: 'block', textAlign: 'center' }}>Select Mode</span>
            {[
              { id: 1, name: 'Mode 1: Arabic Only (Surah)', desc: 'Whole Surah continuous recitation' },
              { id: 2, name: 'Mode 2: Arabic + Hindi (Para)', desc: 'Whole Para with translations' },
              { id: 3, name: 'Mode 3: Hindi Only (Para)', desc: 'Whole Para Hindi translations only' },
              { id: 4, name: 'Mode 4: Arabic + Hindi (Surah)', desc: 'Whole Surah with translations' },
              { id: 5, name: 'Mode 5: Hindi Only (Surah)', desc: 'Whole Surah Hindi translations only' }
            ].map(m => (
              <button
                key={m.id}
                className={`player-mode-option ${currentMode === m.id ? 'active' : ''}`}
                onClick={() => {
                  setMode(m.id);
                  setShowModeSelector(false);
                }}
              >
                <span className="mode-opt-name">{m.name}</span>
                <span className="mode-opt-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}



      {/* Scholar Picker Bottom Sheet */}
      {showScholarPicker && (
        <>
          <div className="overlay-backdrop" style={{ zIndex: 130 }} onClick={() => setShowScholarPicker(false)} />
          <div
            className="player-content-sheet scholar-picker-sheet glass-sheet"
            style={{
              zIndex: 140,
              transform: sheetDragY > 0 ? `translate3d(0, ${sheetDragY}px, 0)` : 'none',
              transition: isSheetDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={() => handleSheetTouchEnd(() => setShowScholarPicker(false))}
          >
            <div className="drag-handle" onClick={() => setShowScholarPicker(false)} />
            <div className="content-sheet-header">
              <h3 className="text-card-title" style={{ textAlign: 'center', marginBottom: '16px' }}>
                Select Reciter
              </h3>
            </div>
            <div className="content-sheet-list">
              {scholars.map(s => (
                <button
                  key={s.id}
                  className={`content-sheet-row ${currentScholarId === s.id ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentScholar(s.id);
                    setShowScholarPicker(false);
                  }}
                >
                  <div className="sheet-row-badge">
                    {getScholarPhotoUrl(s) ? (
                      <CachedImage
                        src={getScholarPhotoUrl(s)}
                        alt={s.name_transliteration}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    ) : (
                      s.name_transliteration.charAt(0)
                    )}
                  </div>
                  <div className="sheet-row-info">
                    <span className="sheet-row-title">{s.name_transliteration}</span>
                    <span className="sheet-row-sub">{s.name_arabic}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Sleep Timer Picker Centered Modal */}
      {showSleepTimerPicker && (
        <>
          <div className="overlay-backdrop" style={{ zIndex: 130 }} onClick={() => setShowSleepTimerPicker(false)} />
          <div className="player-sleep-timer-modal glass-surface" style={{ zIndex: 140 }}>
            <div className="sleep-timer-header">
              <h3 className="text-card-title">Sleep Timer</h3>
            </div>

            <div className="sleep-timer-scroll-container">
              <div className="sleep-timer-scroll-track">
                {[
                  { label: 'Off', value: null },
                  { label: '5 min', value: 5 },
                  { label: '10 min', value: 10 },
                  { label: '15 min', value: 15 },
                  { label: '20 min', value: 20 },
                  { label: '30 min', value: 30 },
                  { label: '45 min', value: 45 },
                  { label: '60 min', value: 60 },
                  { label: '90 min', value: 90 },
                  { label: '120 min', value: 120 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    className={`sleep-timer-scroll-item ${sleepTimerMinutes === preset.value ? 'active' : ''}`}
                    onClick={() => {
                      setSleepTimer(preset.value);
                      setShowSleepTimerPicker(false);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sleep-timer-divider" />

            <button
              className={`sleep-timer-special-item ${sleepTimerMinutes === 'endOfTrack' ? 'active' : ''}`}
              onClick={() => {
                setSleepTimer('endOfTrack');
                setShowSleepTimerPicker(false);
              }}
            >
              <span>{sleepTimerOptionLabel}</span>
              {sleepTimerMinutes === 'endOfTrack' && <span style={{ fontSize: '0.8rem' }}>✓</span>}
            </button>
          </div>
        </>
      )}

      {/* Add to Playlist Centered Card Modal — rendered via portal to escape player transform */}
      {showAddToPlaylistModal && ReactDOM.createPortal(
        <div
          className="add-playlist-modal-wrapper"
          onClick={() => setShowAddToPlaylistModal(false)}
        >
          <div className="add-playlist-center-card glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="center-card-header">
              <h3 className="text-card-title" style={{ fontSize: '18px', margin: 0 }}>Add to Playlist</h3>
              <span className="text-secondary" style={{ fontSize: '12px', marginTop: '2px', display: 'block' }}>
                Select playlist(s) for this track
              </span>
            </div>

            <div className="new-playlist-inline-form" style={{ display: 'flex', gap: '8px', margin: '14px 0' }}>
              <input
                type="text"
                placeholder="New Playlist Name..."
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '9px 12px',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
              <button
                className="glass-pill"
                disabled={!newPlaylistTitle.trim()}
                onClick={() => {
                  const created = createPlaylist(newPlaylistTitle);
                  if (created) {
                    handleAddToPlaylist(created.id);
                    setNewPlaylistTitle('');
                  }
                }}
                style={{ opacity: newPlaylistTitle.trim() ? 1 : 0.4, padding: '8px 14px', fontSize: '13px' }}
              >
                Create
              </button>
            </div>

            <div className="center-card-playlist-list">
              {playlists.map(pl => {
                const inThisPlaylist = (pl.items || []).some(
                  item => item.itemType === currentItemType && item.itemId === currentItemId
                );
                return (
                  <button
                    key={pl.id}
                    className={`center-playlist-row ${inThisPlaylist ? 'active' : ''}`}
                    onClick={() => {
                      if (inThisPlaylist) {
                        removeItemFromPlaylist(pl.id, currentItemType, currentItemId);
                      } else {
                        handleAddToPlaylist(pl.id);
                      }
                    }}
                  >
                    <div className="sheet-row-badge">
                      <ListMusic size={18} color="white" />
                    </div>
                    <div className="sheet-row-info">
                      <span className="sheet-row-title">{pl.name}</span>
                      <span className="sheet-row-sub">{pl.items ? pl.items.length : 0} items</span>
                    </div>
                    {inThisPlaylist ? (
                      <div className="playlist-check-badge">
                        <Check size={16} color="#ffffff" />
                      </div>
                    ) : (
                      <Plus size={18} color="rgba(255,255,255,0.4)" />
                    )}
                  </button>
                );
              })}

              {playlists.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                  No playlists yet. Type a name above and tap Create!
                </div>
              )}
            </div>

            <div className="center-card-footer">
              <button
                className="playlist-done-btn"
                onClick={() => setShowAddToPlaylistModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
