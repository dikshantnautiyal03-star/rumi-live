import Phaser from 'phaser';
import GameConfig from '../config/GameConfig.js';
import { NetworkManager } from '../network/NetworkManager.js';
import { GameConnection } from '../network/GameConnection.js';
import { FlamesConnection } from '../network/FlamesConnection.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.networkManager = null;
        this.gameConnection = null;
        this.flamesConnection = null;

        // Player roles
        this.isHost = false; // "A" role
        this.myName = '';
        this.opponentName = '';

        // Game State
        // 'WAITING', 'NAME_ENTRY', 'CALCULATING', 'ELIMINATING', 'RESULTS'
        this.gameState = 'WAITING';

        // FLAMES logic variables
        this.flamesSequence = ['F', 'L', 'A', 'M', 'E', 'S'];
        this.flamesMeanings = {
            'F': 'Friends',
            'L': 'Lovers',
            'A': 'Affection',
            'M': 'Marriage',
            'E': 'Enemies',
            'S': 'Siblings'
        };
        this.uniqueCount = 0;
        this.eliminationIndex = 0;

        // Sync flags
        this.myStatus = 'not_ready'; // 'not_ready', 'submitted', 'play_again'
        this.opponentStatus = 'not_ready';

        // UI References
        this.htmlElements = []; // inputs or native dom elements to clean up

        this.myScore = 0;
        this.opponentScore = 0;
    }

    create() {
        this.setupNetworking();
        this.setupUI();

        this.scale.on('resize', this.handleResize, this);
    }

    setupNetworking() {
        this.networkManager = new NetworkManager(this);
        this.setupNetworkEvents();
        this.connectToServer();
    }

    async connectToServer() {
        try {
            await this.networkManager.connect();
            const matchData = GameConfig.MATCH_DATA;
            if (matchData && matchData.roomId && matchData.mode === 'embedded') {
                console.log('[Flames] Using embedded match data:', matchData);
                await new Promise(resolve => setTimeout(resolve, 500));
                this.networkManager.handleMatchFound(matchData);
            } else {
                console.log('[Flames] Joining matchmaking queue...');
                this.networkManager.findMatch();
            }
        } catch (error) {
            console.error('[Flames] Failed to connect:', error);
        }
    }

    setupNetworkEvents() {
        // Matchmaking Events
        this.events.on('queued', () => {
            this.setBannerText('Waiting for opponent...', '#f39c12');
        });

        this.events.on('match_found', (msg) => {
            console.log('[Flames] Match found, connecting to game...');

            // role normalization
            let normalizedRole = 'B';
            if (msg.role === 'A' || msg.role === 'host') {
                normalizedRole = 'A';
            }
            this.isHost = normalizedRole === 'A';

            this.networkManager.connectToGame();
            this.setBannerText('Connecting...', '#f39c12');
        });

        // WebRTC Connection Events
        this.events.on('game_datachannel_open', () => {
            console.log('[Flames] WebRTC Channel Open!');

            if (this.networkManager.gameConnection) {
                this.flamesConnection = new FlamesConnection(
                    this.networkManager.gameConnection,
                    this
                );
                this.flamesConnection.startHeartbeat();
            }

            this.setBannerText('Connected! Starting game...', '#27ae60');

            // Brief delay then show Name Entry
            this.time.delayedCall(1500, () => {
                this.startNameEntryPhase();
            });
        });

        this.events.on('connection_failed', () => {
            this.setBannerText('Connection Lost', '#e74c3c');
        });

        // Game specific events
        this.events.on('remote_name_submitted', (data) => this.handleRemoteName(data));
        this.events.on('remote_game_state_sync', (data) => this.handleStateSync(data));
        this.events.on('remote_elimination_step', (data) => this.handleEliminationStep(data));
        this.events.on('remote_round_end', (data) => this.handleRoundEnd(data));
        this.events.on('remote_play_again', () => this.handleRemotePlayAgain());
    }

    // ---------- UI SETUP ----------

    setupUI() {
        const { width, height } = this.scale;

        // Background
        this.bg = this.add.rectangle(0, 0, width, height, Phaser.Display.Color.HexStringToColor(GameConfig.COLORS.BACKGROUND).color).setOrigin(0);

        // Header containers
        this.myScoreContainer = this.add.container(20, 20);
        const myBg = this.add.graphics();
        myBg.fillStyle(0xffffff, 0.9);
        myBg.fillRoundedRect(0, 0, 150, 60, 10);
        const myLabel = this.add.text(75, 15, 'YOU', {
            fontSize: '14px', color: '#000', fontFamily: 'Outfit', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.myScoreText = this.add.text(75, 40, '0', {
            fontSize: '22px', color: '#ff4757', fontFamily: 'Outfit', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.myScoreContainer.add([myBg, myLabel, this.myScoreText]);

        this.opponentScoreContainer = this.add.container(width - 170, 20);
        const oppBg = this.add.graphics();
        oppBg.fillStyle(0xffffff, 0.9);
        oppBg.fillRoundedRect(0, 0, 150, 60, 10);
        const oppLabel = this.add.text(75, 15, 'OPP', {
            fontSize: '14px', color: '#000', fontFamily: 'Outfit', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.opponentScoreText = this.add.text(75, 40, '0', {
            fontSize: '22px', color: '#ff4757', fontFamily: 'Outfit', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.opponentScoreContainer.add([oppBg, oppLabel, this.opponentScoreText]);

        // Banner
        this.bannerContainer = this.add.container(width / 2, 50);
        this.bannerBg = this.add.graphics();
        this.bannerText = this.add.text(0, 0, '', {
            fontSize: '20px', color: '#fff', fontFamily: 'Outfit', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.bannerContainer.add([this.bannerBg, this.bannerText]);

        this.setBannerText('Initializing...', '#2f3542');

        // Central Area Container (For dynamic content)
        this.centerContainer = this.add.container(width / 2, height / 2);
    }

    setBannerText(text, colorHex) {
        if(!this.bannerContainer) return;
        this.bannerText.setText(text);

        // Re-draw background
        this.bannerBg.clear();
        this.bannerBg.fillStyle(Phaser.Display.Color.HexStringToColor(colorHex).color, 0.9);
        const bounds = this.bannerText.getBounds();
        const padding = 20;
        this.bannerBg.fillRoundedRect(
            -bounds.width / 2 - padding,
            -bounds.height / 2 - padding/2,
            bounds.width + padding * 2,
            bounds.height + padding,
            15
        );
    }

    clearCenterContainer() {
        this.centerContainer.removeAll(true);
        this.cleanupHtmlElements();
    }

    cleanupHtmlElements() {
        const wrapper = document.getElementById('app');
        const elements = document.querySelectorAll('.html-input, .html-btn');
        elements.forEach(el => {
            if (el.parentNode === wrapper) {
                wrapper.removeChild(el);
            }
        });
        this.htmlElements = [];
    }

    // ---------- GAME PHASES ----------

    startNameEntryPhase() {
        this.gameState = 'NAME_ENTRY';
        this.myStatus = 'not_ready';
        this.opponentStatus = 'not_ready';
        this.myName = '';
        this.opponentName = '';

        this.clearCenterContainer();
        this.setBannerText('Enter Your Name', '#f39c12');

        const { width, height } = this.scale;

        // Title
        const title = this.add.text(0, -100, 'FLAMES', {
            fontSize: '64px',
            fontFamily: 'Outfit',
            fontWeight: '900',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.centerContainer.add(title);

        // Setup HTML Input instead of Phaser text for better typing experience
        const inputId = 'flames-name-input';
        let inputEl = document.getElementById(inputId);
        if (!inputEl) {
            inputEl = document.createElement('input');
            inputEl.id = inputId;
            inputEl.type = 'text';
            inputEl.className = 'html-input';
            inputEl.placeholder = 'Your Name...';
            inputEl.autocomplete = 'off';
            inputEl.maxLength = 20;

            document.getElementById('app').appendChild(inputEl);
            this.htmlElements.push(inputEl);
        }

        // Position it via CSS in resize handler, initial pos here
        this.positionHtmlElement(inputEl, width/2, height/2);

        // Submit Button
        const btnBg = this.add.rectangle(0, 80, 200, 50, 0x2ed573).setInteractive({useHandCursor: true});
        const btnText = this.add.text(0, 80, 'SUBMIT', {
            fontSize: '24px', fontFamily: 'Outfit', fontWeight: 'bold', color: '#fff'
        }).setOrigin(0.5);

        btnBg.on('pointerdown', () => {
            const val = inputEl.value.trim().toUpperCase();
            if (val.length > 0) {
                this.submitName(val);
                btnBg.disableInteractive();
                btnBg.setFillStyle(0x7f8c8d);
                inputEl.disabled = true;
            } else {
                this.cameras.main.shake(200, 0.01);
            }
        });

        this.centerContainer.add([btnBg, btnText]);
    }

    submitName(name) {
        this.myName = name;
        this.myStatus = 'submitted';
        this.flamesConnection.sendName(name);

        if (this.opponentStatus === 'submitted') {
            this.transitionToCalculation();
        } else {
            this.setBannerText('Waiting for opponent...', '#f39c12');
        }
    }

    handleRemoteName(data) {
        this.opponentName = data.name;
        this.opponentStatus = 'submitted';

        if (this.myStatus === 'submitted') {
            this.transitionToCalculation();
        }
    }

    transitionToCalculation() {
        this.gameState = 'CALCULATING';
        this.clearCenterContainer();
        this.setBannerText('Calculating...', '#9b59b6');

        const { width, height } = this.scale;

        // Display names
        const namesText = this.add.text(0, -100, `${this.myName} & ${this.opponentName}`, {
            fontSize: '36px', fontFamily: 'Outfit', fontWeight: 'bold', color: '#fff'
        }).setOrigin(0.5);
        this.centerContainer.add(namesText);

        // Host performs logic and syncs to ensure deterministic behavior
        if (this.isHost) {
            this.calculateFlamesCount();

            this.flamesSequence = ['F', 'L', 'A', 'M', 'E', 'S'];
            this.eliminationIndex = 0;

            const state = {
                myName: this.myName,
                opponentName: this.opponentName,
                uniqueCount: this.uniqueCount,
                flamesSequence: this.flamesSequence
            };

            // Sync initial state
            this.flamesConnection.sendGameStateSync(state);

            // Start elimination sequence
            this.time.delayedCall(2000, () => {
                this.startEliminationPhase();
            });
        }
    }

    handleStateSync(data) {
        if (!this.isHost) {
            // For guest, ensure data matches host
            this.uniqueCount = data.state.uniqueCount;
            this.flamesSequence = data.state.flamesSequence;

            // Re-render names with strikethrough logic visual (simplified for now)
            const resultText = this.add.text(0, -30, `Unique Letters: ${this.uniqueCount}`, {
                fontSize: '28px', fontFamily: 'Outfit', fontWeight: 'bold', color: '#f1c40f'
            }).setOrigin(0.5);
            this.centerContainer.add(resultText);

            this.time.delayedCall(2000, () => {
                this.startEliminationPhase();
            });
        } else {
            // Host also shows count
            const resultText = this.add.text(0, -30, `Unique Letters: ${this.uniqueCount}`, {
                fontSize: '28px', fontFamily: 'Outfit', fontWeight: 'bold', color: '#f1c40f'
            }).setOrigin(0.5);
            this.centerContainer.add(resultText);
        }
    }

    calculateFlamesCount() {
        // Remove spaces and convert to array
        let n1 = this.myName.replace(/\\s/g, '').split('');
        let n2 = this.opponentName.replace(/\\s/g, '').split('');

        // Cancel out common letters
        for (let i = 0; i < n1.length; i++) {
            for (let j = 0; j < n2.length; j++) {
                if (n1[i] === n2[j]) {
                    n1[i] = '*';
                    n2[j] = '*';
                    break;
                }
            }
        }

        // Count remaining
        let count = 0;
        n1.forEach(l => { if (l !== '*') count++; });
        n2.forEach(l => { if (l !== '*') count++; });

        // If count is 0, default to 1 to prevent infinite loops, or just say it's F
        this.uniqueCount = Math.max(1, count);
    }

    startEliminationPhase() {
        this.gameState = 'ELIMINATING';
        this.clearCenterContainer();
        this.setBannerText('Elimination Round', '#e74c3c');

        // Draw the FLAMES letters
        this.flamesTexts = [];
        const spacing = 60;
        const totalWidth = 5 * spacing;
        const startX = -totalWidth / 2;

        ['F', 'L', 'A', 'M', 'E', 'S'].forEach((letter, i) => {
            const t = this.add.text(startX + i * spacing, 0, letter, {
                fontSize: '48px', fontFamily: 'Outfit', fontWeight: '900', color: '#fff'
            }).setOrigin(0.5);
            this.flamesTexts.push(t);
            this.centerContainer.add(t);
        });

        // Add count info
        const info = this.add.text(0, -100, `Count: ${this.uniqueCount}`, {
            fontSize: '24px', fontFamily: 'Outfit', color: '#f1c40f'
        }).setOrigin(0.5);
        this.centerContainer.add(info);

        if (this.isHost) {
            this.time.delayedCall(1000, () => {
                this.stepElimination();
            });
        }
    }

    stepElimination() {
        if (!this.isHost) return;

        if (this.flamesSequence.length <= 1) {
            // Game Over
            this.finishGame();
            return;
        }

        // Calculate next elimination
        // 0-indexed count
        let stepCount = (this.uniqueCount - 1) % this.flamesSequence.length;
        this.eliminationIndex = (this.eliminationIndex + stepCount) % this.flamesSequence.length;

        const eliminatedLetter = this.flamesSequence.splice(this.eliminationIndex, 1)[0];

        // Broadcast
        this.flamesConnection.sendEliminationStep(this.eliminationIndex, this.flamesSequence, eliminatedLetter);

        // Local animation
        this.animateElimination(eliminatedLetter, () => {
            this.time.delayedCall(800, () => {
                this.stepElimination();
            });
        });
    }

    handleEliminationStep(data) {
        if (this.isHost) return;

        this.flamesSequence = data.sequence;
        this.eliminationIndex = data.index; // To keep sync if needed

        this.animateElimination(data.letter, () => {
            if (this.flamesSequence.length <= 1) {
                // Wait for round end message from host
            }
        });
    }

    animateElimination(letter, callback) {
        // Find the visual text element
        const target = this.flamesTexts.find(t => t.text === letter && t.alpha === 1);
        if (target) {
            // Visual flair
            this.tweens.add({
                targets: target,
                scale: 1.5,
                alpha: 0,
                tint: 0xff0000,
                duration: 500,
                yoyo: true, // pops up then fades
                onComplete: () => {
                    target.setAlpha(0.2); // keep ghost
                    target.setScale(1);
                    if (callback) callback();
                }
            });
        } else {
            if (callback) callback();
        }
    }

    finishGame() {
        const finalLetter = this.flamesSequence[0];
        const result = this.flamesMeanings[finalLetter];

        // Host determines winner (just for scoring, say Marriage gives 10 pts, Enemies 0)
        // Or simple: Both players get 10 points for finishing
        const points = 10;

        this.flamesConnection.sendRoundEnd(null, result, points);
        this.showResults(result, points);
    }

    handleRoundEnd(data) {
        if (this.isHost) return;
        this.showResults(data.resultText, data.points);
    }

    showResults(resultText, points) {
        this.gameState = 'RESULTS';
        this.clearCenterContainer();
        this.setBannerText('Match Result', '#2ed573');

        // Update Scores
        this.myScore += points;
        this.opponentScore += points;
        this.myScoreText.setText(this.myScore.toString());
        this.opponentScoreText.setText(this.opponentScore.toString());

        const { width, height } = this.scale;

        const mainText = this.add.text(0, -50, resultText.toUpperCase(), {
            fontSize: '64px', fontFamily: 'Outfit', fontWeight: '900', color: '#f1c40f',
            stroke: '#000', strokeThickness: 8
        }).setOrigin(0.5);

        const subText = this.add.text(0, 30, `${this.myName} & ${this.opponentName}`, {
            fontSize: '28px', fontFamily: 'Outfit', color: '#fff'
        }).setOrigin(0.5);

        this.centerContainer.add([mainText, subText]);

        // Celebration particles
        this.createConfetti();

        // Play Again button
        const btnBg = this.add.rectangle(0, 120, 200, 50, 0x3498db).setInteractive({useHandCursor: true});
        const btnText = this.add.text(0, 120, 'PLAY AGAIN', {
            fontSize: '24px', fontFamily: 'Outfit', fontWeight: 'bold', color: '#fff'
        }).setOrigin(0.5);

        btnBg.on('pointerdown', () => {
            btnBg.disableInteractive();
            btnBg.setFillStyle(0x7f8c8d);
            btnText.setText('WAITING...');
            this.myStatus = 'play_again';
            this.flamesConnection.sendPlayAgain();

            if (this.opponentStatus === 'play_again') {
                this.resetAndStartNewRound();
            }
        });

        this.centerContainer.add([btnBg, btnText]);
    }

    handleRemotePlayAgain() {
        this.opponentStatus = 'play_again';
        if (this.myStatus === 'play_again') {
            this.resetAndStartNewRound();
        }
    }

    resetAndStartNewRound() {
        this.myStatus = 'not_ready';
        this.opponentStatus = 'not_ready';
        // Swap host role for fairness?
        this.isHost = !this.isHost;

        this.startNameEntryPhase();
    }

    createConfetti() {
        const colors = [0xf1c40f, 0xe74c3c, 0x3498db, 0x2ecc71];
        for (let i = 0; i < 50; i++) {
            const color = colors[Phaser.Math.Between(0, colors.length - 1)];
            const rect = this.add.rectangle(
                Phaser.Math.Between(0, this.scale.width),
                Phaser.Math.Between(-100, -10),
                10, 10, color
            );

            this.tweens.add({
                targets: rect,
                y: this.scale.height + 50,
                x: rect.x + Phaser.Math.Between(-100, 100),
                rotation: Phaser.Math.Between(0, 10),
                duration: Phaser.Math.Between(1500, 3000),
                ease: 'Sine.easeInOut',
                onComplete: () => { rect.destroy(); }
            });
        }
    }

    // ---------- RESIZE ----------

    handleResize() {
        const { width, height } = this.scale;

        if (this.bg) {
            this.bg.setSize(width, height);
        }

        if (this.myScoreContainer) this.myScoreContainer.setPosition(20, 20);
        if (this.opponentScoreContainer) this.opponentScoreContainer.setPosition(width - 170, 20);
        if (this.bannerContainer) this.bannerContainer.setPosition(width / 2, 50);
        if (this.centerContainer) this.centerContainer.setPosition(width / 2, height / 2);

        // Update HTML elements positioning
        if (this.htmlElements && this.htmlElements.length > 0) {
            const inputEl = this.htmlElements.find(el => el.id === 'flames-name-input');
            if(inputEl) {
                this.positionHtmlElement(inputEl, width/2, height/2);
            }
        }
    }

    positionHtmlElement(element, cx, cy) {
        element.style.left = `${cx}px`;
        element.style.top = `${cy}px`;
    }
}
