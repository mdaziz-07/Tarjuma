import React, { useMemo, useState } from 'react';
import { Flame, Calendar, Award, Lock, X } from 'lucide-react';
import useInsightsStore from '../../stores/insightsStore';
import './ProgressArc.css';

/* ── Custom Streak Badge Icons (Using 🔥 emoji) ── */
const StreakBadgeIcon = ({ days, isSpecial }) => {
  if (days === 365) {
    return (
      <div className="badge-emoji-container special year-streak">
        <span className="badge-emoji">🏆</span>
        <div className="badge-star-ring">🌟</div>
      </div>
    );
  }
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

const STREAK_MILESTONES = [7, 10, 20, 40, 50, 100, 150, 200, 250, 300, 350, 365, 400, 450, 500];
const HOURS_MILESTONES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 10, 20, 30, 50, 100, 200, 300];

const isYearMilestone = (days) => days === 365;

const getHoursLabel = (hrs) => {
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  return `${hrs}h`;
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

export default function ProgressArc({ currentMinutes = 0, goalMinutes = 15, onGoalClick }) {
  const { sessions = [], getTodayTotal } = useInsightsStore();
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [activeTab, setActiveTab] = useState('streak'); // 'streak' or 'hours'
  
  const progress = Math.min(currentMinutes / goalMinutes, 1);
  
  const size = 300;
  const strokeWidth = 12;
  const radius = 124;
  const center = 150;
  
  // Semicircle path (180 degrees, Left to Right via Top)
  // Centered with padding: left x = 26, y = 150, right x = 274, y = 150
  const trackPath = `M 26 150 A 124 124 0 0 1 274 150`;
  
  // Progress path starts at left (26, 150) and goes to calculated coordinates
  const progressPath = useMemo(() => {
    if (progress <= 0) return '';
    const angleRad = Math.PI - (progress * Math.PI); // starts at PI (left) and sweeps to 0 (right)
    const endX = 150 + 124 * Math.cos(angleRad);
    const endY = 150 - 124 * Math.sin(angleRad); // negative because SVG Y-axis goes down
    
    return `M 26 150 A 124 124 0 0 1 ${endX} ${endY}`;
  }, [progress]);
  
  const hours = Math.floor(currentMinutes / 60);
  const mins = Math.round(currentMinutes % 60);
  const timeDisplay = hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}`;
  const unit = hours > 0 ? '' : 'm';
  
  // Calculate weekly completion (S, M, T, W, T, F, S)
  const weeklyCompletion = useMemo(() => {
    const completion = [];
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const now = new Date();
    const currentDayIndex = now.getDay(); // 0 = Sunday, 6 = Saturday
    const todayStr = now.toISOString().split('T')[0];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      const diff = i - currentDayIndex;
      d.setDate(now.getDate() + diff);
      const dateStr = d.toISOString().split('T')[0];
      
      let totalSeconds = 0;
      if (dateStr === todayStr) {
        totalSeconds = getTodayTotal();
      } else {
        totalSeconds = sessions
          .filter(s => s.date === dateStr)
          .reduce((sum, s) => sum + s.durationSeconds, 0);
      }
      
      const isCompleted = totalSeconds >= goalMinutes * 60;
      const isToday = i === currentDayIndex;
      const isFuture = i > currentDayIndex;
      
      completion.push({
        label: daysOfWeek[i],
        completed: isCompleted,
        isToday,
        isFuture
      });
    }
    return completion;
  }, [sessions, goalMinutes, getTodayTotal]);

  // Calculate Streak (consecutive days of goal completion)
  const streak = useMemo(() => {
    if (!sessions || sessions.length === 0) return 0;

    const dailyDurations = {};
    sessions.forEach(s => {
      if (s.date) {
        dailyDurations[s.date] = (dailyDurations[s.date] || 0) + s.durationSeconds;
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    dailyDurations[todayStr] = Math.max(dailyDurations[todayStr] || 0, getTodayTotal());

    const targetSeconds = goalMinutes * 60;
    const completedDates = new Set(
      Object.keys(dailyDurations).filter(dateStr => dailyDurations[dateStr] >= targetSeconds)
    );

    if (completedDates.size === 0) return 0;

    let currentStreak = 0;
    let checkDate = new Date();
    let yesterday = new Date(Date.now() - 86400000);
    let yesterdayStr = yesterday.toISOString().split('T')[0];

    let startFromToday = completedDates.has(todayStr);
    let startFromYesterday = completedDates.has(yesterdayStr);

    if (!startFromToday && !startFromYesterday) {
      return 0;
    }

    let currentDate = startFromToday ? checkDate : yesterday;
    
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (completedDates.has(dateStr)) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return currentStreak;
  }, [sessions, goalMinutes, getTodayTotal]);

  // Calculate streak badges list (entire list, no slicing)
  const streakBadgesList = useMemo(() => {
    const mapped = STREAK_MILESTONES.map(days => {
      const unlocked = streak >= days;
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
  }, [streak]);

  const earnedStreaksCount = useMemo(() => streakBadgesList.filter(b => b.unlocked).length, [streakBadgesList]);

  // Calculate total hours
  const rawHours = useMemo(() => {
    const totalSec = (sessions || []).reduce((sum, s) => sum + s.durationSeconds, 0) + getTodayTotal();
    return totalSec / 3600;
  }, [sessions, getTodayTotal]);

  // Calculate hours badges list (entire list, no slicing)
  const hoursBadgesList = useMemo(() => {
    const mapped = HOURS_MILESTONES.map(hrs => {
      const unlocked = rawHours >= hrs;
      const isSpecial = hrs === 100 || hrs === 200 || hrs === 300;

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
      else if (hrs === 200) name = 'Al-Mujtahid — Dedicated';
      else if (hrs === 300) name = 'Khatm Master';

      return {
        id: `hours-${hrs}`,
        value: hrs,
        name,
        unlocked,
        isSpecial,
        type: 'hours'
      };
    });

    const unlocked = mapped.filter(b => b.unlocked);
    const locked = mapped.filter(b => !b.unlocked);
    return [...unlocked, ...locked];
  }, [rawHours]);

  const earnedHoursCount = useMemo(() => hoursBadgesList.filter(b => b.unlocked).length, [hoursBadgesList]);

  // Calculate This Week (minutes in last 7 days)
  const thisWeekMinutes = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let totalSeconds = 0;
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      if (dateStr === todayStr) {
        totalSeconds += getTodayTotal();
      } else {
        const daySeconds = sessions
          .filter(s => s.date === dateStr)
          .reduce((sum, s) => sum + s.durationSeconds, 0);
        totalSeconds += daySeconds;
      }
    }
    return Math.round(totalSeconds / 60);
  }, [sessions, getTodayTotal]);

  // Calculate Record (highest recitation time in single day)
  const recordMinutes = useMemo(() => {
    const dailyDurations = {};
    sessions.forEach(s => {
      if (s.date) {
        dailyDurations[s.date] = (dailyDurations[s.date] || 0) + s.durationSeconds;
      }
    });
    const todayStr = new Date().toISOString().split('T')[0];
    dailyDurations[todayStr] = Math.max(dailyDurations[todayStr] || 0, getTodayTotal());
    
    const durations = Object.values(dailyDurations);
    if (durations.length === 0) return 0;
    const maxSeconds = Math.max(...durations);
    return Math.round(maxSeconds / 60);
  }, [sessions, getTodayTotal]);

  return (
    <div className="progress-arc-container">
      {/* Recitation Stats Card (Streak, This Week, Record) */}
      <div className="recitation-stats-card">
        <div className="stat-item">
          <Flame size={16} className="stat-icon flame" />
          <span className="stat-label">Streak</span>
          <span className="stat-value">{streak} days</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <Calendar size={16} className="stat-icon" />
          <span className="stat-label">This week</span>
          <span className="stat-value">{thisWeekMinutes} min</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <Award size={16} className="stat-icon" />
          <span className="stat-label">Record</span>
          <span className="stat-value">{recordMinutes} min</span>
        </div>
      </div>
      {/* Wrapper to anchor the absolute-positioned center text inside the relative SVG space */}
      <div className="progress-arc-wrapper">
        {/* Semicircle SVG */}
        <svg 
          width={size} 
          height={180} 
          viewBox={`0 0 ${size} 180`}
          className="progress-arc-svg"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="arc-glow" filterUnits="userSpaceOnUse" x="-10" y="-10" width="320" height="200">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track (Liquid Glass style) */}
          <path
            d={trackPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress (Pure White with Glow) */}
          {progress > 0 && (
            <path
              d={progressPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="progress-arc-fill"
              filter="url(#arc-glow)"
            />
          )}
        </svg>
        
        {/* Center content placed inside the Semicircle arch */}
        <div className="progress-arc-center">
          <span className="progress-arc-label">Today's Listening</span>
          <span className="progress-arc-value">
            {timeDisplay}
            <span className="progress-arc-unit">{unit}</span>
          </span>
          <span className="progress-arc-goal">of your {goalMinutes}-minute goal</span>
        </div>
      </div>
      
      <span className="progress-arc-encourage">
        {progress >= 1 ? '🎉 Goal reached!' : 'Keep listening'}
      </span>
      
      {/* Weekly habit tracker days row */}
      <div className="goals-habit-tracker">
        {weeklyCompletion.map((day, idx) => (
          <div 
            key={idx} 
            className={`habit-day ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}`}
            title={day.completed ? 'Goal Completed' : 'Goal Pending'}
          >
            <span>{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
