## Why

The control panel's sandbox preview iframe shows a "connection reset" error for the first ~5 seconds after a sandbox is spun up, requiring users to manually refresh. This creates a broken first impression. Additionally, the overall UI lacks visual polish — it needs a cohesive design language with a warm, minimalistic aesthetic, smooth animations, and intentional UX details to feel production-ready for the hackathon demo.

## What Changes

- **Sandbox preview loading state**: Replace the raw iframe (which shows connection errors during container startup) with a loading animation that polls for sandbox readiness, then reveals the content with a smooth transition
- **Design system overhaul**: Replace the current color palette with a warm, earthy tone system (`#F9F8F6`, `#EFE9E3`, `#D9CFC7`, `#C9B59C`) applied across all pages
- **UI redesign**: Restyle all pages (dashboard, scenarios, sandbox view) with a minimalistic, boxy aesthetic — sharp corners, clean typography, intentional whitespace
- **Animation system**: Add smooth transitions, backdrop blurs, and micro-interactions throughout the UI (page transitions, button hovers, card reveals, loading states)
- **Component refinement**: Update all shared components (buttons, cards, dialogs, badges, inputs) to match the new design language

## Capabilities

### New Capabilities
- `sandbox-preview-loader`: Handles iframe loading lifecycle — polls sandbox URL for readiness, shows skeleton/loading animation, reveals content when ready, with error recovery
- `ui-design-system`: Defines the new color palette, typography, spacing, animation tokens, and visual language (boxy, minimalistic, warm tones with blurs)

### Modified Capabilities
- `control-panel-ui`: Update all page layouts and component styling to use the new design system — dashboard, scenarios, sandbox view pages

## Impact

- **Frontend only** — no API or backend changes required
- **Files affected**: `globals.css` (theme tokens), all page components (`page.tsx` files), all UI components in `components/ui/`, `layout.tsx` (navigation)
- **Dependencies**: No new packages required — Tailwind CSS 4 supports all needed features (animations, backdrop-blur, transitions)
- **Breaking**: None — all changes are visual/UX, no API contract changes
