## 2024-05-23 - Accessibility Patterns in Video Chat
**Learning:** High-density interaction areas (like chat interfaces) often rely on icon-only buttons for space efficiency, but frequently miss accessible labels, making them unusable for screen readers.
**Action:** Always pair `size="icon"` buttons with `aria-label` describing the action, not just the icon name (e.g., "Add friend" vs "UserPlus").
