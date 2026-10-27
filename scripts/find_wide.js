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

const elements = await send('Runtime.evaluate', {
  expression: `(() => {
    const wide = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > 361) {
        wide.push({
          tag: el.tagName,
          id: el.id,
          cls: el.className ? el.className.toString().slice(0, 30) : '',
          w: el.offsetWidth,
          sW: el.scrollWidth
        });
      }
    });
    return wide;
  })()`,
  returnByValue: true
});
console.log('Wide elements:', elements.result?.value);
process.exit(0);
