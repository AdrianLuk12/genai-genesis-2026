## Context

The control panel UI is a Next.js 16 app (React 19, Tailwind CSS 4, shadcn/ui components) that manages Docker-based sandboxes. Currently:

- The sandbox view page renders an iframe immediately with `sandbox.sandbox_url`, but the container takes ~5 seconds to become responsive — during this window the iframe shows "connection reset" errors
- The UI uses default shadcn/ui styling with cold gray OKLCH colors and rounded corners
- No loading animations, transitions, or micro-interactions exist
- All pages use plain `<p className="text-gray-500">Loading...</p>` for loading states
- Error handling is minimal (console.error, alert())

The user's color palette: `#F9F8F6` (warm white), `#EFE9E3` (light sand), `#D9CFC7` (warm gray), `#C9B59C` (muted tan). The design language is minimalistic, modern, boxy (sharp corners), with smooth animations and backdrop blurs.

## Goals / Non-Goals

**Goals:**
- Eliminate the "connection reset" iframe problem by polling sandbox readiness before showing the iframe
- Overhaul the entire UI with the warm, earthy color palette and boxy aesthetic
- Add smooth CSS transitions, backdrop-blur effects, and micro-interactions
- Create a cohesive loading animation system (skeleton screens, spinners, content reveals)
- Make the UI feel polished and demo-ready

**Non-Goals:**
- Backend/API changes — all fixes are frontend-only
- Dark mode support — focusing on a single warm light theme
- Mobile responsiveness improvements — desktop-first hackathon demo
- Adding new pages or routes
- State management library — keeping local React state

## Decisions

### 1. Iframe readiness polling via direct fetch probe

**Decision**: Use a polling mechanism that sends HEAD/GET requests to the sandbox URL every 1 second. When the request succeeds (HTTP 200), reveal the iframe with a fade-in transition.

**Why not iframe `onload` event?** The iframe fires `onload` even on error pages. The browser shows "connection reset" natively before any JS event fires, so we can't intercept it. By holding back the iframe `src` until the URL is reachable, we avoid the error entirely.

**Why not a backend health endpoint?** Adding a `/health` endpoint to the target app would require modifying the target-app-template and doesn't guarantee the full page is ready. Direct probing tests what the user actually sees.

**Implementation**: The iframe `src` starts as `about:blank`. A `useEffect` with `setInterval` fetches the sandbox URL (with `mode: 'no-cors'` to avoid CORS blocks — an opaque response still confirms the server is up). On success, set the real `src` and clear the interval. Show a loading skeleton in the iframe's place during polling.

### 2. Color palette mapped to CSS custom properties

**Decision**: Replace the OKLCH color values in `globals.css` `:root` with the new hex palette converted to OKLCH. Map the four colors to semantic roles:

| Hex | Role | CSS Variable |
|-----|------|-------------|
| `#F9F8F6` | background, card | `--background`, `--card` |
| `#EFE9E3` | secondary, muted, accent | `--secondary`, `--muted`, `--accent` |
| `#D9CFC7` | border, input, ring | `--border`, `--input` |
| `#C9B59C` | primary foreground hints, ring | `--ring` |

Primary (buttons, strong actions) stays dark (`--primary: near-black`) for contrast. Foreground text stays dark for readability. The warm tones replace the cold grays across all surface/border/muted tokens.

**Why OKLCH conversion?** The existing theme uses OKLCH variables consumed by Tailwind/shadcn. Converting hex to OKLCH maintains compatibility with the existing `@theme inline` setup.

### 3. Boxy aesthetic via zero border-radius

**Decision**: Set `--radius: 0` in `:root` to make all shadcn components square-cornered. This single change cascades through `--radius-sm`, `--radius-md`, `--radius-lg` etc. since they're all computed from `--radius`.

### 4. Animation system using Tailwind CSS transitions + keyframes

**Decision**: Define animation utilities in `globals.css` using `@keyframes` and Tailwind's `@theme` for custom animation tokens. Specific animations:

- **Page content**: Fade-in-up on mount (opacity 0→1, translateY 8px→0, 300ms ease-out)
- **Cards**: Staggered fade-in with `animation-delay` on grid children
- **Buttons**: Scale on hover (1→1.02), background color transition (150ms)
- **Iframe loading**: Skeleton shimmer animation → crossfade to content
- **Backdrop blur**: Applied to nav bar (`backdrop-blur-md`) for depth layering
- **Status messages**: Slide-in from top with fade

**Why CSS-only?** No additional animation library needed. Tailwind 4 + CSS keyframes handle everything. Keeps bundle size unchanged.

### 5. Navigation bar redesign

**Decision**: Frosted glass nav with `backdrop-blur-lg`, semi-transparent warm white background (`bg-[#F9F8F6]/80`), no visible border (or very subtle bottom border). Logo/brand in bold, nav links with underline-on-hover animation.

### 6. Loading states as skeleton screens

**Decision**: Replace all `<p>Loading...</p>` with skeleton placeholder cards that match the shape of the actual content. Use a shimmer animation (linear-gradient moving left-to-right). This gives the user spatial context about what's loading.

## Risks / Trade-offs

- **CORS on iframe polling**: `fetch` with `mode: 'no-cors'` returns opaque responses — we can't read status codes, but a resolved promise (vs network error) confirms the server is listening. → Mitigation: treat any non-error response as "ready". Add a max timeout (30s) with a "taking longer than expected" message and manual retry button.

- **Color contrast**: The warm palette is light-on-light. Text must remain dark enough for WCAG AA. → Mitigation: keep `--foreground` at near-black, keep `--primary` dark for button text contrast.

- **Animation performance**: Too many simultaneous CSS animations on lower-end devices. → Mitigation: use `will-change: transform, opacity` sparingly, keep animations under 400ms, use `prefers-reduced-motion` media query to disable animations for users who prefer it.

- **Zero border-radius**: Some components (badges, avatars) may look odd fully square. → Mitigation: acceptable trade-off for the "boxy" design language. Can add 1-2px radius to specific elements if needed.
