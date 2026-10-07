/**
 * App Release Notes & Version Changelogs
 * Single source of truth for version history and What's New notes.
 */

export const APP_CHANGELOGS = [
  {
    version: '2.1.0',
    title: 'Daily Tadabbur, Audio Reflections & Social Story Cards',
    releaseDate: 'September 2026',
    isLatest: true,
    tag: 'Latest Release',
    summary: 'Introducing Daily Tadabbur with audio recitation snippets, high-resolution shareable Story & Post image generators with direct WhatsApp & Instagram sharing, iOS-style fading frosted glass header blur, and silky smooth 60fps micro-animations.',
    sections: [
      {
        category: 'New Features',
        icon: 'party-popper',
        items: [
          'Daily Tadabbur Audio Reflection: A fresh deterministic verse of the day every morning with high-quality Mishary Rashid Alafasy audio recitation snippet and playback progress scrubber.',
          'Bilingual Translations & Reflections: Seamless toggle between Urdu and Hindi translations alongside Quranic contemplation insights.',
          'Share Reflection Card Generator: Create luxury 9:16 Instagram/WhatsApp Story cards and 1:1 Social Post cards rendered at crisp canvas resolution with Obsidian and Emerald themes.',
          'One-Tap Direct Image Sharing: Share rendered reflection images directly into WhatsApp, Instagram Stories, Telegram, or system share sheet without losing the image file.',
          'Full Surah Immersion Shortcut: One tap takes you straight into full Surah recitation mode in the main audio player.'
        ]
      },
      {
        category: 'UI & Design Polish',
        icon: 'palette',
        items: [
          'iOS Progressive Header Blur: Soft, progressive frosted-glass header with transparent scrolling, keeping scrolled text cleanly visible.',
          'Precision Tab Clearance: Home and Library tab titles now sit just below where the header blur ends for ideal top breathing room.',
          'Framed Card Spacing: Elegant 8px lateral spacing for the Daily Tadabbur card with sleek rounded corners and subtle dark-theme depth glow.',
          'Enlarged Share Previews: Generously sized preview frame in the share generator so Arabic calligraphy and reflection text are crisp and legible.'
        ]
      },
      {
        category: 'Performance & Animations',
        icon: 'zap',
        items: [
          'Silky Smooth 60fps Transitions: Lag-free contraction and expansion animations for the Mini Player pill and floating action button across all devices.',
          'Zero-Lag Full Screen Player: Fluid full-screen Arabic recitation view with intuitive touch controls and immediate response.',
          'Snippet Bounds & Memory: Audio snippet playback stops precisely at verse end with zero audio bleeding or overlapping playback.'
        ]
      },
      {
        category: 'Bug Fixes & Stability',
        icon: 'check-circle',
        items: [
          'WhatsApp Image Sharing Fix: Removed text override conflicts so WhatsApp and mobile Android intents receive the actual image file.',
          'Canvas High-DPI Clarity: Improved font rendering and text wrapping for Arabic and Urdu scripts on high-resolution screens.',
          'Smooth Intro Transition: Added graceful 1.5-second pacing before showing release notes after completing or skipping onboarding.'
        ]
      }
    ]
  },
  {
    version: '2.1.0',
    title: 'Major v2.0 Release — Smooth Animations, Made For You & In-App Installer',
    releaseDate: 'September 2026',
    isLatest: false,
    tag: 'Previous Major Release',
    summary: 'A major milestone introducing card drag-and-drop customization, silky smooth UI animations, bundled offline reciter artwork, and a direct in-app APK updater.',
    sections: [
      {
        category: 'New Features',
        icon: 'sparkles',
        items: [
          'Interactive Drag & Drop: Customize and reorder Made For You cards with smooth position swap animations.',
          'Direct In-App APK Installer: Direct download and seamless package installation from the update banner.',
          'In-App Changelogs: Read full release notes anytime directly from the Settings screen.'
        ]
      },
      {
        category: 'Performance & Animations',
        icon: 'zap',
        items: [
          'Silky Smooth Mini-Player: Lag-free contraction and expansion animations for the Mini Player & FAB capsule.',
          'Bundled Local Scholar Artwork: Scholar portraits now load instantly from bundled high-res assets with zero latency.',
          'Audio Engine Enhancements: Faster background audio buffering and seamless track-to-track progression.'
        ]
      },
      {
        category: 'UI & Design Polish',
        icon: 'palette',
        items: [
          'Streamlined Library Screen: Quick "+" action at top right to create playlists with a cleaner header.',
          'Refreshed Storage & Downloads: Rounded selectors for Recitation Modes and Scholars, plus perfected data alignment.',
          'Refined Tab Bar: Modern symmetric Library icon design.',
          'Instant Download Status: Surah and Para lists display a clean green downloaded badge once available offline.'
        ]
      },
      {
        category: 'Bug Fixes & Stability',
        icon: 'check-circle',
        items: [
          'Reciter Persistence: Switching recitations now reliably preserves your selected reciter instead of resetting to default.',
          'Insights Charts: Restored weekly listening time graph and recitation mode distribution charts.',
          'Realtime Sync: Improved Supabase connection resilience for maintenance banners and live updates.'
        ]
      }
    ]
  },
  {
    version: '1.9.0',
    title: 'Cloud Backup & Data Sync',
    releaseDate: 'August 2026',
    isLatest: false,
    tag: 'Previous Release',
    summary: 'Added cross-device data backup keys, interactive clock reminder pickers, and improved Hindi translations.',
    sections: [
      {
        category: 'Features & Improvements',
        icon: 'sparkles',
        items: [
          'Secure 16-character backup key generation for transferring streaks and favorites.',
          'Custom reminder clock picker with tactile hour and minute dials.',
          'Optimized offline audio caching for continuous playback without internet.'
        ]
      }
    ]
  }
];

export const CURRENT_APP_VERSION = '2.1.0';

export const DEFAULT_UPDATE_NOTES_TEXT = `• Daily Tadabbur: Verse of the day with Mishary Alafasy audio snippet & reflection
• Share Reflection Cards: Luxury 9:16 Story & 1:1 Post images in Obsidian & Emerald
• Direct Image Sharing: Share actual card photos to WhatsApp, Instagram & any app
• iOS Progressive Header Blur: Soft fading frosted glass with transparent scroll
• Precision Tab Clearance: Tab titles start cleanly right below the blur edge
• Zero-Lag Full Screen: Immersive Arabic recitation view with smooth animations
• Framed Card Spacing: Refined 8px lateral spacing with dark luxury aesthetics`;

/**
 * Returns formatted plaintext bullet points for the latest version.
 * Suitable for Supabase update_notes or remote broadcast fallback.
 */

export function getLatestChangelog() {
  return APP_CHANGELOGS[0] || null;
}

export function getChangelogByVersion(version) {
  return APP_CHANGELOGS.find(c => c.version === version) || null;
}
