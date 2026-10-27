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

const check = await send('Runtime.evaluate', {
  expression: `(() => {
    const btn = document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileNavDrawer');
    console.log('Before click:', drawer?.className);
    btn?.click();
    return {
      btnExists: !!btn,
      drawerExists: !!drawer,
      drawerClasses: drawer?.className
    };
  })()`,
  returnByValue: true
});
console.log('Result:', check.result?.value);
process.exit(0);
