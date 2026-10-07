import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Sparkles, Zap, Palette, CheckCircle2, X, Calendar, Tag, ChevronRight } from 'lucide-react';
import { APP_CHANGELOGS } from '../../data/changelogs';
import './ChangelogModal.css';

const CATEGORY_ICONS = {
  'New Features': Sparkles,
  'Performance & Animations': Zap,
  'UI & Design Polish': Palette,
  'Bug Fixes & Stability': CheckCircle2,
  'Features & Improvements': Sparkles
};

export default function ChangelogModal({ isOpen, onClose, initialVersion = '2.1.0' }) {
  const [selectedVersion, setSelectedVersion] = useState(initialVersion);

  if (!isOpen) return null;

  const currentLog = APP_CHANGELOGS.find(l => l.version === selectedVersion) || APP_CHANGELOGS[0];

  return ReactDOM.createPortal(
    <div className="profile-modal-overlay changelog-modal-overlay" onClick={onClose}>
      <div
        className="glass-sheet profile-modal-content changelog-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="drag-handle" onClick={onClose} />

        <button
          className="profile-close-btn"
          onClick={onClose}
          aria-label="Close Changelog"
        >
          <X size={20} />
        </button>

        <div className="profile-modal-body changelog-modal-body">
          {/* Header */}
          <div className="changelog-header">
            <div className="changelog-badge-row">
              <span className="changelog-version-badge">
                <Tag size={13} style={{ marginRight: 4 }} />
                v{currentLog.version}
              </span>
              {currentLog.isLatest && (
                <span className="changelog-latest-pill">
                  <Sparkles size={12} style={{ marginRight: 4 }} />
                  Latest
                </span>
              )}
              <span className="changelog-date">
                <Calendar size={13} style={{ marginRight: 4 }} />
                {currentLog.releaseDate}
              </span>
            </div>
            <h2 className="changelog-title">{currentLog.title}</h2>
            {currentLog.summary && (
              <p className="changelog-summary">{currentLog.summary}</p>
            )}
          </div>

          {/* Version Switcher if multiple versions exist */}
          {APP_CHANGELOGS.length > 1 && (
            <div className="changelog-version-switcher">
              {APP_CHANGELOGS.map(log => (
                <button
                  key={log.version}
                  type="button"
                  className={`changelog-version-tab ${selectedVersion === log.version ? 'active' : ''}`}
                  onClick={() => setSelectedVersion(log.version)}
                >
                  v{log.version}
                  {log.isLatest && <span className="tab-latest-dot" />}
                </button>
              ))}
            </div>
          )}

          {/* Categorized Changes */}
          <div className="changelog-sections">
            {currentLog.sections.map((section, sIdx) => {
              const IconComp = CATEGORY_ICONS[section.category] || Sparkles;
              return (
                <div key={sIdx} className="changelog-section-card">
                  <div className="changelog-section-header">
                    <div className="changelog-section-icon-wrap">
                      <IconComp size={16} />
                    </div>
                    <h4 className="changelog-section-title">{section.category}</h4>
                  </div>
                  <ul className="changelog-items-list">
                    {section.items.map((item, iIdx) => (
                      <li key={iIdx} className="changelog-item">
                        <span className="changelog-bullet-dot" />
                        <span className="changelog-item-text">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Footer Action */}
          <div className="changelog-footer">
            <button
              type="button"
              className="changelog-confirm-btn"
              onClick={onClose}
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
