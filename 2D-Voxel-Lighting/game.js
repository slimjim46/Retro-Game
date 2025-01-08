const GRID_WIDTH = 100;
const GRID_HEIGHT = 50;
const TILE_SIZE = 32;
const LIGHT_RADIUS = 10;
const MAX_LIGHT_LEVEL = 0.8;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const lightCanvas = document.createElement('canvas');
const lightCtx = lightCanvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
lightCanvas.width = window.innerWidth;
lightCanvas.height = window.innerHeight;

const TILE_TYPES = {
  EMPTY: 0,
  DIRT: 1,
  STONE: 2,
  GRASS: 3,
  LIGHT: 4
};

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
let isMouseDown = false;
let isEraseMode = false;
let currentTileType = TILE_TYPES.DIRT;
let isPlayerSpawned = false;
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false
};

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  lightCanvas.width = window.innerWidth;
  lightCanvas.height = window.innerHeight;
  drawGrid();
});

window.addEventListener('keydown', (e) => {
  if (e.key === '1') {
    currentTileType = currentTileType === TILE_TYPES.LIGHT ? TILE_TYPES.DIRT : TILE_TYPES.LIGHT;
    console.log(currentTileType === TILE_TYPES.LIGHT ? 'Light block mode' : 'Normal block mode');
  }
  if (e.key === 'e' || e.key === 'E') {
    isEraseMode = !isEraseMode;
    console.log(isEraseMode ? 'Erase mode activated' : 'Erase mode deactivated');
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
  
  switch(e.key.toLowerCase()) {
    case 'a': keys.a = isDown; break;
    case 'd': keys.d = isDown; break;
    case 'w': keys.w = isDown; break;
    case 's': keys.s = isDown; break;
    case ' ': keys.space = isDown; break;
  }
}

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
    if (PLAYER.velocityY > 0) {
      PLAYER.isGrounded = true;
    }
    PLAYER.velocityY = 0;
  }
}

function checkCollision(x, y) {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + PLAYER.width) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + PLAYER.height) / TILE_SIZE);
  
  for (let gridY = top; gridY <= bottom; gridY++) {
    for (let gridX = left; gridX <= right; gridX++) {
      if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
        if (grid[gridY][gridX] !== TILE_TYPES.EMPTY && grid[gridY][gridX] !== TILE_TYPES.LIGHT) {
          return true;
        }
      }
    }
  }
  return false;
}

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
              const checkX = Math.floor(source.x + stepX * i);
              const checkY = Math.floor(source.y + stepY * i);
              
              if (checkY >= 0 && checkY < GRID_HEIGHT && checkX >= 0 && checkX < GRID_WIDTH) {
                if (grid[checkY][checkX] !== TILE_TYPES.EMPTY && grid[checkY][checkX] !== TILE_TYPES.LIGHT) {
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
      const screenX = x * TILE_SIZE;
      const screenY = y * TILE_SIZE;
      
      if (lightMap[y][x] > 0) {
        lightCtx.fillStyle = `rgba(255, 255, 200, ${lightMap[y][x]})`;
        lightCtx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

function drawPlayer() {
  if (!isPlayerSpawned) return;
  
  ctx.fillStyle = 'red';
  ctx.fillRect(PLAYER.x, PLAYER.y, PLAYER.width, PLAYER.height);
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const screenX = x * TILE_SIZE;
      const screenY = y * TILE_SIZE;
      
      if (screenX >= 0 && screenX < canvas.width && screenY >= 0 && screenY < canvas.height) {
        switch (grid[y][x]) {
          case TILE_TYPES.EMPTY:
            ctx.fillStyle = '#111';
            break;
          case TILE_TYPES.DIRT:
            ctx.fillStyle = '#555';
            break;
          case TILE_TYPES.STONE:
            ctx.fillStyle = '#777';
            break;
          case TILE_TYPES.GRASS:
            ctx.fillStyle = '#363';
            break;
          case TILE_TYPES.LIGHT:
            ctx.fillStyle = '#ff0';
            break;
        }
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }
  }
  
  drawPlayer();
  
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(lightCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

function placeTile(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const gridX = Math.floor(mouseX / TILE_SIZE);
  const gridY = Math.floor(mouseY / TILE_SIZE);
  
  if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
    if (isEraseMode) {
      grid[gridY][gridX] = TILE_TYPES.EMPTY;
    } else {
      grid[gridY][gridX] = currentTileType;
    }
    updateLightSources();
    calculateLighting();
    drawLighting();
    drawGrid();
  }
}

canvas.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  placeTile(e);
});

canvas.addEventListener('mousemove', (e) => {
  if (isMouseDown) {
    placeTile(e);
  }
});

canvas.addEventListener('mouseup', () => {
  isMouseDown = false;
});

function gameLoop() {
  updatePlayer();
  updateLightSources();
  calculateLighting();
  drawLighting();
  drawGrid();
  requestAnimationFrame(gameLoop);
}

gameLoop();