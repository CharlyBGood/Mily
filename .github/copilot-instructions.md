# Copilot Instructions for Mily

## Project Overview
- **Frameworks:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend:** Supabase (auth, storage, database)
- **UI:** Custom components (Radix UI-based), centralized in `/components/ui/`
- **App Structure:**
  - `/app`: Next.js route segments (pages, layouts, loading, etc.)
  - `/components`: Reusable UI and feature components
  - `/lib`: Context providers, utilities, Supabase client
  - `/hooks`: Custom React hooks
  - `/public`: Static assets (SVGs, images)
  - `/styles`: Global CSS (Tailwind)

## Key Conventions
- **TypeScript:** All code is strictly typed. Use interfaces/types from `lib/types.ts` or `types/`.
- **Component Structure:**
  - Prefer functional components with hooks.
  - UI primitives (Button, Input, etc.) are in `components/ui/`.
  - Feature components (e.g., `meal-logger`, `meal-card`) are in `components/`.
  - Use context providers for auth, meal, and cycle state (see `lib/`).
- **Accessibility:**
  - All form fields must have `id`, `name`, and associated `<Label htmlFor=...>`.
  - Use semantic HTML and ARIA attributes as needed.
- **Styling:**
  - Use Tailwind CSS utility classes.
  - Avoid inline styles unless necessary.
- **Logo Usage:**
  - Use the `MilyLogo` component (`components/mily-logo.tsx`) for branding.
  - Place logo in the `HeaderBar` (`components/header-bar.tsx`), which should be included in all main views.
- **Auth Flow:**
  - Use `lib/auth-context.tsx` for authentication state.
  - Show loader when user state is loading; show welcome screen if no user.
- **Error Handling:**
  - Use `useToast` hook for user-facing errors.
  - Catch and log errors in async actions.
- **Testing:**
  - (If present) Place tests alongside components or in a `__tests__` folder.

## Workflow
- **Routing:**
  - Use Next.js App Router conventions (`/app/[route]/page.tsx`, `layout.tsx`, etc.).
  - Use `"use client"` for client components.
- **Data Fetching:**
  - Use Supabase client from `lib/supabase-client.ts`.
  - Use React Query or SWR if needed (not present by default).
- **State Management:**
  - Use React context for global state (auth, meal, cycle settings).
- **Forms:**
  - Use custom UI components for all form fields.
  - Ensure accessibility and validation.
- **Mobile:**
  - Use responsive Tailwind classes.
  - Use `use-mobile` hook for device detection if needed.

## Patterns to Follow
- **Centralize logic:** Use context and utility files for shared logic.
- **Reusability:** Build small, composable components.
- **Consistency:** Follow naming and file structure conventions.
- **Accessibility:** Always check for proper labeling and ARIA.

## Patterns to Avoid
- Duplicating logic across components.
- Using raw HTML elements for UI primitives (use `components/ui/`).
- Hardcoding styles or breaking Tailwind conventions.
- Skipping accessibility requirements.

## AI Agent Guidance
- **When adding new features:**
  - Place new pages in `/app/[feature]/page.tsx`.
  - Place new components in `/components/` or `/components/ui/` as appropriate.
  - Use context for shared state.
  - Ensure all forms are accessible.
- **When fixing bugs:**
  - Trace logic through context and hooks.
  - Use `useToast` for user feedback.
- **When refactoring:**
  - Centralize repeated logic.
  - Update all usages of changed components (e.g., `MilyLogo` in all headers).

## References
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

*Update this file as project conventions evolve. For questions, check `/lib/`, `/components/`, and `/app/` for examples.*
