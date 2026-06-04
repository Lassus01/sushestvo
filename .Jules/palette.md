## 2025-06-04 - Visible Focus on Glowing Buttons
**Learning:** Buttons with aggressive box-shadow glows (like `#ff0040`) completely hide default browser focus outlines, making keyboard navigation invisible and inaccessible to users who rely on tab navigation.
**Action:** Always add explicit `:focus-visible` styles with a contrasting `outline` or `ring` effect when overriding base button styles with heavy box-shadows.
## 2026-06-04 - Custom Accessible Modal Dialogs
**Learning:** Replacing native browser 'prompt' and 'alert' dialogs with custom HTML/CSS modals significantly improves both UX and accessibility, allowing for focus management, keyboard navigation (Esc to close, focus trapping), and custom styling consistent with the brand theme.
**Action:** Replaced native prompt() in the cult joining process with an accessible custom modal in index.html, implementing aria-attributes and JS focus trapping.
## 2024-05-18 - Background Decorative Elements
**Learning:** Purely decorative animated background elements (such as 3D canvases for visual flair) should be hidden from assistive technologies to avoid screen reader noise.
**Action:** Added `aria-hidden="true"` to the `#bg-eyes-container` element.
