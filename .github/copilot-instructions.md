# Copilot Instructions: Air Tic-Tac-Toe

## Project Overview
A gesture-based Tic Tac Toe game with dual implementations:
- **Web version** (primary): HTML/CSS/JS with MediaPipe hand gesture recognition
- **C++ version** (archive): Windows Forms GUI for COP 2006 coursework

## Architecture: Gesture → Game Logic → Canvas Rendering

### Core Loop (script.js)
1. **MediaPipe captures hand landmarks** → `onResults()` extracts index finger tip position
2. **Coordinate mapping** → Converts MediaPipe coordinates to canvas space (account for mirrored transform)
3. **Hover detection** → Checks if finger is over grid cell or button; accumulates hover time
4. **Game state update** → `makeMove()` or `computerMove()` on hover completion (1500ms threshold in `HOVER_DURATION`)
5. **Canvas redraw** → `drawBoard()`, `drawGrid()`, `drawPointer()`, `drawProgress()` visualize state

### Key State Variables (script.js)
- `board[]`: 9-element array (0-8) representing 3x3 grid; `null` = empty, `'X'` = player, `'O'` = computer
- `currentPlayer`: tracks whose turn ('X' or 'O')
- `hoverTarget`: what user is pointing at (cell index 0-8, 'reset', 'mode', or null)
- `hoverStartTime`: timestamp for hover duration calculation
- `gameMode`: 'PvP' (two players) or 'PvE' (vs computer)

## Gesture Input System

### Coordinate Transformation
```javascript
// Canvas has scaleX(-1) CSS transform for mirror effect
// MediaPipe coords: (0,0) = top-left, 1.0 = bottom-right, x is left→right
// Canvas coords: index finger x = (1 - mediapose_x) * canvas.width
```

### Hover Activation Pattern
- `handleHoverLogic()`: Tracks whether finger stays over same target for `HOVER_DURATION` (1500ms)
- When duration elapses → `drawProgress()` shows circular progress bar
- Occupied cells (`board[index] !== null`) never become hover targets
- Visual feedback: `v-btn-active` class highlights buttons during hover

### Button Detection
- `checkPointInButton()`: Tests if finger point is within button bounds; converts button coords relative to canvas
- "Reset" button and "Switch Mode" button are `pointer-events: auto` in overlay

## Game Logic

### Win Detection (checkWinner)
```javascript
// 8 winning patterns: 3 rows, 3 cols, 2 diagonals
// Returns: 'X', 'O', 'Draw', or null
```

### AI Move Strategy (computerMove)
1. **Win**: Check if computer can win in 1 move; if yes, play it
2. **Block**: Check if opponent (X) can win; if yes, block
3. **Random**: Pick any remaining empty cell

AI moves execute with 500ms delay (`setTimeout`) for perceived "thinking"

## UI Rendering (Canvas)

### Drawing Order (onResults)
1. Clear canvas + flip context for mirror effect
2. Draw webcam frame (MediaPipe processes this)
3. `drawGrid()`: Semi-transparent white lines (2px width, 0.2 opacity)
4. `drawBoard()`: X's and O's at cell centers; cell size = `canvas.width/3`
5. `drawPointer()`: Blue circle at finger tip position
6. `drawProgress()`: Arc showing hover completion % (if hovering)

### Canvas Dimensions
- Fixed 640×480 (set in HTML)
- Grid cells: ~213×160px each
- Rendered at full viewport size via CSS

## Common Tasks & Patterns

### Adding Features
- **New mode**: Add case to `switchMode()` logic; update `updateUI()` for visual feedback
- **Gesture input type**: Extend `onResults()` landmark detection (hand index differs; see MediaPipe docs for 21-point hand model)
- **AI improvement**: Modify `computerMove()` logic; maintain same function signature

### Debugging
- `console.log(lastFingerPos, hoverTarget)` to trace hand tracking
- Check `getBoundingClientRect()` values to verify button collision zones
- Canvas coordinates: remember the scaleX(-1) transform affects visual layout

### Game State Integrity
- `resetGame()` is source of truth for initialization; call it after mode switch or win/draw
- `checkWinner()` must be called BEFORE state mutation to detect win condition (see C++ for contrast)

## Differences: Web vs C++ Implementation

| Aspect | Web (Primary) | C++ (Archive) |
|--------|---|---|
| Input | Gesture (MediaPipe) | Mouse clicks |
| UI | Canvas + HTML overlay | Windows HWND buttons |
| AI | Win/block/random strategy | Random only |
| Rendering | Continuous 30fps+ | Event-driven |

The C++ version is educational and not actively developed; focus on web version for features.

## Build/Run

**Web**: Open `index.html` in browser with webcam permission
**C++**: `g++ tictactoe_gui.cpp -o tictactoe_gui.exe -mwindows` (Windows only)

## External Dependencies
- **MediaPipe Hands**: `@mediapipe/hands`, `@mediapipe/camera_utils`, `@mediapipe/drawing_utils` (CDN)
- **Tailwind CSS**: CDN (no build step)
- No npm/bundler required
