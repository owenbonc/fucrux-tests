import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const html = join(root, 'clock.html');
const chrome = process.env.CHROME_PATH || (
  process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : '/usr/bin/google-chrome'
);

async function browser() {
  const temporary = join(root, '.perbo-tmp');
  await mkdir(temporary, { recursive: true });
  const profile = await mkdtemp(join(temporary, 'clock-chrome-'));
  const child = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
    '--remote-allow-origins=*', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore' });
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(`Chrome exited: ${child.exitCode}`);
      try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
      catch { await new Promise(r => setTimeout(r, 100)); }
    }
    if (!port) throw new Error('Chrome did not start');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((ok, fail) => { ws.addEventListener('open', ok, { once: true }); ws.addEventListener('error', fail, { once: true }); });
    let id = 0;
    const pending = new Map();
    const events = [];
    const blockedRequests = [];
    ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const task = pending.get(message.id);
        pending.delete(message.id);
        message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
      } else {
        events.push(message);
        if (message.method === 'Fetch.requestPaused') {
          blockedRequests.push(message.params.request.url);
          send('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
        }
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const next = ++id;
      pending.set(next, { resolve, reject });
      ws.send(JSON.stringify({ id: next, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Network.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: 'http://*' }, { urlPattern: 'https://*' }] });
    return { child, profile, ws, events, blockedRequests, send, evaluate, async close() {
      ws.close();
      if (child.exitCode === null && child.signalCode === null) {
        const exited = new Promise(resolve => child.once('exit', resolve));
        child.kill();
        await exited;
      }
      await rm(profile, { recursive: true, force: true });
    } };
  } catch (error) { child.kill(); await rm(profile, { recursive: true, force: true }); throw error; }
}

const snapshot = `(() => [...document.querySelectorAll('.dial')].map(d => ({
  city: d.dataset.city, zone: d.dataset.zone, daylight: d.dataset.daylight, surface: getComputedStyle(d).backgroundColor,
  box: (() => { const b = d.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })(),
  labels: [...d.querySelectorAll('.city')].map(e => e.textContent),
  numerals: [...d.querySelectorAll('.numeral')].map(e => ({ text: e.textContent, x: parseFloat(e.style.left), y: parseFloat(e.style.top), transform: getComputedStyle(e).transform })),
  ticks: [...d.querySelectorAll('.tick')].map(e => ({ hour: e.classList.contains('hour-tick'), angle: e.style.getPropertyValue('--angle'), w: e.offsetWidth, h: e.offsetHeight })),
  hands: Object.fromEntries(['hour','minute','second'].map(name => { const e = d.querySelector('.hand.' + name); return [name, { angle: Number(e.style.transform.match(/rotate\\(([^d]+)deg/)[1]), w: e.offsetWidth, h: e.offsetHeight, origin: getComputedStyle(e).transformOrigin, left: e.offsetLeft, top: e.offsetTop }]; }))
})))()`;

function expected(instant, zone) {
  const date = new Date(instant);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date).map(p => [p.type, p.value]));
  const h = Number(parts.hour), m = Number(parts.minute), s = Number(parts.second), f = date.getUTCMilliseconds() / 1000;
  return { daylight: h >= 6 && h < 18 ? 'day' : 'night', hour: ((h % 12) + m / 60 + (s + f) / 3600) * 30, minute: (m + (s + f) / 60) * 6, second: s * 6 };
}

test('single-file, offline clocks work over file:// and follow civil time', async () => {
  const source = await readFile(html, 'utf8');
  assert.match(source, /<style>/);
  assert.match(source, /<script>/);
  assert.doesNotMatch(source, /<link[^>]+stylesheet|<script[^>]+src=/i);
  const b = await browser();
  try {
    const errors = [];
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
      const RealDate = Date;
      globalThis.__clockTestNow = null;
      globalThis.Date = class extends RealDate {
        constructor(...args) { super(...(args.length ? args : [globalThis.__clockTestNow ?? RealDate.now()])); }
        static now() { return globalThis.__clockTestNow ?? RealDate.now(); }
      };
    })();` });
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await b.send('Page.navigate', { url: pathToFileURL(html).href });
    await new Promise(r => setTimeout(r, 500));
    for (const e of b.events) if (e.method === 'Runtime.exceptionThrown' || e.method === 'Log.entryAdded') errors.push(e);
    assert.deepEqual(errors, []);
    assert.equal(await b.evaluate('location.protocol'), 'file:');
    const requests = b.events.filter(e => e.method === 'Network.requestWillBeSent' && !e.params.request.url.startsWith('file:'));
    assert.deepEqual(requests.map(e => e.params.request.url), []);
    assert.deepEqual(b.blockedRequests, []);
    let dials = await b.evaluate(snapshot);
    assert.deepEqual(dials.map(d => d.city), ['London', 'Hong Kong', 'New York']);
    assert.deepEqual(dials.map(d => d.labels), [['London'], ['Hong Kong'], ['New York']]);
    assert(dials.every(d => d.box.w === d.box.h && d.box.w >= 200 && d.box.y === dials[0].box.y));
    assert(dials.every(d => d.box.w === dials[0].box.w));
    for (const dial of dials) {
      assert.deepEqual(dial.numerals.map(n => n.text), Array.from({ length: 12 }, (_, i) => String(i + 1)));
      dial.numerals.forEach((n, i) => {
        const radians = (i + 1) * Math.PI / 6;
        assert(Math.abs(n.x - (50 + 34 * Math.sin(radians))) < .01);
        assert(Math.abs(n.y - (50 - 34 * Math.cos(radians))) < .01);
        const matrix = n.transform.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number);
        assert.deepEqual(matrix?.slice(0, 4), [1, 0, 0, 1]);
      });
      assert.equal(dial.ticks.length, 60);
      assert.equal(dial.ticks.filter(t => t.hour).length, 12);
      dial.ticks.forEach((t, i) => { assert.equal(t.angle, `${i * 6}deg`); assert.equal(t.hour, i % 5 === 0); });
      assert(dial.ticks.every(t => t.hour ? t.w > 2 && t.h > 9 : t.w === 2 && t.h === 9));
      assert(dial.hands.hour.h < dial.hands.minute.h && dial.hands.minute.h < dial.hands.second.h);
      assert(dial.hands.hour.w > dial.hands.minute.w && dial.hands.minute.w > dial.hands.second.w);
    }
    const now = Date.now();
    dials.forEach(d => {
      const want = expected(now, d.zone);
      assert(Math.abs(d.hands.second.angle - want.second) <= 6 || Math.abs(d.hands.second.angle - want.second) >= 354);
    });
    const initialSeconds = dials[0].hands.second.angle;
    await new Promise(r => setTimeout(r, 1250));
    dials = await b.evaluate(snapshot);
    assert.notEqual(dials[0].hands.second.angle, initialSeconds);
    assert(dials.every(d => d.hands.second.angle === dials[0].hands.second.angle));
    await b.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: false });
    dials = await b.evaluate(snapshot);
    assert(dials.every(d => d.box.w === d.box.h && d.box.w >= 200));
    assert(dials[0].box.y < dials[1].box.y && dials[1].box.y < dials[2].box.y);

    for (const hostZone of ['UTC', 'Pacific/Honolulu', 'Asia/Tokyo']) {
      await b.send('Emulation.setTimezoneOverride', { timezoneId: hostZone });
      for (const instant of [
        '2026-01-15T08:30:00.000Z', '2026-03-29T00:30:00.000Z', '2026-03-29T01:30:00.000Z',
        '2026-03-08T06:30:00.000Z', '2026-03-08T07:30:00.000Z', '2026-07-15T17:30:30.000Z',
        '2026-01-15T05:59:59.000Z', '2026-01-15T06:00:00.000Z',
        '2026-01-15T17:59:59.000Z', '2026-01-15T18:00:00.000Z'
      ]) {
        await b.evaluate(`globalThis.__clockTestNow = ${Date.parse(instant)}; document.dispatchEvent(new Event('visibilitychange'))`);
        dials = await b.evaluate(snapshot);
        dials.forEach(d => {
          const want = expected(instant, d.zone);
          assert.equal(d.daylight, want.daylight);
          for (const hand of ['hour', 'minute', 'second']) assert(Math.abs(d.hands[hand].angle - want[hand]) < .002, `${instant} ${hostZone} ${d.city} ${hand}: ${d.hands[hand].angle} != ${want[hand]}`);
          assert.equal(d.hands.second.angle % 6, 0);
        });
        assert.equal(new Set(dials.filter(d => d.daylight === 'day').map(d => d.surface)).size <= 1, true);
        assert.equal(new Set(dials.filter(d => d.daylight === 'night').map(d => d.surface)).size <= 1, true);
        if (new Set(dials.map(d => d.daylight)).size === 2) assert.notEqual(dials.find(d => d.daylight === 'day').surface, dials.find(d => d.daylight === 'night').surface);
        assert(dials.every(d => d.hands.second.angle === dials[0].hands.second.angle));
      }
    }
    await b.evaluate(`globalThis.__clockTestNow = Date.parse('2026-01-15T08:30:00Z'); document.dispatchEvent(new Event('visibilitychange'))`);
    const first = await b.evaluate(snapshot);
    await b.evaluate(`globalThis.__clockTestNow = Date.parse('2026-01-15T09:30:30Z'); document.dispatchEvent(new Event('visibilitychange'))`);
    const afterSleep = await b.evaluate(snapshot);
    afterSleep.forEach(d => assert(Math.abs(d.hands.hour.angle - expected('2026-01-15T09:30:30Z', d.zone).hour) < .0001));
    assert.notDeepEqual(first.map(d => d.hands.hour.angle), afterSleep.map(d => d.hands.hour.angle));
    await b.evaluate(`globalThis.__clockTestNow = Date.parse('2026-01-15T08:30:00Z'); document.dispatchEvent(new Event('visibilitychange'))`);
    const atZero = await b.evaluate(snapshot);
    await b.evaluate(`globalThis.__clockTestNow = Date.parse('2026-01-15T08:30:30Z'); document.dispatchEvent(new Event('visibilitychange'))`);
    const atHalf = await b.evaluate(snapshot);
    await b.evaluate(`globalThis.__clockTestNow = Date.parse('2026-01-15T08:31:00Z'); document.dispatchEvent(new Event('visibilitychange'))`);
    const atOne = await b.evaluate(snapshot);
    const london = 0;
    assert.equal(atZero[london].hands.hour.angle, 255);
    assert(atZero[london].hands.minute.angle < atHalf[london].hands.minute.angle);
    assert(atHalf[london].hands.minute.angle < atOne[london].hands.minute.angle);
  } finally { await b.close(); }
});
