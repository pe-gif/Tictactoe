
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const turnDisplay = document.getElementById('player-turn');
const statusDisplay = document.getElementById('game-status');
const resetBtn = document.getElementById('reset-btn');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const modePvE = document.getElementById('mode-pve');
const modePvP = document.getElementById('mode-pvp');

// Game State
let board = Array(9).fill(null);
let currentPlayer = 'X';
let gameOver = false;
let gameMode = 'PvP'; // 'PvP' or 'PvE'

// Tracking State
let hoverTarget = null; // Can be a number (0-8) or a string ('reset', 'mode')
let hoverStartTime = 0;
const HOVER_DURATION = 1500; 
let lastFingerPos = { x: 0, y: 0 };

function checkWinner(currentBoard) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], 
        [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
    ];
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
            return currentBoard[a];
        }
    }
    if (!currentBoard.includes(null)) return 'Draw';
    return null;
}

function resetGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameOver = false;
    hoverTarget = null;
    updateUI();
}

function updateUI() {
    turnDisplay.textContent = `TURN: ${currentPlayer}`;
    turnDisplay.className = `status-pill ${currentPlayer === 'X' ? 'text-blue-400' : 'text-emerald-400'}`;
    statusDisplay.textContent = gameOver ? "GAME OVER" : "PLAYING";
    statusDisplay.className = "status-pill text-white";

    modePvE.style.opacity = gameMode === 'PvE' ? '1' : '0.4';
    modePvP.style.opacity = gameMode === 'PvP' ? '1' : '0.4';
}

function switchMode() {
    gameMode = gameMode === 'PvP' ? 'PvE' : 'PvP';
    resetGame();
}

// Standard Button Clicks (Fallback)
resetBtn.addEventListener('click', resetGame);
toggleModeBtn.addEventListener('click', switchMode);

function computerMove() {
    if (gameOver) return;
    
    // Simple AI: 1. Win if possible, 2. Block if possible, 3. Random
    const available = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (available.length === 0) return;

    let move = -1;
    
    // Check for winning move
    for (let i of available) {
        let tempBoard = [...board];
        tempBoard[i] = 'O';
        if (checkWinner(tempBoard) === 'O') { move = i; break; }
    }

    // Block player win
    if (move === -1) {
        for (let i of available) {
            let tempBoard = [...board];
            tempBoard[i] = 'X';
            if (checkWinner(tempBoard) === 'X') { move = i; break; }
        }
    }

    // Default: Random
    if (move === -1) {
        move = available[Math.floor(Math.random() * available.length)];
    }

    setTimeout(() => makeMove(move), 500);
}

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    drawGrid();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const x = (1 - indexTip.x) * canvasElement.width;
        const y = indexTip.y * canvasElement.height;
        lastFingerPos = { x, y };

        drawPointer(x, y);

        // Check UI Buttons Hover
        const resetRect = toggleModeBtn.getBoundingClientRect();
        const modeRect = resetBtn.getBoundingClientRect();
        const containerRect = canvasElement.parentElement.getBoundingClientRect();

        // Project button coords relative to canvas
        const isOverReset = checkPointInButton(x, y, resetBtn);
        const isOverToggle = checkPointInButton(x, y, toggleModeBtn);

        if (isOverReset) {
            handleHoverLogic('reset');
        } else if (isOverToggle) {
            handleHoverLogic('mode');
        } else if (!gameOver && (gameMode === 'PvP' || currentPlayer === 'X')) {
            const cellIndex = getCellFromCoords(x, y);
            handleHoverLogic(cellIndex);
        } else {
            handleHoverLogic(null);
        }
    } else {
        handleHoverLogic(null);
    }

    drawBoard();
}

function checkPointInButton(x, y, btn) {
    const rect = btn.getBoundingClientRect();
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Convert page coords to canvas-relative logic coords
    const btnLeft = rect.left - canvasRect.left;
    const btnTop = rect.top - canvasRect.top;
    
    return x >= btnLeft && x <= btnLeft + rect.width &&
            y >= btnTop && y <= btnTop + rect.height;
}

function drawGrid() {
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    canvasCtx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(i * (canvasElement.width / 3), 0);
        canvasCtx.lineTo(i * (canvasElement.width / 3), canvasElement.height);
        canvasCtx.stroke();
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, i * (canvasElement.height / 3));
        canvasCtx.lineTo(canvasElement.width, i * (canvasElement.height / 3));
        canvasCtx.stroke();
    }
}

function getCellFromCoords(x, y) {
    const col = Math.floor(x / (canvasElement.width / 3));
    const row = Math.floor(y / (canvasElement.height / 3));
    if (col >= 0 && col < 3 && row >= 0 && row < 3) return row * 3 + col;
    return null;
}

function handleHoverLogic(target) {
    // Logic for "Occupied" cells
    if (typeof target === 'number' && board[target] !== null) target = null;

    if (target === null) {
        hoverTarget = null;
        hoverStartTime = 0;
        resetBtn.classList.remove('v-btn-active');
        toggleModeBtn.classList.remove('v-btn-active');
        return;
    }

    if (target !== hoverTarget) {
        hoverTarget = target;
        hoverStartTime = Date.now();
        
        // Visual feedback for buttons
        toggleModeBtn.classList.toggle('v-btn-active', target === 'reset');
        resetBtn.classList.toggle('v-btn-active', target === 'mode');
    } else {
        const elapsed = Date.now() - hoverStartTime;
        const progress = Math.min(elapsed / HOVER_DURATION, 1);
        drawProgress(lastFingerPos.x, lastFingerPos.y, progress);

        if (progress >= 1) {
            if (target === 'reset') switchMode();
            else if (target === 'mode') resetGame();
            else if (typeof target === 'number') makeMove(target);
            
            hoverTarget = null;
            hoverStartTime = 0;
        }
    }
}

function makeMove(index) {
    if (board[index] !== null || gameOver) return;
    
    board[index] = currentPlayer;
    const winner = checkWinner(board);

    if (winner) {
        gameOver = true;
        if (winner === 'Draw') {
            statusDisplay.textContent = "IT'S A DRAW!";
            statusDisplay.className = "status-pill text-yellow-400";
        } else {
            statusDisplay.textContent = `PLAYER ${winner} WINS!`;
            statusDisplay.className = `status-pill ${winner === 'X' ? 'text-blue-400' : 'text-emerald-400'}`;
        }
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateUI();
        
        if (gameMode === 'PvE' && currentPlayer === 'O') {
            computerMove();
        }
    }
}

function drawPointer(x, y) {
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 8, 0, 2 * Math.PI);
    canvasCtx.fillStyle = currentPlayer === 'X' ? '#60a5fa' : '#34d399';
    canvasCtx.fill();
    canvasCtx.strokeStyle = 'white';
    canvasCtx.lineWidth = 2;
    canvasCtx.stroke();
}

function drawProgress(x, y, percent) {
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 22, 0, 2 * Math.PI);
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    canvasCtx.lineWidth = 4;
    canvasCtx.stroke();

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 22, -Math.PI/2, (-Math.PI/2) + (2 * Math.PI * percent));
    canvasCtx.strokeStyle = '#60a5fa';
    canvasCtx.lineWidth = 4;
    canvasCtx.stroke();
}

function drawBoard() {
    const cellW = canvasElement.width / 3;
    const cellH = canvasElement.height / 3;
    board.forEach((cell, i) => {
        if (!cell) return;
        const row = Math.floor(i / 3);
        const col = i % 3;
        const centerX = col * cellW + cellW / 2;
        const centerY = row * cellH + cellH / 2;
        canvasCtx.lineWidth = 10;
        canvasCtx.lineCap = 'round';
        if (cell === 'X') {
            canvasCtx.strokeStyle = '#60a5fa';
            const s = 40;
            canvasCtx.beginPath();
            canvasCtx.moveTo(centerX - s, centerY - s); canvasCtx.lineTo(centerX + s, centerY + s);
            canvasCtx.moveTo(centerX + s, centerY - s); canvasCtx.lineTo(centerX - s, centerY + s);
            canvasCtx.stroke();
        } else {
            canvasCtx.strokeStyle = '#34d399';
            canvasCtx.beginPath(); canvasCtx.arc(centerX, centerY, 40, 0, 2 * Math.PI); canvasCtx.stroke();
        }
    });
}

const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
camera.start();
updateUI();