// Simple sliding puzzle - keeps track of tiles and handles moves
export class Puzzle {
    constructor(size = 4) {
        this.size = size;
        this.board = [];
        this.emptyPos = { row: 3, col: 3 }; // Bottom right corner
        this.moveCount = 0;
        this.listeners = {
            move: [],
            stateChange: []
        };
        this.setupSolvedBoard();
    }

    // Set up a solved board (numbers 1-15 in order)
    setupSolvedBoard() {
        this.board = [];
        for (let row = 0; row < this.size; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.size; col++) {
                const number = row * this.size + col + 1;
                // The last spot is empty (value 0)
                this.board[row][col] = number === this.size * this.size ? 0 : number;
            }
        }
        this.emptyPos = { row: this.size - 1, col: this.size - 1 };
        this.moveCount = 0;
    }

    // Get what's at a position
    getTile(row, col) {
        if (!this.isValidPosition(row, col)) {
            return null;
        }
        return this.board[row][col];
    }

    // Put a value at a position
    setTile(row, col, value) {
        if (this.isValidPosition(row, col)) {
            this.board[row][col] = value;
            if (value === 0) {
                this.emptyPos = { row, col };
            }
        }
    }

    // Check if position is on the board
    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    // See if a tile can slide into the empty spot
    canMoveTile(row, col) {
        const emptyRow = this.emptyPos.row;
        const emptyCol = this.emptyPos.col;
        
        // Tile must be in same row or column as empty space
        return (row === emptyRow || col === emptyCol);
    }

    // Figure out which tiles move when dragging
    getMovableTiles(row, col) {
        const emptyRow = this.emptyPos.row;
        const emptyCol = this.emptyPos.col;
        const tiles = [];

        if (row === emptyRow) {
            // Moving horizontally
            const start = Math.min(col, emptyCol);
            const end = Math.max(col, emptyCol);
            for (let c = start; c <= end; c++) {
                if (c !== emptyCol) {
                    tiles.push({ row, col: c, value: this.board[row][c] });
                }
            }
        } else if (col === emptyCol) {
            // Moving vertically
            const start = Math.min(row, emptyRow);
            const end = Math.max(row, emptyRow);
            for (let r = start; r <= end; r++) {
                if (r !== emptyRow) {
                    tiles.push({ row: r, col, value: this.board[r][col] });
                }
            }
        }

        return tiles;
    }

    // Move a tile or group of tiles
    moveTile(row, col) {
        if (!this.canMoveTile(row, col)) {
            return false;
        }

        const movableTiles = this.getMovableTiles(row, col);
        if (movableTiles.length === 0) {
            return false;
        }

        const emptyRow = this.emptyPos.row;
        const emptyCol = this.emptyPos.col;

        if (row === emptyRow) {
            // Horizontal movement
            const direction = col < emptyCol ? 1 : -1;
            for (let c = emptyCol; c !== col; c -= direction) {
                this.board[row][c] = this.board[row][c - direction];
            }
            this.board[row][col] = 0;
            this.emptyPos = { row, col };
        } else if (col === emptyCol) {
            // Vertical movement
            const direction = row < emptyRow ? 1 : -1;
            for (let r = emptyRow; r !== row; r -= direction) {
                this.board[r][col] = this.board[r - direction][col];
            }
            this.board[row][col] = 0;
            this.emptyPos = { row, col };
        }

        this.moveCount++;
        this.notifyListeners('move', {
            tiles: movableTiles,
            newEmptyPos: this.emptyPos,
            moveCount: this.moveCount
        });
        this.notifyListeners('stateChange', this.getState());

        return true;
    }

    // Which way are the tiles moving?
    getMoveDirection(row, col) {
        const emptyRow = this.emptyPos.row;
        const emptyCol = this.emptyPos.col;

        if (row === emptyRow) {
            return col < emptyCol ? 'right' : 'left';
        } else if (col === emptyCol) {
            return row < emptyRow ? 'down' : 'up';
        }
        return null;
    }

    // Mix up the tiles randomly
    shuffle(moves = 100) {
        const directions = [
            { row: -1, col: 0 }, // up
            { row: 1, col: 0 },  // down
            { row: 0, col: -1 }, // left
            { row: 0, col: 1 }   // right
        ];

        let lastMove = null;
        for (let i = 0; i < moves; i++) {
            const validMoves = [];
            
            for (const dir of directions) {
                const newRow = this.emptyPos.row + dir.row;
                const newCol = this.emptyPos.col + dir.col;
                
                if (this.isValidPosition(newRow, newCol)) {
                    // Don't undo the last move
                    const moveKey = `${newRow},${newCol}`;
                    if (moveKey !== lastMove) {
                        validMoves.push({ row: newRow, col: newCol });
                    }
                }
            }

            if (validMoves.length > 0) {
                const move = validMoves[Math.floor(Math.random() * validMoves.length)];
                lastMove = `${this.emptyPos.row},${this.emptyPos.col}`;
                
                // Swap without triggering events during shuffle
                const temp = this.board[move.row][move.col];
                this.board[move.row][move.col] = 0;
                this.board[this.emptyPos.row][this.emptyPos.col] = temp;
                this.emptyPos = { row: move.row, col: move.col };
            }
        }

        this.moveCount = 0;
        this.notifyListeners('stateChange', this.getState());
    }

    // Check if puzzle is solved
    isSolved() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const expectedValue = i * this.size + j + 1;
                const actualValue = this.board[i][j];
                
                if (i === this.size - 1 && j === this.size - 1) {
                    if (actualValue !== 0) return false;
                } else {
                    if (actualValue !== expectedValue) return false;
                }
            }
        }
        return true;
    }

    // Get current state
    getState() {
        return {
            board: this.board.map(row => [...row]),
            emptyPos: { ...this.emptyPos },
            moveCount: this.moveCount,
            isSolved: this.isSolved()
        };
    }

    // Set board state from array
    setBoardFromArray(arr) {
        if (arr.length !== this.size * this.size) {
            throw new Error(`Invalid board size. Expected ${this.size * this.size} values.`);
        }

        // Check for valid values
        const values = new Set(arr);
        if (values.size !== arr.length) {
            throw new Error('Duplicate values in board.');
        }
        for (let i = 0; i < this.size * this.size; i++) {
            if (!values.has(i)) {
                throw new Error(`Missing value: ${i}`);
            }
        }

        // Set board
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const value = arr[i * this.size + j];
                this.board[i][j] = value;
                if (value === 0) {
                    this.emptyPos = { row: i, col: j };
                }
            }
        }

        this.moveCount = 0;
        this.notifyListeners('stateChange', this.getState());
    }

    // Get board as flat array
    getBoardArray() {
        const arr = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                arr.push(this.board[i][j]);
            }
        }
        return arr;
    }

    // Put everything back to the solved state
    reset() {
        this.setupSolvedBoard();
        this.notifyListeners('stateChange', this.getState());
    }

    // Event listeners
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // Clone current state
    clone() {
        const newPuzzle = new Puzzle(this.size);
        newPuzzle.board = this.board.map(row => [...row]);
        newPuzzle.emptyPos = { ...this.emptyPos };
        newPuzzle.moveCount = this.moveCount;
        return newPuzzle;
    }
}
