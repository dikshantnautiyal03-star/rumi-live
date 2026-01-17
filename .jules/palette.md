## 2024-05-22 - Icon-Only Button Accessibility Gap
**Learning:** Icon-only buttons using `lucide-react` (or any icon library) within standard `Button` components are consistently missing `aria-label`s, rendering them inaccessible to screen readers.
**Action:** Audit all usages of `size="icon"` or similar variants in `Button` components and enforce `aria-label` or `sr-only` text presence.
