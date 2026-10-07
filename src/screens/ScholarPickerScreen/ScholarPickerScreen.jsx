import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import usePreferencesStore from '../../stores/preferencesStore';
import scholars from '../../data/scholars.json';
import surahs from '../../data/surahs.json';
import { getScholarPhotoUrl } from '../../data/scholarImages';
import CachedImage from '../../components/CachedImage/CachedImage';
import './ScholarPickerScreen.css';

export default function ScholarPickerScreen() {
  const navigate = useNavigate();
  const { currentScholarId, setCurrentScholar } = usePlayerStore();
  const { setLastSelectedScholar } = usePreferencesStore();
  const [expandedId, setExpandedId] = useState(null);
  
  const handleSelect = (scholarId) => {
    setCurrentScholar(scholarId);
    setLastSelectedScholar(scholarId);
    navigate(-1);
  };
  
  return (
    <div className="screen scholar-picker-screen" id="scholar-picker-screen">
      {/* Header */}
      <div className="scholar-picker-header">
        <button className="glass-pill" onClick={() => navigate(-1)} style={{ padding: '10px', borderRadius: '50%' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-section" style={{ flex: 1, textAlign: 'center' }}>Select Reciter</h1>
        <div style={{ width: 40 }} />
      </div>
      
      {/* Scholar List */}
      <div className="scholar-list">
        {scholars.map(scholar => {
          const isActive = currentScholarId === scholar.id;
          const isExpanded = expandedId === scholar.id;
          
          const availableSurahs = scholar.recording_type === 'FULL_QURAN' 
            ? surahs 
            : surahs.filter(s => scholar.available_surah_ids.includes(s.id));
          
          return (
            <div key={scholar.id} className={`scholar-card-item glass-card ${isActive ? 'active-scholar' : ''}`}>
              <div className="scholar-card-main" onClick={() => setExpandedId(isExpanded ? null : scholar.id)}>
                <div className="scholar-card-photo">
                  {getScholarPhotoUrl(scholar) ? (
                    <CachedImage 
                      src={getScholarPhotoUrl(scholar)} 
                      alt={scholar.name_transliteration} 
                      style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="scholar-photo-placeholder" style={{ width: 72, height: 72, borderRadius: 16, fontSize: '1.5rem' }}>
                      {scholar.name_transliteration.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="scholar-card-info">
                  <div className="scholar-card-name-row">
                    <span className="text-card-title">{scholar.name_transliteration}</span>
                    {isActive && <Check size={18} color="var(--color-orange)" />}
                  </div>
                  <span className="text-arabic" style={{ fontSize: 'var(--arabic-inline-size, var(--text-sm))', textAlign: 'left', direction: 'ltr' }}>
                    {scholar.name_arabic}
                  </span>
                  <div className="scholar-card-meta">
                    <Info size={12} color="var(--color-muted)" />
                    <span className="text-secondary">
                      {scholar.recording_type === 'FULL_QURAN' ? 'Full Quran' : `${availableSurahs.length} Surahs`}
                    </span>
                  </div>
                </div>
                <div className="scholar-card-expand">
                  {isExpanded ? <ChevronUp size={18} color="var(--color-muted)" /> : <ChevronDown size={18} color="var(--color-muted)" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="scholar-card-expanded">
                  <p className="scholar-bio">{scholar.bio}</p>
                  
                  <div className="scholar-surah-list">
                    <span className="text-label" style={{ marginBottom: 8, display: 'block' }}>
                      Available Surahs ({availableSurahs.length})
                    </span>
                    <div className="scholar-surah-grid">
                      {availableSurahs.slice(0, 12).map(s => (
                        <div key={s.id} className="scholar-surah-chip">
                          <span className="chip-num">{s.id}</span>
                          <span className="chip-name">{s.name_transliteration}</span>
                        </div>
                      ))}
                      {availableSurahs.length > 12 && (
                        <div className="scholar-surah-chip more">
                          +{availableSurahs.length - 12} more
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    className="scholar-select-btn"
                    onClick={(e) => { e.stopPropagation(); handleSelect(scholar.id); }}
                  >
                    {isActive ? 'Selected' : 'Select'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
