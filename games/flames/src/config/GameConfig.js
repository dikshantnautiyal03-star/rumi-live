/**
 * Centralized Game Configuration for FLAMES
 */

const BASE_PATH = import.meta.env.BASE_URL || '/games/flames/';

const GameConfig = {
    DISPLAY: {
        WIDTH: window.innerWidth,
        HEIGHT: window.innerHeight,
        PARENT: 'app',
        BACKGROUND_COLOR: '#ff4757', // Reddish background
    },

    GAME: {
        ROUND_TIME: 120, // 2 minutes max per round
    },

    NETWORK: {
        SERVER_URL: (window.location.port === '5173' || window.location.port === '3000')
            ? 'http://localhost:8000'
            : window.location.origin,
        SOCKET_PATH: '/socket.io',
        RECONNECT_DELAY: 3000,
    },

    COLORS: {
        PRIMARY: '#ffffff',
        SECONDARY: '#ff6b81',
        TEXT: '#2f3542',
        BACKGROUND: '#ff4757',
        SUCCESS: '#2ed573',
        HIGHLIGHT: '#ffa502'
    },

    UI: {
        FONT_FAMILY: 'Outfit, Arial, sans-serif',
    },

    DEBUG: {
        LOG_NETWORK_MESSAGES: true,
    }
};

export default GameConfig;
