import React from 'react';

/**
 * Premium Bespoke Navigation Icons for Tarjuma
 * Designed with dual-state rendering:
 * - Inactive: Crisp, minimalist outline (1.8px stroke)
 * - Active: Filled geometric silhouette with micro-accents and luminous glow
 */

// 1. Home Tab Icon — Modern Islamic architectural arch / home
export function HomeTabIcon({ size = 22, isActive = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`tab-icon-svg ${isActive ? 'tab-icon-active' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {isActive ? (
        <g>
          {/* Solid home body with smooth apex */}
          <path
            d="M3.5 10.2C3.5 9.3 3.9 8.5 4.6 7.9L10.9 3.1C11.5 2.6 12.5 2.6 13.1 3.1L19.4 7.9C20.1 8.5 20.5 9.3 20.5 10.2V19C20.5 20.1 19.6 21 18.5 21H15.5C14.9 21 14.5 20.6 14.5 20V15C14.5 14.2 13.8 13.5 13 13.5H11C10.2 13.5 9.5 14.2 9.5 15V20C9.5 20.6 9.1 21 8.5 21H5.5C4.4 21 3.5 20.1 3.5 19V10.2Z"
            fill="currentColor"
          />
          {/* Subtle inner doorway cutout */}
          <path
            d="M9.5 15C9.5 14.2 10.2 13.5 11 13.5H13C13.8 13.5 14.5 14.2 14.5 15V21H9.5V15Z"
            fill="rgba(0, 0, 0, 0.4)"
          />
        </g>
      ) : (
        <path
          d="M3.5 10.2C3.5 9.3 3.9 8.5 4.6 7.9L10.9 3.1C11.5 2.6 12.5 2.6 13.1 3.1L19.4 7.9C20.1 8.5 20.5 9.3 20.5 10.2V19C20.5 20.1 19.6 21 18.5 21H5.5C4.4 21 3.5 20.1 3.5 19V10.2Z"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

// 2. Insights Tab Icon — Audio analytics / spiritual progress pulse
export function InsightsTabIcon({ size = 22, isActive = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`tab-icon-svg ${isActive ? 'tab-icon-active' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {isActive ? (
        <g>
          {/* Active 3-column audio progress bars with spark */}
          <rect x="3.5" y="11" width="4" height="10" rx="2" fill="currentColor" />
          <rect x="10" y="4.5" width="4" height="16.5" rx="2" fill="currentColor" />
          <rect x="16.5" y="8" width="4" height="13" rx="2" fill="currentColor" />
          {/* Ambient spark dot */}
          <circle cx="12" cy="1.8" r="1.5" fill="currentColor" />
        </g>
      ) : (
        <g>
          <rect x="3.5" y="11" width="4" height="10" rx="2" stroke="currentColor" strokeWidth="1.85" />
          <rect x="10" y="5" width="4" height="16" rx="2" stroke="currentColor" strokeWidth="1.85" />
          <rect x="16.5" y="8.5" width="4" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.85" />
        </g>
      )}
    </svg>
  );
}

// 3. Library Tab Icon — Stacked audio collection with rear card shifted to slight right
export function LibraryTabIcon({ size = 22, isActive = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`tab-icon-svg ${isActive ? 'tab-icon-active' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {isActive ? (
        <g>
          {/* Back card layer — offset to the top and slight right */}
          <rect x="6" y="3" width="15" height="14.5" rx="3" fill="currentColor" opacity="0.45" />
          {/* Front collection card */}
          <rect x="3" y="6.5" width="15" height="14.5" rx="3" fill="currentColor" />
          {/* Bookmark ribbon cutout */}
          <path
            d="M8 6.5V12.5L10.5 11L13 12.5V6.5H8Z"
            fill="rgba(0, 0, 0, 0.42)"
          />
          {/* Play/audio indicator jewel */}
          <circle cx="10.5" cy="16.5" r="1.3" fill="rgba(0, 0, 0, 0.38)" />
        </g>
      ) : (
        <g>
          {/* Back card outline — offset to slight right and top */}
          <path
            d="M7 6V4.5C7 3.67 7.67 3 8.5 3H19.5C20.33 3 21 3.67 21 4.5V15.5C21 16.33 20.33 17 19.5 17H18"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Main front card outline */}
          <rect x="3" y="6.5" width="15" height="14.5" rx="3" stroke="currentColor" strokeWidth="1.85" />
          {/* Ribbon outline */}
          <path
            d="M8 6.5V12.5L10.5 11L13 12.5V6.5H8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

// 4. Settings Tab Icon — Refined precision mechanical gear / cog
export function SettingsTabIcon({ size = 22, isActive = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`tab-icon-svg ${isActive ? 'tab-icon-active' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {isActive ? (
        <g>
          {/* Filled gear body */}
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            fill="currentColor"
          />
          {/* Center hole cutout */}
          <circle cx="12" cy="12" r="3.2" fill="var(--color-bg, #0b0f17)" />
          <circle cx="12" cy="12" r="1.5" fill="rgba(255, 255, 255, 0.4)" />
        </g>
      ) : (
        <g>
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.85" />
        </g>
      )}
    </svg>
  );
}
