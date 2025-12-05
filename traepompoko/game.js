const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");

let running = false;
let lastTime = 0;
let accumulator = 0;
const step = 1 / 60;

const keys = {};
let score = 0;
let lives = 3;
let level = 1;

const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const world = {
  width: canvas.width,
  height: canvas.height,
};

const player = {
  x: world.width * 0.15,
  y: world.height * 0.5,
  w: 36,
  h: 26,
  vx: 0,
  vy: 0,
  speed: 220,
  dash: 0,
  dashPower: 420,
  dashCooldown: 0,
};

const obstacles = [];
const pickups = [];

let spawnTimer = 0;
let pickupTimer = 0;

function reset() {
  running = false;
  score = 0;
  lives = 3;
  level = 1;
  player.x = world.width * 0.15;
  player.y = world.height * 0.5;
  player.vx = 0;
  player.vy = 0;
  player.dash = 0;
  player.dashCooldown = 0;
  obstacles.length = 0;
  pickups.length = 0;
  spawnTimer = 0;
  pickupTimer = 0;
  overlay.classList.remove("hidden");
  updateHUD();
}

function start() {
  running = true;
  lastTime = performance.now();
  accumulator = 0;
  overlay.classList.add("hidden");
  requestAnimationFrame(loop);
}

function loop(t) {
  const dt = (t - lastTime) / 1000;
  lastTime = t;
  accumulator += dt;
  while (accumulator >= step) {
    update(step);
    accumulator -= step;
  }
  draw();
  if (running) requestAnimationFrame(loop);
}

function update(dt) {
  const diffScale = 1 + Math.floor(score / 1000);
  level = diffScale;
  spawnTimer -= dt;
  pickupTimer -= dt;
  if (spawnTimer <= 0) {
    const h = rand(18, 46);
    const w = rand(22, 60);
    const y = rand(20, world.height - 20 - h);
    const speed = rand(120, 220) * diffScale;
    obstacles.push({ x: world.width + 20, y, w, h, vx: -speed });
    spawnTimer = rand(0.4, 1.0) / diffScale;
  }
  if (pickupTimer <= 0) {
    const size = 18;
    const y = rand(30, world.height - 30);
    const speed = rand(100, 160) * diffScale;
    pickups.push({ x: world.width + 20, y, r: size, vx: -speed });
    pickupTimer = rand(3.0, 5.0) / Math.sqrt(diffScale);
  }

  player.vx = 0;
  player.vy = 0;
  if (keys["ArrowLeft"]) player.vx -= 1;
  if (keys["ArrowRight"]) player.vx += 1;
  if (keys["ArrowUp"]) player.vy -= 1;
  if (keys["ArrowDown"]) player.vy += 1;

  let speed = player.speed;
  if (player.dash > 0) {
    speed = player.dashPower;
    player.dash -= dt;
  } else if (player.dashCooldown > 0) {
    player.dashCooldown -= dt;
  } else if (keys[" "] || keys["Space"] || keys["Spacebar"]) {
    player.dash = 0.25;
    player.dashCooldown = 1.0;
  }

  const mag = Math.hypot(player.vx, player.vy) || 1;
  player.x += (player.vx / mag) * speed * dt;
  player.y += (player.vy / mag) * speed * dt;
  player.x = clamp(player.x, 0, world.width - player.w);
  player.y = clamp(player.y, 0, world.height - player.h);

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x += o.vx * dt;
    if (o.x + o.w < -40) obstacles.splice(i, 1);
  }

  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.x += p.vx * dt;
    if (p.x + p.r < -40) pickups.splice(i, 1);
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (rectsOverlap(player.x, player.y, player.w, player.h, o.x, o.y, o.w, o.h)) {
      obstacles.splice(i, 1);
      hit();
    }
  }

  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (circleRectOverlap(p.x, p.y, p.r, player.x + player.w / 2, player.y + player.h / 2, player.w, player.h)) {
      pickups.splice(i, 1);
      score += 150;
    }
  }

  score += 30 * dt;
  updateHUD();
}

function hit() {
  lives -= 1;
  if (lives <= 0) {
    running = false;
    overlay.classList.remove("hidden");
    startBtn.textContent = "다시 시작";
  }
}

function updateHUD() {
  scoreEl.textContent = Math.floor(score);
  livesEl.textContent = lives;
  levelEl.textContent = level;
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawBackground();
  drawPickups();
  drawObstacles();
  drawPlayer();
}

function drawBackground() {
  const bandH = 40;
  ctx.fillStyle = "#0c131c";
  for (let i = 0; i < world.height / bandH; i++) {
    if (i % 2 === 0) ctx.fillRect(0, i * bandH, world.width, bandH);
  }
  ctx.fillStyle = "#1e2a3b";
  for (let x = 0; x < world.width; x += 48) {
    ctx.fillRect(x, world.height - 80, 24, 80);
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const w = player.w;
  const h = player.h;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(1, 1);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = "#7a5639";
  roundRect(ctx, 0, 0, w, h, 10, true);
  ctx.fillStyle = "#533a27";
  roundRect(ctx, w - 20, h / 2 - 6, 18, 12, 6, true);
  ctx.fillStyle = "#e6d0b3";
  ctx.beginPath();
  ctx.arc(10, 10, 5, 0, Math.PI * 2);
  ctx.arc(w - 10, 10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2e1f14";
  ctx.fillRect(w / 2 - 6, h - 10, 12, 6);
  ctx.restore();
}

function drawObstacles() {
  ctx.fillStyle = "#2b3648";
  for (const o of obstacles) {
    roundRect(ctx, o.x, o.y, o.w, o.h, 6, true);
  }
}

function drawPickups() {
  for (const p of pickups) {
    ctx.fillStyle = "#2e6ef7";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cfe2ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r / 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRect(ctx, x, y, w, h, r, fill) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  if (fill) ctx.fill();
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
  const x = clamp(cx, rx - rw / 2, rx + rw / 2);
  const y = clamp(cy, ry - rh / 2, ry + rh / 2);
  const dx = cx - x;
  const dy = cy - y;
  return dx * dx + dy * dy < cr * cr;
}

window.addEventListener("keydown", e => {
  keys[e.key] = true;
});
window.addEventListener("keyup", e => {
  keys[e.key] = false;
});

startBtn.addEventListener("click", () => {
  reset();
  overlay.classList.add("hidden");
  start();
});

reset();
