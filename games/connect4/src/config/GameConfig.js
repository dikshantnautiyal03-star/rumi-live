const GameConfig = {
    DISPLAY: {
        WIDTH: 800,
        HEIGHT: 1200,
        BACKGROUND_COLOR: '#f0f0f0',
        PARENT: 'game-container' // Usually not strict for Next.js embed, but good to have
    },

    RULES: {
        COLS: 7,
        ROWS: 6,
        CELL_SIZE: 100, // Determines board width and hitboxes
        ANIMATION_DURATION: 800 // drop duration
    },

    UI: {
        TEXT_COLOR: '#000000',
        FONT_FAMILY: 'Outfit, Arial, sans-serif',
        COLORS: {
            RED: 0xff0000,
            BLUE: 0x0000ff,
            BANNER_BG: 0xffffff,
            BANNER_TEXT: 0x333333
        }
    },

    NETWORK: {
        SERVER_URL: (window.location.port === '5173' || window.location.port === '3000')
            ? 'http://localhost:8000'
            : window.location.origin,
        SOCKET_PATH: '/socket.io',
    },

    USER_ID: 'dev-user-1', // Overridden at runtime by parent page
    MATCH_DATA: {
        roomId: null,
        role: null,
        opponentId: null,
        isInitiator: false,
        mode: 'multiplayer' // 'embedded' triggers embedded mode, otherwise uses matchmaking queue
    }
};

export default GameConfig;