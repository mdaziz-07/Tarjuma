import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, Share2, Volume2, BookOpen
} from 'lucide-react';
import { getTodayTadabbur, getFormattedTodayDate, formatTadabburShareText, shareToWhatsApp } from '../../services/tadabburService';
import usePlayerStore from '../../stores/playerStore';
import TadabburShareModal from './TadabburShareModal';
import { formatTime } from '../../utils/formatTime';
import './DailyTadabburCard.css';

function DailyTadabburCard() {
  const navigate = useNavigate();
  const isMainPlaying = usePlayerStore((state) => state.isPlaying);
  const toggleMainPlay = usePlayerStore((state) => state.togglePlay);
  const setCurrentSurah = usePlayerStore((state) => state.setCurrentSurah);
  const playMain = usePlayerStore((state) => state.play);

  const [tadabbur, setTadabbur] = useState(() => getTodayTadabbur());
  const [activeLang, setActiveLang] = useState('urdu'); // 'urdu' | 'hindi'
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(18);
  const [showShareModal, setShowShareModal] = useState(false);

  const durationRef = useRef(18);
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  // Sync deterministic verse of the day if date changes
  useEffect(() => {
    const todayVerse = getTodayTadabbur();
    if (!tadabbur || tadabbur.id !== todayVerse.id) {
      setTadabbur(todayVerse);
    }
  }, []);

  // Setup standalone audio controller for audio snippet with strict stop on end
  useEffect(() => {
    if (!tadabbur?.audioUrl) return;

    const audio = new Audio(tadabbur.audioUrl);
    audioRef.current = audio;

    const stopAudio = () => {
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
      setIsPlayingAudio(false);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        const dur = Math.min(Math.round(audio.duration), 30);
        setDuration(dur);
        durationRef.current = dur;
      }
    };

    const onTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);
      const limit = durationRef.current;
      // Stop strictly once the snippet duration ends
      if (limit > 0 && cur >= limit) {
        stopAudio();
      }
    };

    const onEnded = () => {
      stopAudio();
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [tadabbur]);

  // Pause snippet if main Surah player starts playing
  useEffect(() => {
    if (isMainPlaying && isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  }, [isMainPlaying]);

  const toggleSnippetAudio = () => {
    if (!audioRef.current) return;

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      // Pause main player if it was playing to prevent overlap
      if (isMainPlaying) {
        toggleMainPlay();
      }
      // If audio already completed or past duration, reset to 0
      if (audioRef.current.currentTime >= durationRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((e) => {
        console.warn('Audio snippet playback failed:', e);
      });
    }
  };

  const handleSeek = (e) => {
    if (!progressBarRef.current || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const target = pct * durationRef.current;
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleListenFullSurah = () => {
    if (!tadabbur) return;
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
    setCurrentSurah(tadabbur.surahId);
    playMain();
    navigate('/player');
  };

  const handleQuickWhatsAppShare = (e) => {
    e.stopPropagation();
    if (!tadabbur) return;
    const text = formatTadabburShareText(tadabbur, activeLang);
    shareToWhatsApp(text);
  };

  if (!tadabbur) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const translationText = activeLang === 'hindi' ? tadabbur.translationHindi : tadabbur.translationUrdu;

  return (
    <div className="daily-tadabbur-card glass-surface" id="daily-tadabbur-card">
        {/* Card Header */}
        <div className="tadabbur-card-header">
          <div className="tadabbur-header-left">
            <span className="tadabbur-card-title">DAILY TADABBUR</span>
            <span className="tadabbur-date">{getFormattedTodayDate()}</span>
          </div>
          {tadabbur.theme && (
            <span className="tadabbur-theme-pill">{tadabbur.theme}</span>
          )}
        </div>

        {/* Surah Reference Bar */}
        <div className="tadabbur-surah-ref">
          <span className="tadabbur-surah-name">
            Surah {tadabbur.surahName} <span className="arabic-name">({tadabbur.surahArabic})</span>
          </span>
          <span className="tadabbur-ayah-tag">Ayah {tadabbur.ayahNumber}</span>
        </div>

        {/* Arabic Verse */}
        <div className="tadabbur-arabic-block" dir="rtl">
          <p className="tadabbur-arabic-text">
            {tadabbur.arabic}
          </p>
        </div>

        {/* Translation Language Switcher Tabs */}
        <div className="tadabbur-lang-tabs">
          <button
            className={`tadabbur-lang-tab ${activeLang === 'urdu' ? 'active' : ''}`}
            onClick={() => setActiveLang('urdu')}
          >
            اردو (Urdu)
          </button>
          <button
            className={`tadabbur-lang-tab ${activeLang === 'hindi' ? 'active' : ''}`}
            onClick={() => setActiveLang('hindi')}
          >
            हिंदी (Hindi)
          </button>
        </div>

        {/* Translation Text */}
        <p className={`tadabbur-translation-text ${activeLang}`}>
          {translationText}
        </p>

        {/* Reflection Callout */}
        {tadabbur.reflection && (
          <div className="tadabbur-insight-callout">
            <div className="tadabbur-insight-header">
              <span className="tadabbur-insight-title">REFLECTION</span>
            </div>
            <p className="tadabbur-insight-msg">"{tadabbur.reflection}"</p>
          </div>
        )}

        {/* Audio Recitation Bar */}
        <div className="tadabbur-audio-bar">
          <button
            className={`tadabbur-audio-play-btn ${isPlayingAudio ? 'playing' : ''}`}
            onClick={toggleSnippetAudio}
            aria-label={isPlayingAudio ? 'Pause recitation' : 'Play recitation'}
          >
            {isPlayingAudio ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: '2px' }} />}
          </button>

          <div className="tadabbur-audio-track-info">
            <div className="tadabbur-track-labels">
              <span className="tadabbur-audio-label">
                <Volume2 size={13} className="tadabbur-volume-icon" />
                <span>Mishary Rashid Alafasy</span>
              </span>
              <span className="tadabbur-audio-timer">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div
              className="tadabbur-progress-bar"
              ref={progressBarRef}
              onClick={handleSeek}
            >
              <div
                className="tadabbur-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="tadabbur-footer-actions">
          <button
            className="tadabbur-full-surah-btn"
            onClick={handleListenFullSurah}
          >
            <BookOpen size={15} />
            <span>Full Surah</span>
          </button>

          <button
            className="tadabbur-share-story-btn"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 size={15} />
            <span>Share & Story</span>
          </button>
        </div>

        {/* Share Image Generator Modal */}
        {showShareModal && (
          <TadabburShareModal
            tadabbur={tadabbur}
            initialLang={activeLang}
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
  );
}
export default React.memo(DailyTadabburCard);
