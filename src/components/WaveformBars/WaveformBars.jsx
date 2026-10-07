import React from 'react';
import './WaveformBars.css';

export default function WaveformBars({ color = 'var(--color-orange)', size = 'medium' }) {
  const sizeClass = `waveform-${size}`;
  return (
    <div className={`waveform-bars ${sizeClass}`}>
      <span className="waveform-bar bar-1" style={{ backgroundColor: color }} />
      <span className="waveform-bar bar-2" style={{ backgroundColor: color }} />
      <span className="waveform-bar bar-3" style={{ backgroundColor: color }} />
    </div>
  );
}
