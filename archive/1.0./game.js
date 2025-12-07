// Game State
let gameState = {
    playerName: '',
    selectedMap: 'stars',
    mapSize: 'normal',
    botDifficulty: 'easy',
    yellowMoney: parseInt(localStorage.getItem('yellowMoney') || '0'),
    gameRunning: false
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screen elements
const startScreen = document.getElementById('startScreen');
const loadingScreen = document.getElementById('loadingScreen');
const gameScreen = document.getElementById('gameScreen');

// Game variables
let snakes = [];
let playerSnake = null;
let money = [];
let gameLoop = null;
let lastTime = 0;
let mouseX = 0;
let mouseY = 0;

// Track pressed keys to fix movement glitch
let keysPressed = {
    w: false,
    a: false,
    s: false,
    d: false,
    arrowup: false,
    arrowdown: false,
    arrowleft: false,
    arrowright: false
};

// Camera system
let camera = {
    x: 0,
    y: 0,
    zoom: 2.0 // Zoom level (2x = more zoomed in)
};

// World dimensions (larger than canvas for scrolling)
let worldWidth = 0;
let worldHeight = 0;

// Map sizes (bigger maps with more bots)
const mapSizes = {
    small: { width: 2000, height: 1500, maxBots: 8, moneyAmount: 400 },
    normal: { width: 3000, height: 2000, maxBots: 15, moneyAmount: 600 },
    big: { width: 4000, height: 3000, maxBots: 25, moneyAmount: 800 },
    huge: { width: 5000, height: 4000, maxBots: 40, moneyAmount: 1111 }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupStartScreen();
    updateYellowMoneyDisplay();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (gameState.gameRunning && playerSnake) {
            resizeCanvas();
            // Update camera to maintain player position
            camera.x = playerSnake.x - (canvas.width / camera.zoom / 2);
            camera.y = playerSnake.y - (canvas.height / camera.zoom / 2);
            // Clamp camera to world bounds
            camera.x = Math.max(0, Math.min(camera.x, worldWidth - (canvas.width / camera.zoom)));
            camera.y = Math.max(0, Math.min(camera.y, worldHeight - (canvas.height / camera.zoom)));
        }
    });
});

function setupStartScreen() {
    // Map selection
    document.querySelectorAll('.map-option').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('disabled')) return;
            document.querySelectorAll('.map-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.selectedMap = btn.dataset.map;
        });
    });

    // Size selection
    document.querySelectorAll('.size-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.mapSize = btn.dataset.size;
        });
    });

    // Difficulty selection
    document.querySelectorAll('.difficulty-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.botDifficulty = btn.dataset.difficulty;
        });
    });

    // Start button
    document.getElementById('startButton').addEventListener('click', () => {
        gameState.playerName = document.getElementById('playerName').value || 'Player';
        startGame();
    });
}

function updateYellowMoneyDisplay() {
    document.getElementById('yellowMoneyCount').textContent = gameState.yellowMoney;
    if (document.getElementById('yellowMoneyCountGame')) {
        document.getElementById('yellowMoneyCountGame').textContent = gameState.yellowMoney;
    }
}

function startGame() {
    startScreen.classList.remove('active');
    loadingScreen.classList.add('active');
    
    // Simulate loading
    setTimeout(() => {
        loadingScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initGame();
    }, 2000);
}

function resizeCanvas() {
    // Make canvas fullscreen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function initGame() {
    try {
        const size = mapSizes[gameState.mapSize];
        if (!size) {
            console.error('Invalid map size:', gameState.mapSize);
            return;
        }
        
        // Canvas size is fullscreen
        resizeCanvas();
        
        // World size is larger
        worldWidth = size.width;
        worldHeight = size.height;
    
    // Reset game state
    snakes = [];
    money = [];
    playerSnake = null;
    starPositions = []; // Reset stars for new map
    
    // Create player snake in world coordinates
    const playerStartX = worldWidth / 2;
    const playerStartY = worldHeight / 2;
    playerSnake = new Snake(
        playerStartX,
        playerStartY,
        '#00ff00',
        true,
        gameState.playerName
    );
    snakes.push(playerSnake);
    
    // Initialize camera to center on player (after canvas is resized)
    camera.zoom = 2.0;
    camera.x = playerStartX - (canvas.width / camera.zoom / 2);
    camera.y = playerStartY - (canvas.height / camera.zoom / 2);
    
    // Create bots
    const botCount = size.maxBots;
    for (let i = 0; i < botCount; i++) {
        const x = Math.random() * worldWidth;
        const y = Math.random() * worldHeight;
        const bot = new Snake(x, y, getRandomColor(), false, `Bot ${i + 1}`);
        bot.isBot = true;
        bot.difficulty = gameState.botDifficulty;
        snakes.push(bot);
    }
    
    // Spawn initial money based on map size
    const moneyAmount = size.moneyAmount;
    spawnMoney(moneyAmount);
    
    // Setup upgrades
    setupUpgrades();
    
    // Start game loop
    gameState.gameRunning = true;
    lastTime = performance.now();
    gameLoop = requestAnimationFrame(update);
    
    // Setup input
    setupInput();
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error starting game. Please refresh the page.');
    }
}

function updateDirectionFromKeys() {
    if (!gameState.gameRunning || !playerSnake) return;
    
    let dx = 0;
    let dy = 0;
    
    // Check which keys are pressed
    if (keysPressed.w || keysPressed.arrowup) {
        dy = -1;
    }
    if (keysPressed.s || keysPressed.arrowdown) {
        dy = 1;
    }
    if (keysPressed.a || keysPressed.arrowleft) {
        dx = -1;
    }
    if (keysPressed.d || keysPressed.arrowright) {
        dx = 1;
    }
    
    // Only set direction if at least one key is pressed
    if (dx !== 0 || dy !== 0) {
        playerSnake.setDirection(dx, dy);
    }
}

function setupInput() {
    // Key down handler
    const keyDownHandler = (e) => {
        if (!gameState.gameRunning || !playerSnake) return;
        
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup' || key === 's' || key === 'arrowdown' ||
            key === 'a' || key === 'arrowleft' || key === 'd' || key === 'arrowright') {
            e.preventDefault();
            keysPressed[key] = true;
            updateDirectionFromKeys();
        }
    };
    
    // Key up handler
    const keyUpHandler = (e) => {
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup' || key === 's' || key === 'arrowdown' ||
            key === 'a' || key === 'arrowleft' || key === 'd' || key === 'arrowright') {
            e.preventDefault();
            keysPressed[key] = false;
            updateDirectionFromKeys();
        }
    };
    
    // Remove old listeners if any
    if (setupInput.keyDownHandler) {
        document.removeEventListener('keydown', setupInput.keyDownHandler);
        document.removeEventListener('keyup', setupInput.keyUpHandler);
    }
    
    setupInput.keyDownHandler = keyDownHandler;
    setupInput.keyUpHandler = keyUpHandler;
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
    // Mouse input - convert screen coordinates to world coordinates
    const mouseHandler = (e) => {
        if (!gameState.gameRunning || !playerSnake) return;
        
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const worldX = (screenX / camera.zoom) + camera.x;
        const worldY = (screenY / camera.zoom) + camera.y;
        
        // Calculate direction from player to mouse in world space
        const dx = worldX - playerSnake.x;
        const dy = worldY - playerSnake.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
            // Normalize direction
            playerSnake.setDirection(dx / dist, dy / dist);
        }
    };
    
    canvas.removeEventListener('mousemove', setupInput.mouseHandler);
    setupInput.mouseHandler = mouseHandler;
    canvas.addEventListener('mousemove', mouseHandler);
}

function setupUpgrades() {
    const sizeBtn = document.getElementById('upgradeSize');
    const speedBtn = document.getElementById('upgradeSpeed');
    const multiplierBtn = document.getElementById('upgradeMultiplier');
    
    sizeBtn.addEventListener('click', () => playerSnake.buyUpgrade('size'));
    speedBtn.addEventListener('click', () => playerSnake.buyUpgrade('speed'));
    multiplierBtn.addEventListener('click', () => playerSnake.buyUpgrade('multiplier'));
}

function update(currentTime) {
    if (!gameState.gameRunning) return;
    
    try {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
    
    // Update snakes
    snakes.forEach(snake => {
        if (snake.alive) {
            snake.update(deltaTime, worldWidth, worldHeight);
            
            // Bot AI
            if (snake.isBot) {
                updateBotAI(snake);
            }
        }
    });
    
    // Update camera to follow player
    if (playerSnake && playerSnake.alive) {
        // Smooth camera follow
        const targetX = playerSnake.x - (canvas.width / camera.zoom / 2);
        const targetY = playerSnake.y - (canvas.height / camera.zoom / 2);
        
        camera.x += (targetX - camera.x) * 0.1;
        camera.y += (targetY - camera.y) * 0.1;
        
        // Clamp camera to world bounds
        camera.x = Math.max(0, Math.min(camera.x, worldWidth - (canvas.width / camera.zoom)));
        camera.y = Math.max(0, Math.min(camera.y, worldHeight - (canvas.height / camera.zoom)));
    }
    
    // Check collisions
    checkCollisions();
    
    // Check money collection
    checkMoneyCollection();
    
    // Spawn new money if needed (keep minimum based on map size)
    const mapSize = mapSizes[gameState.mapSize];
    const minMoney = mapSize.moneyAmount;
    if (money.length < minMoney) {
        spawnMoney(5);
    }
    
    // Spawn new bots if needed
    const aliveBots = snakes.filter(s => s.isBot && s.alive).length;
    if (aliveBots < mapSize.maxBots && Math.random() < 0.01) {
        const x = Math.random() * worldWidth;
        const y = Math.random() * worldHeight;
        const bot = new Snake(x, y, getRandomColor(), false, `Bot ${snakes.length}`);
        bot.isBot = true;
        bot.difficulty = gameState.botDifficulty;
        snakes.push(bot);
    }
    
    // Render
    render();
    
    // Update UI
    updateGameUI();
    
    // Check game over
    if (!playerSnake.alive) {
        gameOver();
        return;
    }
    
    gameLoop = requestAnimationFrame(update);
    } catch (error) {
        console.error('Error in game update:', error);
        gameState.gameRunning = false;
    }
}

function updateBotAI(bot) {
    if (!bot.alive) return;
    
    // Find nearest money
    let nearestMoney = null;
    let minDist = Infinity;
    
    money.forEach(m => {
        const dx = m.x - bot.x;
        const dy = m.y - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            nearestMoney = m;
        }
    });
    
    // Find nearest threat (other snake head)
    let nearestThreat = null;
    let threatDist = Infinity;
    
    snakes.forEach(snake => {
        if (snake !== bot && snake.alive) {
            const dx = snake.x - bot.x;
            const dy = snake.y - bot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < threatDist && dist < 100) {
                threatDist = dist;
                nearestThreat = snake;
            }
        }
    });
    
    // Bot behavior based on difficulty
    const difficulty = bot.difficulty;
    let targetX = bot.x;
    let targetY = bot.y;
    
    if (nearestMoney) {
        const dx = nearestMoney.x - bot.x;
        const dy = nearestMoney.y - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (difficulty === 'easy') {
            // Easy bots are slower and less accurate
            if (Math.random() > 0.3) {
                targetX = nearestMoney.x + (Math.random() - 0.5) * 50;
                targetY = nearestMoney.y + (Math.random() - 0.5) * 50;
            }
        } else if (difficulty === 'normal') {
            // Normal bots go for money
            targetX = nearestMoney.x;
            targetY = nearestMoney.y;
        } else if (difficulty === 'hard') {
            // Hard bots avoid threats and go for money
            if (nearestThreat && threatDist < 80) {
                // Avoid threat
                const avoidDx = bot.x - nearestThreat.x;
                const avoidDy = bot.y - nearestThreat.y;
                const avoidDist = Math.sqrt(avoidDx * avoidDx + avoidDy * avoidDy);
                targetX = bot.x + (avoidDx / avoidDist) * 50;
                targetY = bot.y + (avoidDy / avoidDist) * 50;
            } else {
                targetX = nearestMoney.x;
                targetY = nearestMoney.y;
            }
        }
    }
    
    // Set direction towards target
    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
        bot.setDirection(dx / dist, dy / dist);
    }
    
    // Auto-buy upgrades
    bot.autoBuyUpgrade();
}

function checkCollisions() {
    for (let i = 0; i < snakes.length; i++) {
        const snake1 = snakes[i];
        if (!snake1.alive) continue;
        
        // Borders wrap around (handled in update function), no wall collision check needed
        
        // Check collision with other snakes
        for (let j = 0; j < snakes.length; j++) {
            const snake2 = snakes[j];
            if (!snake2.alive || i === j) continue;
            
            // Head to head collision
            const headDist = Math.sqrt(
                Math.pow(snake1.x - snake2.x, 2) + 
                Math.pow(snake1.y - snake2.y, 2)
            );
            if (headDist < snake1.size + snake2.size) {
                snake1.alive = false;
                snake2.alive = false;
                continue;
            }
            
            // Head to body collision
            for (let k = 1; k < snake2.body.length; k++) {
                const segment = snake2.body[k];
                const dist = Math.sqrt(
                    Math.pow(snake1.x - segment.x, 2) + 
                    Math.pow(snake1.y - segment.y, 2)
                );
                if (dist < snake1.size) {
                    snake1.alive = false;
                    break;
                }
            }
        }
    }
}

function checkMoneyCollection() {
    snakes.forEach(snake => {
        if (!snake.alive) return;
        
        // Use a reverse loop to safely remove items while iterating
        for (let i = money.length - 1; i >= 0; i--) {
            const m = money[i];
            const dx = snake.x - m.x;
            const dy = snake.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < snake.size + m.size) {
                // Collect money - ONLY give yellow money if it's actually a yellow money item
                if (m.type === 'green') {
                    // Green money increases by 10 (with multiplier)
                    snake.greenMoney += 10 * snake.multiplier;
                } else if (m.type === 'yellow') {
                    // Yellow money increases by 1 (no multiplier) - ONLY for player
                    if (snake.isPlayer) {
                        gameState.yellowMoney += 1;
                        localStorage.setItem('yellowMoney', gameState.yellowMoney.toString());
                    }
                    // Don't track yellowMoney per snake, only global
                }
                
                money.splice(i, 1);
            }
        }
    });
}

function spawnMoney(count) {
    for (let i = 0; i < count; i++) {
        const x = Math.random() * worldWidth;
        const y = Math.random() * worldHeight;
        // 20% yellow, 80% green
        const type = Math.random() < 0.8 ? 'green' : 'yellow';
        // Value is now just for display/type, actual values are handled in collection
        const value = type === 'green' ? 10 : 1;
        money.push(new Money(x, y, type, value));
    }
}

let starPositions = [];

function generateStars() {
    starPositions = [];
    const starCount = Math.floor((worldWidth * worldHeight) / 2000);
    for (let i = 0; i < starCount; i++) {
        starPositions.push({
            x: Math.random() * worldWidth,
            y: Math.random() * worldHeight,
            size: Math.random() * 2 + 0.5,
            brightness: Math.random() * 0.8 + 0.2
        });
    }
}

function render() {
    // Save context
    ctx.save();
    
    // Apply camera transform (zoom and translate)
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    // Clear canvas (draw background)
    if (gameState.selectedMap === 'stars') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, worldWidth, worldHeight);
        
        // Draw stars
        if (starPositions.length === 0) {
            generateStars();
        }
        starPositions.forEach(star => {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
    } else if (gameState.selectedMap === 'rainbow') {
        const time = Date.now() / 1000;
        const gradient = ctx.createLinearGradient(0, 0, worldWidth, worldHeight);
        const hue1 = (time * 30) % 360;
        const hue2 = (hue1 + 60) % 360;
        const hue3 = (hue2 + 60) % 360;
        gradient.addColorStop(0, `hsl(${hue1}, 100%, 10%)`);
        gradient.addColorStop(0.5, `hsl(${hue2}, 100%, 10%)`);
        gradient.addColorStop(1, `hsl(${hue3}, 100%, 10%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, worldWidth, worldHeight);
    } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, worldWidth, worldHeight);
    }
    
    // Draw world border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeRect(0, 0, worldWidth, worldHeight);
    
    // Draw money (update and draw)
    money.forEach(m => m.draw(ctx));
    
    // Draw snakes
    snakes.forEach(snake => {
        if (snake.alive) {
            snake.draw(ctx);
        }
    });
    
    // Restore context
    ctx.restore();
}


function updateGameUI() {
    if (!playerSnake) return;
    
    document.getElementById('greenMoneyCount').textContent = Math.floor(playerSnake.greenMoney);
    document.getElementById('yellowMoneyCountGame').textContent = gameState.yellowMoney;
    
    document.getElementById('sizeLevel').textContent = playerSnake.sizeLevel;
    document.getElementById('speedLevel').textContent = playerSnake.speedLevel;
    document.getElementById('multiplierLevel').textContent = playerSnake.multiplierLevel;
    
    document.getElementById('sizeCost').textContent = playerSnake.getUpgradeCost('size');
    document.getElementById('speedCost').textContent = playerSnake.getUpgradeCost('speed');
    document.getElementById('multiplierCost').textContent = playerSnake.getUpgradeCost('multiplier');
    
    document.getElementById('upgradeSize').disabled = 
        playerSnake.sizeLevel >= 10 || playerSnake.greenMoney < playerSnake.getUpgradeCost('size');
    document.getElementById('upgradeSpeed').disabled = 
        playerSnake.speedLevel >= 10 || playerSnake.greenMoney < playerSnake.getUpgradeCost('speed');
    document.getElementById('upgradeMultiplier').disabled = 
        playerSnake.multiplierLevel >= 5 || playerSnake.greenMoney < playerSnake.getUpgradeCost('multiplier');
}

function gameOver() {
    gameState.gameRunning = false;
    cancelAnimationFrame(gameLoop);
    
    setTimeout(() => {
        gameScreen.classList.remove('active');
        startScreen.classList.add('active');
        updateYellowMoneyDisplay();
    }, 2000);
}

function getRandomColor() {
    const colors = ['#ff0000', '#00ffff', '#ff00ff', '#ffff00', '#ff8800', '#0088ff'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Snake Class
class Snake {
    constructor(x, y, color, isPlayer, name) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.isPlayer = isPlayer;
        this.name = name;
        this.alive = true;
        this.isBot = false;
        this.difficulty = 'easy';
        
        this.dx = 1;
        this.dy = 0;
        this.size = 15; // Base size (grows slower with upgrades)
        this.speed = 100; // pixels per second
        this.body = [{ x, y }];
        
        // Money
        this.greenMoney = 0;
        this.yellowMoney = 0;
        
        // Upgrades
        this.sizeLevel = 1;
        this.speedLevel = 1;
        this.multiplierLevel = 1;
        this.multiplier = 1;
        
        // Initialize body to be longer at start
        for (let i = 1; i < 10; i++) {
            this.body.push({ x: x - i * 15, y: y });
        }
    }
    
    setDirection(dx, dy) {
        // Normalize direction vector
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.01) {
            // If no direction, don't change current direction (allow stopping at borders)
            return;
        }
        
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        
        // Prevent reversing into body only if we have a body
        if (this.body.length > 1) {
            const secondSegment = this.body[1];
            const currentDirX = this.x - secondSegment.x;
            const currentDirY = this.y - secondSegment.y;
            const currentLength = Math.sqrt(currentDirX * currentDirX + currentDirY * currentDirY);
            
            if (currentLength > 0.1) {
                const currentNormX = currentDirX / currentLength;
                const currentNormY = currentDirY / currentLength;
                
                // Check if new direction is opposite to current direction
                const dot = normalizedDx * currentNormX + normalizedDy * currentNormY;
                if (dot < -0.7) {
                    return; // Don't reverse (only if very opposite)
                }
            }
        }
        
        // Always allow direction change - set normalized direction
        this.dx = normalizedDx;
        this.dy = normalizedDy;
    }
    
    update(deltaTime, worldWidth, worldHeight) {
        if (!this.alive) return;
        
        const moveDistance = (this.speed * deltaTime) / 1000;
        let newX = this.x;
        let newY = this.y;
        
        // Try to move in X direction
        if (this.dx !== 0) {
            newX = this.x + this.dx * moveDistance;
            // Check if new position would hit border
            if (newX - this.size < 0) {
                newX = this.size; // Clamp to border
                // Only stop if still trying to move in that direction
                if (this.dx < 0) {
                    this.dx = 0; // Stop horizontal movement
                }
            } else if (newX + this.size > worldWidth) {
                newX = worldWidth - this.size; // Clamp to border
                // Only stop if still trying to move in that direction
                if (this.dx > 0) {
                    this.dx = 0; // Stop horizontal movement
                }
            }
            this.x = newX;
        }
        
        // Try to move in Y direction
        if (this.dy !== 0) {
            newY = this.y + this.dy * moveDistance;
            // Check if new position would hit border
            if (newY - this.size < 0) {
                newY = this.size; // Clamp to border
                // Only stop if still trying to move in that direction
                if (this.dy < 0) {
                    this.dy = 0; // Stop vertical movement
                }
            } else if (newY + this.size > worldHeight) {
                newY = worldHeight - this.size; // Clamp to border
                // Only stop if still trying to move in that direction
                if (this.dy > 0) {
                    this.dy = 0; // Stop vertical movement
                }
            }
            this.y = newY;
        }
        
        // Update body
        this.body.unshift({ x: this.x, y: this.y });
        
        // Keep body length based on size level (size upgrade affects length)
        // Start longer (10), and each level adds more length
        const bodyLength = 10 + this.sizeLevel * 5;
        if (this.body.length > bodyLength) {
            this.body.pop();
        }
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        // Draw body
        ctx.fillStyle = this.color;
        this.body.forEach((segment, index) => {
            const alpha = 1 - (index / this.body.length) * 0.5;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(segment.x, segment.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Draw head
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw name
        if (this.isPlayer || this.isBot) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x, this.y - this.size - 10);
        }
    }
    
    getUpgradeCost(type) {
        if (type === 'size') {
            return 10 * Math.pow(1.5, this.sizeLevel - 1);
        } else if (type === 'speed') {
            return 10 * Math.pow(1.5, this.speedLevel - 1);
        } else if (type === 'multiplier') {
            return 15 * Math.pow(2, this.multiplierLevel - 1);
        }
        return 0;
    }
    
    buyUpgrade(type) {
        const cost = this.getUpgradeCost(type);
        if (this.greenMoney < cost) return false;
        
        if (type === 'size' && this.sizeLevel < 10) {
            this.greenMoney -= cost;
            this.sizeLevel++;
            // Size upgrade makes snake longer (body length) and a bit bigger (radius grows slower)
            // Radius grows slowly: base 15, +1 per level
            this.size = 15 + (this.sizeLevel - 1) * 1;
            return true;
        } else if (type === 'speed' && this.speedLevel < 10) {
            this.greenMoney -= cost;
            this.speedLevel++;
            this.speed = 100 + (this.speedLevel - 1) * 20;
            return true;
        } else if (type === 'multiplier' && this.multiplierLevel < 5) {
            this.greenMoney -= cost;
            this.multiplierLevel++;
            this.multiplier = this.multiplierLevel;
            return true;
        }
        return false;
    }
    
    autoBuyUpgrade() {
        if (!this.isBot) return;
        
        // Bots auto-buy upgrades
        const upgrades = ['size', 'speed', 'multiplier'];
        const randomUpgrade = upgrades[Math.floor(Math.random() * upgrades.length)];
        
        if (this.greenMoney >= this.getUpgradeCost(randomUpgrade)) {
            this.buyUpgrade(randomUpgrade);
        }
    }
}

// Money Class
class Money {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.value = value;
        this.size = type === 'green' ? 8 : 10;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    }
    
    update() {
        this.rotation += this.rotationSpeed;
    }
    
    draw(ctx) {
        this.update();
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (this.type === 'green') {
            ctx.fillStyle = '#00ff00';
        } else {
            ctx.fillStyle = '#FFD700';
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw $ symbol
        ctx.fillStyle = '#000';
        ctx.font = `${this.size * 1.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        
        ctx.restore();
    }
}

