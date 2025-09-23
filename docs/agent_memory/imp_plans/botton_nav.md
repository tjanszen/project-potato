# Implementation Plan — Sticky Bottom Navigation (FF_POTATO_BOTTOM_NAV)

## Feature Overview
Introduce a **sticky bottom navigation bar** that appears only on **mobile web** (≤480px).  
The bar contains three options:  
- **Home** (house icon) → active on load, routes to `/`  
- **Leagues** (sword icon) → placeholder (no routing yet)  
- **Settings** (gear icon) → placeholder (no routing yet)  

This feature is controlled by the feature flag `FF_POTATO_BOTTOM_NAV` (default=false).

---

## Files and Components Identified
- **Backend**
  - `server/feature-flags.js` → add registry key `ff.potato.bottom_nav`
- **Frontend**
  - `client/src/components/BottomNav.tsx` → new component
  - `client/src/components/BottomNav.css` → new stylesheet
  - `client/src/App.tsx` → inject component globally
- **Dependencies**
  - ✅ `lucide-react` → icons (Home, Sword, Settings)  
  - ✅ `wouter` → lightweight routing  
  - ✅ `@tanstack/react-query` → feature flag fetch

---

## Current Layout & Breakpoints
- **Mobile detection:** existing media queries use `max-width: 768px` and `max-width: 480px`.  
- **Recommendation:** restrict bottom nav to `max-width: 480px` for mobile-only behavior.  

---

## Proposed UI & Behavior
- **Sticky positioning**: fixed bottom, full width, with white background + border top.  
- **Grid layout**: 3 equal-width buttons (CSS grid).  
- **Active state**: Home highlighted on load (`aria-current="page"`).  
- **Touch target size**: each button ≥44px height/width.  
- **Accessibility**: buttons have `aria-label` for screen readers.  

---

## 4-Phase Implementation Plan

### Phase 1: Feature Flag + Placeholder Component
- Add backend registry entry:
    ```
    'ff.potato.bottom_nav': {
        name: 'ff.potato.bottom_nav',
        enabled: false,
        description: 'Mobile-only sticky bottom navigation bar'
    }
    ```
- Add environment variable hydration:
    ```
    FF_POTATO_BOTTOM_NAV
    ```
- Create `BottomNav.tsx` with placeholder `<div>Mobile Bottom Nav Placeholder</div>`  
- Inject in `App.tsx` after `<AppRoutes />`  
- Gate rendering behind `FF_POTATO_BOTTOM_NAV`

---

### Phase 2: Layout Integration (Mobile-Only Sticky Footer)
- Add `BottomNav.css`:
    ```
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: white;
      border-top: 1px solid #e9ecef;
      padding: 12px 0;
      z-index: 1000;
      display: none; /* hidden by default */
    }

    @media (max-width: 480px) {
      .bottom-nav {
        display: block;
      }
    }

    .nav-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      max-width: 480px;
      margin: 0 auto;
    }
    ```
- Add bottom padding in `App.tsx` to prevent overlap with sticky nav.  
- Validate visibility: only on mobile widths (≤480px).  

---

### Phase 3: Active State + Routing
- Define nav items:
    - Home → `/`
    - Leagues → `/leagues` (placeholder, no routing yet)
    - Settings → `/settings` (placeholder, no routing yet)
- Use `useLocation` from `wouter` to track active route.  
- Add active state styles:
    ```
    .nav-button.active {
      background-color: #007bff;
      color: white;
      border-radius: 20px;
    }
    ```
- Accessibility:
  - Add `aria-current="page"` to active button  
  - Add `aria-label="Home" | "Leagues" | "Settings"`  

---

### Phase 4: Validation + Cross-Device Testing
- **Flag Off:** footer completely hidden.  
- **Flag On:** footer visible only on ≤480px.  
- **Responsive matrix:**
  - ✅ Mobile (≤480px): visible and functional  
  - ✅ Tablet (481px–768px): hidden  
  - ✅ Desktop (>768px): hidden  
- Validate:
  - Sticky positioning across mobile browsers  
  - No content overlap with main page  
  - Minimum touch target size  
  - Screen reader accessibility  

---
# Addendum Phase — Auth-Aware Rendering for Bottom Navigation

## Problem
Currently, the BottomNav component is rendered whenever:
- Feature flag FF_POTATO_BOTTOM_NAV = true
- Viewport ≤480px

It does not consider authentication state or route, so it appears:
- On unauthenticated "/" (Authentication Required page)
- On "/auth" (Sign In / Sign Up page)

## Requirement
The BottomNav should only render when:
- User is authenticated
- AND the current route is an "in-app" route (not /auth, not unauthenticated home)

## Implementation Plan
### Step 1: Add Auth State Check
- Use existing auth context/hook (e.g., useAuth or similar) to check if user is authenticated
- If user is not authenticated → return null immediately

### Step 2: Add Route Guard
- Use useLocation (wouter) to check current path
- If path starts with `/auth` → return null
- If path is `/` but user is not authenticated (shows Authentication Required) → return null

### Step 3: Conditional Render Update
Update BottomNav.tsx:

    if (!bottomNavFlag?.enabled) return null
    if (!auth.user) return null
    if (location.startsWith('/auth')) return null
    if (location === '/' && !auth.user) return null

### Step 4: Validation
- ✅ With FF_POTATO_BOTTOM_NAV=false → footer hidden everywhere
- ✅ With FF_POTATO_BOTTOM_NAV=true:
  - /auth/* (sign in/up) → footer hidden
  - / (unauthenticated) → footer hidden
  - / (authenticated) → footer visible
  - /leagues (placeholder) → footer visible
  - /settings (placeholder) → footer visible
- ✅ Responsive behavior preserved (≤480px only)
- ✅ Authenticated in-app pages show footer as expected

## Risk
- Low: Limited to conditional rendering logic
- Medium: Ensure auth state is reliably available at render time

## Proof
- Console logs:
  - "BottomNav hidden: unauthenticated"
  - "BottomNav hidden: /auth route"
  - "BottomNav rendered: authenticated in-app route"
___

## Risk Assessment
- ✅ **Low Risk**: Isolated component, feature-flag gated.  
- ⚠️ **Medium Risk**: Possible content overlap; mitigated by bottom padding in `App.tsx`.  
- 🛡️ **Mitigation**: Cross-device validation + accessibility testing.  

---

## Implementation Ready
With `FF_POTATO_BOTTOM_NAV` in place, this phased approach allows safe, incremental rollout of the mobile-only sticky footer.  
Default state = **off**, ensuring no impact until explicitly enabled.  
