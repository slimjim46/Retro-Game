const GRID_WIDTH = 100;
const GRID_HEIGHT = 50;
const TILE_SIZE = 32;
const LIGHT_RADIUS = 10;
const MAX_LIGHT_LEVEL = 0.8;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lightCanvas = document.createElement('canvas');
const lightCtx = lightCanvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  lightCanvas.width = window.innerWidth;
  lightCanvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); drawGrid(); });

const TILE_TYPES = { EMPTY: 0, DIRT: 1, STONE: 2, GRASS: 3, LIGHT: 4 };
const TILE_CYCLE = [1, 2, 3, 4];
const TILE_NAMES = { 1: 'Dirt', 2: 'Stone', 3: 'Grass', 4: 'Light' };
const TILE_COLORS = { 1: '#6b5a3e', 2: '#888888', 3: '#4a7c3f', 4: '#ffe94d' };

const PLAYER = {
  x: 100,
  y: 100,
  width: 32,
  height: 48,
  velocityX: 0,
  velocityY: 0,
  speed: 1,
  jumpForce: -12,
  gravity: 0.5,
  friction: 0.85,
  isGrounded: false
};

let grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
let lightMap = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
let lightSources = [];
let isLeftDown = false;
let isRightDown = false;
let currentTileType = TILE_TYPES.DIRT;
let currentCycleIndex = 0;
let isPlayerSpawned = false;

const keys = { a: false, d: false, space: false };

// --- HUD ---

function updateHUD() {
  const swatch = document.getElementById('blockSwatch');
  const label = document.getElementById('blockLabel');
  const badge = document.getElementById('modeBadge');

  swatch.style.background = TILE_COLORS[currentTileType] || '#555';
  label.textContent = TILE_NAMES[currentTileType] || 'Block';
  swatch.style.boxShadow = currentTileType === TILE_TYPES.LIGHT
    ? '0 0 8px 2px rgba(255, 230, 50, 0.6)'
    : 'none';

  if (isRightDown) {
    badge.textContent = 'Erase mode';
    badge.className = 'hud-mode-badge mode-erase';
  } else {
    badge.textContent = 'Place mode';
    badge.className = 'hud-mode-badge mode-place';
  }
}

// --- Input ---

window.addEventListener('keydown', (e) => {
  if (e.key === '1') {
    currentCycleIndex = (currentCycleIndex + 1) % TILE_CYCLE.length;
    currentTileType = TILE_CYCLE[currentCycleIndex];
    updateHUD();
  }
  if (e.key === 'p' || e.key === 'P') {
    isPlayerSpawned = true;
  }
  handlePlayerInput(e, true);
});

window.addEventListener('keyup', (e) => {
  handlePlayerInput(e, false);
});

function handlePlayerInput(e, isDown) {
  if (!isPlayerSpawned) return;
  switch (e.key.toLowerCase()) {
    case 'a': keys.a = isDown; break;
    case 'd': keys.d = isDown; break;
    case ' ': keys.space = isDown; break;
  }
}

// --- Player ---

function updatePlayer() {
  if (!isPlayerSpawned) return;

  if (keys.a) PLAYER.velocityX -= PLAYER.speed;
  if (keys.d) PLAYER.velocityX += PLAYER.speed;
  PLAYER.velocityX *= PLAYER.friction;

  if (keys.space && PLAYER.isGrounded) {
    PLAYER.velocityY = PLAYER.jumpForce;
    PLAYER.isGrounded = false;
  }

  PLAYER.velocityY += PLAYER.gravity;

  const nextX = PLAYER.x + PLAYER.velocityX;
  const nextY = PLAYER.y + PLAYER.velocityY;

  if (!checkCollision(nextX, PLAYER.y)) {
    PLAYER.x = nextX;
  } else {
    PLAYER.velocityX = 0;
  }

  if (!checkCollision(PLAYER.x, nextY)) {
    PLAYER.y = nextY;
    PLAYER.isGrounded = false;
  } else {
    if (PLAYER.velocityY > 0) PLAYER.isGrounded = true;
    PLAYER.velocityY = 0;
  }
}

function checkCollision(x, y) {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + PLAYER.width) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + PLAYER.height) / TILE_SIZE);

  for (let gy = top; gy <= bottom; gy++) {
    for (let gx = left; gx <= right; gx++) {
      if (gy >= 0 && gy < GRID_HEIGHT && gx >= 0 && gx < GRID_WIDTH) {
        if (grid[gy][gx] !== TILE_TYPES.EMPTY && grid[gy][gx] !== TILE_TYPES.LIGHT) {
          return true;
        }
      }
    }
  }
  return false;
}

// --- Lighting ---

function updateLightSources() {
  lightSources = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[y][x] === TILE_TYPES.LIGHT) {
        lightSources.push({ x, y });
      }
    }
  }
}

function calculateLighting() {
  lightMap = lightMap.map(row => row.fill(0));

  lightSources.forEach(source => {
    for (let y = Math.max(0, source.y - LIGHT_RADIUS); y < Math.min(GRID_HEIGHT, source.y + LIGHT_RADIUS); y++) {
      for (let x = Math.max(0, source.x - LIGHT_RADIUS); x < Math.min(GRID_WIDTH, source.x + LIGHT_RADIUS); x++) {
        const dx = x - source.x;
        const dy = y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= LIGHT_RADIUS) {
          let blocked = false;
          const steps = Math.max(Math.abs(dx), Math.abs(dy));

          if (steps > 0) {
            const stepX = dx / steps;
            const stepY = dy / steps;

            for (let i = 1; i < steps; i++) {
              const cx = Math.floor(source.x + stepX * i);
              const cy = Math.floor(source.y + stepY * i);

              if (cy >= 0 && cy < GRID_HEIGHT && cx >= 0 && cx < GRID_WIDTH) {
                if (grid[cy][cx] !== TILE_TYPES.EMPTY && grid[cy][cx] !== TILE_TYPES.LIGHT) {
                  blocked = true;
                  break;
                }
              }
            }
          }

          if (!blocked) {
            const intensity = 1 - (distance / LIGHT_RADIUS);
            lightMap[y][x] = Math.max(lightMap[y][x], intensity * MAX_LIGHT_LEVEL);
          }
        }
      }
    }
  });
}

function drawLighting() {
  lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (lightMap[y][x] > 0) {
        lightCtx.fillStyle = `rgba(255, 255, 200, ${lightMap[y][x]})`;
        lightCtx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

// --- Drawing ---

function drawPlayer() {
  if (!isPlayerSpawned) return;
  ctx.fillStyle = '#e00055';
  ctx.fillRect(PLAYER.x, PLAYER.y, PLAYER.width, PLAYER.height);
  ctx.fillStyle = '#ff88aa';
  ctx.fillRect(PLAYER.x + 6, PLAYER.y + 6, 8, 8);
  ctx.fillRect(PLAYER.x + 18, PLAYER.y + 6, 8, 8);
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const sx = x * TILE_SIZE;
      const sy = y * TILE_SIZE;

      if (sx < canvas.width && sy < canvas.height) {
        switch (grid[y][x]) {
          case TILE_TYPES.EMPTY: ctx.fillStyle = '#111111'; break;
          case TILE_TYPES.DIRT:  ctx.fillStyle = '#6b5a3e'; break;
          case TILE_TYPES.STONE: ctx.fillStyle = '#777777'; break;
          case TILE_TYPES.GRASS: ctx.fillStyle = '#4a7c3f'; break;
          case TILE_TYPES.LIGHT: ctx.fillStyle = '#ffe94d'; break;
        }
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

        if (grid[y][x] !== TILE_TYPES.EMPTY) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  drawPlayer();

  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(lightCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

// --- Mouse ---

function getTileFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    gridX: Math.floor((e.clientX - rect.left) / TILE_SIZE),
    gridY: Math.floor((e.clientY - rect.top) / TILE_SIZE)
  };
}

function placeTile(e) {
  const { gridX, gridY } = getTileFromEvent(e);
  if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
    grid[gridY][gridX] = isRightDown ? TILE_TYPES.EMPTY : currentTileType;
    updateLightSources();
    calculateLighting();
    drawLighting();
    drawGrid();
  }
}

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) isLeftDown = true;
  if (e.button === 2) { isRightDown = true; updateHUD(); }
  placeTile(e);
});

canvas.addEventListener('mousemove', (e) => {
  if (isLeftDown || isRightDown) placeTile(e);
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) isLeftDown = false;
  if (e.button === 2) { isRightDown = false; updateHUD(); }
});

// --- Game Loop ---

function gameLoop() {
  updatePlayer();
  updateLightSources();
  calculateLighting();
  drawLighting();
  drawGrid();
  requestAnimationFrame(gameLoop);
}

updateHUD();
gameLoop();