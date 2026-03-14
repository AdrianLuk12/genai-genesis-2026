## 1. Design System Foundation

- [x] 1.1 Update `globals.css` color palette — replace all OKLCH `:root` variables with hex-to-OKLCH conversions of `#F9F8F6`, `#EFE9E3`, `#D9CFC7`, `#C9B59C` mapped to semantic roles (background, card, secondary, muted, border, input, ring)
- [x] 1.2 Set `--radius: 0` in `:root` to enforce boxy zero-border-radius across all shadcn components
- [x] 1.3 Add CSS keyframes in `globals.css` — `fade-in-up` (opacity+translateY), `shimmer` (skeleton loading gradient), `slide-in-top` (status messages), and register as Tailwind animation utilities
- [x] 1.4 Add `prefers-reduced-motion` media query to disable all custom animations when user preference is set

## 2. Navigation Bar

- [x] 2.1 Restyle nav in `layout.tsx` — semi-transparent warm white background (`#F9F8F6` at 80% opacity), `backdrop-blur-lg`, sticky positioning, remove hard border, add subtle bottom shadow
- [x] 2.2 Add nav link hover animations — underline slide-in effect with smooth transitions

## 3. Sandbox Preview Loader

- [x] 3.1 Add sandbox URL polling logic in `sandbox/[id]/page.tsx` — `useEffect` with `setInterval` (1s) using `fetch` with `mode: 'no-cors'`, track `sandboxReady` state, clear interval on success or component unmount
- [x] 3.2 Add 30-second timeout handling — show "taking longer than expected" message with a Retry button that restarts polling
- [x] 3.3 Build skeleton loading placeholder for the iframe area — full-width/height container with shimmer animation matching iframe dimensions
- [x] 3.4 Implement iframe reveal — hold `src` as `about:blank` until ready, then set real URL with opacity 0→1 crossfade transition (300ms ease-out)

## 4. Dashboard Page Redesign

- [x] 4.1 Replace `Loading...` text with skeleton card grid (3 placeholder cards with shimmer) in `page.tsx`
- [x] 4.2 Restyle sandbox cards — warm palette colors, square corners, clean typography, remove raw container IDs where possible
- [x] 4.3 Restyle quick-launch section cards — consistent warm design with hover micro-interactions
- [x] 4.4 Add fade-in-up animation wrapper to page content on mount
- [x] 4.5 Add staggered entrance animation to card grids (50ms delay per card)
- [x] 4.6 Restyle empty state — warm muted tones, clean typography

## 5. Scenarios Page Redesign

- [x] 5.1 Replace `Loading...` text with skeleton card grid in `scenarios/page.tsx`
- [x] 5.2 Restyle scenario cards — warm palette, boxy aesthetic, clean config preview styling (replace `bg-gray-50` with design system color)
- [x] 5.3 Restyle scenario creation form — warm input borders, clean labels, consistent button styling
- [x] 5.4 Add fade-in-up page animation and staggered card entrance

## 6. Sandbox View Page Redesign

- [x] 6.1 Restyle sandbox view header and action buttons — warm palette, clean layout
- [x] 6.2 Restyle status message card — add slide-in-top animation for feedback messages
- [x] 6.3 Restyle iframe container card — warm border, clean header with metadata

## 7. Button Micro-interactions

- [x] 7.1 Add hover scale (1.02x) and active scale (0.98x) transitions to button component with 150ms timing
- [x] 7.2 Add smooth background-color transition to all button variants
