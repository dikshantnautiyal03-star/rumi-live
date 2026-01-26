## 2026-01-26 - Inconsistent Accessibility in Feature Pages
**Learning:** Global components like `TopBar` often have good accessibility (aria-labels, titles), but feature-specific pages like `VideoChat` tend to miss them, likely due to rapid iteration or different developer focus.
**Action:** When auditing, check feature-specific page components (local buttons, overlays) more rigorously than shared UI components.
