# Litigo Design System

## Design Philosophy

Simple. Fast. Quiet. Precise. Trustworthy. Cross-platform.

Litigo is not an "AI startup" product. It is a serious software utility that runs quietly in the background. The visual language must communicate reliability, precision, and restraint.

## Color Palette

### Foundation (Monochrome-First)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#fafafa` | Page background, base surface |
| `--card` | `#ffffff` | Cards, panels, elevated surfaces |
| `--text` | `#0a0a0a` | Primary text, headings, icons |
| `--muted` | `#6b7280` | Secondary text, labels, metadata |
| `--border` | `rgba(10,10,10,.08)` | Hairlines, dividers, card borders |

### Accent

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#b45309` | Brand accent, key indicators, active states |
| `--accent-soft` | `rgba(180,83,9,.10)` | Soft fills, icon backgrounds, hover tints |
| `--accent2` | `#1f2937` | Secondary accent, duotone elements |
| `--accent2-soft` | `rgba(31,41,55,.08)` | Secondary soft fills |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#166534` | Rule passed, active, compliant |
| `--success-soft` | `rgba(22,101,52,.10)` | Success backgrounds |
| `--warning` | `#92400e` | Partial match, borderline, warning |
| `--warning-soft` | `rgba(146,64,14,.10)` | Warning backgrounds |
| `--error` | `#991b1b` | Rule violation, error state |
| `--error-soft` | `rgba(153,27,27,.10)` | Error backgrounds |

### Forbidden Visuals

- **Purple/blue AI gradients** — Never use. Litigo is not a generic AI SaaS.
- **Neon effects** — No glowing borders, no neon text.
- **Robot illustrations** — No mascots, no floating AI characters.
- **Excessive emojis** — Zero emojis in UI. Use SVG icons or styled glyphs.
- **Glassmorphism** — Subtle borders and restrained shadows only.
- **3D decorative blobs** — No meaningless geometric decorations.

## Typography

### Primary Font

**Archivo** — Google Fonts

Weights: 300, 400, 500, 600, 700

Fallback stack: `'Archivo', system-ui, -apple-system, sans-serif`

### Type Scale

| Role | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| Hero heading | 64px | 700 | 1.05 | -0.03em |
| Section title | 32px | 700 | 1.20 | -0.02em |
| Subsection heading | 18px | 700 | 1.35 | 0 |
| Body text | 14–16px | 400 | 1.60 | 0 |
| Small text | 12–13px | 400 | 1.50 | 0 |
| Eyebrow label | 11px | 600 | 1.00 | 0.18em |
| Monospace/data | 12px | 400 | 1.40 | 0 |

### Monospace

`ui-monospace, SFMono-Regular, Menlo, monospace`

Used for timestamps, violation counts, compliance percentages, technical identifiers.

Apply `font-variant-numeric: tabular-nums` for numeric alignment.

## Spacing System

Base unit: **4px**

| Token | Pixels | Usage |
|-------|--------|-------|
| `space-1` | 4px | Tight internal padding |
| `space-2` | 8px | Small gaps, icon spacing |
| `space-3` | 12px | Button padding, compact gaps |
| `space-4` | 16px | Standard card padding |
| `space-5` | 20px | Comfortable card padding |
| `space-6` | 24px | Section internal padding |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Section breathing room |
| `space-16` | 64px | Major section spacing |
| `space-25` | 100px | Page section vertical padding |

## Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Small pills, compact inputs |
| `radius-md` | 8px | Buttons, small cards |
| `radius-lg` | 10px | Standard cards, rule items |
| `radius-xl` | 12px | Major cards, panels |
| `radius-2xl` | 16px | Product mockups, hero demos |

## Borders & Shadows

### Borders

All borders use `1px solid var(--border)` as the default.

- Card borders: `1px solid var(--border)`
- Dividers: `1px solid var(--border)`
- Focused/active: `border-color: rgba(10,10,10,.18)` or accent-tinted

### Shadows

Restrained. Elevation is communicated through borders first, shadows second.

| Level | Value | Usage |
|-------|-------|-------|
| Subtle | `0 1px 3px rgba(0,0,0,.04)` | Standard cards at rest |
| Hover | `0 4px 24px rgba(0,0,0,.06)` | Card hover state |
| Product | `0 20px 60px rgba(0,0,0,.08)` | Hero product mockup |
| Popover | `0 4px 20px rgba(0,0,0,.08)` | Floating indicators, panels |

## Iconography

### Style

- **Stroke-based**, consistent 1.8–2px stroke width
- **Monochrome** — inherits `currentColor`
- **24×24 viewBox** standard, scaled via CSS
- **No filled icons** mixed with stroke icons in the same context

### Icon Set

Use a single consistent library. Prefer hand-drawn inline SVG for small icon counts (≤8), Remix Icon CSS for larger sets.

**Forbidden:** Emojis as UI icons. Never.

## Components

### Buttons

**Primary**
```
background: var(--text);
color: var(--bg);
border-radius: 8px;
padding: 12px 22px;
font-weight: 600;
font-size: 14px;
```

**Secondary**
```
background: transparent;
color: var(--text);
border: 1px solid var(--border);
border-radius: 8px;
padding: 12px 22px;
font-weight: 500;
font-size: 14px;
```

**Ghost**
```
background: transparent;
color: var(--muted);
border: none;
font-weight: 500;
```

### Cards

```
background: var(--card);
border: 1px solid var(--border);
border-radius: 12px;
```

Hover state: `border-color: rgba(10,10,10,.18); box-shadow: 0 4px 24px rgba(0,0,0,.04);`

### Status Pills

```
padding: 3px 10px;
border-radius: 20px;
font-size: 12px;
font-weight: 600;
```

- Success: `background: var(--success-soft); color: var(--success);`
- Warning: `background: var(--warning-soft); color: var(--warning);`
- Error: `background: var(--error-soft); color: var(--error);`

### Status Dots

8px diameter circles. Used sparingly to indicate active/enabled state.

## Animation

### Principles

Animations communicate state. They do not seek attention.

### Allowed

- Subtle fade-in on load (`opacity: 0 → 1`, `translateY: 16px → 0`, 0.6s ease)
- Smooth panel expansion (max-height transition, 0.3s ease)
- Tab/button state changes (0.15s ease)
- Card hover lift (translateY -2px, 0.2s ease)
- Progress bar transitions

### Forbidden

- Bouncing effects
- Particle systems
- Flashy gradient animations
- Excessive parallax
- Attention-seeking motion that doesn't communicate state

### Timing

- Fast (state changes): 0.15s
- Standard (panel transitions): 0.30s
- Gentle (reveal animations): 0.60s

Easing: `ease` (CSS default) for most things. Never `cubic-bezier` bouncy curves.

## Responsive Behavior

### Breakpoints

- Mobile: < 640px
- Tablet: 640–1024px
- Desktop: > 1024px

### Rules

- Layouts must flex-wrap. Never rigid fixed columns on mobile.
- Touch targets minimum 44×44px on mobile.
- Typography scales down gracefully (hero 64px → 40px on mobile).
- Grids collapse: 6-col → 3-col → 2-col → 1-col.

## Platform-Specific Adaptation

While the visual language is shared, each platform must respect native conventions:

### Windows
- System tray icon (standard Windows tray behavior)
- Right-click context menu on tray
- Window chrome follows Windows conventions
- Sharp corners acceptable where native

### macOS
- Menu bar item (NSStatusItem)
- Rounded corners follow macOS HIG
- Translucency effects used sparingly
- Preference window style

### Android
- Material You guidelines where appropriate
- Floating overlay (system-alert-window style)
- Accessibility service UI patterns
- Ripple effects on touch

### iOS
- iOS keyboard extension conventions
- Human Interface Guidelines compliance
- San Francisco font for native chrome
- No floating overlays (not permitted)

### Chrome Extension
- Browser action popup dimensions
- Chrome-style buttons and form elements
- Manifest V3 patterns
- Content script injection follows Chrome conventions
