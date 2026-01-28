## 2024-05-23 - Icon-only buttons accessibility pattern
**Learning:** The codebase frequently uses icon-only buttons for critical actions (video controls, social interactions) without consistent accessibility labels. Since `radix-ui/react-tooltip` is not available, these buttons are inaccessible to screen readers and lack visual cues for mouse users.
**Action:** Enforce a strict pattern of adding both `aria-label` (for screen readers) and `title` (for native tooltips) to all icon-only buttons.
