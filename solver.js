// Solves sliding puzzles step by step
export class PuzzleSolver {
    constructor(size = 4) {
        this.size = size;
        this.totalCells = size * size;
        
        // Work out where each tile should go
        this.targetPositions = new Array(this.totalCells);
        for (let i = 0; i < this.totalCells; i++) {
            this.targetPositions[i] = {
                row: Math.floor(i / size),
                col: i % size
            };
        }
    }

    // Figure out how to solve the puzzle
    async solve(initialBoard, targetBoard, progressCallback) {
        const start = this.boardToCompactState(initialBoard);
        const goal = this.boardToCompactState(targetBoard);

        // Make sure this can actually be solved
        if (!this.isSolvable(initialBoard)) {
            throw new Error('This puzzle configuration cannot be solved.');
        }

        // Try the quick method first
        if (progressCallback) {
            progressCallback({ status: 'Trying A* algorithm...', progress: 5 });
        }

        try {
            const result = await this.aStarAsync(start, goal, targetBoard, progressCallback);
            if (result) return result;
        } catch (error) {
            console.log('A* hit a wall, switching to the backup plan...');
        }

        // Use the slower but more thorough algorithm
        if (progressCallback) {
            progressCallback({ status: 'Switching to IDA* algorithm...', progress: 10 });
        }

        try {
            const idaResult = await this.idaStarAsync(start, goal, targetBoard, progressCallback);
            if (idaResult) return idaResult;
        } catch (error) {
            console.log('IDA* also hit a wall, trying simple BFS...');
        }
        
        // Final fallback: simple BFS for very difficult puzzles
        if (progressCallback) {
            progressCallback({ status: 'Using simple search...', progress: 60 });
        }
        
        const bfsResult = await this.guidedBFS(start, goal, progressCallback);
        
        if (!bfsResult) {
            throw new Error('Could not find a solution - this puzzle is really tricky!');
        }

        return bfsResult;
    }

    // Asynchronous A* implementation with progress updates
    async aStarAsync(start, goal, targetBoard, progressCallback) {
        const openSet = new PriorityQueue();
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        
        // Pre-compute goal positions for faster heuristic
        this.goalPositions = new Array(this.totalCells);
        for (let i = 0; i < this.totalCells; i++) {
            const value = targetBoard[i];
            if (value !== 0) {
                this.goalPositions[value] = {
                    row: Math.floor(i / this.size),
                    col: i % this.size
                };
            }
        }

        const startKey = this.stateToNumber(start);
        const goalKey = this.stateToNumber(goal);
        const initialHeuristic = this.enhancedHeuristic(start);

        openSet.enqueue(start, initialHeuristic);
        gScore.set(startKey, 0);

        let iterations = 0;
        const maxIterations = 8000; // Reduced iterations for faster timeout
        const startTime = Date.now();
        const maxTime = 2000; // Reduced to 2 second timeout for A*
        const progressInterval = 25; // Yield much more frequently

        if (progressCallback) {
            progressCallback({
                status: 'A* search in progress...',
                iterations: 0,
                openSetSize: 1,
                closedSetSize: 0,
                bestHeuristic: initialHeuristic
            });
        }

        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
            
            // Yield to main thread much more frequently (every 25 iterations)
            if (iterations % progressInterval === 0) {
                const elapsed = Date.now() - startTime;
                
                if (progressCallback) {
                    const current = openSet.peek();
                    const currentHeuristic = current ? this.enhancedHeuristic(current) : 0;
                    
                    progressCallback({
                        status: `A* searching... (${Math.floor(elapsed/1000)}s)`,
                        iterations,
                        openSetSize: openSet.size(),
                        closedSetSize: closedSet.size,
                        bestHeuristic: currentHeuristic,
                        progress: 15 + (iterations / maxIterations) * 30
                    });
                }
                
                // Give more time to main thread
                await new Promise(resolve => setTimeout(resolve, 2));
                
                if (elapsed > maxTime) {
                    console.log('A* timeout after', elapsed, 'ms, switching to backup');
                    throw new Error('A* timeout');
                }
            }

            const current = openSet.dequeue();
            const currentKey = this.stateToNumber(current);

            if (currentKey === goalKey) {
                if (progressCallback) {
                    progressCallback({ 
                        status: 'A* solution found!', 
                        progress: 50 
                    });
                }
                return this.reconstructPath(cameFrom, current);
            }

            if (closedSet.has(currentKey)) continue;
            closedSet.add(currentKey);

            const neighbors = this.getNeighborsOptimized(current);
            const currentGScore = gScore.get(currentKey) || 0;
            
            // Prune neighbors that are clearly too far
            const maxDepth = initialHeuristic + 15; // Allow some extra moves
            
            for (const neighbor of neighbors) {
                const neighborKey = this.stateToNumber(neighbor);
                
                if (closedSet.has(neighborKey)) continue;

                const tentativeGScore = currentGScore + 1;
                const heuristic = this.enhancedHeuristic(neighbor);
                
                // Prune if estimated total cost is too high
                if (tentativeGScore + heuristic > maxDepth) continue;
                
                const existingGScore = gScore.get(neighborKey);

                if (existingGScore === undefined || tentativeGScore < existingGScore) {
                    cameFrom.set(neighborKey, { state: current, move: neighbor.lastMove });
                    gScore.set(neighborKey, tentativeGScore);
                    
                    const fScore = tentativeGScore + heuristic;
                    openSet.enqueue(neighbor, fScore);
                }
            }
        }

        throw new Error('A* failed');
    }

    // IDA* (Iterative Deepening A*) for memory-efficient solving
    async idaStarAsync(start, goal, targetBoard, progressCallback) {
        const goalKey = this.stateToNumber(goal);
        let threshold = this.enhancedHeuristic(start);
        const startTime = Date.now();
        const maxTime = 6000; // Increased to 6 seconds for IDA*
        let iteration = 0;
        
        while (threshold < 70 && iteration < 30) { // Increased limits
            iteration++;
            
            if (progressCallback) {
                const elapsed = Date.now() - startTime;
                progressCallback({
                    status: `IDA* depth ${threshold} (${Math.floor(elapsed/1000)}s)`,
                    progress: 50 + (threshold / 70) * 30,
                    iterations: iteration
                });
            }
            
            if (Date.now() - startTime > maxTime) {
                console.log('IDA* timeout after', Date.now() - startTime, 'ms');
                throw new Error('IDA* timeout');
            }
            
            // Yield more time between iterations
            await new Promise(resolve => setTimeout(resolve, 5));
            
            const result = await this.idaSearch(start, 0, threshold, goalKey, new Set(), progressCallback);
            
            if (Array.isArray(result)) {
                if (progressCallback) {
                    progressCallback({ status: 'IDA* solution found!', progress: 95 });
                }
                return result;
            }
            
            if (result === Infinity) {
                break; // No solution possible
            }
            
            threshold = result; // Next threshold
        }
        
        return null;
    }
    
    async idaSearch(state, g, threshold, goalKey, visited, progressCallback) {
        const f = g + this.enhancedHeuristic(state);
        
        if (f > threshold) return f;
        
        const currentKey = this.stateToNumber(state);
        if (currentKey === goalKey) {
            return []; // Found solution
        }
        
        if (visited.has(currentKey)) return Infinity;
        visited.add(currentKey);
        
        // Yield more frequently to prevent blocking (every 10 recursive calls)
        if (g > 0 && g % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        let min = Infinity;
        const neighbors = this.getNeighborsOptimized(state);
        
        for (const neighbor of neighbors) {
            const neighborKey = this.stateToNumber(neighbor);
            if (visited.has(neighborKey)) continue;
            
            const result = await this.idaSearch(neighbor, g + 1, threshold, goalKey, visited, progressCallback);
            
            if (Array.isArray(result)) {
                // Found solution, prepend current move
                return [neighbor.lastMove, ...result];
            }
            
            if (result < min) {
                min = result;
            }
        }
        
        visited.delete(currentKey);
        return min;
    }

    // Enhanced heuristic with linear conflicts
    enhancedHeuristic(state) {
        let distance = 0;
        let conflicts = 0;
        
        // Manhattan distance + Linear conflicts
        for (let i = 0; i < this.totalCells; i++) {
            const value = state.board[i];
            if (value === 0) continue;

            const currentRow = Math.floor(i / this.size);
            const currentCol = i % this.size;
            const goalPos = this.goalPositions[value];
            
            if (goalPos) {
                distance += Math.abs(currentRow - goalPos.row) + Math.abs(currentCol - goalPos.col);
                
                // Count linear conflicts in rows
                if (currentRow === goalPos.row) {
                    for (let j = currentCol + 1; j < this.size; j++) {
                        const otherValue = state.board[currentRow * this.size + j];
                        if (otherValue !== 0) {
                            const otherGoalPos = this.goalPositions[otherValue];
                            if (otherGoalPos && otherGoalPos.row === currentRow && otherGoalPos.col < goalPos.col) {
                                conflicts++;
                            }
                        }
                    }
                }
                
                // Count linear conflicts in columns
                if (currentCol === goalPos.col) {
                    for (let j = currentRow + 1; j < this.size; j++) {
                        const otherValue = state.board[j * this.size + currentCol];
                        if (otherValue !== 0) {
                            const otherGoalPos = this.goalPositions[otherValue];
                            if (otherGoalPos && otherGoalPos.col === currentCol && otherGoalPos.row < goalPos.row) {
                                conflicts++;
                            }
                        }
                    }
                }
            }
        }

        return distance + (conflicts * 2);
    }
    
    // Fast Manhattan distance heuristic (fallback)
    fastHeuristic(state) {
        let distance = 0;
        
        for (let i = 0; i < this.totalCells; i++) {
            const value = state.board[i];
            if (value === 0) continue;

            const currentRow = Math.floor(i / this.size);
            const currentCol = i % this.size;
            const goalPos = this.goalPositions[value];
            
            if (goalPos) {
                distance += Math.abs(currentRow - goalPos.row) + Math.abs(currentCol - goalPos.col);
            }
        }

        return distance;
    }

    // Optimized neighbor generation
    getNeighborsOptimized(state) {
        const neighbors = [];
        const emptyIndex = state.emptyIndex;
        const emptyRow = Math.floor(emptyIndex / this.size);
        const emptyCol = emptyIndex % this.size;

        const directions = [
            { row: -1, col: 0, name: 'down' }, // Empty moves up, tile moves down
            { row: 1, col: 0, name: 'up' },   // Empty moves down, tile moves up
            { row: 0, col: -1, name: 'right' }, // Empty moves left, tile moves right
            { row: 0, col: 1, name: 'left' }   // Empty moves right, tile moves left
        ];

        for (const dir of directions) {
            const newRow = emptyRow + dir.row;
            const newCol = emptyCol + dir.col;

            if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) {
                const tileIndex = newRow * this.size + newCol;
                const newBoard = state.board.slice(); // Fast array copy
                const tileValue = newBoard[tileIndex];
                
                // Swap tiles
                newBoard[emptyIndex] = tileValue;
                newBoard[tileIndex] = 0;

                neighbors.push({
                    board: newBoard,
                    emptyIndex: tileIndex,
                    lastMove: {
                        from: { row: newRow, col: newCol },
                        to: { row: emptyRow, col: emptyCol },
                        value: tileValue,
                        direction: dir.name
                    }
                });
            }
        }

        return neighbors;
    }

    // Convert board array to compact state object
    boardToCompactState(boardArray) {
        let emptyIndex = -1;
        for (let i = 0; i < boardArray.length; i++) {
            if (boardArray[i] === 0) {
                emptyIndex = i;
                break;
            }
        }

        return {
            board: boardArray.slice(),
            emptyIndex: emptyIndex
        };
    }

    // Convert state to number for fast comparison
    stateToNumber(state) {
        let result = 0;
        let multiplier = 1;
        
        for (let i = this.totalCells - 1; i >= 0; i--) {
            result += state.board[i] * multiplier;
            multiplier *= 16; // Base 16 for numbers 0-15
        }
        
        return result;
    }

    // Reconstruct path from goal to start
    reconstructPath(cameFrom, current) {
        const path = [];
        let currentKey = this.stateToNumber(current);

        while (cameFrom.has(currentKey)) {
            const prev = cameFrom.get(currentKey);
            if (prev.move) {
                path.unshift(prev.move);
            }
            current = prev.state;
            currentKey = this.stateToNumber(current);
        }

        return path;
    }

    // Apply a sequence of moves to a board (updated for compact states)
    applyMoves(initialBoard, moves) {
        const states = [this.boardToCompactState(initialBoard)];
        let currentBoard = initialBoard.slice();

        for (const move of moves) {
            const fromIndex = move.from.row * this.size + move.from.col;
            const toIndex = move.to.row * this.size + move.to.col;
            
            currentBoard[toIndex] = move.value;
            currentBoard[fromIndex] = 0;

            states.push(this.boardToCompactState(currentBoard));
        }

        return states;
    }

    // Convert compact state to flat array
    stateToArray(state) {
        return state.board.slice();
    }

    // Check if puzzle is solvable using inversion count
    isSolvable(boardArray) {
        let inversions = 0;
        let emptyRow = 0;

        // Count inversions
        const flatBoard = [];
        for (let i = 0; i < boardArray.length; i++) {
            if (boardArray[i] === 0) {
                emptyRow = Math.floor(i / this.size);
            } else {
                flatBoard.push(boardArray[i]);
            }
        }

        for (let i = 0; i < flatBoard.length; i++) {
            for (let j = i + 1; j < flatBoard.length; j++) {
                if (flatBoard[i] > flatBoard[j]) {
                    inversions++;
                }
            }
        }

        // For 4x4 puzzle:
        // If empty space is on even row from bottom, inversions must be odd
        // If empty space is on odd row from bottom, inversions must be even
        const emptyRowFromBottom = this.size - emptyRow;
        
        if (this.size % 2 === 0) {
            if (emptyRowFromBottom % 2 === 0) {
                return inversions % 2 === 1;
            } else {
                return inversions % 2 === 0;
            }
        } else {
            return inversions % 2 === 0;
        }
    }

    // Turn the solution into easy-to-read steps
    getSolutionSteps(moves) {
        const arrows = {
            up: '↑',
            down: '↓', 
            left: '←',
            right: '→'
        };
        
        return moves.map((move, index) => ({
            step: index + 1,
            tile: move.value,
            from: move.from,
            to: move.to,
            direction: move.direction,
            description: `Move tile ${move.value} ${move.direction} ${arrows[move.direction]}`,
            shortDesc: `${move.value} ${arrows[move.direction]}`
        }));
    }

    // Apply a sequence of moves to a board (updated for compact states)
    applyMoves(initialBoard, moves) {
        const states = [this.boardToCompactState(initialBoard)];
        let currentBoard = initialBoard.slice();

        for (const move of moves) {
            const fromIndex = move.from.row * this.size + move.from.col;
            const toIndex = move.to.row * this.size + move.to.col;
            
            currentBoard[toIndex] = move.value;
            currentBoard[fromIndex] = 0;

            states.push(this.boardToCompactState(currentBoard));
        }

        return states;
    }

    // Convert compact state to flat array
    stateToArray(state) {
        return state.board.slice();
    }

    // Guided BFS fallback for very difficult puzzles
    async guidedBFS(start, goal, progressCallback) {
        const startTime = Date.now();
        const maxTime = 15000; // Increased to 15 seconds for guided BFS
        const maxStates = 60000; // Reasonable memory limit
        
        // Use priority queue for best-first search instead of pure BFS
        const queue = new PriorityQueue();
        const visited = new Set();
        const goalKey = this.stateToNumber(goal);
        const startKey = this.stateToNumber(start);
        
        console.log('Guided BFS starting, goal key:', goalKey);
        
        // Start with initial state
        queue.enqueue({ state: start, path: [] }, this.enhancedHeuristic(start));
        visited.add(startKey);
        
        let iterations = 0;
        let bestHeuristic = this.enhancedHeuristic(start);
        
        while (!queue.isEmpty() && iterations < maxStates) {
            iterations++;
            const elapsed = Date.now() - startTime;
            
            // Yield every 100 iterations for better performance
            if (iterations % 100 === 0) {
                if (progressCallback) {
                    progressCallback({
                        status: `Guided search (h=${bestHeuristic})... (${Math.floor(elapsed/1000)}s)`,
                        progress: 70 + (iterations / maxStates) * 25,
                        iterations
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 1));
                
                if (elapsed > maxTime) {
                    console.log('Guided BFS timeout after', elapsed, 'ms');
                    return null;
                }
            }
            
            const { state, path } = queue.dequeue();
            const currentKey = this.stateToNumber(state);
            const currentHeuristic = this.enhancedHeuristic(state);
            
            // Track best heuristic seen
            if (currentHeuristic < bestHeuristic) {
                bestHeuristic = currentHeuristic;
                console.log('Improved heuristic to', bestHeuristic, 'at depth', path.length);
            }
            
            // Check if we've reached the goal
            if (currentKey === goalKey) {
                console.log('Guided BFS found solution with', path.length, 'moves');
                if (progressCallback) {
                    progressCallback({ status: 'Guided search found solution!', progress: 100 });
                }
                return path;
            }
            
            // Don't explore paths that are too long or have poor heuristic
            if (path.length >= 45) {
                continue;
            }
            
            const neighbors = this.getNeighborsOptimized(state);
            
            for (const neighbor of neighbors) {
                const neighborKey = this.stateToNumber(neighbor);
                
                if (!visited.has(neighborKey)) {
                    visited.add(neighborKey);
                    const neighborHeuristic = this.enhancedHeuristic(neighbor);
                    
                    // Use f = g + h for priority (A* style)
                    queue.enqueue({
                        state: neighbor,
                        path: [...path, neighbor.lastMove]
                    }, neighborHeuristic + path.length + 1);
                }
            }
        }
        
        console.log('Guided BFS exhausted search space after checking', iterations, 'states');
        console.log('Best heuristic achieved:', bestHeuristic);
        return null;
    }
}

// Efficient priority queue implementation for A*
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(item, priority) {
        const queueElement = { item, priority };
        let added = false;
        
        for (let i = 0; i < this.elements.length; i++) {
            if (queueElement.priority < this.elements[i].priority) {
                this.elements.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }
        
        if (!added) {
            this.elements.push(queueElement);
        }
    }

    dequeue() {
        return this.elements.shift()?.item;
    }

    peek() {
        return this.elements[0]?.item;
    }

    size() {
        return this.elements.length;
    }

    isEmpty() {
        return this.elements.length === 0;
    }
}

// Helper function to validate board input
export function validateBoardInput(input, size = 4) {
    const parts = input.split(',').map(s => s.trim());
    
    if (parts.length !== size * size) {
        throw new Error(`Board must have ${size * size} values.`);
    }

    const numbers = parts.map(p => {
        const num = parseInt(p);
        if (isNaN(num)) {
            throw new Error(`Invalid number: ${p}`);
        }
        return num;
    });

    // Check for valid range
    const values = new Set(numbers);
    if (values.size !== numbers.length) {
        throw new Error('Duplicate values found.');
    }

    for (let i = 0; i < size * size; i++) {
        if (!values.has(i)) {
            throw new Error(`Missing value: ${i}`);
        }
    }

    return numbers;
}
