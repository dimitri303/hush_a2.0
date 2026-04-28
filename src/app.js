const VERSION = 'A2.0';
const RW = 1280, RH = 720;
const canvas = document.getElementById('c');
const cx = canvas.getContext('2d');

// Hidden video element for anime channel
const animeVideo = document.createElement('video');
animeVideo.src = 'assets/anime-video.mp4';
animeVideo.loop = true;
animeVideo.muted = true;
animeVideo.playsInline = true;
animeVideo.preload = 'auto';
animeVideo.style.display = 'none';
document.body.appendChild(animeVideo);

const UI = {
  label: document.getElementById('label'),
  back: document.getElementById('back'),
  clock: document.getElementById('clock'),
  clkTxt: document.getElementById('clkTxt'),
  timeTxt: document.getElementById('timeTxt'),
  timeUi: document.getElementById('timeUi'),
  init: document.getElementById('init'),
  loaderTxt: document.getElementById('loaderTxt'),
  hifiUi: document.getElementById('hifiUi'),
  tvUi: document.getElementById('tvUi'),
  winUi: document.getElementById('winUi'),
  holoUi: document.getElementById('holoUi'),
  musicPow: document.getElementById('musicPow'),
  musicPlay: document.getElementById('musicPlay'),
  musicPrev: document.getElementById('musicPrev'),
  musicNext: document.getElementById('musicNext'),
  tvPow: document.getElementById('tvPow'),
  winToggle: document.getElementById('winToggle'),
  winLean: document.getElementById('winLean')
};

let SCALE = 1;
const state = {
  t: 0,
  lastTs: 0,
  mx: 0,
  my: 0,
  focus: null,
  hover: null,
  timeMode: 'auto',
  timeCycle: false,
  cycleAt: 0,
  cycleMinutesBase: 22 * 60 + 47,
  timeBlend: { day: 0, sunset: 0, night: 1 },
  currentMinutes: 22 * 60 + 47,
  weather: { rain: true, snow: false, mist: false, thunderstorm: false },
  mood: 'calm',
  winOpen: false,
  winAnim: 0,       // 0=closed, 1=open — animated
  leanOut: false,
  lampOn: true,
  tvOn: true,
  tvCh: 3,
  tvFlicker: 0,
  musicOn: true,
  musicSource: 'vinyl',
  musicTrack: 0,
  vinylSpin: 0,
  holoPulse: 0,
  labelHold: 0,
  camX: 0,
  camY: 0,
  glowPulse: 0,
  cityOffset: 0,
  parallaxX: 0,     // smoothed mouse parallax -1..1
  parallaxY: 0,
  lightningFlash: 0, // 0..1 lightning flash intensity
  lightningNext: 8 + Math.random() * 20,
  helicopterX: -0.1, // helicopter position 0..1
  helicopterY: 0.18,
  helicopterActive: false,
  helicopterNext: 30 + Math.random() * 60,
  helicopterAngle: 0, // searchlight angle
  condensation: Array.from({length:12},()=>({
    x: Math.random(), y: Math.random(),
    r: 8 + Math.random() * 24,
    clearing: false, alpha: 0.12 + Math.random() * 0.18,
    next: Math.random() * 30
  })),
  snow: [],
  rain: []
};

const ASSET_DIR = 'assets/';

// ── CITY DATA ─────────────────────────────────────────
const CITY_W = RW; // static city — fills window exactly

function mkBuilding(x, layerIdx) {
  const shades = ['#0c0818','#110c1e','#160e26','#1c1230'];
  const heights = [[18,50],[28,80],[38,110],[50,140]];
  const [hmin,hmax] = heights[layerIdx];
  const h = hmin + Math.floor(Math.random()*(hmax-hmin));
  const w = Math.floor((h*.3)+Math.random()*(h*.5)+8);
  return {
    x, w, h,
    shade: shades[layerIdx],
    wins: Array.from({length:Math.floor(w*h/300)+2},()=>({
      ox: 4+Math.random()*(w-12), oy: 6+Math.random()*(h-12),
      on: Math.random()>.42,
      rate: 4000+Math.random()*56000, last:Math.random()*60000,
      warm: Math.random()>.45,
    })),
    sign: layerIdx>=2 && Math.random()>.78,
    signCol: ['#e040fb','#00e5ff','#ff4081','#ffab40'][Math.floor(Math.random()*4)],
    signText: ['HUSH','NITE','雨','NOCT','空き'][Math.floor(Math.random()*5)],
    screen: layerIdx>=2 && Math.random()>.65,
    screenPh: Math.random()*Math.PI*2,
  };
}

// apartmentMoments populated after cityLayers is built below
let apartmentMoments = [];

const cityLayers = Array.from({length:4},(_,li)=>{
  const spacing = [55, 80, 110, 160][li];
  const buildings = [];
  for(let x=0; x<CITY_W; x+=spacing+Math.floor(Math.random()*spacing*.5)){
    buildings.push(mkBuilding(x,li));
  }
  return {buildings, depth:[0.015,0.045,0.09,0.18][li]};
});

// Build apartment moments anchored to buildings
cityLayers.forEach((layer,li)=>{
  if(li<1) return;
  layer.buildings.forEach(b=>{
    if(Math.random()>.4) return;
    const bFrac=b.x/CITY_W;
    apartmentMoments.push({
      bx:bFrac, bw:b.w/CITY_W, bh:b.h,
      w:7+Math.random()*Math.min(14,b.w*.6), h:5+Math.random()*8,
      phase:Math.random()*Math.PI*2,
      next:Math.random()*12, active:0,
      kind:['tv','curtain','silhouette','lamp'][Math.floor(Math.random()*4)],
      li
    });
  });
});

const distantLife = Array.from({length:34},()=>({
  layer: 2+Math.floor(Math.random()*2),
  x: Math.random(), y: .18+Math.random()*.45,
  w: 10+Math.random()*18, h: 8+Math.random()*18,
  phase: Math.random()*Math.PI*2,
  type: ['curtain','tv','silhouette','floor','beacon'][Math.floor(Math.random()*5)],
  next: 2+Math.random()*18, active: 0, dur: 2+Math.random()*7, seed: Math.random()*999
}));

// ── RAIN SYSTEM ───────────────────────────────────────
// 3 depth layers: far (behind city), mid (falling past window), near (foreground)
// Each drop: x,y normalized | vy vertical speed (norm/s) | vx horizontal drift
//            len streak length px | alpha | layer | phase
function makeRainLayer(count, vyMin, vyMax, lenMin, lenMax, aMin, aMax) {
  return Array.from({length: count}, () => ({
    x: Math.random(),
    y: Math.random(),
    vy: vyMin + Math.random() * (vyMax - vyMin),
    len: lenMin + Math.random() * (lenMax - lenMin),
    alpha: aMin + Math.random() * (aMax - aMin),
    phase: Math.random() * Math.PI * 2,
  }));
}
const rainLayers = [
  makeRainLayer(90,  0.18, 0.38,  5, 14,  0.06, 0.14), // far  — fine, slow, ghostly
  makeRainLayer(110, 0.42, 0.72, 18, 38,  0.14, 0.28), // mid  — main body of rain
  makeRainLayer(55,  0.78, 1.10, 38, 72,  0.28, 0.55), // near — fast bright streaks
];
// Persistent wind state — gusts shift angle over time
let windX = -0.04; // slight leftward lean by default

const stars = Array.from({length:180},()=>({
  x:Math.random(), y:Math.random()*.68,
  r:.35+Math.random()*.85, a:.25+Math.random()*.55,
  twinkle:Math.random()*Math.PI*2, twinkleRate:.4+Math.random()*1.1,
}));
const MOON = {px:.78, py:.14, r:32};

const clouds = Array.from({length:6},(_,i)=>({
  x:.08+i*.16+Math.random()*.1, y:.08+Math.random()*.28,
  speed:.0004+Math.random()*.0004, scale:.55+Math.random()*.7, alpha:.12+Math.random()*.18,
  puffs: Array.from({length:4+Math.floor(Math.random()*3)},(_,j)=>({
    ox:j*14-20+Math.random()*10, oy:Math.random()*6-3,
    rx:18+Math.random()*14, ry:9+Math.random()*7,
  })),
}));

const traffic = Array.from({length:14},()=>({
  x:Math.random(), spd:.18+Math.random()*.55,
  col:Math.random()>.5?'rgba(255,200,80,.85)':'rgba(255,80,100,.75)',
  tail:6+Math.floor(Math.random()*20),
  lane:Math.floor(Math.random()*2), dir:Math.random()>.5?1:-1,
}));

// ── EXTRA CITY LIFE ───────────────────────────────────
const droneLights = Array.from({length:5},()=>({
  x:Math.random(), y:0.08+Math.random()*.34,
  speed:0.006+Math.random()*.012,
  phase:Math.random()*Math.PI*2,
  size:1+Math.random()*1.8,
  colour:Math.random()>.5?'rgba(120,230,255,.75)':'rgba(255,115,210,.7)'
}));

const glassDroplets = Array.from({length:42},()=>({
  x:Math.random(), y:Math.random(),
  speed:0.015+Math.random()*.045,
  len:14+Math.random()*42,
  wobble:Math.random()*Math.PI*2,
  alpha:0.08+Math.random()*.18
}));

const billboardGlitches = Array.from({length:4},()=>({
  x:Math.random(), y:0.18+Math.random()*.52,
  w:28+Math.random()*54, h:10+Math.random()*22,
  phase:Math.random()*Math.PI*2,
  colourA:Math.random()>.5?'rgba(0,230,255,.65)':'rgba(255,65,190,.62)',
  colourB:Math.random()>.5?'rgba(255,210,90,.5)':'rgba(180,110,255,.55)'
}));

// apartmentMoments built after cityLayers — see above

function timeProfile() {
  const w = state.timeBlend || {day:0,sunset:0,night:1};
  return {
    day:w.day, sunset:w.sunset, night:w.night,
    neon:.10*w.day+.55*w.sunset+1*w.night
  };
}

function mixRGB3(day,sunset,night){
  const tp=timeProfile();
  return [
    day[0]*tp.day+sunset[0]*tp.sunset+night[0]*tp.night,
    day[1]*tp.day+sunset[1]*tp.sunset+night[1]*tp.night,
    day[2]*tp.day+sunset[2]*tp.sunset+night[2]*tp.night,
  ];
}
function rgbaFromRGB(rgb,a){return `rgba(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0},${a.toFixed(3)})`;}

const ASSETS = {
  books: 'books.png',
  chair: 'chair.png',
  cubeBase: 'cubeBase.png',
  headphones: 'headphones.png',
  hifiRack: 'hifi-rack.png',
  lamp: 'lamp.png',
  mug: 'mug.png',
  recordPlayer: 'record-player.png',
  remote: 'remote.png',
  moon:         'moon.png',
  cityNight:    'city-night.png',
  roomBackplate: 'room-backplate.png',
  table: 'table.png',
  tv: 'tv.png'
};

const images = {};
const assetEntries = Object.entries(ASSETS);
let loadedAssets = 0;

const layout = {
  room:         { x: 0, y: 0, w: RW, h: RH },
  win:          { x: 278, y: 120, w: 718, h: 300 },
  chair:        { x: 98, y: 376, w: 328, h: 296 },
  lamp:         { x: 270, y: 299, w: 104, h: 216 },
  hifi:         { x: 335, y: 269, w: 693, h: 275 },
  recordPlayer: { x: 317, y: 393, w: 184, h: 59 },
  headphones:   { x: 479, y: 410, w: 71, h: 41 },
  tv:           { x: 818, y: 343, w: 207, h: 127 },
  table:          { x: 464, y: 374, w: 618, h: 483 },
  mug:          { x: 544, y: 562, w: 96, h: 88 },
  remote:       { x: 713, y: 601, w: 72, h: 48 },
  books:        { x: 799, y: 582, w: 156, h: 92 },
  cube:         { x: 670, y: 594, w: 56, h: 40 },
  cubeGlow:     { x: 683, y: 593 },
  screen:       { x: 857, y: 369, w: 85, h: 71 },
  rackDisplay:  { x: 491, y: 459, w: 143, h: 11 },
  rackKnobs:    { x: 581, y: 479 },
  recordSleeve: { x: 436, y: 464, w: 45, h: 39 },
  moon:         { x: 849, y: 131, w: 104, h: 82 },
};

// ── TEMP LAYOUT DEBUGGER ──────────────────────────────
// Set to false when the scene layout is locked.
let DEBUG_LAYOUT = false;
let debugTarget = 'hifi';

const debugTargets = [
  'win',
  'hifi',
  'rackDisplay',
  'rackKnobs',
  'recordPlayer',
  'recordSleeve',
  'headphones',
  'tv',
  'screen',
  'chair',
  'lamp',
  'table',
  'mug',
  'remote',
  'books',
  'cube',
  'cubeGlow',
  'moon'
];


const hotspots = [
  { id: 'lamp',   label: 'the lamp',      x: 92,  y: 304, w: 140, h: 236, card: null,     zoom: { s: 1.9,  ax: 0.22, ay: 0.55 } },
  { id: 'hifi',   label: 'the hi-fi',     x: 338, y: 440, w: 390, h: 160, card: 'hifiUi', zoom: { s: 2.1, ax: 0.5, ay: 0.5 } },
  { id: 'tv',     label: 'the television',x: layout.tv.x, y: layout.tv.y, w: layout.tv.w, h: layout.tv.h, card: 'tvUi',   zoom: { s: 2.25, ax: 0.5, ay: 0.5 } },
  { id: 'holo',   label: 'the holocube',  x: 586, y: 488, w: 152, h: 144, card: 'holoUi', zoom: { s: 2.4,  ax: 0.5,  ay: 0.79 } },
  { id: 'window', label: 'the window',    x: layout.win.x, y: layout.win.y, w: layout.win.w, h: layout.win.h, card: 'winUi',  zoom: { s: 1.65, ax: 0.5,  ay: 0.33 } },
];

// ── HOTSPOT SYNC ──────────────────────────────────────
// Keep clickable areas aligned with the live layout object.
// This deliberately preserves the existing hotspot structure, so it does not
// affect asset loading or draw order.
const hotspotLayoutMap = {
  window: 'win',
  hifi: 'rackDisplay',
  tv: 'tv',
  holo: 'cube',
  lamp: 'lamp'
};

function syncHotspotsFromLayout() {
  hotspots.forEach(h => {
    const key = hotspotLayoutMap[h.id];
    const r = key ? layout[key] : null;
    if (!r || r.x == null || r.y == null) return;

    if (r.w != null && r.h != null) {
      h.x = r.x;
      h.y = r.y;
      h.w = r.w;
      h.h = r.h;
    } else {
      // Defensive support for point-style targets.
      h.x = r.x - 24;
      h.y = r.y - 24;
      h.w = 48;
      h.h = 48;
    }
  });
}


const tracks = [
  { title: 'Blue Potion', subtitle: 'Plush Gun', coverHue: '#8ed6ff' },
  { title: 'Tokyo Static', subtitle: 'Hush Radio', coverHue: '#ff94db' },
  { title: 'Hush', subtitle: 'Suite 27', coverHue: '#b1a1ff' }
];

function resize() {
  const sx = innerWidth / RW;
  const sy = innerHeight / RH;
  SCALE = Math.min(sx, sy);
  canvas.style.width = `${RW * SCALE}px`;
  canvas.style.height = `${RH * SCALE}px`;
  applyFocusTransform(true);
}
addEventListener('resize', resize);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { return t * t * (3 - 2 * t); }
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadAssets() {
  assetEntries.forEach(([key, file]) => {
    const img = new Image();
    img.onload = () => {
      loadedAssets += 1;
      UI.loaderTxt.textContent = `LOADING ASSETS… ${loadedAssets}/${assetEntries.length}`;
      if (loadedAssets === assetEntries.length) setTimeout(() => UI.init.classList.add('hide'), 500);
    };
    img.onerror = () => {
      loadedAssets += 1;
      UI.loaderTxt.textContent = `MISSING ${file}`;
      if (loadedAssets === assetEntries.length) setTimeout(() => UI.init.classList.add('hide'), 900);
    };
    img.src = ASSET_DIR + file;
    images[key] = img;
  });
}

function drawImageFit(key, x, y, w, h, opts = {}) {
  const img = images[key];
  if (!img || !img.complete || !img.naturalWidth) return;
  cx.save();
  cx.globalAlpha = opts.alpha ?? 1;
  if (opts.shadow) {
    cx.shadowColor = opts.shadow.color || 'rgba(0,0,0,.35)';
    cx.shadowBlur = opts.shadow.blur || 12;
    cx.shadowOffsetX = opts.shadow.x || 0;
    cx.shadowOffsetY = opts.shadow.y || 6;
  }
  if (opts.rotate) {
    cx.translate(x + w / 2, y + h / 2);
    cx.rotate(opts.rotate);
    cx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    cx.drawImage(img, x, y, w, h);
  }
  cx.restore();
}

function updateClock(dt) {
  if (state.timeCycle) {
    const elapsedMinutes = ((performance.now() - state.cycleAt) / 1000) * 5;
    state.currentMinutes = (state.cycleMinutesBase + elapsedMinutes) % 1440;
  } else if (state.timeMode === 'auto') {
    const now = new Date();
    state.currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  }

  if (state.timeMode === 'day') state.currentMinutes = 13 * 60;
  if (state.timeMode === 'sunset') state.currentMinutes = 18 * 60 + 25;
  if (state.timeMode === 'night') state.currentMinutes = 22 * 60 + 47;

  const h = Math.floor(state.currentMinutes / 60) % 24;
  const m = Math.floor(state.currentMinutes % 60);
  UI.clkTxt.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const hour = state.currentMinutes / 60;
  const day = gaussian(hour, 13, 4.4);
  const sunset = gaussian(hour, 18.4, 1.35) * 1.5;
  const night = Math.max(gaussian(hour, 23.4, 4.0), gaussian(hour, 3.0, 3.2));
  const total = Math.max(0.001, day + sunset + night);
  state.timeBlend.day = day / total;
  state.timeBlend.sunset = sunset / total;
  state.timeBlend.night = night / total;

  const mode = state.timeCycle ? 'CYCLE' : dominantTimeMode().toUpperCase();
  UI.timeTxt.textContent = mode;
  document.querySelectorAll('[data-time]').forEach(el => el.classList.toggle('on', el.dataset.time === (state.timeCycle ? 'cycle' : state.timeMode)));
}

function gaussian(value, peak, width) {
  const d = Math.min(Math.abs(value - peak), 24 - Math.abs(value - peak));
  return Math.exp(-(d * d) / (2 * width * width));
}

function dominantTimeMode() {
  const weights = state.timeBlend;
  return Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
}

function skyPalette() {
  const d = state.timeBlend.day, s = state.timeBlend.sunset, n = state.timeBlend.night;
  const top = mixColor([
    [142, 211, 255, d],
    [208, 122, 171, s],
    [54, 39, 94, n]
  ]);
  const bottom = mixColor([
    [199, 235, 255, d],
    [255, 177, 120, s],
    [18, 12, 35, n]
  ]);
  return { top, bottom };
}

function mixColor(parts) {
  let r = 0, g = 0, b = 0, t = 0;
  parts.forEach(([pr, pg, pb, a]) => { r += pr * a; g += pg * a; b += pb * a; t += a; });
  t = Math.max(t, 0.0001);
  return `rgb(${Math.round(r / t)},${Math.round(g / t)},${Math.round(b / t)})`;
}

function drawBackgroundFallback() {
  const g = cx.createLinearGradient(0, 0, 0, RH);
  g.addColorStop(0, '#130d22');
  g.addColorStop(0.55, '#10081b');
  g.addColorStop(1, '#050309');
  cx.fillStyle = g;
  cx.fillRect(0, 0, RW, RH);
}

function drawRoom() {
  if (images.roomBackplate?.complete && images.roomBackplate.naturalWidth) {
    cx.drawImage(images.roomBackplate, 0, 0, RW, RH);
  } else {
    drawBackgroundFallback();
  }
}

function drawHelicopter(x,y,w,h){
  if(!state.helicopterActive) return;
  const hx=x+state.helicopterX*w;
  const hy=y+state.helicopterY*h;
  const tp=timeProfile();
  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();

  // Searchlight cone
  cx.save();
  cx.translate(hx,hy);
  cx.rotate(state.helicopterAngle);
  const coneLen=h*.55;
  const cone=cx.createLinearGradient(0,0,0,coneLen);
  cone.addColorStop(0,`rgba(255,255,220,${0.18*(tp.night*.8+tp.sunset*.4)})`);
  cone.addColorStop(0.5,`rgba(255,255,200,${0.06*(tp.night*.8+tp.sunset*.4)})`);
  cone.addColorStop(1,'rgba(255,255,200,0)');
  cx.fillStyle=cone;
  cx.beginPath();
  cx.moveTo(-2,0); cx.lineTo(2,0);
  cx.lineTo(coneLen*.35,coneLen); cx.lineTo(-coneLen*.35,coneLen);
  cx.closePath(); cx.fill();
  cx.restore();

  // Body
  cx.fillStyle='rgba(20,15,30,.9)';
  cx.beginPath(); cx.ellipse(hx,hy,8,4,0,0,Math.PI*2); cx.fill();
  // Blinking light
  const blink=Math.sin(state.t*8)>.3?1:0;
  cx.fillStyle=`rgba(255,80,80,${blink*.9})`;
  cx.beginPath(); cx.arc(hx,hy-3,1.5,0,Math.PI*2); cx.fill();
  // Nav light
  cx.fillStyle='rgba(120,220,255,.7)';
  cx.beginPath(); cx.arc(hx+9,hy,1,0,Math.PI*2); cx.fill();

  cx.restore();
}

function drawWindowAnimation(x,y,w,h){
  if(state.winAnim < 0.01) return;
  const a = state.winAnim;
  const ease = a*a*(3-2*a); // smoothstep

  cx.save();
  // Left panel slides left
  const panelW = w * 0.5;
  const slideL = ease * panelW * 0.82;
  const slideR = ease * panelW * 0.82;

  // Draw sliding window panels
  // Left panel
  cx.save();
  cx.beginPath();
  cx.rect(x - slideL, y, panelW, h);
  cx.clip();
  // Window frame
  cx.strokeStyle=`rgba(80,60,120,${0.6*(1-ease*.3)})`;
  cx.lineWidth=3;
  cx.strokeRect(x-slideL+2, y+2, panelW-4, h-4);
  // Glass reflection
  const glassG=cx.createLinearGradient(x-slideL,y,x-slideL+panelW,y+h);
  glassG.addColorStop(0,`rgba(180,200,255,${0.04*(1-ease*.5)})`);
  glassG.addColorStop(0.5,`rgba(255,255,255,${0.02*(1-ease*.5)})`);
  glassG.addColorStop(1,'rgba(180,200,255,0)');
  cx.fillStyle=glassG; cx.fillRect(x-slideL,y,panelW,h);
  cx.restore();

  // Right panel
  cx.save();
  cx.beginPath();
  cx.rect(x+panelW+slideR, y, panelW, h);
  cx.clip();
  cx.strokeStyle=`rgba(80,60,120,${0.6*(1-ease*.3)})`;
  cx.lineWidth=3;
  cx.strokeRect(x+panelW+slideR+2,y+2,panelW-4,h-4);
  const glassG2=cx.createLinearGradient(x+panelW+slideR,y,x+w+slideR,y+h);
  glassG2.addColorStop(0,`rgba(180,200,255,${0.04*(1-ease*.5)})`);
  glassG2.addColorStop(1,'rgba(180,200,255,0)');
  cx.fillStyle=glassG2; cx.fillRect(x+panelW+slideR,y,panelW,h);
  cx.restore();

  // When open: draw wind effect — subtle diagonal streaks entering
  if(ease > 0.5){
    const windA=(ease-0.5)*2;
    cx.save(); cx.globalAlpha=windA*.06;
    cx.strokeStyle='rgba(200,220,255,1)'; cx.lineWidth=1;
    for(let i=0;i<8;i++){
      const wx=x+((state.t*.18+i*.14)%1)*w;
      cx.beginPath();
      cx.moveTo(wx,y); cx.lineTo(wx-30,y+h);
      cx.stroke();
    }
    cx.restore();
  }

  cx.restore();
}

function drawRoomReflection(x,y,w,h){
  const tp=timeProfile();
  if(tp.night<0.3) return; // only visible at night
  const alpha=tp.night*0.06;
  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
  cx.globalCompositeOperation='screen';
  cx.globalAlpha=alpha;
  // Faint warm lamp glow reflected
  const lampG=cx.createRadialGradient(x+w*.14,y+h*.7,0,x+w*.14,y+h*.7,w*.25);
  lampG.addColorStop(0,'rgba(255,200,120,.35)');
  lampG.addColorStop(1,'transparent');
  cx.fillStyle=lampG; cx.fillRect(x,y,w,h);
  // Faint TV glow reflected (when on)
  if(state.tvOn){
    const tvG=cx.createRadialGradient(x+w*.88,y+h*.55,0,x+w*.88,y+h*.55,w*.2);
    tvG.addColorStop(0,'rgba(100,180,255,.3)');
    tvG.addColorStop(1,'transparent');
    cx.fillStyle=tvG; cx.fillRect(x,y,w,h);
  }
  cx.globalCompositeOperation='source-over';
  cx.restore();
}

function drawCondensation(x,y,w,h){
  const glassClosed = 1 - state.winAnim;
  if(glassClosed < 0.05) return;
  if(!(state.weather.rain || state.weather.thunderstorm || state.weather.mist)) return;

  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();

  // Fade mask — condensation pools in the bottom 30% only
  const fadeH = h * 0.32;
  const fadeY = y + h - fadeH;
  const fade = cx.createLinearGradient(0, fadeY - h * 0.08, 0, y + h);
  fade.addColorStop(0, 'transparent');
  fade.addColorStop(0.3, `rgba(170,195,230,${glassClosed * 0.06})`);
  fade.addColorStop(1, `rgba(160,190,225,${glassClosed * 0.13})`);
  cx.fillStyle = fade;
  cx.fillRect(x, fadeY - h * 0.08, w, fadeH + h * 0.08);

  // Individual condensation patches — y biased toward bottom
  cx.globalAlpha = glassClosed * 0.7;
  state.condensation.forEach(c => {
    const px = x + c.x * w;
    const py = fadeY + c.y * fadeH * 0.9; // only in bottom band
    const r = c.r * 14;
    const fog = cx.createRadialGradient(px, py, 0, px, py, r);
    fog.addColorStop(0, `rgba(200,218,245,${c.alpha * 0.28})`);
    fog.addColorStop(0.5, `rgba(180,208,238,${c.alpha * 0.10})`);
    fog.addColorStop(1, 'transparent');
    cx.fillStyle = fog;
    cx.fillRect(px - r, py - r, r * 2, r * 2);
  });

  cx.globalAlpha = 1;
  cx.restore();
}

function drawFogBanks(x,y,w,h,horizon){
  const tp=timeProfile();
  if(tp.day>.8 && !state.weather.mist) return;
  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
  // 3 slow fog layers at different depths
  for(let i=0;i<3;i++){
    const fogY=horizon-h*.05+i*h*.08;
    const drift=(state.t*.006*(i+1))%1;
    const fogA=(0.04+i*.03)*(tp.night*.7+tp.sunset*.5+tp.day*.15)+(state.weather.mist?.12:0);
    const fg=cx.createLinearGradient(0,fogY-20,0,fogY+40);
    fg.addColorStop(0,'transparent');
    fg.addColorStop(0.4,`rgba(${i%2?'120,80,160':'80,100,140'},${fogA})`);
    fg.addColorStop(1,'transparent');
    cx.fillStyle=fg;
    // Offset left/right with drift
    cx.fillRect(x+(drift-.5)*w*.3-20,fogY-20,w*1.3,60);
  }
  cx.restore();
}

function drawWindowView(dt) {
  const {x,y,w,h} = layout.win;
  const horizon = y + h*.72;
  const px = state.parallaxX; // -1..1

  cx.save();
  cx.beginPath();
  cx.rect(x, y, w, h);
  cx.clip();

  // Sky
  drawBlendedWindowSky(x,y,w,h,horizon);

  // Stars + moon drawn BEFORE city PNG so they show through transparent roofline gaps
  const tp = timeProfile();
  const starA = clamp(tp.night-.1,.0,1)*clamp(1-tp.day*2,0,1);
  if(starA>.01){
    cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
    stars.forEach(s=>{
      const sx=x+s.x*w + px*8, sy=y+s.y*(horizon-y);
      if(sx<x||sx>x+w||sy<y||sy>horizon) return;
      const twinkle=.72+.28*Math.sin(state.t*s.twinkleRate+s.twinkle);
      const alpha=s.a*starA*twinkle;
      cx.fillStyle=`rgba(235,240,255,${alpha})`;
      cx.beginPath(); cx.arc(sx,sy,s.r,0,Math.PI*2); cx.fill();
    });
    cx.restore();
  }
  if(starA>.01){
    cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
    const moonA=clamp(starA*1.4,0,1);
    const mx = layout.moon.x + layout.moon.w * 0.5;
    const my = layout.moon.y + layout.moon.h * 0.5;
    const r  = layout.moon.w * 0.5;

    // Soft atmospheric halo behind the moon
    const halo=cx.createRadialGradient(mx,my,r*.4,mx,my,r*2.8);
    halo.addColorStop(0,`rgba(200,215,240,${moonA*.12})`);
    halo.addColorStop(1,'transparent');
    cx.fillStyle=halo; cx.fillRect(mx-r*3,my-r*3,r*6,r*6);

    // Moon asset — 'screen' blend makes black background invisible
    const img=images.moon;
    if(img&&img.complete&&img.naturalWidth){
      cx.globalCompositeOperation='screen';
      cx.globalAlpha=moonA*.95;
      cx.drawImage(img, mx-r, my-r, r*2, r*2);
      cx.globalAlpha=1;
    } else {
      cx.fillStyle=`rgba(220,225,210,${moonA*.88})`;
      cx.beginPath(); cx.arc(mx,my,r,0,Math.PI*2); cx.fill();
    }

    cx.globalCompositeOperation='source-over';
    cx.restore();
  }

  // City PNG asset — drawn over sky, stars show through transparent roofline
  drawCityAsset(x,y,w,h);
  drawCityTimeAtmosphere(x,y,w,h,horizon);
  drawNeonLife(x,y,w,h);
  drawDroneLights(x,y,w,h);

  // Elevated highway
  const roadY = y+h-16;
  cx.fillStyle='rgba(10,6,20,.94)'; cx.fillRect(x,roadY,w,10);
  cx.fillStyle='rgba(255,255,100,.06)'; cx.fillRect(x,roadY+5,w,1);

  // Traffic
  traffic.forEach(t=>{
    t.x=(t.x+t.spd*.001*t.dir+1)%1;
    const laneOff=t.lane?1:3;
    const tx=x+t.x*w;
    for(let i=0;i<t.tail;i++){
      const ttx=tx-i*t.dir*1.8;
      if(ttx<x||ttx>x+w)continue;
      cx.globalAlpha=(1-i/t.tail)*.75;
      cx.fillStyle=t.col;
      cx.fillRect(ttx,roadY+laneOff,1.5,1.5);
    }
    cx.globalAlpha=1;
  });

  // Ground
  const grd=cx.createLinearGradient(0,roadY+10,0,y+h);
  grd.addColorStop(0,'rgba(14,6,28,.95)'); grd.addColorStop(1,'rgba(8,3,16,1)');
  cx.fillStyle=grd; cx.fillRect(x,roadY+10,w,y+h-roadY-10);

  // Wet street reflections
  cx.save(); cx.globalAlpha=.18;
  const refG=cx.createLinearGradient(x+w*.2,roadY+10,x+w*.8,y+h);
  refG.addColorStop(0,'rgba(200,20,255,.4)');
  refG.addColorStop(.5,'rgba(100,80,255,.2)');
  refG.addColorStop(1,'rgba(255,30,180,.3)');
  cx.fillStyle=refG;
  cx.fillRect(x,roadY+10,w,y+h-roadY-10);
  cx.restore();

  // Rain — layered depth system
  if(state.weather.rain || state.weather.thunderstorm) drawRain(x,y,w,h);

  // Snow
  if(state.weather.snow) drawSnow(x,y,w,h);

  // Lightning flash
  if(state.weather.thunderstorm){
    const pulse=.5+.5*Math.sin(state.t*12);
    if(pulse>.8){ cx.fillStyle=`rgba(220,235,255,${(pulse-.8)*1.8})`; cx.fillRect(x,y,w,h); }
  }

  // Glass reflections
  cx.save(); cx.globalAlpha=.07;
  for(let i=0;i<7;i++){
    const gx=x+38+i*50;
    const gg=cx.createLinearGradient(gx,y,gx+12,y+h);
    gg.addColorStop(0,'rgba(255,200,255,.6)');
    gg.addColorStop(.5,'rgba(200,180,255,.3)');
    gg.addColorStop(1,'transparent');
    cx.fillStyle=gg; cx.fillRect(gx,y,2,h);
  }
  cx.restore();

  // Fog banks between building layers
  drawFogBanks(x,y,w,h,horizon);

  // Helicopter with searchlight
  drawHelicopter(x,y,w,h);

  // Lightning full-scene flash
  if(state.lightningFlash>0.01){
    cx.save();
    cx.fillStyle=`rgba(220,235,255,${state.lightningFlash*.85})`;
    cx.fillRect(x,y,w,h);
    cx.restore();
  }

  // Room reflection in glass at night
  drawRoomReflection(x,y,w,h);

  // Glass pane — visible when closed, fades as window opens
  drawWindowGlass(x,y,w,h);

  // Glass rain droplets
  drawGlassRainLayer(x,y,w,h);

  // Condensation patches when window open
  drawCondensation(x,y,w,h);

  // Depth grade
  drawCityDepthGrade(x,y,w,h,horizon);

  // Window open/close animation overlay
  drawWindowAnimation(x,y,w,h);

  cx.restore();
  cx.restore();
}

function drawBlendedWindowSky(x,y,w,h,horizon){
  const tp=timeProfile();
  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
  const top=mixRGB3([92,136,172],[80,44,80],[1,0,8]);
  const mid=mixRGB3([140,176,196],[182,96,88],[18,5,48]);
  const hor=mixRGB3([188,202,198],[245,138,78],[64,12,96]);
  const low=mixRGB3([88,106,118],[112,58,72],[8,3,18]);
  const g=cx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,rgbaFromRGB(top,1));
  g.addColorStop(.45,rgbaFromRGB(mid,1));
  g.addColorStop(.70,rgbaFromRGB(hor,1));
  g.addColorStop(1,rgbaFromRGB(low,1));
  cx.fillStyle=g; cx.fillRect(x,y,w,h);
  if(tp.night>.01){
    const ng=cx.createRadialGradient(x+w*.5,horizon,0,x+w*.5,horizon,w*.65);
    ng.addColorStop(0,`rgba(210,18,255,${(.22*tp.night).toFixed(3)})`);
    ng.addColorStop(.25,`rgba(160,10,200,${(.10*tp.night).toFixed(3)})`);
    ng.addColorStop(.62,`rgba(80,10,160,${(.05*tp.night).toFixed(3)})`);
    ng.addColorStop(1,'transparent');
    cx.globalCompositeOperation='screen';
    cx.fillStyle=ng; cx.fillRect(x,y,w,h);
    // Aurora-style horizon pulse
    const auroraPhase=state.t*.08;
    const auroraA=(.04+.02*Math.sin(auroraPhase))*tp.night;
    const aurora=cx.createLinearGradient(x,horizon-h*.12,x,horizon+h*.08);
    aurora.addColorStop(0,'transparent');
    aurora.addColorStop(0.3,`rgba(${100+50*Math.sin(auroraPhase)},${20+10*Math.cos(auroraPhase)},${200+55*Math.sin(auroraPhase*.7)},${auroraA})`);
    aurora.addColorStop(0.7,`rgba(180,20,255,${auroraA*.6})`);
    aurora.addColorStop(1,'transparent');
    cx.fillStyle=aurora; cx.fillRect(x,y,w,h);
    cx.globalCompositeOperation='source-over';
  }
  cx.restore();
}

function drawCityAsset(x, y, w, h) {
  const img = images.cityNight;
  if (!img || !img.complete || !img.naturalWidth) return;

  // Scale to fill window width, anchor to bottom of window
  const scale = w / img.naturalWidth;
  const dw = w;
  const dh = img.naturalHeight * scale;
  const dx = x + state.parallaxX * -6; // subtle mouse parallax
  const dy = y + h - dh;               // bottom-aligned

  cx.save();
  cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
  cx.drawImage(img, dx, dy, dw, dh);
  cx.restore();
}

function drawMegaCityBackdrop(x,y,w,h,horizon){
  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
  const towers=[
    {px:.08,bw:.07,bh:.58,c:'#070513',top:'spire',neon:'#00e5ff'},
    {px:.19,bw:.10,bh:.48,c:'#0b0718',top:'flat',neon:'#ff40b8'},
    {px:.34,bw:.06,bh:.66,c:'#080615',top:'antenna',neon:'#d081ff'},
    {px:.56,bw:.12,bh:.54,c:'#0b071b',top:'bridge',neon:'#ffab40'},
    {px:.74,bw:.08,bh:.62,c:'#090616',top:'spire',neon:'#70f0ff'},
    {px:.89,bw:.11,bh:.44,c:'#0e081c',top:'flat',neon:'#ff4081'},
  ];
  towers.forEach((t,i)=>{
    const bx=x+t.px*w, bw=t.bw*w, bh=t.bh*h, by=y+h-10-bh;
    const tg=cx.createLinearGradient(bx,by,bx+bw,by+bh);
    tg.addColorStop(0,t.c); tg.addColorStop(.55,'#120820'); tg.addColorStop(1,'#05030b');
    cx.fillStyle=tg; rr(cx,bx,by,bw,bh,3); cx.fill();
    cx.fillStyle='rgba(255,255,255,.035)'; cx.fillRect(bx+2,by,bw*.18,bh);
    for(let yy=by+10;yy<by+bh-6;yy+=12){
      for(let xx=bx+6;xx<bx+bw-4;xx+=10){
        const flick=.55+.45*Math.sin(state.t*.7+i+xx*.02+yy*.03);
        if(((xx+yy+i*13)|0)%4!==0){
          cx.fillStyle=((xx+i)%3===0)?`rgba(140,225,255,${.22*flick})`:`rgba(255,180,230,${.18*flick})`;
          cx.fillRect(xx,yy,2,2);
        }
      }
    }
    cx.strokeStyle=t.neon; cx.globalAlpha=.55+.25*Math.sin(state.t*1.4+i); cx.lineWidth=1;
    if(t.top==='spire'){
      cx.beginPath(); cx.moveTo(bx+bw*.5,by); cx.lineTo(bx+bw*.5,by-26); cx.stroke();
      cx.beginPath(); cx.arc(bx+bw*.5,by-28,2,0,Math.PI*2); cx.fillStyle=t.neon; cx.fill();
    } else if(t.top==='antenna'){
      for(let a=-1;a<=1;a++){cx.beginPath();cx.moveTo(bx+bw*(.5+a*.18),by);cx.lineTo(bx+bw*(.5+a*.18),by-18-a*5);cx.stroke();}
    } else if(t.top==='bridge'){
      cx.beginPath(); cx.moveTo(bx+bw*.15,by+18); cx.lineTo(bx+bw*.85,by+6); cx.stroke();
    } else {
      cx.fillStyle=t.neon; cx.fillRect(bx+bw*.18,by+8,bw*.64,2);
    }
    cx.globalAlpha=1;
  });
  cx.restore();
}

function drawCityTimeAtmosphere(x,y,w,h,horizon){
  const tp=timeProfile();
  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
  if(tp.night>.01){
    cx.globalCompositeOperation='screen';
    const nightFog=cx.createLinearGradient(x,horizon,x,y+h);
    nightFog.addColorStop(0,`rgba(80,10,140,${(.08*tp.night).toFixed(3)})`);
    nightFog.addColorStop(1,`rgba(40,5,80,${(.04*tp.night).toFixed(3)})`);
    cx.fillStyle=nightFog; cx.fillRect(x,y,w,h);
  }
  cx.globalCompositeOperation='source-over';
  cx.restore();
}

// Neon strip positions matched to the city-night.png asset.
// Each entry: x (0-1 across window), yTop, yBot (0-1 down window),
// r,g,b of the neon colour, and a unique phase offset.
const NEON_ANCHORS = [
  { x:0.09, yt:0.12, yb:0.72, r:255, g:140, b: 60, ph:0.00 }, // amber left
  { x:0.19, yt:0.08, yb:0.65, r:255, g: 50, b:200, ph:1.10 }, // magenta
  { x:0.28, yt:0.18, yb:0.60, r:255, g: 60, b:220, ph:2.30 }, // magenta
  { x:0.38, yt:0.14, yb:0.55, r: 60, g:200, b:255, ph:0.80 }, // cyan
  { x:0.48, yt:0.06, yb:0.70, r:255, g: 40, b:200, ph:3.50 }, // magenta tall
  { x:0.54, yt:0.10, yb:0.68, r: 80, g:210, b:255, ph:1.70 }, // cyan
  { x:0.66, yt:0.16, yb:0.58, r:255, g: 55, b:210, ph:2.90 }, // magenta
  { x:0.74, yt:0.12, yb:0.62, r:255, g: 80, b:180, ph:0.40 }, // pink-magenta
  { x:0.83, yt:0.10, yb:0.64, r: 60, g:190, b:255, ph:1.90 }, // cyan right
  { x:0.90, yt:0.18, yb:0.55, r:255, g:150, b: 40, ph:3.10 }, // amber right
];

function drawNeonLife(x, y, w, h) {
  const tp = timeProfile();
  const intensity = 0.12 + tp.sunset * 0.18 + tp.night * 0.55;
  if (intensity < 0.05) return;

  cx.save();
  cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
  cx.globalCompositeOperation = 'lighter';

  NEON_ANCHORS.forEach(n => {
    const t = state.t;
    const breathe = 0.55 + 0.35 * Math.sin(t * 0.38 + n.ph)
                       + 0.10 * Math.sin(t * 1.12 + n.ph * 1.7);
    const flicker = Math.sin(t * 7.4 + n.ph) > 0.91
      ? 0.3 + Math.random() * 0.4
      : 1.0;
    const alpha = breathe * flicker * intensity;

    const nx  = x + n.x * w;
    const ny1 = y + n.yt * h;
    const ny2 = y + n.yb * h;
    const midY = (ny1 + ny2) / 2;
    const stripH = ny2 - ny1;

    const g = cx.createRadialGradient(nx, midY, 0, nx, midY, stripH * 0.55);
    g.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},${(alpha * 0.18).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(${n.r},${n.g},${n.b},${(alpha * 0.07).toFixed(3)})`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(nx - stripH * 0.55, ny1, stripH * 1.1, stripH);

    const core = cx.createLinearGradient(nx - 8, ny1, nx + 8, ny1);
    core.addColorStop(0,   'rgba(0,0,0,0)');
    core.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},${(alpha * 0.22).toFixed(3)})`);
    core.addColorStop(1,   'rgba(0,0,0,0)');
    cx.fillStyle = core;
    cx.fillRect(nx - 8, ny1, 16, stripH);
  });

  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'source-over';
  cx.restore();
}

function drawDroneLights(x, y, w, h) {
  const tp = timeProfile();
  const neon = 0.18 + tp.sunset * 0.45 + tp.night * 1.0;
  cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
  droneLights.forEach(d => {
    const dx = x + d.x * w, dy = y + d.y * h + Math.sin(state.t * 0.7 + d.phase) * 4;
    cx.save(); cx.globalCompositeOperation = 'lighter';
    const blink = 0.45 + Math.max(0, Math.sin(state.t * 3.2 + d.phase)) * 0.55;
    cx.fillStyle = d.colour; cx.globalAlpha = blink * (0.3 + 0.7 * neon);
    cx.beginPath(); cx.arc(dx, dy, d.size, 0, Math.PI * 2); cx.fill();
    cx.globalAlpha *= 0.22; cx.fillRect(dx - 18, dy, 36, 1);
    cx.restore();
  });
  cx.restore();
}

function drawSnow(x, y, w, h) {
  const tp = timeProfile();
  cx.save();
  cx.beginPath(); cx.rect(x, y, w, h); cx.clip();

  const nr = Math.round(228 + tp.sunset * 12);
  const ng = Math.round(238 + tp.sunset * 8);
  const col = `${nr},${ng},255`;

  const glows = [0, 3, 7];
  snowFlakes.forEach((layer, li) => {
    cx.save();
    cx.shadowColor = `rgba(${col},0.85)`;
    cx.shadowBlur  = glows[li];
    cx.fillStyle   = `rgba(${col},1)`;
    layer.forEach(f => {
      const fx = x + f.x * w + Math.sin(state.t * f.phaseSpd + f.phase) * f.wobble * w;
      const fy = y + f.y * h;
      if (fy < y - 4 || fy > y + h + 4) return;
      cx.globalAlpha = f.alpha;
      cx.beginPath();
      cx.arc(fx, fy, f.r, 0, Math.PI * 2);
      cx.fill();
    });
    cx.restore();
  });

  // Soft snow drift at the sill
  const driftA = 0.10 + tp.night * 0.07;
  const drift = cx.createLinearGradient(0, y + h * 0.88, 0, y + h);
  drift.addColorStop(0, 'transparent');
  drift.addColorStop(0.6, `rgba(${col},${driftA * 0.5})`);
  drift.addColorStop(1,   `rgba(${col},${driftA})`);
  cx.globalAlpha = 1;
  cx.fillStyle = drift;
  cx.fillRect(x, y + h * 0.88, w, h * 0.12);

  cx.restore();
}

function drawWindowGlass(x,y,w,h){
  const glassClosed = 1 - state.winAnim;
  if(glassClosed < 0.01) return;

  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();

  // Base glass tint — cool blue-grey transparency
  cx.globalAlpha = glassClosed * 0.13;
  cx.fillStyle = 'rgba(160,190,230,1)';
  cx.fillRect(x,y,w,h);

  // Subtle darkening toward edges (glass thickness effect)
  cx.globalAlpha = glassClosed * 0.10;
  const edge = cx.createRadialGradient(x+w*.5,y+h*.5,h*.2,x+w*.5,y+h*.5,h*.8);
  edge.addColorStop(0,'transparent');
  edge.addColorStop(1,'rgba(10,8,24,1)');
  cx.fillStyle=edge; cx.fillRect(x,y,w,h);

  // Diagonal highlight — light catching the pane
  cx.globalAlpha = glassClosed * 0.06;
  const sheen = cx.createLinearGradient(x,y,x+w*.6,y+h);
  sheen.addColorStop(0,'rgba(255,255,255,1)');
  sheen.addColorStop(0.4,'rgba(200,220,255,0.4)');
  sheen.addColorStop(1,'transparent');
  cx.fillStyle=sheen; cx.fillRect(x,y,w,h);

  // Thin bright edge along top — reflected ceiling neon
  cx.globalAlpha = glassClosed * 0.18;
  const topEdge = cx.createLinearGradient(x,y,x,y+h*.06);
  topEdge.addColorStop(0,'rgba(180,120,255,0.9)');
  topEdge.addColorStop(1,'transparent');
  cx.fillStyle=topEdge; cx.fillRect(x,y,w,h*.06);

  cx.globalAlpha=1;
  cx.restore();
}

function drawRain(x, y, w, h) {
  cx.save();
  cx.beginPath(); cx.rect(x, y, w, h); cx.clip();

  const storm = state.weather.thunderstorm;
  const intensityMul = storm ? 1.35 : 1.0;
  // Wind angle: slight natural lean plus slow gust oscillation
  const windAngle = windX + Math.sin(state.t * 0.11) * 0.022;

  rainLayers.forEach((layer, li) => {
    const lineW = li === 0 ? 0.55 : li === 1 ? 0.85 : 1.1;
    const col = li === 0
      ? [170, 205, 245] // far — cool grey-blue
      : li === 1
      ? [190, 220, 255] // mid — brighter blue-white
      : [220, 235, 255]; // near — almost white

    layer.forEach(d => {
      const px = x + d.x * w;
      const py = y + d.y * h;

      // Streak end point — angled by wind
      const ex = px + windAngle * d.len * 3;
      const ey = py + d.len;

      if (py > y + h + 10 || py < y - d.len) return;

      const alpha = d.alpha * intensityMul;

      // Gradient: faint head → bright core (1/3 down) → transparent tail
      const g = cx.createLinearGradient(px, py, ex, ey);
      g.addColorStop(0,   `rgba(${col},${alpha * 0.1})`);
      g.addColorStop(0.2, `rgba(${col},${alpha * 0.85})`);
      g.addColorStop(0.6, `rgba(${col},${alpha * 0.55})`);
      g.addColorStop(1,   `rgba(${col},0)`);

      cx.strokeStyle = g;
      cx.lineWidth = lineW;
      cx.globalAlpha = 1;
      cx.beginPath();
      cx.moveTo(px, py);
      cx.lineTo(ex, ey);
      cx.stroke();

      // Tiny splash at bottom of near-layer drops that hit the sill
      if (li === 2 && py + d.len > y + h * 0.92 && py + d.len < y + h + 4) {
        cx.globalAlpha = alpha * 0.4;
        cx.strokeStyle = `rgba(${col},1)`;
        cx.lineWidth = 0.6;
        for (let s = 0; s < 3; s++) {
          const ang = -Math.PI * 0.15 + s * Math.PI * 0.15;
          cx.beginPath();
          cx.moveTo(ex, ey);
          cx.lineTo(ex + Math.cos(ang) * 4, ey + Math.sin(ang) * 3);
          cx.stroke();
        }
      }
    });
  });

  cx.globalAlpha = 1;
  cx.restore();
}

function drawGlassRainLayer(x,y,w,h){
  if(!(state.weather.rain||state.weather.thunderstorm)) return;
  const glassClosed = 1 - state.winAnim;
  if(glassClosed < 0.05) return; // no glass to stick to when open
  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
  cx.globalAlpha = glassClosed;
  glassDroplets.forEach(d=>{
    const px=x+d.x*w+Math.sin(state.t*.8+d.wobble)*2;
    const py=y+d.y*h;
    const len=d.len*(state.weather.thunderstorm?1.25:1);
    const g=cx.createLinearGradient(px,py,px-3,py+len);
    g.addColorStop(0,`rgba(230,240,255,${d.alpha*.25})`);
    g.addColorStop(0.35,`rgba(180,210,255,${d.alpha})`);
    g.addColorStop(1,'rgba(180,210,255,0)');
    cx.strokeStyle=g; cx.lineWidth=1;
    cx.beginPath(); cx.moveTo(px,py);
    cx.quadraticCurveTo(px+Math.sin(d.wobble)*2,py+len*.45,px-2,py+len);
    cx.stroke();
  });
  cx.globalAlpha=1;
  cx.restore();
}

function drawCityDepthGrade(x,y,w,h,horizon){
  const tp=timeProfile();
  cx.save(); cx.beginPath(); cx.rect(x,y,w,h); cx.clip();
  const base=cx.createLinearGradient(0,horizon-h*.18,0,y+h);
  base.addColorStop(0,'rgba(255,255,255,0)');
  base.addColorStop(0.55,`rgba(120,70,160,${0.06+tp.sunset*.06+tp.night*.12})`);
  base.addColorStop(1,`rgba(8,4,18,${0.22+tp.night*.18})`);
  cx.fillStyle=base; cx.fillRect(x,y,w,h);
  cx.globalCompositeOperation='screen';
  const bloom=cx.createRadialGradient(x+w*.5,horizon+h*.1,0,x+w*.5,horizon+h*.1,w*.7);
  bloom.addColorStop(0,`rgba(190,60,255,${0.08*tp.night+0.05*tp.sunset})`);
  bloom.addColorStop(0.45,`rgba(80,180,255,${0.04*tp.night+0.03*tp.sunset})`);
  bloom.addColorStop(1,'transparent');
  cx.fillStyle=bloom; cx.fillRect(x,y,w,h);
  cx.globalCompositeOperation='source-over';
  cx.restore();
}

function drawForegroundFrame() {
  const t = Date.now() / 1000;
  const pulse = 0.94 + Math.sin(t * 1.4) * 0.06;

  const { x, y, w, h } = layout.win;
  const left = x;
  const right = x + w;
  const top = y;
  const bottom = y + h;

  const sideOffset = 10;
  const sideBloomW = 9;
  const sideCoreW = 2;
  const topGlowH = 12;
  const sillH = 3;

  function drawSideLight(xPos) {
    const y0 = top - 2;
    const lightH = h + 4;
    cx.save();

    const bloom = cx.createLinearGradient(xPos - sideBloomW, 0, xPos + sideBloomW, 0);
    bloom.addColorStop(0, 'rgba(255,255,255,0)');
    bloom.addColorStop(0.25, `rgba(170,90,255,${0.10 * pulse})`);
    bloom.addColorStop(0.5, `rgba(215,145,255,${0.18 * pulse})`);
    bloom.addColorStop(0.75, `rgba(170,90,255,${0.10 * pulse})`);
    bloom.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = bloom;
    cx.fillRect(xPos - sideBloomW, y0, sideBloomW * 2, lightH);

    cx.globalCompositeOperation = 'screen';
    cx.fillStyle = `rgba(205,140,255,${0.22 * pulse})`;
    cx.fillRect(xPos - sideCoreW / 2, y0, sideCoreW, lightH);

    const vg = cx.createLinearGradient(0, y0, 0, y0 + lightH);
    vg.addColorStop(0, 'rgba(255,255,255,0)');
    vg.addColorStop(0.08, `rgba(255,255,255,${0.65 * pulse})`);
    vg.addColorStop(0.5, `rgba(255,255,255,${1.0 * pulse})`);
    vg.addColorStop(0.92, `rgba(255,255,255,${0.65 * pulse})`);
    vg.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = vg;
    cx.globalAlpha = 0.18 * pulse;
    cx.fillRect(xPos, y0, 1, lightH);

    cx.restore();
  }

  drawSideLight(left - sideOffset);
  drawSideLight(right + sideOffset);

  cx.save();
  const tg = cx.createLinearGradient(0, top - topGlowH / 2, 0, top + topGlowH);
  tg.addColorStop(0, 'rgba(255,255,255,0)');
  tg.addColorStop(0.45, `rgba(190,95,255,${0.18 * pulse})`);
  tg.addColorStop(0.75, `rgba(235,165,255,${0.28 * pulse})`);
  tg.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = tg;
  cx.fillRect(left, top - topGlowH / 2, w, topGlowH);
  cx.restore();

  cx.save();
  const bg = cx.createLinearGradient(0, bottom - sillH, 0, bottom + sillH);
  bg.addColorStop(0, 'rgba(255,255,255,0)');
  bg.addColorStop(0.5, `rgba(190,100,255,${0.22 * pulse})`);
  bg.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = bg;
  cx.fillRect(left, bottom - sillH / 2, w, sillH);
  cx.restore();
}

// Miniature scrolling city silhouette — used by TV screen channels 1 & 3.
// Args: x,y,w,h  bounding rect | offset  horizontal scroll (px) | heightScale  0‥1
//       hMult  building height multiplier | alpha | col  fill colour
function drawCityLayer(x, y, w, h, offset, heightScale, hMult, alpha, col) {
  cx.save();
  cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
  cx.globalAlpha = alpha;
  cx.fillStyle = col;
  // deterministic building widths & heights from integer index
  const tileW = 14 * heightScale + 6;
  const totalTiles = Math.ceil(w / tileW) + 2;
  const scroll = offset % (totalTiles * tileW);
  for (let i = -1; i < totalTiles; i++) {
    const idx = ((i * 2654435761) >>> 0) & 0xFF; // cheap hash
    const bh  = (idx / 255) * hMult * h + h * 0.08;
    const bw  = tileW * (0.55 + (((idx * 6364136223) >>> 0) & 0xFF) / 510);
    const bx  = x + i * tileW - scroll;
    cx.fillRect(bx, y + h - bh, bw - 1, bh);
    // tiny window dots on taller buildings
    if (bh > h * 0.35 && alpha > 0.4) {
      cx.save();
      cx.globalAlpha = alpha * 0.55;
      cx.fillStyle = idx % 3 === 0 ? 'rgba(140,220,255,.9)' : 'rgba(255,200,140,.9)';
      for (let wy = y + h - bh + 4; wy < y + h - 6; wy += 5) {
        for (let wx = bx + 2; wx < bx + bw - 3; wx += 5) {
          if (((wx + wy) | 0) % 7 !== 0) cx.fillRect(wx, wy, 1.5, 1.5);
        }
      }
      cx.restore();
    }
  }
  cx.restore();
}


function drawDebugLayout() {
  if (!DEBUG_LAYOUT) return;

  const target = layout[debugTarget];
  if (!target) return;

  cx.save();

  debugTargets.forEach(name => {
    const r = layout[name];
    if (!r || r.x == null || r.y == null) return;

    const hasSize = r.w != null && r.h != null;

    cx.strokeStyle = name === debugTarget
      ? 'rgba(255,255,120,.96)'
      : 'rgba(120,220,255,.28)';

    cx.fillStyle = name === debugTarget
      ? 'rgba(255,255,120,.14)'
      : 'rgba(120,220,255,.05)';

    cx.lineWidth = name === debugTarget ? 2 : 1;
    cx.setLineDash(name === debugTarget ? [] : [6, 5]);

    if (hasSize) {
      cx.strokeRect(r.x, r.y, r.w, r.h);
      cx.fillRect(r.x, r.y, r.w, r.h);
      cx.font = '12px monospace';
      cx.fillStyle = name === debugTarget
        ? 'rgba(255,255,120,.96)'
        : 'rgba(160,220,255,.62)';
      cx.fillText(name, r.x + 4, r.y - 6);
    } else {
      cx.beginPath();
      cx.arc(r.x, r.y, name === debugTarget ? 8 : 5, 0, Math.PI * 2);
      cx.stroke();
      cx.font = '12px monospace';
      cx.fillStyle = name === debugTarget
        ? 'rgba(255,255,120,.96)'
        : 'rgba(160,220,255,.62)';
      cx.fillText(name, r.x + 10, r.y - 8);
    }
  });

  // Draw hotspot zones in magenta so they're visually distinct from layout boxes
  syncHotspotsFromLayout();
  hotspots.forEach(h => {
    cx.strokeStyle = 'rgba(255,80,220,.9)';
    cx.fillStyle   = 'rgba(255,80,220,.08)';
    cx.lineWidth   = 1.5;
    cx.setLineDash([3, 3]);
    cx.strokeRect(h.x, h.y, h.w, h.h);
    cx.fillRect(h.x, h.y, h.w, h.h);
    cx.font = '11px monospace';
    cx.fillStyle = 'rgba(255,160,240,.9)';
    const area = Math.round(h.w * h.h / 1000);
    cx.fillText(`⬡ ${h.id} (${area}k)`, h.x + 4, h.y + 14);
  });

  cx.setLineDash([]);
  cx.fillStyle = 'rgba(0,0,0,.76)';
  cx.fillRect(22, 22, 660, 92);

  cx.font = '14px monospace';
  cx.fillStyle = '#dff6ff';

  const val = layout[debugTarget];
  const text = val.w == null
    ? `${debugTarget}: { x: ${Math.round(val.x)}, y: ${Math.round(val.y)} },`
    : `${debugTarget}: { x: ${Math.round(val.x)}, y: ${Math.round(val.y)}, w: ${Math.round(val.w)}, h: ${Math.round(val.h)} },`;

  cx.fillText(`DEBUG TARGET: ${debugTarget}`, 40, 50);
  cx.fillText(text, 40, 74);
  cx.fillText('` toggle  |  TAB target  |  arrows move  |  SHIFT+arrows resize  |  ALT = 10px  |  C copy', 40, 98);

  cx.restore();
}

function drawLamp() {
  drawImageFit('lamp', layout.lamp.x, layout.lamp.y, layout.lamp.w, layout.lamp.h, { shadow: { blur: 18, y: 8, color: 'rgba(0,0,0,.35)' } });
  if (!state.lampOn) return;
  const p = 0.92 + Math.sin(state.t * 11.5) * 0.035;
  const { x, y, w, h } = layout.lamp;
  cx.save();
  const cone = cx.createLinearGradient(x + w * 0.52, y + 18, x + w * 1.4, y + 118);
  cone.addColorStop(0, `rgba(255,214,150,${0.22 * p})`);
  cone.addColorStop(1, 'rgba(255,214,150,0)');
  cx.fillStyle = cone;
  cx.beginPath();
  cx.moveTo(x + w * 0.43, y + 17);
  cx.lineTo(x + w * 1.55, y + 88);
  cx.lineTo(x + w * 1.15, y + 105);
  cx.lineTo(x + w * 0.56, y + 39);
  cx.closePath();
  cx.fill();
  const pool = cx.createRadialGradient(x + 44, y + 104, 4, x + 44, y + 104, 35);
  pool.addColorStop(0, `rgba(255,204,132,${0.18 * p})`);
  pool.addColorStop(1, 'transparent');
  cx.fillStyle = pool;
  cx.fillRect(x + 10, y + 68, 80, 58);
  cx.restore();
}

function drawHifiRack() {
  drawImageFit('hifiRack', layout.hifi.x, layout.hifi.y, layout.hifi.w, layout.hifi.h, { shadow: { blur: 18, y: 10, color: 'rgba(0,0,0,.35)' } });

  const tr = tracks[state.musicTrack % tracks.length];
  const disp = layout.rackDisplay;
  cx.save();
  rr(cx, disp.x, disp.y, disp.w, disp.h, 2);
  cx.clip();
  const g = cx.createLinearGradient(disp.x, disp.y, disp.x + disp.w, disp.y);
  g.addColorStop(0, 'rgba(90,210,255,.18)');
  g.addColorStop(0.55, 'rgba(20,25,40,.22)');
  g.addColorStop(1, 'rgba(199,108,255,.18)');
  cx.fillStyle = g;
  cx.fillRect(disp.x, disp.y, disp.w, disp.h);
  cx.font = '8px sans-serif';
  cx.fillStyle = '#a7e4ff';
  cx.fillText(tr.title, disp.x + 6, disp.y + 9);
  cx.fillStyle = '#d593ff';
  cx.fillText(state.musicSource.toUpperCase(), disp.x + disp.w - 42, disp.y + 9);
  cx.restore();

  cx.fillStyle = 'rgba(98,198,255,.12)';
  cx.fillRect(disp.x, disp.y, 24, disp.h);

  for (let i = 0; i < 3; i++) {
    const kx = layout.rackKnobs.x + i * 18;
    const ky = layout.rackKnobs.y;
    const kg = cx.createRadialGradient(kx - 1, ky - 1, 1, kx, ky, 6);
    kg.addColorStop(0, '#a77b5f');
    kg.addColorStop(0.55, '#4d2d1b');
    kg.addColorStop(1, '#190d09');
    cx.fillStyle = kg;
    cx.beginPath();
    cx.arc(kx, ky, 5.5, 0, Math.PI * 2);
    cx.fill();
    cx.strokeStyle = 'rgba(255,220,178,.35)';
    cx.stroke();
  }
}

function drawRecordPlayer() {
  drawImageFit('recordPlayer', layout.recordPlayer.x, layout.recordPlayer.y, layout.recordPlayer.w, layout.recordPlayer.h, { shadow: { blur: 12, y: 6, color: 'rgba(0,0,0,.28)' } });

  const sleeve = layout.recordSleeve;
  cx.save();
  cx.translate(sleeve.x + sleeve.w / 2, sleeve.y + sleeve.h / 2);
  cx.rotate(-0.06);
  cx.fillStyle = '#09080e';
  cx.fillRect(-sleeve.w / 2, -sleeve.h / 2, sleeve.w, sleeve.h);
  const tr = tracks[state.musicTrack % tracks.length];
  const sg = cx.createLinearGradient(-sleeve.w / 2, 0, sleeve.w / 2, 0);
  sg.addColorStop(0, tr.coverHue);
  sg.addColorStop(1, 'rgba(255,255,255,.08)');
  cx.fillStyle = sg;
  cx.fillRect(-sleeve.w / 2 + 5, -sleeve.h / 2 + 6, sleeve.w - 10, sleeve.h - 12);
  cx.fillStyle = 'rgba(10,8,16,.72)';
  cx.fillRect(-sleeve.w / 2 + 7, -sleeve.h / 2 + 8, sleeve.w - 14, sleeve.h - 16);
  cx.fillStyle = tr.coverHue;
  cx.fillRect(-sleeve.w / 2 + 10, sleeve.h / 2 - 16, sleeve.w - 20, 2);
  cx.font = '7px sans-serif';
  cx.fillStyle = '#d9ecff';
  cx.fillText('HUSH', -sleeve.w / 2 + 10, sleeve.h / 2 - 21);
  cx.restore();
}

function drawTV() {
  const s = layout.screen;

  // 1. TV cabinet PNG first — screen content will paint over it
  drawImageFit('tv', layout.tv.x, layout.tv.y, layout.tv.w, layout.tv.h, { shadow: { blur: 15, y: 9, color: 'rgba(0,0,0,.35)' } });

  // 2. Screen content on top, clipped to screen rect
  cx.save();
  rr(cx, s.x, s.y, s.w, s.h, 4);
  cx.clip();
  drawTvScreenContent(s.x, s.y, s.w, s.h);
  cx.restore();

  // 3. Screen glow spill onto room
  if (state.tvOn) {
    const col = state.tvCh === 0 ? '100,140,255' : '160,100,255';
    const g = cx.createRadialGradient(s.x + s.w * 0.5, s.y + s.h * 0.5, 4, s.x + s.w * 0.5, s.y + s.h * 2, 100);
    g.addColorStop(0, `rgba(${col},.10)`);
    g.addColorStop(1, 'transparent');
    cx.fillStyle = g;
    cx.fillRect(s.x - 60, s.y - 20, s.w + 120, s.h + 120);
  }
}

function drawTvScreenContent(x, y, w, h) {
  cx.fillStyle = '#020306';
  cx.fillRect(x, y, w, h);
  if (!state.tvOn) return;

  const t = state.t;

  if (state.tvCh === 0) {
    // ── AMBIENT ─────────────────────────────────────────
    // Deep blue-purple gradient that slowly breathes
    const breathe = 0.5 + Math.sin(t * 0.4) * 0.5;
    const g = cx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, `rgba(${20 + breathe * 8|0},${30 + breathe * 12|0},${80 + breathe * 30|0},1)`);
    g.addColorStop(0.6, `rgba(${10 + breathe * 6|0},${15 + breathe * 8|0},${55 + breathe * 20|0},1)`);
    g.addColorStop(1, `rgba(8,10,28,1)`);
    cx.fillStyle = g;
    cx.fillRect(x, y, w, h);

    // Slow drifting orbs
    const orbs = [
      { px: 0.3, py: 0.4, r: 18, sp: 0.18, col: '90,140,255' },
      { px: 0.65, py: 0.55, r: 13, sp: 0.27, col: '160,80,255' },
      { px: 0.5, py: 0.3, r: 10, sp: 0.11, col: '80,200,220' },
    ];
    orbs.forEach(o => {
      const ox = x + w * (o.px + Math.sin(t * o.sp) * 0.12);
      const oy = y + h * (o.py + Math.cos(t * o.sp * 0.7) * 0.1);
      const rg = cx.createRadialGradient(ox, oy, 0, ox, oy, o.r * (1 + breathe * 0.3));
      rg.addColorStop(0, `rgba(${o.col},${0.35 + breathe * 0.15})`);
      rg.addColorStop(1, 'transparent');
      cx.fillStyle = rg;
      cx.beginPath(); cx.arc(ox, oy, o.r * 2, 0, Math.PI * 2); cx.fill();
    });

    // Subtle horizontal scan lines
    cx.save(); cx.globalAlpha = 0.06;
    for (let i = 0; i < h; i += 2) { cx.fillStyle = '#fff'; cx.fillRect(x, y + i, w, 1); }
    cx.restore();

    // Slow waveform at bottom
    cx.save(); cx.globalAlpha = 0.22;
    cx.strokeStyle = `rgba(100,160,255,0.8)`;
    cx.lineWidth = 1;
    cx.beginPath();
    for (let i = 0; i <= w; i += 2) {
      const wy = y + h * 0.82 + Math.sin(i * 0.08 + t * 0.6) * 5 + Math.sin(i * 0.03 + t * 0.3) * 8;
      i === 0 ? cx.moveTo(x + i, wy) : cx.lineTo(x + i, wy);
    }
    cx.stroke(); cx.restore();

  } else {
    // ── ANIME — real video ───────────────────────────────
    if (animeVideo.readyState >= 2) {
      cx.drawImage(animeVideo, x, y, w, h);
    } else {
      // Fallback while video buffering
      cx.fillStyle = '#0d0818';
      cx.fillRect(x, y, w, h);
      cx.font = `${Math.max(6, w * 0.07)}px monospace`;
      cx.fillStyle = 'rgba(200,160,255,0.4)';
      cx.fillText('loading…', x + w * 0.32, y + h * 0.54);
    }
  }

  // CRT scanlines over everything
  cx.save(); cx.globalAlpha = 0.13;
  cx.fillStyle = '#000';
  for (let i = 0; i < h; i += 2) cx.fillRect(x, y + i, w, 1);
  cx.restore();
}

function drawTableAndProps() {
  drawImageFit('table', layout.table.x, layout.table.y, layout.table.w, layout.table.h, { shadow: { blur: 22, y: 12, color: 'rgba(0,0,0,.4)' } });
  drawImageFit('mug', layout.mug.x, layout.mug.y, layout.mug.w, layout.mug.h, { shadow: { blur: 8, y: 4, color: 'rgba(0,0,0,.22)' } });
  drawImageFit('remote', layout.remote.x, layout.remote.y, layout.remote.w, layout.remote.h, { shadow: { blur: 8, y: 4, color: 'rgba(0,0,0,.20)' } });
  drawImageFit('books', layout.books.x, layout.books.y, layout.books.w, layout.books.h, { shadow: { blur: 8, y: 4, color: 'rgba(0,0,0,.22)' } });
}

function drawChair() {
  drawImageFit('chair', layout.chair.x, layout.chair.y, layout.chair.w, layout.chair.h, { shadow: { blur: 16, y: 10, color: 'rgba(0,0,0,.38)' } });
}

function drawHeadphones() {
  drawImageFit('headphones', layout.headphones.x, layout.headphones.y, layout.headphones.w, layout.headphones.h, { shadow: { blur: 8, y: 4, color: 'rgba(0,0,0,.18)' } });
}

function drawCube() {
  drawImageFit('cubeBase', layout.cube.x - 12, layout.cube.y + 11, 50, 32, { shadow: { blur: 10, y: 5, color: 'rgba(0,0,0,.25)' } });
  const cx0 = layout.cubeGlow.x;
  const cy0 = layout.cubeGlow.y + Math.sin(state.t * 1.8) * 1.7;
  state.holoPulse = Math.max(0, state.holoPulse - 0.02);
  const alpha = 0.5 + Math.sin(state.t * 2.5) * 0.08 + state.holoPulse * 0.25;
  cx.save();
  cx.translate(cx0, cy0);
  cx.strokeStyle = `rgba(190,160,255,${alpha})`;
  cx.fillStyle = `rgba(190,160,255,${0.08 + state.holoPulse * 0.09})`;
  cx.lineWidth = 1.1;
  const s = 10 + state.holoPulse * 3;
  const rot = state.t * 0.7;
  const pts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([px, py, pz]) => {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const rx = px * cr - pz * sr;
    const rz = px * sr + pz * cr;
    const scale = 1 / (1 + rz * 0.22);
    return { x: rx * s * scale, y: py * s * 0.72 * scale };
  });
  [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => {
    cx.beginPath();
    cx.moveTo(pts[a].x, pts[a].y);
    cx.lineTo(pts[b].x, pts[b].y);
    cx.stroke();
  });
  cx.restore();

  const glow = cx.createRadialGradient(cx0, cy0 + 16, 2, cx0, cy0 + 16, 42);
  glow.addColorStop(0, `rgba(150,110,255,${0.16 + state.holoPulse * 0.1})`);
  glow.addColorStop(1, 'transparent');
  cx.fillStyle = glow;
  cx.fillRect(cx0 - 42, cy0 - 4, 84, 62);
}

function drawAtmosphere() {
  const day = state.timeBlend.day, sunset = state.timeBlend.sunset, night = state.timeBlend.night;
  const g = cx.createLinearGradient(0, 0, 0, RH);
  g.addColorStop(0, `rgba(180,210,255,${0.10 * day})`);
  g.addColorStop(0.5, `rgba(192,124,255,${0.09 * sunset + 0.04 * night})`);
  g.addColorStop(1, `rgba(30,12,58,${0.14 * night})`);
  cx.fillStyle = g;
  cx.fillRect(0, 0, RW, RH);

  if (state.weather.mist) {
    cx.fillStyle = 'rgba(255,255,255,.05)';
    cx.fillRect(0, RH * 0.33, RW, RH * 0.28);
  }
}

function drawReactiveLighting() {
  if (state.musicOn) {
    const g = cx.createRadialGradient(520, 396, 4, 520, 396, 280);
    g.addColorStop(0, 'rgba(255,185,120,.06)');
    g.addColorStop(1, 'transparent');
    cx.fillStyle = g;
    cx.fillRect(240, 260, 560, 320);
  }
}

function drawFocusHighlight() {
  syncHotspotsFromLayout();
  if (!state.hover) return;
  const h = hotspots.find(s => s.id === state.hover.id);
  if (!h) return;
  cx.save();
  cx.strokeStyle = 'rgba(180,230,255,.18)';
  cx.setLineDash([4, 4]);
  rr(cx, h.x, h.y, h.w, h.h, 6);
  cx.stroke();
  cx.restore();
}

function updateParticles(dt) {
  // main city is static; TV miniature city scrolls slowly
  state.cityOffset += dt * 10;

  // Smooth parallax
  state.parallaxX += (state.mx - state.parallaxX) * dt * 3;
  state.parallaxY += (state.my - state.parallaxY) * dt * 3;

  // Window open/close animation
  const winTarget = state.winOpen ? 1 : 0;
  state.winAnim += (winTarget - state.winAnim) * dt * 2.5;

  // Lightning — Poisson events during thunderstorm
  if (state.weather.thunderstorm) {
    state.lightningNext -= dt;
    if (state.lightningNext <= 0) {
      state.lightningFlash = 1;
      state.lightningNext = 4 + Math.random() * 18;
    }
  }
  state.lightningFlash = Math.max(0, state.lightningFlash - dt * 6);

  // Helicopter — rare Poisson event
  state.helicopterNext -= dt;
  if (state.helicopterNext <= 0 && !state.helicopterActive) {
    state.helicopterActive = true;
    state.helicopterX = -0.15;
    state.helicopterY = 0.08 + Math.random() * 0.28;
    state.helicopterNext = 40 + Math.random() * 80;
  }
  if (state.helicopterActive) {
    state.helicopterX += dt * 0.045;
    state.helicopterAngle = Math.sin(state.t * 0.8) * 0.3;
    if (state.helicopterX > 1.15) state.helicopterActive = false;
  }

  // Condensation patches
  state.condensation.forEach(c => {
    c.next -= dt;
    if (c.next <= 0 && !c.clearing) { c.clearing = true; c.next = 8 + Math.random() * 20; }
    if (c.clearing) {
      c.r -= dt * 4;
      if (c.r <= 0) {
        c.r = 8 + Math.random() * 24; c.x = Math.random(); c.y = Math.random();
        c.alpha = 0.12 + Math.random() * 0.18; c.clearing = false; c.next = 15 + Math.random() * 40;
      }
    }
  });

  // Rain layers — update positions and wind
  if (state.weather.rain || state.weather.thunderstorm) {
    // Slowly shifting wind gusts
    windX += (Math.sin(state.t * 0.07) * 0.055 - windX) * dt * 0.3;
    const windAngle = windX + Math.sin(state.t * 0.11) * 0.022;
    const storm = state.weather.thunderstorm;
    rainLayers.forEach((layer, li) => {
      const speedMul = storm ? 1.3 : 1.0;
      layer.forEach(d => {
        d.y += d.vy * dt * speedMul;
        d.x += windAngle * d.vy * dt * speedMul * 0.5;
        if (d.y > 1.06) { d.y = -0.06; d.x = Math.random(); }
        if (d.x > 1.05) d.x -= 1.1;
        if (d.x < -0.05) d.x += 1.1;
      });
    });
  }

  // Snow layers — gentle layered drift
  if (state.weather.snow) {
    snowFlakes.forEach((layer, li) => {
      const speedMul = [0.55, 0.75, 1.0][li];
      layer.forEach(f => {
        f.y += f.vy * dt * speedMul;
        // Wind nudge (much gentler than rain)
        f.x += windX * f.vy * dt * speedMul * 0.25;
        if (f.y > 1.06) { f.y = -0.06; f.x = Math.random(); }
        if (f.x > 1.05) f.x -= 1.1;
        if (f.x < -0.05) f.x += 1.1;
      });
    });
  }
  droneLights.forEach(d => {
    d.x += d.speed * dt;
    if (d.x > 1.08) { d.x = -0.08; d.y = 0.08 + Math.random() * 0.34; d.speed = 0.006 + Math.random() * 0.012; }
  });
  glassDroplets.forEach(d => {
    if (!(state.weather.rain || state.weather.thunderstorm)) return;
    if (state.winAnim > 0.95) return; // no glass to run down when open
    d.y += d.speed * dt;
    if (d.y > 1.12) { d.y = -0.12; d.x = Math.random(); }
  });
  apartmentMoments.forEach(a => {
    if (a.active > 0) { a.active -= dt; return; }
    a.next -= dt;
    if (a.next <= 0) {
      a.active = 1.2 + Math.random() * 6.5; a.next = 8 + Math.random() * 38;
      a.kind = ['tv','curtain','silhouette','lamp'][Math.floor(Math.random()*4)];
    }
  });
}

// Reset canvas context to a known clean state between major draw calls.
// Guards against any sub-function leaving globalAlpha/compositeOp dirty.
function resetCtx() {
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'source-over';
  cx.shadowBlur = 0;
  cx.shadowColor = 'transparent';
  cx.setLineDash([]);
  cx.lineWidth = 1;
}

function render(ts) {
  const dt = state.lastTs ? Math.min(0.033, (ts - state.lastTs) / 1000) : 0.016;
  state.lastTs = ts;
  state.t = ts / 1000;
  updateClock(dt);
  updateParticles(dt);

  cx.clearRect(0, 0, RW, RH);
  resetCtx(); drawRoom();
  resetCtx(); drawWindowView(dt);
  resetCtx(); drawForegroundFrame();
  resetCtx(); drawLamp();
  resetCtx(); drawHifiRack();
  resetCtx(); drawRecordPlayer();
  resetCtx(); drawHeadphones();
  resetCtx(); drawChair();
  resetCtx(); drawTV();
  resetCtx(); drawTableAndProps();
  resetCtx(); drawCube();
  resetCtx(); drawReactiveLighting();
  resetCtx(); drawAtmosphere();
  resetCtx(); drawFocusHighlight();
  resetCtx(); drawDebugLayout();

  if (state.labelHold > 0) {
    state.labelHold -= dt;
    if (state.labelHold <= 0) UI.label.classList.remove('show');
  }

  requestAnimationFrame(render);
}

function showLabel(text, color = '#b4f2ff', hold = 1.1) {
  UI.label.textContent = text;
  UI.label.style.color = color;
  UI.label.classList.add('show');
  state.labelHold = hold;
}

function updateUiState() {
  syncHotspotsFromLayout();
  document.querySelectorAll('.fcard').forEach(el => el.classList.remove('show'));
  if (state.focus) {
    const h = hotspots.find(s => s.id === state.focus);
    if (h?.card) UI[h.card].classList.add('show');
  }
  UI.back.classList.toggle('show', !!state.focus);

  document.querySelectorAll('[data-source]').forEach(el => el.classList.toggle('on', el.dataset.source === state.musicSource));
  document.querySelectorAll('[data-tvch]').forEach(el => el.classList.toggle('on', +el.dataset.tvch === state.tvCh));
  document.querySelectorAll('[data-weather]').forEach(el => el.classList.toggle('on', !!state.weather[el.dataset.weather]));
  document.querySelectorAll('[data-mood]').forEach(el => el.classList.toggle('on', el.dataset.mood === state.mood));
  UI.musicPow.classList.toggle('on', state.musicOn);
  UI.tvPow.classList.toggle('on', state.tvOn);
  UI.winToggle.classList.toggle('on', state.winOpen);
  UI.winToggle.textContent = state.winOpen ? 'CLOSE WINDOW' : 'OPEN WINDOW';
  UI.winLean.classList.toggle('on', state.leanOut);
  UI.winLean.textContent = state.leanOut ? 'STEP BACK' : 'LEAN OUT';

  // Anime video — play only when TV is on and anime channel is active
  const shouldPlay = state.tvOn && state.tvCh === 1;
  if (shouldPlay) {
    animeVideo.play().catch(() => {}); // catch autoplay policy blocks silently
  } else {
    animeVideo.pause();
  }
}

function applyFocusTransform(instant = false) {
  syncHotspotsFromLayout();

  // Slow, breathing transitions — this is a relaxing space
  canvas.style.transition = instant
    ? 'none'
    : state.focus
      ? 'transform 1.1s cubic-bezier(0.16, 1, 0.3, 1), filter 1.1s ease'
      : 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), filter 0.85s ease';

  if (!state.focus) {
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = 'translate(0px,0px) scale(1)';
    canvas.style.filter = 'none';
    return;
  }
  const h = hotspots.find(s => s.id === state.focus);
  if (!h) return;
  const cx0 = h.x + h.w / 2;
  const cy0 = h.y + h.h / 2;
  const s = h.zoom.s;
  const baseW = RW * SCALE;
  const baseH = RH * SCALE;
  const baseLeft = (innerWidth - baseW) / 2;
  const baseTop  = (innerHeight - baseH) / 2;
  const desiredX = innerWidth  * h.zoom.ax;
  const desiredY = innerHeight * h.zoom.ay;
  const tx = desiredX - baseLeft - cx0 * SCALE * s;
  const ty = desiredY - baseTop  - cy0 * SCALE * s;
  canvas.style.transformOrigin = '0 0';
  canvas.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
  canvas.style.filter = state.focus === 'window'
    ? 'brightness(1.04) contrast(1.03) drop-shadow(0 0 30px rgba(122,190,255,.18))'
    : 'brightness(1.03) contrast(1.02) drop-shadow(0 0 28px rgba(178,130,255,.16))';
}

function setFocus(id) {
  state.focus = id;
  updateUiState();
  applyFocusTransform();
  if (!id) {
    UI.label.classList.remove('show');
    return;
  }
  if (id === 'tv') showLabel('[ CLICK TV TO CHANGE CHANNEL ]', '#b4f2ff', 1.8);
  if (id === 'hifi') showLabel('[ CLICK HI-FI TO CHANGE SOURCE ]', '#ffd8ff', 1.8);
  if (id === 'window') showLabel('[ WINDOW / WEATHER ]', '#c7f0ff', 1.4);
  if (id === 'holo') showLabel('[ HOLOCUBE / MOOD ]', '#d8c2ff', 1.4);
}

function hitTest(clientX, clientY) {
  syncHotspotsFromLayout();
  const rect = canvas.getBoundingClientRect();
  const effectiveScale = rect.width / RW;
  const x = (clientX - rect.left) / effectiveScale;
  const y = (clientY - rect.top) / effectiveScale;
  // Sort ascending by area so the most specific (smallest) hotspot always wins
  const hits = hotspots.filter(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
  if (!hits.length) return null;
  return hits.sort((a, b) => (a.w * a.h) - (b.w * b.h))[0];
}

canvas.addEventListener('mousemove', e => {
  state.hover = hitTest(e.clientX, e.clientY);
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / RW;
  state.mx = ((e.clientX - rect.left) / scale / RW) * 2 - 1; // -1..1
  state.my = ((e.clientY - rect.top) / scale / RH) * 2 - 1;  // -1..1
});

canvas.addEventListener('click', e => {
  const hit = hitTest(e.clientX, e.clientY);
  if (!hit) {
    if (state.focus) setFocus(null);
    return;
  }

  if (state.focus === hit.id) {
    if (hit.id === 'tv') {
      state.tvCh = (state.tvCh + 1) % 2;
      updateUiState();
      showLabel(state.tvCh === 0 ? '[ AMBIENT ]' : '[ ANIME ]', '#b4f2ff');
      return;
    }
    if (hit.id === 'hifi') {
      const seq = ['vinyl', 'spotify', 'radio'];
      const i = seq.indexOf(state.musicSource);
      state.musicSource = seq[(i + 1) % seq.length];
      state.musicOn = true;
      updateUiState();
      showLabel(`[ ${state.musicSource.toUpperCase()} ]`, '#ffd8ff');
      return;
    }
    if (hit.id === 'lamp') {
      state.lampOn = !state.lampOn;
      showLabel(state.lampOn ? '[ LAMP ON ]' : '[ LAMP OFF ]', '#ffe2bb');
      return;
    }
    if (hit.id === 'holo') {
      const moods = ['calm', 'rain', 'neon', 'midnight'];
      const i = moods.indexOf(state.mood);
      state.mood = moods[(i + 1) % moods.length];
      state.holoPulse = 1;
      updateUiState();
      showLabel(`[ ${state.mood.toUpperCase()} ]`, '#d8c2ff');
      return;
    }
  }
  setFocus(hit.id);
});

UI.back.addEventListener('click', () => setFocus(null));
UI.clock.addEventListener('click', () => UI.timeUi.classList.toggle('show'));

document.querySelectorAll('[data-time]').forEach(el => {
  el.addEventListener('click', () => {
    const mode = el.dataset.time;
    UI.timeUi.classList.remove('show');
    if (mode === 'cycle') {
      state.timeMode = 'auto';
      state.timeCycle = true;
      state.cycleAt = performance.now();
      state.cycleMinutesBase = state.currentMinutes;
    } else if (mode === 'auto') {
      state.timeMode = 'auto';
      state.timeCycle = false;
    } else {
      state.timeMode = mode;
      state.timeCycle = false;
    }
    showLabel(`[ ${mode.toUpperCase()} ]`, '#b4f2ff');
  });
});

document.querySelectorAll('[data-source]').forEach(el => el.addEventListener('click', () => {
  state.musicSource = el.dataset.source;
  state.musicOn = true;
  updateUiState();
}));
UI.musicPow.addEventListener('click', () => { state.musicOn = !state.musicOn; updateUiState(); });
UI.musicPlay.addEventListener('click', () => { state.musicOn = !state.musicOn; updateUiState(); });
UI.musicPrev.addEventListener('click', () => { state.musicTrack = (state.musicTrack + tracks.length - 1) % tracks.length; state.holoPulse = 1; });
UI.musicNext.addEventListener('click', () => { state.musicTrack = (state.musicTrack + 1) % tracks.length; state.holoPulse = 1; });

document.querySelectorAll('[data-tvch]').forEach(el => el.addEventListener('click', () => { state.tvCh = +el.dataset.tvch; updateUiState(); }));
UI.tvPow.addEventListener('click', () => { state.tvOn = !state.tvOn; updateUiState(); });
UI.winToggle.addEventListener('click', () => { state.winOpen = !state.winOpen; updateUiState(); showLabel(state.winOpen ? '[ WINDOW OPEN ]' : '[ WINDOW CLOSED ]', '#c7f0ff'); });
UI.winLean.addEventListener('click', () => { state.leanOut = !state.leanOut; updateUiState(); showLabel(state.leanOut ? '[ LEAN OUT ]' : '[ STEP BACK ]', '#c7f0ff'); });

document.querySelectorAll('[data-weather]').forEach(el => el.addEventListener('click', () => {
  const key = el.dataset.weather;
  const wasActive = state.weather[key];
  Object.keys(state.weather).forEach(k => state.weather[k] = false);
  if (!wasActive) {
    state.weather[key] = true;
    showLabel(`[ ${key.toUpperCase()} ]`, '#c7f0ff');
  } else {
    showLabel('[ CLEAR ]', '#c7f0ff');
  }
  updateUiState();
}));

document.querySelectorAll('[data-mood]').forEach(el => el.addEventListener('click', () => {
  state.mood = el.dataset.mood;
  state.holoPulse = 1;
  updateUiState();
  showLabel(`[ ${state.mood.toUpperCase()} ]`, '#d8c2ff');
}));


// ── TEMP LAYOUT DEBUGGER CONTROLS ─────────────────────
window.addEventListener('keydown', e => {
  // Backtick toggles the temporary layout editor on/off.
  if (e.key === '`') {
    e.preventDefault();
    DEBUG_LAYOUT = !DEBUG_LAYOUT;
    console.log(`DEBUG_LAYOUT: ${DEBUG_LAYOUT ? 'ON' : 'OFF'}`);

    if (typeof showLabel === 'function') {
      showLabel(DEBUG_LAYOUT ? '[ DEBUG LAYOUT ON ]' : '[ DEBUG LAYOUT OFF ]', '#ffffa8', 1);
    }

    return;
  }

  if (!DEBUG_LAYOUT) return;

  const r = layout[debugTarget];
  if (!r) return;

  const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
  const step = e.altKey ? 10 : 1;

  if (e.key === 'Tab') {
    e.preventDefault();
    const i = debugTargets.indexOf(debugTarget);
    debugTarget = debugTargets[(i + 1) % debugTargets.length];

    console.log('Debug target:', debugTarget, layout[debugTarget]);
    return;
  }

  if (e.key === 'c' || e.key === 'C') {
    const v = layout[debugTarget];
    const output = v.w == null
      ? `${debugTarget}: { x: ${Math.round(v.x)}, y: ${Math.round(v.y)} },`
      : `${debugTarget}: { x: ${Math.round(v.x)}, y: ${Math.round(v.y)}, w: ${Math.round(v.w)}, h: ${Math.round(v.h)} },`;

    console.log(output);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(output).catch(() => {});
    }

    if (typeof showLabel === 'function') {
      showLabel(`[ COPIED ${debugTarget} ]`, '#ffffa8', 0.8);
    }

    return;
  }

  if (!isArrow) return;

  e.preventDefault();

  const resize = e.shiftKey && r.w != null && r.h != null;

  if (!resize) {
    if (e.key === 'ArrowLeft') r.x -= step;
    if (e.key === 'ArrowRight') r.x += step;
    if (e.key === 'ArrowUp') r.y -= step;
    if (e.key === 'ArrowDown') r.y += step;
  } else {
    if (e.key === 'ArrowLeft') r.w -= step;
    if (e.key === 'ArrowRight') r.w += step;
    if (e.key === 'ArrowUp') r.h -= step;
    if (e.key === 'ArrowDown') r.h += step;

    r.w = Math.max(1, r.w);
    r.h = Math.max(1, r.h);
  }

  const hs = hotspots.find(h => h.id === debugTarget);
  if (hs && r.w != null && r.h != null) {
    hs.x = r.x;
    hs.y = r.y;
    hs.w = r.w;
    hs.h = r.h;
  }
  syncHotspotsFromLayout();
});

// ── SNOW SYSTEM ───────────────────────────────────────
function makeSnowLayer(count, vyMin, vyMax, rMin, rMax, aMin, aMax, wobble) {
  return Array.from({length: count}, () => ({
    x:       Math.random(),
    y:       Math.random(),
    vy:      vyMin + Math.random() * (vyMax - vyMin), // normalized/sec
    r:       rMin  + Math.random() * (rMax  - rMin),
    alpha:   aMin  + Math.random() * (aMax  - aMin),
    phase:   Math.random() * Math.PI * 2,
    phaseSpd:0.25 + Math.random() * 0.55,
    wobble,
  }));
}
const snowFlakes = [
  makeSnowLayer(65, 0.022, 0.048, 0.5, 1.1,  0.22, 0.45, 0.008), // far  — tiny, slow, faint
  makeSnowLayer(45, 0.038, 0.072, 1.1, 2.2,  0.42, 0.70, 0.014), // mid  — main body
  makeSnowLayer(18, 0.060, 0.095, 2.2, 3.8,  0.60, 0.92, 0.022), // near — large, bright
];

// snow + rain seeded at module level
loadAssets();
resize();
updateUiState();
requestAnimationFrame(render);
