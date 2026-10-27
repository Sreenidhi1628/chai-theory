import fs from 'fs';

async function test() {
  const res = await fetch('http://127.0.0.1:9222/json');
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

  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 2000));

  const code = `
    (() => {
      const stage = document.getElementById('thaliStage');
      const video = document.getElementById('explodedThaliVideo');
      const plate = document.getElementById('thaliPlateImg');
      const base = document.getElementById('thaliBase');
      const arena = document.getElementById('thaliArena');
      return {
        videoComputed: {
          display: getComputedStyle(video).display,
          width: getComputedStyle(video).width,
          height: getComputedStyle(video).height
        },
        plateComputed: {
          src: plate?.src,
          naturalWidth: plate?.naturalWidth,
          naturalHeight: plate?.naturalHeight,
          width: plate?.offsetWidth,
          height: plate?.offsetHeight,
          display: getComputedStyle(plate).display
        },
        baseComputed: {
          width: base?.offsetWidth,
          height: base?.offsetHeight,
          transform: getComputedStyle(base).transform,
          display: getComputedStyle(base).display
        },
        arenaComputed: {
          width: arena?.offsetWidth,
          height: arena?.offsetHeight
        }
      };
    })()
  `;

  const info = await send('Runtime.evaluate', {
    expression: code,
    returnByValue: true
  });
  console.log(JSON.stringify(info.result.value, null, 2));
  process.exit(0);
}

test();
