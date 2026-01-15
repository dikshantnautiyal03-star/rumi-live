## 2024-05-22 - Accessibility in Real-Time Video Interfaces
**Learning:** Real-time video interfaces often prioritize visual minimalism, leading to "icon-only" buttons without accessible labels. This excludes screen reader users from core interactions like reporting users or sending friend requests.
**Action:** Always audit overlay controls on video elements. Ensure every icon button has a descriptive `aria-label` and `title`, and that video elements themselves are labeled so users know which stream is which.
