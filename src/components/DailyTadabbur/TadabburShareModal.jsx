import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Download, Share2, Copy, Check, MessageCircle, Smartphone, Square
} from 'lucide-react';
import {
  formatTadabburShareText,
  shareTadabburImageFile,
  downloadBlob,
  shareToWhatsApp,
  getFormattedTodayDate
} from '../../services/tadabburService';
import './TadabburShareModal.css';

function InstagramIcon({ size = 18, color = "currentColor", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function TadabburShareModal({ tadabbur, isOpen, onClose, initialLang = 'urdu' }) {
  const [format, setFormat] = useState('story'); // 'story' (9:16) or 'square' (1:1)
  const [lang, setLang] = useState(initialLang); // 'urdu' or 'hindi'
  const [theme, setTheme] = useState('obsidian'); // 'obsidian' or 'emerald'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  // Sync language if initialLang changes
  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  // Generate canvas image whenever format, lang, or theme changes
  useEffect(() => {
    if (!isOpen || !tadabbur) return;
    renderCanvasImage();
  }, [isOpen, format, lang, theme, tadabbur]);

  const renderCanvasImage = async () => {
    setIsGenerating(true);
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;

    const isStory = format === 'story';
    const width = 1080;
    const height = isStory ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    // Wait a moment for fonts if possible
    if (document.fonts) {
      await document.fonts.ready;
    }

    // 1. Background Gradient (Dark Luxury Palette matching Image 2 & Emerald option)
    if (theme === 'emerald') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#021610');
      grad.addColorStop(0.5, '#072b20');
      grad.addColorStop(1, '#021610');
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0A0B0E');
      grad.addColorStop(0.5, '#13151B');
      grad.addColorStop(1, '#0A0B0E');
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient radial glow
    const radial = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.6);
    if (theme === 'emerald') {
      radial.addColorStop(0, 'rgba(52, 211, 153, 0.1)');
    } else {
      radial.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    }
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // 3. Luxurious Minimalist Frame & Geometric Accents
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme === 'emerald' ? 'rgba(52, 211, 153, 0.28)' : 'rgba(255, 255, 255, 0.16)';
    const margin = isStory ? 60 : 45;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    // Inner subtle thin border
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme === 'emerald' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.07)';
    ctx.strokeRect(margin + 12, margin + 12, width - (margin + 12) * 2, height - (margin + 12) * 2);
    ctx.restore();

    // 4. Header: Date and Badge (Clean, no sparkles)
    ctx.textAlign = 'center';
    ctx.fillStyle = theme === 'emerald' ? '#34d399' : 'rgba(255, 255, 255, 0.7)';
    ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '3px';
    const todayStr = getFormattedTodayDate().toUpperCase();
    const topY = isStory ? 180 : 120;
    ctx.fillText(`DAILY TADABBUR  ·  ${todayStr}`, width / 2, topY);

    // Theme Pill Badge (Matching Image 2 dark pill)
    ctx.save();
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const themeText = tadabbur.theme ? tadabbur.theme : 'Trust & Tawakkul';
    const themeWidth = ctx.measureText(themeText).width + 44;
    const badgeY = topY + 36;
    ctx.fillStyle = theme === 'emerald' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - themeWidth / 2, badgeY, themeWidth, 40, 20);
    ctx.fill();
    ctx.strokeStyle = theme === 'emerald' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.16)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(themeText, width / 2, badgeY + 26);
    ctx.restore();

    // 5. Surah Reference Badge
    const refY = isStory ? 340 : 230;
    ctx.font = '700 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Surah ${tadabbur.surahName} · Ayah ${tadabbur.ayahNumber}`, width / 2, refY);

    ctx.font = '500 26px "Amiri Quran", "Scheherazade New", serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText(`(سورة ${tadabbur.surahArabic || tadabbur.surahName})`, width / 2, refY + 42);

    // 6. Center Arabic Verse
    ctx.save();
    const arabicFontSize = isStory ? 52 : 42;
    ctx.font = `700 ${arabicFontSize}px "Amiri Quran", "Scheherazade New", serif`;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#ffffff';

    // Soft subtle depth shadow
    ctx.shadowColor = theme === 'emerald' ? 'rgba(52, 211, 153, 0.35)' : 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 16;

    const arabicY = isStory ? 540 : 360;
    const maxTextWidth = width - (margin * 2 + 120);
    wrapText(ctx, tadabbur.arabic, width / 2, arabicY, maxTextWidth, arabicFontSize * 2.1, true);
    ctx.restore();

    // Minimalist Divider
    const dividerY = isStory ? 840 : 540;
    drawOrnamentalDivider(ctx, width / 2, dividerY, 200, theme === 'emerald' ? 'rgba(52, 211, 153, 0.35)' : 'rgba(255, 255, 255, 0.25)');

    // 7. Translation Text (Urdu or Hindi)
    ctx.save();
    const transText = lang === 'hindi' ? tadabbur.translationHindi : tadabbur.translationUrdu;
    const transFontSize = isStory ? 32 : 26;
    ctx.font = `500 ${transFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const transY = isStory ? 940 : 610;
    wrapText(ctx, transText, width / 2, transY, maxTextWidth, transFontSize * 1.7);
    ctx.restore();

    // 8. Tadabbur Reflection Card (Clean callout)
    if (tadabbur.reflection) {
      const boxY = isStory ? 1220 : 770;
      const boxHeight = isStory ? 280 : 160;
      const boxWidth = width - (margin * 2 + 80);
      const boxX = (width - boxWidth) / 2;

      ctx.save();
      ctx.fillStyle = theme === 'emerald' ? 'rgba(52, 211, 153, 0.05)' : 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
      ctx.fill();
      ctx.strokeStyle = theme === 'emerald' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      // Header mark
      ctx.font = '800 18px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = theme === 'emerald' ? '#34d399' : 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('REFLECTION', width / 2, boxY + (isStory ? 48 : 34));

      // Reflection message
      ctx.font = `400 ${isStory ? 26 : 21}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      wrapText(ctx, `"${tadabbur.reflection}"`, width / 2, boxY + (isStory ? 105 : 75), boxWidth - 60, isStory ? 42 : 30);
      ctx.restore();
    }

    // 9. Footer: App Attribution Watermark
    ctx.save();
    const footerY = isStory ? height - 120 : height - 80;
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Tarjuma App  ·  Listen, Reflect & Connect', width / 2, footerY);

    ctx.font = '400 18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('tarjumaapp.vercel.app', width / 2, footerY + 30);
    ctx.restore();

    // Export Blob & DataURL
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          setImageBlob(blob);
          const dataUrl = URL.createObjectURL(blob);
          setPreviewUrl(dataUrl);
          resolve(blob);
        } else {
          resolve(null);
        }
        setIsGenerating(false);
      }, 'image/png');
    });
  };

  // Ensure image blob is generated and ready before sharing
  const ensureImageBlob = async () => {
    if (imageBlob) return imageBlob;
    return await renderCanvasImage();
  };

  // Helper function to wrap text neatly on canvas
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }

  // Draw delicate geometric ornamental divider
  function drawOrnamentalDivider(ctx, x, y, halfWidth, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(x - halfWidth, y);
    ctx.lineTo(x - 24, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 24, y);
    ctx.lineTo(x + halfWidth, y);
    ctx.stroke();

    // Diamond center
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // One-Click Native Share (Instagram, WhatsApp, Telegram, etc.)
  const handleNativeShare = async () => {
    const blob = await ensureImageBlob();
    if (!blob) return;
    const shareText = formatTadabburShareText(tadabbur, lang);
    await shareTadabburImageFile({
      blob,
      filename: `daily-tadabbur-${tadabbur.surahId}-${tadabbur.ayahNumber}.png`,
      title: `Daily Tadabbur: Surah ${tadabbur.surahName}`,
      text: shareText
    });
  };

  // Direct WhatsApp Share (shares the actual card image with reflection text)
  const handleWhatsAppShare = async () => {
    const blob = await ensureImageBlob();
    if (!blob) return;
    const shareText = formatTadabburShareText(tadabbur, lang);

    const shared = await shareTadabburImageFile({
      blob,
      filename: `daily-tadabbur-${tadabbur.surahId}-${tadabbur.ayahNumber}.png`,
      title: `Daily Tadabbur: Surah ${tadabbur.surahName}`,
      text: shareText
    });

    if (!shared) {
      shareToWhatsApp(shareText);
    }
  };

  // Direct Instagram Stories Share
  const handleInstagramShare = async () => {
    const blob = await ensureImageBlob();
    if (!blob) return;
    const shareText = formatTadabburShareText(tadabbur, lang);
    const shared = await shareTadabburImageFile({
      blob,
      filename: `daily-tadabbur-story.png`,
      title: `Daily Tadabbur Story`,
      text: shareText
    });

    if (!shared) {
      // Don't auto-download; try clipboard copy instead
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Image copied to clipboard! You can now paste it directly in Instagram Story.');
        } else {
          alert('Please use the "Save Image" button to save the image, then upload it to Instagram Stories.');
        }
      } catch (clipErr) {
        alert('Please use the "Save Image" button to save the image, then upload it to Instagram Stories.');
      }
    }
  };

  // Save Image to Device
  const handleDownload = async () => {
    const blob = await ensureImageBlob();
    if (!blob) return;
    downloadBlob(blob, `daily-tadabbur-${tadabbur.surahId}-${tadabbur.ayahNumber}-${format}.png`);
  };

  // Copy Formatted Text to Clipboard
  const handleCopyText = async () => {
    const text = formatTadabburShareText(tadabbur, lang);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  if (!isOpen || !tadabbur) return null;

  return ReactDOM.createPortal(
    <div className="tadabbur-modal-overlay" onClick={onClose}>
      <div className="tadabbur-modal-card glass-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tadabbur-modal-header">
          <div className="tadabbur-header-title">
            <h3>Share Reflection Card</h3>
          </div>
          <button className="tadabbur-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Customization Options Bar */}
        <div className="tadabbur-options-row">
          {/* Format Toggle */}
          <div className="tadabbur-toggle-pill-group">
            <button
              className={`tadabbur-pill-opt ${format === 'story' ? 'active' : ''}`}
              onClick={() => setFormat('story')}
            >
              <Smartphone size={14} />
              <span>Story (9:16)</span>
            </button>
            <button
              className={`tadabbur-pill-opt ${format === 'square' ? 'active' : ''}`}
              onClick={() => setFormat('square')}
            >
              <Square size={14} />
              <span>Post (1:1)</span>
            </button>
          </div>

          {/* Language Toggle */}
          <div className="tadabbur-toggle-pill-group">
            <button
              className={`tadabbur-pill-opt ${lang === 'urdu' ? 'active' : ''}`}
              onClick={() => setLang('urdu')}
            >
              <span>اردو (Urdu)</span>
            </button>
            <button
              className={`tadabbur-pill-opt ${lang === 'hindi' ? 'active' : ''}`}
              onClick={() => setLang('hindi')}
            >
              <span>हिंदी (Hindi)</span>
            </button>
          </div>

          {/* Theme Color Toggle */}
          <div className="tadabbur-toggle-pill-group">
            <button
              className={`tadabbur-pill-opt ${theme === 'obsidian' ? 'active' : ''}`}
              onClick={() => setTheme('obsidian')}
            >
              <span className="theme-dot obsidian" />
              <span>Obsidian</span>
            </button>
            <button
              className={`tadabbur-pill-opt ${theme === 'emerald' ? 'active' : ''}`}
              onClick={() => setTheme('emerald')}
            >
              <span className="theme-dot emerald" />
              <span>Emerald</span>
            </button>
          </div>
        </div>

        {/* Live Canvas Preview Frame */}
        <div className="tadabbur-preview-container">
          {isGenerating && (
            <div className="tadabbur-generating-loader">
              <div className="tadabbur-spinner" />
              <span>Rendering Card...</span>
            </div>
          )}
          {previewUrl && (
            <div className={`tadabbur-preview-img-wrapper ${format}`}>
              <img src={previewUrl} alt="Daily Tadabbur Preview" className="tadabbur-preview-img" />
            </div>
          )}
        </div>

        {/* Quick Action Share Buttons */}
        <div className="tadabbur-actions-container">
          <div className="tadabbur-primary-share-row">
            <button className="tadabbur-action-btn whatsapp-btn" onClick={handleWhatsAppShare}>
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </button>

            <button className="tadabbur-action-btn instagram-btn" onClick={handleInstagramShare}>
              <InstagramIcon size={15} />
              <span>Instagram</span>
            </button>

            <button className="tadabbur-action-btn native-share-btn" onClick={handleNativeShare}>
              <Share2 size={15} />
              <span>Any App</span>
            </button>
          </div>

          <div className="tadabbur-secondary-share-row">
            <button className="tadabbur-utility-btn" onClick={handleDownload}>
              <Download size={14} />
              <span>Save Image</span>
            </button>

            <button className="tadabbur-utility-btn" onClick={handleCopyText}>
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Text!' : 'Copy Text'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
