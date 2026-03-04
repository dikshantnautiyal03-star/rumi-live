import { NetworkProtocol } from './NetworkProtocol.js';
import { GameConnection } from './GameConnection.js';

export class FlamesConnection {
    constructor(gameConnection, scene) {
        if (!(gameConnection instanceof GameConnection)) {
            throw new Error('FlamesConnection requires a GameConnection instance');
        }

        this.gameConnection = gameConnection;
        this.scene = scene;
        this.heartbeatInterval = null;

        // Setup game-specific message handlers
        this.setupMessageHandlers();
    }

    setupMessageHandlers() {
        console.log('[FlamesConnection] Setting up message handlers');
        this.scene.events.on('game_data_received', (event) => {
            const msg = NetworkProtocol.decode(event.data);
            if (msg) {
                this.handleGameMessage(msg);
            }
        });
    }

    handleGameMessage(msg) {
        switch (msg.type) {
            case 'name_submitted':
                this.scene.events.emit('remote_name_submitted', msg);
                break;

            case 'game_state_sync':
                this.scene.events.emit('remote_game_state_sync', msg);
                break;

            case 'elimination_step':
                this.scene.events.emit('remote_elimination_step', msg);
                break;

            case 'round_end':
                this.scene.events.emit('remote_round_end', msg);
                break;

            case 'play_again':
                this.scene.events.emit('remote_play_again', msg);
                break;

            case 'ping':
                // Keepalive
                break;

            default:
                console.log('[FlamesConnection] Unknown message type:', msg.type);
        }
    }

    // --- Senders ---

    sendName(name) {
        const data = {
            type: 'name_submitted',
            name: name
        };
        const encoded = NetworkProtocol.encode(data);
        if (encoded) {
            this.gameConnection.send(encoded, true); // Reliable
        }
    }

    sendGameStateSync(state) {
        const data = {
            type: 'game_state_sync',
            state: state
        };
        const encoded = NetworkProtocol.encode(data);
        if (encoded) {
            this.gameConnection.send(encoded, true); // Reliable
        }
    }

    sendEliminationStep(index, sequence, letter) {
        const data = {
            type: 'elimination_step',
            index: index,
            sequence: sequence,
            letter: letter
        };
        const encoded = NetworkProtocol.encode(data);
        if (encoded) {
            this.gameConnection.send(encoded, true); // Reliable
        }
    }

    sendRoundEnd(winner, resultText, points) {
        const data = {
            type: 'round_end',
            winner: winner,
            resultText: resultText,
            points: points
        };
        const encoded = NetworkProtocol.encode(data);
        if (encoded) {
            this.gameConnection.send(encoded, true); // Reliable
        }
    }

    sendPlayAgain() {
        const data = { type: 'play_again' };
        const encoded = NetworkProtocol.encode(data);
        if (encoded) {
            this.gameConnection.send(encoded, true); // Reliable
        }
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.gameConnection.isConnected) {
                const data = { type: 'ping' };
                const encoded = NetworkProtocol.encode(data);
                if (encoded) {
                    this.gameConnection.send(encoded, false);
                }
            }
        }, 5000); // 5 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    destroy() {
        this.stopHeartbeat();
        this.scene.events.off('game_data_received');
    }
}
