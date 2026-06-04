## 2025-06-04 - Visible Focus on Glowing Buttons
**Learning:** Buttons with aggressive box-shadow glows (like `#ff0040`) completely hide default browser focus outlines, making keyboard navigation invisible and inaccessible to users who rely on tab navigation.
**Action:** Always add explicit `:focus-visible` styles with a contrasting `outline` or `ring` effect when overriding base button styles with heavy box-shadows.
