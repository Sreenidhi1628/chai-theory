import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const TARGET_URL = 'http://localhost:4173/';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  const data = await res.json();
  const ws = new WebSocket(data[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise(resolve => {
    const curId = id++;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  // 1. Mobile Drawer at 360px
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: TARGET_URL });
  await sleep(2000);
  await send('Runtime.evaluate', { expression: 'document.getElementById("mobileMenuBtn")?.click()' });
  await sleep(500);
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('shot_360_drawer.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved shot_360_drawer.png');

  // Close drawer
  await send('Runtime.evaluate', { expression: 'document.getElementById("mobileMenuBtn")?.click()' });
  await sleep(400);

  // 2. Spice Orbit Section at 360px
  await send('Runtime.evaluate', { expression: 'document.getElementById("spices")?.scrollIntoView({ behavior: "instant", block: "start" })' });
  await sleep(800);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('shot_360_orbit.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved shot_360_orbit.png');

  // 3. Grand Thali Section at 360px
  await send('Runtime.evaluate', { expression: `
    (() => {
      const thali = document.getElementById('thali');
      thali?.scrollIntoView({ behavior: 'instant', block: 'start' });
      // Simulate scrub progress to reveal settled labels and assembled food
      const dosa = document.getElementById('labelDosa');
      const sambar = document.getElementById('labelSambar');
      const vada = document.getElementById('labelVada');
      const chutney = document.getElementById('labelChutney');
      dosa?.classList.add('label-visible');
      sambar?.classList.add('label-visible');
      vada?.classList.add('label-visible');
      chutney?.classList.add('label-visible');
      const kDosa = document.getElementById('katoriDosa');
      const kSambar = document.getElementById('katoriSambar');
      const kVada = document.getElementById('katoriVada');
      const kChutney = document.getElementById('katoriChutney');
      if (kDosa) kDosa.style.transform = 'none';
      if (kSambar) kSambar.style.transform = 'none';
      if (kVada) kVada.style.transform = 'none';
      if (kChutney) kChutney.style.transform = 'none';
      const fill = document.getElementById('thaliProgressFill');
      const val = document.getElementById('thaliProgressVal');
      if (fill) fill.style.width = '100%';
      if (val) val.textContent = '100%';
    })()
  ` });
  await sleep(800);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('shot_360_thali.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved shot_360_thali.png');

  process.exit(0);
}

run();
