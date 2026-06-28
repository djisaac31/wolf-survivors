const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4190);
const PUBLIC_DIR = path.join(__dirname, 'public');
const TICK_RATE = 12;
const ROOM_TTL_MS = 1000 * 60 * 60 * 3;

const GUNS = {
  glock: { name: 'Glock', price: 0, damage: 18, range: 360, cooldown: 430, speed: 760, spread: 0.07 },
  pistol: { name: 'Pistol', price: 0, damage: 18, range: 360, cooldown: 430, speed: 760, spread: 0.07 },
  revolver: { name: 'Revolver', price: 140, damage: 34, range: 380, cooldown: 650, speed: 790, spread: 0.055 },
  deagle: { name: 'Desert Eagle', price: 240, damage: 46, range: 430, cooldown: 760, speed: 850, spread: 0.045 },
  machine_pistol: { name: 'Machine Pistol', price: 190, damage: 9, range: 280, cooldown: 80, speed: 660, spread: 0.22 },
  smg: { name: 'SMG', price: 150, damage: 10, range: 310, cooldown: 105, speed: 690, spread: 0.18 },
  mp5: { name: 'MP5', price: 300, damage: 13, range: 360, cooldown: 95, speed: 735, spread: 0.13 },
  vector: { name: 'Vector', price: 430, damage: 11, range: 330, cooldown: 58, speed: 720, spread: 0.16 },
  uzi: { name: 'Uzi', price: 260, damage: 10, range: 285, cooldown: 70, speed: 680, spread: 0.24 },
  rifle: { name: 'Hunting Rifle', price: 320, damage: 25, range: 520, cooldown: 520, speed: 900, spread: 0.04 },
  carbine: { name: 'Carbine', price: 420, damage: 20, range: 480, cooldown: 185, speed: 860, spread: 0.065 },
  m4a1: { name: 'M4A1', price: 520, damage: 22, range: 560, cooldown: 155, speed: 940, spread: 0.055 },
  ak47: { name: 'AK-47', price: 610, damage: 30, range: 520, cooldown: 190, speed: 900, spread: 0.09 },
  scar: { name: 'SCAR-H', price: 720, damage: 34, range: 590, cooldown: 230, speed: 960, spread: 0.055 },
  famas: { name: 'FAMAS', price: 560, damage: 19, range: 500, cooldown: 115, speed: 900, spread: 0.08 },
  aug: { name: 'AUG', price: 640, damage: 24, range: 575, cooldown: 170, speed: 940, spread: 0.045 },
  shotgun: { name: 'Shotgun', price: 260, damage: 13, range: 240, cooldown: 780, speed: 620, spread: 0.34, pellets: 7 },
  pump_shotgun: { name: 'Pump Shotgun', price: 360, damage: 16, range: 260, cooldown: 920, speed: 650, spread: 0.31, pellets: 8 },
  auto_shotgun: { name: 'Auto Shotgun', price: 690, damage: 10, range: 230, cooldown: 310, speed: 630, spread: 0.38, pellets: 7 },
  marksman: { name: 'Marksman Rifle', price: 620, damage: 48, range: 700, cooldown: 720, speed: 1060, spread: 0.025 },
  sniper: { name: 'Sniper Rifle', price: 650, damage: 68, range: 820, cooldown: 1180, speed: 1150, spread: 0.015 },
  awp: { name: 'AWP', price: 1050, damage: 110, range: 940, cooldown: 1650, speed: 1280, spread: 0.008 },
  lmg: { name: 'LMG', price: 880, damage: 20, range: 500, cooldown: 115, speed: 850, spread: 0.13 },
  minigun: { name: 'Minigun', price: 1450, damage: 15, range: 460, cooldown: 42, speed: 820, spread: 0.2 },
  crossbow: { name: 'Crossbow', price: 280, damage: 42, range: 470, cooldown: 860, speed: 620, spread: 0.025 },
  laser_rifle: { name: 'Laser Rifle', price: 1300, damage: 40, range: 760, cooldown: 260, speed: 1400, spread: 0.01 },
  railgun: { name: 'Railgun', price: 1800, damage: 145, range: 980, cooldown: 1900, speed: 1600, spread: 0.006 }
};

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
  field_kit: { name: 'Field Kit', wood: 4, stone: 0, iron: 2 },
  camp_meal: { name: 'Camp Meal', wood: 2, stone: 0, iron: 0, foodCost: 2 },
  seed_pack: { name: 'Seed Pack', wood: 6, stone: 0, iron: 0 },
  cash_bundle: { name: 'Trader Goods', wood: 0, stone: 10, iron: 4 }
};
const TRADER_ITEMS = {
  food: { name: 'Food Ration', price: 35 },
  seeds: { name: 'Seed Pack', price: 55 },
  wood: { name: 'Wood Bundle', price: 45 },
  stone: { name: 'Stone Bundle', price: 65 }
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
  res.end(JSON.stringify(body));
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
    ammo: { label: 'Ammo Box', value: 30 }
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
    wood: 0,
    stone: 0,
    iron: 0,
    food: 100,
    seeds: 2,
    hasHammer: false,
    inventory: [],
    lastShot: 0,
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
      money: p.money, gun: p.gun, wood: p.wood, stone: p.stone, iron: p.iron,
      food: p.food, seeds: p.seeds, hasHammer: p.hasHammer, inventory: p.inventory, score: p.score, downed: p.downedUntil > Date.now()
    })),
    bullets: room.bullets.map(b => ({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, owner: b.owner })),
    wolves: room.wolves.map(w => ({ id: w.id, x: w.x, y: w.y, hp: w.hp, maxHp: w.maxHp, den: w.den })),
    loot: room.loot,
    crates: room.crates,
    trees: room.trees,
    rocks: room.rocks,
    crops: room.crops,
    buildings: room.buildings
  };
}

function fire(room, player, now) {
  const gun = GUNS[player.gun] || GUNS.pistol;
  if (now - player.lastShot < gun.cooldown || player.downedUntil > now) return;
  player.lastShot = now;
  const pellets = gun.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const angle = player.aim + (Math.random() - 0.5) * gun.spread;
    room.bullets.push({
      id: uid('bullet'),
      owner: player.id,
      gun: player.gun,
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * gun.speed,
      vy: Math.sin(angle) * gun.speed,
      damage: gun.damage,
      life: gun.range / gun.speed
    });
  }
}

function giveLoot(room, wolf) {
  const drops = wolf.den ? ['relic', 'fang', 'fang'] : ['fang', 'scrap'];
  drops.forEach((kind, i) => room.loot.push(makeLoot(wolf.x + i * 18 - 18, wolf.y + Math.random() * 20 - 10, kind)));
}

function swingAxe(room, player, now) {
  if (now - player.lastAxe < 520 || player.downedUntil > now) return;
  player.lastAxe = now;
  const hit = {
    x: player.x + Math.cos(player.aim) * 52,
    y: player.y + Math.sin(player.aim) * 52
  };
  let target = null;
  for (const tree of room.trees) {
    if (dist(hit, tree) < 44 && (!target || dist(hit, tree) < dist(hit, target))) target = tree;
  }
  let rockTarget = null;
  for (const rock of room.rocks) {
    if (dist(hit, rock) < 46 && (!rockTarget || dist(hit, rock) < dist(hit, rockTarget))) rockTarget = rock;
  }
  if (!target && rockTarget) target = rockTarget;
  if (!target) return;
  target.hp -= target.iron ? 13 : 18;
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

function buildThing(room, player, now, type = 'wall') {
  const spec = BUILD_TYPES[type] || BUILD_TYPES.wall;
  if (now - player.lastBuild < 360 || !canPay(player, spec) || player.downedUntil > now) return;
  player.lastBuild = now;
  const x = clamp(player.x + Math.cos(player.aim) * 86, 80, WORLD_SIZE - 80);
  const y = clamp(player.y + Math.sin(player.aim) * 86, 80, WORLD_SIZE - 80);
  const tooClose = [...room.players.values()].some(p => dist(p, { x, y }) < 42)
    || room.buildings.some(b => dist(b, { x, y }) < 52)
    || dist(room.survivor, { x, y }) < OUTPOST_RADIUS
    || dist(room.den, { x, y }) < 130;
  if (tooClose) return;
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
}

function plantCrop(room, player, now) {
  if (now - player.lastBuild < 360 || player.seeds <= 0 || player.downedUntil > now) return;
  player.lastBuild = now;
  const x = clamp(player.x + Math.cos(player.aim) * 68, 80, WORLD_SIZE - 80);
  const y = clamp(player.y + Math.sin(player.aim) * 68, 80, WORLD_SIZE - 80);
  const blocked = dist(room.survivor, { x, y }) < OUTPOST_RADIUS
    || room.crops.some(crop => dist(crop, { x, y }) < 42)
    || room.buildings.some(building => dist(building, { x, y }) < 48);
  if (blocked) return;
  player.seeds -= 1;
  room.crops.push({ id: uid('crop'), x, y, plantedAt: now, growthMs: 45000, food: 3 + Math.floor(Math.random() * 3) });
  room.events.push(`${player.name} planted food.`);
}

function craftItem(room, player, item) {
  const recipe = CRAFT_RECIPES[item];
  if (!recipe || !canPay(player, recipe)) return;
  if (recipe.foodCost && player.food < recipe.foodCost) return;
  if (item === 'hammer' && player.hasHammer) return;
  pay(player, recipe);
  player.food -= recipe.foodCost || 0;
  if (item === 'hammer') {
    player.hasHammer = true;
    room.events.push(`${player.name} crafted an upgrade hammer.`);
  } else if (item === 'field_kit') {
    player.hp = clamp(player.hp + 5, 1, player.maxHp);
    room.events.push(`${player.name} crafted and used a field kit.`);
  } else if (item === 'camp_meal') {
    player.food = clamp(player.food + 35, 0, 100);
    room.events.push(`${player.name} cooked a camp meal.`);
  } else if (item === 'seed_pack') {
    player.seeds += 3;
    room.events.push(`${player.name} crafted seeds.`);
  } else if (item === 'cash_bundle') {
    player.money += 120;
    room.events.push(`${player.name} crafted trader goods for $120.`);
  }
}

function buyTraderItem(room, player, item) {
  const listing = TRADER_ITEMS[item];
  if (!listing || player.money < listing.price || dist(player, room.survivor) >= 115) return;
  player.money -= listing.price;
  if (item === 'food') player.food = clamp(player.food + 30, 0, 100);
  if (item === 'seeds') player.seeds += 4;
  if (item === 'wood') player.wood += 18;
  if (item === 'stone') player.stone += 14;
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

function tickRoom(room, dt) {
  const now = Date.now();
  room.lastSeen = now;
  const players = [...room.players.values()];
  for (const player of players) {
    if (now - player.lastSeen > 45000) continue;
    if (player.downedUntil > now) {
      continue;
    }
    if (player.hp <= 0) player.hp = player.maxHp;
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
    const speed = input.sprint ? 250 : 185;
    player.x = clamp(player.x + ax / len * speed * dt, 80, WORLD_SIZE - 80);
    player.y = clamp(player.y + ay / len * speed * dt, 80, WORLD_SIZE - 80);
    if (Number.isFinite(input.aim)) player.aim = input.aim;
    if (input.shoot && input.mode === 'build') buildThing(room, player, now, input.buildType);
    else if (input.shoot && input.tool === 'plant') plantCrop(room, player, now);
    else if (input.shoot && input.tool === 'axe') swingAxe(room, player, now);
    else if (input.shoot && input.tool === 'hammer') {
      if (!repairBuilding(room, player)) upgradeBuilding(room, player, input.upgradeTarget || 'stone');
    }
    else if (input.shoot) fire(room, player, now);
    if (input.axe) swingAxe(room, player, now);
    if (input.build) buildThing(room, player, now, input.buildType);
    if (input.craft) craftItem(room, player, input.craft);
    if (input.buyItem) buyTraderItem(room, player, input.buyItem);

    player.food = clamp(player.food - dt * (input.sprint ? 0.42 : 0.25), 0, 100);
    if (player.food <= 0) player.hp -= dt * 0.42;
    for (const crop of [...room.crops]) {
      if (now - crop.plantedAt >= crop.growthMs && dist(player, crop) < 46) {
        player.food = clamp(player.food + crop.food * 12, 0, 100);
        player.seeds += Math.random() > 0.5 ? 1 : 0;
        room.crops = room.crops.filter(c => c.id !== crop.id);
        room.events.push(`${player.name} harvested food.`);
      }
    }

    for (const loot of [...room.loot]) {
      if (dist(player, loot) < 42) {
        player.inventory.push({ kind: loot.kind, label: loot.label, value: loot.value });
        room.loot = room.loot.filter(l => l.id !== loot.id);
      }
    }
    for (const crate of room.crates) {
      if (!crate.opened && dist(player, crate) < 48) {
        crate.opened = true;
        room.loot.push(makeLoot(crate.x, crate.y, Math.random() > 0.55 ? 'ammo' : 'scrap'));
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
    if (input.buy && GUNS[input.buy] && player.money >= GUNS[input.buy].price && dist(player, room.survivor) < 115) {
      player.money -= GUNS[input.buy].price;
      player.gun = input.buy;
      room.events.push(`${player.name} bought ${GUNS[input.buy].name}.`);
    }
    if (input.heal && player.money >= 70 && player.hp < player.maxHp && dist(player, room.survivor) < 100) {
      player.money -= 70;
      player.hp = player.maxHp;
    }
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
    const living = players.filter(p => p.downedUntil <= now);
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
        wolf.x -= dx / len * wolf.speed * dt * 0.9;
        wolf.y -= dy / len * wolf.speed * dt * 0.9;
        wall.hp -= wolf.damage * dt * 8;
        if (wall.type === 'spikes' || wall.type === 'trap') {
          wolf.hp -= dt * (wall.material === 'iron' ? 42 : wall.material === 'stone' ? 28 : 18);
        }
        if (wall.type === 'campfire' && target.hp < target.maxHp && dist(target, wall) < 95) {
          target.hp = clamp(target.hp + dt * 0.55, 1, target.maxHp);
        }
      }
    }
    if (len < 38) {
      target.hp -= wolf.damage * dt * 1.8;
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
        wolf.hp -= bullet.damage;
        remove = true;
        if (wolf.hp <= 0) {
          room.wolves = room.wolves.filter(w => w.id !== wolf.id);
          if (owner) {
            owner.money += wolf.den ? 120 : 32;
            owner.score += wolf.den ? 8 : 1;
            if (room.lifesteal) owner.hp = clamp(owner.hp + 1, 1, owner.maxHp + 4);
            if (room.lifesteal) owner.maxHp = clamp(owner.maxHp + 0.25, 10, 20);
          }
          giveLoot(room, wolf);
        }
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
          target.hp -= Math.max(1, bullet.damage / 18);
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
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (req.method === 'POST' && url.pathname === '/api/rooms') {
    const body = await readBody(req);
    const room = makeRoom(body);
    const player = addPlayer(room, body.name);
    return json(res, 200, { code: room.code, playerId: player.id, state: snapshot(room, player.id) });
  }

  if (req.method === 'GET' && url.pathname === '/healthz') {
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
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Wolf Den Survivors running at http://127.0.0.1:${PORT}`);
});
