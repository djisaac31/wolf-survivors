const lobby = document.getElementById('lobby');
const game = document.getElementById('game');
const canvas = document.getElementById('canvas');

const ui = {
  name: document.getElementById('name'),
  world: document.getElementById('world'),
  code: document.getElementById('code'),
  pvp: document.getElementById('pvp'),
  lifesteal: document.getElementById('lifesteal'),
  create: document.getElementById('create'),
  join: document.getElementById('join'),
  hudCode: document.getElementById('hudCode'),
  hudHp: document.getElementById('hudHp'),
  hudMoney: document.getElementById('hudMoney'),
  hudGun: document.getElementById('hudGun'),
  hudWood: document.getElementById('hudWood'),
  hudStone: document.getElementById('hudStone'),
  hudIron: document.getElementById('hudIron'),
  hudFood: document.getElementById('hudFood'),
  hudSeeds: document.getElementById('hudSeeds'),
  hudLoot: document.getElementById('hudLoot'),
  hudArmor: document.getElementById('hudArmor'),
  hudAmmo: document.getElementById('hudAmmo'),
  hudNight: document.getElementById('hudNight'),
  minimap: document.getElementById('minimap'),
  respawnOverlay: document.getElementById('respawnOverlay'),
  respawnText: document.getElementById('respawnText'),
  tradeMenu: document.getElementById('tradeMenu'),
  closeTrade: document.getElementById('closeTrade'),
  gunSelect: document.getElementById('gunSelect'),
  buyGun: document.getElementById('buyGun'),
  hotbar: document.getElementById('hotbar'),
  buildPanel: document.getElementById('buildPanel'),
  craftMenu: document.getElementById('craftMenu'),
  craftList: document.getElementById('craftList'),
  closeCraft: document.getElementById('closeCraft'),
  inviteLink: document.getElementById('inviteLink'),
  feed: document.getElementById('feed'),
  sell: document.getElementById('sell'),
  heal: document.getElementById('heal')
};

const slots = [
  { label: 'Glock', kind: 'gun', icon: 'G' },
  { label: 'Axe', kind: 'axe', icon: 'A' },
  { label: 'Wood Pick', kind: 'pickaxe', icon: 'P' },
  { label: 'Hammer', kind: 'hammer', icon: 'H' },
  { label: 'Seeds', kind: 'plant', icon: 'S' },
  { label: 'Wall', kind: 'build', buildType: 'wall', icon: '1' },
  { label: 'Spikes', kind: 'build', buildType: 'spikes', icon: '2' },
  { label: 'Gate', kind: 'build', buildType: 'gate', icon: '3' },
  { label: 'Tower', kind: 'build', buildType: 'tower', icon: '4' },
  { label: 'Platform', kind: 'build', buildType: 'platform', icon: '5' },
  { label: 'Trap', kind: 'build', buildType: 'trap', icon: '6' },
  { label: 'Fire', kind: 'build', buildType: 'campfire', icon: '7' },
  { label: 'Bench', kind: 'build', buildType: 'bench', icon: '8' }
];

const input = { up: false, down: false, left: false, right: false, sprint: false, shoot: false, shotId: 0, aimDown: false, reload: false, firstPerson: false };
let state = null;
let playerId = null;
let roomCode = null;
let selectedSlot = 0;
let buildMode = false;
let buildType = 'wall';
let upgradeTarget = 'stone';
let aim = -Math.PI / 2;
let buyRequest = null;
let buyItemRequest = null;
let craftRequest = null;
let sellRequest = false;
let healRequest = false;
let craftMenuOpen = false;
let tradeMenuOpen = false;
let mouse = { x: 0, y: 0 };
let shotCounter = 0;
let hotbarStateKey = '';
let lastFeedText = '';
let audioCtx = null;

let scene;
let camera;
let renderer;
let worldGroup;
let groundLayer;
let buildPreview;
let buildPreviewType = null;
let buildPreviewValid = null;
const objectMeshes = new Map();
const labelTextures = new Map();

function self() {
  return state?.players.find(p => p.id === playerId);
}

function playTone(type) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const settings = {
      shoot: [150, 0.035, 0.045],
      build: [330, 0.045, 0.035],
      trade: [560, 0.05, 0.03],
      hurt: [92, 0.07, 0.055],
      wave: [210, 0.12, 0.05],
      harvest: [680, 0.06, 0.035]
    }[type] || [440, 0.05, 0.03];
    osc.frequency.value = settings[0];
    gain.gain.value = settings[2];
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + settings[1]);
  } catch {
    audioCtx = null;
  }
}

function soundForEvent(text) {
  if (!text || text === lastFeedText) return;
  lastFeedText = text;
  if (/wave|Night/i.test(text)) playTone('wave');
  else if (/built|upgraded|repaired/i.test(text)) playTone('build');
  else if (/bought|sold|crafted/i.test(text)) playTone('trade');
  else if (/knocked down|damage/i.test(text)) playTone('hurt');
  else if (/harvested|picked up/i.test(text)) playTone('harvest');
}

function to3(entity, y = 0) {
  return [(entity.x - 1200) / 28, y, (entity.y - 1200) / 28];
}

function worldFromMouse() {
  if (!camera || !window.THREE) return null;
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((mouse.x - rect.left) / rect.width) * 2 - 1,
    -(((mouse.y - rect.top) / rect.height) * 2 - 1)
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, point);
  return { x: point.x * 28 + 1200, y: point.z * 28 + 1200 };
}

async function loadThree() {
  if (window.THREE) return true;
  try {
    window.THREE = await import('https://unpkg.com/three@0.149.0/build/three.module.js');
  } catch {
    window.THREE = null;
  }
  return Boolean(window.THREE);
}

async function init3d() {
  if (!(await loadThree())) {
    ui.feed.textContent = 'Three.js did not load. Check your internet connection and refresh.';
    return;
  }
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202723);
  scene.fog = new THREE.FogExp2(0x202723, 0.009);
  camera = new THREE.OrthographicCamera(-18, 18, 11, -11, 0.1, 140);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  scene.add(new THREE.HemisphereLight(0xcac3af, 0x1b221b, 0.82));
  const sun = new THREE.DirectionalLight(0xfff0c4, 1.25);
  sun.position.set(-20, 30, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160, 72, 72),
    new THREE.MeshLambertMaterial({ map: makeGroundTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  groundLayer = ground;

  makeOutpostScenery().forEach(mesh => scene.add(mesh));

  const outpost = new THREE.Mesh(
    new THREE.CircleGeometry(220 / 28, 48),
    new THREE.MeshBasicMaterial({ color: 0x77c98d, transparent: true, opacity: 0.18 })
  );
  outpost.rotation.x = -Math.PI / 2;
  outpost.position.set(...to3({ x: 310, y: 300 }, 0.015));
  scene.add(outpost);

  worldGroup = new THREE.Group();
  scene.add(worldGroup);
  resize();
}

function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const cx = c.getContext('2d');
  cx.fillStyle = '#33452f';
  cx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 6500; i++) {
    const v = 32 + Math.random() * 46;
    const alpha = 0.06 + Math.random() * 0.08;
    cx.fillStyle = `rgba(${v},${60 + Math.random() * 34},${38 + Math.random() * 24},${alpha})`;
    cx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  cx.strokeStyle = 'rgba(14,17,14,.18)';
  cx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    cx.beginPath();
    cx.moveTo(i, 0);
    cx.lineTo(i, 512);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(0, i);
    cx.lineTo(512, i);
    cx.stroke();
  }
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function addFlatRect(group, x, z, w, h, color, opacity = 1) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.025, z);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function makeOutpostScenery() {
  const g = new THREE.Group();
  g.position.set(...to3({ x: 310, y: 300 }, 0));
  addFlatRect(g, 0, 0, 13, 8.5, 0x4d493e, 0.62);
  addFlatRect(g, 4.2, 0, 2.2, 20, 0x49453c, 0.56);
  addFlatRect(g, -1.5, -4.9, 9.5, 2.2, 0x5b513f, 0.42);
  const cabinMat = material(0x594b3b);
  const roofMat = material(0x2e302d);
  for (const [x, z] of [[-3.2, -2.2], [-2.7, 2.1]]) {
    const cabin = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.7), cabinMat);
    base.position.y = 0.55;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.32, 1.95), roofMat);
    roof.position.y = 1.28;
    cabin.add(base, roof);
    cabin.position.set(x, 0, z);
    cabin.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    g.add(cabin);
  }
  const fenceMat = material(0x6a5841);
  for (let i = -6; i <= 6; i += 1.3) {
    for (const z of [-4.4, 4.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.12), fenceMat);
      rail.position.set(i, 0.36, z);
      rail.castShadow = true;
      g.add(rail);
    }
  }
  g.traverse(child => {
    if (child.isMesh) child.receiveShadow = true;
  });
  return [g];
}

function resize() {
  if (!renderer || !camera) return;
  const aspect = window.innerWidth / window.innerHeight;
  const view = window.innerWidth < 760 ? 12.5 : 15;
  camera.left = -view * aspect;
  camera.right = view * aspect;
  camera.top = view;
  camera.bottom = -view;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

function material(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function setGhostMaterial(root, valid) {
  const color = valid ? 0x77c98d : 0xd05555;
  root.traverse(child => {
    if (child.isMesh) {
      child.material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.44,
        depthWrite: false
      });
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
}

function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.8, 10), material(0x5b3f2f));
  trunk.position.y = 0.9;
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 10), material(0x2d6b3d));
  top.position.y = 1.95;
  trunk.castShadow = true;
  top.castShadow = true;
  g.add(trunk, top);
  return g;
}

function makeRock(iron) {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), material(iron ? 0x8fa1a2 : 0x77736a));
  mesh.scale.set(1.15, 0.68, 0.9);
  mesh.position.y = 0.38;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeWolf(den) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 1.55), material(den ? 0x3d1f25 : 0x4d4f54));
  body.position.y = 0.62;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.65), material(den ? 0x4f2630 : 0x5d6065));
  head.position.set(0, 0.86, -0.98);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd05555 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeMat);
  const e2 = e1.clone();
  e1.position.set(-0.17, 0.94, -1.34);
  e2.position.set(0.17, 0.94, -1.34);
  g.add(body, head, e1, e2);
  if (den) g.scale.setScalar(1.35);
  g.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });
  return g;
}

function makeBuilding(type, matName) {
  const colors = { wood: 0x8b623f, stone: 0x858278, iron: 0x9aa4a8 };
  const mat = material(colors[matName] || colors.wood);
  const g = new THREE.Group();
  if (type === 'spikes' || type === 'trap') {
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(type === 'trap' ? 0.22 : 0.16, type === 'trap' ? 0.75 : 1.2, 4), mat);
      spike.position.set(i * 0.35, type === 'trap' ? 0.35 : 0.6, 0);
      spike.rotation.z = Math.PI / 9;
      g.add(spike);
    }
  } else if (type === 'gate') {
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.35, 0.28), mat);
    const right = left.clone();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.24, 0.24), mat);
    left.position.set(-1.08, 0.68, 0);
    right.position.set(1.08, 0.68, 0);
    top.position.set(0, 1.35, 0);
    g.add(left, right, top);
  } else if (type === 'tower') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1.7), mat);
    deck.position.y = 2.1;
    g.add(deck);
    for (const x of [-0.68, 0.68]) {
      for (const z of [-0.68, 0.68]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.1, 0.16), mat);
        leg.position.set(x, 1.05, z);
        g.add(leg);
      }
    }
  } else if (type === 'platform') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.55), mat);
    deck.position.y = 0.78;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.16), mat);
    rail.position.set(0, 1.2, -0.72);
    g.add(deck, rail);
  } else if (type === 'campfire') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 16), material(0x858278));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.85, 10), new THREE.MeshBasicMaterial({ color: 0xe88273 }));
    flame.position.y = 0.48;
    g.add(ring, flame);
  } else if (type === 'bench') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.75), mat);
    top.position.y = 0.82;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.5), material(0x5b3f2f));
    base.position.y = 0.38;
    g.add(top, base);
  } else {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.35, 0.32), mat);
    wall.position.y = 0.68;
    g.add(wall);
  }
  g.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return g;
}

function makeSurvivor() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.55), material(0x77c98d));
  body.position.y = 0.8;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), material(0xf5d19a));
  head.position.y = 1.72;
  const post = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.18, 0.18), material(0xe0c15a));
  post.position.set(0, 2.35, 0);
  g.add(body, head, post);
  g.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });
  return g;
}

function makeCrate() {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material(0x8b623f));
  mesh.position.y = 0.4;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeLoot() {
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), material(0xe0c15a));
  mesh.position.y = 0.34;
  return mesh;
}

function makeBullet() {
  const g = new THREE.Group();
  const tracer = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.72),
    new THREE.MeshBasicMaterial({ color: 0xfff0a8 })
  );
  tracer.position.y = 0.52;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd36b })
  );
  glow.position.set(0, 0.52, -0.34);
  g.add(tracer, glow);
  return g;
}

function makeCrop(stage) {
  const g = new THREE.Group();
  const ready = stage >= 1;
  const stemMat = material(ready ? 0x77c98d : stage > 0.45 ? 0x5fa65d : 0x4f8c54);
  const height = ready ? 0.82 : stage > 0.45 ? 0.55 : 0.28;
  const count = ready ? 7 : stage > 0.45 ? 5 : 3;
  for (let i = 0; i < count; i++) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, height, 6), stemMat);
    stem.position.set((i - (count - 1) / 2) * 0.12, height / 2, Math.sin(i) * 0.09);
    g.add(stem);
  }
  if (ready) {
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), material(0xe0c15a));
    food.position.y = 0.82;
    g.add(food);
  }
  g.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });
  return g;
}

function makeDen() {
  const g = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(2.1, 20, 12), material(0x2b2022));
  mound.scale.y = 0.75;
  mound.position.y = 0.78;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.82, 0.25), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  mouth.position.set(0, 0.62, -1.9);
  g.add(mound, mouth);
  g.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });
  return g;
}

function makeNameSprite(text, isSelf) {
  const key = `${isSelf ? 'self' : 'other'}:${text}`;
  if (!labelTextures.has(key)) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const cx = c.getContext('2d');
    cx.fillStyle = isSelf ? 'rgba(224,193,90,.92)' : 'rgba(9,11,10,.82)';
    cx.strokeStyle = 'rgba(255,255,255,.7)';
    cx.lineWidth = 3;
    roundedRect(cx, 8, 10, 240, 42, 12);
    cx.fill();
    cx.stroke();
    cx.fillStyle = isSelf ? '#191713' : '#f4f0e8';
    cx.font = '800 22px system-ui';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(isSelf ? `${text} (you)` : text, 128, 32, 220);
    const texture = new THREE.CanvasTexture(c);
    labelTextures.set(key, texture);
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTextures.get(key), transparent: true }));
  sprite.scale.set(isSelf ? 2.8 : 2.25, isSelf ? 0.7 : 0.56, 1);
  sprite.position.y = isSelf ? 2.25 : 2.05;
  return sprite;
}

function roundedRect(cx, x, y, w, h, r) {
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.lineTo(x + w - r, y);
  cx.quadraticCurveTo(x + w, y, x + w, y + r);
  cx.lineTo(x + w, y + h - r);
  cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  cx.lineTo(x + r, y + h);
  cx.quadraticCurveTo(x, y + h, x, y + h - r);
  cx.lineTo(x, y + r);
  cx.quadraticCurveTo(x, y, x + r, y);
  cx.closePath();
}

function makePlayerMesh(player) {
  const g = new THREE.Group();
  const isSelf = player.id === playerId;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.72, 6, 12), material(isSelf ? 0xeee5d1 : 0xded4c1));
  body.position.y = 0.78;
  body.rotation.x = Math.PI / 2;
  const wool = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 12), material(isSelf ? 0xf6eedf : 0xded6c8));
  wool.position.set(0, 0.98, 0.08);
  wool.scale.set(1.05, 0.82, 0.9);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), material(0xc49b68));
  face.position.set(0, 1, -0.42);
  const earMat = material(0x3b2a20);
  const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), earMat);
  const rightEar = leftEar.clone();
  leftEar.position.set(-0.24, 0.96, -0.45);
  rightEar.position.set(0.24, 0.96, -0.45);
  leftEar.scale.set(0.7, 1.4, 0.7);
  rightEar.scale.set(0.7, 1.4, 0.7);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.7), material(0x191713));
  gun.position.set(0.28, 0.78, -0.58);
  const armorColor = player.armor === 'iron' ? 0x9aa4a8 : player.armor === 'wool' ? 0xcfc7b6 : null;
  const armorPlate = armorColor ? new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.34, 0.78), material(armorColor)) : null;
  if (armorPlate) armorPlate.position.set(0, 0.95, 0.1);
  const ring = isSelf ? new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: 0xe0c15a })) : null;
  if (ring) {
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.035;
  }
  const label = makeNameSprite(player.name, isSelf);
  g.add(body, wool, face, leftEar, rightEar, gun, label);
  if (armorPlate) g.add(armorPlate);
  if (ring) g.add(ring);
  g.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });
  return g;
}

function upsert(id, factory, entity, y = 0) {
  let mesh = objectMeshes.get(id);
  if (!mesh) {
    mesh = factory();
    objectMeshes.set(id, mesh);
    worldGroup.add(mesh);
  }
  mesh.position.set(...to3(entity, y));
  return mesh;
}

function syncWorld() {
  if (!state || !worldGroup) return;
  const seen = new Set();
  const add = (id, factory, entity, y = 0) => {
    seen.add(id);
    return upsert(id, factory, entity, y);
  };
  add('survivor', makeSurvivor, state.room.survivor);
  add('den', makeDen, state.room.den);
  (state.trees || []).forEach(e => add(e.id, makeTree, e));
  (state.rocks || []).forEach(e => add(e.id, () => makeRock(e.iron), e));
  (state.crates || []).filter(e => !e.opened).forEach(e => add(e.id, makeCrate, e));
  (state.loot || []).forEach(e => add(e.id, makeLoot, e));
  (state.bullets || []).forEach(e => {
    const mesh = add(e.id, makeBullet, e);
    mesh.rotation.y = -Math.atan2(e.vy, e.vx) - Math.PI / 2;
  });
  (state.crops || []).forEach(e => {
    const stage = Math.min(1, Math.max(0, (Date.now() - e.plantedAt) / e.growthMs));
    const mesh = add(e.id, () => makeCrop(stage), e);
    const bucket = stage >= 1 ? 2 : stage > 0.45 ? 1 : 0;
    if (mesh.userData.stageBucket !== bucket) {
      worldGroup.remove(mesh);
      objectMeshes.delete(e.id);
      const refreshed = add(e.id, () => makeCrop(stage), e);
      refreshed.userData.stageBucket = bucket;
    }
  });
  (state.wolves || []).forEach(e => {
    const mesh = add(e.id, () => makeWolf(e.den), e);
    const me = self();
    if (me) mesh.lookAt(...to3(me, 0.7));
  });
  (state.buildings || []).forEach(e => {
    const mesh = add(e.id, () => makeBuilding(e.type, e.material), e);
    mesh.rotation.y = -e.angle;
  });
  (state.players || []).forEach(e => {
    const mesh = add(e.id, () => makePlayerMesh(e), e);
    if (mesh.userData.armor !== e.armor || mesh.userData.name !== e.name) {
      worldGroup.remove(mesh);
      objectMeshes.delete(e.id);
      const refreshed = add(e.id, () => makePlayerMesh(e), e);
      refreshed.userData.armor = e.armor;
      refreshed.userData.name = e.name;
      refreshed.rotation.y = -e.aim;
      return;
    }
    mesh.userData.armor = e.armor;
    mesh.userData.name = e.name;
    mesh.rotation.y = -e.aim;
  });
  for (const [id, mesh] of objectMeshes) {
    if (!seen.has(id)) {
      worldGroup.remove(mesh);
      objectMeshes.delete(id);
    }
  }
}

function canPreviewBuild(point) {
  const me = self();
  const spec = state?.buildTypes?.[buildType];
  if (!me || !spec || !point) return false;
  if (Math.hypot(point.x - me.x, point.y - me.y) > 175) return false;
  if (Math.hypot(point.x - state.room.survivor.x, point.y - state.room.survivor.y) < (state.outpostRadius || 220)) return false;
  if (Math.hypot(point.x - state.room.den.x, point.y - state.room.den.y) < 130) return false;
  if ((state.buildings || []).some(b => Math.hypot(point.x - b.x, point.y - b.y) < 52)) return false;
  if ((state.players || []).some(p => Math.hypot(point.x - p.x, point.y - p.y) < 42)) return false;
  return me.wood >= (spec.wood || 0) && me.stone >= (spec.stone || 0) && me.iron >= (spec.iron || 0);
}

function updateBuildPreview() {
  if (!worldGroup || !state) return;
  const slot = selected();
  const point = worldFromMouse();
  const active = buildMode && slot.kind === 'build' && point;
  if (!active) {
    if (buildPreview) buildPreview.visible = false;
    return;
  }
  if (!buildPreview || buildPreviewType !== buildType) {
    if (buildPreview) worldGroup.remove(buildPreview);
    buildPreview = makeBuilding(buildType, 'wood');
    buildPreviewType = buildType;
    buildPreviewValid = null;
    worldGroup.add(buildPreview);
  }
  const valid = canPreviewBuild(point);
  if (buildPreviewValid !== valid) {
    setGhostMaterial(buildPreview, valid);
    buildPreviewValid = valid;
  }
  buildPreview.visible = true;
  buildPreview.position.set(...to3(point, 0.035));
  buildPreview.rotation.y = -aim;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function createRoom() {
  const data = await api('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ pvp: ui.pvp.checked, lifesteal: ui.lifesteal.checked, name: ui.name.value, worldName: ui.world.value })
  });
  enterGame(data);
}

async function joinRoom() {
  const code = ui.code.value.trim().toUpperCase();
  if (!code) return;
  enterGame(await api(`/api/rooms/${code}/join`, { method: 'POST', body: JSON.stringify({ name: ui.name.value }) }));
}

function enterGame(data) {
  playerId = data.playerId;
  roomCode = data.code;
  state = data.state;
  lobby.hidden = true;
  game.hidden = false;
  ui.hudCode.textContent = roomCode;
  history.replaceState(null, '', `/?room=${roomCode}`);
  init3d();
  renderHotbar();
}

ui.create.addEventListener('click', () => createRoom().catch(err => alert(err.message)));
ui.join.addEventListener('click', () => joinRoom().catch(err => alert(err.message)));
ui.code.value = new URLSearchParams(location.search).get('room') || '';
ui.buyGun?.addEventListener('click', () => {
  buyRequest = ui.gunSelect?.value || 'glock';
  selectSlot(0);
});
document.querySelectorAll('[data-buy-item]').forEach(button => button.addEventListener('click', () => buyItemRequest = button.dataset.buyItem));
ui.sell.addEventListener('click', () => sellRequest = true);
ui.heal.addEventListener('click', () => healRequest = true);
ui.closeTrade?.addEventListener('click', () => tradeMenuOpen = false);
ui.inviteLink?.addEventListener('click', async () => {
  copyInviteLink();
});
ui.hudCode?.addEventListener('click', async () => {
  copyInviteLink();
});

async function copyInviteLink() {
  const link = `${location.origin}${location.pathname}?room=${roomCode}`;
  try {
    await navigator.clipboard.writeText(link);
    ui.feed.textContent = 'Invite link copied.';
  } catch {
    ui.feed.textContent = link;
  }
}
ui.closeCraft?.addEventListener('click', () => {
  craftMenuOpen = false;
  renderCraftMenu();
});

function selected() {
  return slots[selectedSlot] || slots[0];
}

function hotbarSlotView(slot, me) {
  if (slot.kind !== 'gun') return slot;
  const gun = state?.guns?.[me?.gun || 'glock'];
  const name = gun?.name || slot.label;
  return { ...slot, label: name, icon: name.slice(0, 1).toUpperCase() };
}

function renderHotbar() {
  if (!ui.hotbar) return;
  const me = self();
  const nextKey = `${selectedSlot}:${me?.gun}:${me?.hasHammer}:${me?.hasPickaxe}`;
  if (nextKey === hotbarStateKey && ui.hotbar.children.length) return;
  hotbarStateKey = nextKey;
  ui.hotbar.innerHTML = slots.map((slot, index) => {
    const view = hotbarSlotView(slot, me);
    const active = index === selectedSlot ? ' active' : '';
    const locked = (slot.kind === 'hammer' && !me?.hasHammer) || (slot.kind === 'pickaxe' && !me?.hasPickaxe) ? ' locked' : '';
    return `<button class="slot${active}${locked}" data-slot="${index}"><span>${index + 1}</span><strong>${view.icon}</strong><em>${view.label}</em></button>`;
  }).join('');
  ui.hotbar.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => selectSlot(Number(button.dataset.slot)));
  });
}

function renderGunShop() {
  if (!ui.gunSelect || !state?.guns) return;
  const me = self();
  const selectedGun = ui.gunSelect.value || me?.gun || 'glock';
  ui.gunSelect.innerHTML = Object.entries(state.guns).sort(([a], [b]) => {
    const aOwned = me?.ownedGuns?.includes(a) ? 0 : 1;
    const bOwned = me?.ownedGuns?.includes(b) ? 0 : 1;
    return aOwned - bOwned || state.guns[a].price - state.guns[b].price;
  }).map(([id, gun]) => (
    `<option value="${id}">${gun.name} - $${me?.ownedGuns?.includes(id) ? 0 : gun.price}${me?.ownedGuns?.includes(id) ? ' owned' : ''}</option>`
  )).join('');
  if (state.guns[selectedGun]) ui.gunSelect.value = selectedGun;
  if (ui.buyGun) {
    const selectedId = ui.gunSelect.value || me?.gun || 'glock';
    ui.buyGun.textContent = me?.ownedGuns?.includes(selectedId) ? 'Equip Gun' : 'Buy Gun';
  }
}

function recipeCost(recipe) {
  const parts = [];
  if (recipe.wood) parts.push(`wood ${recipe.wood}`);
  if (recipe.stone) parts.push(`stone ${recipe.stone}`);
  if (recipe.iron) parts.push(`iron ${recipe.iron}`);
  if (recipe.foodCost) parts.push(`food ${recipe.foodCost}`);
  return parts.join(' + ') || 'free';
}

function renderCraftMenu() {
  if (!ui.craftMenu || !ui.craftList || !state) return;
  ui.craftMenu.hidden = !craftMenuOpen;
  const recipes = state.craftRecipes || {};
  ui.craftList.innerHTML = Object.entries(recipes).map(([id, recipe]) => `
    <div class="craft-row">
      <div><strong>${recipe.name}</strong><span>${recipeCost(recipe)}</span></div>
      <button type="button" data-craft="${id}">Craft</button>
    </div>
  `).join('');
  ui.craftList.querySelectorAll('[data-craft]').forEach(button => {
    button.addEventListener('click', () => {
      craftRequest = button.dataset.craft;
      craftMenuOpen = false;
      renderCraftMenu();
    });
  });
}

function selectSlot(index) {
  selectedSlot = Math.max(0, Math.min(slots.length - 1, index));
  const slot = selected();
  if (slot.kind === 'build') {
    buildMode = true;
    buildType = slot.buildType;
  } else {
    buildMode = false;
  }
  renderHotbar();
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'arrowup') input.up = true;
  if (key === 's' || key === 'arrowdown') input.down = true;
  if (key === 'a' || key === 'arrowleft') input.left = true;
  if (key === 'd' || key === 'arrowright') input.right = true;
  if (key === 'shift') input.sprint = true;
  if (key === 'e') {
    craftMenuOpen = !craftMenuOpen;
    renderCraftMenu();
  }
  if (key === 'h') healRequest = true;
  if (key === 'r') input.reload = true;
  if (key === 'c') craftRequest = 'hammer';
  if (key === 'p') craftRequest = 'pickaxe';
  if (key === 'u') upgradeTarget = upgradeTarget === 'stone' ? 'iron' : 'stone';
  if (key === 'b') {
    if (buildMode) {
      buildMode = false;
      selectSlot(0);
    } else {
      selectSlot(5);
    }
  }
  if (/^[1-9]$/.test(key)) {
    const n = Number(key);
    const buildKeys = ['wall', 'spikes', 'gate', 'tower', 'platform', 'trap', 'campfire', 'bench'];
    if (buildMode && n <= buildKeys.length) {
      buildType = buildKeys[n - 1];
      selectSlot(5 + n - 1);
    } else selectSlot(n - 1);
  }
});

window.addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'arrowup') input.up = false;
  if (key === 's' || key === 'arrowdown') input.down = false;
  if (key === 'a' || key === 'arrowleft') input.left = false;
  if (key === 'd' || key === 'arrowright') input.right = false;
  if (key === 'shift') input.sprint = false;
  if (key === 'r') input.reload = false;
});

canvas.addEventListener('mousemove', event => {
  mouse = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('mousedown', event => {
  const me = self();
  if (!me || !state) return;
  if (event.button === 2) {
    input.aimDown = true;
    return;
  }
  if (event.button !== 0) return;
  const point = worldFromMouse();
  if (!buildMode && point && selected().kind !== 'gun' && Math.hypot(point.x - state.room.survivor.x, point.y - state.room.survivor.y) < 55 && Math.hypot(me.x - state.room.survivor.x, me.y - state.room.survivor.y) < 125) {
    tradeMenuOpen = true;
    return;
  }
  input.shoot = true;
  input.shotId = ++shotCounter;
  if (selected().kind === 'gun') playTone('shoot');
});
window.addEventListener('mouseup', event => {
  if (event.button === 0) input.shoot = false;
  if (event.button === 2) input.aimDown = false;
});
window.addEventListener('wheel', event => {
  selectSlot((selectedSlot + (event.deltaY > 0 ? 1 : -1) + slots.length) % slots.length);
}, { passive: true });

async function sendInput() {
  if (!roomCode || !playerId || !state) return;
  const me = self();
  const point = worldFromMouse();
  if (me && point) aim = Math.atan2(point.y - me.y, point.x - me.x);
  const slot = selected();
  const placingBuild = buildMode && slot.kind === 'build';
  const payload = {
    ...input,
    aim,
    mode: placingBuild ? 'build' : 'use',
    buildType,
    buildTarget: placingBuild && point ? { x: point.x, y: point.y } : null,
    plantTarget: slot.kind === 'plant' && point ? { x: point.x, y: point.y } : null,
    tool: slot.kind,
    upgradeTarget,
    buy: buyRequest,
    buyItem: buyItemRequest,
    sell: sellRequest,
    heal: healRequest,
    craft: craftRequest
  };
  input.reload = false;
  buyRequest = null;
  buyItemRequest = null;
  sellRequest = false;
  healRequest = false;
  craftRequest = null;
  try {
    state = (await api(`/api/rooms/${roomCode}/input`, {
      method: 'POST',
      body: JSON.stringify({ playerId, input: payload })
    })).state;
  } catch (err) {
    ui.feed.textContent = err.message;
  }
}
setInterval(sendInput, 70);

function updateCamera() {
  const me = self();
  if (!me || !camera) return;
  const [x, , z] = to3(me, 0);
  camera.position.set(x + 10.5, 18, z + 10.5);
  camera.lookAt(x, 0, z);
}

function drawMinimap() {
  if (!ui.minimap || !state) return;
  const ctx = ui.minimap.getContext('2d');
  const size = ui.minimap.width;
  const scale = size / 2400;
  const dot = (entity, color, radius = 3) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(entity.x * scale, entity.y * scale, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(25, 31, 28, .94)';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  dot(state.room.survivor, '#77c98d', 5);
  dot(state.room.den, '#d05555', 6);
  (state.buildings || []).forEach(b => dot(b, b.owner === playerId ? '#e0c15a' : '#a9a9a9', 2.4));
  (state.wolves || []).forEach(w => dot(w, w.den ? '#ff6b6b' : '#a83d45', w.den ? 3.5 : 2.2));
  (state.players || []).forEach(p => dot(p, p.id === playerId ? '#ffffff' : '#69a7ff', p.id === playerId ? 4 : 3));
  ctx.fillStyle = '#f4f0e8';
  ctx.font = '700 10px system-ui';
  ctx.fillText('Outpost', state.room.survivor.x * scale + 6, state.room.survivor.y * scale + 3);
  ctx.fillText('Den', state.room.den.x * scale - 20, state.room.den.y * scale - 8);
}

function updateHud() {
  const me = self();
  if (!me || !state) return;
  ui.hudCode.textContent = roomCode;
  ui.hudHp.textContent = `${Math.ceil(me.hp)}/${Math.round(me.maxHp)}`;
  ui.hudMoney.textContent = `${Math.floor(me.money)}`;
  const gun = state.guns[me.gun] || {};
  const reloadText = me.reloading ? `reloading ${Math.ceil((me.reloadMsLeft || 0) / 1000)}s` : `${me.ammo ?? gun.mag ?? 0}/${gun.mag ?? 0}`;
  ui.hudGun.textContent = `${gun.name || me.gun} ${reloadText}`;
  ui.hudAmmo.textContent = `${gun.ammoType || 'ammo'} ${me.ammoReserve?.[gun.ammoType] ?? 0}`;
  ui.hudArmor.textContent = me.armor === 'iron' ? 'Iron' : me.armor === 'wool' ? 'Wool' : 'None';
  ui.hudNight.textContent = `${state.room.night || 1}`;
  ui.hudWood.textContent = `${Math.floor(me.wood || 0)}`;
  ui.hudStone.textContent = `${Math.floor(me.stone || 0)}`;
  ui.hudIron.textContent = `${Math.floor(me.iron || 0)}`;
  ui.hudFood.textContent = `${Math.floor(me.food || 0)}`;
  ui.hudSeeds.textContent = `${Math.floor(me.seeds || 0)}`;
  ui.hudLoot.textContent = `${me.inventory.length}`;
  const feedText = state.room.events.slice(-1)[0] || '';
  ui.feed.textContent = feedText;
  soundForEvent(feedText);
  ui.respawnOverlay.hidden = !me.downed;
  if (me.downed) ui.respawnText.textContent = 'You will respawn at the outpost in a few seconds.';
  renderHotbar();
  renderGunShop();
  ui.tradeMenu.hidden = !tradeMenuOpen;
  const mode = buildMode ? `Build: ${buildType}` : hotbarSlotView(selected(), me).label;
  ui.buildPanel.textContent = selected().kind === 'plant'
    ? `${mode} | left click ground to plant | walk over grown crops to harvest`
    : `${mode} | green preview can build | red blocked | left click place | B build | E craft`;
  renderCraftMenu();
  drawMinimap();
}

function animate() {
  requestAnimationFrame(animate);
  if (!state || !renderer || !camera) return;
  syncWorld();
  updateBuildPreview();
  updateCamera();
  updateHud();
  renderer.render(scene, camera);
}
animate();
