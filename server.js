const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4190);
const PUBLIC_DIR = path.join(__dirname, 'public');
const TICK_RATE = 12;
const ROOM_TTL_MS = 1000 * 60 * 60 * 3;
const WAVE_MS = 1000 * 60 * 2;

const GUNS = {
  glock: { name: 'Glock', price: 0, damage: 24, range: 520, cooldown: 430, speed: 820, spread: 0.07, mag: 15, reloadMs: 1350, ammoType: 'light' },
  pistol: { name: 'Pistol', price: 0, damage: 24, range: 520, cooldown: 430, speed: 820, spread: 0.07, mag: 15, reloadMs: 1350, ammoType: 'light' },
  revolver: { name: 'Revolver', price: 140, damage: 34, range: 380, cooldown: 650, speed: 790, spread: 0.055, mag: 6, reloadMs: 1850, ammoType: 'light' },
  deagle: { name: 'Desert Eagle', price: 240, damage: 46, range: 430, cooldown: 760, speed: 850, spread: 0.045, mag: 7, reloadMs: 1650, ammoType: 'heavy' },
  machine_pistol: { name: 'Machine Pistol', price: 190, damage: 9, range: 280, cooldown: 80, speed: 660, spread: 0.22, mag: 24, reloadMs: 1700, ammoType: 'light' },
  smg: { name: 'SMG', price: 150, damage: 10, range: 310, cooldown: 105, speed: 690, spread: 0.18, mag: 30, reloadMs: 1750, ammoType: 'light' },
  mp5: { name: 'MP5', price: 300, damage: 13, range: 360, cooldown: 95, speed: 735, spread: 0.13, mag: 30, reloadMs: 1750, ammoType: 'light' },
  vector: { name: 'Vector', price: 430, damage: 11, range: 330, cooldown: 58, speed: 720, spread: 0.16, mag: 25, reloadMs: 1650, ammoType: 'light' },
  uzi: { name: 'Uzi', price: 260, damage: 10, range: 285, cooldown: 70, speed: 680, spread: 0.24, mag: 32, reloadMs: 1850, ammoType: 'light' },
  rifle: { name: 'Hunting Rifle', price: 320, damage: 25, range: 520, cooldown: 520, speed: 900, spread: 0.04, mag: 5, reloadMs: 1900, ammoType: 'heavy' },
  carbine: { name: 'Carbine', price: 420, damage: 20, range: 480, cooldown: 185, speed: 860, spread: 0.065, mag: 20, reloadMs: 1850, ammoType: 'heavy' },
  m4a1: { name: 'M4A1', price: 520, damage: 22, range: 560, cooldown: 155, speed: 940, spread: 0.055, mag: 30, reloadMs: 2050, ammoType: 'heavy' },
  ak47: { name: 'AK-47', price: 610, damage: 30, range: 520, cooldown: 190, speed: 900, spread: 0.09, mag: 30, reloadMs: 2150, ammoType: 'heavy' },
  scar: { name: 'SCAR-H', price: 720, damage: 34, range: 590, cooldown: 230, speed: 960, spread: 0.055, mag: 20, reloadMs: 2200, ammoType: 'heavy' },
  famas: { name: 'FAMAS', price: 560, damage: 19, range: 500, cooldown: 115, speed: 900, spread: 0.08, mag: 25, reloadMs: 2000, ammoType: 'heavy' },
  aug: { name: 'AUG', price: 640, damage: 24, range: 575, cooldown: 170, speed: 940, spread: 0.045, mag: 30, reloadMs: 2100, ammoType: 'heavy' },
  shotgun: { name: 'Shotgun', price: 260, damage: 13, range: 240, cooldown: 780, speed: 620, spread: 0.34, pellets: 7, mag: 6, reloadMs: 2100, ammoType: 'shells' },
  pump_shotgun: { name: 'Pump Shotgun', price: 360, damage: 16, range: 260, cooldown: 920, speed: 650, spread: 0.31, pellets: 8, mag: 5, reloadMs: 2250, ammoType: 'shells' },
  auto_shotgun: { name: 'Auto Shotgun', price: 690, damage: 10, range: 230, cooldown: 310, speed: 630, spread: 0.38, pellets: 7, mag: 8, reloadMs: 2450, ammoType: 'shells' },
  marksman: { name: 'Marksman Rifle', price: 620, damage: 48, range: 700, cooldown: 720, speed: 1060, spread: 0.025, mag: 10, reloadMs: 2350, ammoType: 'heavy' },
  sniper: { name: 'Sniper Rifle', price: 650, damage: 68, range: 820, cooldown: 1180, speed: 1150, spread: 0.015, mag: 5, reloadMs: 2600, ammoType: 'heavy' },
  awp: { name: 'AWP', price: 1050, damage: 110, range: 940, cooldown: 1650, speed: 1280, spread: 0.008, mag: 5, reloadMs: 3000, ammoType: 'heavy' },
  lmg: { name: 'LMG', price: 880, damage: 20, range: 500, cooldown: 115, speed: 850, spread: 0.13, mag: 60, reloadMs: 3450, ammoType: 'heavy' },
  minigun: { name: 'Minigun', price: 1450, damage: 15, range: 460, cooldown: 42, speed: 820, spread: 0.2, mag: 90, reloadMs: 4200, ammoType: 'heavy' },
  crossbow: { name: 'Crossbow', price: 280, damage: 42, range: 470, cooldown: 860, speed: 620, spread: 0.025, mag: 1, reloadMs: 1150, ammoType: 'bolts' },
  laser_rifle: { name: 'Laser Rifle', price: 1300, damage: 40, range: 760, cooldown: 260, speed: 1400, spread: 0.01, mag: 18, reloadMs: 2400, ammoType: 'cells' },
  railgun: { name: 'Railgun', price: 1800, damage: 145, range: 980, cooldown: 1900, speed: 1600, spread: 0.006, mag: 3, reloadMs: 3200, ammoType: 'cells' }
};
const AUTO_GUNS = new Set(['machine_pistol', 'smg', 'mp5', 'vector', 'uzi', 'carbine', 'm4a1', 'ak47', 'scar', 'famas', 'aug', 'auto_shotgun', 'lmg', 'minigun', 'laser_rifle']);
for (const [id, gun] of Object.entries(GUNS)) gun.auto = AUTO_GUNS.has(id);

const WORLD_SIZE = 2400;
const OUTPOST_RADIUS = 220;
const BUILD_TYPES = {
  wall: { name: 'Wood Wall', wood: 8, stone: 0, iron: 0, hp: 140, w: 68, h: 22 },
  spikes: { name: 'Wood Spikes', wood: 12, stone: 0, iron: 0, hp: 95, w: 58, h: 30 },
  gate: { name: 'Wood Gate', wood: 16, stone: 0, iron: 0, hp: 120, w: 72, h: 18 },
  tower: { name: 'Watch Tower', wood: 34, stone: 8, iron: 0, hp: 190, w: 52, h: 52 },
  platform: { name: 'Shooting Platform', wood: 20, stone: 4, iron: 0, hp: 150, w: 64, h: 52 },
  trap: { name: 'Wolf Trap', wood: 10, stone: 6, iron: 0, hp: 80, w: 48, h: 48 },
  campfire: { name: 'Campfire', wood: 12, stone: 8, iron: 0, hp: 90, w: 44, h: 44 },
  bench: { name: 'Upgrade Bench', wood: 24, stone: 12, iron: 0, hp: 180, w: 52, h: 42 }
};
const CRAFT_RECIPES = {
  hammer: { name: 'Upgrade Hammer', wood: 18, stone: 10, iron: 0 },
  pickaxe: { name: 'Wooden Pickaxe', wood: 16, stone: 0, iron: 0 },
  wool_armor: { name: 'Wool Padding Armor', wood: 10, stone: 0, iron: 0 },
  iron_armor: { name: 'Iron Armor', wood: 6, stone: 10, iron: 8 },
  field_kit: { name: 'Field Kit', wood: 4, stone: 0, iron: 2 },
  camp_meal: { name: 'Camp Meal', wood: 2, stone: 0, iron: 0, foodCost: 2 },
  seed_pack: { name: 'Seed Pack', wood: 6, stone: 0, iron: 0 },
  light_ammo: { name: 'Light Ammo Pack', wood: 6, stone: 0, iron: 0 },
  heavy_ammo: { name: 'Heavy Ammo Pack', wood: 0, stone: 6, iron: 2 },
  cash_bundle: { name: 'Trader Goods', wood: 0, stone: 10, iron: 4 }
};
const TRADER_ITEMS = {
  food: { name: 'Food Ration', price: 35 },
  seeds: { name: 'Seed Pack', price: 55 },
  wood: { name: 'Wood Bundle', price: 45 },
  stone: { name: 'Stone Bundle', price: 65 },
  ammo_light: { name: 'Light Ammo', price: 35 },
  ammo_heavy: { name: 'Heavy Ammo', price: 55 },
  ammo_shells: { name: 'Shell Ammo', price: 50 },
  armor_wool: { name: 'Wool Armor', price: 80 },
  armor_iron: { name: 'Iron Armor', price: 240 }
};
const ARMOR = {
  none: { name: 'No Armor', reduction: 0 },
  wool: { name: 'Wool Armor', reduction: 0.18 },
  iron: { name: 'Iron Armor', reduction: 0.36 }
};
const UPGRADE_COSTS = {
  stone: { stone: 14, iron: 0, hpBoost: 1.8 },
  iron: { stone: 8, iron: 10, hpBoost: 2.8 }
};
const rooms = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(res.req?.method === 'HEAD' ? undefined : JSON.stringify(body));
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeLoot(x, y, kind = 'scrap') {
  const table = {
    scrap: { label: 'Scrap', value: 20 },
    fang: { label: 'Wolf Fang', value: 38 },
    relic: { label: 'Den Relic', value: 90 },
    med: { label: 'Med Kit', value: 45 },
    ammo: { label: 'Ammo Box', value: 30 },
    food: { label: 'Food Ration', value: 18, food: 25 },
    seeds: { label: 'Seed Pack', value: 22, seeds: 2 }
  };
  return { id: uid('loot'), x, y, kind, ...table[kind] };
}

function makeWolf(x, y, den = false) {
  return {
    id: uid(den ? 'alpha' : 'wolf'),
    x,
    y,
    hp: den ? 360 : 65,
    maxHp: den ? 360 : 65,
    speed: den ? 78 : 122,
    damage: den ? 1.5 : 1,
    den
  };
}

function makeTree(x, y) {
  return {
    id: uid('tree'),
    x,
    y,
    hp: 45,
    maxHp: 45,
    wood: 8 + Math.floor(Math.random() * 8)
  };
}

function makeRock(x, y, iron = false) {
  return {
    id: uid(iron ? 'iron' : 'rock'),
    x,
    y,
    iron,
    hp: iron ? 78 : 58,
    maxHp: iron ? 78 : 58,
    stone: iron ? 8 + Math.floor(Math.random() * 7) : 12 + Math.floor(Math.random() * 10),
    ironOre: iron ? 5 + Math.floor(Math.random() * 7) : Math.floor(Math.random() * 2)
  };
}

function makeRoom({ worldName, pvp = false, lifesteal = false }) {
  let code = roomCode();
  while (rooms.has(code)) code = roomCode();
  const den = { x: WORLD_SIZE - 360, y: WORLD_SIZE - 360, hp: 900, maxHp: 900, defeated: false };
  const room = {
    code,
    name: (worldName || 'Wolf Den World').slice(0, 32),
    pvp: Boolean(pvp),
    lifesteal: Boolean(lifesteal),
    createdAt: Date.now(),
    lastSeen: Date.now(),
    den,
    wave: 1,
    night: 1,
    nextWaveAt: Date.now() + WAVE_MS,
    players: new Map(),
    bullets: [],
    wolves: [],
    loot: [],
    crates: [],
    trees: [],
    rocks: [],
    buildings: [],
    crops: [],
    survivor: { x: 310, y: 300 },
    events: ['World created. Share the code to invite players.']
  };

  for (let i = 0; i < 70; i++) {
    const x = 170 + Math.random() * (WORLD_SIZE - 340);
    const y = 170 + Math.random() * (WORLD_SIZE - 340);
    if (Math.hypot(x - room.survivor.x, y - room.survivor.y) > 210 && Math.hypot(x - den.x, y - den.y) > 170) {
      room.trees.push(makeTree(x, y));
    }
  }
  for (let i = 0; i < 34; i++) {
    const x = 190 + Math.random() * (WORLD_SIZE - 380);
    const y = 190 + Math.random() * (WORLD_SIZE - 380);
    if (Math.hypot(x - room.survivor.x, y - room.survivor.y) > OUTPOST_RADIUS + 80 && Math.hypot(x - den.x, y - den.y) > 170) {
      room.rocks.push(makeRock(x, y, i % 4 === 0));
    }
  }
  for (let i = 0; i < 24; i++) {
    room.crates.push({
      id: uid('crate'),
      x: 260 + Math.random() * (WORLD_SIZE - 520),
      y: 260 + Math.random() * (WORLD_SIZE - 520),
      opened: false
    });
  }
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 190 + Math.random() * 180;
    room.wolves.push(makeWolf(den.x + Math.cos(angle) * radius, den.y + Math.sin(angle) * radius, i < 2));
  }
  rooms.set(code, room);
  return room;
}

function addPlayer(room, name) {
  const id = uid('player');
  const player = {
    id,
    name: (name || 'Wool Scout').slice(0, 18),
    x: 260 + Math.random() * 120,
    y: 260 + Math.random() * 120,
    vx: 0,
    vy: 0,
    aim: 0,
    hp: 10,
    maxHp: 10,
    money: 90,
    gun: 'glock',
    ownedGuns: ['glock'],
    ammoReserve: { light: 45, heavy: 10, shells: 8, bolts: 4, cells: 0 },
    armor: 'none',
    wood: 30,
    stone: 12,
    iron: 0,
    food: 100,
    seeds: 2,
    hasHammer: false,
    hasPickaxe: false,
    inventory: [],
    ammo: GUNS.glock.mag,
    reloadingUntil: 0,
    lastShot: 0,
    lastShotId: 0,
    lastAxe: 0,
    lastBuild: 0,
    downedUntil: 0,
    score: 0,
    input: {},
    lastSeen: Date.now()
  };
  room.players.set(id, player);
  room.events.push(`${player.name} joined.`);
  return player;
}

function snapshot(room, playerId) {
  return {
    room: {
      code: room.code,
      name: room.name,
      pvp: room.pvp,
      lifesteal: room.lifesteal,
      wave: room.wave,
      night: room.night,
      nextWaveAt: room.nextWaveAt,
      den: room.den,
      survivor: room.survivor,
      events: room.events.slice(-7)
    },
    selfId: playerId,
    guns: GUNS,
    buildTypes: BUILD_TYPES,
    craftRecipes: CRAFT_RECIPES,
    outpostRadius: OUTPOST_RADIUS,
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, x: p.x, y: p.y, aim: p.aim, hp: p.hp, maxHp: p.maxHp,
      money: p.money, gun: p.gun, ownedGuns: p.ownedGuns, wood: p.wood, stone: p.stone, iron: p.iron,
      ammoReserve: p.ammoReserve, armor: p.armor,
      food: p.food, seeds: p.seeds, hasHammer: p.hasHammer, hasPickaxe: p.hasPickaxe, inventory: p.inventory,
      ammo: p.ammo, reloading: p.reloadingUntil > Date.now(), reloadMsLeft: Math.max(0, p.reloadingUntil - Date.now()),
      score: p.score, downed: p.downedUntil > Date.now()
    })),
    bullets: room.bullets.map(b => ({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, owner: b.owner })),
    wolves: room.wolves.map(w => ({ id: w.id, x: w.x, y: w.y, hp: w.hp, maxHp: w.maxHp, den: w.den })),
    loot: room.loot,
    crates: room.crates,
    trees: room.trees,
    rocks: room.rocks,
    crops: room.crops,
    buildings: room.buildings.filter(building => building.type !== 'trap' || building.owner === playerId)
  };
}

function startReload(room, player, now) {
  const gun = GUNS[player.gun] || GUNS.pistol;
  if (player.downedUntil > now || player.reloadingUntil > now || player.ammo >= gun.mag) return;
  const reserve = player.ammoReserve?.[gun.ammoType] || 0;
  if (reserve <= 0) {
    notice(room, player, `${player.name} needs ${gun.ammoType} ammo to reload.`, now);
    return;
  }
  player.reloadingUntil = now + gun.reloadMs;
  room.events.push(`${player.name} is reloading ${gun.name}.`);
}

function finishReload(player, now) {
  const gun = GUNS[player.gun] || GUNS.pistol;
  if (player.reloadingUntil && player.reloadingUntil <= now) {
    const needed = gun.mag - player.ammo;
    const reserve = player.ammoReserve?.[gun.ammoType] || 0;
    const loaded = Math.min(needed, reserve);
    player.ammo += loaded;
    player.ammoReserve[gun.ammoType] = reserve - loaded;
    player.reloadingUntil = 0;
  }
}

function damageWolf(room, wolf, damage, owner) {
  wolf.hp -= damage;
  if (wolf.hp > 0) return false;
  room.wolves = room.wolves.filter(w => w.id !== wolf.id);
  if (owner) {
    owner.money += wolf.den ? 120 : 32;
    owner.score += wolf.den ? 8 : 1;
    if (room.lifesteal) {
      owner.hp = clamp(owner.hp + 1, 1, owner.maxHp + 4);
      owner.maxHp = clamp(owner.maxHp + 0.25, 10, 20);
    }
  }
  giveLoot(room, wolf);
  room.events.push(`${owner?.name || 'A player'} killed a ${wolf.den ? 'den wolf' : 'wolf'}.`);
  return true;
}

function hitWolfByRay(room, player, angle, range, damage) {
  let best = null;
  let bestForward = Infinity;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  for (const wolf of room.wolves) {
    const dx = wolf.x - player.x;
    const dy = wolf.y - player.y;
    const forward = dx * dirX + dy * dirY;
    if (forward <= 0 || forward > range) continue;
    const side = Math.abs(dx * dirY - dy * dirX);
    const hitWidth = wolf.den ? 70 : 42;
    if (side <= hitWidth && forward < bestForward) {
      best = wolf;
      bestForward = forward;
    }
  }
  if (best) damageWolf(room, best, damage, player);
}

function fire(room, player, now, aiming = false) {
  const gun = GUNS[player.gun] || GUNS.pistol;
  finishReload(player, now);
  if (now - player.lastShot < gun.cooldown || player.downedUntil > now || player.reloadingUntil > now) return false;
  if (player.ammo <= 0) {
    startReload(room, player, now);
    return false;
  }
  player.lastShot = now;
  player.ammo -= 1;
  const pellets = gun.pellets || 1;
  const damage = gun.damage * (aiming ? 1.45 : 1);
  const spread = gun.spread * (aiming ? 0.55 : 1);
  for (let i = 0; i < pellets; i++) {
    const angle = player.aim + (Math.random() - 0.5) * spread;
    room.bullets.push({
      id: uid('bullet'),
      owner: player.id,
      gun: player.gun,
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * gun.speed,
      vy: Math.sin(angle) * gun.speed,
      damage,
      life: gun.range / gun.speed
    });
    hitWolfByRay(room, player, angle, gun.range, damage);
  }
  if (player.ammo <= 0) room.events.push(`${player.name}'s ${gun.name} is empty. Press R to reload.`);
  return true;
}

function giveLoot(room, wolf) {
  const drops = wolf.den ? ['relic', 'fang', 'fang', 'food', 'seeds'] : ['fang', Math.random() > 0.45 ? 'food' : 'scrap'];
  drops.forEach((kind, i) => room.loot.push(makeLoot(wolf.x + i * 18 - 18, wolf.y + Math.random() * 20 - 10, kind)));
}

function swingTool(room, player, now, tool = 'axe') {
  if (now - player.lastAxe < 520 || player.downedUntil > now) return;
  if (tool === 'pickaxe' && !player.hasPickaxe) return;
  player.lastAxe = now;
  const hit = {
    x: player.x + Math.cos(player.aim) * 52,
    y: player.y + Math.sin(player.aim) * 52
  };
  let target = null;
  const resources = tool === 'pickaxe' ? room.rocks : room.trees;
  for (const resource of resources) {
    if (dist(hit, resource) < 46 && (!target || dist(hit, resource) < dist(hit, target))) target = resource;
  }
  if (!target) return;
  target.hp -= tool === 'pickaxe' ? (target.iron ? 28 : 24) : 18;
  if (target.hp <= 0) {
    if (target.wood) {
      player.wood += target.wood;
      room.trees = room.trees.filter(tree => tree.id !== target.id);
      room.events.push(`${player.name} chopped a tree and gained ${target.wood} wood.`);
    } else {
      player.stone += target.stone;
      player.iron += target.ironOre;
      room.rocks = room.rocks.filter(rock => rock.id !== target.id);
      room.events.push(`${player.name} mined ${target.stone} stone and ${target.ironOre} iron.`);
    }
  }
}

function canPay(player, cost) {
  return player.wood >= (cost.wood || 0) && player.stone >= (cost.stone || 0) && player.iron >= (cost.iron || 0);
}

function pay(player, cost) {
  player.wood -= cost.wood || 0;
  player.stone -= cost.stone || 0;
  player.iron -= cost.iron || 0;
}

function notice(room, player, message, now = Date.now()) {
  if (now - (player.lastNotice || 0) < 850) return;
  player.lastNotice = now;
  room.events.push(message);
}

function hurtPlayer(player, amount) {
  const reduction = ARMOR[player.armor || 'none']?.reduction || 0;
  player.hp -= amount * (1 - reduction);
}

function buildThing(room, player, now, type = 'wall', target = null) {
  const spec = BUILD_TYPES[type] || BUILD_TYPES.wall;
  if (now - player.lastBuild < 360 || player.downedUntil > now) return;
  if (!canPay(player, spec)) {
    notice(room, player, `${player.name} needs more materials to build ${spec.name}.`, now);
    return;
  }
  const wanted = target && Number.isFinite(target.x) && Number.isFinite(target.y)
    ? target
    : { x: player.x + Math.cos(player.aim) * 86, y: player.y + Math.sin(player.aim) * 86 };
  const x = clamp(wanted.x, 80, WORLD_SIZE - 80);
  const y = clamp(wanted.y, 80, WORLD_SIZE - 80);
  if (dist(player, { x, y }) > 175) {
    notice(room, player, `${player.name} is too far away to build there.`, now);
    return;
  }
  if (dist(room.survivor, { x, y }) < OUTPOST_RADIUS) {
    notice(room, player, `You cannot build inside the survivor outpost.`, now);
    return;
  }
  if (dist(room.den, { x, y }) < 130) {
    notice(room, player, `You cannot build that close to the wolf den.`, now);
    return;
  }
  if ([...room.players.values()].some(p => dist(p, { x, y }) < 42)) {
    notice(room, player, `Move a little farther away before building.`, now);
    return;
  }
  if (room.buildings.some(b => dist(b, { x, y }) < 52)) {
    notice(room, player, `That build spot is blocked.`, now);
    return;
  }
  player.lastBuild = now;
  pay(player, spec);
  room.buildings.push({
    id: uid(type),
    type,
    material: 'wood',
    x,
    y,
    angle: player.aim,
    hp: spec.hp,
    maxHp: spec.hp,
    owner: player.id
  });
  room.events.push(`${player.name} built ${spec.name}.`);
}

function plantCrop(room, player, now, target = null) {
  if (now - player.lastBuild < 360 || player.downedUntil > now) return;
  if (player.seeds <= 0) {
    notice(room, player, `${player.name} needs seeds to plant food.`, now);
    return;
  }
  const wanted = target && Number.isFinite(target.x) && Number.isFinite(target.y)
    ? target
    : { x: player.x + Math.cos(player.aim) * 68, y: player.y + Math.sin(player.aim) * 68 };
  const x = clamp(wanted.x, 80, WORLD_SIZE - 80);
  const y = clamp(wanted.y, 80, WORLD_SIZE - 80);
  if (dist(player, { x, y }) > 155) {
    notice(room, player, `${player.name} is too far away to plant there.`, now);
    return;
  }
  const blocked = room.crops.some(crop => dist(crop, { x, y }) < 42)
    || room.buildings.some(building => dist(building, { x, y }) < 48);
  if (blocked) {
    notice(room, player, `That planting spot is blocked.`, now);
    return;
  }
  player.lastBuild = now;
  player.seeds -= 1;
  room.crops.push({ id: uid('crop'), owner: player.id, x, y, plantedAt: now, growthMs: 20000, food: 3 + Math.floor(Math.random() * 3) });
  room.events.push(`${player.name} planted seeds.`);
}

function craftItem(room, player, item) {
  const recipe = CRAFT_RECIPES[item];
  if (!recipe || !canPay(player, recipe)) return;
  if (recipe.foodCost && player.food < recipe.foodCost) return;
  if (item === 'hammer' && player.hasHammer) return;
  if (item === 'pickaxe' && player.hasPickaxe) return;
  pay(player, recipe);
  player.food -= recipe.foodCost || 0;
  if (item === 'hammer') {
    player.hasHammer = true;
    room.events.push(`${player.name} crafted an upgrade hammer.`);
  } else if (item === 'pickaxe') {
    player.hasPickaxe = true;
    room.events.push(`${player.name} crafted a wooden pickaxe.`);
  } else if (item === 'wool_armor') {
    player.armor = 'wool';
    room.events.push(`${player.name} crafted wool armor.`);
  } else if (item === 'iron_armor') {
    player.armor = 'iron';
    room.events.push(`${player.name} crafted iron armor.`);
  } else if (item === 'field_kit') {
    player.hp = clamp(player.hp + 5, 1, player.maxHp);
    room.events.push(`${player.name} crafted and used a field kit.`);
  } else if (item === 'camp_meal') {
    player.food = clamp(player.food + 35, 0, 100);
    room.events.push(`${player.name} cooked a camp meal.`);
  } else if (item === 'seed_pack') {
    player.seeds += 3;
    room.events.push(`${player.name} crafted seeds.`);
  } else if (item === 'light_ammo') {
    player.ammoReserve.light += 30;
    room.events.push(`${player.name} crafted light ammo.`);
  } else if (item === 'heavy_ammo') {
    player.ammoReserve.heavy += 18;
    room.events.push(`${player.name} crafted heavy ammo.`);
  } else if (item === 'cash_bundle') {
    player.money += 120;
    room.events.push(`${player.name} crafted trader goods for $120.`);
  }
}

function buyTraderItem(room, player, item) {
  const listing = TRADER_ITEMS[item];
  if (!listing) return;
  if (dist(player, room.survivor) >= 115) {
    notice(room, player, `Stand closer to the trader to buy supplies.`);
    return;
  }
  if (player.money < listing.price) {
    notice(room, player, `${player.name} needs $${listing.price} to buy ${listing.name}.`);
    return;
  }
  player.money -= listing.price;
  if (item === 'food') player.food = clamp(player.food + 30, 0, 100);
  if (item === 'seeds') player.seeds += 4;
  if (item === 'wood') player.wood += 18;
  if (item === 'stone') player.stone += 14;
  if (item === 'ammo_light') player.ammoReserve.light += 36;
  if (item === 'ammo_heavy') player.ammoReserve.heavy += 24;
  if (item === 'ammo_shells') player.ammoReserve.shells += 14;
  if (item === 'armor_wool') player.armor = 'wool';
  if (item === 'armor_iron') player.armor = 'iron';
  room.events.push(`${player.name} bought ${listing.name}.`);
}

function upgradeBuilding(room, player, targetLevel) {
  if (!player.hasHammer) return;
  const benchNearby = room.buildings.some(b => b.type === 'bench' && dist(player, b) < 170);
  if (!benchNearby) return;
  const hit = {
    x: player.x + Math.cos(player.aim) * 78,
    y: player.y + Math.sin(player.aim) * 78
  };
  let target = null;
  for (const building of room.buildings) {
    if (building.type !== 'bench' && dist(hit, building) < 54 && (!target || dist(hit, building) < dist(hit, target))) target = building;
  }
  if (!target || target.material === targetLevel) return;
  if (target.owner !== player.id) {
    notice(room, player, `Only the owner can upgrade that base piece.`);
    return;
  }
  if (targetLevel === 'stone' && target.material !== 'wood') return;
  if (targetLevel === 'iron' && target.material !== 'stone') return;
  const cost = UPGRADE_COSTS[targetLevel];
  if (!canPay(player, cost)) return;
  pay(player, cost);
  target.material = targetLevel;
  target.maxHp = Math.round(target.maxHp * cost.hpBoost);
  target.hp = target.maxHp;
  room.events.push(`${player.name} upgraded a ${target.type} to ${targetLevel}.`);
}

function repairBuilding(room, player) {
  if (!player.hasHammer) return false;
  const hit = {
    x: player.x + Math.cos(player.aim) * 78,
    y: player.y + Math.sin(player.aim) * 78
  };
  let target = null;
  for (const building of room.buildings) {
    if (dist(hit, building) < 58 && (!target || dist(hit, building) < dist(hit, target))) target = building;
  }
  if (!target || target.hp >= target.maxHp) return false;
  if (target.owner !== player.id) {
    notice(room, player, `Only the owner can repair that base piece.`);
    return false;
  }
  const materialCost = target.material === 'iron'
    ? { wood: 0, stone: 2, iron: 2 }
    : target.material === 'stone'
      ? { wood: 1, stone: 3, iron: 0 }
      : { wood: 4, stone: 0, iron: 0 };
  if (!canPay(player, materialCost)) return false;
  pay(player, materialCost);
  const amount = target.material === 'iron' ? 80 : target.material === 'stone' ? 65 : 45;
  target.hp = clamp(target.hp + amount, 1, target.maxHp);
  room.events.push(`${player.name} repaired a ${target.type}.`);
  return true;
}

function spawnWave(room, now) {
  if (room.den.defeated || now < room.nextWaveAt) return;
  room.wave += 1;
  room.night = room.wave;
  room.nextWaveAt = now + WAVE_MS;
  const count = Math.min(8 + room.wave * 2, 34);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 260 + Math.random() * 170;
    const wolf = makeWolf(room.den.x + Math.cos(angle) * radius, room.den.y + Math.sin(angle) * radius, room.wave % 4 === 0 && i < 2);
    wolf.hp += room.wave * 6;
    wolf.maxHp = wolf.hp;
    wolf.speed += Math.min(42, room.wave * 3);
    room.wolves.push(wolf);
  }
  room.events.push(`Night ${room.night}: a wolf wave is coming.`);
}

function tickRoom(room, dt) {
  const now = Date.now();
  room.lastSeen = now;
  spawnWave(room, now);
  const players = [...room.players.values()];
  for (const player of players) {
    if (now - player.lastSeen > 45000) continue;
    for (const crop of [...room.crops]) {
      const ready = now - crop.plantedAt >= crop.growthMs;
      const owned = crop.owner === player.id;
      if (ready && (owned || dist(player, crop) < 70)) {
        player.food = clamp(player.food + crop.food * 12, 0, 100);
        player.seeds += Math.random() > 0.5 ? 1 : 0;
        room.crops = room.crops.filter(c => c.id !== crop.id);
        room.events.push(`${player.name} harvested ${crop.food} food.`);
      }
    }
    if (player.downedUntil > now) {
      continue;
    }
    if (player.hp <= 0) player.hp = player.maxHp;
    finishReload(player, now);
    const input = player.input || {};
    let ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (input.firstPerson) {
      const forward = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      ax = Math.cos(player.aim) * forward + Math.cos(player.aim + Math.PI / 2) * strafe;
      ay = Math.sin(player.aim) * forward + Math.sin(player.aim + Math.PI / 2) * strafe;
    }
    const len = Math.hypot(ax, ay) || 1;
    let speed = input.sprint ? 250 : 185;
    if (input.aimDown && input.tool === 'gun') speed *= 0.58;
    if (player.reloadingUntil > now && input.tool === 'gun') speed *= 0.82;
    player.x = clamp(player.x + ax / len * speed * dt, 80, WORLD_SIZE - 80);
    player.y = clamp(player.y + ay / len * speed * dt, 80, WORLD_SIZE - 80);
    if (Number.isFinite(input.aim)) player.aim = input.aim;

    for (const hazard of room.buildings) {
      if ((hazard.type === 'spikes' || hazard.type === 'trap') && hazard.owner !== player.id && dist(player, hazard) < 42) {
        const materialBoost = hazard.material === 'iron' ? 1.9 : hazard.material === 'stone' ? 1.45 : 1;
        hurtPlayer(player, dt * (hazard.type === 'trap' ? 3.4 : 1.9) * materialBoost);
      }
    }

    if (input.shoot && input.mode === 'build') buildThing(room, player, now, input.buildType, input.buildTarget);
    else if (input.shoot && input.tool === 'plant') plantCrop(room, player, now, input.plantTarget);
    else if (input.shoot && input.tool === 'axe') swingTool(room, player, now, 'axe');
    else if (input.shoot && input.tool === 'pickaxe') swingTool(room, player, now, 'pickaxe');
    else if (input.shoot && input.tool === 'hammer') {
      if (!repairBuilding(room, player)) upgradeBuilding(room, player, input.upgradeTarget || 'stone');
    }
    else if (input.shoot && input.tool === 'gun') {
      const shotId = Number(input.shotId || 0);
      const canFireSemi = GUNS[player.gun]?.auto || shotId !== player.lastShotId;
      if (canFireSemi) {
        const fired = fire(room, player, now, Boolean(input.aimDown));
        if (fired && !GUNS[player.gun]?.auto) player.lastShotId = shotId;
      }
    }
    if (input.reload && input.tool === 'gun') startReload(room, player, now);
    if (input.axe) swingTool(room, player, now, 'axe');
    if (input.build) buildThing(room, player, now, input.buildType, input.buildTarget);
    if (input.craft) craftItem(room, player, input.craft);
    if (input.buyItem) buyTraderItem(room, player, input.buyItem);
    input.craft = null;
    input.buyItem = null;

    player.food = clamp(player.food - dt * (input.sprint ? 0.42 : 0.25), 0, 100);
    if (player.food <= 0) player.hp -= dt * 0.42;
    for (const loot of [...room.loot]) {
      if (dist(player, loot) < 42) {
        if (loot.food) player.food = clamp(player.food + loot.food, 0, 100);
        else if (loot.seeds) player.seeds += loot.seeds;
        else if (loot.kind === 'ammo') {
          const types = ['light', 'heavy', 'shells', 'bolts', 'cells'];
          const type = types[Math.floor(Math.random() * types.length)];
          const amount = type === 'light' ? 30 : type === 'heavy' ? 18 : type === 'shells' ? 10 : type === 'bolts' ? 5 : 8;
          player.ammoReserve[type] += amount;
          room.events.push(`${player.name} picked up ${amount} ${type} ammo.`);
        }
        else player.inventory.push({ kind: loot.kind, label: loot.label, value: loot.value });
        room.loot = room.loot.filter(l => l.id !== loot.id);
      }
    }
    for (const crate of room.crates) {
      if (!crate.opened && dist(player, crate) < 48) {
        crate.opened = true;
        room.loot.push(makeLoot(crate.x, crate.y, Math.random() > 0.5 ? 'food' : 'scrap'));
        if (Math.random() > 0.62) room.loot.push(makeLoot(crate.x - 18, crate.y + 12, 'seeds'));
        if (Math.random() > 0.7) room.loot.push(makeLoot(crate.x + 18, crate.y + 14, 'ammo'));
        if (Math.random() > 0.72) room.loot.push(makeLoot(crate.x + 22, crate.y - 12, 'med'));
      }
    }
    if (input.sell && dist(player, room.survivor) < 100) {
      const sale = player.inventory.reduce((sum, item) => sum + item.value, 0);
      if (sale) {
        player.money += sale;
        player.inventory = [];
        room.events.push(`${player.name} sold loot for $${sale}.`);
      }
    }
    input.sell = false;
    if (input.buy && GUNS[input.buy]) {
      const alreadyOwned = player.ownedGuns.includes(input.buy);
      const price = alreadyOwned ? 0 : GUNS[input.buy].price;
      if (dist(player, room.survivor) >= 115) {
        notice(room, player, `Stand closer to the trader to switch or buy guns.`, now);
      } else if (player.money < price) {
        notice(room, player, `${player.name} needs $${price} to buy ${GUNS[input.buy].name}.`, now);
      } else {
        player.money -= price;
        if (!alreadyOwned) player.ownedGuns.push(input.buy);
        player.gun = input.buy;
        player.ammo = GUNS[input.buy].mag;
        player.reloadingUntil = 0;
        room.events.push(alreadyOwned
          ? `${player.name} switched to ${GUNS[input.buy].name}.`
          : `${player.name} bought ${GUNS[input.buy].name}.`);
      }
    }
    input.buy = null;
    if (input.heal && player.money >= 70 && player.hp < player.maxHp && dist(player, room.survivor) < 100) {
      player.money -= 70;
      player.hp = player.maxHp;
    }
    input.heal = false;
    if (player.hp <= 0) {
      player.hp = 0;
      player.downedUntil = now + 4500;
      player.x = 270;
      player.y = 270;
      player.food = 35;
      room.events.push(`${player.name} was knocked down and will respawn.`);
    }
  }

  for (const wolf of room.wolves) {
    const living = players.filter(p => p.downedUntil <= now && dist(p, room.survivor) > OUTPOST_RADIUS);
    if (!living.length) break;
    let target = living[0];
    for (const p of living) if (dist(wolf, p) < dist(wolf, target)) target = p;
    const dx = target.x - wolf.x;
    const dy = target.y - wolf.y;
    const len = Math.hypot(dx, dy) || 1;
    wolf.x += dx / len * wolf.speed * dt;
    wolf.y += dy / len * wolf.speed * dt;
    for (const wall of room.buildings) {
      if (dist(wolf, wall) < 42) {
        if (wall.type === 'trap') {
          if (damageWolf(room, wolf, dt * (wall.material === 'iron' ? 64 : wall.material === 'stone' ? 44 : 30), room.players.get(wall.owner))) break;
          continue;
        }
        wolf.x -= dx / len * wolf.speed * dt * 0.9;
        wolf.y -= dy / len * wolf.speed * dt * 0.9;
        wall.hp -= wolf.damage * dt * 8;
        if (wall.type === 'spikes') {
          damageWolf(room, wolf, dt * (wall.material === 'iron' ? 42 : wall.material === 'stone' ? 28 : 18), room.players.get(wall.owner));
        }
        if (wall.type === 'campfire' && target.hp < target.maxHp && dist(target, wall) < 95) {
          target.hp = clamp(target.hp + dt * 0.55, 1, target.maxHp);
        }
      }
    }
    if (len < 38) {
      hurtPlayer(target, wolf.damage * dt * 1.8);
      if (target.hp <= 0) {
        target.hp = 0;
        target.downedUntil = now + 4500;
        target.x = 270;
        target.y = 270;
        target.food = 35;
        room.events.push(`${target.name} was knocked down and will respawn.`);
      }
    }
  }
  room.buildings = room.buildings.filter(wall => wall.hp > 0);

  for (const bullet of [...room.bullets]) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    let remove = bullet.life <= 0 || bullet.x < 0 || bullet.y < 0 || bullet.x > WORLD_SIZE || bullet.y > WORLD_SIZE;
    const owner = room.players.get(bullet.owner);
    for (const wall of room.buildings) {
      if (!remove && bullet.owner !== wall.owner && dist(bullet, wall) < 38) {
        wall.hp -= bullet.damage * 0.55;
        remove = true;
      }
    }
    for (const wolf of [...room.wolves]) {
      if (!remove && dist(bullet, wolf) < (wolf.den ? 38 : 27)) {
        damageWolf(room, wolf, bullet.damage, owner);
        remove = true;
      }
    }
    if (!remove && dist(bullet, room.den) < 86) {
      room.den.hp -= bullet.damage;
      remove = true;
      if (room.den.hp <= 0 && !room.den.defeated) {
        room.den.hp = 0;
        room.den.defeated = true;
        room.events.push('The wolf den is defeated. Free play and PvP can continue.');
        for (let i = 0; i < 8; i++) room.loot.push(makeLoot(room.den.x + Math.random() * 110 - 55, room.den.y + Math.random() * 110 - 55, 'relic'));
      }
    }
    if (!remove && room.pvp) {
      for (const target of players) {
        if (target.id !== bullet.owner && target.downedUntil <= now && dist(bullet, target) < 24) {
          hurtPlayer(target, Math.max(1, bullet.damage / 18));
          remove = true;
          if (owner && room.lifesteal) owner.hp = clamp(owner.hp + 0.5, 1, owner.maxHp);
          if (target.hp <= 0) {
            target.hp = 0;
            target.downedUntil = now + 4500;
            target.x = 270;
            target.y = 270;
            if (owner) {
              owner.money += 60;
              owner.score += 3;
            }
          }
        }
      }
    }
    if (remove) room.bullets = room.bullets.filter(b => b.id !== bullet.id);
  }

  if (!room.den.defeated && room.wolves.length < 18 && Math.random() < 0.06) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 150 + Math.random() * 160;
    room.wolves.push(makeWolf(room.den.x + Math.cos(angle) * radius, room.den.y + Math.sin(angle) * radius));
  }
}

setInterval(() => {
  const dt = 1 / TICK_RATE;
  for (const room of rooms.values()) tickRoom(room, dt);
  for (const [code, room] of rooms) {
    if (Date.now() - room.createdAt > ROOM_TTL_MS && Date.now() - room.lastSeen > 60000) rooms.delete(code);
  }
}, 1000 / TICK_RATE);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.req = req;
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (req.method === 'POST' && url.pathname === '/api/rooms') {
    const body = await readBody(req);
    const room = makeRoom(body);
    const player = addPlayer(room, body.name);
    return json(res, 200, { code: room.code, playerId: player.id, state: snapshot(room, player.id) });
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/healthz') {
    return json(res, 200, { ok: true, rooms: rooms.size });
  }

  const join = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/join$/);
  if (req.method === 'POST' && join) {
    const room = rooms.get(join[1]);
    if (!room) return json(res, 404, { error: 'Room not found.' });
    const body = await readBody(req);
    const player = addPlayer(room, body.name);
    return json(res, 200, { code: room.code, playerId: player.id, state: snapshot(room, player.id) });
  }

  const input = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/input$/);
  if (req.method === 'POST' && input) {
    const room = rooms.get(input[1]);
    if (!room) return json(res, 404, { error: 'Room not found.' });
    const body = await readBody(req);
    const player = room.players.get(body.playerId);
    if (!player) return json(res, 404, { error: 'Player not found.' });
    player.input = body.input || {};
    player.lastSeen = Date.now();
    return json(res, 200, { ok: true, state: snapshot(room, player.id) });
  }

  const state = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/state$/);
  if (req.method === 'GET' && state) {
    const room = rooms.get(state[1]);
    if (!room) return json(res, 404, { error: 'Room not found.' });
    return json(res, 200, snapshot(room, url.searchParams.get('playerId')));
  }

  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, filePath);
  if (!fullPath.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'Forbidden' });
  fs.readFile(fullPath, (err, data) => {
    if (err) return json(res, 404, { error: 'Not found' });
    const ext = path.extname(fullPath);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

server.listen(PORT, () => {
  console.log(`Wolf Den Survivors running at http://127.0.0.1:${PORT}`);
});
