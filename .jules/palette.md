## 2024-05-23 - Accessibility for Icon-Only Buttons
**Learning:** Icon-only buttons (like those used in video chat controls) are invisible to screen readers without explicit labels.
**Action:** Always add both `aria-label` (for screen readers) and `title` (for mouse users tooltip) to any button that relies solely on an icon for meaning.
