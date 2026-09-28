const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const chromePath = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find(candidate => fs.existsSync(candidate));
const fileURL = pathToFileURL(path.join(__dirname, '..', 'flappy.html')).href + '?test=1';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function browser() {
  assert.ok(chromePath && fs.existsSync(chromePath), `Chromium browser not found; set CHROME_PATH`);
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || path.join(__dirname, '..', '.perbo-tmp'), 'flappy-chrome-'));
  const child = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--disable-background-networking',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore' });
  let socket;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) {
      if (child.exitCode !== null) throw new Error(`Chrome exited ${child.exitCode}`);
      await delay(100);
    }
    assert.ok(fs.existsSync(portFile), 'Chrome DevTools endpoint did not start');
    const [port, endpoint] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
    socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let nextId = 0;
    const pending = new Map(), listeners = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const promise = pending.get(message.id);
        if (promise) {
          pending.delete(message.id);
          message.error ? promise.reject(new Error(message.error.message)) : promise.resolve(message.result);
        }
      } else if (listeners.has(message.method)) {
        for (const listener of listeners.get(message.method)) listener(message.params);
      }
    });
    const raw = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const target = await raw('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await raw('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const send = (method, params) => raw(method, params, sessionId);
    const on = (method, fn) => {
      if (!listeners.has(method)) listeners.set(method, new Set());
      listeners.get(method).add(fn);
    };
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const load = async () => {
      const loaded = new Promise(resolve => {
        const handler = () => { listeners.get('Page.loadEventFired').delete(handler); resolve(); };
        on('Page.loadEventFired', handler);
      });
      await send('Page.navigate', { url: fileURL });
      await loaded;
    };
    await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable'), send('Log.enable')]);
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__storageWrites = 0;
      for (const name of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[name];
        Storage.prototype[name] = function (...args) { window.__storageWrites++; return original.apply(this, args); };
      }
      const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      if (cookie && cookie.set) Object.defineProperty(document, 'cookie', {
        configurable: true, get: () => cookie.get.call(document),
        set: value => { window.__storageWrites++; return cookie.set.call(document, value); }
      });
    ` });
    return { send, on, evaluate, load, close: async () => {
      socket.close();
      child.kill();
      for (let i = 0; i < 30 && child.exitCode === null; i++) await delay(100);
      fs.rmSync(profile, { recursive: true, force: true });
    } };
  } catch (error) {
    socket?.close();
    child.kill();
    fs.rmSync(profile, { recursive: true, force: true });
    throw error;
  }
}

test('file URL in Chrome: input, rendered pixels, layout, score display and visit lifetime', { timeout: 30000 }, async () => {
  const b = await browser();
  try {
    const requests = [], errors = [];
    b.on('Network.requestWillBeSent', ({ request }) => requests.push(request.url));
    b.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.text));
    b.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (type === 'error') errors.push(args.map(arg => arg.value || arg.description).join(' '));
    });
    b.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') errors.push(entry.text); });
    await b.load();
    assert.equal(await b.evaluate('location.protocol'), 'file:');
    assert.equal(await b.evaluate('flappyTest.snapshot().state'), 'get-ready');
    assert.ok(await b.evaluate('document.querySelector("canvas").getContext("2d").getImageData(100,260,1,1).data[0] > 200'));
    const tick = await b.evaluate('flappyTest.snapshot().ticks');
    await delay(100);
    assert.ok(await b.evaluate(`flappyTest.snapshot().ticks > ${tick}`), 'the disk-loaded game loop advances');
    assert.deepEqual(requests.filter(url => /^https?:/i.test(url)), []);
    assert.deepEqual(errors, []);
    assert.equal(await b.evaluate('window.__storageWrites'), 0);

    // Freeze animation on subsequent loads so browser-dispatched inputs can be checked at the exact flap instant.
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = () => 0;' });
    await b.load();

    await b.evaluate('document.addEventListener("keydown", e => { if (e.code === "Space") window.spacePrevented = e.defaultPrevented; })');
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    assert.deepEqual(await b.evaluate('({prevented:spacePrevented,vy:flappyTest.snapshot().bird.vy,kick:flappyTest.constants.KICK})'),
      { prevented: true, vy: -5.8, kick: -5.8 });
    await b.evaluate('flappyTest.setBird(260,5); document.querySelector("canvas").click()');
    assert.equal(await b.evaluate('flappyTest.snapshot().bird.vy'), -5.8);
    await b.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const point = await b.evaluate('(() => { const r=document.querySelector("canvas").getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()');
    await b.evaluate('flappyTest.setBird(260,5)');
    await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 1 }] });
    assert.equal(await b.evaluate('flappyTest.snapshot().bird.vy'), -5.8);
    await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    const pixels = await b.evaluate(`(() => {
      const a=flappyTest, c=document.querySelector('canvas').getContext('2d');
      a.reset(); a.flap();
      for(let i=0;i<45;i++){a.setBird(260,0);a.step()}
      const pixel=(x,y)=>Array.from(c.getImageData(x,y,1,1).data);
      return {sky:pixel(10,100),bird:pixel(100,260),pipe:pixel(360,40),state:a.snapshot().state};
    })()`);
    assert.equal(pixels.state, 'playing');
    assert.ok(pixels.sky[2] > pixels.sky[0] && pixels.sky[0] > 80, `sky ${pixels.sky}`);
    assert.ok(pixels.bird[0] > 220 && pixels.bird[1] > 150 && pixels.bird[2] < 100, `bird ${pixels.bird}`);
    assert.ok(pixels.pipe[1] > pixels.pipe[0] && pixels.pipe[1] > pixels.pipe[2], `pipe ${pixels.pipe}`);

    const ratios = [];
    for (const [width, height] of [[1200, 700], [320, 850]]) {
      await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      const box = await b.evaluate('(() => { const r=document.querySelector("#play").getBoundingClientRect(); return {w:r.width,h:r.height,vw:innerWidth,vh:innerHeight}; })()');
      ratios.push(box.w / box.h);
      assert.ok(box.w <= box.vw + 1 && box.h <= box.vh + 1);
      assert.ok(Math.abs(box.w - box.vw) < 1 || Math.abs(box.h - box.vh) < 1);
    }
    assert.ok(Math.abs(ratios[0] - ratios[1]) < 0.0001);

    await b.load();
    const playTo = async count => b.evaluate(`(() => {
      const a=flappyTest,c=a.constants; a.flap();
      for(let i=0;i<1000 && a.snapshot().score<${count};i++){
        const p=a.snapshot().pipes.find(p=>p.x-c.SPEED-5<a.snapshot().bird.x+c.RADIUS && p.x-c.SPEED+c.PIPE_WIDTH+5>a.snapshot().bird.x-c.RADIUS);
        a.setBird(p ? (p.gapTop+p.gapBottom)/2 : 260,0); a.step();
        if(a.snapshot().state!=='playing') throw Error('crashed before scoring');
      }
      if(a.snapshot().score!==${count}) throw Error('did not score');
      a.setBird(c.GROUND,0); a.step();
      const frozen=a.snapshot().pipes.map(p=>p.x);
      for(let i=0;i<100;i++)a.step();
      const panel=document.querySelector('#panel');
      const scoreRect=document.querySelector('#score').getBoundingClientRect();
      const bestRect=document.querySelector('#best').getBoundingClientRect();
      return {score:document.querySelector('#score').textContent,best:document.querySelector('#best').textContent,
        detail:document.querySelector('#panel-detail').textContent,title:document.querySelector('#panel-title').textContent,
        visible:!panel.hidden && getComputedStyle(panel).display!=='none' && panel.getBoundingClientRect().width>0,
        scoreBesideBest:scoreRect.width>0 && bestRect.width>0 && scoreRect.right<bestRect.left && Math.abs(scoreRect.top-bestRect.top)<2,
        pipesStopped:a.snapshot().pipes.every((p,i)=>p.x===frozen[i]),
        birdY:a.snapshot().bird.y,ground:c.GROUND,radius:c.RADIUS};
    })()`);
    const first = await playTo(3);
    assert.deepEqual([first.score, first.best, first.detail, first.title, first.visible],
      ['Score 3', 'Best 3', 'Score 3   Best 3', 'Game Over', true]);
    assert.equal(first.birdY, first.ground - first.radius);
    assert.ok(first.scoreBesideBest && first.pipesStopped);
    assert.equal(await b.evaluate('(() => {flappyTest.flap();return flappyTest.snapshot().state})()'), 'get-ready');
    const second = await playTo(1);
    assert.deepEqual([second.score, second.best, second.detail], ['Score 1', 'Best 3', 'Score 1   Best 3']);
    assert.equal(await b.evaluate('window.__storageWrites'), 0);
    assert.equal(await b.evaluate('localStorage.length + sessionStorage.length'), 0);
    await b.load();
    assert.deepEqual(await b.evaluate('[document.querySelector("#score").textContent,document.querySelector("#best").textContent]'), ['Score 0', 'Best 0']);
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
