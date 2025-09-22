
// Game elements
const gameScene = document.getElementById('game-scene');
const playerPlane = document.getElementById('player-plane');
const scoreDisplay = document.getElementById('score-display');
const pauseBtn = document.getElementById('pause-btn');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const shopElement = document.getElementById('shop');
const closeShopBtn = document.getElementById('close-shop');
// Ingame sounds
var coinlooted = new Audio('sounds/Coins soundeffect.ogg');
var failsound = new Audio('sounds/Fail Sound Effect.mp3');
var crashsound = new Audio('sounds/Prop Plane Crash Sound Effect.mp3');
var buyingsound = new Audio('sounds/Buying Sound effect.mp3');
var propeller = new Audio('sounds/videoplayback.ogg');
var manupgsound = new Audio('sounds/futuristicupgrade.mp3');
var drillsound = new Audio('sounds/drill.mp3');
var music = new Audio('sounds/Metal Gear Solid 2 Soundtrack - Main Theme.ogg');

let musicvolume = null;
let coinvolume = null;
// Game state

let isGameOver = false;
let isPaused = false;
let score = 0;
let speed = 6;
let planeAltitude = 270;
let lives = 1;
let obstacleScoreBonus = 1;
let markScoreBonus = 15;
let markBonus = 0;
let activeIntervals = [];
let isTabVisible = true;

// Upgrades
const upgrades = {
    maneuver: { level: 0, cost: 100, baseCost: 100 },
    structure: { level: 0, cost: 150, baseCost: 150 },
    goods: { level: 0, cost: 200, baseCost: 200 }
};
//looping music & propeller
var music = new Audio('sounds/Metal Gear Solid 2 Soundtrack - Main Theme.ogg'); 
music.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play();
}, false);
music.play();
var propeller = new Audio('sounds/videoplayback.ogg'); 
propeller.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play();
}, false);
propeller.play();

// Initialize game
function initGame() {
    //start music
    music.play();
    
    // Clear previous game
    clearIntervals();
    document.querySelectorAll('.skyscraper, .enemy-plane, .special-mark, .cloud').forEach(el => el.remove());

    // Reset state
    isGameOver = false;
    isPaused = false;
    score = 0;
    speed = 6;
    obstacleScoreBonus = 1;
    markBonus = 0;
    planeAltitude = 270;
    lives = 1;

    // Reset UI
    scoreDisplay.textContent = `Score: ${score}`;
    gameOverElement.style.display = 'none';
    playerPlane.style.top = planeAltitude + 'px';
    pauseBtn.textContent = "Pause";
    shopElement.style.display = "none";

    // Reset upgrades (except structure which persists through death)
    upgrades.maneuver.level = 0;
    upgrades.goods.level = 0;
    
    // Reset upgrade costs
    upgrades.maneuver.cost = upgrades.maneuver.baseCost;
    upgrades.structure.cost = upgrades.structure.baseCost;
    upgrades.goods.cost = upgrades.goods.baseCost;
    
    // Update UI for upgrades
    document.getElementById('maneuver-level').textContent = upgrades.maneuver.level;
    document.getElementById('structure-level').textContent = upgrades.structure.level;
    document.getElementById('goods-level').textContent = upgrades.goods.level;
    
    document.getElementById('maneuver-btn').textContent = `Upgrade (${upgrades.maneuver.cost})`;
    document.getElementById('structure-btn').textContent = `Upgrade (${upgrades.structure.cost})`;
    document.getElementById('goods-btn').textContent = `Upgrade (${upgrades.goods.cost})`;

    // Apply structure upgrades (if any)
    lives += upgrades.structure.level;

    // Start game loops
    startObstacleGeneration();
    createClouds();
}

// Clear intervals
function clearIntervals() {
    activeIntervals.forEach(interval => clearInterval(interval));
    activeIntervals = [];
}

// Move player plane
function movePlane(newAltitude) {
    if (isGameOver || isPaused) return;
    planeAltitude = Math.max(20, Math.min(newAltitude, 520));
    playerPlane.style.top = planeAltitude + 'px';
}

// Create skyscraper
function createSkyscraper() {
    if (isGameOver || isPaused || !isTabVisible) return;

    const height = Math.random() * 200 + 150;
    const width = 40 + Math.random() * 60;
    const skyscraper = document.createElement('div');
    skyscraper.className = 'skyscraper';
    skyscraper.style.left = '1000px';
    skyscraper.style.height = height + 'px';
    skyscraper.style.width = width + 'px';

    // Add windows
    const windowRows = Math.floor((height - 40) / 25);
    for (let i = 0; i < windowRows; i++) {
        const windowRow = document.createElement('div');
        windowRow.className = 'window-row';
        windowRow.style.top = (20 + (i * 25)) + 'px';

        const windowCount = 3 + Math.floor(Math.random() * 5);
        for (let j = 0; j < windowCount; j++) {
            const window = document.createElement('div');
            window.className = 'window';
            windowRow.appendChild(window);
        }

        skyscraper.appendChild(windowRow);
    }

    // Add top
    const top = document.createElement('div');
    top.className = 'skyscraper-top';
    skyscraper.appendChild(top);

    gameScene.appendChild(skyscraper);

    // 20% chance for special mark
    let mark = null;
    if (Math.random() < 0.2) {
        mark = document.createElement('div');
        mark.className = 'special-mark';
        mark.textContent = '$';
        mark.style.left = (1000 + (width / 2) - 30) + 'px';
        mark.style.top = (600 - height - 65) + 'px';
        gameScene.appendChild(mark);

        mark.addEventListener('mousedown', () => {
            if (!isPaused && !isGameOver && mark) {
                const totalBonus = markScoreBonus + markBonus;
                score += totalBonus;
                scoreDisplay.textContent = `Score: ${score}`;
                mark.remove();
                mark = null;
                coinlooted.load();
                coinlooted.play();
            }
        });
    }

    return { element: skyscraper, mark };
}

// Create enemy plane
function createEnemyPlane() {
    if (isGameOver || isPaused || !isTabVisible) return;

    const plane = document.createElement('div');
    plane.className = 'enemy-plane';
    plane.style.top = (Math.random() * 250) + 'px';
    plane.style.left = '1000px';
    gameScene.appendChild(plane);
    return { element: plane };
}

// Move obstacle with extremely tight collision detection
function moveObstacle(obstacle, speedMultiplier = 1) {
    let position = 1000;
    const moveInterval = setInterval(() => {
        if (isGameOver) {
            clearInterval(moveInterval);
            return;
        }

        if (isPaused || !isTabVisible) return;

        position -= speed * speedMultiplier;
        if (obstacle.element) {
            obstacle.element.style.left = position + 'px';
        }

        if (obstacle.mark) {
            obstacle.mark.style.left = (position + (parseInt(obstacle.element.style.width) / 2) - 30) + 'px';
        }

        // Extremely precise collision detection
        if (obstacle.element) {
            const playerRect = playerPlane.getBoundingClientRect();
            const obstacleRect = obstacle.element.getBoundingClientRect();
            const gameRect = gameScene.getBoundingClientRect();

            // Calculate exact positions relative to game container
            const playerLeft = playerRect.left - gameRect.left;
            const playerRight = playerRect.right - gameRect.left;
            const playerTop = playerRect.top - gameRect.top;
            const playerBottom = playerRect.bottom - gameRect.top;
            
            const obstacleLeft = obstacleRect.left - gameRect.left;
            const obstacleRight = obstacleRect.right - gameRect.left;
            const obstacleTop = obstacleRect.top - gameRect.top;
            const obstacleBottom = obstacleRect.bottom - gameRect.top;

            const isBuilding = obstacle.element.classList.contains('skyscraper');

            if (isBuilding) {
                // For buildings - require at least 60% width overlap and any vertical overlap
                const buildingTop = 600 - parseInt(obstacle.element.style.height);
                const overlapWidth = Math.min(playerRight, obstacleRight) - Math.max(playerLeft, obstacleLeft);
                const minRequiredOverlap = playerRect.width * 0.6; // 60% of player width must overlap
                
                if (overlapWidth > minRequiredOverlap && playerBottom > buildingTop) {
                    handleCollision();
                    return;
                }
            } else {
                // For enemy planes - require at least 50% overlap in both dimensions
                const xOverlap = Math.max(0, Math.min(playerRight, obstacleRight) - Math.max(playerLeft, obstacleLeft));
                const yOverlap = Math.max(0, Math.min(playerBottom, obstacleBottom) - Math.max(playerTop, obstacleTop));
                
                // Require at least 50% overlap in both dimensions
                const minXOverlap = playerRect.width * 0.5;
                const minYOverlap = playerRect.height * 0.5;
                
                if (xOverlap > minXOverlap && yOverlap > minYOverlap) {
                    handleCollision();
                    return;
                }
            }
        }

        // Remove when off screen
        if (position < -150) {
            clearInterval(moveInterval);
            if (obstacle.element) obstacle.element.remove();
            if (obstacle.mark) obstacle.mark.remove();

            score += obstacleScoreBonus;
            scoreDisplay.textContent = `Score: ${score}`;

            if (score % 15 === 0) {
                speed += 0.4;
            }
        }
    }, 20);

    activeIntervals.push(moveInterval);
}

function handleCollision() {
    if (upgrades.structure.level > 0) {
        upgrades.structure.level--;
        document.getElementById('structure-level').textContent = upgrades.structure.level;

        // Remove all obstacles
        document.querySelectorAll('.skyscraper, .enemy-plane, .special-mark').forEach(el => el.remove());

        // Clear intervals and restart
        clearIntervals();
        startObstacleGeneration();
        crashsound.load();
        crashsound.play();
    } else {
        // Return the cost of all upgrades (except structure) when dying
        const totalRefund = (upgrades.maneuver.level * upgrades.maneuver.baseCost) + 
                            (upgrades.goods.level * upgrades.goods.baseCost);
        score += totalRefund;
        scoreDisplay.textContent = `Score: ${score}`;
        
        gameOver();
    }
}

// Start obstacle generation
function startObstacleGeneration() {
    // Skyscrapers
    const skyscraperInterval = setInterval(() => {
        const obstacle = createSkyscraper();
        if (obstacle) moveObstacle(obstacle);
    }, 2000);

    // Enemy planes
    const enemyInterval = setInterval(() => {
        const obstacle = createEnemyPlane();
        if (obstacle) moveObstacle(obstacle, 1.5);
    }, 3000);

    activeIntervals.push(skyscraperInterval, enemyInterval);
}

// Create clouds
function createClouds() {
    for (let i = 0; i < 10; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        const size = Math.random() * 150 + 80;
        cloud.style.width = size + 'px';
        cloud.style.height = (size * 0.6) + 'px';
        cloud.style.left = (Math.random() * 1200) + 'px';
        cloud.style.top = (Math.random() * 400 + 50) + 'px';
        gameScene.appendChild(cloud);

        // Animate cloud
        const cloudInterval = setInterval(() => {
            if (isGameOver || isPaused || !isTabVisible) return;

            let position = parseInt(cloud.style.left);
            position -= speed * 0.3;
            cloud.style.left = position + 'px';

            if (position < -size * 2) {
                position = 1000 + size;
                cloud.style.left = position + 'px';
                cloud.style.top = (Math.random() * 400 + 50) + 'px';
            }
        }, 50);

        activeIntervals.push(cloudInterval);
    }
}

// Game over
function gameOver() {
    isGameOver = true;
    failsound.play();
    crashsound.play();
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
    music.pause();
    propeller.pause();
    clearIntervals();
}

// Pause game
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseBtn.textContent = "Resume";
        shopElement.style.display = "block";
        music.pause();
        propeller.pause();
    } else {
        pauseBtn.textContent = "Pause";
        shopElement.style.display = "none";
        music.play();
        propeller.play();
    }
}

// Buy upgrade
function buyUpgrade(type) {
    const upgrade = upgrades[type];

    if (score >= upgrade.cost) {
        score -= upgrade.cost;
        scoreDisplay.textContent = `Score: ${score}`;
        upgrade.level++;
        document.getElementById(`${type}-level`).textContent = upgrade.level;

        switch(type) {
            case 'maneuver':
                speed += 0.5;
                obstacleScoreBonus += 1;
                upgrade.cost = Math.floor(upgrade.cost * 1.2 + 50);
                document.getElementById(`${type}-btn`).textContent = `Upgrade (${upgrade.cost})`;
                manupgsound.load();
                manupgsound.play();

                break;
            case 'structure':
                lives += 1;
                upgrade.cost = Math.floor(upgrade.cost * 1.2 + 20);
                document.getElementById(`${type}-btn`).textContent = `Upgrade (${upgrade.cost})`;
                drillsound.load();
                drillsound.play();

                break;
            case 'goods':
                markBonus += 35;
                upgrade.cost = Math.floor(upgrade.cost * 1.2 + 200);
                document.getElementById(`${type}-btn`).textContent = `Upgrade (${upgrade.cost})`;
                buyingsound.load();
                buyingsound.play();
                break;
        }
    } else {
        alert("Not enough points!");
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        movePlane(planeAltitude - 50);
    } else if (e.key === 'ArrowDown') {
        movePlane(planeAltitude + 50);
    } else if (e.code === 'Space' && isGameOver) {
        initGame();
    }
});

// Handle tab visibility changes
document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (!isTabVisible) {
        // Pause the game when tab loses focus
        if (!isPaused && !isGameOver) {
            togglePause();
        }
    }
});

restartBtn.addEventListener('click', initGame);
pauseBtn.addEventListener('click', togglePause);
closeShopBtn.addEventListener('click', togglePause);

document.getElementById('maneuver-btn').addEventListener('click', () => buyUpgrade('maneuver'));
document.getElementById('structure-btn').addEventListener('click', () => buyUpgrade('structure'));
document.getElementById('goods-btn').addEventListener('click', () => buyUpgrade('goods'));

// Start the game
initGame();
// Start paused
togglePause();