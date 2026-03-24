# CLAUDE.md

## Purpose

This file defines how Claude should collaborate on this repo: what it can do autonomously, what it must ask first, and the technical + design constraints it must follow.

Claude will mainly be used to build **front-end UI and client-side functionality**. Product decisions, complex business logic, and final integration decisions are primarily handled by me.

**Baseline expectation:** For every piece of code written — functions, components, hooks, services — apply software engineering best practices by default:
- Single responsibility: each function/component does one thing
- Meaningful names that reveal intent
- Small, focused functions (avoid long functions that do too much)
- Proper error handling at appropriate boundaries
- No dead code, no commented-out code, no unnecessary complexity
- Consistent with the patterns already used in the codebase

This applies to everything, not just when explicitly asked.

---

## Working agreements

### Autonomy
Claude **may**:
- Implement screens based on provided **Figma screenshots** and notes.
- Create/refactor reusable UI components (buttons, inputs, cards, lists, modals, etc.).
- Add client-side state management patterns (React hooks, context) when appropriate.
- Improve code quality: types, naming, structure, small refactors.
- Add/adjust navigation, form validation, loading/error states, and accessibility basics.
- Add new hooks or service methods following the existing patterns.

Claude **must ask before**:
- Adding **new production dependencies** (any new package in `dependencies`).
- Changing authentication flow, database schema assumptions, or any API contract with Supabase.
- Introducing a new global state library (Redux/Zustand/MobX, etc.) or large architectural change.
- Making opinionated UX changes that differ from Figma.
- Adding a new `lib/` service file for a domain that doesn't yet exist.

### Testing & verification
- **No test framework is currently configured.** Do not run `npm test` — it will fail.
- Always run `npx tsc` after modifying TypeScript files to check for type errors.
- Do not introduce a test framework without asking.

### Communication style
- Be direct and implementation-focused.
- When uncertain, choose the simplest consistent approach and explain the assumption.
- Provide code in complete, copy-pastable chunks.

---

## Project context

This project is a **Smart Personal Inventory & Moving Management Mobile App** (app name: **BoxIt**).

Core user journey:
1. User registers/logs in.
2. User creates a structured inventory by grouping items into **Locations** → **Rooms** → **Boxes**.
3. Each **Box** contains a list of **Items** and packing details (fragility, packing status).
4. AI-assisted item recognition: user takes a photo → the system suggests item names via an LLM/Vision model.
5. The app generates **QR codes** for each box. Scanning opens box contents instantly for fast unpacking.

Deep link formats used by QR codes:
- `client://box/{boxId}` (in-app)
- `https://boxit.app/box/{boxId}` (web fallback)

---

## Tech stack

- **React Native** + **TypeScript** (strict mode)
- **Expo** (SDK ~54) with **Expo Router** (file-based routing)
- Styling: **NativeWind v4** / **Tailwind CSS v3** (custom theme in `tailwind.config.js`)
- Backend: **Supabase** (Auth, DB with RLS, Storage)
- Icons: **Feather** via `@expo/vector-icons`
- Path alias: `@/*` maps to project root (e.g. `@/components/button`)

---

## Domain model

The core data hierarchy is:

```
Location  (e.g. "New Apartment", "Storage Unit")
  └── Room  (e.g. "Kitchen", "Garage")
        └── Box  (e.g. "Box #1", "Fragile Kitchen Items")
              └── Item  (e.g. "Plates", "Coffee maker")
```

- A **Location** is a physical place (origin or destination).
- A **Room** belongs to a Location and groups boxes by area.
- A **Box** belongs to a Room and has packing status, fragility (stored directly on the box, updated when items change), and a QR code.
- An **Item** belongs to a Box and has a name, quantity, and fragility flag.

Never invert or skip levels in this hierarchy.

---

## Architecture & data flow

```
Screen (app/**/*.tsx)
    ↓  calls
Custom Hook (hooks/use-*.ts)   ← manages loading/error/refresh state
    ↓  calls
Service (lib/*.service.ts)     ← all Supabase queries live here
    ↓
Supabase Client (lib/supabase.ts)
```

- **Screens** are thin — they call hooks and render UI.
- **Hooks** own local state (`isLoading`, `isRefreshing`, `errorMessage`, CRUD methods).
- **Services** handle all data access; they always call `getCurrentUserId()` first — every query must be user-scoped.
- **No direct Supabase calls in screens or components.**

### Pull-to-refresh pattern (required for all data screens)
Every data-driven screen must support pull-to-refresh using the hook's `isRefreshing` + `refresh` method:
```tsx
<FlatList
  data={items}
  refreshControl={
    <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
  }
  ...
/>
```

### Activity logging
Every user-initiated CRUD operation (create, update, delete, move, pack) must log an activity event via `activityService.writeActivity()`. Do not skip this — the activity feed depends on it.

### Navigation (Expo Router)
Use Expo Router APIs for all navigation — never use React Navigation directly:
```tsx
import { router, useLocalSearchParams } from 'expo-router';

router.push('/box/123');         // navigate forward
router.replace('/box/123');      // replace current screen
router.back();                   // go back

// In dynamic route screens (e.g. app/box/[id].tsx):
const { id } = useLocalSearchParams<{ id: string }>();
```

### `isLoading` vs `isRefreshing`
These are distinct states — do not conflate them:
- `isLoading` — true only on the **initial fetch** (no data yet). Show a spinner or skeleton.
- `isRefreshing` — true during **pull-to-refresh** (data already shown). Show `RefreshControl`.

### Modal / confirmation pattern
Use `AppModal` (`components/ui/app-modal.tsx`) for all modals and confirmation dialogs. Do not create new modal primitives.

### File naming
All new files must use **kebab-case**: `my-component.tsx`, `use-my-hook.ts`, `my-service.ts`.

### Check before creating hooks
Before writing a new hook, check `hooks/` — the following already exist:
- `useBoxes` — box list + CRUD
- `useRooms(locationId?)` — room list + CRUD
- `useLocations` — location list + CRUD
- `useActivityHistory(limit?)` — activity feed
- `useThemePreference` — theme context (system/light/dark)

---

## File structure

```
app/                  -> screens (Expo Router file-based routes)
  _layout.tsx         -> root layout (auth guard, theme provider)
  index.tsx           -> login
  register.tsx        -> registration
  forgotpass.tsx      -> forgot password
  reset-password.tsx  -> password reset
  (tabs)/             -> main tab navigator (Home, Inventory, Scan, Rooms, Activity)
  box/[id].tsx        -> box detail (dynamic route)
  room/[id].tsx       -> room detail (dynamic route)
  location/[id].tsx   -> location detail (dynamic route)
  profile.tsx         -> user profile / theme settings

components/
  ui/                 -> generic reusable components
  home/               -> home screen components
  inventory/          -> inventory screen components
  activity/           -> activity feed components
  button.tsx          -> Button (primary/secondary variants)
  form-input.tsx      -> FormInput (with icon support)
  app-header.tsx      -> AppHeader

hooks/                -> custom hooks (use-boxes, use-rooms, use-locations, use-activity-history, use-theme-preference)
lib/                  -> Supabase service layer (auth, box, room, location, item, activity services)
utils/                -> utilities (box-qr.ts, location-icon.ts)
constants/            -> design-tokens.json, theme.ts
```

---

## Existing components (use before creating new ones)

### Generic UI (`components/ui/`)
| Component | Purpose |
|-----------|---------|
| `TabScreenLayout` | Wrapper for tab screens (SafeAreaView + optional ScrollView + optional `refreshControl`) |
| `AppModal` | Modal/dialog |
| `EmptyStateCard` | Empty state fallback |
| `RetryErrorCard` | Error state with retry button |
| `SearchBar` | Search input |
| `MetaPill` | Small metadata badge |
| `MetricCard` | Metric/statistic display card |
| `CardGrid` | Grid layout wrapper |
| `FilterGroup` | Filter option container |

### Feature components
| Component | Path |
|-----------|------|
| `BoxCard` | `components/inventory/box-card.tsx` |
| `ItemRow` | `components/inventory/item-row.tsx` |
| `FilterChip` | `components/inventory/filter-chip.tsx` |
| `DashboardCard` | `components/home/dashboard-card.tsx` |
| `RoomCard` | `components/home/room-card.tsx` |
| `QuickActionCard` | `components/home/quick-action-card.tsx` |
| `SectionHeader` | `components/home/section-header.tsx` |
| `ActivityEventCard` | `components/activity/activity-event-card.tsx` |

---

## Design system & UI rules (strict)

### Theme consistency
- Always use the **existing Tailwind theme** from `tailwind.config.js` (backed by `constants/design-tokens.json`).
- Do **not** hardcode colors, spacing, or typography — use theme tokens/classes.
- Custom tokens available: `primary`, `crimson`, `emerald`, `bg-*`, `border-*`, `text-*`, `rounded-control`, `rounded-card`, `rounded-modal`, shadow utilities.

### Theme-aware components
- The app supports **system / light / dark** themes via `useThemePreference` context and `Colors` from `constants/theme.ts`.
- Any component that uses colors imperatively (e.g. icon tint, shadow color, conditional styles) must derive those values from `Colors` based on the resolved theme — never hardcode light-only or dark-only values.
- Use `useThemePreference()` to get `resolvedTheme` (`"light"` | `"dark"`) when needed inside a component.

### Layout & UX
- Wrap tab screens in `TabScreenLayout`.
- Include **loading**, **empty** (`EmptyStateCard`), and **error** (`RetryErrorCard`) states for all data-driven screens.
- Use safe areas properly; keep paddings consistent.
- Use `FlatList` for long lists.

### Icons
- Use **Feather** icons from `@expo/vector-icons`. Consistent size: 18–20px.
- Use theme-aware colors for icon tint.

---

## Screens implementation workflow (how to work with Figma)

When asked to build a screen, expect:
- A **screenshot** of the Figma design (or multiple states).
- Any notes about navigation and data.

Claude should:
1. Check `components/` for existing reusable pieces before creating new ones.
2. Implement layout first, then states (loading/empty/error), then data wiring.
3. Keep the screen lean — delegate UI to components.
4. Wire data through an existing or new hook following the established pattern.

---

## Database schema (Supabase — public schema)

All tables have RLS enabled. Every table has a `user_id uuid` column that must match `auth.users.id` — all queries are automatically user-scoped via RLS, but services also call `getCurrentUserId()` explicitly.

### `locations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users.id` |
| `name` | text | check: non-empty after trim |
| `kind` | enum `location_kind` | `start`, `destination`, `other` (default: `other`) |
| `cover_image_url` | text | nullable |
| `sort_order` | integer | default: 0 |
| `created_at` / `updated_at` | timestamptz | |

### `rooms`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `location_id` | uuid | FK → `locations.id` |
| `name` | text | |
| `cover_image_url` | text | nullable |
| `sort_order` | integer | default: 0 |
| `created_at` / `updated_at` | timestamptz | |

### `boxes`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `room_id` | uuid | FK → `rooms.id` |
| `name` | text | |
| `description` | text | nullable |
| `weight_kg` | numeric | nullable, check: >= 0 |
| `status` | enum `box_status` | `unpacked`, `packed` (default: `unpacked`) |
| `fragility` | enum `fragility_level` | `normal`, `fragile` (default: `normal`) |
| `qr_payload` | text | default: `''` |
| `photo_url` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

### `items`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `box_id` | uuid | nullable FK → `boxes.id` |
| `name` | text | |
| `notes` | text | nullable |
| `quantity` | integer | check: > 0, default: 1 |
| `is_fragile` | boolean | default: false |
| `photo_url` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

### `activity_log`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `type` | enum `activity_type` | see values below |
| `location_id` | uuid | nullable FK → `locations.id` |
| `room_id` | uuid | nullable FK → `rooms.id` |
| `box_id` | uuid | nullable FK → `boxes.id` |
| `item_id` | uuid | nullable FK → `items.id` |
| `meta` | jsonb | default: `{}` |
| `created_at` | timestamptz | |

`activity_type` enum values: `location_created`, `location_updated`, `location_deleted`, `box_created`, `box_updated`, `box_deleted`, `box_scanned`, `item_added`, `item_deleted`, `ai_scan_completed`, `Created`, `Updated`, `Moved`, `Deleted`, `Packed`

> Note: the enum has mixed casing (snake_case and PascalCase) — this is an existing inconsistency in the DB. Use the exact values already used in `activity.service.ts`; do not invent new ones.

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, FK → `auth.users.id` |
| `display_name` | text | nullable |
| `avatar_url` | text | nullable |
| `updated_at` | timestamptz | nullable |

### Key schema facts to remember
- `items.box_id` is **nullable** — an item can exist outside a box.
- `boxes.fragility` is stored directly on the box (not derived at query time). Update it when item fragility changes.
- `locations.kind` distinguishes origin (`start`), destination (`destination`), and generic (`other`) locations.
- Never invent column or table names — use exactly what's listed above.

---

## Data & Supabase integration constraints

- All Supabase access goes through `lib/*.service.ts` — never call Supabase directly from a screen or component.
- Env vars are `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — never hardcode or expose these.
- Prefer typed models (`BoxSummary`, `RoomDetails`, etc.) — check existing types in service files before defining new ones.
- When writing a new service method, use exact column names from the schema above — do not guess.

---

## Planned features (not yet built)

These are confirmed requirements. When implementing them, follow all existing patterns.

### 1. Box status — 4 stages instead of 2
The `box_status` enum needs to be extended from 2 to 4 values:
- `unpacked` — not yet packed
- `packed` — packed and ready
- `delivered` — physically moved to destination (was "pervezta")
- `unpacked_at_destination` — unpacked at the new location

> The DB enum must be updated before implementing this. Flag it when working on this feature.

### 2. Moving mode
- A **"Start Moving"** button is available somewhere in the app.
- It is only active when the user has **at least 2 locations**.
- With only 1 location, the app behaves as a simple inventory/list maker — no moving-related UI is shown.
- When moving mode is active, a **progress bar** appears on the home screen showing overall delivery progress.
- Moving mode affects QR scan behavior (see below).

### 3. QR scan — delivery confirmation modal
- The QR scanner tab stays in the bottom navigation.
- When a box QR code is scanned **during moving mode**, a modal appears asking: "Was this box delivered correctly?"
- Confirming changes the box status to `delivered`.
- Outside of moving mode, scanning a QR code just navigates to the box detail screen as before.

### 4. Fragile display
- Instead of showing a numeric count (e.g. "0 fragile"), show a label: **"Fragile"** or **"Not fragile"**.
- Already partially implemented — verify consistency across all screens.

### Not building
- Priority rooms — explicitly excluded from scope.

---

## AI / Vision item recognition constraints

- Treat AI recognition as **best-effort suggestions**, not authoritative truth.
- UI should support:
  - User edits/confirmation of suggested item name(s)
  - Retry / error handling
  - Clear indication that the name is AI-suggested

(Ask before locking in a specific provider or API shape.)

---

## Code quality standards

### TypeScript
- Avoid `any`. Use proper types/interfaces.
- Prefer explicit return types on exported functions/components where helpful.
- Keep props minimal and well-named.
- Use the `@/*` path alias for all local imports.

### React Native best practices
- Functional components + hooks only.
- Avoid deeply nested JSX in a single file; extract sub-components when it improves readability.
- Use `FlatList` for long lists.
- Avoid inline object/array creation in render hot paths.

---

## Dependency rules

- Do not add new production dependencies without confirmation.
- Prefer built-in RN/Expo APIs or packages already in `package.json`.
- Dev dependencies also require confirmation unless already present.

---

## Output expectations

When delivering changes:
- Summarize what was implemented.
- Mention any assumptions (data shape, navigation routes, component names).
- Provide any follow-up TODOs clearly.
- State whether `npx tsc` was run and the result.

---

## Hard rules

Never:
- Hardcode colors or spacing values
- Call Supabase directly from screens or components
- Create large monolithic screens
- Introduce new dependencies without approval
- Modify backend schema assumptions without asking
- Skip activity logging on user-initiated CRUD operations
- Write a service method without scoping it to the current user (`getCurrentUserId()`)

## Quick checklist (before handing off)

- [ ] Uses Tailwind theme tokens/classes (no hardcoded colors)
- [ ] Theme-aware: imperative colors use `Colors` from `constants/theme.ts`
- [ ] Existing components reused where applicable
- [ ] Existing hooks reused where applicable
- [ ] Loading + empty + error states included (if data-driven)
- [ ] Pull-to-refresh implemented (if data-driven)
- [ ] Activity logged for every user-initiated CRUD operation
- [ ] All service methods are user-scoped (`getCurrentUserId()`)
- [ ] Types are clean (no `any`, no type hacks)
- [ ] `npx tsc` passes
- [ ] No new prod dependencies added without asking
- [ ] Supabase access only through `lib/*.service.ts`
