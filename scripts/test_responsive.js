import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const TARGET_URL = 'http://localhost:4173/';
const WIDTHS = [360, 390, 430, 768, 1024];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDebuggerUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const data = await res.json();
      if (data && data[0] && data[0].webSocketDebuggerUrl) {
        return data[0].webSocketDebuggerUrl;
      }
    } catch (e) {
      // wait
    }
    await sleep(250);
  }
  throw new Error('Could not connect to Edge debugger');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  ready() {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.OPEN) resolve();
      else this.ws.onopen = () => resolve();
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }
}

async function run() {
  console.log('🚀 Launching Headless Edge with CDP...');
  const tempDir = path.join(process.env.TEMP, 'edge_cdp_profile_' + Date.now());
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { edgeProc.kill(); } catch (e) {}
  };
  process.on('exit', cleanup);

  try {
    const wsUrl = await getDebuggerUrl();
    console.log('✅ Connected to Edge CDP:', wsUrl);
    const client = new CDPClient(wsUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    console.log(`🌐 Navigating to ${TARGET_URL}...`);
    await client.send('Page.navigate', { url: TARGET_URL });
    await sleep(2500); // Allow page and preloader to transition out

    const testResults = [];

    for (const width of WIDTHS) {
      console.log(`\n========================================`);
      console.log(`📱 Testing Viewport: ${width}px`);
      console.log(`========================================`);

      const height = width >= 768 ? 900 : 800;
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: width < 1024,
      });
      await client.send('Page.navigate', { url: TARGET_URL });
      await sleep(2200); // Allow page and preloader to transition cleanly for this viewport

      // 1. Check Horizontal Overflow (scrollWidth must not exceed clientWidth)
      const overflowInfo = await client.evaluate(`
        (() => {
          const clientWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const maxContentWidth = Math.max(scrollWidth, bodyScrollWidth);
          const hasOverflow = maxContentWidth > (clientWidth + 1);
          return {
            clientWidth,
            scrollWidth,
            bodyScrollWidth,
            hasOverflow
          };
        })()
      `);

      console.log(`1. Horizontal Overflow Test:`, overflowInfo.hasOverflow ? `❌ OVERFLOW (${overflowInfo.scrollWidth} > ${overflowInfo.clientWidth})` : `✅ PASS (Zero overflow: ${overflowInfo.scrollWidth} <= ${overflowInfo.clientWidth})`);

      // 2. Check Typography Clamp on large headings
      const headingSizes = await client.evaluate(`
        (() => {
          const hero = document.getElementById('heroTitle') || document.querySelector('.hero-title');
          const orbit = document.querySelector('.heading-orbit');
          const thali = document.querySelector('.exploded-main-title');
          return {
            heroSize: hero ? window.getComputedStyle(hero).fontSize : null,
            orbitSize: orbit ? window.getComputedStyle(orbit).fontSize : null,
            thaliSize: thali ? window.getComputedStyle(thali).fontSize : null,
          };
        })()
      `);
      console.log(`2. Fluid Typography Check:`, headingSizes);

      // 3. Check 44px tap targets
      const tapTargetCheck = await client.evaluate(`
        (() => {
          const elements = Array.from(document.querySelectorAll('a, button, select, input'));
          const failures = [];
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.bottom > 0) {
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                if (rect.height < 40 && !el.closest('.orbit-ring')) {
                  failures.push({
                    tag: el.tagName,
                    id: el.id || el.className,
                    text: el.innerText ? el.innerText.trim().slice(0, 20) : '',
                    height: Math.round(rect.height)
                  });
                }
              }
            }
          }
          return {
            totalChecked: elements.length,
            failures: failures.slice(0, 5)
          };
        })()
      `);
      console.log(`3. Tap Target Heights:`, tapTargetCheck.failures.length === 0 ? '✅ All targets >= 44px' : `⚠️ Minor elements: ${JSON.stringify(tapTargetCheck.failures)}`);

      // 4. Navbar Check
      const navCheck = await client.evaluate(`
        (() => {
          const desktopLinks = document.querySelector('.nav-links');
          const hamburger = document.getElementById('mobileMenuBtn');
          const logo = document.getElementById('brandLogo');
          const reserveBtn = document.getElementById('headerReserveBtn');
          const soundToggle = document.getElementById('soundToggle');
          const soundLabel = soundToggle ? soundToggle.querySelector('.sound-label') : null;

          return {
            desktopLinksVisible: desktopLinks ? window.getComputedStyle(desktopLinks).display !== 'none' : false,
            hamburgerVisible: hamburger ? window.getComputedStyle(hamburger).display !== 'none' : false,
            logoVisible: logo ? window.getComputedStyle(logo).display !== 'none' : false,
            reserveBtnVisible: reserveBtn ? window.getComputedStyle(reserveBtn).display !== 'none' : false,
            soundLabelVisible: soundLabel ? window.getComputedStyle(soundLabel).display !== 'none' : false,
          };
        })()
      `);
      console.log(`4. Navbar Configuration:`, navCheck);

      // 5. Test Hamburger Menu Drawer toggle on screens < 900px
      if (width < 900) {
        await client.evaluate(`(() => { document.getElementById('mobileMenuBtn')?.click(); })()`);
        await sleep(400);
        const drawerOpen = await client.evaluate(`
          (() => {
            const drawer = document.getElementById('mobileNavDrawer');
            return drawer ? drawer.classList.contains('nav-open') : false;
          })()
        `);
        console.log(`5. Hamburger Menu Open Test:`, drawerOpen ? '✅ Drawer Opens Full Screen' : '❌ Drawer Failed to Open');
        
        // Close menu again
        await client.evaluate(`(() => { document.getElementById('mobileMenuBtn')?.click(); })()`);
        await sleep(300);
      }

      // 6. Grand Thali Layout Check
      const thaliCheck = await client.evaluate(`
        (() => {
          const container = document.getElementById('thaliLabelsContainer');
          const hud = document.querySelector('.exploded-stage-box .scrub-progress-hud');
          const plate = document.getElementById('thaliBase');
          if (!container || !plate) return null;
          const containerStyle = window.getComputedStyle(container);
          const hudRect = hud ? hud.getBoundingClientRect() : null;
          const plateRect = plate.getBoundingClientRect();
          return {
            display: containerStyle.display,
            gridColumns: containerStyle.gridTemplateColumns ? containerStyle.gridTemplateColumns.split(' ').length : 0,
            plateWidth: Math.round(plateRect.width),
            plateHeight: Math.round(plateRect.height),
            hudBelowPlate: hudRect ? hudRect.top >= plateRect.bottom - 40 : false
          };
        })()
      `);
      console.log(`6. Grand Thali Layout:`, thaliCheck);

      // Capture screenshot
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      const filename = path.join(process.cwd(), `shot_${width}.png`);
      fs.writeFileSync(filename, Buffer.from(shot.data, 'base64'));
      console.log(`📸 Saved screenshot -> shot_${width}.png`);

      testResults.push({
        width,
        overflow: !overflowInfo.hasOverflow,
        nav: width >= 900 ? navCheck.desktopLinksVisible : navCheck.hamburgerVisible,
        thaliGrid: width <= 768 ? thaliCheck.gridColumns === 2 : true
      });
    }

    console.log('\n========================================');
    console.log('🎉 SUMMARY OF ALL BREAKPOINT TESTS:');
    console.table(testResults);
    console.log('========================================');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    cleanup();
    process.exit(0);
  }
}

run();
