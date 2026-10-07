import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Flame, Clock, Lock, Award, ArrowLeft, Edit2 } from 'lucide-react';
import usePreferencesStore from '../../stores/preferencesStore';
import useInsightsStore from '../../stores/insightsStore';
import './ProfileScreen.css';

/* ── SVG Progress Arc Component (With Perfect Alignment) ── */
const ProgressArc = ({ current, target }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, (current / target) * 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="profile-progress-arc-wrapper">
      <svg width="54" height="54" className="profile-progress-arc-svg">
        <circle
          cx="27"
          cy="27"
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="3.5"
        />
        <circle
          cx="27"
          cy="27"
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 27 27)"
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
        <text
          x="27"
          y="27"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="9.5"
          fontWeight="900"
          dy="0.32em"
        >
          {target}
        </text>
      </svg>
    </div>
  );
};

/* ── Custom Streak Badge Icons (Using 🔥 emoji per user request) ── */
const StreakBadgeIcon = ({ days, isSpecial }) => {
  if (isSpecial) {
    return (
      <div className="badge-emoji-container special">
        <span className="badge-emoji">🔥</span>
        <div className="badge-star-ring">✨</div>
      </div>
    );
  }
  return (
    <div className="badge-emoji-container">
      <span className="badge-emoji">🔥</span>
    </div>
  );
};

const HoursBadgeIcon = ({ hrs, isSpecial }) => {
  if (isSpecial) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="badge-svg-icon" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" strokeDasharray="4 2" opacity="0.4" />
        <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9" />
        <rect x="2" y="13" width="3" height="5" rx="1" fill="currentColor" stroke="none" />
        <rect x="19" y="13" width="3" height="5" rx="1" fill="currentColor" stroke="none" />
        <path d="M8 12v2M12 10v6M16 12v2" strokeLinecap="round" />
      </svg>
    );
  }
  if (hrs >= 10) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="badge-svg-icon" stroke="currentColor" strokeWidth="2">
        <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9" />
        <rect x="2" y="13" width="3" height="5" rx="1" fill="currentColor" stroke="none" />
        <rect x="19" y="13" width="3" height="5" rx="1" fill="currentColor" stroke="none" />
        <path d="M8 14h1M11 14h2M15 14h1" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="badge-svg-icon" stroke="currentColor" strokeWidth="2">
      <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9" />
      <rect x="2" y="13" width="3" height="5" rx="1" fill="currentColor" stroke="none" />
      <rect x="19" y="13" width="3" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
};

/* ── Milestone Threshold Tables ── */
const STREAK_MILESTONES = [7, 10, 20, 40, 50, 100, 150, 200, 250, 300, 350, 365, 400, 450, 500];

const getStreakLabel = (days) => {
  if (days === 365) return '1 Year';
  if (days >= 365 && days % 365 === 0) return `${days / 365} Years`;
  return `${days} Days`;
};

const isYearMilestone = (days) => days >= 365 && days % 365 === 0;

const HOURS_MILESTONES = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 
  10, 20, 30, 50, 100, 200, 300
];

const getHoursLabel = (hrs) => {
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  return `${hrs}h`;
};

const isFullHour = (hrs) => hrs >= 1 && hrs % 1 === 0;

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { dailyGoalMinutes, displayName, setDisplayName } = usePreferencesStore();
  const { sessions, getTodayTotal } = useInsightsStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(displayName || 'Tarjuma Listener');

  useEffect(() => {
    setTempName(displayName || 'Tarjuma Listener');
  }, [displayName]);

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setDisplayName(trimmed);
    } else {
      setTempName(displayName || 'Tarjuma Listener');
    }
    setIsEditingName(false);
  };

  /* ── Compute Day Streak & Recent 7 Days ── */
  const { currentStreak, last7Days, listenedToday } = useMemo(() => {
    const dailyDurations = {};
    sessions.forEach(s => {
      if (s.date) {
        dailyDurations[s.date] = (dailyDurations[s.date] || 0) + s.durationSeconds;
      }
    });
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTotalSec = getTodayTotal();
    dailyDurations[todayStr] = Math.max(dailyDurations[todayStr] || 0, todayTotalSec);
    
    const targetSec = dailyGoalMinutes * 60;
    const listenedToday = (dailyDurations[todayStr] || 0) >= targetSec;

    // Check recent 7 days consistency
    const last7DaysList = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const duration = dailyDurations[dStr] || 0;
      last7DaysList.push({
        dateStr: dStr,
        narrowName: d.toLocaleDateString('en', { weekday: 'narrow' }),
        completed: duration >= targetSec
      });
    }

    // Compute Streak
    const completedDates = new Set(
      Object.keys(dailyDurations).filter(d => dailyDurations[d] >= targetSec)
    );

    let streak = 0;
    if (completedDates.size > 0) {
      let checkDate = new Date();
      let yesterday = new Date(Date.now() - 86400000);
      let yesterdayStr = yesterday.toISOString().split('T')[0];
      let startFromToday = completedDates.has(todayStr);
      let startFromYesterday = completedDates.has(yesterdayStr);

      if (startFromToday || startFromYesterday) {
        let currentDate = startFromToday ? checkDate : yesterday;
        while (true) {
          const dStr = currentDate.toISOString().split('T')[0];
          if (completedDates.has(dStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return {
      currentStreak: streak,
      last7Days: last7DaysList,
      listenedToday
    };
  }, [sessions, dailyGoalMinutes, getTodayTotal]);

  /* ── Compute Cumulative Hours & Minutes ── */
  const { totalHours, totalMinutesText, rawHours } = useMemo(() => {
    const totalSec = sessions.reduce((sum, s) => sum + s.durationSeconds, 0) + getTodayTotal();
    const raw = totalSec / 3600;
    const hrs = Math.floor(raw);
    const mins = Math.floor((totalSec % 3600) / 60);
    return {
      totalHours: hrs,
      totalMinutesText: `${hrs}h ${mins}m`,
      rawHours: raw
    };
  }, [sessions, getTodayTotal]);

  /* ── Next milestones & bounds ── */
  const nextStreakMilestone = useMemo(() => {
    const next = STREAK_MILESTONES.find(m => m > currentStreak);
    return next || Math.ceil((currentStreak + 1) / 50) * 50;
  }, [currentStreak]);

  const nextHoursMilestone = useMemo(() => {
    const next = HOURS_MILESTONES.find(m => m > rawHours);
    return next || Math.ceil((rawHours + 1) / 100) * 100;
  }, [rawHours]);

  const prevHoursMilestone = useMemo(() => {
    const idx = HOURS_MILESTONES.findIndex(m => m >= rawHours);
    if (idx <= 0) return 0;
    return HOURS_MILESTONES[idx - 1];
  }, [rawHours]);

  const hoursProgressPercent = useMemo(() => {
    const range = nextHoursMilestone - prevHoursMilestone;
    const currentDiff = rawHours - prevHoursMilestone;
    return Math.min(100, Math.max(0, (currentDiff / range) * 100));
  }, [rawHours, prevHoursMilestone, nextHoursMilestone]);

  const formatHoursLeft = (hoursLeftVal) => {
    if (hoursLeftVal <= 0) return '0m to go';
    const hrs = Math.floor(hoursLeftVal);
    const mins = Math.round((hoursLeftVal - hrs) * 60);
    if (hrs === 0) return `${mins}m to go`;
    if (mins === 0) return `${hrs}h to go`;
    return `${hrs}h ${mins}m to go`;
  };

  /* ── Badge grid lists (Locked badges trail unlocked badges) ── */
  const streakBadgesList = useMemo(() => {
    const nextIdx = STREAK_MILESTONES.findIndex(m => m > currentStreak);
    const showCount = Math.min(STREAK_MILESTONES.length, Math.max(nextIdx + 2, 4));
    const visibleMilestones = STREAK_MILESTONES.slice(0, showCount);

    const mapped = visibleMilestones.map(days => {
      const unlocked = currentStreak >= days;
      const isYear = isYearMilestone(days);
      
      let name = `${days} Days`;
      if (days === 7) name = 'First Week';
      else if (days === 10) name = 'Ten Days';
      else if (days === 20) name = 'Twenty Days';
      else if (days === 40) name = 'Forty Days';
      else if (days === 50) name = 'Fifty Days';
      else if (days === 100) name = 'One Hundred';
      else if (days === 150) name = 'One Fifty';
      else if (days === 200) name = 'Two Hundred';
      else if (days === 250) name = 'Two Fifty';
      else if (days === 300) name = 'Three Hundred';
      else if (days === 350) name = 'Three Fifty';
      else if (days === 365) name = 'Al-Dawam — The Consistent';
      else if (days === 400) name = 'Four Hundred';
      else if (days === 450) name = 'Four Fifty';
      else if (days === 500) name = 'Five Hundred';

      return {
        id: `streak-${days}`,
        value: days,
        name,
        unlocked,
        isSpecial: isYear,
        type: 'streak'
      };
    });

    const unlocked = mapped.filter(b => b.unlocked);
    const locked = mapped.filter(b => !b.unlocked);
    return [...unlocked, ...locked];
  }, [currentStreak]);

  const hoursBadgesList = useMemo(() => {
    const nextIdx = HOURS_MILESTONES.findIndex(m => m > rawHours);
    const showCount = Math.min(HOURS_MILESTONES.length, Math.max(nextIdx + 2, 4));
    const visibleMilestones = HOURS_MILESTONES.slice(0, showCount);

    const mapped = visibleMilestones.map(hrs => {
      const unlocked = rawHours >= hrs;
      const isSpecial = hrs === 100 || hrs === 200 || hrs === 300;
      const isElevated = !isSpecial && isFullHour(hrs);

      let name = getHoursLabel(hrs);
      if (hrs === 0.5) name = 'First Session';
      else if (hrs === 1) name = 'One Hour';
      else if (hrs === 1.5) name = 'One Thirty';
      else if (hrs === 2) name = 'Two Hours';
      else if (hrs === 2.5) name = 'Two Thirty';
      else if (hrs === 3) name = 'Three Hours';
      else if (hrs === 5) name = 'Five Hours';
      else if (hrs === 10) name = 'Ten Hours';
      else if (hrs === 20) name = 'Twenty Hours';
      else if (hrs === 30) name = 'Thirty Hours';
      else if (hrs === 50) name = 'Fifty Hours';
      else if (hrs === 100) name = 'Al-Hafiz — The Keeper';

      return {
        id: `hours-${hrs}`,
        value: hrs,
        name,
        unlocked,
        isSpecial,
        isElevated,
        type: 'hours'
      };
    });

    const unlocked = mapped.filter(b => b.unlocked);
    const locked = mapped.filter(b => !b.unlocked);
    return [...unlocked, ...locked];
  }, [rawHours]);

  const earnedStreaksCount = useMemo(() => streakBadgesList.filter(b => b.unlocked).length, [streakBadgesList]);
  const earnedHoursCount = useMemo(() => hoursBadgesList.filter(b => b.unlocked).length, [hoursBadgesList]);

  return (
    <div className="screen profile-screen" id="profile-screen">
      
      {/* [A] Header with Back Button */}
      <div className="screen-header profile-page-header">
        <button className="profile-back-btn" onClick={() => navigate(-1)} aria-label="Go Back">
          <ArrowLeft size={22} color="#ffffff" />
        </button>
        <h1 className="text-title" style={{ fontSize: '2.1rem', margin: 0 }}>Profile</h1>
      </div>

      <div className="profile-anon-identity">
        <div className="profile-large-avatar">
          <User size={54} color="#ffffff" className="large-avatar-icon" />
        </div>
        
        {isEditingName ? (
          <div className="prof-name-input-container">
            <input
              type="text"
              className="prof-name-input"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setTempName(displayName || 'Tarjuma Listener');
                  setIsEditingName(false);
                }
              }}
              autoFocus
              maxLength={18}
            />
            <button className="prof-name-done-btn" onClick={handleSaveName}>Done</button>
          </div>
        ) : (
          <button className="profile-listener-label-btn" onClick={() => setIsEditingName(true)}>
            <span className="profile-listener-label">{displayName || 'Tarjuma Listener'}</span>
            <Edit2 size={13} className="prof-edit-icon-small" />
          </button>
        )}
      </div>

      {/* [B] Streak Card (Snapchat-style) */}
      <section className="profile-card-section">
        <div className={`snap-streak-card glass-card ${!listenedToday && currentStreak > 0 ? 'streak-at-risk' : ''}`}>
          <div className="snap-card-main">
            {/* Left Side */}
            <div className="snap-card-left">
              {currentStreak > 0 ? (
                <>
                  <span className="snap-metric-val">{currentStreak}</span>
                  <span className="snap-metric-label">
                    {!listenedToday ? 'Listen today to keep your streak' : 'Day Streak'}
                  </span>
                </>
              ) : (
                <>
                  <span className="snap-metric-val">0</span>
                  <span className="snap-metric-label">Start again today</span>
                </>
              )}

              {/* 7-Day Consistency Dots */}
              <div className="snap-dots-row">
                {last7Days.map((day) => (
                  <div 
                    key={day.dateStr} 
                    className={`snap-dot ${day.completed ? 'completed' : 'empty'}`}
                    title={`${day.dateStr}: ${day.completed ? 'Completed' : 'Missed'}`}
                  >
                    <span className="snap-dot-text">{day.narrowName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side */}
            <div className="snap-card-right">
              <div className="snap-streak-icon-wrap">
                {/* 🔥 Fire Emoji representing the streak */}
                <span style={{ fontSize: '32px', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }}>🔥</span>
              </div>
              <ProgressArc current={currentStreak} target={nextStreakMilestone} />
            </div>
          </div>

          {/* Bottom Hairline Strip */}
          <div className="snap-card-footer">
            <span className="snap-footer-left">Next badge at {nextStreakMilestone} days</span>
            <span className="snap-footer-right">
              {currentStreak >= nextStreakMilestone ? 'Earned' : `${nextStreakMilestone - currentStreak} days to go`}
            </span>
          </div>
        </div>
      </section>

      {/* [C] Listening Hours Card (Snapchat-style) */}
      <section className="profile-card-section" style={{ marginTop: '16px' }}>
        <div className="snap-streak-card glass-card">
          <div className="snap-card-main">
            {/* Left Side */}
            <div className="snap-card-left">
              <div className="snap-metric-val-row">
                <span className="snap-metric-val">{totalHours}</span>
                <span className="snap-metric-unit">h</span>
                <span className="snap-metric-val" style={{ marginLeft: '8px' }}>
                  {Math.floor((rawHours - totalHours) * 60)}
                </span>
                <span className="snap-metric-unit">m</span>
              </div>
              <span className="snap-metric-label">Listening Time</span>

              {/* Thin progress bar */}
              <div className="snap-horizontal-track">
                <div 
                  className="snap-horizontal-fill" 
                  style={{ width: `${hoursProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Right Side */}
            <div className="snap-card-right">
              <div className="snap-streak-icon-wrap">
                {/* Headphones Icon */}
                <svg viewBox="0 0 24 24" fill="none" className="snap-streak-glow-icon" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9" />
                  <path d="M2 13h3v5H2zM19 13h3v5h-3z" fill="currentColor" />
                </svg>
              </div>
              <ProgressArc current={rawHours} target={nextHoursMilestone} />
            </div>
          </div>

          {/* Bottom Hairline Strip */}
          <div className="snap-card-footer">
            <span className="snap-footer-left">Next badge at {nextHoursMilestone}h</span>
            <span className="snap-footer-right">
              {formatHoursLeft(nextHoursMilestone - rawHours)}
            </span>
          </div>
        </div>
      </section>

      {/* [D] Streak Badge Collection */}
      <section className="profile-badge-collection-section">
        <div className="profile-badge-grid-header">
          <span className="pb-grid-title">Streak Badges</span>
          <span className="pb-grid-subtitle">{earnedStreaksCount} of {streakBadgesList.length} earned</span>
        </div>
        <div className="profile-badge-flex-grid">
          {streakBadgesList.map(badge => (
            <div 
              key={badge.id}
              className={`prof-badge-tile ${badge.unlocked ? 'unlocked' : 'locked'} ${badge.isSpecial ? 'special' : ''}`}
            >
              <div className="prof-badge-icon-holder">
                <StreakBadgeIcon days={badge.value} isSpecial={badge.isSpecial} />
                {!badge.unlocked && <Lock size={9} className="prof-badge-lock" />}
              </div>
              <span className="prof-badge-tile-name">
                {badge.isSpecial ? 'Al-Dawam' : badge.name}
              </span>
              {badge.isSpecial && badge.unlocked && (
                <span className="prof-badge-tile-sub">1 Year</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* [E] Hours Badge Collection */}
      <section className="profile-badge-collection-section" style={{ marginTop: '24px', marginBottom: '80px' }}>
        <div className="profile-badge-grid-header">
          <span className="pb-grid-title">Listening Badges</span>
          <span className="pb-grid-subtitle">{earnedHoursCount} of {hoursBadgesList.length} earned</span>
        </div>
        <div className="profile-badge-flex-grid">
          {hoursBadgesList.map(badge => (
            <div 
              key={badge.id}
              className={`prof-badge-tile ${badge.unlocked ? 'unlocked' : 'locked'} ${badge.isSpecial ? 'special' : ''} ${badge.isElevated ? 'elevated' : ''}`}
            >
              <div className="prof-badge-icon-holder">
                <HoursBadgeIcon hrs={badge.value} isSpecial={badge.isSpecial} />
                {!badge.unlocked && <Lock size={9} className="prof-badge-lock" />}
              </div>
              <span className="prof-badge-tile-name">
                {badge.isSpecial ? 'Al-Hafiz' : badge.name}
              </span>
              {badge.isSpecial && badge.unlocked && (
                <span className="prof-badge-tile-sub">{badge.value} Hours</span>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
