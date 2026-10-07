import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Headphones } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Tooltip, ReferenceLine } from 'recharts';
import useInsightsStore from '../../stores/insightsStore';

import scholars from '../../data/scholars.json';
import { formatMinutes } from '../../utils/formatTime';
import './InsightsScreen.css';

const RANGES = ['Day', 'Week', 'Month', '3 Months'];

// Tooltip rendered ABOVE the selected bar/point — position is controlled by recharts
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-popup-tooltip">
        <span className="chart-popup-label">{label}</span>
        <span className="chart-popup-value">{payload[0].value}m</span>
      </div>
    );
  }
  return null;
};

const CustomLineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-popup-tooltip">
        <span className="chart-popup-label">{label}</span>
        {payload.map((p, i) => (
          <span key={i} className="chart-popup-value" style={{ color: p.stroke }}>
            {p.dataKey === 'today' ? 'Today' : 'Avg'}: {p.value}m
          </span>
        ))}
      </div>
    );
  }
  return null;
};

// Dotted vertical cursor for BarChart
const DottedCursor = ({ x, y, width, height }) => (
  <line
    x1={x + width / 2}
    y1={y}
    x2={x + width / 2}
    y2={y + height}
    stroke="rgba(255,255,255,0.35)"
    strokeWidth={1.5}
    strokeDasharray="4 3"
  />
);

export default function InsightsScreen() {
  const [activeRange, setActiveRange] = useState('Week');
  const { getTodayTotal, getWeeklyData, getTopReciters, sessions, seedMockData } = useInsightsStore();
  
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef(null);

  useEffect(() => {
    window.__seedInsights = seedMockData;
  }, [seedMockData]);

  const startHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      setIsHolding(true);
    }, 500);
  };

  const endHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setIsHolding(false);
  };

  useEffect(() => {
    // Auto-seeding of mock data completely disabled to guarantee fresh installations start at 0 minutes
    // if (sessions.length === 0) seedMockData();
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);
  
  const todayTotal = Math.round(getTodayTotal() / 60);
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' });

  // Group and compute chart metrics dynamically based on active time range
  const getChartAndMetricData = () => {
    const now = new Date();
    
    if (activeRange === 'Day') {
      const hours = Array.from({ length: 24 }, (_, i) => {
        const label = `${String(i).padStart(2, '0')}:00`;
        return { label, hour: i, minutes: 0 };
      });
      
      const todayStr = now.toISOString().split('T')[0];
      const todaySessions = sessions.filter(s => s.date === todayStr);
      
      let totalSeconds = 0;
      todaySessions.forEach(s => {
        totalSeconds += s.durationSeconds;
        const startHour = new Date(s.timestampStart).getHours();
        if (startHour >= 0 && startHour < 24) {
          hours[startHour].minutes += Math.round(s.durationSeconds / 60);
        }
      });
      
      return {
        chartData: hours.map(h => ({ day: h.label, minutes: h.minutes })),
        totalMinutes: Math.round(totalSeconds / 60),
        label: 'Today'
      };
    }
    
    if (activeRange === 'Week') {
      const data = [];
      let totalSeconds = 0;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayTotal = sessions
          .filter(s => s.date === dateStr)
          .reduce((sum, s) => sum + s.durationSeconds, 0);
        totalSeconds += dayTotal;
        data.push({
          day: d.toLocaleDateString('en', { weekday: 'short' }),
          date: dateStr,
          minutes: Math.round(dayTotal / 60),
        });
      }
      return {
        chartData: data,
        totalMinutes: Math.round(totalSeconds / 60),
        label: 'This Week'
      };
    }
    
    if (activeRange === 'Month') {
      const data = [];
      let totalSeconds = 0;
      for (let i = 3; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(start.getDate() - (i + 1) * 7 + 1);
        const end = new Date(now);
        end.setDate(end.getDate() - i * 7);
        
        let weekTotal = 0;
        sessions.forEach(s => {
          const sessionDate = new Date(s.date);
          sessionDate.setHours(0,0,0,0);
          const sTime = new Date(start).setHours(0,0,0,0);
          const eTime = new Date(end).setHours(23,59,59,999);
          if (sessionDate.getTime() >= sTime && sessionDate.getTime() <= eTime) {
            weekTotal += s.durationSeconds;
          }
        });
        
        totalSeconds += weekTotal;
        data.push({
          day: `Wk ${4 - i}`,
          minutes: Math.round(weekTotal / 60),
        });
      }
      return {
        chartData: data,
        totalMinutes: Math.round(totalSeconds / 60),
        label: 'This Month'
      };
    }
    
    if (activeRange === '3 Months') {
      const data = [];
      let totalSeconds = 0;
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('en', { month: 'short' });
        const monthNum = d.getMonth();
        const yearNum = d.getFullYear();
        
        const monthTotal = sessions
          .filter(s => {
            const sDate = new Date(s.date);
            return sDate.getMonth() === monthNum && sDate.getFullYear() === yearNum;
          })
          .reduce((sum, s) => sum + s.durationSeconds, 0);
          
        totalSeconds += monthTotal;
        data.push({
          day: monthLabel,
          minutes: Math.round(monthTotal / 60),
        });
      }
      return {
        chartData: data,
        totalMinutes: Math.round(totalSeconds / 60),
        label: 'Past 3 Months'
      };
    }
    
    return { chartData: [], totalMinutes: 0, label: '' };
  };

  const getHighlightData = () => {
    const timeSlots = [
      { time: '00:00', hour: 0 },
      { time: '06:00', hour: 6 },
      { time: '09:00', hour: 9 },
      { time: '12:00', hour: 12 },
      { time: '15:00', hour: 15 },
      { time: '18:00', hour: 18 },
      { time: '21:00', hour: 21 },
    ];
    
    const todayStr = new Date().toISOString().split('T')[0];
    const dateGroups = {};
    sessions.forEach(s => {
      if (!dateGroups[s.date]) dateGroups[s.date] = [];
      dateGroups[s.date].push(s);
    });
    
    const dates = Object.keys(dateGroups).filter(d => d !== todayStr);
    const numDays = Math.max(1, dates.length);
    
    return timeSlots.map(slot => {
      const todaySum = sessions
        .filter(s => {
          if (s.date !== todayStr) return false;
          const hr = new Date(s.timestampStart).getHours();
          return hr >= slot.hour - 3 && hr < slot.hour + 3;
        })
        .reduce((sum, s) => sum + s.durationSeconds, 0);
        
      let otherDaysSumTotal = 0;
      dates.forEach(d => {
        const daySum = dateGroups[d]
          .filter(s => {
            const hr = new Date(s.timestampStart).getHours();
            return hr >= slot.hour - 3 && hr < slot.hour + 3;
          })
          .reduce((sum, s) => sum + s.durationSeconds, 0);
        otherDaysSumTotal += daySum;
      });
      
      return {
        time: slot.time,
        today: Math.round(todaySum / 60),
        average: Math.round((otherDaysSumTotal / numDays) / 60)
      };
    });
  };

  const { chartData, totalMinutes, label } = getChartAndMetricData();
  const highlightData = getHighlightData();
  const topReciters = getTopReciters();
  
  const avgMinutes = sessions.length > 0
    ? Math.round(sessions.reduce((s, d) => s + d.durationSeconds, 0) / (60 * Math.max(1, new Set(sessions.map(s => s.date)).size)))
    : 0;
  
  // Vibrant multi-color palette for Pie chart
  const DONUT_COLORS = ['#FF7A00', '#FF2D55', '#5856D6', '#34C759', '#007AFF'];
  
  const rawDonutData = topReciters.slice(0, 5).map((r, i) => {
    const scholar = scholars.find(s => s.id === r.scholarId);
    const minutes = Math.round(r.seconds / 60);
    return {
      name: scholar?.name_transliteration || 'Unknown',
      // Ensure positive non-zero value for arc rendering (prevent d3-arc NaN calculation)
      value: minutes > 0 ? minutes : (r.seconds > 0 ? 1 : 0),
      rawMinutes: minutes,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    };
  }).filter(item => item.value > 0);
  
  const donutData = rawDonutData.length > 0
    ? rawDonutData
    : [{ name: 'No data', value: 1, rawMinutes: 0, color: '#2C2C2E' }];
  
  const mostListened = donutData[0];
  
  return (
    <div className="screen insights-screen" id="insights-screen">
      {/* Header */}
      <div className="screen-header">
        <div className="insights-header-row">
          <div>
            <h1 className="text-title">Insights</h1>
            <span className="text-body" style={{ color: 'var(--color-white)' }}>{dateLabel}</span>
          </div>
        </div>
      </div>
      
      {/* Time Range Selector */}
      <div className="segmented-control" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div 
          className="segmented-control-indicator" 
          style={{ 
            width: `calc((100% - 6px) / ${RANGES.length})`,
            transform: `translateX(calc(${RANGES.indexOf(activeRange)} * 100%))`,
            transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        />
        {RANGES.map(r => (
          <button
            key={r}
            className={`segmented-control-btn ${activeRange === r ? 'active' : ''}`}
            onClick={() => setActiveRange(r)}
          >
            {r}
          </button>
        ))}
      </div>
      
      {/* Listening Duration */}
      <section className="section">
        <h2 className="section-title">Listening duration</h2>
        <div className="glass-card">
          <span className="text-label">Total</span>
          <span className="text-metric" style={{ display: 'block', margin: '4px 0' }}>
            {formatMinutes(totalMinutes)}
          </span>
          <span className="text-secondary">This {activeRange.toLowerCase()}</span>
          
          <div 
            className="insights-chart" 
            style={{ marginTop: 16 }}
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
          >
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barCategoryGap="30%">
                <defs>
                  <linearGradient id="insightsBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="insightsBarGradActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.2)" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="rgba(255, 255, 255, 0.05)" 
                  horizontal={true} 
                  vertical={false} 
                />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                  interval={activeRange === 'Day' ? 3 : 'preserveEnd'}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                  tickFormatter={v => `${v}m`}
                  width={35}
                  orientation="right"
                />
                <Tooltip 
                  content={<CustomBarTooltip />}
                  cursor={<DottedCursor />}
                  position={(c) => {
                    if (c && typeof c.x === 'number') {
                      return { x: c.x - 40, y: c.y - 50 };
                    }
                    return undefined;
                  }}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="url(#insightsBarGrad)" 
                  radius={isHolding ? [12, 12, 0, 0] : [4, 4, 0, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                  style={{ transition: 'all 0.25s ease' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      
      {/* Highlights */}
      <section className="section">
        <div className="glass-card">
          <div className="highlights-header">
            <Headphones size={20} />
            <span className="text-card-title" style={{ marginLeft: 8 }}>Highlights</span>
          </div>
          <p className="text-secondary" style={{ marginTop: 4, marginBottom: 12 }}>
            Keep listening to build your average.
          </p>
          <div className="divider" />
          
          <div className="highlights-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#ffffff' }} />
              <span className="text-secondary">Today</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'rgba(255, 255, 255, 0.3)' }} />
              <span className="text-secondary">AVERAGE</span>
            </div>
          </div>
          
          <div className="highlights-values">
            <span className="text-metric" style={{ color: '#ffffff' }}>{formatMinutes(todayTotal)}</span>
            <span className="text-metric" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{formatMinutes(avgMinutes)}</span>
          </div>
          
          <div className="insights-chart" style={{ marginTop: 12 }}>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={highlightData}>
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                />
                <Tooltip 
                  content={<CustomLineTooltip />}
                  cursor={{
                    stroke: 'rgba(255,255,255,0.25)',
                    strokeWidth: 1.5,
                    strokeDasharray: '4 3'
                  }}
                  position={(c) => {
                    if (c && typeof c.x === 'number') {
                      return { x: c.x - 45, y: c.y - 65 };
                    }
                    return undefined;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="average" 
                  stroke="rgba(255, 255, 255, 0.25)" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: 'rgba(255,255,255,0.5)', stroke: 'rgba(255,255,255,0.8)', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="today" 
                  stroke="#ffffff" 
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 6, fill: '#ffffff', stroke: 'rgba(255,255,255,0.4)', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      
      {/* Top Reciters */}
      <section className="section">
        <h2 className="section-title">Top reciters</h2>
        <div className="glass-card">
          <span className="text-label">Most Listened</span>
          <span className="text-card-title" style={{ display: 'block', margin: '4px 0' }}>
            {mostListened.name}
          </span>
          <span className="text-secondary">{formatMinutes(mostListened.value)} today</span>
          
          <div className="donut-chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={donutData.length > 1 ? 3 : 0}
                  minAngle={5}
                  dataKey="value"
                  isAnimationActive={false}
                  stroke="none"
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="donut-legend">
            {donutData.filter(d => d.name !== 'No data').map((d, i) => (
              <div key={i} className="legend-item">
                <span className="legend-dot" style={{ background: d.color, border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                <span className="text-secondary">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
