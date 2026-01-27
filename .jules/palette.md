## 2026-01-27 - Missing ARIA Labels on Icon Buttons
**Learning:** The application frequently uses icon-only buttons (e.g., Friend Request, Report, Send) without accessible names. This makes the app unusable for screen reader users and confusing for others.
**Action:** Always add `aria-label` and `title` to `Button` components that use `size="icon"` or contain only an icon.
