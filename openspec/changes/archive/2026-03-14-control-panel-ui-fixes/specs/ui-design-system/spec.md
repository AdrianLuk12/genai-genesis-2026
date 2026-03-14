## ADDED Requirements

### Requirement: Warm earthy color palette
The control panel UI SHALL use the following color palette as the foundation for all surface, border, and accent colors:
- `#F9F8F6` (warm white) — backgrounds, cards
- `#EFE9E3` (light sand) — secondary surfaces, muted areas
- `#D9CFC7` (warm gray) — borders, inputs
- `#C9B59C` (muted tan) — focus rings, accents

#### Scenario: Color variables applied
- **WHEN** the application loads
- **THEN** all CSS custom properties (`--background`, `--card`, `--secondary`, `--muted`, `--border`, `--input`, `--ring`) reflect the warm earthy palette colors

#### Scenario: Text contrast maintained
- **WHEN** text is rendered on any surface
- **THEN** the foreground color remains near-black to maintain readable contrast against the warm light backgrounds

### Requirement: Boxy aesthetic with zero border radius
All UI components SHALL render with square corners (0 border radius) to achieve the boxy, minimalistic design language.

#### Scenario: Zero radius applied globally
- **WHEN** any shadcn/ui component renders (cards, buttons, inputs, badges, dialogs)
- **THEN** the component has `border-radius: 0` (via `--radius: 0` CSS variable)

### Requirement: Smooth page-level animations
All page content SHALL animate in on mount with a fade-in-up transition (opacity 0→1, translateY 8px→0) over 300ms.

#### Scenario: Dashboard page entrance
- **WHEN** a user navigates to the dashboard
- **THEN** the page content fades in and slides up from 8px below over 300ms

#### Scenario: Reduced motion preference
- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** all animations are disabled and content appears immediately

### Requirement: Card staggered entrance animation
Cards in grid layouts SHALL animate in with staggered delays to create a cascading reveal effect.

#### Scenario: Grid cards animate in sequence
- **WHEN** a grid of cards renders (dashboard sandbox cards, scenario cards)
- **THEN** each card fades in with a 50ms stagger delay (first card: 0ms, second: 50ms, third: 100ms, etc.)

### Requirement: Button micro-interactions
Buttons SHALL have smooth hover and active state transitions.

#### Scenario: Button hover effect
- **WHEN** a user hovers over a button
- **THEN** the button scales to 1.02x with a 150ms transition and the background color transitions smoothly

#### Scenario: Button active effect
- **WHEN** a user clicks/presses a button
- **THEN** the button scales down to 0.98x for tactile feedback

### Requirement: Frosted glass navigation bar
The navigation bar SHALL use a frosted glass effect with a semi-transparent background and backdrop blur.

#### Scenario: Nav bar with blur
- **WHEN** the page renders with a navigation bar
- **THEN** the nav bar has a semi-transparent warm white background (`#F9F8F6` at 80% opacity) with `backdrop-blur` applied, creating a frosted glass effect

#### Scenario: Nav bar on scroll
- **WHEN** page content scrolls behind the navigation bar
- **THEN** the content is visibly blurred through the semi-transparent nav bar

### Requirement: Skeleton loading states
All pages SHALL display skeleton placeholder elements instead of plain "Loading..." text while data is being fetched. Skeletons SHALL use a shimmer animation.

#### Scenario: Dashboard loading skeleton
- **WHEN** the dashboard is loading data
- **THEN** skeleton card placeholders are shown in the grid layout with a shimmer animation

#### Scenario: Scenarios page loading skeleton
- **WHEN** the scenarios page is loading data
- **THEN** skeleton card placeholders are shown matching the scenario card layout

### Requirement: Status message animations
Status and feedback messages SHALL animate in smoothly rather than appearing abruptly.

#### Scenario: Success message animation
- **WHEN** a success message is displayed (e.g., "State saved successfully!")
- **THEN** the message slides in from the top with a fade-in over 200ms
