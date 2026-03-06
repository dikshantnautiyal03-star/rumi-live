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
        // Updated dynamic matching URL per instructions
        SERVER_URL: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MATCHMAKING_URL
            ? process.env.NEXT_PUBLIC_MATCHMAKING_URL
            : 'http://localhost:5000'
    },

    USER_ID: 'dev-user-1', // Overridden by URL
    MATCH_DATA: {
        roomId: 'dev-room',
        role: 'playerA',
        opponentId: 'dev-user-2',
        isInitiator: true,
        mode: 'multiplayer'
    }
};

export default GameConfig;