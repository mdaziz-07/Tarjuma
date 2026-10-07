import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:5173';
const OUT_DIR = resolve('goldie/out/raw/pixel-10-pro');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('Launching headless Chrome at Pixel 10 Pro dimensions...');
  const chrome = spawn(
    CHROME_PATH,
    [
      '--remote-debugging-port=9222',
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=412,915',
      '--user-data-dir=' + resolve('scratch/chrome-profile'),
    ],
    { stdio: 'ignore' }
  );

  let versionData = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await sleep(400);
  }

  if (!versionData) {
    chrome.kill();
    throw new Error('Chrome failed to start on port 9222');
  }

  const tab = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let reqId = 1;
  const send = (method, params = {}) => {
    const curId = reqId++;
    return new Promise((res, rej) => {
      const h = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', h);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412,
    height: 915,
    deviceScaleFactor: 2.621359,
    mobile: true,
  });

  // Navigate to initial page
  console.log('Navigating to initial page...');
  await send('Page.navigate', { url: APP_URL });
  await sleep(2500);

  // Setup rich localStorage seed
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        localStorage.setItem('tarjuma-preferences', JSON.stringify({
          state: {
            onboardingCompleted: true,
            defaultMode: 1,
            defaultScholarId: 'scholar-1',
            lastSelectedScholarId: 'scholar-1',
            dailyGoalMinutes: 20,
            showTranslation: true,
            arabicTextSize: 'MEDIUM'
          },
          version: 0
        }));
        localStorage.setItem('tarjuma_last_seen_version', '2.1.0');
        localStorage.setItem('tarjuma_chosen_scholar', 'scholar-1');
        localStorage.setItem('tarjuma_images_cached_optimized_v1', 'true');

        const mockSessions = [];
        const scholarsList = ['scholar-1', 'scholar-2', 'scholar-3'];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          mockSessions.push({
            id: 'mock-' + i,
            date: dateStr,
            mode: 1,
            scholarId: scholarsList[i % 3],
            surahId: (i * 3) + 1,
            durationSeconds: 1200 + (i * 180),
            timestampStart: d.getTime(),
            timestampEnd: d.getTime() + (1200 + (i * 180)) * 1000
          });
        }
        localStorage.setItem('tarjuma-insights', JSON.stringify({
          state: { userId: null, sessions: mockSessions, activeSession: null },
          version: 0
        }));
      })()
    `
  });

  const waitForSelector = async (selector, timeoutMs = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('${selector}'))`
      });
      if (res?.result?.value === true) return true;
      await sleep(200);
    }
    throw new Error('Timeout waiting for selector: ' + selector);
  };

  const applyOverrides = async () => {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          let style = document.getElementById('store-capture-overrides');
          if (!style) {
            style = document.createElement('style');
            style.id = 'store-capture-overrides';
            style.innerHTML = ':root { --safe-top: 42px !important; }';
            document.head.appendChild(style);
          }
          const closeBtn = document.querySelector('.whats-new-close');
          if (closeBtn) closeBtn.click();
        })()
      `
    });
  };

  const capturedFiles = [];

  // 1. HOME
  console.log('Capturing: home');
  await send('Page.navigate', { url: `${APP_URL}/` });
  await waitForSelector('.surah-row');
  await applyOverrides();
  await sleep(1000);
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  let p = join(OUT_DIR, 'home.png');
  await writeFile(p, Buffer.from(ss.data, 'base64'));
  capturedFiles.push({ sceneId: 'home', file: p });
  console.log('  Saved home.png');

  // 2. PLAYER
  console.log('Capturing: player');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const row = document.querySelector('.surah-row');
        if (row) row.click();
      })()
    `
  });
  await waitForSelector('.player-screen');
  await applyOverrides();
  await sleep(1500);
  ss = await send('Page.captureScreenshot', { format: 'png' });
  p = join(OUT_DIR, 'player.png');
  await writeFile(p, Buffer.from(ss.data, 'base64'));
  capturedFiles.push({ sceneId: 'player', file: p });
  console.log('  Saved player.png');

  // 3. SOUNDS
  console.log('Capturing: sounds');
  await send('Page.navigate', { url: `${APP_URL}/background-sound` });
  await waitForSelector('.bg-sound-grid');
  await applyOverrides();
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const rainItem = Array.from(document.querySelectorAll('.bg-sound-item')).find(el => el.textContent.includes('Rain'));
        if (rainItem) rainItem.click();
      })()
    `
  });
  await sleep(1000);
  ss = await send('Page.captureScreenshot', { format: 'png' });
  p = join(OUT_DIR, 'sounds.png');
  await writeFile(p, Buffer.from(ss.data, 'base64'));
  capturedFiles.push({ sceneId: 'sounds', file: p });
  console.log('  Saved sounds.png');

  // 4. RECITERS
  console.log('Capturing: reciters');
  await send('Page.navigate', { url: `${APP_URL}/scholar-picker` });
  await waitForSelector('.scholar-card-item');
  await applyOverrides();
  await sleep(1200);
  ss = await send('Page.captureScreenshot', { format: 'png' });
  p = join(OUT_DIR, 'reciters.png');
  await writeFile(p, Buffer.from(ss.data, 'base64'));
  capturedFiles.push({ sceneId: 'reciters', file: p });
  console.log('  Saved reciters.png');

  // 5. INSIGHTS
  console.log('Capturing: insights');
  await send('Page.navigate', { url: `${APP_URL}/insights` });
  await waitForSelector('.insights-screen');
  await applyOverrides();
  await send('Runtime.evaluate', {
    expression: `if (window.__seedInsights) window.__seedInsights();`
  });
  await sleep(1200);
  ss = await send('Page.captureScreenshot', { format: 'png' });
  p = join(OUT_DIR, 'insights.png');
  await writeFile(p, Buffer.from(ss.data, 'base64'));
  capturedFiles.push({ sceneId: 'insights', file: p });
  console.log('  Saved insights.png');

  // Write manifest.json
  const manifest = {
    device: 'pixel-10-pro',
    udid: 'pixel_10_pro_avd',
    capturedAt: new Date().toISOString(),
    screenshots: capturedFiles,
    preview: null,
  };
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  ws.close();
  chrome.kill();
  console.log('All 5 scenes captured successfully!');
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
