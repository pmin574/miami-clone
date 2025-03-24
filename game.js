// Game variables
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let gameStarted = false;
let gameOver = false;
let score = 0;
let health = 100;
let enemiesKilled = 0;

// Sound Manager
class SoundManager {
  constructor() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.sounds = {};
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.value = 0.3; // 30% volume for music
    this.musicGain.connect(this.audioContext.destination);
  }

  // Generate 8-bit sound effects
  generateShootSound() {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(
      440,
      this.audioContext.currentTime + 0.1
    ); // A4 note

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.1
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  generateReloadSound() {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4 note
    oscillator.frequency.exponentialRampToValueAtTime(
      880,
      this.audioContext.currentTime + 0.2
    ); // A5 note

    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.2
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  generateEnemyDeathSound() {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3 note
    oscillator.frequency.exponentialRampToValueAtTime(
      110,
      this.audioContext.currentTime + 0.15
    ); // A2 note

    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.15
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.15);
  }

  generatePlayerDamageSound() {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(110, this.audioContext.currentTime); // A2 note
    oscillator.frequency.exponentialRampToValueAtTime(
      55,
      this.audioContext.currentTime + 0.1
    ); // A1 note

    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.1
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  generateBackgroundMusic() {
    const notes = [440, 494, 523, 587, 659, 587, 523, 494]; // A4, B4, C5, D5, E5, D5, C5, B4
    let currentNote = 0;

    const playNote = () => {
      if (!gameStarted || gameOver) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(
        notes[currentNote],
        this.audioContext.currentTime
      );

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + 0.5
      );

      oscillator.connect(gainNode);
      gainNode.connect(this.musicGain);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.5);

      currentNote = (currentNote + 1) % notes.length;
    };

    // Play a note every 0.5 seconds
    setInterval(playNote, 500);
  }
}

// Create sound manager instance
const soundManager = new SoundManager();

// Set canvas size
function resizeCanvas() {
  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.8;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Base game object class
class GameObject {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.angle = 0;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }

  update() {
    // Override in child classes
  }
}

// Player
class Player extends GameObject {
  constructor(x, y) {
    super(x, y, 20, "#0f0");
    this.speed = 5;
    this.angle = 0;
    this.bullets = [];
    this.ammo = 30;
    this.maxAmmo = 30;
    this.reloading = false;
    this.reloadStartTime = 0;
    this.dashSpeed = 15;
    this.dashDuration = 200;
    this.isDashing = false;
    this.dashCooldown = 1000;
    this.lastDashTime = 0;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw player body
    ctx.fillStyle = "#0f0";
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw player direction indicator
    ctx.fillStyle = "#0a0";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.size / 2, 0);
    ctx.lineTo(this.size / 3, -this.size / 4);
    ctx.lineTo(this.size / 3, this.size / 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// Create player instance
const player = new Player(canvas.width / 2, canvas.height / 2);

// Enemies
let enemies = [];
const enemySpawnInterval = 2000; // Spawn enemy every 2 seconds
let lastSpawnTime = 0;

// Walls
const walls = [
  { x: 100, y: 100, width: 200, height: 20 },
  { x: 400, y: 100, width: 200, height: 20 },
  { x: 100, y: 300, width: 200, height: 20 },
  { x: 400, y: 300, width: 200, height: 20 },
  { x: 100, y: 500, width: 200, height: 20 },
  { x: 400, y: 500, width: 200, height: 20 },
  // Vertical walls
  { x: 100, y: 100, width: 20, height: 200 },
  { x: 300, y: 100, width: 20, height: 200 },
  { x: 500, y: 100, width: 20, height: 200 },
  { x: 100, y: 400, width: 20, height: 200 },
  { x: 300, y: 400, width: 20, height: 200 },
  { x: 500, y: 400, width: 20, height: 200 },
];

// Game objects
class Bullet extends GameObject {
  constructor(x, y, angle, speed) {
    super(x, y, 5, "#ff0");
    this.angle = angle;
    this.speed = speed;
    this.damage = 25;
    this.trail = [];
    this.maxTrailLength = 5;
  }

  draw() {
    // Draw bullet trail
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = i / this.trail.length;
      ctx.beginPath();
      ctx.arc(
        this.trail[i].x,
        this.trail[i].y,
        this.size * 0.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.fill();
    }

    // Draw bullet
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw glow effect
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
    ctx.fill();
  }

  update() {
    // Update trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }
}

class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y, 20, "#f00");
    this.speed = 2;
    this.health = 100;
    this.angle = 0;
    this.originalColor = "#f00";
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw enemy body
    ctx.fillStyle = this.originalColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw enemy direction indicator
    ctx.fillStyle = "#a00";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.size / 2, 0);
    ctx.lineTo(this.size / 3, -this.size / 4);
    ctx.lineTo(this.size / 3, this.size / 4);
    ctx.closePath();
    ctx.fill();

    // Draw health bar
    const healthBarWidth = this.size;
    const healthBarHeight = 4;
    const healthPercentage = this.health / 100;

    ctx.fillStyle = "#000";
    ctx.fillRect(
      -healthBarWidth / 2,
      -this.size / 2 - 10,
      healthBarWidth,
      healthBarHeight
    );

    ctx.fillStyle = "#0f0";
    ctx.fillRect(
      -healthBarWidth / 2,
      -this.size / 2 - 10,
      healthBarWidth * healthPercentage,
      healthBarHeight
    );

    ctx.restore();
  }

  update() {
    // Move towards player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    this.angle = Math.atan2(dy, dx);

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }
}

// Input handling
const keys = {};
const mouse = {
  x: 0,
  y: 0,
  pressed: false,
};

window.addEventListener("keydown", (e) => (keys[e.key] = true));
window.addEventListener("keyup", (e) => (keys[e.key] = false));
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener("mousedown", () => {
  mouse.pressed = true;
  shoot(); // Add shooting when mouse is clicked
});
canvas.addEventListener("mouseup", () => (mouse.pressed = false));

// Game functions
function spawnEnemy() {
  const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  let x, y;

  switch (side) {
    case 0: // top
      x = Math.random() * canvas.width;
      y = -20;
      break;
    case 1: // right
      x = canvas.width + 20;
      y = Math.random() * canvas.height;
      break;
    case 2: // bottom
      x = Math.random() * canvas.width;
      y = canvas.height + 20;
      break;
    case 3: // left
      x = -20;
      y = Math.random() * canvas.height;
      break;
  }

  enemies.push(new Enemy(x, y));
}

function shoot() {
  if (player.ammo > 0 && !player.reloading) {
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    player.bullets.push(new Bullet(player.x, player.y, angle, 10));
    player.ammo--;
    soundManager.generateShootSound();
  }
}

function reload() {
  if (!player.reloading && player.ammo < player.maxAmmo) {
    player.reloading = true;
    player.reloadStartTime = Date.now();
    soundManager.generateReloadSound();
    setTimeout(() => {
      player.ammo = player.maxAmmo;
      player.reloading = false;
    }, 1000);
  }
}

function dash() {
  const currentTime = Date.now();
  if (
    !player.isDashing &&
    currentTime - player.lastDashTime >= player.dashCooldown
  ) {
    player.isDashing = true;
    player.lastDashTime = currentTime;

    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const dashX = Math.cos(angle) * player.dashSpeed;
    const dashY = Math.sin(angle) * player.dashSpeed;

    setTimeout(() => {
      player.x += dashX;
      player.y += dashY;
      player.isDashing = false;
    }, player.dashDuration);
  }
}

function updatePlayer() {
  if (player.isDashing) return;

  let dx = 0;
  let dy = 0;

  if (keys["w"]) dy -= player.speed;
  if (keys["s"]) dy += player.speed;
  if (keys["a"]) dx -= player.speed;
  if (keys["d"]) dx += player.speed;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const factor = 1 / Math.sqrt(2);
    dx *= factor;
    dy *= factor;
  }

  // Check wall collisions before moving
  const newX = player.x + dx;
  const newY = player.y + dy;

  if (!checkWallCollision(newX, player.y, player.size)) {
    player.x = newX;
  }
  if (!checkWallCollision(player.x, newY, player.size)) {
    player.y = newY;
  }

  // Keep player in bounds
  player.x = Math.max(
    player.size / 2,
    Math.min(canvas.width - player.size / 2, player.x)
  );
  player.y = Math.max(
    player.size / 2,
    Math.min(canvas.height - player.size / 2, player.y)
  );

  // Update player angle to face mouse
  player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
}

function checkCollisions() {
  // Check bullet-enemy collisions
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const bullet = player.bullets[i];
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (bullet.size + enemy.size) / 2) {
        enemy.health -= bullet.damage;
        player.bullets.splice(i, 1);
        if (enemy.health <= 0) {
          enemies.splice(j, 1);
          score += 100;
          enemiesKilled++;
          document.getElementById("scoreValue").textContent = score;
          soundManager.generateEnemyDeathSound();
        }
        break;
      }
    }
  }

  // Check player-enemy collisions
  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < (player.size + enemy.size) / 2) {
      health -= 20;
      document.getElementById("healthValue").textContent = health;
      soundManager.generatePlayerDamageSound();
      if (health <= 0) {
        endGame();
      }
    }
  }
}

function updateEnemies() {
  enemies.forEach((enemy) => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    enemy.angle = Math.atan2(dy, dx);

    const newX = enemy.x + Math.cos(enemy.angle) * enemy.speed;
    const newY = enemy.y + Math.sin(enemy.angle) * enemy.speed;

    if (!checkWallCollision(newX, enemy.y, enemy.size)) {
      enemy.x = newX;
    }
    if (!checkWallCollision(enemy.x, newY, enemy.size)) {
      enemy.y = newY;
    }
  });
}

function update() {
  if (!gameStarted || gameOver) return;

  // Spawn enemies
  const currentTime = Date.now();
  if (currentTime - lastSpawnTime >= enemySpawnInterval) {
    spawnEnemy();
    lastSpawnTime = currentTime;
  }

  // Update game objects
  updatePlayer();
  updateEnemies();
  player.bullets.forEach((bullet) => bullet.update());
  checkCollisions();

  // Remove off-screen bullets
  player.bullets = player.bullets.filter(
    (bullet) =>
      bullet.x >= 0 &&
      bullet.x <= canvas.width &&
      bullet.y >= 0 &&
      bullet.y <= canvas.height
  );
}

function draw() {
  // Clear canvas
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw walls
  ctx.fillStyle = "#333";
  walls.forEach((wall) => {
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
  });

  // Draw game objects
  player.bullets.forEach((bullet) => bullet.draw());
  enemies.forEach((enemy) => enemy.draw());
  player.draw();

  // Draw crosshair
  ctx.beginPath();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.moveTo(mouse.x - 10, mouse.y);
  ctx.lineTo(mouse.x + 10, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 10);
  ctx.lineTo(mouse.x, mouse.y + 10);
  ctx.stroke();

  // Draw ammo counter and reload animation in bottom right corner
  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  ctx.textAlign = "right";
  ctx.fillText(
    `${player.ammo}/${player.maxAmmo}`,
    canvas.width - 20,
    canvas.height - 20
  );

  // Draw reloading animation
  if (player.reloading) {
    const reloadX = canvas.width - 20;
    const reloadY = canvas.height - 45;
    const radius = 8;
    const startAngle = -Math.PI / 2;
    const progress = Math.min((Date.now() - player.reloadStartTime) / 1000, 1);
    const endAngle = startAngle + progress * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(reloadX, reloadY, radius, startAngle, endAngle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  gameStarted = true;
  document.getElementById("startMenu").style.display = "none";
  resetGame();
  soundManager.generateBackgroundMusic();
}

function endGame() {
  gameOver = true;
  document.getElementById("finalScore").textContent = score;
  document.getElementById("enemiesKilled").textContent = enemiesKilled;
  document.getElementById("gameOver").classList.remove("hidden");
}

function resetGame() {
  score = 0;
  health = 100;
  enemiesKilled = 0;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.ammo = player.maxAmmo;
  player.bullets = [];
  enemies = [];
  document.getElementById("scoreValue").textContent = score;
  document.getElementById("healthValue").textContent = health;
}

// Event listeners
document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("restartButton").addEventListener("click", () => {
  gameOver = false;
  document.getElementById("gameOver").classList.add("hidden");
  resetGame();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "r") {
    reload();
  }
  if (e.key === " ") {
    dash();
  }
});

// Add wall collision check
function checkWallCollision(x, y, size) {
  for (const wall of walls) {
    if (
      x + size / 2 > wall.x &&
      x - size / 2 < wall.x + wall.width &&
      y + size / 2 > wall.y &&
      y - size / 2 < wall.y + wall.height
    ) {
      return true;
    }
  }
  return false;
}

// Start the game
gameLoop();
