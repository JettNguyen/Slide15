# Metallic Slide Puzzle

A professional, web-based 4x4 sliding number puzzle with smooth animations, multi-tile movements, and an intelligent solver using the A* pathfinding algorithm.

## Features

### 🎮 Gameplay
- **Smooth Animations**: Seamless tile movements with spring-like transitions
- **Multi-Tile Movement**: Drag multiple tiles at once when they're aligned with the empty space
- **Click or Drag**: Click a tile to move it, or drag it (and its neighbors) for more control
- **Move Counter**: Track your progress with a real-time move counter

### 🎨 Visual Design
- **Metallic Theme**: Professional metallic finish with light reflections
- **Color-Coded Tiles**: 
  - Odd numbers (1, 3, 5, 7, 9, 11, 13, 15) - Red metallic
  - Even numbers (2, 4, 6, 8, 10, 12, 14) - Off-white metallic
- **Light Simulation**: Dynamic lighting effects that simulate reflections
- **Responsive Design**: Works on desktop and mobile devices

### 🤖 Puzzle Solver
- **A* Pathfinding**: Intelligent solver finds optimal or near-optimal solutions
- **Custom States**: Input any initial and target board configurations
- **Step-by-Step Playback**: 
  - Navigate through solution steps manually
  - Auto-play solution with pause/resume
  - Click any step to jump directly to that state
- **Solvability Check**: Automatically validates if a configuration is solvable

## How to Use

### Running the Puzzle

1. **Open in Browser**: Simply open `index.html` in any modern web browser
   - Chrome, Firefox, Safari, Edge all supported
   - No server or build process required

2. **Or use a local server** (recommended for development):
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```
   Then navigate to `http://localhost:8000`

### Playing the Game

1. **Shuffle**: Click "Shuffle" to randomize the puzzle
2. **Move Tiles**: 
   - Click any tile adjacent to the empty space (same row or column)
   - Or drag a tile toward the empty space
   - Drag multiple aligned tiles at once!
3. **Reset**: Click "Reset" to return to the solved state

### Using the Solver

1. **Open Solver**: Click "Solver Mode" to open the solver panel

2. **Input Board States**:
   - Enter 16 comma-separated numbers (0-15) where 0 represents the empty space
   - Example initial: `1,2,3,4,5,6,7,8,9,10,11,0,13,14,15,12`
   - Example target: `1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0`

3. **Load Current Board**: Click to automatically fill the initial board with the current puzzle state

4. **Find Solution**: Click "Find Solution" to calculate the optimal path
   - The solver will validate solvability
   - Solution steps appear below

5. **Navigate Solution**:
   - Use "Previous" and "Next" buttons to step through
   - Click "Play Solution" to auto-play at 1 step per second
   - Click any step in the list to jump to that state

## Board Format

Boards are represented as 16 numbers (0-15) in row-major order:

```
Row 1: positions 0-3
Row 2: positions 4-7
Row 3: positions 8-11
Row 4: positions 12-15
```

Example solved state:
```
 1  2  3  4
 5  6  7  8
 9 10 11 12
13 14 15  [empty]
```
As input: `1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0`

## Technical Details

### Architecture
- **Modular Design**: Separated concerns across 6 JavaScript modules
- **ES6 Modules**: Uses modern JavaScript module system
- **Event-Driven**: Observer pattern for state management
- **No Dependencies**: Pure vanilla JavaScript, no frameworks required

### Files
- `index.html` - Main HTML structure
- `styles.css` - Metallic theme and responsive design
- `app.js` - Application entry point and initialization
- `puzzle.js` - Core puzzle logic and state management
- `animations.js` - Smooth tile animations and drag handling
- `solver.js` - A* pathfinding algorithm
- `ui.js` - UI controller for solver interface

### Algorithm
The solver uses **A* pathfinding** with Manhattan distance heuristic:
- Efficiently finds optimal or near-optimal solutions
- Checks puzzle solvability before attempting to solve
- Handles any valid 4x4 configuration

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Smooth 60fps animations
- Solver typically finds solutions in < 1 second
- Optimized for minimal reflows and repaints
- Hardware-accelerated CSS transforms

## License

Free to use and modify for any purpose.

## Credits

Created as an industry-standard implementation of the classic 15-puzzle game.
