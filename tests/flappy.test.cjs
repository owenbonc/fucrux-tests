const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'flappy.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function load() {
  const events = new Map();
  const drawing = [];
  const tones = [];
  const elements = new Map();
  const canvas = {
    width: 400, height: 600,
    addEventListener(type, fn) { events.set('canvas:' + type, fn); },
    getContext() { return ctx; }
  };
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: '', font: '',
    fillRect(...v) { drawing.push(['rect', this.fillStyle, ...v]); },
    strokeRect() {}, beginPath() {}, arc() {}, fill() { drawing.push(['fill', this.fillStyle]); },
    stroke() {}, save() {}, restore() {}, translate() {}, rotate(angle) { drawing.push(['rotate', angle]); },
    moveTo() {}, lineTo() {}, closePath() {},
    fillText(...v) { drawing.push(['text', ...v]); }
  };
  class AudioContext {
    currentTime = 0;
    destination = {};
    createOscillator() {
      return { frequency: { value: 0 }, connect() {}, start() { tones.push('start'); }, stop() {} };
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  let now = 1000;
  const window = { AudioContext, PointerEvent: function () {} };
  const context = vm.createContext({
    window, document: {
      getElementById(id) {
        if (id === 'game') return canvas;
        if (!elements.has(id)) elements.set(id, { textContent: '', hidden: false, classList: { toggle() {} } });
        return elements.get(id);
      },
      addEventListener(type, fn) { events.set('document:' + type, fn); }
    },
    location: { search: '?test=1' }, URLSearchParams, Math, JSON,
    performance: { now: () => now }, requestAnimationFrame() {}
  });
  vm.runInContext(script, context, { filename: 'flappy.html' });
  const api = window.flappyTest;
  const dispatch = (target, type, extra = {}) => {
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    events.get(target + ':' + type)(event);
    return event;
  };
  return { api, drawing, tones, elements, dispatch, advance(ms) { now += ms; } };
}

function throughGap(g) {
  const a = g.api, c = a.constants, before = a.snapshot().score;
  if (!a.snapshot().pipes.length) { a.setBird(260, 0); a.step(); }
  const target = a.snapshot().pipes.find(p => !p.scored);
  assert.ok(target.x > a.snapshot().bird.x + c.RADIUS);
  let overlapped = false;
  for (let i = 0; i < 240 && a.snapshot().score === before; i++) {
    const p = a.snapshot().pipes.find(p => p.gapTop === target.gapTop);
    assert.ok(p, 'spawned pair remains until passed');
    a.setBird((p.gapTop + p.gapBottom) / 2, 0);
    a.step();
    const s = a.snapshot();
    assert.equal(s.state, 'playing');
    if (p.x - c.SPEED < s.bird.x + c.RADIUS && p.x - c.SPEED + c.PIPE_WIDTH > s.bird.x - c.RADIUS) overlapped = true;
  }
  assert.ok(overlapped, 'bird and spawned pipe actually crossed in the gap');
  assert.equal(a.snapshot().score, before + 1);
  for (let i = 0; i < 3; i++) {
    a.setBird((target.gapTop + target.gapBottom) / 2, 0);
    a.step();
    assert.equal(a.snapshot().state, 'playing');
  }
}

test('self-contained disk document and canvas drawing', () => {
  assert.match(html, /<canvas\b/);
  assert.doesNotMatch(html, /<[^>]+\b(?:src|href|srcset)\s*=/i);
  assert.doesNotMatch(html, /<(?:img|audio|source|video|track|iframe)\b/i);
  assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/);
  assert.doesNotMatch(html, /(?:url\s*\(|data:(?:image|audio)|<img\b|localStorage|sessionStorage|document\.cookie|new\s+Audio\s*\(\s*['"]|\.(?:mp3|wav|ogg|m4a|aac)\b)/i);
  const g = load();
  assert.ok(g.drawing.some(x => x[0] === 'rect' && x[1] === '#70c9ef'));
  assert.ok(g.drawing.some(x => x[0] === 'fill' && x[1] === '#ffd43b'));
});

test('get-ready hover, first flap, gravity and fixed kick', () => {
  const g = load(), a = g.api;
  assert.equal(a.snapshot().state, 'get-ready');
  for (let i = 0; i < 300; i++) {
    a.step();
    assert.ok(Math.abs(a.snapshot().bird.y - 260) <= 5.01);
    assert.equal(a.snapshot().pipes.length, 0);
  }
  assert.equal(a.snapshot().pipes.length, 0);
  a.flap();
  assert.equal(a.snapshot().state, 'playing');
  assert.equal(a.snapshot().bird.vy, a.constants.KICK);
  a.setBird(250, 3);
  a.step(); a.step();
  assert.ok(a.snapshot().bird.vy > 3);
  a.flap();
  assert.equal(a.snapshot().bird.vy, a.constants.KICK);
  a.setBird(250, -12);
  a.flap();
  assert.equal(a.snapshot().bird.vy, a.constants.KICK);
});

test('Space, click and pointer flap, with Space scrolling prevented', () => {
  const g = load(), a = g.api;
  const key = g.dispatch('document', 'keydown', { code: 'Space', key: ' ' });
  assert.equal(key.defaultPrevented, true);
  assert.equal(a.snapshot().bird.vy, a.constants.KICK);
  assert.equal(g.tones.length, 1);
  a.setBird(260, 5);
  g.dispatch('canvas', 'click');
  assert.equal(a.snapshot().bird.vy, a.constants.KICK);
  assert.equal(g.tones.length, 2);
  a.setBird(260, 5);
  g.dispatch('canvas', 'pointerdown', { pointerType: 'touch' });
  assert.equal(a.snapshot().bird.vy, a.constants.KICK);
  assert.equal(g.tones.length, 3);
});

test('top clamps without crash; rotation follows velocity', () => {
  const a = load().api;
  a.flap();
  assert.ok(a.snapshot().bird.angle < 0);
  for (let i = 0; i < 110; i++) { a.flap(); a.step(); }
  assert.equal(a.snapshot().bird.y, a.constants.RADIUS);
  assert.equal(a.snapshot().state, 'playing');
  const falling = load().api;
  falling.flap();
  falling.setBird(200, 0);
  for (let i = 0; i < 12; i++) falling.step();
  assert.equal(falling.snapshot().state, 'playing');
  assert.ok(falling.snapshot().bird.vy > 0);
  assert.ok(falling.snapshot().bird.angle > 0);
});

test('fixed pipe speed and spacing, bounded variable fixed-height gaps, ground speed', () => {
  const a = load().api, c = a.constants;
  a.flap();
  const gaps = new Set();
  let previous = null;
  let enteredFromRight = false;
  for (let i = 0; i < 1100; i++) {
    const approaching = a.snapshot().pipes.find(p => p.x - c.SPEED - 5 < 105 + c.RADIUS && p.x - c.SPEED + c.PIPE_WIDTH + 5 > 105 - c.RADIUS);
    a.setBird(approaching ? (approaching.gapTop + approaching.gapBottom) / 2 : 260, 0);
    a.step();
    const s = a.snapshot();
    assert.equal(s.state, 'playing');
    enteredFromRight ||= s.pipes.some(p => p.x > c.WIDTH);
    for (const pipe of s.pipes) {
      assert.ok(Math.abs(pipe.gapBottom - pipe.gapTop - c.PIPE_GAP) < 1e-9);
      assert.ok(pipe.gapTop >= c.GAP_MIN && pipe.gapTop <= c.GAP_MAX);
      gaps.add(Math.round(pipe.gapTop));
    }
    for (let j = 1; j < s.pipes.length; j++) assert.equal(s.pipes[j].x - s.pipes[j - 1].x, c.PIPE_SPACING);
    if (previous) {
      for (const pipe of s.pipes) {
        const prior = previous.pipes.find(p => p.gapTop === pipe.gapTop);
        if (prior) assert.equal(prior.x - pipe.x, c.SPEED);
      }
      assert.equal((previous.groundOffset - s.groundOffset + 32) % 32, c.SPEED);
    }
    previous = s;
  }
  assert.ok(gaps.size > 4);
  assert.ok(enteredFromRight);
});

test('one point per passed pair, scored point has one generated beep', () => {
  const g = load(), a = g.api;
  a.flap();
  const before = g.tones.length;
  throughGap(g);
  assert.equal(g.tones.length - before, 1);
  for (let i = 0; i < 10; i++) { a.setBird(250, 0); a.step(); }
  assert.equal(a.snapshot().score, 1);
});

test('visit best persists across games but a fresh load starts at zero', () => {
  const g = load(), a = g.api;
  a.flap();
  for (let i = 0; i < 3; i++) throughGap(g);
  assert.equal(a.snapshot().score, 3);
  a.setBird(a.constants.GROUND, 0); a.step();
  for (let i = 0; i < a.constants.RESTART_DELAY; i++) a.step();
  a.flap();
  assert.equal(a.snapshot().score, 0);
  a.flap(); throughGap(g);
  a.setBird(a.constants.GROUND, 0); a.step();
  assert.equal(a.snapshot().best, 3);
  assert.equal(g.elements.get('score').textContent, 'Score 1');
  assert.equal(g.elements.get('best').textContent, 'Best 3');
  assert.equal(g.elements.get('panel-detail').textContent, 'Score 1   Best 3');
  assert.equal(load().api.snapshot().best, 0);
});

test('pipe and ground crashes freeze pipes, settle bird, show panel, and delay restart', () => {
  for (const kind of ['pipe', 'ground']) {
    const g = load(), a = g.api;
    a.flap();
    if (kind === 'pipe') a.setPipes([{ x: 100, gapTop: 310, gapBottom: 475, scored: false }]);
    else a.setBird(a.constants.GROUND, 0);
    const before = g.tones.length;
    a.step();
    assert.equal(a.snapshot().state, 'game-over');
    assert.equal(g.tones.length - before, 1);
    const x = a.snapshot().pipes.map(p => p.x);
    a.flap();
    assert.equal(a.snapshot().state, 'game-over');
    for (let i = 0; i < 100; i++) a.step();
    assert.deepEqual(a.snapshot().pipes.map(p => p.x), x);
    assert.equal(a.snapshot().bird.y, a.constants.GROUND - a.constants.RADIUS);
    assert.equal(g.elements.get('panel-title').textContent, 'Game Over');
    assert.equal(g.elements.get('panel').hidden, false);
    a.flap();
    assert.equal(a.snapshot().state, 'get-ready');
    assert.equal(a.snapshot().score, 0);
    assert.equal(a.snapshot().pipes.length, 0);
  }
});

test('shapes and responsive 2:3 canvas contract', () => {
  const g = load();
  g.api.flap(); g.api.step();
  assert.ok(g.drawing.some(x => x[0] === 'rect' && x[1] === '#43b84e'));
  assert.match(html, /aspect-ratio:\s*2\s*\/\s*3/);
  assert.match(html, /width:\s*min\(100vw,\s*66\.666667vh\)/);
});

test('cap-only contact crashes even when the bird misses the pipe body', () => {
  const a = load().api;
  a.flap();
  a.setBird(300, 0);
  a.setPipes([{ x: 123, gapTop: 310, gapBottom: 475, scored: false }]);
  a.step();
  assert.equal(a.snapshot().state, 'game-over');
});
