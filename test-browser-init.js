const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('starfall-quiz.html', 'utf8');
const js = fs.readFileSync('game.js', 'utf8');
const configJs = fs.readFileSync('starfall-game-api-config.js', 'utf8');

// Parse all IDs from HTML
const idRegex = /id=["']([^"']+)["']/g;
let m;
const htmlIds = new Set();
while ((m = idRegex.exec(html)) !== null) {
  htmlIds.add(m[1]);
}

class FakeElement {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = {
      _classes: new Set(),
      add: function(...c) { c.forEach(x => this._classes.add(x)); },
      remove: function(...c) { c.forEach(x => this._classes.delete(x)); },
      toggle: function(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) this._classes.add(c);
        else this._classes.delete(c);
      },
      contains: function(c) { return this._classes.has(c); }
    };
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.children = [];
    this.dataset = {};
  }
  getContext() {
    return {
      clearRect: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      setTransform: () => {},
      drawImage: () => {},
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      setLineDash: () => {},
      measureText: () => ({ width: 50 })
    };
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 440, height: 780 };
  }
  appendChild(child) {
    this.children.push(child);
  }
  querySelector() {
    return new FakeElement();
  }
  querySelectorAll() {
    return [];
  }
  addEventListener() {}
  removeEventListener() {}
}

const elementsMap = {};
htmlIds.forEach(id => {
  elementsMap[id] = new FakeElement(id);
});

const listeners = {};

const mockWindow = {
  innerWidth: 440,
  innerHeight: 780,
  devicePixelRatio: 1,
  performance: { now: () => Date.now() },
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  addEventListener: (event, cb) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(cb);
  },
  removeEventListener: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  document: {
    getElementById: (id) => {
      if (elementsMap[id]) return elementsMap[id];
      return null;
    },
    createElement: (tag) => new FakeElement('', tag),
    querySelectorAll: (sel) => {
      if (sel === '.overlay') {
        return Object.values(elementsMap).filter(el => el.id && el.id.includes('Screen') || el.id.includes('Overlay'));
      }
      return [];
    },
    querySelector: () => new FakeElement(),
    body: new FakeElement('body', 'body')
  },
  Image: class {
    constructor() {
      this.complete = true;
      this.naturalWidth = 100;
      this.naturalHeight = 100;
    }
  },
  AudioContext: class {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
    createOscillator() {
      return {
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createBuffer(channels, length, sampleRate) {
      return {
        getChannelData: () => new Float32Array(length)
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createBiquadFilter() {
      return {
        type: 'highpass',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        Q: { setValueAtTime: () => {} },
        connect: () => {}
      };
    }
    resume() { return Promise.resolve(); }
  },
  indexedDB: {
    open: () => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    })
  },
  fetch: () => Promise.reject(new Error('Local mock')),
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Date: Date,
  console: console
};

mockWindow.window = mockWindow;

const context = vm.createContext(mockWindow);
console.log('Running starfall-game-api-config.js...');
vm.runInContext(configJs, context);
console.log('Running game.js in mock browser context...');
vm.runInContext(js, context);

console.log('Triggering DOMContentLoaded event...');
if (listeners['DOMContentLoaded']) {
  listeners['DOMContentLoaded'].forEach(cb => cb());
  console.log('[SUCCESS] DOMContentLoaded fired without throwing any errors!');
} else {
  console.error('FAIL: No DOMContentLoaded listener found.');
  process.exit(1);
}

const game = mockWindow.__starfallGame;
if (!game) {
  console.error('FAIL: __starfallGame was not created.');
  process.exit(1);
}

console.log(`[SUCCESS] Game instance created! State = "${game.state}"`);

// Verify update and render loop
console.log('Testing game.update(0.016) and game.render()...');
game.update(0.016);
game.render();
console.log('[SUCCESS] game.update() and game.render() executed cleanly!');

// Test clicking startPlayBtn
console.log('Testing clicking #startPlayBtn (出擊出航)...');
const startBtn = mockWindow.document.getElementById('startPlayBtn');
startBtn.onclick();
console.log(`[SUCCESS] Game started! State = "${game.state}", Stage = ${game.stage}, Wave = ${game.wave}`);

// Test updating playing loop
game.update(0.016);
game.render();
console.log(`[SUCCESS] Active update with bullets: ${game.bullets.length}, equippedActive: [${game.equippedActiveWeapons.join(', ')}]`);

console.log('\n===========================================');
console.log('BROWSER SIMULATION: 100% OPERATIONAL & CLEAN');
console.log('===========================================');
