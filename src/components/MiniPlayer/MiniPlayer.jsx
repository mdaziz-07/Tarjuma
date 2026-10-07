import React from 'react';
import {
  SkipForward,
  Pause,
  Play,
  Loader2,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import usePlayerStore from '../../stores/playerStore';

import surahs from '../../data/surahs.json';
import scholars from '../../data/scholars.json';
import paras from '../../data/paras.json';

import { getScholarPhotoUrl } from '../../data/scholarImages';

import WaveformBars from '../WaveformBars/WaveformBars';

import './MiniPlayer.css';

export default function MiniPlayer({
  collapsed,
}) {
  const navigate = useNavigate();

  const {
    isPlaying,
    currentSurahId,
    currentJuzId,
    currentScholarId,
    currentMode,
    currentTime,
    duration,
    togglePlay,
    nextAyah,
    isLoadingAudio,
    hideMiniPlayer,
  } = usePlayerStore();


  /*
   * Do not render if player is hidden.
   */
  if (hideMiniPlayer) {
    return null;
  }

  /*
   * Player mode.
   */
  const isJuzMode =
    currentMode === 2 ||
    currentMode === 3;

  const isJalandharyOnlyMode =
    currentMode === 3 ||
    currentMode === 5;

  const isDoubleMode =
    currentMode === 2 ||
    currentMode === 4;

  /*
   * Current content.
   */
  const surah =
    surahs.find(
      (item) => item.id === currentSurahId
    ) || surahs[0];

  const activeJuz =
    paras.find(
      (item) => item.id === currentJuzId
    ) || paras[0];

  const scholar =
    scholars.find(
      (item) => item.id === currentScholarId
    ) || scholars[0];

  const activeJuzName =
    activeJuz?.name_transliteration || '';

  /*
   * Determine which scholar is displayed.
   */
  const activeScholar =
    isJalandharyOnlyMode
      ? (
        scholars.find(
          (item) =>
            item.id === 'scholar-jalandhary'
        ) ||
        scholars[scholars.length - 1] ||
        scholar
      )
      : isDoubleMode
        ? (
          scholars.find(
            (item) =>
              item.id === 'scholar-2'
          ) ||
          scholars[0] ||
          scholar
        )
        : scholar;

  const scholarPhotoUrl =
    getScholarPhotoUrl(activeScholar);

  /*
   * Scholar text.
   */
  const scholarNameText =
    isDoubleMode
      ? 'Mishary Rashid Alafasy -- Jalandhary'
      : isJalandharyOnlyMode
        ? 'Fateh Muhammed Jalandhary'
        : scholar?.name_transliteration || '';

  /*
   * Progress.
   */
  const progress =
    duration > 0 &&
      Number.isFinite(duration) &&
      Number.isFinite(currentTime)
      ? Math.min(
        100,
        Math.max(
          0,
          (currentTime / duration) * 100
        )
      )
      : 0;

  /*
   * Open full player.
   */
  const handleBarClick = (event) => {
    /*
     * Don't open the full player when
     * pressing playback controls.
     */
    if (
      event.target.closest(
        '.mini-player-controls'
      )
    ) {
      return;
    }

    navigate('/player');
  };

  return (
    <div
      id="mini-player"
      className={[
        'mini-player',
        'glass-surface',
        collapsed ? 'nav-collapsed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleBarClick}
      role="button"
      tabIndex={0}
      aria-label="Open player"
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault();
          handleBarClick(event);
        }
      }}
    >
      {/* =================================================
          GLASS HIGHLIGHT
          ================================================= */}

      <div
        className="mini-player-glass-highlight"
        aria-hidden="true"
      />

      {/* =================================================
          SCHOLAR PHOTO
          ================================================= */}

      <div className="mini-player-photo">
        {scholarPhotoUrl ? (
          <img
            src={scholarPhotoUrl}
            alt={
              activeScholar?.name_transliteration ||
              'Scholar'
            }
            className="mini-player-photo-img"
            loading="eager"
            onError={(event) => {
              event.currentTarget.style.display =
                'none';

              const placeholder =
                event.currentTarget
                  .nextElementSibling;

              if (placeholder) {
                placeholder.style.display =
                  'flex';
              }
            }}
          />
        ) : null}

        <div
          className="mini-player-photo-placeholder"
          style={{
            display: scholarPhotoUrl
              ? 'none'
              : 'flex',
          }}
        >
          {activeScholar
            ?.name_transliteration
            ?.charAt(0) || 'Q'}
        </div>
      </div>

      {/* =================================================
          PLAYER INFORMATION
          ================================================= */}

      <div className="mini-player-info">
        <div className="mini-player-title">
          {isJuzMode ? (
            <>
              <span className="mini-player-surah-num">
                {currentJuzId}.{' '}
              </span>

              <span className="mini-player-surah-arabic">
                {activeJuz?.name_arabic}
              </span>

              <span className="mini-player-surah-name">
                {' · '}
                {activeJuzName}
              </span>
            </>
          ) : (
            <>
              <span className="mini-player-surah-num">
                {surah?.id}.{' '}
              </span>

              <span className="mini-player-surah-arabic">
                {surah?.name_arabic}
              </span>

              <span className="mini-player-surah-name">
                {' · '}
                {surah?.name_transliteration}
              </span>
            </>
          )}
        </div>

        <span className="mini-player-scholar">
          {scholarNameText}
        </span>
      </div>

      {/* =================================================
          PLAYER CONTROLS
          ================================================= */}

      <div className="mini-player-controls">
        <button
          type="button"
          className="mini-player-btn mini-player-btn-play"
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          aria-label={
            isPlaying ? 'Pause' : 'Play'
          }
        >
          {isLoadingAudio ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : isPlaying ? (
            <Pause
              size={18}
              fill="white"
            />
          ) : (
            <Play
              size={18}
              fill="white"
            />
          )}
        </button>

        <button
          type="button"
          className="mini-player-btn mini-player-btn-skip"
          onClick={(event) => {
            event.stopPropagation();
            nextAyah();
          }}
          aria-label="Next"
        >
          <SkipForward
            size={16}
            fill="white"
          />
        </button>
      </div>

      {/* =================================================
          PROGRESS
          ================================================= */}

      <div
        className="mini-player-progress-line"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  );
}