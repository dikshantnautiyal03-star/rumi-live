## 2024-05-23 - Missing Accessibility Attributes on Icon Buttons
**Learning:** Icon-only buttons (common in `VideoChatPage`) consistently lacked `aria-label` and `title` attributes. This pattern makes the app inaccessible to screen readers and unclear to mouse users who rely on tooltips.
**Action:** Enforce `aria-label` and `title` on all `Button` components where `size="icon"` or where no text content is present. Use `title` for native tooltips when custom tooltip components are unavailable.
