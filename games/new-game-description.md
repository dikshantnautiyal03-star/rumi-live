# NEW GAMES TO BE ADDED

## PENDING

### FLAMES
Assets: NA
Game Logic: Design a real-time 1v1 multiplayer adaptation of the traditional childhood game FLAMES (Friends, Lovers, Affection, Marriage, Enemies, Siblings) in which two connected players enter their names, the system removes common letters, counts remaining characters, and iteratively eliminates letters from the circular FLAMES sequence based on the count until one outcome remains; the AI agent must orchestrate matchmaking, synchronized state progression, validation, and deterministic outcome calculation so both players experience identical results without divergence. The shared game state includes: player identifiers (session-bound, non-editable after confirmation), submitted names (locked once both confirm), computed unique-letter count, current FLAMES sequence order, elimination index pointer, remaining letters after each elimination round, and final result; state transitions occur in this order—waiting_for_player → name_entry → name_locked → calculation_in_progress → elimination_round_n (repeated until one letter remains) → result_displayed → rematch_or_exit. The AI agent ensures that during name_entry only local input is visible, during name_locked both names and computed count are revealed to both players simultaneously, during each elimination_round_n the updated FLAMES sequence and next starting index are broadcast atomically to prevent race conditions, and during result_displayed the final relationship outcome is immutable and shared; no hidden randomness is allowed, all eliminations derive strictly from the deterministic count, and any disconnect freezes the match state until reconnection or timeout resolution, preserving fairness and synchronized progression.

---

## REVISION

---

## DONE

---
