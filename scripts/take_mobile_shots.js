import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9225;
const TARGET_URL = 'http://localhost:4173/';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const tempDir = path.join(process.env.TEMP, 'edge_cdp_mobile_' + Date.now());
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  await sleep(1500);

  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json`);
    const tabs = await res.json();
    const pageTab = tabs.find(t => t.type === 'page' && !t.url.startsWith('edge://')) || tabs[0];
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      hasTouch: true
    });

    console.log('Navigating to', TARGET_URL);
    await send('Page.navigate', { url: TARGET_URL });
    await sleep(3000);

    const sections = [
      'hero',
      'spices',
      'thali',
      'samosa',
      'coffee',
      'street-food',
      'sweets',
      'fusion',
      'gallery',
      'finale'
    ];

    const outDir = path.join('C:', 'Users', 'Sreenidhi', '.gemini', 'antigravity-ide', 'brain', '4ef0a428-d89b-4b0d-8af2-be2ec78d9139', 'mobile_shots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    for (const sec of sections) {
      await send('Runtime.evaluate', {
        expression: `document.getElementById('${sec}')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
      });
      await sleep(1000);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `${sec}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved shot for: ${sec}`);
    }
    console.log('ALL SHOTS SAVED SUCCESSFULLY');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    edge.kill();
    process.exit(0);
  }
}
run();
