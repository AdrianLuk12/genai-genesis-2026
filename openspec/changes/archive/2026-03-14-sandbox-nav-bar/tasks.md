## 1. SandboxNavBar Component

- [x] 1.1 Create `SandboxNavBar` component file at `control-panel-ui/src/components/sandbox-nav-bar.tsx` with props: `origin` (string), `sandboxReady` (boolean), `onNavigate` (callback with full URL), `onRefresh` (callback), recording indicator props
- [x] 1.2 Implement locked origin display as a non-editable styled label showing the sandbox origin
- [x] 1.3 Implement editable path input field defaulting to `/`, with Enter key submission and auto-prepend `/` normalization
- [x] 1.4 Implement navigation history state (path array + current index) with back/forward/new-navigation-clears-forward logic
- [x] 1.5 Implement back and forward buttons using Lucide icons (`ChevronLeft`, `ChevronRight`), disabled state when at history boundaries
- [x] 1.6 Implement refresh button using Lucide `RotateCw` icon that calls `onRefresh`

## 2. Integration with Sandbox Page

- [x] 2.1 Add `iframePath` state and `iframeKey` state (for refresh remount) to the sandbox page component
- [x] 2.2 Replace the existing `CardHeader` content (status indicator + anchor link + recording indicator) with `SandboxNavBar`, passing sandbox origin, ready state, and navigation callbacks
- [x] 2.3 Update iframe `src` to use `origin + iframePath` instead of `sandbox.sandbox_url` directly
- [x] 2.4 Implement refresh by incrementing `iframeKey` on the iframe element
- [x] 2.5 Preserve existing status indicator (LIVE/CONNECTING) and recording indicator within the nav bar layout
