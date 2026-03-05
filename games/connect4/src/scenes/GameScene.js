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
        this.load.svg('red_ball', '/connect4/assets/red_ball.svg');
        this.load.svg('blue_ball', '/connect4/assets/blue_ball.svg');
        this.load.svg('board', '/connect4/assets/board.svg');
        this.load.audio('stacking', '/connect4/audio/stacking.mp3');
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

    createBoardVisuals() {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2 + 50; // offset slightly down

        const cellW = 80;
        const cellH = 80;
        const boardW = this.cols * cellW;
        const boardH = this.rows * cellH;

        this.boardGroup = this.add.group();
        this.tokenGroup = this.add.group();

        // Container for easier resizing
        this.boardContainer = this.add.container(cx, cy);

        // Render SVG board
        this.boardImage = this.add.image(0, 0, 'board');
        this.boardImage.setDisplaySize(boardW, boardH);
        // Tokens must be rendered behind the board overlay to simulate dropping inside.
        // Therefore, we manage depth explicitly.
        this.tokenContainer = this.add.container(cx, cy);
        this.tokenContainer.setDepth(1);

        this.boardContainer.add(this.boardImage);
        this.boardContainer.setDepth(2); // Front of tokens

        // Preview token
        this.previewToken = this.add.image(0, -boardH/2 - 40, this.localRole === 'A' ? 'red_ball' : 'blue_ball');
        this.previewToken.setDisplaySize(cellW * 0.8, cellH * 0.8);
        this.previewToken.setAlpha(0);
        this.tokenContainer.add(this.previewToken);

        // Interaction zones per column
        const startX = -boardW / 2;
        this.hitboxes = [];
        for (let c = 0; c < this.cols; c++) {
            const hitZone = this.add.zone(startX + (c + 0.5) * cellW, 0, cellW, boardH + 100).setInteractive();
            hitZone.on('pointerover', () => this.handleHover(c));
            hitZone.on('pointerout', () => this.handleHoverOut(c));
            hitZone.on('pointerdown', () => this.handleClick(c));
            this.boardContainer.add(hitZone);
            this.hitboxes.push(hitZone);
        }

        // Store sizing for calculation later
        this.boardConfig = {
            boardW, boardH, cellW, cellH, startX,
            startY: -boardH / 2
        };
    }

    handleHover(col) {
        if (this.isGameOver || this.currentTurn !== this.localRole || !this.connection) return;
        const { startX, cellW, boardH } = this.boardConfig;

        // Set preview token alpha to 0.15 as specified
        this.previewToken.setAlpha(0.15);
        this.previewToken.setTexture(this.localRole === 'A' ? 'red_ball' : 'blue_ball');
        this.previewToken.setPosition(startX + (col + 0.5) * cellW, -boardH / 2 - 40);
    }

    handleHoverOut(col) {
        this.previewToken.setAlpha(0);
    }

    handleClick(col) {
        if (this.isGameOver || this.currentTurn !== this.localRole || !this.connection) return;

        // Validation: Verify column is not full (row 0 is the top, row 5 is the bottom)
        // Note: The prompt says "row 0 is bottom, row 5 is top" in one place, but array indexing usually goes top-down.
        // We will stick to the standard: index 0 = top row, index 5 = bottom row for visualization, but iterate from bottom up to find empty.
        // Let's implement bottom-up finding:
        const row = this.getLowestEmptyRow(col);

        if (row === -1) {
            console.warn("Column is full!");
            return; // Invalid move
        }

        this.previewToken.setAlpha(0); // Hide preview

        // Apply move locally
        this.applyMove(col, row, this.localRole);

        // Transmit move
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
        // Update logic matrix
        this.boardState[row][col] = role === 'A' ? 1 : 2;

        const { startX, startY, cellW, cellH } = this.boardConfig;

        // Spawn token at the top
        const startDropY = startY - 40;
        const targetDropY = startY + (row + 0.5) * cellH;
        const targetDropX = startX + (col + 0.5) * cellW;

        const token = this.add.image(targetDropX, startDropY, role === 'A' ? 'red_ball' : 'blue_ball');
        token.setDisplaySize(cellW * 0.8, cellH * 0.8);
        this.tokenContainer.add(token);

        // Play drop sound
        this.sound.play('stacking');

        // Tween drop animation
        this.tweens.add({
            targets: token,
            y: targetDropY,
            duration: GameConfig.RULES.ANIMATION_DURATION,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                this.checkGameState(col, row, role);
            }
        });

        // Switch turn temporarily so no one can click during animation
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
        this.tokenContainer.removeAll(true);
        this.setBannerText(this.currentTurn === this.localRole ? 'Your Turn' : "Opponent's Turn");
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
        if(!this.bannerBg) return;
        this.bannerBg.clear();
        this.bannerBg.fillStyle(0xffffff, 1);
        const bw = 300;
        const bh = 60;
        this.bannerBg.fillRoundedRect(this.scale.width / 2 - bw / 2, 50, bw, bh, 16);
    }

    setBannerText(text) {
        if(this.bannerText) this.bannerText.setText(text);
    }

    setupNetworking() {
        const urlParams = new URLSearchParams(window.location.search);

        // Determine role (isInitiator = Player A/Red)
        this.localRole = GameConfig.MATCH_DATA.isInitiator ? 'A' : 'B';

        console.log(`[GameScene] Setup networking. My role: ${this.localRole}`);

        // Setup NetworkManager (Signaling)
        this.networkManager = new NetworkManager(
            GameConfig.NETWORK.SERVER_URL,
            GameConfig.USER_ID,
            GameConfig.MATCH_DATA.roomId
        );

        // Map events
        this.networkManager.on('match_ready', this.onMatchReady.bind(this));
        this.networkManager.on('player_disconnected', this.onPlayerDisconnected.bind(this));
        this.networkManager.on('error', (err) => {
            console.error('Network error:', err);
            this.setBannerText('Network Error');
        });

        // Use custom connect4 connection
        this.networkManager.setConnectionClass(Connect4Connection);
        this.networkManager.connect();
    }

    onMatchReady(matchData, connection) {
        console.log('[GameScene] Match Ready!', matchData);
        this.connection = connection;
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
        if(this.oppScoreText) this.oppScoreText.setPosition(width - 20, 20);
        if(this.bannerText) this.bannerText.setPosition(width / 2, 80);
        this.drawBanner();
    }
}
