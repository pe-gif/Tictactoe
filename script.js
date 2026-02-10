
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const turnDisplay = document.getElementById('player-turn');
const statusDisplay = document.getElementById('game-status');
const toggleModeBtn = document.getElementById('reset-btn');
const resetBtn = document.getElementById('toggle-mode-btn');
const modePvE = document.getElementById('mode-pve');
const modePvP = document.getElementById('mode-pvp');

// Game State
let board = Array(9).fill(null);
let currentPlayer = 'X';
let gameOver = false;
let gameMode = 'PvP'; 

// Tracking State
let hoverTarget = null; 
let hoverStartTime = 0;
const HOVER_DURATION = 1400; 
let lastFingerPos = { x: 0, y: 0 };

function checkWinner(currentBoard) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], 
        [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
    ];
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) return currentBoard[a];
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
    statusDisplay.textContent = gameOver ? "DONE" : "LIVE";
    statusDisplay.className = "status-pill text-white";
    modePvE.style.opacity = gameMode === 'PvE' ? '1' : '0.25';
    modePvP.style.opacity = gameMode === 'PvP' ? '1' : '0.25';
}

function switchMode() {
    gameMode = gameMode === 'PvP' ? 'PvE' : 'PvP';
    resetGame();
}

toggleModeBtn.addEventListener('click', resetGame);
resetBtn.addEventListener('click', switchMode);

function computerMove() {
    if (gameOver) return;
    const available = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (available.length === 0) return;

    let move = -1;
    // Try win
    for (let i of available) {
        let temp = [...board]; temp[i] = 'O';
        if (checkWinner(temp) === 'O') { move = i; break; }
    }
    // Block win
    if (move === -1) {
        for (let i of available) {
            let temp = [...board]; temp[i] = 'X';
            if (checkWinner(temp) === 'X') { move = i; break; }
        }
    }
    if (move === -1) move = available[Math.floor(Math.random() * available.length)];
    
    setTimeout(() => makeMove(move), 600);
}

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw Video
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);
    // Draw video to fill the square canvas
    const scale = Math.max(canvasElement.width / results.image.width, canvasElement.height / results.image.height);
    const x = (canvasElement.width - results.image.width * scale) / 2;
    const y = (canvasElement.height - results.image.height * scale) / 2;
    canvasCtx.drawImage(results.image, x, y, results.image.width * scale, results.image.height * scale);
    canvasCtx.restore();

    drawGrid();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        
        // Logic coordinates based on 800x800 internal grid
        const fx = (1 - indexTip.x) * canvasElement.width;
        const fy = indexTip.y * canvasElement.height;
        lastFingerPos = { x: fx, y: fy };

        drawPointer(fx, fy);

        const isOverReset = checkPointInButton(fx, fy, resetBtn);
        const isOverToggle = checkPointInButton(fx, fy, toggleModeBtn);

        if (isOverReset) handleHoverLogic('reset');
        else if (isOverToggle) handleHoverLogic('mode');
        else if (!gameOver && (gameMode === 'PvP' || currentPlayer === 'X')) {
            const cellIndex = getCellFromCoords(fx, fy);
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
    
    // Convert page space to internal canvas 800x800 space
    const scaleX = canvasElement.width / canvasRect.width;
    const scaleY = canvasElement.height / canvasRect.height;

    const btnLeft = (rect.left - canvasRect.left) * scaleX;
    const btnTop = (rect.top - canvasRect.top) * scaleY;
    const btnWidth = rect.width * scaleX;
    const btnHeight = rect.height * scaleY;
    
    return x >= btnLeft && x <= btnLeft + btnWidth &&
            y >= btnTop && y <= btnTop + btnHeight;
}

function drawGrid() {
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    canvasCtx.lineWidth = 4;
    const size = canvasElement.width;
    for (let i = 1; i < 3; i++) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(i * (size / 3), 0);
        canvasCtx.lineTo(i * (size / 3), size);
        canvasCtx.stroke();
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, i * (size / 3));
        canvasCtx.lineTo(size, i * (size / 3));
        canvasCtx.stroke();
    }
}

function getCellFromCoords(x, y) {
    const size = canvasElement.width;
    const col = Math.floor(x / (size / 3));
    const row = Math.floor(y / (size / 3));
    if (col >= 0 && col < 3 && row >= 0 && row < 3) return row * 3 + col;
    return null;
}

function handleHoverLogic(target) {
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
        toggleModeBtn.classList.toggle('v-btn-active', target === 'reset');
        resetBtn.classList.toggle('v-btn-active', target === 'mode');
    } else {
        const elapsed = Date.now() - hoverStartTime;
        const progress = Math.min(elapsed / HOVER_DURATION, 1);
        drawProgress(lastFingerPos.x, lastFingerPos.y, progress);

        if (progress >= 1) {
            if (target === 'reset') resetGame();
            else if (target === 'mode') switchMode();
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
            statusDisplay.textContent = "DRAW";
            statusDisplay.className = "status-pill text-yellow-400";
        } else {
            statusDisplay.textContent = `${winner} WINS!`;
            statusDisplay.className = `status-pill ${winner === 'X' ? 'text-blue-400' : 'text-emerald-400'}`;
        }
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateUI();
        if (gameMode === 'PvE' && currentPlayer === 'O') computerMove();
    }
}

function drawPointer(x, y) {
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 12, 0, 2 * Math.PI);
    canvasCtx.fillStyle = currentPlayer === 'X' ? '#60a5fa' : '#34d399';
    canvasCtx.fill();
    canvasCtx.strokeStyle = 'white';
    canvasCtx.lineWidth = 3;
    canvasCtx.stroke();
}

function drawProgress(x, y, percent) {
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 30, 0, 2 * Math.PI);
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    canvasCtx.lineWidth = 6;
    canvasCtx.stroke();

    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 30, -Math.PI/2, (-Math.PI/2) + (2 * Math.PI * percent));
    canvasCtx.strokeStyle = '#60a5fa';
    canvasCtx.lineWidth = 6;
    canvasCtx.stroke();
}

function drawBoard() {
    const size = canvasElement.width / 3;
    board.forEach((cell, i) => {
        if (!cell) return;
        const row = Math.floor(i / 3);
        const col = i % 3;
        const cx = col * size + size / 2;
        const cy = row * size + size / 2;
        canvasCtx.lineWidth = 14;
        canvasCtx.lineCap = 'round';
        if (cell === 'X') {
            canvasCtx.strokeStyle = '#60a5fa';
            const s = size * 0.25;
            canvasCtx.beginPath();
            canvasCtx.moveTo(cx - s, cy - s); canvasCtx.lineTo(cx + s, cy + s);
            canvasCtx.moveTo(cx + s, cy - s); canvasCtx.lineTo(cx - s, cy + s);
            canvasCtx.stroke();
        } else {
            canvasCtx.strokeStyle = '#34d399';
            canvasCtx.beginPath(); canvasCtx.arc(cx, cy, size * 0.25, 0, 2 * Math.PI); canvasCtx.stroke();
        }
    });
}

const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 1280, height: 720 // High res feed
});
camera.start();
updateUI();