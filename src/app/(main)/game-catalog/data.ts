export interface Game {
    id: string;
    title: string;
    category: string;
    image: string;
    route: string;
    isAvailable: boolean;
}

// change to game order: Dumb Charades, Doodle Guess, Bingo, Tic Tac Toe, Connect Four, Knife Throw, Ping Pong
// comment Darts and Bowling

export const games: Game[] = [
    {
        id: 'dumb-charades',
        title: 'DUMB CHARADES',
        category: 'Icebreaker',
        image: '/dumb-charades.png', // Placeholder
        route: '/video/game',
        isAvailable: true,
    },
    {
        id: 'doodle-guess',
        title: 'DOODLE GUESS',
        category: 'Icebreaker',
        image: '/doodle-guess.png', // Placeholder
        route: '/video/game',
        isAvailable: true,
    },
    {
        id: 'bingo',
        title: 'BINGO',
        category: 'Strategy',
        image: '/bingo.png', // Placeholder
        route: '/video/game',
        isAvailable: true,
    },
    {
        id: 'tic-tac-toe',
        title: 'TIC TAC TOE',
        category: 'Strategy',
        image: '/tic-tac-toe.png', // Placeholder
        route: '/video/game',
        isAvailable: true,
    },
    {
        id: 'connect4',
        title: 'CONNECT FOUR',
        category: 'Strategy',
        image: '/connect-four.png', // Placeholder
        route: '/video/game',
        isAvailable: true,
    },
    {
        id: 'knife-throw',
        title: 'KNIFE THROW',
        category: 'Action',
        image: '/knife-throw.png',
        route: '/video/game',
        isAvailable: true,
    },
    {
        id: 'flames',
        title: 'FLAMES',
        category: 'Icebreaker',
        image: '/flames.png',
        route: '/video/game',
        isAvailable: true,
    },
    {
        id: 'gossip',
        title: 'GOSSIP',
        category: 'Icebreaker',
        image: '/gossip.png',
        route: '/video/game',
        isAvailable: false,
    },
    {
        id: 'guess-the-person',
        title: 'GUESS THE PERSON',
        category: 'Icebreaker',
        image: '/guess-the-person.png',
        route: '/video/game',
        isAvailable: false,
    },
    {
        id: 'truth-and-dare',
        title: 'TRUTH AND DARE',
        category: 'Icebreaker',
        image: '/truth-and-dare.png',
        route: '/video/game',
        isAvailable: false,
    },
    {
        id: 'guess-the-logo',
        title: 'GUESS THE Logo',
        category: 'Puzzle',
        image: '/guess-the-logo.png',
        route: '/video/game',
        isAvailable: false,
    },

    // {
    //     id: 'ping-pong',
    //     title: 'PING PONG',
    //     category: 'Action',
    //     image: '/ping-pong.png',
    //     route: '/video/game',
    //     isAvailable: true,
    // },
    // {
    //     id: 'darts',
    //     title: 'DARTS',
    //     category: 'Strategy',
    //     image: '/darts.png', // Placeholder
    //     route: '/video/game',
    //     isAvailable: false,
    // },
    // {
    //     id: 'bowling',
    //     title: 'BOWLING',
    //     category: 'Action',
    //     image: '/bowling.png', // Placeholder
    //     route: '/video/game',
    //     isAvailable: false,
    // },
];

export const categories = [
    'All',
    'Icebreaker',
    'Strategy',
    'Puzzle',
    'Action',
];
