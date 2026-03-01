# ~/.codex/AGENTS.md

## Purpose

This file defines how Codex should collaborate on this repo: what it can do autonomously, what it must ask first, and the technical + design constraints it must follow.

Codex will mainly be used to build **front-end UI and client-side functionality**. Product decisions, complex business logic, and final integration decisions are primarily handled by me.

---

## Working agreements

### Autonomy
Codex **may**:
- Implement screens based on provided **Figma screenshots** and notes.
- Create/refactor reusable UI components (buttons, inputs, cards, lists, modals, etc.).
- Add client-side state management patterns (React hooks, context, simple stores) when appropriate.
- Improve code quality: types, naming, structure, small refactors.
- Add/adjust navigation, form validation, loading/error states, and accessibility basics.

Codex **must ask before**:
- Adding **new production dependencies** (any new package in `dependencies`).
- Changing authentication flow, database schema assumptions, or any API contract with Supabase/Node backend.
- Introducing a new global state library (Redux/Zustand/MobX, etc.) or large architectural change.
- Making opinionated UX changes that differ from Figma.

### Testing & verification
- Always run `npm test` and 'npx tsc' after modifying JavaScript/TypeScript files **if tests exist and are runnable locally**.
- If the environment doesn’t allow running tests, state clearly what would be run and why.
- Prefer adding small, focused tests only when it’s already part of the repo’s pattern (don’t introduce a new test framework without asking).

### Communication style
- Be direct and implementation-focused.
- When uncertain, choose the simplest consistent approach and explain the assumption.
- Provide code in complete, copy-pastable chunks.

---

## Project context

This project is a **Smart Personal Inventory & Moving Management Mobile App**.

Core user journey:
1. User registers/logs in.
2. User creates a structured inventory by grouping items into **Locations** (Kitchen, Garage, etc.) and **Boxes**.
3. Each **Box** contains a list of **Items** and packing details (e.g., weight, fragility, packing status).
4. AI-assisted item recognition: user takes a photo → the system suggests item names via an LLM/Vision model.
5. The app generates **QR codes** for each box. Scanning a label opens box contents instantly for fast unpacking.

---

## Tech stack

- **React Native** + **TypeScript**
- Styling: **Tailwind / NativeWind** (project uses `tailwind.config.js` custom theme)
- Backend services: **Supabase** (Auth, DB, Storage)
- Optional backend: **Node.js** (only if needed for server-side logic / integrations)

---

## Design system & UI rules (strict)

### Theme consistency
- Always use the **existing Tailwind theme** from `tailwind.config.js`.
- Do **not** hardcode colors, spacing, or typography if theme tokens/classes exist.
- Keep styling consistent across screens (backgrounds, surfaces, text contrast, corner radius, shadows).

### Component-driven UI
- Prefer reusable components over repeating UI:
  - `Button`, `IconButton`
  - `TextField`, `PasswordField`, `SearchField`
  - `Card`, `ListItem`, `EmptyState`
  - `ModalSheet`, `ConfirmDialog`
  - `Badge/Chip`, `Tag`
- Keep components accessible (touch targets, readable font sizes, proper labels).

### Layout & UX
- Use safe areas properly and consistent paddings.
- Include loading, empty, and error states for data-driven screens.
- Keep interactions smooth: avoid unnecessary re-renders, use `useMemo/useCallback` where it matters.

---

## Screens implementation workflow (how to work with Figma)

When asked to build a screen, expect:
- A **screenshot** of the Figma design (or multiple states).
- Any notes about navigation and data.

Codex should:
1. Identify the reusable components needed.
2. Implement layout first, then states (loading/empty/error), then wiring.
3. Keep the screen component lean; move UI pieces to components when repeated.
4. Add obvious interactions if applicable

---

## Data & Supabase integration constraints

- Authentication, DB reads/writes, and Storage interactions should use the existing Supabase client setup.
- Avoid embedding secrets in the app.
- Prefer typed data models and mapping layers (DTO → UI model) when complexity grows.
- When you need to assume a table/field name, **flag it as an assumption** and keep it easy to change.

---

## AI / Vision item recognition constraints

- Treat AI recognition as **best-effort suggestions**, not authoritative truth.
- UI should support:
  - User edits/confirmation of suggested item name(s)
  - Retry / error handling
  - Clear indication that the name is AI-suggested

(Implementation details for the AI call may vary; ask before locking in a specific provider/API shape.)

---

## Code quality standards

### Follow these practices:

• Clean folder structure  
• Clear variable and function naming  
• Reusable UI components  
• Minimal code duplication  

Prefer simple and readable solutions.

### TypeScript
- Avoid `any`. Use proper types/interfaces.
- Prefer explicit return types on exported functions/components where helpful.
- Keep props minimal and well-named.

### React Native best practices
- Prefer functional components + hooks.
- Avoid deeply nested components in a single file; split when it improves readability.
- Use `FlatList` for long lists.
- Avoid inline object/array creation in render hot paths when it matters.

### File structure (guideline)

Use the existing project structure:

client/app/*        -> screens (Expo Router)
client/components/* -> reusable UI components
client/hooks/*      -> custom hooks
client/utils/*      -> utilities
client/constants/*  -> constants/config

## Dependency rules

- Do not add new production dependencies without confirmation.
- Prefer built-in RN APIs or existing dependencies already in the project.
- Dev dependencies (lint/test tooling) also require confirmation unless already present and being configured.

---

## Output expectations for Codex

When delivering changes:
- Summarize what was implemented.
- Mention any assumptions (data shape, navigation routes, component names).
- Provide any follow-up TODOs clearly.
- If tests were run, show the command and result. If not possible, state what should be run.

---

## Hard rules

Never:
- Hardcode colors
- Create large monolithic screens
- Introduce new dependencies without approval
- Modify backend schema assumptions

## Quick checklist (before handing off)

- [ ] Uses Tailwind theme tokens/classes (no random colors)
- [ ] Reusable components extracted where appropriate
- [ ] Loading + empty + error states included (if data-driven)
- [ ] Types are clean (no `any`, no type hacks)
- [ ] `npm test` and 'npx tsc' run (or stated why not)
- [ ] No new prod dependencies added without asking