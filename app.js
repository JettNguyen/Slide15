//4x4 sliding number puzzle game
import { Puzzle } from './puzzle.js';
import { AnimationController } from './animations.js';


class PuzzleGame {
    constructor() {
        this.puzzle = null;
        this.animations = null;
        this.startTime = null;
        this.gameInProgress = false;
        this.initialState = null;
        this.hasUserInteracted = false;
        this.startGame();
    }

    //set everything up
    startGame() {
        this.loadUserTheme();
        this.setupPuzzleBoard();
        this.wireUpButtons();
        this.loadAndApplyStoredColors();
        console.log('Game ready!');
    }

    //create puzzle and connect to display
    setupPuzzleBoard() {
        this.puzzle = new Puzzle(4);
        
        const boardElement = document.getElementById('puzzle-board');
        if (!boardElement) {
            console.error('Could not find the puzzle board element');
            return;
        }

        this.animations = new AnimationController(this.puzzle, boardElement);

        //listen for tile movement
        this.puzzle.on('move', (data) => {
            if (!this.hasUserInteracted && this.gameInProgress) {
                this.hasUserInteracted = true;
                console.log('First user move detected');
            }
            this.animations.animateMove(data.tiles, data.newEmptyPos);
        });

        //check if puzzle solved after each move
        this.puzzle.on('stateChange', (state) => {
            this.updateMoveCounter(state.moveCount);
            this.animations.updateFromState();
            if (state.isSolved && state.moveCount > 0) {
                this.celebrateWin();
            }
        });

        //start with a shuffled puzzle
        this.puzzle.shuffle();
        
        // Initialize the game state for a shuffled start
        const puzzleState = this.puzzle.getState();
        this.initialState = [];
        
        // Convert 2D board to flat array
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                this.initialState.push(puzzleState.board[row][col]);
            }
        }
        
        this.startTime = Date.now();
        this.gameInProgress = true;
        this.hasUserInteracted = false;
        this.updateMoveCounter(0);
    }

    //hook up button clicks
    wireUpButtons() {
        const buttons = {
            'shuffle-btn': () => this.shufflePuzzle(),
            'reset-btn': () => this.resetPuzzle(), 
            'customize-colors-btn': () => this.openColorPicker(),
            'tutorial-trigger': () => this.openTutorial()
        };

        //connect each button
        Object.entries(buttons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler);
            }
        });

        this.setupColorModal();
        this.setupTutorialModal();
    }

    //mix things up randomly
    shufflePuzzle() {
        this.puzzle.shuffle();
        
        // Get the linear board state that the solver expects
        const puzzleState = this.puzzle.getState();
        this.initialState = [];
        
        // Convert 2D board to flat array for solver
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                this.initialState.push(puzzleState.board[row][col]);
            }
        }
        
        this.startTime = Date.now();
        this.gameInProgress = true;
        this.hasUserInteracted = false;
        this.animations.rebuild();
        console.log('Shuffled - ready for solving');
    }

    //start over with solved puzzle
    resetPuzzle() {
        console.log('Resetting...');
        this.puzzle.reset();
        this.startTime = null;
        this.gameInProgress = false;
        this.initialState = null;
        this.hasUserInteracted = false;
        this.animations.rebuild();
        
        // Auto-shuffle after reset for immediate play
        setTimeout(() => {
            this.shufflePuzzle();
        }, 500);
        
        console.log('Reset and shuffled');
    }

    //update move count
    updateMoveCounter(count) {
        const moveCountElement = document.getElementById('move-count');
        if (moveCountElement) {
            moveCountElement.textContent = count;
        }
    }

    //show the win stats modal
    async celebrateWin() {
        if (!this.gameInProgress || !this.startTime) return;
        
        const state = this.puzzle.getState();
        const moves = state.moveCount;
        const endTime = Date.now();
        const timeElapsed = Math.floor((endTime - this.startTime) / 1000);
        
        this.gameInProgress = false;
        
        // Show the modal
        const modal = document.getElementById('win-modal');
        modal.style.display = 'flex';
        
        // Fill in basic stats
        document.getElementById('player-moves').textContent = moves;
        document.getElementById('time-taken').textContent = this.formatTime(timeElapsed);
        
        // Simple win message based on move count
        const message = this.getSimpleWinMessage(moves);
        document.getElementById('win-message').textContent = message;
        
        this.setupWinModal();
    }
    
    getSimpleWinMessage(moves) {
        if (moves <= 20) return "Outstanding! Excellent efficiency! 🏆";
        if (moves <= 40) return "Great work! Very well done! 🌟";
        if (moves <= 60) return "Nice job! Good puzzle solving! 👏";
        if (moves <= 100) return "Well done! Keep practicing! 👍";
        return "Puzzle solved! Great perseverance! 💪";
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    setupWinModal() {
        const modal = document.getElementById('win-modal');
        const closeBtn = document.getElementById('close-win-modal');
        const playAgainBtn = document.getElementById('play-again-btn');
        const newChallengeBtn = document.getElementById('new-challenge-btn');
        
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
        
        playAgainBtn.onclick = () => {
            closeModal();
            this.shufflePuzzle();
        };
        
        newChallengeBtn.onclick = () => {
            closeModal();
            this.resetPuzzle();
        };
    }

    // Color customization modal setup
    setupColorModal() {
        const modal = document.getElementById('color-modal');
        const closeBtn = document.getElementById('close-modal-btn');
        
        // Close modal when clicking X or outside
        closeBtn?.addEventListener('click', () => this.closeColorPicker());
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.closeColorPicker();
        });

        // Save and reset buttons
        document.getElementById('save-colors-btn')?.addEventListener('click', () => {
            this.saveUserColors();
            this.closeColorPicker();
        });

        document.getElementById('reset-colors-btn')?.addEventListener('click', () => {
            this.resetToDefaultColors();
        });
    }

    openColorPicker() {
        document.getElementById('color-modal')?.classList.remove('hidden');
    }

    closeColorPicker() {
        document.getElementById('color-modal')?.classList.add('hidden');
    }

    // Save what colors the user picked
    saveUserColors() {
        const colors = {
            bg: document.getElementById('bg-color').value,
            boardBg: document.getElementById('board-bg-color').value,
            oddTile: document.getElementById('odd-color').value,
            evenTile: document.getElementById('even-color').value,
            text: document.getElementById('text-color').value
        };

        localStorage.setItem('userColors', JSON.stringify(colors));
        this.applyColors(colors);
    }

    // Load colors from last time if available
    loadUserTheme() {
        const savedColors = localStorage.getItem('userColors');
        if (savedColors) {
            try {
                const colors = JSON.parse(savedColors);
                this.loadColorInputs(colors);
                this.applyColors(colors);
            } catch (error) {
                console.log('Using default colors');
            }
        }
    }

    // Load whatever colors the user picked before
    loadAndApplyStoredColors() {
        const savedColors = localStorage.getItem('userColors');
        if (savedColors) {
            try {
                const colors = JSON.parse(savedColors);
                this.applyColors(colors);
            } catch (error) {
                console.log('Couldnt load saved colors');
            }
        }
    }

    // Put saved colors back into the color picker inputs
    loadColorInputs(colors) {
        const mapping = {
            bg: 'bg-color',
            boardBg: 'board-bg-color',
            oddTile: 'odd-color',
            evenTile: 'even-color', 
            text: 'text-color'
        };

        Object.entries(mapping).forEach(([colorKey, inputId]) => {
            if (colors[colorKey]) {
                const input = document.getElementById(inputId);
                if (input) input.value = colors[colorKey];
            }
        });
    }

    // Actually apply the colors to the page
    applyColors(colors) {
        const root = document.documentElement;
        
        if (colors.bg) {
            // Create a gradient that's mostly the user's color with subtle variations
            const lightVariation = this.adjustBrightness(colors.bg, 15);
            const darkVariation = this.adjustBrightness(colors.bg, -10);
            
            root.style.setProperty('--bg-dark', colors.bg);
            root.style.setProperty('--bg-medium', colors.bg);
            root.style.setProperty('--bg-light', lightVariation);
            
            // Create a subtle gradient that's mostly the user's chosen color
            const gradientCSS = `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg} 60%, ${lightVariation} 85%, ${darkVariation} 100%)`;
            document.body.style.background = gradientCSS;
        }
        
        if (colors.boardBg) {
            // Apply board background color
            const boardLightVariation = this.adjustBrightness(colors.boardBg, 20);
            root.style.setProperty('--board-bg-dark', colors.boardBg);
            root.style.setProperty('--board-bg-light', boardLightVariation);
        }

        if (colors.oddTile) {
            root.style.setProperty('--accent-red', colors.oddTile);
            root.style.setProperty('--accent-red-light', this.adjustBrightness(colors.oddTile, 20));
        }

        if (colors.evenTile) {
            root.style.setProperty('--accent-off-white', colors.evenTile);
            root.style.setProperty('--accent-off-white-dark', this.adjustBrightness(colors.evenTile, -20));
        }

        if (colors.text) {
            root.style.setProperty('--text-primary', colors.text);
            root.style.setProperty('--text-secondary', this.adjustBrightness(colors.text, -20));
        }
    }

    // Go back to the original color scheme
    resetToDefaultColors() {
        const defaults = {
            bg: '#1a1a2e',
            boardBg: '#0a1128',
            oddTile: '#dc143c',
            evenTile: '#f8f9fa',
            text: '#f8f9fa'
        };

        this.loadColorInputs(defaults);
        this.applyColors(defaults);
        localStorage.removeItem('userColors');
    }

    // Helper to make colors lighter or darker
    adjustBrightness(hex, percent) {
        // Handle short hex codes
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        
        return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    // Tutorial modal setup
    setupTutorialModal() {
        const modal = document.getElementById('tutorial-modal');
        const closeBtn = document.getElementById('close-tutorial-modal');
        const gotItBtn = document.getElementById('got-it-btn');
        
        const closeTutorial = () => {
            modal.classList.add('hidden');
            // Remember that user has seen the tutorial
            localStorage.setItem('tutorial-seen', 'true');
        };
        
        closeBtn?.addEventListener('click', closeTutorial);
        gotItBtn?.addEventListener('click', closeTutorial);
        
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) closeTutorial();
        });
        
        // Show tutorial for first-time users
        const hasSeenTutorial = localStorage.getItem('tutorial-seen') === 'true';
        if (!hasSeenTutorial) {
            setTimeout(() => this.openTutorial(), 500); // Small delay for better UX
        }
    }
    
    openTutorial() {
        const modal = document.getElementById('tutorial-modal');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            console.error('Tutorial modal not found');
        }
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PuzzleGame();
});