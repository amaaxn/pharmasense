# PharmaSense V2 — Part 3: Frontend Shell, Design System, Routing, and State Management
### Depends on: Part 1 (Architecture, Auth, API Conventions), Part 2A/2B (Backend Services, DTOs)

This document specifies the entire frontend foundation: Tailwind design system, accessibility infrastructure, internationalization, Zustand stores, shared component library, responsive layout, routing with guards, API client layer, and animation system. Every component and store is specified to the detail level needed to implement without ambiguity.

> **V1 problems addressed:**
> - Context-only state management (`AuthContext` handling everything) → separate Zustand stores
> - Minimal accessibility (basic `alt` attributes, one `aria-label`) → full WCAG 2.1 AA compliance
> - No i18n → English + Spanish language toggle
> - No skip links, no focus management, no high-contrast mode → comprehensive accessibility toolbar
> - No protected routes (any URL accessible) → role-based route guards
> - Direct Supabase queries from frontend → all data through backend API via Axios
> - Inconsistent styling patterns → unified design token system

---

## 1. Design System — Tokens and Configuration

### 1.1 Color Palette

PharmaSense V2 uses a **dark medical-professional theme** with high-contrast semantic colors for safety status. The palette balances the cyberpunk aesthetic from v1 with clinical readability.

| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#0B0F14` | Page background |
| `bg-card` | `#141A22` | Card, panel, modal backgrounds |
| `bg-input` | `#1C2430` | Input fields, textareas |
| `bg-elevated` | `#1E2A38` | Hover states, active cards, dropdowns |
| `border-default` | `#2A3A4A` | Default borders |
| `border-focus` | `#3B82F6` | Focused input borders |
| `text-primary` | `#E8ECF1` | Body text |
| `text-secondary` | `#94A3B8` | Labels, captions, muted text |
| `text-heading` | `#F1F5F9` | Headings |
| `accent-blue` | `#3B82F6` | Primary actions, links, focus rings |
| `accent-cyan` | `#06B6D4` | Secondary accent, informational |
| `accent-green` | `#10B981` | Success, safety passed, approved |
| `accent-red` | `#EF4444` | Error, blocked, critical alerts |
| `accent-amber` | `#F59E0B` | Warnings, needs review, caution |
| `accent-purple` | `#8B5CF6` | AI-generated content indicator |
| `safety-pass` | `#10B981` | Safety check passed badge |
| `safety-fail` | `#EF4444` | Safety check failed / blocked badge |
| `safety-warn` | `#F59E0B` | Safety check warning badge |
| `coverage-covered` | `#10B981` | Covered status |
| `coverage-not-covered` | `#EF4444` | Not covered status |
| `coverage-prior-auth` | `#F59E0B` | Prior auth required status |
| `coverage-unknown` | `#94A3B8` | Unknown coverage status |
| `tier-1` | `#10B981` | Tier 1 — lowest copay |
| `tier-2` | `#06B6D4` | Tier 2 |
| `tier-3` | `#F59E0B` | Tier 3 |
| `tier-4` | `#EF4444` | Tier 4 — highest copay |

**High-contrast mode overrides** (see Section 3):

| Token | Normal | High Contrast |
|---|---|---|
| `bg-primary` | `#0B0F14` | `#000000` |
| `text-primary` | `#E8ECF1` | `#FFFFFF` |
| `border-default` | `#2A3A4A` | `#FFFFFF` |
| `accent-blue` | `#3B82F6` | `#60A5FA` |

### 1.2 Typography Scale

| Token | Size | Weight | Font | Usage |
|---|---|---|---|---|
| `text-display` | 3rem (48px) | 700 | Inter | Landing hero heading |
| `text-h1` | 2rem (32px) | 700 | Inter | Page titles |
| `text-h2` | 1.5rem (24px) | 600 | Inter | Section headings |
| `text-h3` | 1.25rem (20px) | 600 | Inter | Card titles, subsection headings |
| `text-body` | 1rem (16px) | 400 | Inter | Default body text |
| `text-body-lg` | 1.125rem (18px) | 400 | Inter | Lead paragraphs, descriptions |
| `text-sm` | 0.875rem (14px) | 400 | Inter | Labels, captions, badges |
| `text-xs` | 0.75rem (12px) | 500 | Inter | Timestamps, tertiary labels |
| `text-mono` | 0.875rem (14px) | 400 | JetBrains Mono | Code, medication names, copay amounts |

**Large type mode** multiplies all sizes by 1.25x via a CSS custom property (see Section 3).

**Dyslexia font mode** swaps the font family to OpenDyslexic for all body text (see Section 3).

### 1.3 Spacing Scale

Use Tailwind defaults (4px base). Key application-specific spacing:

| Context | Value | Tailwind Class |
|---|---|---|
| Page horizontal padding | 24px (mobile), 48px (desktop) | `px-6 lg:px-12` |
| Card padding | 24px | `p-6` |
| Card gap (grid) | 24px | `gap-6` |
| Section vertical spacing | 64px | `py-16` |
| Input vertical padding | 10px | `py-2.5` |
| Button vertical padding | 10px / 12px | `py-2.5` / `py-3` |
| Badge padding | 4px 12px | `px-3 py-1` |

### 1.4 Border Radius

| Context | Value | Tailwind Class |
|---|---|---|
| Buttons | 8px | `rounded-lg` |
| Cards | 12px | `rounded-xl` |
| Inputs | 8px | `rounded-lg` |
| Badges | 9999px (pill) | `rounded-full` |
| Modals | 16px | `rounded-2xl` |
| Avatars | 9999px | `rounded-full` |

### 1.5 Shadows

| Token | Value | Usage |
|---|---|---|
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)` | Default card elevation |
| `shadow-card-hover` | `0 4px 12px rgba(0,0,0,0.4)` | Hovered card |
| `shadow-modal` | `0 8px 32px rgba(0,0,0,0.6)` | Modal overlay |
| `shadow-glow-blue` | `0 0 16px rgba(59,130,246,0.3)` | Focused/active blue accent |
| `shadow-glow-green` | `0 0 16px rgba(16,185,129,0.3)` | Safety passed glow |
| `shadow-glow-red` | `0 0 16px rgba(239,68,68,0.3)` | Blocked/error glow |

---

## 2. Tailwind Configuration

### 2.1 `tailwind.config.js`


### 2.2 CSS Custom Properties — `index.css`

All colors are defined as CSS variables, enabling runtime theme switching for high-contrast mode.


---

## 3. Accessibility System

### 3.1 WCAG 2.1 AA Compliance Checklist

Every component and page must satisfy these requirements:

| Requirement | Implementation |
|---|---|
| Color contrast ≥ 4.5:1 (normal text) | All text/background combinations tested; see palette in Section 1.1 |
| Color contrast ≥ 3:1 (large text, UI components) | All accent colors on dark backgrounds pass |
| Not relying on color alone | Safety badges include text labels ("PASS", "BLOCKED"), not just color |
| Keyboard navigable | All interactive elements reachable via Tab; logical tab order |
| Focus visible | `:focus-visible` ring on every interactive element (see CSS above) |
| Skip navigation link | `<SkipLink>` component before `<Navbar>` — jumps to `#main-content` |
| Heading hierarchy | One `<h1>` per page; `<h2>` for sections; `<h3>` for subsections; never skip levels |
| Alt text on images | Every `<img>` has descriptive `alt`; decorative images use `alt=""` and `aria-hidden="true"` |
| Form labels | Every `<input>` has an associated `<label>` via `htmlFor`/`id` |
| ARIA landmarks | `<nav>`, `<main id="main-content">`, `<footer>`, `role="search"` |
| ARIA live regions | Dynamic status messages use `aria-live="polite"` or `aria-live="assertive"` |
| Error identification | Form errors linked to inputs via `aria-describedby` |
| Language attribute | `<html lang="en">` or `<html lang="es">` matching selected language |
| Reduced motion | Respect `prefers-reduced-motion` — disable animations |

### 3.2 SkipLink Component


**Specification:**

- Render an `<a>` tag with `href="#main-content"` and class `skip-link`.
- Visually hidden until focused (CSS handles this).
- Text: "Skip to main content" (localized: "Saltar al contenido principal").
- Place as the very first child inside `<body>` / the root App wrapper.

### 3.3 AccessibilityToolbar Component


**Specification:**

A floating toolbar in the bottom-right corner of the screen, always visible, containing toggle buttons for accessibility features.

**Layout:**
- Fixed position, bottom-right: `fixed bottom-4 right-4 z-50`
- Collapsed by default: shows only a circular `⚙` (gear) button
- Expands on click to reveal the toolbar vertically

**Buttons (when expanded):**

| Button | Label | Action | State |
|---|---|---|---|
| Font Size | `Aa+` | Toggle `large-type` class on `<html>` | On/Off |
| Dyslexia Font | `Dy` | Toggle `dyslexia-font` class on `<html>` | On/Off |
| High Contrast | `◐` | Toggle `high-contrast` class on `<html>` | On/Off |
| Language | `EN` / `ES` | Toggle language between English and Spanish | Displays current language |

**Behavior:**
- All toggles read/write to `uiStore` (Section 5.3).
- Preferences persist to `localStorage` via Zustand persist middleware.
- On initial load, apply saved preferences to `<html>` classList before first paint.
- Each button has `aria-label` and `aria-pressed` for screen readers.
- Toolbar itself has `role="toolbar"` and `aria-label="Accessibility settings"`.

### 3.4 Reduced Motion

In `App.tsx`, detect and respect the user's OS-level preference:


When `prefersReducedMotion` is true OR the user enables it in `uiStore`:
- Framer Motion animations use `duration: 0` or `animate={false}`.
- CSS animations are disabled via `animation-duration: 0s !important`.

### 3.5 ARIA Live Region for Status Updates

Every page that performs async operations (loading recommendations, approving prescriptions, generating voice packs) must include a visually-hidden live region:


Update `statusMessage` when:
- Recommendations are loading / loaded / failed
- A prescription is approved / rejected / blocked
- OCR is processing / complete
- Voice pack is generating / ready

---

## 4. Internationalization (i18n)

### 4.1 Architecture

Use a lightweight dictionary-based approach (no heavy i18n library needed for two languages at a hackathon).


### 4.2 Dictionary Structure


### 4.3 Translation Hook


### 4.4 HTML Lang Attribute

In `App.tsx`, sync the `<html>` `lang` attribute with the selected language:


---

## 5. Zustand Stores

### 5.1 Store Architecture

| Store | File | Persistence | Purpose |
|---|---|---|---|
| `authStore` | `stores/authStore.ts` | No (session managed by Supabase) | Auth state, user profile, session |
| `visitStore` | `stores/visitStore.ts` | No | Active visit workflow state |
| `prescriptionStore` | `stores/prescriptionStore.ts` | No | Recommendation review, approval state |
| `uiStore` | `stores/uiStore.ts` | Yes (`localStorage`) | Accessibility prefs, language, theme |

`authStore` was fully specified in Part 1, Section 5.3. Below are the remaining three stores.

### 5.2 visitStore


**Key behaviors:**

- `extractDataFromNotes()` calls `POST /api/visits/{id}/extract` (which triggers Gemini structured extraction).
- `createVisit()` calls `POST /api/visits` and returns the new visit ID.
- `appendToNotes(text)` appends transcribed handwriting to existing notes (used after drawing OCR).
- `resetVisitForm()` clears all creation state — called after successful visit creation.

### 5.3 uiStore


**Implementation with persistence:**


### 5.4 prescriptionStore


---

## 6. API Client Layer

### 6.1 Axios Client: `api/client.ts`

Configure `baseURL: '/api'` — Vite proxies to FastAPI backend (default port 8000). Attach JWT via request interceptor; unwrap `ApiResponse` envelope in response interceptor.


### 6.2 API Module Files

Each file in `api/` exports typed functions that call the backend through `apiClient`. Example pattern:

**`api/prescriptions.ts`:**


All other API modules (`auth.ts`, `visits.ts`, `patients.ts`, `ocr.ts`, `chat.ts`, `voice.ts`, `analytics.ts`) follow the same pattern.

---

## 7. Routing and Layout

### 7.1 Route Definitions: `routes/index.tsx`


### 7.2 App Shell: `App.tsx`


### 7.3 Navbar

**Behavior specification:**

- Fixed at top, full-width, semi-transparent with backdrop blur.
- Logo on the left (links to `/`).
- Navigation links in the center (visible on `md+`). Links vary by auth state:
  - **Logged out:** Overview, Features, Workflow, Impact (anchor links on landing).
  - **Patient:** My Profile, My Prescriptions, My Visits.
  - **Clinician:** Dashboard, New Visit, Analytics.
- Auth area on the right:
  - **Logged out:** Sign In button.
  - **Logged in:** Avatar (links to profile/dashboard), Sign Out button.
- Mobile: hamburger menu that opens a drawer sidebar.
- All labels use `useTranslation()` for i18n.
- ARIA: `<nav aria-label="Main navigation">`, links use `aria-current="page"` for active route.

### 7.4 Sidebar (Mobile Navigation)

- Slide-in drawer from the left, controlled by `uiStore.sidebarOpen`.
- Overlay backdrop with `onClick` to close.
- Contains all navigation links (same as Navbar center section).
- Close button with `aria-label="Close navigation"`.
- Focus trap: when open, tab cycles within the sidebar.

---

## 8. Shared Component Library

### 8.1 Component Index

| Component | File | Purpose |
|---|---|---|
| `Button` | `shared/Button.tsx` | Primary, secondary, ghost, danger variants |
| `Card` | `shared/Card.tsx` | Content container with optional header/footer |
| `Input` | `shared/Input.tsx` | Text input with label, error, icon support |
| `TextArea` | `shared/TextArea.tsx` | Multi-line input |
| `Select` | `shared/Select.tsx` | Dropdown select |
| `Badge` | `shared/Badge.tsx` | Status badges (safety, coverage, tier) |
| `LoadingSpinner` | `shared/LoadingSpinner.tsx` | Spinner with optional fullPage mode |
| `ErrorBanner` | `shared/ErrorBanner.tsx` | Dismissible error message |
| `ConfirmDialog` | `shared/ConfirmDialog.tsx` | Modal confirmation dialog |
| `ReminderModal` | `shared/ReminderModal.tsx` | Medication reminder time picker |
| `Avatar` | `shared/Avatar.tsx` | User avatar with fallback initial |
| `EmptyState` | `shared/EmptyState.tsx` | Placeholder for empty lists |

### 8.2 Button Specification

**Props:**


**Variant styles:**

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| `primary` | `accent-blue` | white | none | Darken 10%, glow-blue shadow |
| `secondary` | transparent | `accent-blue` | 1px `accent-blue` | `bg-accent-blue/10` |
| `ghost` | transparent | `text-secondary` | none | `bg-elevated` |
| `danger` | transparent | `accent-red` | 1px `accent-red` | `bg-accent-red/10` |

**Size styles:**

| Size | Padding | Font Size |
|---|---|---|
| `sm` | `py-1.5 px-3` | `text-sm` |
| `md` | `py-2.5 px-5` | `text-body` |
| `lg` | `py-3 px-6` | `text-body-lg` |

**Loading state:** Replace children with a spinner. Disable the button. Set `aria-busy="true"`.

**Accessibility:** All buttons must have visible text or `aria-label`. Disabled buttons use `aria-disabled="true"` and `opacity-50 cursor-not-allowed`.

### 8.3 Badge Specification

**Props:**


**Variant mapping:**

| Variant | Background | Text | Icon |
|---|---|---|---|
| `safety-pass` | `safety-pass/15` | `safety-pass` | ✓ checkmark |
| `safety-fail` | `safety-fail/15` | `safety-fail` | ✕ cross |
| `safety-warn` | `safety-warn/15` | `safety-warn` | ⚠ warning |
| `status-blocked` | `accent-red/15` | `accent-red` | 🚫 blocked |
| `status-approved` | `accent-green/15` | `accent-green` | ✓ check |
| `ai` | `accent-purple/15` | `accent-purple` | ✦ sparkle |

**The "Safety Passed" badge** referenced in the master build spec is `<Badge variant="safety-pass">Safety Passed</Badge>`. It opens a popover checklist on click showing all safety check details.

### 8.4 Card Specification

**Props:**


**Styles:**
- Base: `bg-bg-card rounded-xl border border-border-default shadow-card p-6`
- `hoverable`: adds `hover:shadow-card-hover hover:border-accent-blue/30 transition-all cursor-pointer`
- `selected`: `border-accent-blue shadow-glow-blue`
- `blocked`: `border-accent-red/50 opacity-75` with a red stripe on the left edge

### 8.5 ConfirmDialog Specification

**Props:**


**Behavior:**
- Renders a modal overlay with backdrop `bg-black/60`.
- Centers a `rounded-2xl` dialog card.
- Focus trap: Tab cycles within the dialog while open.
- `Escape` key closes the dialog (calls `onCancel`).
- Initial focus on the confirm button (or cancel for `danger` variant).
- ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title.
- Backdrop click calls `onCancel`.

---

## 9. Framer Motion Animation System

### 9.1 Shared Animation Variants

Define reusable variants in `utils/animations.ts`:


### 9.2 Reduced Motion Integration

Wrap variant usage to respect accessibility preferences:


### 9.3 Page Transition Wrapper

Every page component wraps its content in a motion container for consistent entrance animations:


### 9.4 Animation Usage Guidelines

| Context | Animation | Duration |
|---|---|---|
| Page entrance | `slideUp` | 0.4s |
| Card entrance (in list) | `staggerContainer` + `slideUp` children | 0.08s stagger |
| Modal open | `scaleIn` | 0.3s |
| Sidebar slide | `slideInRight` | 0.3s |
| Button hover | `y: -2` | 0.2s |
| Safety badge appear | `scaleIn` | 0.3s |
| Recommendation cards (three-lane) | `staggerContainer` + `slideUp` | 0.1s stagger |
| Error banner | `slideUp` | 0.3s |
| Toast/notification | Slide in from top-right, auto-dismiss after 5s | 0.3s in/out |

---

## 10. TypeScript Type Definitions

### 10.1 Core Models: `types/models.ts`


### 10.2 API Types: `types/api.ts`


### 10.3 Accessibility Types: `types/accessibility.ts`


---

## 11. Utility Functions

### 11.1 Formatters: `utils/formatters.ts`


### 11.2 Constants: `utils/constants.ts`


---

## 12. Part 3 Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | CSS custom properties switch correctly | Toggle `high-contrast` class on `<html>` → all colors update |
| 2 | Large type mode scales all text by 1.25x | Toggle `large-type` → headings and body text grow |
| 3 | Dyslexia font replaces body text | Toggle `dyslexia-font` → body text renders in OpenDyslexic |
| 4 | Skip link appears on Tab | Tab from address bar → "Skip to main content" link visible |
| 5 | Skip link jumps to `#main-content` | Activate skip link → focus moves to `<main>` |
| 6 | Language toggle switches all labels | Toggle to Spanish → Navbar, buttons, badges show Spanish text |
| 7 | `<html lang>` matches selected language | Inspect DOM after toggle → `lang="es"` |
| 8 | Accessibility toolbar persists across reload | Enable high contrast, reload page → high contrast still active |
| 9 | Protected routes redirect unauthenticated users | Navigate to `/clinician/dashboard` while logged out → redirect to `/login` |
| 10 | Protected routes enforce role | Patient navigates to `/clinician/dashboard` → redirect to `/patient/profile` |
| 11 | Zustand auth store persists session | Login, refresh page → still authenticated |
| 12 | API client attaches JWT | Inspect network tab → `Authorization: Bearer ...` on API calls |
| 13 | API client unwraps `ApiResponse` envelope | Successful call returns `data` directly, not the wrapper |
| 14 | 401 response triggers sign-out | Backend returns 401 → user redirected to login |
| 15 | Button loading state shows spinner | Set `loading={true}` on Button → spinner visible, button disabled |
| 16 | Badge renders correct color per variant | `safety-pass` → green; `safety-fail` → red; `safety-warn` → amber |
| 17 | ConfirmDialog traps focus | Open dialog → Tab cycles within dialog only |
| 18 | Reduced motion disables animations | Enable reduced motion → page transitions are instant |
| 19 | All form inputs have associated labels | Lighthouse accessibility audit → no "Form elements do not have associated labels" |
| 20 | ARIA live region announces status changes | Load recommendations → screen reader announces "Recommendations loaded" |

---

## Continues in Part 4

**Part 4 — Clinician Workflow: Live Cockpit, Visit Creation, and Prescription Recommendations** covers:
- Live Clinician Cockpit: three-panel layout (notes capture | structured extraction | live recommendations)
- Real-time immersion: allergy detection → instant BLOCKED update
- Drawing canvas + QR code sync via Supabase Realtime
- Three-Lane Review layout: Option A / B / C
- One-click approve with confirmation checkbox
- "Why this is safe" badge and safety checklist popup
- "Talk to the prescription" chat interface
