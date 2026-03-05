# NEW GAMES TO BE ADDED

## PENDING

### CONNECT 4
Assets: ["rumi-live/public/connect4/assets/blue_ball.svg", "rumi-live/public/connect4/assets/red_ball.svg", "rumi-live/public/connect4/assets/board.svg", "rumi-live/public/connect4/audio/stacking.mp3"]

Game Logic: Here is the aligned game architecture description, updated to reflect a decentralized WebRTC peer-to-peer architecture with no menu screen, while maintaining the specific Phaser 3 frontend mechanics, assets, and animations.

#### Game Overview & Concept

Connect Four is a two-player, perfect-information, zero-sum abstract strategy game played on a vertical 7-column × 6-row grid. Players alternate dropping colored discs (Red and **Blue**) into columns, where each disc falls to the lowest available row due to simulated gravity. The first player to form an unbroken horizontal, vertical, or diagonal line of exactly four or more of their own discs wins the match. If all 42 cells are filled without either player achieving this, the game ends in a draw. The game features a Phaser 3 frontend communicating directly peer-to-peer via a WebRTC data channel, facilitated by a TURN server for NAT traversal. There is no centralized authoritative server. There is no randomness after match initialization, no hidden information, and no asymmetry between players beyond turn order, which is determined at match start (Player A/Red always moves first).

#### Board Layout & Initialization

The board is a 7-column by 6-row grid visually represented by the `board.svg` asset, indexed as columns 0–6 (left to right) and rows 0–5 (bottom to top). At game start, all 42 cells are empty. The game state is maintained locally by both peers, representing the board as a 2D integer matrix where 0 = empty, 1 = Red (Player A), and 2 = Blue (Player B). Instead of a separate height array, the lowest available row is calculated dynamically by iterating from row 0 upwards until an empty cell (`0`) is found. The board state is deterministic and kept synchronized across both peers through sequential move events.

#### Piece & Player Types

There are exactly two players — **Player A (Red)** and **Player B (Blue)** — and one piece type per player: a colored disc rendered via `red_ball.svg` or `blue_ball.svg`. Discs have no movement after placement; they are permanent, immutable, and subject to gravity. There are no promotions, captures, or piece transformations. Each player has an unlimited supply of discs, bounded only by the 42 total cells on the board.

#### Movement & Interaction Rules

On each turn, the active player interacts with invisible click zones overlaying the local board. Hovering over a column displays a semi-transparent (`0.15` alpha) white highlight and a preview ball at the top. Clicking a column initiates the move. The local client validates the move against its local matrix, triggers a drop animation (a Phaser tween moving the ball to its target Y-coordinate over `800ms` using a `Bounce.easeOut` easing), plays the `stacking.mp3` audio file, updates its local board state, and transmits a `game_move` payload via the WebRTC connection to the peer. The peer receives the payload, applies it to their local matrix, and mirrors the drop animation and sound.

#### Win & Draw Conditions

After each disc is placed, both clients independently evaluate win conditions locally using the `checkWin` function, scanning all four directional axes — horizontal, vertical, diagonal-up (/), and diagonal-down () — centered on the newly placed disc. If a contiguous run of four or more matching discs is found, the local game transitions to an end state. If no win is detected and all 42 cells are filled (checked via `isBoardFull`), the game is declared a draw. Because the rules are purely deterministic, both peers independently calculate and arrive at the exact same terminal state simultaneously.

#### Illegal Move Validation

Since there is no authoritative server, move validation is strictly enforced locally by the active player's client before broadcasting, and defensively verified by the receiving peer. Validation steps: (1) verify it is the local player's turn (`currentTurn === playerRole`); (2) verify the column is within bounds [0, 6]; (3) verify the column is not full (`board[ROWS-1][column] === 0`). If a peer receives an invalid move payload over WebRTC, it rejects it to prevent desynchronization, though the UI actively prevents clicking full columns or clicking out of turn.

#### Turn Timer Constraints

*Note: In the current implementation, turn timer constraints are omitted.* Players have unlimited time to make their moves. The game relies on the players to complete their turns or eventually disconnect. WebRTC connection state monitoring (via ICE connection state changes) detects peer disconnections, which instantly triggers an `opponent_disconnected` sequence, gracefully ending the game for the remaining player.

#### Match Lifecycle

1. **Connection & Signaling:** Bypassing any Menu or lobby screen, clients load directly into the application and immediately use a signaling mechanism (facilitated by a TURN server) to exchange ICE candidates and establish a direct WebRTC peer-to-peer connection.
2. **Game Start:** Once the WebRTC data channel opens, peers establish roles (e.g., the peer who initiated the offer acts as Player A/Red, and the answerer acts as Player B/Blue). The `GameScene` initializes, drawing the `board.svg` and initializing the local 2D matrix. Player A is set to active.
3. **Active Turn Loop:** The active player clicks a column. The client disables local input, animates the `red_ball.svg` or `blue_ball.svg` dropping with `Bounce.easeOut`, and sends the column index to the opponent. The opponent's client receives the move, animates the falling disc, and switches the local `currentTurn` variable to allow their own input.
4. **Threat Detection:** *Note: Threat analysis and highlighting are not implemented in the current codebase.*
5. **End Condition Evaluation:** Upon applying any move (local or received), both clients independently run the win/draw checks. If found, the turn loop halts.
6. **Post-Game Summary:** A celebration animation plays locally: the text "YOU WIN!", "YOU LOSE!", or "IT'S A DRAW!" scales up and down (from 0.5 to 1.2 over 500ms with a Back.easeOut yoyo effect). A "REMAIN IN ROOM" or "REMATCH" prompt appears, as returning to a non-existent menu is no longer applicable.

#### Peer-to-Peer Game State Schema

Instead of an authoritative server tracking active matches, both peers independently maintain a synchronized local state in memory:

```javascript
{
  localRole: 'A' | 'B',          // Red or Blue
  board: int[6][7],              // 0=empty, 1=Red, 2=Blue
  currentTurn: 'A' | 'B'
}

```

State synchronization relies on precise WebRTC data channel payloads. A `game_move` message simply carries `{ column }`, as both deterministic clients can independently deduce the correct row and resulting game state.

#### Game Logic

Upon the active player clicking a column, the local client validates that it is their turn and ensures the requested column is within the `0-6` range and not full (by checking the topmost row); if valid, the client loops upward from row `0` to find the lowest empty cell, places the active player's token (`1` for Red, `2` for Blue) in its local matrix, and transmits the `game_move` payload containing the selected column via the WebRTC data channel to the peer. Concurrently, the client disables local input, spawns a `red_ball.svg` or `blue_ball.svg` sprite, and initiates an 800ms `Bounce.easeOut` downward tween alongside the `stacking.mp3` sound effect. The receiving peer accepts the payload, defensively validates it, mirrors the token placement in its own matrix, and plays the identical drop animation and audio. Both clients independently execute a win-detection scan across all four directional axes using a sliding window anchored at the newly placed cell. If either client finds a winning line, it flags its local game as over and triggers an animated scaling text sequence declaring the result; if no win is found but the topmost row of every column is filled, both declare a draw. If neither terminal condition is met, both clients independently switch their `currentTurn` flag, effectively handing control over to the opponent for the next WebRTC interaction.
---

## REVISION

---

## DONE

### FLAMES
Summary: A real-time 1v1 multiplayer adaptation of the classic childhood game. Players connect, enter their names, and the game automatically processes the FLAMES logic—canceling common letters, counting remaining characters, and deterministically eliminating letters from the F-L-A-M-E-S sequence until one relationship outcome remains. The implementation features synchronized state progression to ensure both players see the identical step-by-step elimination sequence, culminating in a shared immutable outcome with full continuous replayability.

---
