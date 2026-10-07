import React from 'react';
import { Star } from 'lucide-react';
import WaveformBars from '../WaveformBars/WaveformBars';
import './SurahRow.css';

export default function SurahRow({ surah, isPlaying, isFavorite, onToggleFavorite, onClick, compact }) {
  return (
    <div className={`surah-row ${compact ? 'compact' : ''}`} onClick={() => onClick?.(surah)}>
      <div className="surah-badge">
        {isPlaying ? (
          <WaveformBars size="small" />
        ) : (
          <span>{surah.id}</span>
        )}
      </div>
      
      <div className="surah-row-info">
        <div className="surah-row-primary">
          <span className="surah-name">{surah.name_transliteration}</span>
          <span className="surah-arabic-inline"> ({surah.name_arabic})</span>
        </div>
        <span className="surah-meaning">{surah.name_english}</span>
      </div>
      
      <button 
        className="surah-row-menu" 
        onClick={(e) => { 
          e.stopPropagation(); 
          onToggleFavorite?.(surah.id); 
        }}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star 
          size={18} 
          color={isFavorite ? "var(--color-orange)" : "var(--color-muted)"} 
          fill={isFavorite ? "var(--color-orange)" : "none"} 
        />
      </button>
    </div>
  );
}
