import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './ClockPicker.css';

/**
 * A circular clock picker for selecting hours and minutes.
 * Props:
 *   value: "HH:MM" string
 *   onChange: (newValue: "HH:MM") => void
 *   onClose: () => void
 */
export default function ClockPicker({ value, onChange, onClose }) {
  const [mode, setMode] = useState('hours'); // 'hours' | 'minutes'
  
  const parsed = value ? value.split(':').map(Number) : [8, 0];
  const [hours, setHours] = useState(parsed[0]);
  const [minutes, setMinutes] = useState(parsed[1]);

  const clockRef = useRef(null);

  const getAngleAndValue = useCallback((e, isHours) => {
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - cx;
    const dy = clientY - cy;
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    if (isHours) {
      const val = Math.round(angle / 30) % 12;
      return val === 0 ? 0 : val;
    } else {
      // Snap to multiples of 5 for perfect alignment
      const val = Math.round(angle / 30) * 5 % 60;
      return val < 0 ? val + 60 : val;
    }
  }, []);

  const handleClockClick = useCallback((e) => {
    const isHours = mode === 'hours';
    const val = getAngleAndValue(e, isHours);
    if (isHours) {
      // Map 0–11 to 0–23 based on current hours being AM/PM
      const isAm = hours < 12;
      const newHour = isAm ? val : val + 12;
      setHours(newHour);
      setTimeout(() => setMode('minutes'), 300);
    } else {
      setMinutes(val);
    }
  }, [mode, hours, getAngleAndValue]);

  const handleDone = () => {
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    onChange(`${hStr}:${mStr}`);
    onClose();
  };

  const toggleAmPm = () => {
    if (hours < 12) {
      setHours(hours + 12);
    } else {
      setHours(hours - 12);
    }
  };

  // Calculate hand angle
  const displayHour = hours % 12;
  const hourAngle = displayHour * 30;
  const minuteAngle = minutes * 6;
  const handAngle = mode === 'hours' ? hourAngle : minuteAngle;

  // Generate clock numbers
  const clockSize = 220;
  const center = clockSize / 2;
  const radius = 85;

  const numbers = mode === 'hours'
    ? Array.from({ length: 12 }, (_, i) => ({ val: i, label: i === 0 ? '12' : String(i) }))
    : Array.from({ length: 12 }, (_, i) => ({ val: i * 5, label: String(i * 5).padStart(2, '0') }));

  const getNumberPos = (index, total) => {
    const angle = (index / total) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  // Current selected value on the clock
  const selectedNum = mode === 'hours' ? displayHour : minutes;

  const handRad = ((handAngle - 90) * Math.PI) / 180;
  const handX = center + radius * Math.cos(handRad);
  const handY = center + radius * Math.sin(handRad);

  const isAm = hours < 12;
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return ReactDOM.createPortal(
    <div className="clock-picker-overlay" onClick={onClose}>
      <div className="clock-picker-modal" onClick={e => e.stopPropagation()}>
        {/* Time Display */}
        <div className="clock-time-display">
          <button 
            className={`clock-time-segment ${mode === 'hours' ? 'active' : ''}`}
            onClick={() => setMode('hours')}
          >
            {String(displayHours).padStart(2, '0')}
          </button>
          <span className="clock-time-colon">:</span>
          <button 
            className={`clock-time-segment ${mode === 'minutes' ? 'active' : ''}`}
            onClick={() => setMode('minutes')}
          >
            {String(minutes).padStart(2, '0')}
          </button>
          <button className="clock-ampm-toggle" onClick={toggleAmPm}>
            <span className={isAm ? 'active-period' : ''}>AM</span>
            <span className={!isAm ? 'active-period' : ''}>PM</span>
          </button>
        </div>

        <p className="clock-mode-label">{mode === 'hours' ? 'Select Hour' : 'Select Minute'}</p>

        {/* Clock Face */}
        <div className="clock-face-wrapper">
          <svg
            ref={clockRef}
            width={clockSize}
            height={clockSize}
            className="clock-face-svg"
            onClick={handleClockClick}
          >
            {/* Outer ring */}
            <circle cx={center} cy={center} r={center - 6} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

            {/* Hand line */}
            <line
              x1={center}
              y1={center}
              x2={handX}
              y2={handY}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Center dot */}
            <circle cx={center} cy={center} r={4} fill="#ffffff" />
            {/* Hand tip circle */}
            <circle cx={handX} cy={handY} r={18} fill="rgba(255,255,255,0.15)" />

            {/* Numbers */}
            {numbers.map((num, i) => {
              const pos = getNumberPos(i, numbers.length);
              const isSelected = mode === 'hours'
                ? (num.val === selectedNum)
                : (num.val === minutes);
              
              const isNearHand = mode === 'hours'
                ? num.val === displayHour
                : num.val === minutes;

              return (
                <g key={i}>
                  {isNearHand && (
                    <circle cx={pos.x} cy={pos.y} r={16} fill="rgba(255,255,255,0.9)" />
                  )}
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isNearHand ? '#000000' : 'rgba(255,255,255,0.85)'}
                    fontSize={13}
                    fontWeight={isNearHand ? '700' : '400'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {num.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Actions */}
        <div className="clock-actions">
          <button className="clock-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="clock-btn-done" onClick={handleDone}>Set Time</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
