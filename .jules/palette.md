## 2026-01-23 - Accessibility Gaps in Icon-Only Buttons
**Learning:** Several critical action buttons (Friend Request, Report, Send, Exit) were implemented as icon-only buttons without `aria-label` or `title` attributes. This makes them inaccessible to screen readers and confusing for mouse users who rely on tooltips.
**Action:** When creating or reviewing icon-only buttons, always enforce the presence of `aria-label` (for screen readers) and `title` (for visual tooltip/hover feedback).
