import Phaser from 'phaser';
import GameConfig from '../config/GameConfig.js';
import { NetworkManager } from '../network/NetworkManager.js';
import Connect4Connection from '../network/Connect4Connection.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.boardState = []; // 6x7 matrix
        this.myScore = 0;
        this.oppScore = 0;
        this.localRole = 'A'; // A (Red) or B (Blue)
        this.currentTurn = 'A'; // A always starts
        this.isGameOver = false;
        this.cols = GameConfig.RULES.COLS;
        this.rows = GameConfig.RULES.ROWS;
    }

    preload() {
        // No SVG assets — board and tokens are drawn with Phaser Graphics
        this.load.audio('stacking', 'public/audio/stacking.mp3');
    }

    create() {
        this.initializeBoardState();
        this.createBoardVisuals();
        this.createUI();
        this.setupNetworking();

        // Handle window resize dynamically
        this.scale.on('resize', this.resize, this);
        this.resize(this.scale.gameSize);
    }

    initializeBoardState() {
        this.boardState = [];
        for (let r = 0; r < this.rows; r++) {
            this.boardState.push(new Array(this.cols).fill(0));
        }
        this.currentTurn = 'A';
        this.isGameOver = false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // BOARD RENDERING — pure Phaser Graphics, absolute world coordinates
    // No RenderTexture, no holes, no coordinate-system confusion.
    // ─────────────────────────────────────────────────────────────────────

    createBoardVisuals() {
        const { width, height } = this.scale;

        // ── Compute cell size to fill the available space ─────────────────
        // Top UI area: scores at y=20 (~40px), banner at y=80 (~50px) = ~130px
        // Leave 16px padding on each side and 16px at bottom.
        const UI_TOP = 130;   // pixels reserved for the top UI bar
        const PAD = 16;    // horizontal and bottom padding

        const availW = width - PAD * 2;
        const availH = height - UI_TOP - PAD;

        const cellByW = Math.floor(availW / this.cols);
        const cellByH = Math.floor(availH / this.rows);
        const cellSize = Math.min(cellByW, cellByH);   // whichever axis is tighter

        const cellW = cellSize;
        const cellH = cellSize;
        const boardW = this.cols * cellW;
        const boardH = this.rows * cellH;

        // ── Absolute world position of the board's top-left corner ────────
        // Horizontally: perfectly centred.
        // Vertically: centred in the space that remains after the UI header.
        const boardX = Math.round((width - boardW) / 2);
        const boardY = Math.round(UI_TOP + (availH - boardH) / 2);

        // Hole radius — slightly smaller than half a cell so there's a thin
        // board frame visible between adjacent holes.
        const holeR = Math.round(cellW * 0.42);

        // Initialise token list (used only to clean up mid-flight tokens on reset)
        this.droppedTokens = [];

        // ── The board is ONE Graphics object redrawn on every state change ─
        this.boardGfx = this.add.graphics().setDepth(0);

        // ── Preview disc floating above the hovered column ────────────────
        this.previewGfx = this.add.graphics().setDepth(5).setAlpha(0);

        // ── Invisible hit-zones per column ────────────────────────────────
        this.hitboxes = [];
        for (let c = 0; c < this.cols; c++) {
            const zone = this.add.zone(
                boardX + (c + 0.5) * cellW,
                boardY + boardH / 2,
                cellW, boardH + 80
            ).setDepth(10).setInteractive();
            zone.on('pointerover', () => this.handleHover(c));
            zone.on('pointerout', () => this.handleHoverOut(c));
            zone.on('pointerdown', () => this.handleClick(c));
            this.hitboxes.push(zone);
        }

        // ── Store layout for use in all other methods ─────────────────────
        this.boardConfig = { boardW, boardH, cellW, cellH, holeR, boardX, boardY };

        // Draw the initial empty board
        this._redrawBoard();
    }

    /**
     * Redraws the entire board from scratch using this.boardState.
     * Called once at start, and again after every token lands.
     * All coordinates are absolute world coordinates — no offsets, no tricks.
     */
    _redrawBoard() {
        if (!this.boardConfig || !this.boardGfx) return;
        const { boardW, boardH, cellW, cellH, holeR, boardX, boardY } = this.boardConfig;
        const gfx = this.boardGfx;
        gfx.clear();

        // 1) Board body
        gfx.fillStyle(0x222222, 1);
        gfx.fillRoundedRect(boardX, boardY, boardW, boardH, 10);
        // Thin top-edge highlight for depth effect
        gfx.fillStyle(0x222222, 0.18);
        gfx.fillRoundedRect(boardX + 4, boardY + 4, boardW - 8, 14,
            { tl: 7, tr: 7, bl: 0, br: 0 });
        // Bottom shadow strip
        gfx.fillStyle(0x222222, 0.5);
        gfx.fillRoundedRect(boardX + 2, boardY + boardH - 6, boardW - 4, 6,
            { tl: 0, tr: 0, bl: 8, br: 8 });

        // 2) Slot circles — drawn at exact absolute world coordinates
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                // World centre of this slot — same formula used in applyMove
                const cx = boardX + (c + 0.5) * cellW;
                const cy = boardY + (r + 0.5) * cellH;
                const val = this.boardState[r][c];

                if (val === 0) {
                    // Empty slot: dark inset circle
                    gfx.fillStyle(0x555555, 1);
                    gfx.fillCircle(cx, cy, holeR);
                    // Thin inner rim
                    gfx.fillStyle(0x555555, 0.6);
                    gfx.fillCircle(cx, cy, holeR - 2);
                } else {
                    // Filled slot: draw the token colours directly
                    const dark = val === 1 ? 0xb71c1c : 0x0d47a1;
                    const main = val === 1 ? 0xe53935 : 0x1e88e5;
                    const shine = val === 1 ? 0xff8a80 : 0x82b1ff;

                    gfx.fillStyle(dark, 1);
                    gfx.fillCircle(cx, cy + 2, holeR);       // shadow offset
                    gfx.fillStyle(main, 1);
                    gfx.fillCircle(cx, cy, holeR);
                    gfx.fillStyle(shine, 0.5);
                    gfx.fillCircle(
                        cx - holeR * 0.22, cy - holeR * 0.24,
                        holeR * 0.38);
                    gfx.fillStyle(0xffffff, 0.35);
                    gfx.fillCircle(
                        cx - holeR * 0.28, cy - holeR * 0.32,
                        holeR * 0.13);
                }
            }
        }

        // 3) Outer border
        gfx.lineStyle(2, 0x1976d2, 0.7);
        gfx.strokeRoundedRect(boardX, boardY, boardW, boardH, 10);
    }

    /**
     * Draw a shaded token disc centred at (x, y) in the given Graphics object.
     * Used for: falling animation tokens and the hover-preview disc.
     */
    _drawToken(gfx, x, y, r, role) {
        gfx.clear();
        const dark = role === 'A' ? 0xb71c1c : 0x0d47a1;
        const main = role === 'A' ? 0xe53935 : 0x1e88e5;
        const shine = role === 'A' ? 0xff8a80 : 0x82b1ff;

        gfx.fillStyle(dark, 1); gfx.fillCircle(x, y + 2, r);
        gfx.fillStyle(main, 1); gfx.fillCircle(x, y, r);
        gfx.fillStyle(shine, 0.5); gfx.fillCircle(x - r * 0.22, y - r * 0.24, r * 0.38);
        gfx.fillStyle(0xffffff, 0.35); gfx.fillCircle(x - r * 0.28, y - r * 0.32, r * 0.13);
    }

    handleHover(col) {
        if (this.isGameOver || this.currentTurn !== this.localRole || !this.connection) return;
        const { boardX, boardY, cellW, holeR } = this.boardConfig;
        const px = boardX + (col + 0.5) * cellW;
        const py = boardY - holeR - 8;
        this.previewGfx.setPosition(px, py);
        this._drawToken(this.previewGfx, 0, 0, holeR, this.localRole);
        this.previewGfx.setAlpha(0.6);
    }

    handleHoverOut(col) {
        this.previewGfx.setAlpha(0);
    }

    handleClick(col) {
        if (this.isGameOver || this.currentTurn !== this.localRole || !this.connection) return;
        const row = this.getLowestEmptyRow(col);
        if (row === -1) { console.warn('Column full!'); return; }
        this.previewGfx.setAlpha(0);
        this.applyMove(col, row, this.localRole);
        this.connection.sendGameMove(col);
    }

    getLowestEmptyRow(col) {
        // Start from the bottom (highest index) and go up
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.boardState[r][col] === 0) {
                return r;
            }
        }
        return -1;
    }

    applyMove(col, row, role) {
        this.boardState[row][col] = role === 'A' ? 1 : 2;

        const { boardX, boardY, cellW, cellH, holeR } = this.boardConfig;

        // Target: world centre of the destination slot
        const targetX = boardX + (col + 0.5) * cellW;
        const targetY = boardY + (row + 0.5) * cellH;

        // Animate: token drops from above the board
        const animToken = this.add.graphics().setDepth(8);
        this._drawToken(animToken, 0, 0, holeR, role);
        animToken.x = targetX;
        animToken.y = boardY - holeR * 2;
        this.droppedTokens.push(animToken);

        this.sound.play('stacking');

        this.tweens.add({
            targets: animToken,
            y: targetY,
            duration: GameConfig.RULES.ANIMATION_DURATION,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                // Remove animation graphic and bake piece into the board drawing
                animToken.destroy();
                const idx = this.droppedTokens.indexOf(animToken);
                if (idx !== -1) this.droppedTokens.splice(idx, 1);
                this._redrawBoard();
                this.checkGameState(col, row, role);
            }
        });

        this.currentTurn = 'NONE';
    }

    checkGameState(col, row, role) {
        if (this.checkWin(col, row, role)) {
            this.handleGameEnd(role === this.localRole ? 'WIN' : 'LOSE');
            return;
        }

        if (this.checkDraw()) {
            this.handleGameEnd('DRAW');
            return;
        }

        // Switch turns back
        this.currentTurn = role === 'A' ? 'B' : 'A';
        this.setBannerText(this.currentTurn === this.localRole ? 'Your Turn' : "Opponent's Turn");
    }

    checkWin(col, row, role) {
        const val = role === 'A' ? 1 : 2;
        const directions = [
            [1, 0], // Horizontal
            [0, 1], // Vertical
            [1, 1], // Diagonal down
            [1, -1] // Diagonal up
        ];

        for (const [dx, dy] of directions) {
            let count = 1;

            // Check forward
            for (let i = 1; i < 4; i++) {
                const r = row + i * dy;
                const c = col + i * dx;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.boardState[r][c] === val) {
                    count++;
                } else {
                    break;
                }
            }

            // Check backward
            for (let i = 1; i < 4; i++) {
                const r = row - i * dy;
                const c = col - i * dx;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.boardState[r][c] === val) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 4) {
                return true;
            }
        }
        return false;
    }

    checkDraw() {
        for (let c = 0; c < this.cols; c++) {
            if (this.boardState[0][c] === 0) {
                return false;
            }
        }
        return true;
    }

    handleGameEnd(result) {
        this.isGameOver = true;

        let message = '';
        if (result === 'WIN') {
            message = 'YOU WIN!';
            this.myScore += 10;
        } else if (result === 'LOSE') {
            message = 'YOU LOSE!';
            this.oppScore += 10;
        } else {
            message = "IT'S A DRAW!";
            this.myScore += 5;
            this.oppScore += 5;
        }

        this.myScoreText.setText(`YOU: ${this.myScore}`);
        this.oppScoreText.setText(`OPP: ${this.oppScore}`);
        this.setBannerText(message);

        // Post-Game Summary text scaling animation
        const { width, height } = this.scale;
        const resultText = this.add.text(width / 2, height / 2, message, {
            fontFamily: GameConfig.UI.FONT_FAMILY,
            fontSize: '64px',
            color: result === 'WIN' ? '#00ff00' : (result === 'LOSE' ? '#ff0000' : '#ffff00'),
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(10).setScale(0.5);

        this.tweens.add({
            targets: resultText,
            scale: 1.2,
            duration: 500,
            ease: 'Back.easeOut',
            yoyo: true,
            hold: 2000, // hold 2 seconds
            onComplete: () => {
                resultText.destroy();
                this.promptRematch();
            }
        });
    }

    promptRematch() {
        this.setBannerText('Preparing next match...');

        // After 2.5s, auto reset
        this.time.delayedCall(2500, () => {
            this.resetGame();
        });
    }

    resetGame() {
        this.initializeBoardState();
        this.droppedTokens.forEach(t => t.destroy());
        this.droppedTokens = [];
        this._redrawBoard();   // reset board visuals to all-empty slots
        this.setBannerText(
            this.currentTurn === this.localRole ? 'Your Turn' : "Opponent's Turn"
        );
    }

    createUI() {
        const { width, height } = this.scale;

        // Banner
        this.bannerBg = this.add.graphics();
        this.bannerText = this.add.text(width / 2, 80, 'Connecting...', {
            fontFamily: GameConfig.UI.FONT_FAMILY,
            fontSize: '32px',
            color: '#333333'
        }).setOrigin(0.5);

        // Scores
        this.myScoreText = this.add.text(20, 20, 'YOU: 0', {
            fontFamily: GameConfig.UI.FONT_FAMILY,
            fontSize: '28px',
            color: '#000'
        });

        this.oppScoreText = this.add.text(width - 20, 20, 'OPP: 0', {
            fontFamily: GameConfig.UI.FONT_FAMILY,
            fontSize: '28px',
            color: '#000'
        }).setOrigin(1, 0);

        this.drawBanner();
    }

    drawBanner() {
        if (!this.bannerBg) return;
        this.bannerBg.clear();
        this.bannerBg.fillStyle(0xffffff, 1);
        const bw = 300;
        const bh = 60;
        this.bannerBg.fillRoundedRect(this.scale.width / 2 - bw / 2, 50, bw, bh, 16);
    }

    setBannerText(text) {
        if (this.bannerText) this.bannerText.setText(text);
    }

    setupNetworking() {
        console.log('[GameScene] Setting up networking...');

        this.networkManager = new NetworkManager(this);
        this.setupNetworkEvents();
        this.connectToServer();
    }

    setupNetworkEvents() {
        this.events.on('match_found', (msg) => {
            console.log('[Connect4] Match found, connecting to game...');

            // Normalize role from msg
            const role = msg.role;
            if (role === 'A' || role === 'host') {
                this.localRole = 'A';
            } else {
                this.localRole = 'B';
            }

            this.networkManager.connectToGame();
            this.setBannerText('Connecting to opponent...');
        });

        this.events.on('game_datachannel_open', () => {
            console.log('[Connect4] WebRTC Channel Open!');
            this.onMatchReady();
        });

        this.events.on('queued', () => {
            this.setBannerText('Finding opponent...');
        });

        this.events.on('connection_failed', () => {
            this.setBannerText('Connection failed.');
        });
    }

    async connectToServer() {
        try {
            await this.networkManager.connect();
            const matchData = GameConfig.MATCH_DATA;

            if (matchData && matchData.roomId && matchData.mode === 'embedded') {
                console.log('[Connect4] Using embedded match data:', matchData);
                // Wait 500ms for ICE servers to be received from parent
                await new Promise(resolve => setTimeout(resolve, 500));
                this.networkManager.handleMatchFound(matchData);
            } else {
                console.log('[Connect4] Joining matchmaking queue...');
                this.networkManager.findMatch();
            }
        } catch (error) {
            console.error('[Connect4] Failed to connect:', error);
            this.setBannerText('Network Error');
        }
    }

    onMatchReady() {
        console.log('[GameScene] Match Ready!');
        this.connection = new Connect4Connection(this.networkManager.gameConnection, this);
        this.setBannerText(this.localRole === 'A' ? 'Your Turn' : 'Waiting for Opponent');

        // Setup specific listeners
        this.events.on('remote_move', this.handleRemoteMove, this);
        this.events.on('rematch_request', this.handleRematchRequest, this);
    }

    onPlayerDisconnected(userId) {
        console.log('[GameScene] Opponent disconnected', userId);
        this.setBannerText('Opponent Disconnected');
        this.isGameOver = true;
    }

    handleRemoteMove(payload) {
        if (this.isGameOver) return;

        const col = payload.column;
        const row = this.getLowestEmptyRow(col);

        if (row === -1) {
            console.warn("[GameScene] Received move for full column from opponent.");
            return;
        }

        const remoteRole = this.localRole === 'A' ? 'B' : 'A';
        this.applyMove(col, row, remoteRole);
    }

    handleRematchRequest(payload) {
        // Not specifically needed since we auto-rematch
        console.log('[GameScene] Received rematch request');
    }

    resize(gameSize) {
        const { width, height } = gameSize;
        if (this.oppScoreText) this.oppScoreText.setPosition(width - 20, 20);
        if (this.bannerText) this.bannerText.setPosition(width / 2, 80);
        this.drawBanner();
    }
}
