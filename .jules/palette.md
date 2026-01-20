## 2024-05-22 - Accessibility on Icon-Only Buttons
**Learning:** Icon-only buttons are prevalent in the video chat interface but often lack accessible labels. Adding `aria-label` and `title` improves both screen reader support and provides visual tooltips for mouse users, a critical "micro-UX" win.
**Action:** Always check icon-only buttons for `aria-label` and `title` attributes during reviews or refactors.
