const VERSION = 'A2.3-CINEMATIC-VISUAL-PASS';
const BUILD_STAMP = 'A2.3-CINEMATIC-VISUAL-PASS | 2026-04-28 19:27:56 UTC';
const RW = 1920, RH = 1080;
const canvas = document.getElementById('c');
let cx = canvas.getContext('2d');

// Hidden video element for anime channel
const animeVideo = document.createElement('video');
animeVideo.src = 'assets/anime-video.mp4';

// ── GFX / BLOOM SETTINGS ──────────────────────────────
const gfx = {
  debug: false,
  bloom: true,
  bloomPreview: false,
  bloomStrength: 0.55,
  bloomBlur: 18,
  contactShadows: true,
  contactPreview: false,
  contactStrength: 0.75,
  aoStrength: 0.45,
  atmosphere: true,
  atmospherePreview: false,
  floorHazeStrength: 0.30,
  midHazeStrength: 0.22,
  backFogStrength: 0.18,
  lightWrap: true,
  lightWrapPreview: false,
  wrapWindowStrength: 0.28,
  wrapLampStrength: 0.22,
  wrapTvStrength: 0.20,
  wrapAmbientStrength: 0.16,
  materialResponse: true,
  materialPreview: false,
  materialStrength: 0.55,
  woodSheenStrength: 0.45,
  glassSheenStrength: 0.50,
  metalGlintStrength: 0.38,
  leatherSheenStrength: 0.30,
  reflections: true,
  reflectionsPreview: false,
  floorReflectionStrength: 0.28,
  tableReflectionStrength: 0.22,
  tvReflectionStrength: 0.18,
  holoReflectionStrength: 0.25,
  lampReflectionStrength: 0.16,
  colourGrade: true,
  gradePreview: false,
  gradeStrength: 0.42,
  contrastStrength: 0.18,
  shadowTintStrength: 0.20,
  warmMidStrength: 0.12,
  cyanLiftStrength: 0.10,
  vignetteStrength: 0.34,
  vignetteSize: 0.72,
  supersampling: false,
  supersampleScale: 1.25,
  lensTreatment: true,
  lensPreview: false,
  grain: true,
  grainStrength: 0.042,
  chromaticAberration: true,
  chromaStrength: 0.35,
  chromaEdgeOnly: true,
  halation: true,
  halationStrength: 0.11,
  halationBlur: 10,
  scanTexture: false,
  scanTextureStrength: 0.025,
  microMotion: true,
  microMotionStrength: 0.55,
  neonBreathStrength: 0.35,
  lampFlickerStrength: 0.18,
  tvFlickerStrength: 0.28,
  hazeDriftStrength: 0.22,
  reflectionShimmerStrength: 0.24,
  materialShimmerStrength: 0.12,
  depthPolish: true,
  depthPreview: false,
  depthStrength: 0.32,
  backgroundSoftness: 0.20,
  foregroundSoftness: 0.14,
  midgroundClarity: 0.18,
  depthVignetteStrength: 0.16,
  sources: { city: true, window: true, tv: true, holo: true, hifi: true },
  shadows: {
    chair: true, lamp: true, hifi: true, turntable: true,
    headphones: true, tv: true, table: true, mug: true,
    remote: true, books: true, holo: true
  },
  wraps: {
    chair: true, lamp: true, hifi: true, turntable: true,
    tv: true, books: true, mug: true, table: true, holo: true
  },
  materials: {
    chair: true, hifi: true, turntable: true, tv: true,
    table: true, mug: true, books: true, holo: true, floor: true
  },
  reflectionSources: {
    window: true, city: true, tv: true, holo: true, lamp: true, hifi: true
  }
};

// Offscreen bloom canvas
const glowCanvas = document.createElement('canvas');
glowCanvas.width  = RW;
glowCanvas.height = RH;
const gx = glowCanvas.getContext('2d');

// Offscreen contact shadow canvas
const shadowCanvas = document.createElement('canvas');
shadowCanvas.width  = RW;
shadowCanvas.height = RH;
const sx = shadowCanvas.getContext('2d');

// Offscreen atmosphere canvas
const airCanvas = document.createElement('canvas');
airCanvas.width  = RW;
airCanvas.height = RH;
const ax = airCanvas.getContext('2d');

// Offscreen light wrap canvas
const lightCanvas = document.createElement('canvas');
lightCanvas.width  = RW;
lightCanvas.height = RH;
const lx = lightCanvas.getContext('2d');

// Offscreen material response canvas
const materialCanvas = document.createElement('canvas');
materialCanvas.width  = RW;
materialCanvas.height = RH;
const mx = materialCanvas.getContext('2d');

// Offscreen reflection canvas
const reflectionCanvas = document.createElement('canvas');
reflectionCanvas.width  = RW;
reflectionCanvas.height = RH;
const rx = reflectionCanvas.getContext('2d');

// Offscreen colour grade canvas
const gradeCanvas = document.createElement('canvas');
gradeCanvas.width  = RW;
gradeCanvas.height = RH;
const grx = gradeCanvas.getContext('2d');

// Offscreen lens treatment canvas
const lensCanvas = document.createElement('canvas');
lensCanvas.width  = RW;
lensCanvas.height = RH;
const lnx = lensCanvas.getContext('2d');

// Small grain tile — 256×256, regenerated ~12fps, tiled over the scene
const grainTileCanvas = document.createElement('canvas');
grainTileCanvas.width  = 256;
grainTileCanvas.height = 256;
const ngx = grainTileCanvas.getContext('2d');
let lastGrainUpdate = 0;

// Chroma helper canvas
const chromaCanvas = document.createElement('canvas');
chromaCanvas.width  = RW;
chromaCanvas.height = RH;
const chx = chromaCanvas.getContext('2d');

// Offscreen depth polish canvas
const depthCanvas = document.createElement('canvas');
depthCanvas.width  = RW;
depthCanvas.height = RH;
const dx = depthCanvas.getContext('2d');
// Offscreen render target — drawn at up to 2x then downsampled to visible canvas.
// All logical coordinates (layout, hitboxes, debug) remain 1920x1080.
const renderCanvas = document.createElement('canvas');
renderCanvas.width  = RW;
renderCanvas.height = RH;
const rcx = renderCanvas.getContext('2d');
// Keep a stable reference to the visible context for interaction and CSS sizing
const visibleCtx = canvas.getContext('2d');

function resetLogicalTransform() {
  const scale = (gfx.supersampling && cx === rcx) ? gfx.supersampleScale : 1;
  cx.setTransform(scale, 0, 0, scale, 0, 0);
}

function configureSupersampleCanvas() {
  const scale = gfx.supersampling ? Math.min(2, Math.max(1, gfx.supersampleScale)) : 1;
  const sw = Math.round(RW * scale);
  const sh = Math.round(RH * scale);
  if (renderCanvas.width !== sw || renderCanvas.height !== sh) {
    renderCanvas.width  = sw;
    renderCanvas.height = sh;
  }
  return scale;
}

function beginSupersampledRender() {
  const scale = configureSupersampleCanvas();
  if (!gfx.supersampling) {
    cx = visibleCtx;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    return { scale: 1, offscreen: false };
  }
  cx = rcx;
  cx.setTransform(scale, 0, 0, scale, 0, 0);
  cx.clearRect(0, 0, RW, RH);
  return { scale, offscreen: true };
}

function endSupersampledRender(info) {
  if (!info.offscreen) return;
  visibleCtx.save();
  visibleCtx.setTransform(1, 0, 0, 1, 0, 0);
  visibleCtx.clearRect(0, 0, RW, RH);
  visibleCtx.imageSmoothingEnabled = true;
  visibleCtx.imageSmoothingQuality = 'high';
  visibleCtx.drawImage(renderCanvas, 0, 0, renderCanvas.width, renderCanvas.height, 0, 0, RW, RH);
  visibleCtx.restore();
  cx = visibleCtx;
}
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
let focusUiTimer = null;
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
  room:           { x: 0, y: 0, w: RW, h: RH },
  win:            { x: 427, y: 178, w: 1071, h: 473 },
  chair:          { x: 172, y: 534, w: 540,  h: 464 },
  lamp:           { x: 426, y: 462, w: 200,  h: 304 },
  hifi:           { x: 540, y: 389, w: 1041, h: 416 },
  recordPlayer:   { x: 553, y: 556, w: 181,  h: 112 },
  headphones:     { x: 722, y: 598, w: 99,   h: 81  },
  tv:             { x: 1258, y: 485, w: 290, h: 206 },
  table:          { x: 873, y: 617, w: 805,  h: 602 },
  mug:            { x: 961, y: 875, w: 147,  h: 101 },
  remote:         { x: 1139, y: 887, w: 117, h: 106 },
  books:          { x: 1394, y: 856, w: 193, h: 148 },
  cube:           { x: 1292, y: 884, w: 56,  h: 74  },
  cubeGlow:       { x: 1320, y: 903 },
  screen:         { x: 1317, y: 526, w: 113, h: 113 },
  rackDisplay:    { x: 775,  y: 681, w: 192, h: 12  },
  rackKnobs:      { x: 913,  y: 705 },
  recordSleeve:   { x: 675,  y: 673, w: 79,  h: 74  },
  lampMouth:      { x: 541,  y: 524 },
  lampTarget:     { x: 582,  y: 715 },
  tvGlowOrigin:   { x: 1378, y: 601 },
  tvGlowSpill:    { x: 828,  y: 784 },
  hifiGlowOrigin: { x: 811,  y: 689 },
  hifiGlowSpill:  { x: 811,  y: 751 },
  moon:           { x: 1266, y: 213, w: 76,  h: 37  },
};

// ── TEMP LAYOUT DEBUGGER ──────────────────────────────
// Set to false when the scene layout is locked.
let DEBUG_LAYOUT = false;
let debugTarget = 'hifi';

// ── HUMAN SCALE DEBUG ─────────────────────────────────
let DEBUG_SCALE = false;
// Preset floor positions — one per depth plane. x = horizontal, floorY = feet.
const scaleGuides = [
  { label: 'BACK WALL',  x: 960,  floorY: 510,  scale: 0.72, col: 'rgba(100,220,255,0.55)' },
  { label: 'RACK PLANE', x: 700,  floorY: 620,  scale: 0.92, col: 'rgba(180,100,255,0.55)' },
  { label: 'TABLE PLANE',x: 960,  floorY: 760,  scale: 1.18, col: 'rgba(255,180,80,0.55)'  },
  { label: 'FOREGROUND', x: 960,  floorY: 900,  scale: 1.40, col: 'rgba(100,255,160,0.55)' },
];
let scaleGuideIndex = 0; // which guide is active / draggable

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
  'moon',
  'lampMouth',
  'lampTarget',
  'tvGlowOrigin',
  'tvGlowSpill',
  'hifiGlowOrigin',
  'hifiGlowSpill',
  'hit.window', 'hit.hifi', 'hit.tv', 'hit.holo', 'hit.lamp',
  'focus.window', 'focus.hifi', 'focus.tv', 'focus.holo', 'focus.lamp'
];


const hotspots = [
  {
    id: 'window',
    label: 'the window',
    hit:   { x: 535,  y: 265, w: 825, h: 319 },
    focus: { x: 535,  y: 265, w: 824, h: 319 },
    card: 'winUi',
    zoom: { s: 1.55, ax: 0.50, ay: 0.42 }
  },
  {
    id: 'hifi',
    label: 'the hi-fi',
    hit:   { x: 641,  y: 636, w: 440, h: 109 },
    focus: { x: 641,  y: 635, w: 440, h: 111 },
    card: 'hifiUi',
    zoom: { s: 1.75, ax: 0.50, ay: 0.58 }
  },
  {
    id: 'tv',
    label: 'the television',
    hit:   { x: 1258, y: 485, w: 290, h: 206 },
    focus: { x: 1258, y: 485, w: 290, h: 244 },
    card: 'tvUi',
    zoom: { s: 2.05, ax: 0.50, ay: 0.50 }
  },
  {
    id: 'holo',
    label: 'the holocube',
    hit:   { x: 1248, y: 845, w: 150, h: 150 },
    ocus: { x: 1248, y: 845, w: 150, h: 150 },
    card: 'holoUi',
    zoom: { s: 2.25, ax: 0.50, ay: 0.70 }
  },
  {
    id: 'lamp',
    label: 'the lamp',
    hit:   { x: 479,  y: 484, w: 81,  h: 269 },
    focus: { x: 452,  y: 472, w: 129, h: 300 },
    card: null,
    zoom: { s: 1.85, ax: 0.32, ay: 0.55 }
  }
];

// No-op — hit/focus boxes are now independent of layout
function syncHotspotsFromLayout() {}

function hotspotRect(h, kind = 'hit') {
  if (!h) return null;
  return h[kind] || h.hit || h.focus || null;
}

function hotspotCentre(h, kind = 'focus') {
  const r = hotspotRect(h, kind) || hotspotRect(h, 'hit');
  if (!r) return { x: RW / 2, y: RH / 2 };
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
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


// ── BLOOM PASS ────────────────────────────────────────
function clearBloomCanvas() {
  gx.setTransform(1, 0, 0, 1, 0, 0);
  gx.clearRect(0, 0, RW, RH);
  gx.globalAlpha = 1;
  gx.globalCompositeOperation = 'source-over';
  gx.filter = 'none';
}

function compositeBloom() {
  if (!gfx.bloom) return;
  cx.save();
  cx.globalAlpha = gfx.bloomStrength;
  cx.globalCompositeOperation = 'screen';
  cx.filter = `blur(${gfx.bloomBlur}px)`;
  cx.drawImage(glowCanvas, 0, 0);
  cx.restore();
  // Small crisp emissive lift
  cx.save();
  cx.globalAlpha = Math.min(0.18, gfx.bloomStrength * 0.25);
  cx.globalCompositeOperation = 'lighter';
  cx.filter = 'none';
  cx.drawImage(glowCanvas, 0, 0);
  cx.restore();
}

function drawBloomWindow() {
  if (!gfx.sources.window) return;
  const { x, y, w, h } = layout.win;
  const pulse = (0.92 + Math.sin(state.t * 1.4) * 0.08) * (microEnabled() ? micro.neonPulse : 1);
  gx.save();
  gx.globalCompositeOperation = 'lighter';
  // Side neon strips
  gx.fillStyle = `rgba(190,95,255,${0.55 * pulse})`;
  gx.fillRect(x - 13, y - 3, 5, h + 6);
  gx.fillRect(x + w + 8, y - 3, 5, h + 6);
  // Top edge glow
  const topG = gx.createLinearGradient(0, y - 8, 0, y + 16);
  topG.addColorStop(0,   'rgba(255,255,255,0)');
  topG.addColorStop(0.5, `rgba(210,120,255,${0.45 * pulse})`);
  topG.addColorStop(1,   'rgba(255,255,255,0)');
  gx.fillStyle = topG;
  gx.fillRect(x, y - 10, w, 28);
  // Bottom sill glow
  gx.fillStyle = `rgba(190,80,255,${0.28 * pulse})`;
  gx.fillRect(x, y + h - 3, w, 5);
  gx.restore();
}

function drawBloomTV() {
  if (!gfx.sources.tv || !state.tvOn) return;
  const s = layout.screen;
  const origin = layout.tvGlowOrigin || { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  const tvMul = microEnabled() ? micro.tvPulse : 1;
  gx.save();
  gx.globalCompositeOperation = 'lighter';
  const g = gx.createRadialGradient(
    s.x + s.w * 0.5, s.y + s.h * 0.5, 2,
    s.x + s.w * 0.5, s.y + s.h * 0.5, s.w * 0.95
  );
  g.addColorStop(0,    `rgba(140,190,255,${(0.55 * tvMul).toFixed(3)})`);
  g.addColorStop(0.45, `rgba(100,150,255,${(0.20 * tvMul).toFixed(3)})`);
  g.addColorStop(1,    'rgba(100,150,255,0)');
  gx.fillStyle = g;
  gx.fillRect(s.x - s.w * 0.4, s.y - s.h * 0.4, s.w * 1.8, s.h * 1.8);
  gx.fillStyle = `rgba(170,210,255,${(0.18 * tvMul).toFixed(3)})`;
  gx.fillRect(s.x, s.y, s.w, s.h);
  const spill = gx.createRadialGradient(origin.x, origin.y + 120, 5, origin.x, origin.y + 120, 180);
  spill.addColorStop(0, `rgba(100,140,255,${(0.13 * tvMul).toFixed(3)})`);
  spill.addColorStop(1, 'rgba(100,140,255,0)');
  gx.fillStyle = spill;
  gx.fillRect(origin.x - 200, origin.y - 10, 400, 260);
  gx.restore();
}

function drawBloomHolo() {
  if (!gfx.sources.holo) return;
  const r = layout.cube;
  const cx0 = r.x + r.w * 0.5;
  const cy0 = r.y + r.h * 0.35 + Math.sin(state.t * 1.8) * 1.7;
  const holoMul = microEnabled() ? micro.holoPulseMul : 1;
  const pulse = (0.75 + Math.sin(state.t * 2.5) * 0.15 + (state.holoPulse || 0) * 0.35) * holoMul;
  gx.save();
  gx.globalCompositeOperation = 'lighter';
  const g = gx.createRadialGradient(cx0, cy0, 2, cx0, cy0, r.w * 2.0);
  g.addColorStop(0,    `rgba(180,145,255,${0.55 * pulse})`);
  g.addColorStop(0.35, `rgba(150,100,255,${0.25 * pulse})`);
  g.addColorStop(1,     'rgba(150,100,255,0)');
  gx.fillStyle = g;
  gx.fillRect(cx0 - r.w * 2, cy0 - r.h * 1.2, r.w * 4, r.h * 2.8);
  gx.strokeStyle = `rgba(210,180,255,${0.65 * pulse})`;
  gx.lineWidth = Math.max(1, r.w * 0.025);
  gx.strokeRect(r.x + r.w * 0.28, r.y + r.h * 0.08, r.w * 0.44, r.h * 0.34);
  gx.restore();
}

function drawBloomHifi() {
  if (!gfx.sources.hifi || !state.musicOn) return;
  const d = layout.rackDisplay;
  gx.save();
  gx.globalCompositeOperation = 'lighter';
  gx.fillStyle = 'rgba(120,220,255,0.55)';
  gx.fillRect(d.x, d.y, d.w, Math.max(3, d.h));
  const ledY = d.y + 35;
  for (let i = 0; i < 5; i++) {
    const lx = d.x - 22 + i * 38;
    const a = i === state.musicTrack ? 0.65 : 0.25;
    gx.fillStyle = `rgba(255,120,90,${a})`;
    gx.beginPath();
    gx.arc(lx, ledY, 3, 0, Math.PI * 2);
    gx.fill();
  }
  gx.restore();
}

function drawBloomCity() {
  if (!gfx.sources.city) return;
  const { x, y, w, h } = layout.win;
  const tp = timeProfile();
  const intensity = 0.10 + tp.sunset * 0.15 + tp.night * 0.35;
  gx.save();
  gx.beginPath(); gx.rect(x, y, w, h); gx.clip();
  gx.globalCompositeOperation = 'lighter';
  const horizonY = y + h * 0.72;
  const horizon = gx.createRadialGradient(x + w * 0.5, horizonY, 10, x + w * 0.5, horizonY, w * 0.65);
  horizon.addColorStop(0,   `rgba(210,40,255,${0.18 * intensity})`);
  horizon.addColorStop(0.4, `rgba(80,180,255,${0.10 * intensity})`);
  horizon.addColorStop(1,    'rgba(80,180,255,0)');
  gx.fillStyle = horizon;
  gx.fillRect(x, y, w, h);
  if (typeof NEON_ANCHORS !== 'undefined') {
    NEON_ANCHORS.forEach(n => {
      const nx  = x + n.x * w;
      const ny1 = y + n.yt * h;
      const ny2 = y + n.yb * h;
      gx.fillStyle = `rgba(${n.r},${n.g},${n.b},${intensity * 0.55})`;
      gx.fillRect(nx - 2, ny1, 4, ny2 - ny1);
    });
  }
  gx.restore();
}

function renderBloomPass() {
  clearBloomCanvas();
  if (!gfx.bloom && !gfx.bloomPreview) return;
  drawBloomCity();
  drawBloomWindow();
  drawBloomTV();
  drawBloomHolo();
  drawBloomHifi();
}

// ── ATMOSPHERIC PERSPECTIVE PASS ─────────────────────
function clearAtmosphereCanvas() {
  ax.setTransform(1, 0, 0, 1, 0, 0);
  ax.clearRect(0, 0, RW, RH);
  ax.globalAlpha = 1;
  ax.globalCompositeOperation = 'source-over';
  ax.filter = 'none';
}

function drawSoftAtmosphereBlob(ctx, x, y, r, innerRGBA, outerRGBA = 'rgba(0,0,0,0)') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, innerRGBA);
  g.addColorStop(1, outerRGBA);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawAtmosphereGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function drawAtmosphereBackFog() {
  if (gfx.backFogStrength <= 0) return;
  ax.save();
  ax.globalCompositeOperation = 'screen';
  // Soft purple depth behind the midground — keep it away from the actual window
  const g = ax.createLinearGradient(0, RH * 0.18, 0, RH * 0.72);
  g.addColorStop(0,    'rgba(255,255,255,0)');
  g.addColorStop(0.35, `rgba(70,55,110,${0.028 * gfx.backFogStrength})`);
  g.addColorStop(0.75, `rgba(95,70,145,${0.060 * gfx.backFogStrength})`);
  g.addColorStop(1,    'rgba(255,255,255,0)');
  ax.fillStyle = g;
  ax.fillRect(0, RH * 0.16, RW, RH * 0.60);
  // Very faint radial around the window zone — only affects the room air, not the glass
  const w = layout.win;
  const glow = ax.createRadialGradient(
    w.x + w.w * 0.5, w.y + w.h * 0.72, 20,
    w.x + w.w * 0.5, w.y + w.h * 0.72, w.w * 0.65
  );
  glow.addColorStop(0,    `rgba(110,85,165,${0.055 * gfx.backFogStrength})`);
  glow.addColorStop(0.5,  `rgba(90,70,145,${0.030 * gfx.backFogStrength})`);
  glow.addColorStop(1,     'rgba(90,70,145,0)');
  ax.fillStyle = glow;
  ax.fillRect(w.x - w.w * 0.25, w.y + w.h * 0.30, w.w * 1.5, w.h * 1.2);
  ax.restore();
}

function drawAtmosphereMidDistance() {
  if (gfx.midHazeStrength <= 0) return;
  ax.save();
  ax.globalCompositeOperation = 'screen';
  // Broad atmospheric band through the midground — rack / chair zone
  const band = ax.createLinearGradient(0, RH * 0.42, 0, RH * 0.86);
  band.addColorStop(0,    'rgba(255,255,255,0)');
  band.addColorStop(0.28, `rgba(75,58,118,${0.038 * gfx.midHazeStrength})`);
  band.addColorStop(0.62, `rgba(110,82,160,${0.075 * gfx.midHazeStrength})`);
  band.addColorStop(1,    'rgba(255,255,255,0)');
  ax.fillStyle = band;
  ax.fillRect(0, RH * 0.40, RW, RH * 0.50);
  // Soft pool in the centre of the room — slowly drifts with micro-motion
  const dx = microEnabled() ? micro.hazeDriftX : 0;
  const dy = microEnabled() ? micro.hazeDriftY : 0;
  drawSoftAtmosphereBlob(
    ax, RW * 0.53 + dx, RH * 0.67 + dy, RW * 0.32,
    `rgba(110,80,155,${0.075 * gfx.midHazeStrength})`
  );
  ax.restore();
}

function drawAtmosphereFloorHaze() {
  if (gfx.floorHazeStrength <= 0) return;
  ax.save();
  ax.globalCompositeOperation = 'screen';
  // Floor-level depth — separated from the midground band
  const g = ax.createLinearGradient(0, RH * 0.60, 0, RH);
  g.addColorStop(0,    'rgba(255,255,255,0)');
  g.addColorStop(0.36, `rgba(75,58,115,${0.030 * gfx.floorHazeStrength})`);
  g.addColorStop(0.72, `rgba(110,82,150,${0.062 * gfx.floorHazeStrength})`);
  g.addColorStop(1,    `rgba(130,98,170,${0.090 * gfx.floorHazeStrength})`);
  ax.fillStyle = g;
  ax.fillRect(0, RH * 0.58, RW, RH * 0.42);
  // Pool near the rug
  drawSoftAtmosphereBlob(
    ax, RW * 0.52, RH * 0.86, RW * 0.40,
    `rgba(120,92,165,${0.090 * gfx.floorHazeStrength})`
  );
  // Faint lift around the table base
  if (layout.table) {
    const t = layout.table;
    drawSoftAtmosphereBlob(
      ax, t.x + t.w * 0.50, t.y + t.h * 0.80, t.w * 0.50,
      `rgba(125,96,170,${0.068 * gfx.floorHazeStrength})`
    );
  }
  ax.restore();
}

function renderAtmospherePass() {
  clearAtmosphereCanvas();
  if (!gfx.atmosphere && !gfx.atmospherePreview) return;
  drawAtmosphereBackFog();
  drawAtmosphereMidDistance();
  drawAtmosphereFloorHaze();
}

function compositeAtmosphere() {
  if (!gfx.atmosphere) return;
  // Blurred screen pass — the main depth air feel
  cx.save();
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'screen';
  cx.filter = 'blur(8px)';
  cx.drawImage(airCanvas, 0, 0);
  cx.restore();
  // Very faint unblurred pass — just a touch of body, won't make things milky
  cx.save();
  cx.globalAlpha = 0.12;
  cx.globalCompositeOperation = 'source-over';
  cx.filter = 'none';
  cx.drawImage(airCanvas, 0, 0);
  cx.restore();
}

// ── LIGHT WRAP PASS ───────────────────────────────────
function clearLightCanvas() {
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.clearRect(0, 0, RW, RH);
  lx.globalAlpha = 1;
  lx.globalCompositeOperation = 'source-over';
  lx.filter = 'none';
}

// Halved alpha multiplier throughout — "light wrap, not glow outline"
const WRAP_SCALE = 0.5;

function drawLightBlob(ctx, x, y, w, h, color, alpha = 0.18, blur = 18, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = color.replace('__A__', (alpha * WRAP_SCALE).toFixed(3));
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLightStrip(ctx, x, y, w, h, color, alpha = 0.18, blur = 12) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, color.replace('__A__', (alpha * WRAP_SCALE).toFixed(3)));
  g.addColorStop(1, color.replace('__A__', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawVerticalLightStrip(ctx, x, y, w, h, color, alpha = 0.18, blur = 12) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, color.replace('__A__', (alpha * WRAP_SCALE).toFixed(3)));
  g.addColorStop(1, color.replace('__A__', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawWrapWindowLight() {
  if (gfx.wrapWindowStrength <= 0) return;
  lx.save();
  lx.globalCompositeOperation = 'screen';
  const w = layout.win;
  drawLightBlob(lx, w.x + w.w * 0.62, w.y + w.h * 0.92, 760, 220,
    'rgba(175,105,255,__A__)', 0.15 * gfx.wrapWindowStrength, 34, -0.05);
  drawLightBlob(lx, 1335, 620, 420, 180,
    'rgba(175,105,255,__A__)', 0.18 * gfx.wrapWindowStrength, 26, -0.12);
  drawLightBlob(lx, 940, 660, 520, 120,
    'rgba(120,170,255,__A__)', 0.10 * gfx.wrapAmbientStrength, 24, -0.02);
  lx.restore();
}

function drawWrapLampLight() {
  if (gfx.wrapLampStrength <= 0 || !state.lampOn) return;
  lx.save();
  lx.globalCompositeOperation = 'screen';
  const p = layout.lampTarget || { x: 582, y: 715 };
  const lampMul = microEnabled() ? micro.lampWarmth : 1;
  drawLightBlob(lx, p.x, p.y, 260, 120,
    'rgba(255,185,110,__A__)', 0.20 * gfx.wrapLampStrength * lampMul, 24, -0.22);
  drawLightBlob(lx, 720, 745, 330, 120,
    'rgba(255,175,95,__A__)', 0.12 * gfx.wrapLampStrength * lampMul, 22, -0.10);
  lx.restore();
}

function drawWrapTvLight() {
  if (gfx.wrapTvStrength <= 0 || !state.tvOn) return;
  lx.save();
  lx.globalCompositeOperation = 'screen';
  const s = layout.screen;
  const ox = s.x + s.w * 0.5;
  const oy = s.y + s.h * 0.58;
  const tvMul = microEnabled() ? micro.tvPulse : 1;
  drawLightBlob(lx, ox, oy + 58, 250, 130,
    'rgba(120,165,255,__A__)', 0.16 * gfx.wrapTvStrength * tvMul, 20, 0.0);
  drawLightBlob(lx, ox - 20, oy + 120, 300, 150,
    'rgba(110,150,255,__A__)', 0.10 * gfx.wrapTvStrength * tvMul, 22, -0.05);
  lx.restore();
}

function drawWrapObjectAccents() {
  lx.save();
  lx.globalCompositeOperation = 'screen';
  const wrap = gfx.wraps;

  if (wrap.chair) {
    drawLightStrip(lx, 255, 600, 110, 210, 'rgba(165,105,255,__A__)', 0.11 * gfx.wrapWindowStrength, 16);
    drawLightBlob(lx, 420, 660, 150, 90, 'rgba(255,180,110,__A__)', 0.06 * gfx.wrapLampStrength, 14, -0.20);
  }
  if (wrap.lamp) {
    drawLightStrip(lx, 470, 500, 55, 170, 'rgba(255,190,120,__A__)', 0.10 * gfx.wrapLampStrength, 12);
    drawLightStrip(lx, 515, 500, 40, 160, 'rgba(170,110,255,__A__)', 0.05 * gfx.wrapWindowStrength, 14);
  }
  if (wrap.hifi) {
    drawLightBlob(lx, 890, 645, 420, 64, 'rgba(120,165,255,__A__)', 0.09 * gfx.wrapAmbientStrength, 14, 0);
    drawLightStrip(lx, 630, 618, 310, 24, 'rgba(165,110,255,__A__)', 0.08 * gfx.wrapWindowStrength, 10);
  }
  if (wrap.turntable && layout.recordPlayer) {
    const r = layout.recordPlayer;
    drawLightStrip(lx, r.x + r.w * 0.08, r.y + r.h * 0.15, r.w * 0.70, 18, 'rgba(120,170,255,__A__)', 0.08 * gfx.wrapAmbientStrength, 10);
    drawLightBlob(lx, r.x + r.w * 0.68, r.y + r.h * 0.40, r.w * 0.36, r.h * 0.28, 'rgba(175,110,255,__A__)', 0.06 * gfx.wrapWindowStrength, 10, 0);
  }
  if (wrap.tv && layout.tv) {
    const r = layout.tv;
    drawVerticalLightStrip(lx, r.x + r.w * 0.02, r.y + r.h * 0.12, 18, r.h * 0.68, 'rgba(175,110,255,__A__)', 0.11 * gfx.wrapWindowStrength, 10);
    drawLightStrip(lx, r.x + r.w * 0.16, r.y + r.h * 0.08, r.w * 0.52, 16, 'rgba(120,165,255,__A__)', 0.08 * gfx.wrapTvStrength, 10);
  }
  if (wrap.books && layout.books) {
    const r = layout.books;
    drawLightStrip(lx, r.x + r.w * 0.05, r.y + r.h * 0.08, r.w * 0.70, 20, 'rgba(175,110,255,__A__)', 0.08 * gfx.wrapWindowStrength, 10);
  }
  if (wrap.mug && layout.mug) {
    const r = layout.mug;
    drawLightBlob(lx, r.x + r.w * 0.35, r.y + r.h * 0.34, r.w * 0.26, r.h * 0.20, 'rgba(255,200,135,__A__)', 0.08 * gfx.wrapLampStrength, 9, 0);
    drawLightBlob(lx, r.x + r.w * 0.58, r.y + r.h * 0.30, r.w * 0.24, r.h * 0.18, 'rgba(170,110,255,__A__)', 0.05 * gfx.wrapWindowStrength, 9, 0);
  }
  if (wrap.table && layout.table) {
    const r = layout.table;
    drawLightStrip(lx, r.x + r.w * 0.18, r.y + r.h * 0.42, r.w * 0.54, 18, 'rgba(120,165,255,__A__)', 0.05 * gfx.wrapAmbientStrength, 10);
    drawLightStrip(lx, r.x + r.w * 0.58, r.y + r.h * 0.54, r.w * 0.26, 20, 'rgba(175,110,255,__A__)', 0.07 * gfx.wrapWindowStrength, 12);
  }
  if (wrap.holo && layout.cube) {
    const r = layout.cube;
    drawLightBlob(lx, r.x + r.w * 0.50, r.y + r.h * 0.48, r.w * 1.2, r.h * 0.80, 'rgba(180,145,255,__A__)', 0.10 * gfx.wrapWindowStrength, 10, 0);
  }

  lx.restore();
}

function renderLightWrapPass() {
  clearLightCanvas();
  if (!gfx.lightWrap && !gfx.lightWrapPreview) return;
  drawWrapWindowLight();
  drawWrapLampLight();
  drawWrapTvLight();
  drawWrapObjectAccents();
}

function compositeLightWrap() {
  if (!gfx.lightWrap) return;
  cx.save();
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'screen';
  cx.filter = 'blur(6px)';
  cx.drawImage(lightCanvas, 0, 0);
  cx.restore();
  // Tiny crisp pass — keep it attached to surfaces, not floating
  cx.save();
  cx.globalAlpha = 0.14;
  cx.globalCompositeOperation = 'lighter';
  cx.filter = 'none';
  cx.drawImage(lightCanvas, 0, 0);
  cx.restore();
}

// ── MATERIAL RESPONSE PASS ───────────────────────────
// Global scale — "less is more". Reduce here first before tweaking individuals.
const MAT_SCALE = 0.45;

function clearMaterialCanvas() {
  mx.setTransform(1, 0, 0, 1, 0, 0);
  mx.clearRect(0, 0, RW, RH);
  mx.globalAlpha = 1;
  mx.globalCompositeOperation = 'source-over';
  mx.filter = 'none';
}

function drawMaterialSheen(ctx, x, y, w, h, angle, colour, alpha = 0.15, blur = 8) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.filter = `blur(${blur}px)`;
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  const a = alpha * MAT_SCALE;
  g.addColorStop(0,    colour.replace('__A__', '0'));
  g.addColorStop(0.45, colour.replace('__A__', (a * 0.35).toFixed(3)));
  g.addColorStop(0.5,  colour.replace('__A__', a.toFixed(3)));
  g.addColorStop(0.55, colour.replace('__A__', (a * 0.35).toFixed(3)));
  g.addColorStop(1,    colour.replace('__A__', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawEdgeHighlight(ctx, x, y, w, h, colour, alpha = 0.12, blur = 5, vertical = false) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  const g = vertical
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  const a = (alpha * MAT_SCALE).toFixed(3);
  g.addColorStop(0, colour.replace('__A__', a));
  g.addColorStop(1, colour.replace('__A__', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawSpecDot(ctx, x, y, r, colour, alpha = 0.35, blur = 3) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  const a = alpha * MAT_SCALE;
  g.addColorStop(0,    colour.replace('__A__', a.toFixed(3)));
  g.addColorStop(0.45, colour.replace('__A__', (a * 0.30).toFixed(3)));
  g.addColorStop(1,    colour.replace('__A__', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function drawGlassReflection(ctx, x, y, w, h, alpha = 0.18) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const a = alpha * MAT_SCALE;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0,    `rgba(255,255,255,${a})`);
  g.addColorStop(0.18, `rgba(190,220,255,${(a * 0.35).toFixed(3)})`);
  g.addColorStop(0.32,  'rgba(255,255,255,0)');
  g.addColorStop(1,     'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = a * 0.55;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, y + h * 0.18);
  ctx.lineTo(x + w * 0.48, y + h * 0.05);
  ctx.stroke();
  ctx.restore();
}

function drawMaterialTable() {
  if (!gfx.materials.table) return;
  const r = layout.table; const s = gfx.materialStrength;
  const mm = microEnabled() ? micro.materialShimmer : 1;
  mx.save(); mx.globalCompositeOperation = 'screen';
  drawMaterialSheen(mx, r.x + r.w * 0.12, r.y + r.h * 0.38, r.w * 0.70, r.h * 0.10,
    -0.05, 'rgba(255,205,145,__A__)', 0.12 * gfx.woodSheenStrength * s * mm, 10);
  drawEdgeHighlight(mx, r.x + r.w * 0.16, r.y + r.h * 0.55, r.w * 0.68, 18,
    'rgba(255,195,125,__A__)', 0.11 * gfx.woodSheenStrength * s, 7, false);
  drawMaterialSheen(mx, r.x + r.w * 0.44, r.y + r.h * 0.43, r.w * 0.36, r.h * 0.055,
    -0.03, 'rgba(150,175,255,__A__)', 0.08 * gfx.glassSheenStrength * s * mm, 9);
  mx.restore();
}

function drawMaterialChair() {
  if (!gfx.materials.chair) return;
  const s = gfx.materialStrength;
  mx.save(); mx.globalCompositeOperation = 'screen';
  drawMaterialSheen(mx, 250, 610, 210, 45, -0.28, 'rgba(255,205,145,__A__)', 0.07 * gfx.leatherSheenStrength * s, 9);
  drawMaterialSheen(mx, 335, 690, 260, 44, -0.18, 'rgba(180,135,255,__A__)', 0.06 * gfx.leatherSheenStrength * s, 10);
  drawMaterialSheen(mx, 430, 790, 220, 38, -0.10, 'rgba(255,185,120,__A__)', 0.05 * gfx.leatherSheenStrength * s, 9);
  mx.restore();
}

function drawMaterialTV() {
  if (!gfx.materials.tv) return;
  const r = layout.tv; const s = layout.screen; const str = gfx.materialStrength;
  mx.save(); mx.globalCompositeOperation = 'screen';
  drawGlassReflection(mx, s.x, s.y, s.w, s.h, 0.16 * gfx.glassSheenStrength * str);
  drawMaterialSheen(mx, r.x + r.w * 0.18, r.y + r.h * 0.14, r.w * 0.58, r.h * 0.08,
    -0.05, 'rgba(170,190,255,__A__)', 0.11 * gfx.glassSheenStrength * str, 8);
  drawSpecDot(mx, r.x + r.w * 0.75, r.y + r.h * 0.23, 22,
    'rgba(210,220,255,__A__)', 0.14 * gfx.glassSheenStrength * str, 4);
  mx.restore();
}

function drawMaterialHifi() {
  if (!gfx.materials.hifi) return;
  const r = layout.hifi; const d = layout.rackDisplay; const str = gfx.materialStrength;
  mx.save(); mx.globalCompositeOperation = 'screen';
  drawMaterialSheen(mx, r.x + r.w * 0.12, r.y + r.h * 0.57, r.w * 0.62, 34,
    -0.02, 'rgba(145,175,255,__A__)', 0.09 * gfx.metalGlintStrength * str, 8);
  drawGlassReflection(mx, d.x, d.y - 3, d.w, Math.max(20, d.h + 12), 0.12 * gfx.glassSheenStrength * str);
  const k = layout.rackKnobs || { x: 913, y: 705 };
  drawSpecDot(mx, k.x, k.y, 14, 'rgba(230,235,255,__A__)', 0.15 * gfx.metalGlintStrength * str, 4);
  drawSpecDot(mx, k.x + 42, k.y + 2, 11, 'rgba(230,235,255,__A__)', 0.11 * gfx.metalGlintStrength * str, 4);
  mx.restore();
}

function drawMaterialTurntable() {
  if (!gfx.materials.turntable) return;
  const r = layout.recordPlayer; const str = gfx.materialStrength;
  mx.save(); mx.globalCompositeOperation = 'screen';
  drawMaterialSheen(mx, r.x + r.w * 0.10, r.y + r.h * 0.12, r.w * 0.80, r.h * 0.25,
    -0.06, 'rgba(180,205,255,__A__)', 0.12 * gfx.glassSheenStrength * str, 8);
  drawSpecDot(mx, r.x + r.w * 0.36, r.y + r.h * 0.52, r.w * 0.22,
    'rgba(210,220,255,__A__)', 0.10 * gfx.metalGlintStrength * str, 7);
  mx.restore();
}

function drawMaterialMug() {
  if (!gfx.materials.mug) return;
  const r = layout.mug; const str = gfx.materialStrength;
  mx.save(); mx.globalCompositeOperation = 'screen';
  drawSpecDot(mx, r.x + r.w * 0.42, r.y + r.h * 0.32, r.w * 0.16,
    'rgba(255,235,210,__A__)', 0.22 * gfx.glassSheenStrength * str, 4);
  drawMaterialSheen(mx, r.x + r.w * 0.24, r.y + r.h * 0.20, r.w * 0.38, r.h * 0.10,
    -0.08, 'rgba(255,235,210,__A__)', 0.11 * gfx.glassSheenStrength * str, 5);
  mx.restore();
}

function drawMaterialBooks() {
  if (!gfx.materials.books) return;
  const r = layout.books; const str = gfx.materialStrength;
  mx.save(); mx.globalCompositeOperation = 'screen';
  drawMaterialSheen(mx, r.x + r.w * 0.08, r.y + r.h * 0.16, r.w * 0.72, r.h * 0.10,
    -0.04, 'rgba(255,220,170,__A__)', 0.08 * gfx.woodSheenStrength * str, 5);
  drawEdgeHighlight(mx, r.x + r.w * 0.18, r.y + r.h * 0.42, r.w * 0.62, 10,
    'rgba(190,165,255,__A__)', 0.06 * gfx.glassSheenStrength * str, 5, false);
  mx.restore();
}

function drawMaterialHolo() {
  if (!gfx.materials.holo) return;
  const r = layout.cube; const str = gfx.materialStrength;
  const cx0 = r.x + r.w * 0.5; const cy0 = r.y + r.h * 0.42;
  mx.save(); mx.globalCompositeOperation = 'screen';
  drawSpecDot(mx, cx0, cy0, r.w * 0.85, 'rgba(185,145,255,__A__)', 0.13 * str, 8);
  drawSpecDot(mx, cx0 + r.w * 0.10, cy0 - r.h * 0.08, r.w * 0.26,
    'rgba(230,210,255,__A__)', 0.20 * str, 5);
  mx.restore();
}

function drawMaterialFloor() {
  if (!gfx.materials.floor) return;
  const str = gfx.materialStrength;
  mx.save(); mx.globalCompositeOperation = 'screen';
  const g = mx.createLinearGradient(0, RH * 0.72, 0, RH);
  g.addColorStop(0,    'rgba(255,255,255,0)');
  g.addColorStop(0.55, `rgba(135,110,165,${(0.025 * str * MAT_SCALE).toFixed(3)})`);
  g.addColorStop(1,    `rgba(160,130,190,${(0.038 * str * MAT_SCALE).toFixed(3)})`);
  mx.fillStyle = g;
  mx.fillRect(0, RH * 0.70, RW, RH * 0.30);
  mx.restore();
}

function renderMaterialPass() {
  clearMaterialCanvas();
  if (!gfx.materialResponse && !gfx.materialPreview) return;
  drawMaterialTable();
  drawMaterialChair();
  drawMaterialTV();
  drawMaterialHifi();
  drawMaterialTurntable();
  drawMaterialMug();
  drawMaterialBooks();
  drawMaterialHolo();
  drawMaterialFloor();
}

function compositeMaterialResponse() {
  if (!gfx.materialResponse) return;
  cx.save();
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'screen';
  cx.filter = 'none';
  cx.drawImage(materialCanvas, 0, 0);
  cx.restore();
}

// ── COLOUR GRADE PASS ─────────────────────────────────
// "Final grade, not a special effect."
// Grade functions accept a context so they can draw to grx (preview)
// or cx (direct composite). Direct composite is used for final output
// so blend modes resolve correctly against the actual scene.

function clearGradeCanvas() {
  grx.setTransform(1, 0, 0, 1, 0, 0);
  grx.clearRect(0, 0, RW, RH);
  grx.globalAlpha = 1;
  grx.globalCompositeOperation = 'source-over';
  grx.filter = 'none';
}

function drawGradeFullGradient(ctx, stops, blend, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, RH);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, RW, RH);
  ctx.restore();
}

function drawGradeRadial(ctx, x, y, r0, r1, stops, blend, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, RW, RH);
  ctx.restore();
}

function drawGradeShadowTint(ctx) {
  if (gfx.shadowTintStrength <= 0) return;
  const tp = timeProfile();
  const nightMul = 0.75 + tp.night * 0.45;
  const s = gfx.gradeStrength * gfx.shadowTintStrength * nightMul;
  // Purple shadow bias in lower and edge areas
  drawGradeFullGradient(ctx, [
    [0.00, 'rgba(60,35,95,0)'],
    [0.35, `rgba(48,28,78,${0.07 * s})`],
    [0.72, `rgba(38,20,65,${0.15 * s})`],
    [1.00, `rgba(18,8,32,${0.18 * s})`]
  ], 'multiply', 1);
  // Very restrained magenta presence in midtones
  drawGradeRadial(ctx, RW * 0.48, RH * 0.58, RW * 0.10, RW * 0.70, [
    [0.00, `rgba(120,45,160,${0.035 * s})`],
    [0.55, `rgba(80,20,120,${0.022 * s})`],
    [1.00, 'rgba(80,20,120,0)']
  ], 'screen', 1);
}

function drawGradeWarmMidtones(ctx) {
  if (gfx.warmMidStrength <= 0) return;
  const tp = timeProfile();
  const sunsetWarm = 0.8 + tp.sunset * 0.45;
  const s = gfx.gradeStrength * gfx.warmMidStrength * sunsetWarm;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  // Warm pool near lamp/table area
  drawGradeRadial(ctx, RW * 0.44, RH * 0.70, 0, RW * 0.46, [
    [0.00, `rgba(255,160,80,${0.10 * s})`],
    [0.42, `rgba(255,120,60,${0.042 * s})`],
    [1.00, 'rgba(255,120,60,0)']
  ], 'screen', 1);
  // Very faint amber lift across lower third — balances the purple
  const g = ctx.createLinearGradient(0, RH * 0.55, 0, RH);
  g.addColorStop(0,    'rgba(255,180,100,0)');
  g.addColorStop(0.55, `rgba(255,160,90,${0.026 * s})`);
  g.addColorStop(1,    `rgba(255,130,70,${0.018 * s})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, RH * 0.52, RW, RH * 0.48);
  ctx.restore();
}

function drawGradeCyanLift(ctx) {
  if (gfx.cyanLiftStrength <= 0) return;
  const tp = timeProfile();
  const nightMul = 0.75 + tp.night * 0.45;
  const s = gfx.gradeStrength * gfx.cyanLiftStrength * nightMul;
  // Restrained cool lift from window/city/TV side
  drawGradeRadial(ctx, RW * 0.68, RH * 0.48, 0, RW * 0.55, [
    [0.00, `rgba(80,190,255,${0.08 * s})`],
    [0.45, `rgba(70,140,255,${0.030 * s})`],
    [1.00, 'rgba(70,140,255,0)']
  ], 'screen', 1);
}

function drawGradeContrast(ctx) {
  if (gfx.contrastStrength <= 0) return;
  const s = gfx.gradeStrength * gfx.contrastStrength;
  // Gentle top/bottom shaping — not a crush
  drawGradeFullGradient(ctx, [
    [0.00, `rgba(0,0,0,${0.16 * s})`],
    [0.18, `rgba(0,0,0,${0.04 * s})`],
    [0.50, 'rgba(0,0,0,0)'],
    [0.82, `rgba(0,0,0,${0.04 * s})`],
    [1.00, `rgba(0,0,0,${0.14 * s})`]
  ], 'multiply', 1);
  // Tiny central lift so nothing feels crushed
  drawGradeRadial(ctx, RW * 0.52, RH * 0.54, 0, RW * 0.62, [
    [0.00, `rgba(255,245,235,${0.028 * s})`],
    [0.45, `rgba(255,245,235,${0.009 * s})`],
    [1.00, 'rgba(255,245,235,0)']
  ], 'screen', 1);
}

function drawGradeVignette(ctx) {
  if (gfx.vignetteStrength <= 0) return;
  const tp = timeProfile();
  const nightMul = 0.8 + tp.night * 0.25;
  const strength = gfx.gradeStrength * gfx.vignetteStrength * nightMul;
  const size = gfx.vignetteSize || 0.72;
  const cx0 = RW * 0.50, cy0 = RH * 0.52;
  const inner = Math.min(RW, RH) * size * 0.35;
  const outer = Math.max(RW, RH) * size;
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(cx0, cy0, inner, cx0, cy0, outer);
  g.addColorStop(0.00, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, `rgba(0,0,0,${0.07 * strength})`);
  g.addColorStop(0.82, `rgba(0,0,0,${0.18 * strength})`);
  g.addColorStop(1.00, `rgba(0,0,0,${0.36 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, RW, RH);
  ctx.restore();
}

// Build grade into grx for preview only
function renderColourGradePass() {
  clearGradeCanvas();
  if (!gfx.gradePreview) return;
  drawGradeShadowTint(grx);
  drawGradeWarmMidtones(grx);
  drawGradeCyanLift(grx);
  drawGradeContrast(grx);
  drawGradeVignette(grx);
}

// Apply grade directly to cx — correct blend mode behaviour against the real scene
function compositeColourGrade() {
  if (!gfx.colourGrade) return;
  drawGradeShadowTint(cx);
  drawGradeWarmMidtones(cx);
  drawGradeCyanLift(cx);
  drawGradeContrast(cx);
  drawGradeVignette(cx);
}

// ── MICRO-MOTION SYSTEM ───────────────────────────────
// "Ambient life, not animation." All values stay close to 1 — multiplicative modifiers only.
const micro = {
  lampWarmth: 1, tvPulse: 1, neonPulse: 1, holoPulseMul: 1,
  hazeDriftX: 0, hazeDriftY: 0,
  reflectionShimmer: 1, materialShimmer: 1,
  lastRandomFlicker: 0, randomTvFlicker: 1, randomLampFlicker: 1
};

function microEnabled() { return gfx.microMotion && gfx.microMotionStrength > 0; }

function updateMicroMotion(dt) {
  if (!gfx.microMotion) {
    micro.lampWarmth = micro.tvPulse = micro.neonPulse = micro.holoPulseMul = 1;
    micro.reflectionShimmer = micro.materialShimmer = 1;
    micro.hazeDriftX = micro.hazeDriftY = 0;
    return;
  }
  const s  = gfx.microMotionStrength;
  const tp = timeProfile();
  const nightV = 0.55 + tp.night * 0.45 + tp.sunset * 0.20;
  const storm  = state.weather?.thunderstorm ? 1.4 : state.weather?.rain ? 1.15 : 1.0;

  // Each value uses two out-of-phase sines so no two lights breathe together
  micro.neonPulse =
    1 + (Math.sin(state.t * 0.42) * 0.035 + Math.sin(state.t * 0.91 + 1.7) * 0.018)
    * gfx.neonBreathStrength * s * nightV;

  micro.lampWarmth =
    1 + (Math.sin(state.t * 0.63 + 0.4) * 0.022 + Math.sin(state.t * 1.31 + 2.1) * 0.009)
    * gfx.lampFlickerStrength * s;

  micro.tvPulse =
    1 + (Math.sin(state.t * 1.8 + 0.8) * 0.030 + Math.sin(state.t * 5.2 + 1.4) * 0.009)
    * gfx.tvFlickerStrength * s * nightV;

  micro.holoPulseMul =
    1 + (Math.sin(state.t * 1.15 + 2.4) * 0.040 + Math.sin(state.t * 2.3 + 1.2) * 0.018)
    * s * nightV;

  micro.hazeDriftX = Math.sin(state.t * 0.055) * 22 * gfx.hazeDriftStrength * s * storm;
  micro.hazeDriftY = Math.sin(state.t * 0.041 + 1.6) * 10 * gfx.hazeDriftStrength * s * storm;

  micro.reflectionShimmer =
    1 + (Math.sin(state.t * 0.9 + 0.3) * 0.030 + Math.sin(state.t * 2.1 + 2.2) * 0.015)
    * gfx.reflectionShimmerStrength * s * storm;

  micro.materialShimmer =
    1 + Math.sin(state.t * 0.72 + 0.9) * 0.022 * gfx.materialShimmerStrength * s;

  // Rare random micro-flicker — throttled, not every frame
  const now = performance.now();
  if (now - micro.lastRandomFlicker > 120) {
    micro.lastRandomFlicker = now;
    micro.randomTvFlicker    = Math.random() < 0.05  * gfx.tvFlickerStrength  * s ? 0.93 + Math.random() * 0.09 : 1;
    micro.randomLampFlicker  = Math.random() < 0.018 * gfx.lampFlickerStrength * s ? 0.97 + Math.random() * 0.04 : 1;
  }
  micro.tvPulse   *= micro.randomTvFlicker;
  micro.lampWarmth *= micro.randomLampFlicker;
}


// ── DEPTH POLISH PASS ────────────────────────────────
// "Depth staging, not blur." No canvas filter used — all gradients.
// If image looks softer overall, reduce depthStrength first.

function clearDepthCanvas() {
  dx.setTransform(1, 0, 0, 1, 0, 0);
  dx.clearRect(0, 0, RW, RH);
  dx.globalAlpha = 1;
  dx.globalCompositeOperation = 'source-over';
  dx.filter = 'none';
}

function drawDepthBackgroundSoftness() {
  if (gfx.backgroundSoftness <= 0) return;
  const tp = timeProfile();
  const nightD = 0.75 + tp.night * 0.35 + tp.sunset * 0.15;
  const s = gfx.depthStrength * gfx.backgroundSoftness * nightD;
  dx.save();
  dx.globalCompositeOperation = 'screen';
  const w = layout.win;
  const g = dx.createRadialGradient(
    w.x + w.w * 0.52, w.y + w.h * 0.55, w.w * 0.15,
    w.x + w.w * 0.52, w.y + w.h * 0.55, w.w * 0.95
  );
  g.addColorStop(0.00, 'rgba(130,105,190,' + (0.042 * s).toFixed(3) + ')');
  g.addColorStop(0.45, 'rgba(90,70,145,' + (0.030 * s).toFixed(3) + ')');
  g.addColorStop(1.00, 'rgba(90,70,145,0)');
  dx.fillStyle = g;
  dx.fillRect(w.x - w.w * 0.45, w.y - 140, w.w * 1.9, w.h * 1.9);
  const veil = dx.createLinearGradient(0, RH * 0.12, 0, RH * 0.68);
  veil.addColorStop(0.00, 'rgba(255,255,255,0)');
  veil.addColorStop(0.45, 'rgba(105,85,160,' + (0.022 * s).toFixed(3) + ')');
  veil.addColorStop(1.00, 'rgba(255,255,255,0)');
  dx.fillStyle = veil;
  dx.fillRect(0, RH * 0.10, RW, RH * 0.58);
  dx.restore();
}

function drawDepthForegroundSoftness() {
  if (gfx.foregroundSoftness <= 0) return;
  const s = gfx.depthStrength * gfx.foregroundSoftness;
  dx.save();
  dx.globalCompositeOperation = 'multiply';
  const bottom = dx.createLinearGradient(0, RH * 0.75, 0, RH);
  bottom.addColorStop(0.00, 'rgba(0,0,0,0)');
  bottom.addColorStop(0.55, 'rgba(18,8,34,' + (0.028 * s).toFixed(3) + ')');
  bottom.addColorStop(1.00, 'rgba(8,3,18,' + (0.12 * s).toFixed(3) + ')');
  dx.fillStyle = bottom;
  dx.fillRect(0, RH * 0.73, RW, RH * 0.27);
  const left = dx.createLinearGradient(0, 0, RW * 0.26, 0);
  left.addColorStop(0.00, 'rgba(10,4,22,' + (0.08 * s).toFixed(3) + ')');
  left.addColorStop(1.00, 'rgba(10,4,22,0)');
  dx.fillStyle = left;
  dx.fillRect(0, RH * 0.60, RW * 0.30, RH * 0.40);
  const right = dx.createLinearGradient(RW, 0, RW * 0.74, 0);
  right.addColorStop(0.00, 'rgba(10,4,22,' + (0.08 * s).toFixed(3) + ')');
  right.addColorStop(1.00, 'rgba(10,4,22,0)');
  dx.fillStyle = right;
  dx.fillRect(RW * 0.70, RH * 0.60, RW * 0.30, RH * 0.40);
  dx.restore();
}

function drawDepthMidgroundClarity() {
  if (gfx.midgroundClarity <= 0) return;
  const s = gfx.depthStrength * gfx.midgroundClarity;
  dx.save();
  dx.globalCompositeOperation = 'screen';
  const g = dx.createRadialGradient(
    RW * 0.50, RH * 0.62, RW * 0.12,
    RW * 0.50, RH * 0.62, RW * 0.48
  );
  g.addColorStop(0.00, 'rgba(255,240,220,' + (0.032 * s).toFixed(3) + ')');
  g.addColorStop(0.42, 'rgba(190,175,255,' + (0.018 * s).toFixed(3) + ')');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  dx.fillStyle = g;
  dx.fillRect(0, 0, RW, RH);
  dx.restore();
}

function drawDepthVignette() {
  if (gfx.depthVignetteStrength <= 0) return;
  const tp = timeProfile();
  const nightD = 0.75 + tp.night * 0.35 + tp.sunset * 0.15;
  const s = gfx.depthStrength * gfx.depthVignetteStrength * nightD;
  dx.save();
  dx.globalCompositeOperation = 'multiply';
  const g = dx.createRadialGradient(
    RW * 0.50, RH * 0.56, Math.min(RW, RH) * 0.28,
    RW * 0.50, RH * 0.56, Math.max(RW, RH) * 0.78
  );
  g.addColorStop(0.00, 'rgba(0,0,0,0)');
  g.addColorStop(0.65, 'rgba(0,0,0,' + (0.042 * s).toFixed(3) + ')');
  g.addColorStop(1.00, 'rgba(0,0,0,' + (0.14 * s).toFixed(3) + ')');
  dx.fillStyle = g;
  dx.fillRect(0, 0, RW, RH);
  dx.restore();
}

function renderDepthPolishPass() {
  clearDepthCanvas();
  if (!gfx.depthPolish && !gfx.depthPreview) return;
  drawDepthBackgroundSoftness();
  drawDepthForegroundSoftness();
  drawDepthMidgroundClarity();
  drawDepthVignette();
}

function compositeDepthPolish() {
  if (!gfx.depthPolish) return;
  cx.save();
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'source-over';
  cx.filter = 'none';
  cx.drawImage(depthCanvas, 0, 0, RW, RH);
  cx.restore();
}

// ── LENS TREATMENT PASS ───────────────────────────────
// "Felt more than seen." Grain very low, halation very restrained.

function clearLensCanvas() {
  lnx.setTransform(1, 0, 0, 1, 0, 0);
  lnx.clearRect(0, 0, RW, RH);
  lnx.globalAlpha = 1;
  lnx.globalCompositeOperation = 'source-over';
  lnx.filter = 'none';
}

function regenerateGrainTile() {
  const img = ngx.createImageData(256, 256);
  const d   = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 118 + Math.random() * 38;
    d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 255;
  }
  ngx.putImageData(img, 0, 0);
}

function maybeUpdateGrain() {
  if (!gfx.grain) return;
  const now = performance.now();
  if (now - lastGrainUpdate > 83) { // ~12fps update
    regenerateGrainTile();
    lastGrainUpdate = now;
  }
}

function drawLensGrain() {
  if (!gfx.grain || gfx.grainStrength <= 0) return;
  maybeUpdateGrain();
  lnx.save();
  lnx.globalCompositeOperation = 'overlay';
  lnx.globalAlpha = gfx.grainStrength;
  const pattern = lnx.createPattern(grainTileCanvas, 'repeat');
  if (pattern) {
    lnx.fillStyle = pattern;
    const ox = Math.floor((state.t * 17) % 256);
    const oy = Math.floor((state.t * 11) % 256);
    lnx.translate(-ox, -oy);
    lnx.fillRect(ox, oy, RW + 256, RH + 256);
  }
  lnx.restore();
}

function drawSimpleEdgeChroma() {
  // Safe edge-only approach — no canvas sampling needed, no colour wash risk
  if (!gfx.chromaticAberration || gfx.chromaStrength <= 0) return;
  const s = gfx.chromaStrength;
  lnx.save();
  lnx.globalCompositeOperation = 'screen';
  const left = lnx.createLinearGradient(0, 0, RW * 0.16, 0);
  left.addColorStop(0, `rgba(255,40,120,${(0.025 * s).toFixed(3)})`);
  left.addColorStop(1, 'rgba(255,40,120,0)');
  lnx.fillStyle = left;
  lnx.fillRect(0, 0, RW * 0.16, RH);
  const right = lnx.createLinearGradient(RW, 0, RW * 0.84, 0);
  right.addColorStop(0, `rgba(60,220,255,${(0.025 * s).toFixed(3)})`);
  right.addColorStop(1, 'rgba(60,220,255,0)');
  lnx.fillStyle = right;
  lnx.fillRect(RW * 0.84, 0, RW * 0.16, RH);
  lnx.restore();
}

function drawLensHalation() {
  // Faint warm wrap around bright bloom areas — much weaker than bloom itself
  if (!gfx.halation || gfx.halationStrength <= 0) return;
  if (typeof glowCanvas === 'undefined') return;
  lnx.save();
  lnx.globalCompositeOperation = 'screen';
  lnx.globalAlpha = gfx.halationStrength * 0.5; // extra reduction — "felt not seen"
  lnx.filter = `blur(${gfx.halationBlur}px)`;
  lnx.drawImage(glowCanvas, 0, 0, RW, RH);
  // Warm tint applied via source-atop
  lnx.globalCompositeOperation = 'source-atop';
  lnx.filter = 'none';
  lnx.fillStyle = 'rgba(255,100,70,0.14)';
  lnx.fillRect(0, 0, RW, RH);
  lnx.restore();
}

function drawScanTexture() {
  if (!gfx.scanTexture || gfx.scanTextureStrength <= 0) return;
  lnx.save();
  lnx.globalCompositeOperation = 'overlay';
  lnx.globalAlpha = gfx.scanTextureStrength;
  for (let y = 0; y < RH; y += 3) {
    lnx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.20)';
    lnx.fillRect(0, y, RW, 1);
  }
  lnx.restore();
}

function renderLensPass() {
  clearLensCanvas();
  if (!gfx.lensTreatment && !gfx.lensPreview) return;
  drawLensHalation();
  drawSimpleEdgeChroma();
  drawScanTexture();
  drawLensGrain(); // grain last so it sits on top of everything
}

function compositeLensTreatment() {
  if (!gfx.lensTreatment) return;
  cx.save();
  cx.globalCompositeOperation = 'source-over';
  cx.globalAlpha = 1;
  cx.filter = 'none';
  cx.drawImage(lensCanvas, 0, 0, RW, RH);
  cx.restore();
}

// ── REFLECTION PASS ───────────────────────────────────
// "Reflected coloured light, not mirror reflection."
// Global scale keeps it from becoming glossy by default.
const REF_SCALE = 0.40;

function clearReflectionCanvas() {
  rx.setTransform(1, 0, 0, 1, 0, 0);
  rx.clearRect(0, 0, RW, RH);
  rx.globalAlpha = 1;
  rx.globalCompositeOperation = 'source-over';
  rx.filter = 'none';
}

function drawReflectionBlob(ctx, x, y, w, h, colour, alpha = 0.12, blur = 18, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.filter = `blur(${blur}px)`;
  const a = alpha * REF_SCALE;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.5);
  g.addColorStop(0,    colour.replace('__A__', a.toFixed(3)));
  g.addColorStop(0.38, colour.replace('__A__', (a * 0.45).toFixed(3)));
  g.addColorStop(1,    colour.replace('__A__', '0'));
  ctx.fillStyle = g;
  ctx.scale(w / Math.max(w, h), h / Math.max(w, h));
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(w, h) * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawReflectionStreak(ctx, x, y, w, h, colour, alpha = 0.10, blur = 10, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.filter = `blur(${blur}px)`;
  const a = alpha * REF_SCALE;
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0,    colour.replace('__A__', '0'));
  g.addColorStop(0.28, colour.replace('__A__', (a * 0.30).toFixed(3)));
  g.addColorStop(0.5,  colour.replace('__A__', a.toFixed(3)));
  g.addColorStop(0.72, colour.replace('__A__', (a * 0.30).toFixed(3)));
  g.addColorStop(1,    colour.replace('__A__', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawSurfaceSheen(ctx, x, y, w, h, colour, alpha = 0.10, blur = 8, angle = 0) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.filter = `blur(${blur}px)`;
  const a = alpha * REF_SCALE;
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0,    colour.replace('__A__', '0'));
  g.addColorStop(0.35, colour.replace('__A__', (a * 0.35).toFixed(3)));
  g.addColorStop(0.52, colour.replace('__A__', a.toFixed(3)));
  g.addColorStop(0.70, colour.replace('__A__', (a * 0.25).toFixed(3)));
  g.addColorStop(1,    colour.replace('__A__', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawFloorWindowReflection() {
  if (!gfx.reflectionSources.window && !gfx.reflectionSources.city) return;
  const s = gfx.floorReflectionStrength;
  const rm = microEnabled() ? micro.reflectionShimmer : 1;
  rx.save(); rx.globalCompositeOperation = 'screen';
  drawReflectionBlob(rx, 980, 860, 760, 150, 'rgba(175,95,255,__A__)',  0.13 * s * rm, 28, -0.02);
  drawReflectionBlob(rx, 1080, 900, 560, 90,  'rgba(90,180,255,__A__)', 0.08 * s * rm, 24,  0.03);
  drawReflectionStreak(rx, 650,  830, 260, 34, 'rgba(180,105,255,__A__)', 0.08 * s * rm, 18, -0.12);
  drawReflectionStreak(rx, 1280, 825, 260, 34, 'rgba(180,105,255,__A__)', 0.08 * s * rm, 18,  0.10);
  rx.restore();
}

function drawFloorTvReflection() {
  if (!gfx.reflectionSources.tv || !state.tvOn) return;
  const s = gfx.tvReflectionStrength;
  const sc = layout.screen;
  const x = sc.x + sc.w * 0.5, y = sc.y + sc.h + 160;
  rx.save(); rx.globalCompositeOperation = 'screen';
  drawReflectionBlob(rx, x, y, 300, 80, 'rgba(110,160,255,__A__)',  0.18 * s, 20,  0.02);
  drawReflectionStreak(rx, x - 20, y + 42, 220, 18, 'rgba(145,190,255,__A__)', 0.11 * s, 12, -0.03);
  rx.restore();
}

function drawFloorLampReflection() {
  if (!gfx.reflectionSources.lamp || !state.lampOn) return;
  const s = gfx.lampReflectionStrength;
  const lm = microEnabled() ? micro.lampWarmth : 1;
  const p = layout.lampTarget || { x: 582, y: 715 };
  rx.save(); rx.globalCompositeOperation = 'screen';
  drawReflectionBlob(rx, p.x + 70, p.y + 85, 310, 92, 'rgba(255,175,95,__A__)',  0.13 * s * lm, 22, -0.10);
  drawReflectionStreak(rx, p.x + 150, p.y + 118, 230, 20, 'rgba(255,190,115,__A__)', 0.09 * s * lm, 12, -0.08);
  rx.restore();
}

function drawTableReflections() {
  const r = layout.table;
  const s = gfx.tableReflectionStrength;
  rx.save(); rx.globalCompositeOperation = 'screen';

  if (gfx.reflectionSources.window || gfx.reflectionSources.city) {
    drawSurfaceSheen(rx, r.x + r.w * 0.17, r.y + r.h * 0.40, r.w * 0.58, 28,
      'rgba(160,135,255,__A__)', 0.10 * s, 9, -0.04);
  }
  if (gfx.reflectionSources.lamp && state.lampOn) {
    drawSurfaceSheen(rx, r.x + r.w * 0.10, r.y + r.h * 0.46, r.w * 0.40, 24,
      'rgba(255,190,120,__A__)', 0.08 * s, 8, -0.05);
  }
  if (gfx.reflectionSources.holo && layout.cube) {
    const c = layout.cube;
    drawReflectionBlob(rx, c.x + c.w * 0.48, c.y + c.h * 1.05, c.w * 2.1, c.h * 0.45,
      'rgba(185,145,255,__A__)', 0.38 * gfx.holoReflectionStrength, 10, 0.02);
    drawReflectionStreak(rx, c.x + c.w * 0.55, c.y + c.h * 1.02, c.w * 1.7, 8,
      'rgba(230,210,255,__A__)', 0.18 * gfx.holoReflectionStrength, 6, 0.0);
  }
  if (gfx.reflectionSources.tv && state.tvOn) {
    drawSurfaceSheen(rx, r.x + r.w * 0.48, r.y + r.h * 0.42, r.w * 0.30, 24,
      'rgba(120,170,255,__A__)', 0.07 * gfx.tvReflectionStrength, 8, -0.03);
  }
  rx.restore();
}

function drawRackReflections() {
  const s = gfx.tableReflectionStrength;
  const h = layout.hifi; const d = layout.rackDisplay;
  rx.save(); rx.globalCompositeOperation = 'screen';
  if (gfx.reflectionSources.window || gfx.reflectionSources.city) {
    drawReflectionStreak(rx, h.x + h.w * 0.34, h.y + h.h * 0.56, h.w * 0.44, 20,
      'rgba(120,170,255,__A__)', 0.08 * s, 8, -0.02);
  }
  if (gfx.reflectionSources.hifi && state.musicOn) {
    drawReflectionBlob(rx, d.x + d.w * 0.45, d.y + 22, d.w * 0.75, 22,
      'rgba(100,220,255,__A__)', 0.10 * s, 8, 0.0);
  }
  rx.restore();
}

function renderReflectionPass() {
  clearReflectionCanvas();
  if (!gfx.reflections && !gfx.reflectionsPreview) return;
  drawFloorWindowReflection();
  drawFloorTvReflection();
  drawFloorLampReflection();
  drawTableReflections();
  drawRackReflections();
}

function compositeReflections() {
  if (!gfx.reflections) return;
  // Soft screen pass — the main colour-light-on-surface feel
  cx.save();
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'screen';
  cx.filter = 'blur(3px)';
  cx.drawImage(reflectionCanvas, 0, 0);
  cx.restore();
  // Very tiny crisp lift — keeps table sheens attached, stays below mirror territory
  cx.save();
  cx.globalAlpha = 0.12;
  cx.globalCompositeOperation = 'lighter';
  cx.filter = 'none';
  cx.drawImage(reflectionCanvas, 0, 0);
  cx.restore();
}

// ── CONTACT SHADOW PASS ───────────────────────────────
function clearShadowCanvas() {
  sx.setTransform(1, 0, 0, 1, 0, 0);
  sx.clearRect(0, 0, RW, RH);
  sx.globalAlpha = 1;
  sx.globalCompositeOperation = 'source-over';
  sx.filter = 'none';
}

function drawShadowEllipse(ctx, x, y, w, h, alpha = 0.25, blur = 12) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawContactShadow(ctx, x, y, w, h, tightAlpha = 0.32, softAlpha = 0.16) {
  drawShadowEllipse(ctx, x, y, w * 1.25, h * 1.45, softAlpha  * gfx.aoStrength,      18);
  drawShadowEllipse(ctx, x, y, w,        h,         tightAlpha * gfx.contactStrength,  7);
}

function drawAngledContactShadow(ctx, x, y, w, h, angle = 0, tightAlpha = 0.28, softAlpha = 0.13) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawShadowEllipse(ctx, 0, 0, w * 1.25, h * 1.45, softAlpha  * gfx.aoStrength,      18);
  drawShadowEllipse(ctx, 0, 0, w,        h,         tightAlpha * gfx.contactStrength,  7);
  ctx.restore();
}

function renderContactShadowPass() {
  clearShadowCanvas();
  if (!gfx.contactShadows && !gfx.contactPreview) return;

  // Use source-over on a transparent canvas — we composite with multiply later.
  // Keep individual alphas low so multiply doesn't crush the whole scene.
  const sh = gfx.shadows;

  if (sh.chair) {
    drawAngledContactShadow(sx, 380, 902, 350, 82, -0.08, 0.28, 0.12);
    drawAngledContactShadow(sx, 505, 865, 220, 46, -0.04, 0.18, 0.08);
  }
  if (sh.lamp) {
    drawContactShadow(sx, 490, 694, 105, 30, 0.24, 0.09);
    drawContactShadow(sx, 535, 742, 140, 34, 0.16, 0.07);
  }
  if (sh.hifi) {
    drawAngledContactShadow(sx, 825, 744, 740, 54, 0.00, 0.26, 0.11);
  }
  if (sh.turntable && layout.recordPlayer) {
    const r = layout.recordPlayer;
    drawAngledContactShadow(sx, r.x + r.w * 0.52, r.y + r.h * 0.86, r.w * 0.92, r.h * 0.23, 0.02, 0.30, 0.10);
  }
  if (sh.headphones && layout.headphones) {
    const r = layout.headphones;
    drawAngledContactShadow(sx, r.x + r.w * 0.50, r.y + r.h * 0.82, r.w * 0.72, r.h * 0.24, 0.04, 0.28, 0.08);
  }
  if (sh.tv && layout.tv) {
    const r = layout.tv;
    drawAngledContactShadow(sx, r.x + r.w * 0.52, r.y + r.h * 0.92, r.w * 0.88, r.h * 0.18, 0.02, 0.32, 0.12);
    drawAngledContactShadow(sx, r.x + r.w * 0.58, r.y + r.h + 42,   r.w * 1.05, r.h * 0.25, 0.02, 0.14, 0.06);
  }
  if (sh.table && layout.table) {
    const r = layout.table;
    drawAngledContactShadow(sx, r.x + r.w * 0.50, r.y + r.h * 0.82, r.w * 0.86, r.h * 0.18, 0.00, 0.24, 0.11);
    drawAngledContactShadow(sx, r.x + r.w * 0.50, r.y + r.h * 0.98, r.w * 0.82, r.h * 0.08, 0.00, 0.18, 0.08);
  }
  if (sh.mug && layout.mug) {
    const r = layout.mug;
    drawAngledContactShadow(sx, r.x + r.w * 0.50, r.y + r.h * 0.84, r.w * 0.42, r.h * 0.16, 0.04, 0.36, 0.11);
  }
  if (sh.remote && layout.remote) {
    const r = layout.remote;
    drawAngledContactShadow(sx, r.x + r.w * 0.50, r.y + r.h * 0.62, r.w * 0.30, r.h * 0.70, -0.10, 0.30, 0.08);
  }
  if (sh.books && layout.books) {
    const r = layout.books;
    drawAngledContactShadow(sx, r.x + r.w * 0.50, r.y + r.h * 0.76, r.w * 0.86, r.h * 0.30, -0.04, 0.32, 0.11);
  }
  if (sh.holo && layout.cube) {
    const r = layout.cube;
    drawAngledContactShadow(sx, r.x + r.w * 0.50, r.y + r.h * 0.92, r.w * 0.65, r.h * 0.18, 0.02, 0.30, 0.08);
  }
}

function compositeContactShadows() {
  if (!gfx.contactShadows) return;
  cx.save();
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'multiply';
  cx.filter = 'none';
  cx.drawImage(shadowCanvas, 0, 0);
  cx.restore();
}

function drawGraphicsDebugOverlay() {
  if (!gfx.debug) return;
  cx.save();
  resetLogicalTransform();
  const bx = 16, by = 16, bw = 840, bh = 960;
  cx.fillStyle = 'rgba(5,8,16,0.85)';
  cx.fillRect(bx, by, bw, bh);
  cx.fillStyle = 'rgba(180,120,255,0.95)';
  cx.font = '13px monospace';
  cx.fillText('GRAPHICS DEBUG  (Ctrl+Shift+G)', bx + 16, by + 24);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Bloom: ${gfx.bloom ? 'ON' : 'OFF'}   Preview mask: ${gfx.bloomPreview ? 'ON' : 'OFF'}`, bx + 16, by + 50);
  cx.fillText(`Strength: ${gfx.bloomStrength.toFixed(2)}   Blur: ${gfx.bloomBlur}px`, bx + 16, by + 70);
  const src = gfx.sources;
  cx.fillText(`Sources: 1 City [${src.city?'ON':'OFF'}]  2 Window [${src.window?'ON':'OFF'}]  3 TV [${src.tv?'ON':'OFF'}]`, bx + 16, by + 92);
  cx.fillText(`         4 Holo [${src.holo?'ON':'OFF'}]  5 HiFi [${src.hifi?'ON':'OFF'}]`, bx + 16, by + 110);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('B bloom | M mask | [ ] strength | - + blur | 1-5 sources', bx + 16, by + 132);
  // Shadow section
  cx.fillStyle = 'rgba(255,180,80,0.9)';
  cx.fillText('── CONTACT SHADOWS ──', bx + 16, by + 158);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Shadows: ${gfx.contactShadows ? 'ON' : 'OFF'}   Preview: ${gfx.contactPreview ? 'ON' : 'OFF'}`, bx + 16, by + 178);
  cx.fillText(`Contact strength: ${gfx.contactStrength.toFixed(2)}   AO strength: ${gfx.aoStrength.toFixed(2)}`, bx + 16, by + 198);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('C shadows | V shadow mask | , . contact str | < > AO str', bx + 16, by + 220);
  cx.fillText('6 chair | 7 rack+deck | 8 TV | 9 table+props | 0 lamp', bx + 16, by + 240);
  // Atmosphere section
  cx.fillStyle = 'rgba(100,220,180,0.9)';
  cx.fillText('── ATMOSPHERE ──', bx + 16, by + 264);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Atmosphere: ${gfx.atmosphere ? 'ON' : 'OFF'}   Preview: ${gfx.atmospherePreview ? 'ON' : 'OFF'}`, bx + 16, by + 284);
  cx.fillText(`Floor: ${gfx.floorHazeStrength.toFixed(2)}   Mid: ${gfx.midHazeStrength.toFixed(2)}   Back: ${gfx.backFogStrength.toFixed(2)}`, bx + 16, by + 304);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('A atmosphere | N air mask | J/K floor | U/I mid | O/P back fog', bx + 16, by + 324);
  // Light wrap section
  cx.fillStyle = 'rgba(255,185,110,0.9)';
  cx.fillText('── LIGHT WRAP ──', bx + 16, by + 350);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Light wrap: ${gfx.lightWrap ? 'ON' : 'OFF'}   Preview: ${gfx.lightWrapPreview ? 'ON' : 'OFF'}`, bx + 16, by + 370);
  cx.fillText(`Window: ${gfx.wrapWindowStrength.toFixed(2)}   Lamp: ${gfx.wrapLampStrength.toFixed(2)}   TV: ${gfx.wrapTvStrength.toFixed(2)}   Ambient: ${gfx.wrapAmbientStrength.toFixed(2)}`, bx + 16, by + 390);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('R wrap | T wrap mask | Z/X window | D/F lamp | G/H TV | Q/W ambient | Y groups', bx + 16, by + 410);
  // Material section
  cx.fillStyle = 'rgba(255,220,160,0.9)';
  cx.fillText('── MATERIAL RESPONSE ──', bx + 16, by + 436);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Materials: ${gfx.materialResponse ? 'ON' : 'OFF'}   Preview: ${gfx.materialPreview ? 'ON' : 'OFF'}`, bx + 16, by + 456);
  cx.fillText(`Str: ${gfx.materialStrength.toFixed(2)}  Wood: ${gfx.woodSheenStrength.toFixed(2)}  Glass: ${gfx.glassSheenStrength.toFixed(2)}  Metal: ${gfx.metalGlintStrength.toFixed(2)}  Leather: ${gfx.leatherSheenStrength.toFixed(2)}`, bx + 16, by + 476);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('E material | L mask | Shift+M/N str | Shift+W/E wood | Shift+G/H glass | Shift+T/Y metal | Shift+C/V leather', bx + 16, by + 496);
  // Reflection section
  cx.fillStyle = 'rgba(140,210,255,0.9)';
  cx.fillText('── REFLECTIONS ──', bx + 16, by + 522);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Reflections: ${gfx.reflections ? 'ON' : 'OFF'}   Preview: ${gfx.reflectionsPreview ? 'ON' : 'OFF'}`, bx + 16, by + 542);
  cx.fillText(`Floor: ${gfx.floorReflectionStrength.toFixed(2)}  Table: ${gfx.tableReflectionStrength.toFixed(2)}  TV: ${gfx.tvReflectionStrength.toFixed(2)}  Holo: ${gfx.holoReflectionStrength.toFixed(2)}  Lamp: ${gfx.lampReflectionStrength.toFixed(2)}`, bx + 16, by + 562);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('Shift+R reflections | Shift+L mask | Alt+1/2 floor | Alt+3/4 table | Alt+5/6 TV | Alt+7/8 holo | Alt+9/0 lamp', bx + 16, by + 578);
  // Colour grade section
  cx.fillStyle = 'rgba(255,230,180,0.9)';
  cx.fillText('── COLOUR GRADE ──', bx + 16, by + 604);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Grade: ${gfx.colourGrade ? 'ON' : 'OFF'}   Preview: ${gfx.gradePreview ? 'ON' : 'OFF'}   Str: ${gfx.gradeStrength.toFixed(2)}   Contrast: ${gfx.contrastStrength.toFixed(2)}`, bx + 16, by + 624);
  cx.fillText(`Shadows: ${gfx.shadowTintStrength.toFixed(2)}   Warm: ${gfx.warmMidStrength.toFixed(2)}   Cyan: ${gfx.cyanLiftStrength.toFixed(2)}   Vignette: ${gfx.vignetteStrength.toFixed(2)}`, bx + 16, by + 644);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('Shift+G grade | Shift+P mask | Alt+Q/W str | Alt+A/S contrast | Alt+Z/X shadows | Alt+C/V warm | Alt+B/N cyan | Alt+,/. vignette', bx + 16, by + 660);
  // Supersampling
  const sampleRes = gfx.supersampling
    ? `${Math.round(RW * gfx.supersampleScale)}×${Math.round(RH * gfx.supersampleScale)} → ${RW}×${RH}`
    : `${RW}×${RH} (native)`;
  cx.fillStyle = 'rgba(180,220,255,0.9)';
  cx.fillText(`Supersampling: ${gfx.supersampling ? 'ON' : 'OFF'}   Scale: ${gfx.supersampleScale.toFixed(2)}×   Render: ${sampleRes}`, bx + 16, by + 690);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('Shift+S supersampling | Alt+[ / Alt+] scale', bx + 16, by + 710);
  // Lens section
  cx.fillStyle = 'rgba(200,230,200,0.9)';
  cx.fillText('── LENS TREATMENT ──', bx + 16, by + 736);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Lens: ${gfx.lensTreatment ? 'ON' : 'OFF'}   Grain: ${gfx.grain ? 'ON' : 'OFF'}   Chroma: ${gfx.chromaticAberration ? 'ON' : 'OFF'}   Halation: ${gfx.halation ? 'ON' : 'OFF'}   Scan: ${gfx.scanTexture ? 'ON' : 'OFF'}`, bx + 16, by + 756);
  cx.fillText(`Grain: ${gfx.grainStrength.toFixed(3)}   Chroma: ${gfx.chromaStrength.toFixed(2)}   Halation: ${gfx.halationStrength.toFixed(2)}   Scan: ${gfx.scanTextureStrength.toFixed(3)}`, bx + 16, by + 774);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('Shift+O lens | Shift+I lens mask | Alt+G/H grain | Alt+J/K chroma | Alt+Y/U halation | Shift+V scan', bx + 16, by + 790);
  // Micro-motion section
  cx.fillStyle = 'rgba(180,255,200,0.9)';
  cx.fillText('── MICRO-MOTION ──', bx + 16, by + 816);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Motion: ${gfx.microMotion ? 'ON' : 'OFF'}   Strength: ${gfx.microMotionStrength.toFixed(2)}   Neon: ${gfx.neonBreathStrength.toFixed(2)}   Lamp: ${gfx.lampFlickerStrength.toFixed(2)}   TV: ${gfx.tvFlickerStrength.toFixed(2)}`, bx + 16, by + 836);
  cx.fillText(`Haze drift: ${gfx.hazeDriftStrength.toFixed(2)}   Refl shimmer: ${gfx.reflectionShimmerStrength.toFixed(2)}   Mat shimmer: ${gfx.materialShimmerStrength.toFixed(2)}`, bx + 16, by + 854);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('Shift+M motion | Alt+M/N strength | Alt+E/R neon | Alt+D/F lamp | Alt+T/Y TV | Alt+U/I haze | Alt+O/P refl', bx + 16, by + 872);
  // Depth polish section
  cx.fillStyle = 'rgba(200,240,200,0.9)';
  cx.fillText('── DEPTH POLISH ──', bx + 16, by + 898);
  cx.fillStyle = 'rgba(220,230,255,0.9)';
  cx.fillText(`Depth: ${gfx.depthPolish ? 'ON' : 'OFF'}   Preview: ${gfx.depthPreview ? 'ON' : 'OFF'}   Str: ${gfx.depthStrength.toFixed(2)}   BG: ${gfx.backgroundSoftness.toFixed(2)}   FG: ${gfx.foregroundSoftness.toFixed(2)}`, bx + 16, by + 918);
  cx.fillText(`Mid clarity: ${gfx.midgroundClarity.toFixed(2)}   Vignette: ${gfx.depthVignetteStrength.toFixed(2)}`, bx + 16, by + 936);
  cx.fillStyle = 'rgba(170,180,210,0.78)';
  cx.fillText('Shift+D depth | Shift+B mask | Alt+D/F str | Alt+Z/X BG | Alt+C/V FG | Alt+R/T mid | Alt+[/] vignette', bx + 16, by + 954);
  cx.restore();
}

function getDebugRect(name) {
  if (name.startsWith('hit.')) {
    const id = name.split('.')[1];
    const h = hotspots.find(s => s.id === id);
    return h?.hit || null;
  }
  if (name.startsWith('focus.')) {
    const id = name.split('.')[1];
    const h = hotspots.find(s => s.id === id);
    return h?.focus || null;
  }
  return layout[name] || null;
}

function formatDebugLine(name, r) {
  const rounded = `{ x: ${Math.round(r.x)}, y: ${Math.round(r.y)}, w: ${Math.round(r.w)}, h: ${Math.round(r.h)} }`;
  if (name.startsWith('hit.'))   return `${name}: ${rounded}`;
  if (name.startsWith('focus.')) return `${name}: ${rounded}`;
  return r.w == null
    ? `${name}: { x: ${Math.round(r.x)}, y: ${Math.round(r.y)} },`
    : `${name}: ${rounded},`;
}

function drawHumanFigure(cx, x, floorY, scale, col, label, active) {
  // A 175cm person. All measurements relative to scale.
  // At scale=1.0, total height = 280px.
  const H    = 280 * scale;  // full height
  const head = 36  * scale;  // head radius
  const sh   = 54  * scale;  // shoulder width half
  const hip  = 32  * scale;  // hip width half
  const knee = floorY - H * 0.28;
  const waist= floorY - H * 0.52;
  const chest= floorY - H * 0.70;
  const neck = floorY - H * 0.82;
  const eye  = floorY - H * 0.93;
  const top  = floorY - H;

  cx.save();
  cx.strokeStyle = col;
  cx.fillStyle   = col;
  cx.lineWidth   = active ? 2.5 : 1.5;
  cx.globalAlpha = active ? 0.85 : 0.50;
  cx.setLineDash(active ? [] : [5, 4]);

  // Body outline
  cx.beginPath();
  cx.moveTo(x - sh, chest);
  cx.lineTo(x - hip, waist);
  cx.lineTo(x - hip * 0.8, floorY);
  cx.moveTo(x + hip * 0.8, floorY);
  cx.lineTo(x + hip, waist);
  cx.lineTo(x + sh, chest);
  cx.lineTo(x - sh, chest);
  cx.stroke();

  // Head
  cx.beginPath();
  cx.arc(x, neck - head * 0.6, head * 0.7, 0, Math.PI * 2);
  cx.stroke();

  // Horizontal guides — eye / shoulder / waist / knee
  const guides = [
    { y: eye,   lbl: 'eye'      },
    { y: chest, lbl: 'shoulder' },
    { y: waist, lbl: 'waist'    },
    { y: knee,  lbl: 'knee'     },
  ];
  cx.lineWidth = 0.8;
  cx.setLineDash([3, 6]);
  guides.forEach(g => {
    cx.beginPath();
    cx.moveTo(x - 120 * scale, g.y);
    cx.lineTo(x + 120 * scale, g.y);
    cx.stroke();
    cx.font = `${Math.round(11 * scale)}px monospace`;
    cx.fillText(g.lbl, x + 128 * scale, g.y + 4);
  });

  // Floor line
  cx.setLineDash([]);
  cx.lineWidth = active ? 2 : 1;
  cx.beginPath();
  cx.moveTo(x - 60 * scale, floorY);
  cx.lineTo(x + 60 * scale, floorY);
  cx.stroke();

  // Label
  cx.globalAlpha = 1;
  cx.font = `bold ${active ? 13 : 11}px monospace`;
  cx.fillStyle = col;
  cx.fillText(label, x - 40 * scale, top - 12);

  // Height annotation
  cx.font = '10px monospace';
  cx.fillStyle = col;
  cx.globalAlpha = 0.7;
  cx.fillText('175cm', x + 4, top + 10);

  cx.restore();
}

function drawScaleGuides() {
  if (!DEBUG_SCALE) return;

  scaleGuides.forEach((g, i) => {
    drawHumanFigure(cx, g.x, g.floorY, g.scale, g.col, g.label, i === scaleGuideIndex);
  });

  // HUD
  const g = scaleGuides[scaleGuideIndex];
  cx.save();
  cx.fillStyle = 'rgba(0,0,0,.80)';
  cx.fillRect(22, 22, 820, 92);
  cx.font = '14px monospace';
  cx.fillStyle = g.col;
  cx.fillText(`SCALE GUIDE — ${g.label}  (scale: ${g.scale.toFixed(2)})`, 40, 50);
  cx.fillStyle = '#dff6ff';
  cx.fillText(`x: ${Math.round(g.x)}  floorY: ${Math.round(g.floorY)}`, 40, 72);
  cx.fillStyle = '#aaa';
  cx.fillText('P toggle  |  TAB cycle plane  |  arrows move  |  +/- scale  |  SHIFT+arrows = 10px', 40, 96);
  cx.restore();
}

function drawDebugLayout() {
  if (!DEBUG_LAYOUT) return;

  const target = getDebugRect(debugTarget);
  if (!target) return;

  cx.save();

  debugTargets.forEach(name => {
    const r = getDebugRect(name);
    if (!r || r.x == null || r.y == null) return;
    const hasSize = r.w != null && r.h != null;
    const isActive = name === debugTarget;

    // hit.* = magenta, focus.* = cyan, layout = blue-white
    const isHit   = name.startsWith('hit.');
    const isFocus = name.startsWith('focus.');
    cx.strokeStyle = isActive
      ? 'rgba(255,255,120,.96)'
      : isHit   ? 'rgba(255,80,220,.7)'
      : isFocus ? 'rgba(80,220,255,.7)'
      : 'rgba(120,220,255,.28)';
    cx.fillStyle = isActive
      ? 'rgba(255,255,120,.10)'
      : isHit   ? 'rgba(255,80,220,.06)'
      : isFocus ? 'rgba(80,220,255,.06)'
      : 'rgba(120,220,255,.04)';
    cx.lineWidth = isActive ? 2 : 1;
    cx.setLineDash(isActive ? [] : isHit ? [4, 3] : isFocus ? [2, 4] : [6, 5]);

    if (hasSize) {
      cx.strokeRect(r.x, r.y, r.w, r.h);
      cx.fillRect(r.x, r.y, r.w, r.h);
      cx.font = '11px monospace';
      cx.fillStyle = isActive ? 'rgba(255,255,120,.96)' : cx.strokeStyle;
      cx.fillText(name, r.x + 4, r.y + 13);
    } else {
      cx.beginPath();
      cx.arc(r.x, r.y, isActive ? 8 : 5, 0, Math.PI * 2);
      cx.stroke();
      cx.font = '11px monospace';
      cx.fillStyle = isActive ? 'rgba(255,255,120,.96)' : cx.strokeStyle;
      cx.fillText(name, r.x + 10, r.y - 8);
    }
  });

  cx.setLineDash([]);
  cx.fillStyle = 'rgba(0,0,0,.76)';
  cx.fillRect(22, 22, 720, 92);
  cx.font = '14px monospace';
  cx.fillStyle = '#dff6ff';

  const val = getDebugRect(debugTarget);
  const text = formatDebugLine(debugTarget, val);

  cx.fillText(`DEBUG TARGET: ${debugTarget}`, 40, 50);
  cx.fillText(text, 40, 74);
  cx.fillText('` toggle  |  TAB target  |  arrows move  |  SHIFT+arrows resize  |  ALT = 10px  |  C copy', 40, 98);

  cx.restore();
}

function drawLamp() {
  drawImageFit('lamp', layout.lamp.x, layout.lamp.y, layout.lamp.w, layout.lamp.h, { shadow: { blur: 18, y: 8, color: 'rgba(0,0,0,.35)' } });
  if (!state.lampOn) return;

  const p  = 0.92 + Math.sin(state.t * 11.5) * 0.035;
  const tp = timeProfile();
  const intensity = clamp(tp.night * 0.9 + tp.sunset * 0.55 + tp.day * 0.18, 0.15, 1.0);

  // Mouth = shade opening. Target = where the centreline of the beam points.
  const mx = layout.lampMouth.x;
  const my = layout.lampMouth.y;
  const tx = layout.lampTarget.x;
  const ty = layout.lampTarget.y;

  // Derived beam geometry
  const dx = tx - mx;
  const dy = ty - my;
  const beamLen   = Math.sqrt(dx * dx + dy * dy);
  const beamAngle = Math.atan2(dy, dx);
  const spread    = 0.40; // half-angle in radians (~23°)

  cx.save();

  // Cone — triangle from mouth to two spread edges
  const ax = mx + Math.cos(beamAngle - spread) * beamLen * 2.2;
  const ay = my + Math.sin(beamAngle - spread) * beamLen * 2.2;
  const bx = mx + Math.cos(beamAngle + spread) * beamLen * 2.2;
  const by = my + Math.sin(beamAngle + spread) * beamLen * 2.2;

  const cone = cx.createRadialGradient(mx, my, 2, mx, my, beamLen * 2.2);
  cone.addColorStop(0,   `rgba(255,218,145,${0.38 * p * intensity})`);
  cone.addColorStop(0.4, `rgba(255,200,120,${0.18 * p * intensity})`);
  cone.addColorStop(1,    'rgba(255,180,90,0)');
  cx.fillStyle = cone;
  cx.beginPath();
  cx.moveTo(mx, my);
  cx.lineTo(ax, ay);
  cx.lineTo(bx, by);
  cx.closePath();
  cx.fill();

  // Floor pool at target point
  const pool = cx.createRadialGradient(tx, ty, 4, tx, ty, 80);
  pool.addColorStop(0, `rgba(255,210,130,${0.22 * p * intensity})`);
  pool.addColorStop(1,  'transparent');
  cx.fillStyle = pool;
  cx.fillRect(tx - 85, ty - 40, 170, 100);

  // Halo at shade mouth
  const halo = cx.createRadialGradient(mx, my, 0, mx, my, 44);
  halo.addColorStop(0, `rgba(255,220,150,${0.18 * p * intensity})`);
  halo.addColorStop(1,  'transparent');
  cx.fillStyle = halo;
  cx.beginPath(); cx.arc(mx, my, 44, 0, Math.PI * 2); cx.fill();

  // Debug: draw mouth and target points when debug is active
  if (DEBUG_LAYOUT) {
    cx.strokeStyle = 'rgba(255,220,80,.9)'; cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(mx, my, 5, 0, Math.PI * 2); cx.stroke();
    cx.beginPath(); cx.arc(tx, ty, 5, 0, Math.PI * 2); cx.stroke();
    cx.beginPath(); cx.moveTo(mx, my); cx.lineTo(tx, ty); cx.stroke();
  }

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
  const r = layout.cube;

  const baseW = r.w;
  const baseH = r.h * 0.52;
  const baseX = r.x;
  const baseY = r.y + r.h * 0.48;

  drawImageFit('cubeBase', baseX, baseY, baseW, baseH, {
    shadow: { blur: 10, y: 5, color: 'rgba(0,0,0,.25)' }
  });

  const cx0 = r.x + r.w * 0.5;
  const cy0 = r.y + r.h * 0.35 + Math.sin(state.t * 1.8) * 1.7;

  state.holoPulse = Math.max(0, state.holoPulse - 0.02);
  const alpha = 0.5 + Math.sin(state.t * 2.5) * 0.08 + state.holoPulse * 0.25;

  cx.save();
  cx.translate(cx0, cy0);
  cx.strokeStyle = `rgba(190,160,255,${alpha})`;
  cx.fillStyle = `rgba(190,160,255,${0.08 + state.holoPulse * 0.09})`;
  cx.lineWidth = Math.max(1.1, r.w * 0.025);

  const s = r.w * 0.28 + state.holoPulse * 3;
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

  const glowR = r.w * 1.2;
  const glowY = cy0 + r.h * 0.25;
  const glow = cx.createRadialGradient(cx0, glowY, 2, cx0, glowY, glowR);
  glow.addColorStop(0, `rgba(150,110,255,${0.16 + state.holoPulse * 0.1})`);
  glow.addColorStop(1, 'transparent');
  cx.fillStyle = glow;
  cx.fillRect(cx0 - glowR, cy0 - r.h * 0.15, glowR * 2, r.h * 1.35);
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
  if (!state.hover) return;
  const h = hotspots.find(s => s.id === state.hover.id);
  if (!h) return;
  const r = hotspotRect(h, 'hit');
  cx.save();
  cx.strokeStyle = 'rgba(205,235,255,.24)';
  cx.setLineDash([5, 7]);
  rr(cx, r.x, r.y, r.w, r.h, 8);
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



// ── A2.3 CINEMATIC VISUAL PASS ────────────────────────
// Visual-only finish layers. These do not affect layout, hitboxes,
// focus behaviour, UI state, media, weather logic, or asset loading.
function drawTvCrtIntegrationPass() {
  if (!layout.screen) return;

  const r = layout.screen;
  const t = state.t || 0;

  cx.save();
  cx.beginPath();
  rr(cx, r.x, r.y, r.w, r.h, 8);
  cx.clip();

  // Gentle convex glass sheen.
  cx.globalCompositeOperation = 'screen';
  const glass = cx.createRadialGradient(
    r.x + r.w * 0.34, r.y + r.h * 0.22, 0,
    r.x + r.w * 0.34, r.y + r.h * 0.22, r.w * 0.95
  );
  glass.addColorStop(0, 'rgba(255,255,255,0.105)');
  glass.addColorStop(0.28, 'rgba(160,220,255,0.040)');
  glass.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = glass;
  cx.fillRect(r.x, r.y, r.w, r.h);

  // CRT scanlines.
  cx.globalCompositeOperation = 'source-over';
  cx.globalAlpha = 0.16;
  cx.fillStyle = 'rgba(0,0,0,1)';
  for (let y = r.y; y < r.y + r.h; y += 3) {
    cx.fillRect(r.x, y, r.w, 1);
  }

  // Subtle rolling light band.
  cx.globalAlpha = 0.08;
  cx.globalCompositeOperation = 'screen';
  const bandY = r.y + ((t * 18) % (r.h + 30)) - 15;
  const band = cx.createLinearGradient(0, bandY - 10, 0, bandY + 10);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, 'rgba(190,230,255,0.55)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = band;
  cx.fillRect(r.x, bandY - 10, r.w, 20);

  // Darkened tube edges, so video feels inside glass.
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'multiply';
  const edge = cx.createRadialGradient(
    r.x + r.w * 0.5, r.y + r.h * 0.5, r.h * 0.25,
    r.x + r.w * 0.5, r.y + r.h * 0.5, r.w * 0.78
  );
  edge.addColorStop(0, 'rgba(255,255,255,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.36)');
  cx.fillStyle = edge;
  cx.fillRect(r.x, r.y, r.w, r.h);

  cx.restore();

  // Soft spill from the TV onto its casing and stand.
  if (state.tvOn) {
    const go = layout.tvGlowOrigin;
    const gs = layout.tvGlowSpill;
    const spillR = Math.hypot(gs.x - go.x, gs.y - go.y) * 1.6;
    cx.save();
    cx.globalCompositeOperation = 'screen';
    const glow = cx.createRadialGradient(go.x, go.y, 4, gs.x, gs.y, spillR);
    glow.addColorStop(0,    'rgba(120,190,255,0.13)');
    glow.addColorStop(0.45, 'rgba(120,90,255,0.055)');
    glow.addColorStop(1,    'rgba(0,0,0,0)');
    cx.fillStyle = glow;
    cx.fillRect(go.x - spillR, go.y - spillR * 0.5, spillR * 2, spillR * 2);
    cx.restore();

    if (DEBUG_LAYOUT) {
      cx.save();
      cx.strokeStyle = 'rgba(120,200,255,.9)'; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(go.x, go.y, 5, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.arc(gs.x, gs.y, 5, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.moveTo(go.x, go.y); cx.lineTo(gs.x, gs.y); cx.stroke();
      cx.restore();
    }
  }
}

function drawWindowGlassRichnessPass() {
  const r = layout.win;
  if (!r) return;

  const t = state.t || 0;
  const tp = typeof timeProfile === 'function'
    ? timeProfile()
    : { day: 0, sunset: 0, night: 1 };

  cx.save();
  cx.beginPath();
  cx.rect(r.x, r.y, r.w, r.h);
  cx.clip();

  // Very faint vertical distortion/reflection bands.
  cx.globalCompositeOperation = 'screen';

  // Interior reflection hints: lamp on left, TV on right.
  if (state.lampOn) {
    const lamp = cx.createRadialGradient(
      r.x + r.w * 0.13, r.y + r.h * 0.68, 0,
      r.x + r.w * 0.13, r.y + r.h * 0.68, r.w * 0.24
    );
    lamp.addColorStop(0, 'rgba(255,190,105,0.075)');
    lamp.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = lamp;
    cx.fillRect(r.x, r.y, r.w, r.h);
  }

  if (state.tvOn) {
    const tv = cx.createRadialGradient(
      r.x + r.w * 0.83, r.y + r.h * 0.60, 0,
      r.x + r.w * 0.83, r.y + r.h * 0.60, r.w * 0.20
    );
    tv.addColorStop(0, 'rgba(120,200,255,0.055)');
    tv.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = tv;
    cx.fillRect(r.x, r.y, r.w, r.h);
  }

  // Soft top/bottom glass thickness.
  cx.globalCompositeOperation = 'source-over';
  const top = cx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.16);
  top.addColorStop(0, 'rgba(255,255,255,0.09)');
  top.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = top;
  cx.fillRect(r.x, r.y, r.w, r.h * 0.16);

  const bottom = cx.createLinearGradient(0, r.y + r.h * 0.78, 0, r.y + r.h);
  bottom.addColorStop(0, 'rgba(0,0,0,0)');
  bottom.addColorStop(1, 'rgba(0,0,0,0.14)');
  cx.fillStyle = bottom;
  cx.fillRect(r.x, r.y + r.h * 0.78, r.w, r.h * 0.22);

  cx.restore();
}

function drawFloorAndObjectPolishPass() {
  const t = state.t || 0;
  const tp = typeof timeProfile === 'function'
    ? timeProfile()
    : { day: 0, sunset: 0, night: 1 };
  const nightish = clamp(tp.night + tp.sunset * 0.65, 0, 1);

  cx.save();

  // Broad purple city/ceiling reflection across the polished floor.
  cx.globalCompositeOperation = 'screen';
  const floor = cx.createRadialGradient(
    RW * 0.52, RH * 0.65, 0,
    RW * 0.52, RH * 0.72, RW * 0.62
  );
  floor.addColorStop(0, `rgba(190,70,255,${0.075 * nightish})`);
  floor.addColorStop(0.45, `rgba(90,170,255,${0.032 * nightish})`);
  floor.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = floor;
  cx.fillRect(0, RH * 0.40, RW, RH * 0.60);

  // Table top premium sheen.
  if (layout.table) {
    const r = layout.table;
    cx.save();
    cx.beginPath();
    cx.rect(r.x + r.w * 0.08, r.y + r.h * 0.20, r.w * 0.84, r.h * 0.28);
    cx.clip();

    const sheen = cx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h * 0.32);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.40, 'rgba(255,170,255,0.055)');
    sheen.addColorStop(0.68, 'rgba(130,225,255,0.052)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = sheen;
    cx.fillRect(r.x, r.y, r.w, r.h * 0.44);

    // A tiny animated sparkle line, almost invisible.
    const sx = r.x + ((t * 10) % r.w);
    const sparkle = cx.createLinearGradient(sx - 24, 0, sx + 24, 0);
    sparkle.addColorStop(0, 'rgba(255,255,255,0)');
    sparkle.addColorStop(0.5, 'rgba(210,240,255,0.075)');
    sparkle.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = sparkle;
    cx.fillRect(sx - 24, r.y + r.h * 0.30, 48, 2);

    cx.restore();
  }

  // HiFi rack warm glow — amber from display/amp face spilling down
  if (layout.hifiGlowOrigin && layout.hifiGlowSpill) {
    const go = layout.hifiGlowOrigin;
    const gs = layout.hifiGlowSpill;
    const spillR = Math.hypot(gs.x - go.x, gs.y - go.y) * 1.8;
    cx.save();
    cx.globalCompositeOperation = 'screen';
    const hifiGlow = cx.createRadialGradient(go.x, go.y, 2, gs.x, gs.y, spillR);
    hifiGlow.addColorStop(0,    `rgba(255,190,100,${0.10 * nightish})`);
    hifiGlow.addColorStop(0.5,  `rgba(220,140, 60,${0.05 * nightish})`);
    hifiGlow.addColorStop(1,     'rgba(0,0,0,0)');
    cx.fillStyle = hifiGlow;
    cx.fillRect(go.x - spillR, go.y - spillR * 0.3, spillR * 2, spillR * 1.6);
    cx.restore();

    if (DEBUG_LAYOUT) {
      cx.save();
      cx.strokeStyle = 'rgba(255,190,100,.9)'; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(go.x, go.y, 5, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.arc(gs.x, gs.y, 5, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.moveTo(go.x, go.y); cx.lineTo(gs.x, gs.y); cx.stroke();
      cx.restore();
    }
  }

  cx.restore();
}

function drawMicroLifePass() {
  const t = state.t || 0;

  cx.save();
  cx.globalCompositeOperation = 'screen';

  // Dust motes in the lamp cone. Tiny, slow, warm.
  if (state.lampOn && layout.lamp) {
    const lx = layout.lamp.x + layout.lamp.w * 0.58;
    const ly = layout.lamp.y + layout.lamp.h * 0.45;
    for (let i = 0; i < 22; i++) {
      const p = (i * 37.17) % 1;
      const q = (i * 19.91) % 1;
      const dx = lx + 20 + p * 210 + Math.sin(t * 0.35 + i) * 6;
      const dy = ly + 20 + q * 165 + Math.cos(t * 0.27 + i * 0.7) * 5;
      const a = 0.025 + 0.025 * Math.sin(t * 0.8 + i);
      cx.fillStyle = `rgba(255,210,145,${Math.max(0, a)})`;
      cx.beginPath();
      cx.arc(dx, dy, 0.7 + (i % 3) * 0.25, 0, Math.PI * 2);
      cx.fill();
    }
  }

  // Hi-fi LED breathing dots.
  if (layout.rackKnobs) {
    const x = layout.rackKnobs.x;
    const y = layout.rackKnobs.y;
    const a = 0.22 + 0.14 * Math.sin(t * 1.8);
    cx.fillStyle = `rgba(120,210,255,${a})`;
    cx.beginPath();
    cx.arc(x - 72, y - 20, 1.4, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = `rgba(255,120,220,${a * 0.85})`;
    cx.beginPath();
    cx.arc(x - 56, y - 20, 1.2, 0, Math.PI * 2);
    cx.fill();
  }

  cx.restore();
}

function drawCinematicGradePass() {
  const tp = typeof timeProfile === 'function'
    ? timeProfile()
    : { day: 0, sunset: 0, night: 1 };
  const nightish = clamp(tp.night + tp.sunset * 0.55, 0, 1);

  cx.save();

  // 1. Grounding shadows — deep corners anchor the scene.
  cx.globalCompositeOperation = 'multiply';
  const vignette = cx.createRadialGradient(
    RW * 0.50, RH * 0.46, RH * 0.28,
    RW * 0.50, RH * 0.50, RH * 0.98
  );
  vignette.addColorStop(0,    'rgba(255,255,255,1)');
  vignette.addColorStop(0.55, 'rgba(228,224,238,1)');
  vignette.addColorStop(1,    'rgba( 88, 80,108,1)');
  cx.fillStyle = vignette;
  cx.fillRect(0, 0, RW, RH);

  // Extra shadow mass at very bottom — objects sit on the floor, not float.
  const floorShadow = cx.createLinearGradient(0, RH * 0.72, 0, RH);
  floorShadow.addColorStop(0, 'rgba(10,6,18,0)');
  floorShadow.addColorStop(1, `rgba(10,6,18,${0.28 + nightish * 0.12})`);
  cx.fillStyle = floorShadow;
  cx.fillRect(0, RH * 0.72, RW, RH * 0.28);

  // 2. Colour grade — cool purple shadows, warmer window zone.
  cx.globalCompositeOperation = 'soft-light';
  const grade = cx.createLinearGradient(0, 0, 0, RH);
  grade.addColorStop(0,    `rgba(55,28,90,${0.14 + nightish * 0.07})`);
  grade.addColorStop(0.42, `rgba(90,45,80,${0.04})`);
  grade.addColorStop(1,    `rgba(28,14,44,${0.10 + nightish * 0.05})`);
  cx.fillStyle = grade;
  cx.fillRect(0, 0, RW, RH);

  // 3. Lamp spill — warm bloom from lamp position into the room.
  if (state.lampOn && layout.lamp) {
    cx.globalCompositeOperation = 'screen';
    const lx = layout.lamp.x + layout.lamp.w * 0.55;
    const ly = layout.lamp.y + layout.lamp.h * 0.38;
    const lamp = cx.createRadialGradient(lx, ly, 0, lx, ly + 60, 220);
    lamp.addColorStop(0,   `rgba(255,200,130,${0.10 + nightish * 0.06})`);
    lamp.addColorStop(0.5, `rgba(255,170, 90,${0.04 + nightish * 0.03})`);
    lamp.addColorStop(1,    'rgba(0,0,0,0)');
    cx.fillStyle = lamp;
    cx.fillRect(lx - 220, ly - 40, 440, 320);
  }

  // 4. City light softening — very faint cool wash over window area only.
  cx.globalCompositeOperation = 'soft-light';
  const cityWash = cx.createLinearGradient(
    layout.win.x, layout.win.y,
    layout.win.x, layout.win.y + layout.win.h
  );
  cityWash.addColorStop(0, `rgba(80,100,160,${0.06 * nightish})`);
  cityWash.addColorStop(1, `rgba(60, 40,100,${0.04 * nightish})`);
  cx.fillStyle = cityWash;
  cx.fillRect(layout.win.x, layout.win.y, layout.win.w, layout.win.h);

  cx.restore();
}

function render(ts) {
  const dt = state.lastTs ? Math.min(0.033, (ts - state.lastTs) / 1000) : 0.016;
  state.lastTs = ts;
  state.t = ts / 1000;
  updateClock(dt);
  updateParticles(dt);
  updateMicroMotion(dt);

  const ssInfo = beginSupersampledRender();

  cx.clearRect(0, 0, RW, RH);
  resetCtx(); drawRoom();
  resetCtx(); drawWindowView(dt);
  resetCtx(); drawForegroundFrame();
  resetCtx(); drawWindowGlassRichnessPass();
  resetCtx(); drawLamp();
  resetCtx(); drawHifiRack();
  resetCtx(); drawRecordPlayer();
  resetCtx(); drawHeadphones();
  resetCtx(); drawChair();
  resetCtx(); drawTV();
  resetCtx(); drawTvCrtIntegrationPass();
  resetCtx(); drawTableAndProps();
  resetCtx(); drawCube();
  resetCtx(); drawReactiveLighting();
  resetCtx(); drawAtmosphere();
  resetCtx(); drawFloorAndObjectPolishPass();
  resetCtx(); drawMicroLifePass();
  resetCtx(); drawCinematicGradePass();

  // Contact shadow pass
  renderContactShadowPass();
  if (gfx.contactPreview && gfx.debug) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.fillStyle = '#1a1a1f'; cx.fillRect(0, 0, RW, RH);
    cx.drawImage(shadowCanvas, 0, 0);
    cx.restore();
  } else {
    resetCtx(); compositeContactShadows();
  }

  // Atmosphere pass — after shadows, before bloom
  renderAtmospherePass();
  if (gfx.atmospherePreview && gfx.debug && !gfx.contactPreview) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.fillStyle = '#0b0b10'; cx.fillRect(0, 0, RW, RH);
    cx.drawImage(airCanvas, 0, 0);
    cx.restore();
  } else if (!gfx.contactPreview) {
    resetCtx(); compositeAtmosphere();
  }

  // Light wrap pass — after atmosphere, before bloom
  renderLightWrapPass();
  if (gfx.lightWrapPreview && gfx.debug && !gfx.contactPreview && !gfx.atmospherePreview) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.fillStyle = '#090910'; cx.fillRect(0, 0, RW, RH);
    cx.drawImage(lightCanvas, 0, 0);
    cx.restore();
  } else if (!gfx.contactPreview && !gfx.atmospherePreview) {
    resetCtx(); compositeLightWrap();
  }

  // Material response pass — after light wrap, before bloom
  renderMaterialPass();
  if (gfx.materialPreview && gfx.debug && !gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.fillStyle = '#08080d'; cx.fillRect(0, 0, RW, RH);
    cx.drawImage(materialCanvas, 0, 0);
    cx.restore();
  } else if (!gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview) {
    resetCtx(); compositeMaterialResponse();
  }

  // Reflection pass — after material, before bloom
  renderReflectionPass();
  if (gfx.reflectionsPreview && gfx.debug && !gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.fillStyle = '#07070c'; cx.fillRect(0, 0, RW, RH);
    cx.drawImage(reflectionCanvas, 0, 0);
    cx.restore();
  } else if (!gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview) {
    resetCtx(); compositeReflections();
  }

  // Bloom — on top of everything
  renderBloomPass();
  if (gfx.bloomPreview && gfx.debug && !gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview && !gfx.reflectionsPreview) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.drawImage(glowCanvas, 0, 0);
    cx.restore();
  } else if (!gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview && !gfx.reflectionsPreview) {
    resetCtx(); compositeBloom();
  }

  // Colour grade — final pass, after bloom, before debug overlays
  renderColourGradePass();
  if (gfx.gradePreview && gfx.debug && !gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview && !gfx.reflectionsPreview && !gfx.bloomPreview) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.fillStyle = '#101014'; cx.fillRect(0, 0, RW, RH);
    cx.drawImage(gradeCanvas, 0, 0);
    cx.restore();
  } else if (!gfx.gradePreview) {
    resetCtx(); compositeColourGrade();
  }

  // Depth polish — after grade, before lens
  renderDepthPolishPass();
  if (gfx.depthPreview && gfx.debug && !gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview && !gfx.reflectionsPreview && !gfx.bloomPreview && !gfx.gradePreview) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.fillStyle = '#101014'; cx.fillRect(0, 0, RW, RH);
    cx.drawImage(depthCanvas, 0, 0, RW, RH);
    cx.restore();
  } else if (!gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview && !gfx.reflectionsPreview && !gfx.bloomPreview && !gfx.gradePreview) {
    resetCtx(); compositeDepthPolish();
  }

  // Lens treatment — final optical pass, after grade, before debug
  renderLensPass();
  if (gfx.lensPreview && gfx.debug && !gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview && !gfx.reflectionsPreview && !gfx.bloomPreview && !gfx.gradePreview && !gfx.depthPreview) {
    cx.save();
    resetLogicalTransform();
    cx.clearRect(0, 0, RW, RH);
    cx.fillStyle = '#101014'; cx.fillRect(0, 0, RW, RH);
    cx.drawImage(lensCanvas, 0, 0, RW, RH);
    cx.restore();
  } else if (!gfx.contactPreview && !gfx.atmospherePreview && !gfx.lightWrapPreview && !gfx.materialPreview && !gfx.reflectionsPreview && !gfx.bloomPreview && !gfx.gradePreview && !gfx.depthPreview) {
    resetCtx(); compositeLensTreatment();
  }

  resetCtx(); drawFocusHighlight();
  resetCtx(); drawDebugLayout();
  resetCtx(); drawScaleGuides();
  resetCtx(); drawGraphicsDebugOverlay();

  if (state.labelHold > 0) {
    state.labelHold -= dt;
    if (state.labelHold <= 0) UI.label.classList.remove('show');
  }

  endSupersampledRender(ssInfo);
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

  if (focusUiTimer) {
    clearTimeout(focusUiTimer);
    focusUiTimer = null;
  }

  if (state.focus) {
    const focusId = state.focus;
    const h = hotspots.find(s => s.id === focusId);

    if (h?.card && UI[h.card]) {
      focusUiTimer = setTimeout(() => {
        if (state.focus !== focusId) return;
        UI[h.card].classList.add('show');
      }, 420);
    }
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
  const c = hotspotCentre(h, 'focus');
  const s = h.zoom.s;
  const baseW = RW * SCALE;
  const baseH = RH * SCALE;
  const baseLeft = (innerWidth - baseW) / 2;
  const baseTop  = (innerHeight - baseH) / 2;
  const desiredX = innerWidth  * h.zoom.ax;
  const desiredY = innerHeight * h.zoom.ay;
  const tx = desiredX - baseLeft - c.x * SCALE * s;
  const ty = desiredY - baseTop  - c.y * SCALE * s;
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
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (RW / rect.width);
  const y = (clientY - rect.top)  * (RH / rect.height);

  if (DEBUG_LAYOUT) console.log(`hitTest: canvas px (${Math.round(x)}, ${Math.round(y)}) | rect w=${Math.round(rect.width)} left=${Math.round(rect.left)}`);

  // Specific objects first, then big background areas
  const priority = ['tv', 'holo', 'lamp', 'hifi', 'window'];
  for (const id of priority) {
    const h = hotspots.find(s => s.id === id);
    if (!h) continue;
    const r = hotspotRect(h, 'hit');
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return h;
  }
  return null;
}

canvas.addEventListener('mousemove', e => {
  state.hover = hitTest(e.clientX, e.clientY);
  canvas.style.cursor = state.hover ? 'pointer' : 'default';
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

  // Lamp always toggles immediately — no zoom
  if (hit.id === 'lamp') {
    state.lampOn = !state.lampOn;
    showLabel(state.lampOn ? '[ LAMP ON ]' : '[ LAMP OFF ]', '#ffe2bb');
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

  // Ctrl+Shift+G — toggle graphics debug
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') {
    gfx.debug = !gfx.debug;
    e.preventDefault();
    return;
  }

  // Graphics debug controls
  if (gfx.debug) {
    const k = e.key.toLowerCase();
    if (k === 'b')                      { gfx.bloom = !gfx.bloom; e.preventDefault(); return; }
    if (k === 'm')                      { gfx.bloomPreview = !gfx.bloomPreview; e.preventDefault(); return; }
    if (e.key === '[')                  { gfx.bloomStrength = Math.max(0, +(gfx.bloomStrength - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.key === ']')                  { gfx.bloomStrength = Math.min(1.5, +(gfx.bloomStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.key === '-' || e.key === '_') { gfx.bloomBlur = Math.max(0, gfx.bloomBlur - 2); e.preventDefault(); return; }
    if (e.key === '=' || e.key === '+') { gfx.bloomBlur = Math.min(48, gfx.bloomBlur + 2); e.preventDefault(); return; }
    if (e.key === '1') { gfx.sources.city   = !gfx.sources.city;   e.preventDefault(); return; }
    if (e.key === '2') { gfx.sources.window = !gfx.sources.window; e.preventDefault(); return; }
    if (e.key === '3') { gfx.sources.tv     = !gfx.sources.tv;     e.preventDefault(); return; }
    if (e.key === '4') { gfx.sources.holo   = !gfx.sources.holo;   e.preventDefault(); return; }
    if (e.key === '5') { gfx.sources.hifi   = !gfx.sources.hifi;   e.preventDefault(); return; }
    // Shadow controls
    if (k === 'c') { gfx.contactShadows = !gfx.contactShadows; e.preventDefault(); return; }
    if (k === 'v') { gfx.contactPreview = !gfx.contactPreview; e.preventDefault(); return; }
    if (e.key === ',') { gfx.contactStrength = Math.max(0, +(gfx.contactStrength - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.key === '.') { gfx.contactStrength = Math.min(1.5, +(gfx.contactStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.key === '<') { gfx.aoStrength = Math.max(0, +(gfx.aoStrength - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.key === '>') { gfx.aoStrength = Math.min(1.5, +(gfx.aoStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.key === '6') { gfx.shadows.chair = !gfx.shadows.chair; e.preventDefault(); return; }
    if (e.key === '7') { const v = !gfx.shadows.hifi; gfx.shadows.hifi = v; gfx.shadows.turntable = v; gfx.shadows.headphones = v; e.preventDefault(); return; }
    if (e.key === '8') { gfx.shadows.tv = !gfx.shadows.tv; e.preventDefault(); return; }
    if (e.key === '9') { const v = !gfx.shadows.table; gfx.shadows.table = v; gfx.shadows.mug = v; gfx.shadows.remote = v; gfx.shadows.books = v; gfx.shadows.holo = v; e.preventDefault(); return; }
    if (e.key === '0') { gfx.shadows.lamp = !gfx.shadows.lamp; e.preventDefault(); return; }
    // Atmosphere controls
    if (k === 'a') { gfx.atmosphere = !gfx.atmosphere; e.preventDefault(); return; }
    if (k === 'n') { gfx.atmospherePreview = !gfx.atmospherePreview; e.preventDefault(); return; }
    if (k === 'j') { gfx.floorHazeStrength = Math.max(0, +(gfx.floorHazeStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'k') { gfx.floorHazeStrength = Math.min(1.5, +(gfx.floorHazeStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'u') { gfx.midHazeStrength   = Math.max(0, +(gfx.midHazeStrength   - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'i') { gfx.midHazeStrength   = Math.min(1.5, +(gfx.midHazeStrength   + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'o') { gfx.backFogStrength   = Math.max(0, +(gfx.backFogStrength    - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'p') { gfx.backFogStrength   = Math.min(1.5, +(gfx.backFogStrength    + 0.02).toFixed(2)); e.preventDefault(); return; }
    // Light wrap controls
    if (k === 'r') { gfx.lightWrap = !gfx.lightWrap; e.preventDefault(); return; }
    if (k === 't') { gfx.lightWrapPreview = !gfx.lightWrapPreview; e.preventDefault(); return; }
    if (k === 'z') { gfx.wrapWindowStrength  = Math.max(0, +(gfx.wrapWindowStrength  - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'x') { gfx.wrapWindowStrength  = Math.min(1.5, +(gfx.wrapWindowStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'd') { gfx.wrapLampStrength    = Math.max(0, +(gfx.wrapLampStrength    - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'f') { gfx.wrapLampStrength    = Math.min(1.5, +(gfx.wrapLampStrength  + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'g') { gfx.wrapTvStrength      = Math.max(0, +(gfx.wrapTvStrength      - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'h') { gfx.wrapTvStrength      = Math.min(1.5, +(gfx.wrapTvStrength    + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'q') { gfx.wrapAmbientStrength = Math.max(0, +(gfx.wrapAmbientStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'w') { gfx.wrapAmbientStrength = Math.min(1.5, +(gfx.wrapAmbientStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (k === 'y') { const anyOff = Object.values(gfx.wraps).some(v => !v); Object.keys(gfx.wraps).forEach(k2 => gfx.wraps[k2] = anyOff); e.preventDefault(); return; }
    // Material response controls (Shift+ to avoid conflicts)
    if (k === 'e' && !e.shiftKey) { gfx.materialResponse = !gfx.materialResponse; e.preventDefault(); return; }
    if (k === 'l')                 { gfx.materialPreview = !gfx.materialPreview; e.preventDefault(); return; }
    if (e.shiftKey && k === 'm')   { gfx.materialStrength    = Math.max(0, +(gfx.materialStrength    - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 'n')   { gfx.materialStrength    = Math.min(1.5, +(gfx.materialStrength  + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 'w')   { gfx.woodSheenStrength   = Math.max(0, +(gfx.woodSheenStrength   - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 'e')   { gfx.woodSheenStrength   = Math.min(1.5, +(gfx.woodSheenStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 'g')   { gfx.glassSheenStrength  = Math.max(0, +(gfx.glassSheenStrength  - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 'h')   { gfx.glassSheenStrength  = Math.min(1.5, +(gfx.glassSheenStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 't')   { gfx.metalGlintStrength  = Math.max(0, +(gfx.metalGlintStrength  - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 'y')   { gfx.metalGlintStrength  = Math.min(1.5, +(gfx.metalGlintStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 'c')   { gfx.leatherSheenStrength = Math.max(0, +(gfx.leatherSheenStrength - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.shiftKey && k === 'v')   { gfx.leatherSheenStrength = Math.min(1.5, +(gfx.leatherSheenStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    // Reflection controls
    if (e.shiftKey && k === 'r') { gfx.reflections = !gfx.reflections; e.preventDefault(); return; }
    if (e.shiftKey && k === 'l') { gfx.reflectionsPreview = !gfx.reflectionsPreview; e.preventDefault(); return; }
    if (e.altKey && e.key === '1') { gfx.floorReflectionStrength = Math.max(0, +(gfx.floorReflectionStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '2') { gfx.floorReflectionStrength = Math.min(1.5, +(gfx.floorReflectionStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '3') { gfx.tableReflectionStrength = Math.max(0, +(gfx.tableReflectionStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '4') { gfx.tableReflectionStrength = Math.min(1.5, +(gfx.tableReflectionStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '5') { gfx.tvReflectionStrength   = Math.max(0, +(gfx.tvReflectionStrength   - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '6') { gfx.tvReflectionStrength   = Math.min(1.5, +(gfx.tvReflectionStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '7') { gfx.holoReflectionStrength = Math.max(0, +(gfx.holoReflectionStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '8') { gfx.holoReflectionStrength = Math.min(1.5, +(gfx.holoReflectionStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '9') { gfx.lampReflectionStrength = Math.max(0, +(gfx.lampReflectionStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '0') { gfx.lampReflectionStrength = Math.min(1.5, +(gfx.lampReflectionStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    // Colour grade controls
    if (e.shiftKey && k === 'g') { gfx.colourGrade = !gfx.colourGrade; e.preventDefault(); return; }
    if (e.shiftKey && k === 'p') { gfx.gradePreview = !gfx.gradePreview; e.preventDefault(); return; }
    if (e.altKey && k === 'q')  { gfx.gradeStrength      = Math.max(0, +(gfx.gradeStrength      - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'w')  { gfx.gradeStrength      = Math.min(1.5, +(gfx.gradeStrength    + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'a')  { gfx.contrastStrength   = Math.max(0, +(gfx.contrastStrength   - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 's')  { gfx.contrastStrength   = Math.min(1.5, +(gfx.contrastStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'z')  { gfx.shadowTintStrength = Math.max(0, +(gfx.shadowTintStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'x')  { gfx.shadowTintStrength = Math.min(1.5, +(gfx.shadowTintStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'c')  { gfx.warmMidStrength    = Math.max(0, +(gfx.warmMidStrength    - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'v')  { gfx.warmMidStrength    = Math.min(1.5, +(gfx.warmMidStrength  + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'b')  { gfx.cyanLiftStrength   = Math.max(0, +(gfx.cyanLiftStrength   - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'n')  { gfx.cyanLiftStrength   = Math.min(1.5, +(gfx.cyanLiftStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === ',')  { gfx.vignetteStrength   = Math.max(0, +(gfx.vignetteStrength   - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === '.')  { gfx.vignetteStrength   = Math.min(1.5, +(gfx.vignetteStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    // Supersampling controls
    if (e.shiftKey && k === 's') { gfx.supersampling = !gfx.supersampling; e.preventDefault(); return; }
    if (e.altKey && e.key === '[') { gfx.supersampleScale = Math.max(1, +(gfx.supersampleScale - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === ']') { gfx.supersampleScale = Math.min(2, +(gfx.supersampleScale + 0.05).toFixed(2)); e.preventDefault(); return; }
    // Lens treatment controls
    if (e.shiftKey && k === 'o') { gfx.lensTreatment = !gfx.lensTreatment; e.preventDefault(); return; }
    if (e.shiftKey && k === 'i') { gfx.lensPreview = !gfx.lensPreview; e.preventDefault(); return; }
    if (e.shiftKey && k === 'v') { gfx.scanTexture = !gfx.scanTexture; e.preventDefault(); return; }
    if (e.altKey && k === 'g')   { gfx.grainStrength    = Math.max(0, +(gfx.grainStrength    - 0.005).toFixed(3)); e.preventDefault(); return; }
    if (e.altKey && k === 'h')   { gfx.grainStrength    = Math.min(0.2, +(gfx.grainStrength  + 0.005).toFixed(3)); e.preventDefault(); return; }
    if (e.altKey && k === 'j')   { gfx.chromaStrength   = Math.max(0, +(gfx.chromaStrength   - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'k')   { gfx.chromaStrength   = Math.min(1.5, +(gfx.chromaStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'y')   { gfx.halationStrength = Math.max(0, +(gfx.halationStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'u')   { gfx.halationStrength = Math.min(1.0, +(gfx.halationStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
    // Micro-motion controls
    if (e.shiftKey && k === 'm') { gfx.microMotion = !gfx.microMotion; e.preventDefault(); return; }
    if (e.altKey && k === 'm')   { gfx.microMotionStrength       = Math.max(0, +(gfx.microMotionStrength       - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'n')   { gfx.microMotionStrength       = Math.min(1.5, +(gfx.microMotionStrength     + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'e')   { gfx.neonBreathStrength        = Math.max(0, +(gfx.neonBreathStrength        - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'r')   { gfx.neonBreathStrength        = Math.min(1.5, +(gfx.neonBreathStrength      + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'd')   { gfx.lampFlickerStrength       = Math.max(0, +(gfx.lampFlickerStrength       - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'f')   { gfx.lampFlickerStrength       = Math.min(1.5, +(gfx.lampFlickerStrength     + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 't')   { gfx.tvFlickerStrength         = Math.max(0, +(gfx.tvFlickerStrength         - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'y')   { gfx.tvFlickerStrength         = Math.min(1.5, +(gfx.tvFlickerStrength       + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'u')   { gfx.hazeDriftStrength         = Math.max(0, +(gfx.hazeDriftStrength         - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'i')   { gfx.hazeDriftStrength         = Math.min(1.5, +(gfx.hazeDriftStrength       + 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'o')   { gfx.reflectionShimmerStrength = Math.max(0, +(gfx.reflectionShimmerStrength - 0.05).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'p')   { gfx.reflectionShimmerStrength = Math.min(1.5, +(gfx.reflectionShimmerStrength + 0.05).toFixed(2)); e.preventDefault(); return; }
    // Depth polish controls
    if (e.shiftKey && k === 'd') { gfx.depthPolish = !gfx.depthPolish; e.preventDefault(); return; }
    if (e.shiftKey && k === 'b') { gfx.depthPreview = !gfx.depthPreview; e.preventDefault(); return; }
    if (e.altKey && k === 'd')   { gfx.depthStrength        = Math.max(0, +(gfx.depthStrength        - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'f')   { gfx.depthStrength        = Math.min(1.5, +(gfx.depthStrength      + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'z')   { gfx.backgroundSoftness   = Math.max(0, +(gfx.backgroundSoftness   - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'x')   { gfx.backgroundSoftness   = Math.min(1.5, +(gfx.backgroundSoftness + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'c')   { gfx.foregroundSoftness   = Math.max(0, +(gfx.foregroundSoftness   - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'v')   { gfx.foregroundSoftness   = Math.min(1.5, +(gfx.foregroundSoftness + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 'r')   { gfx.midgroundClarity     = Math.max(0, +(gfx.midgroundClarity     - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && k === 't')   { gfx.midgroundClarity     = Math.min(1.5, +(gfx.midgroundClarity   + 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === '[') { gfx.depthVignetteStrength = Math.max(0, +(gfx.depthVignetteStrength - 0.02).toFixed(2)); e.preventDefault(); return; }
    if (e.altKey && e.key === ']') { gfx.depthVignetteStrength = Math.min(1.5, +(gfx.depthVignetteStrength + 0.02).toFixed(2)); e.preventDefault(); return; }
  }

  // Backtick toggles the temporary layout editor on/off.
  if (e.key === '`') {
    e.preventDefault();
    if (e.shiftKey) {
      // Shift+` toggles scale guide mode
      DEBUG_SCALE = !DEBUG_SCALE;
      showLabel(DEBUG_SCALE ? '[ SCALE GUIDE ON ]' : '[ SCALE GUIDE OFF ]', '#ffffa8', 1);
      return;
    }    DEBUG_LAYOUT = !DEBUG_LAYOUT;
    console.log(`DEBUG_LAYOUT: ${DEBUG_LAYOUT ? 'ON' : 'OFF'}`);
    if (typeof showLabel === 'function') {
      showLabel(DEBUG_LAYOUT ? '[ DEBUG LAYOUT ON ]' : '[ DEBUG LAYOUT OFF ]', '#ffffa8', 1);
    }
    return;
  }

  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    DEBUG_SCALE = !DEBUG_SCALE;
    showLabel(DEBUG_SCALE ? '[ SCALE GUIDE ON ]' : '[ SCALE GUIDE OFF ]', '#ffffa8', 1);
    return;
  }
  if (DEBUG_SCALE) {
    const g = scaleGuides[scaleGuideIndex];
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'Tab')         { e.preventDefault(); scaleGuideIndex = (scaleGuideIndex + 1) % scaleGuides.length; return; }
    if (e.key === 'ArrowLeft')   { e.preventDefault(); g.x -= step; return; }
    if (e.key === 'ArrowRight')  { e.preventDefault(); g.x += step; return; }
    if (e.key === 'ArrowUp')     { e.preventDefault(); g.floorY -= step; return; }
    if (e.key === 'ArrowDown')   { e.preventDefault(); g.floorY += step; return; }
    if (e.key === '+' || e.key === '=') { g.scale = Math.min(2.5, +(g.scale + 0.01).toFixed(2)); return; }
    if (e.key === '-')           { g.scale = Math.max(0.3, +(g.scale - 0.01).toFixed(2)); return; }
  }

  if (!DEBUG_LAYOUT) return;

  const r = getDebugRect(debugTarget);
  if (!r) return;

  const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
  const step = e.altKey ? 10 : 1;

  if (e.key === 'Tab') {
    e.preventDefault();
    const i = debugTargets.indexOf(debugTarget);
    debugTarget = debugTargets[(i + 1) % debugTargets.length];
    console.log('Debug target:', debugTarget, getDebugRect(debugTarget));
    return;
  }

  if (e.key === 'c' || e.key === 'C') {
    const v = getDebugRect(debugTarget);
    const output = formatDebugLine(debugTarget, v);
    console.log(output);
    if (navigator.clipboard) navigator.clipboard.writeText(output).catch(() => {});
    if (typeof showLabel === 'function') showLabel(`[ COPIED ${debugTarget} ]`, '#ffffa8', 0.8);
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

// HUSH_STEP_4A_ESCAPE_HANDLER
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.focus) {
    e.preventDefault();
    setFocus(null);
  }
});
