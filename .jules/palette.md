## 2024-05-22 - Icon-Only Buttons Accessibility
**Learning:** The application frequently uses icon-only buttons (using `lucide-react` icons inside `Button` components) without `aria-label` or `title` attributes, making them inaccessible to screen readers and unclear to users.
**Action:** When creating or modifying icon-only buttons, always ensure `aria-label` is present. Consider adding `title` for tooltip behavior on desktop.
