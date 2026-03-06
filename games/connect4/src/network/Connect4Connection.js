export default class Connect4Connection {
    constructor(gameConnection, scene) {
        // Wrap the already existing GameConnection and pass the scene as the event emitter
        this.scene = scene;
        this.connection = gameConnection;

        // Listen to game-specific decoded data events emitted by GameConnection
        this.scene.events.on('game_data_received', this.handleMessage, this);
    }

    async initialize(config) {
        return this.connection.initialize(config);
    }

    handleMessage(payload) {
        // payload has { data (ArrayBuffer/string), channel }
        try {
            // Assume stringified JSON for simplicity if it's text, or decode if ArrayBuffer
            let textData = payload.data;
            if (payload.data instanceof ArrayBuffer) {
                textData = new TextDecoder().decode(payload.data);
            }

            const parsed = JSON.parse(textData);
            switch (parsed.type) {
                case 'game_move':
                    this.scene.events.emit('remote_move', parsed.payload);
                    break;
                case 'rematch_request':
                    this.scene.events.emit('rematch_request', parsed.payload);
                    break;
                default:
                    console.log('[Connect4Connection] Unhandled message type:', parsed.type);
            }
        } catch (e) {
            console.error('[Connect4Connection] Error parsing message:', e);
        }
    }

    sendGameMove(column) {
        const payload = {
            type: 'game_move',
            payload: { column }
        };
        // Use reliable channel (true) for game state syncing
        this.connection.send(JSON.stringify(payload), true);
    }

    sendRematchRequest() {
        const payload = {
            type: 'rematch_request',
            payload: {}
        };
        this.connection.send(JSON.stringify(payload), true);
    }

    destroy() {
        this.scene.events.off('game_data_received', this.handleMessage, this);
        this.connection.close();
    }
}
