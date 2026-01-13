## 2026-01-13 - Accessibility in Video Controls
**Learning:** Video chat interfaces often rely heavily on icon-only buttons for critical controls (mute, camera toggle), which are inaccessible to screen reader users without explicit labeling. Also, dynamic status updates (like "Match Found") need `aria-live` regions to be announced.
**Action:** Always verify that icon-only buttons have `aria-label`s and that status overlays use `role="status"` or `aria-live="polite"`.
