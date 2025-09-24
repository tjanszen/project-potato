# Implementation Plan — Leagues Page Tabs (FF_POTATO_LEAGUES_TABS)

## Overview
We are updating the Leagues page to support a tabbed interface with three sections: **Active**, **List**, and **Clubs**.  
The feature will be gated behind a new feature flag: **FF_POTATO_LEAGUES_TABS**.  

This ensures safe rollout and maintains backward compatibility with the existing Leagues placeholder page.

---

## Feature Flag

- **Name:** ff.potato.leagues_tabs  
- **Env Var:** FF_POTATO_LEAGUES_TABS  
- **Default:** false  
- **Description:** "Enables tabbed interface (Active, List, Clubs) for Leagues page"  

### Backward Compatibility Matrix

| FF_POTATO_LEAGUES_PLACEHOLDER | FF_POTATO_LEAGUES_TABS | Behavior |
|-------------------------------|-------------------------|----------|
| false                         | any                     | Page hidden (null) |
| true                          | false                   | Current LeagueCard grid |
| true                          | true                    | Tabbed interface (Active/List/Clubs) |

---

## Spike Analysis (Reference)

### Current LeaguesPage.tsx Structure Analysis
- **Feature Flag Integration:** Single `FF_POTATO_LEAGUES_PLACEHOLDER` flag controls entire page visibility  
- **Layout Structure:** Clean separation with header (H1) and scrollable container  
- **Responsive Design:** CSS Grid with window resize handling (1/2/3 columns based on viewport)  
- **Component Architecture:** Uses reusable `LeagueCard` component with hardcoded data array  
- **Styling Approach:** Inline styles with responsive calculations  

**Key Layout Components**
    <div> // Page Structure
      <div> // Page container (min-height: 100vh, padding, background)
        <div> // Header container (centered H1)
        <div role="list"> // Scrollable grid container (CSS Grid, responsive columns)
          {leagueCards.map()} // 6 LeagueCard components

### Mobile Styling Patterns Analysis
- **BottomNav.css Patterns (Reusable for Tabs):**
  - Mobile-first design: `@media (max-width: 480px)`  
  - Equal distribution: `grid-template-columns: repeat(3, 1fr)`  
  - Active state: Blue color (#007bff) with light background (#e7f3ff)  
  - Touch targets: Minimum 44px height/width  
  - Responsive padding: Adjusts spacing for fixed navigation  

- **No Existing Tab Patterns:**  
  - No tabbed interfaces found in codebase  
  - Focus management exists in `DayDrawer.tsx` but not applicable to tabs  
  - Will need custom implementation modeled after BottomNav  

### Routing Approach Recommendation
- ✅ **Local State Approach (Recommended):**
  - Simpler than nested routes in current `wouter` setup
  - Tabs are UI state, not separate navigation pages
  - Fast tab switching with no component remounts
  - Example:
        const [activeTab, setActiveTab] = useState('list') // 'active', 'list', 'clubs'

- ❌ **Nested Routes Approach (Not Recommended):**
  - Adds unnecessary routing complexity
  - Full page re-renders on tab switch
  - URL management overhead
  - Breaks existing clean route structure

### Feature Flag Interaction Strategy
- **Two-Flag System (Both Required):**
  - `FF_POTATO_LEAGUES_PLACEHOLDER=true` → controls page visibility  
  - `FF_POTATO_LEAGUES_TABS=true` → controls tabbed interface within page  

---

## Implementation Plan

### Phase 1: Feature Flag Infrastructure

**Deliverables**
- Add `ff.potato.leagues_tabs` to `server/feature-flags.js`
- Add environment variable support `FF_POTATO_LEAGUES_TABS`
- Add frontend query for `ff.potato.leagues_tabs` in `LeaguesPage.tsx`
- Verify toggle behavior via `/api/admin/toggle-flag/ff.potato.leagues_tabs`

**Time Estimate:** 2 hours

---

### Phase 2: Tab Bar UI

**Deliverables**
- Create TabBar component with 3 tabs: Active, List, Clubs
- Manage tab selection via `useState` (`'active' | 'list' | 'clubs'`)
- Style tabs similar to BottomNav patterns (mobile-first, 44px touch targets)
- Add active state styling (blue highlight)

**Key Features**
- Horizontal tab layout
- Default selection: List
- Touch-friendly for mobile web

**Time Estimate:** 3–4 hours

---

### Phase 3: Content Integration

**Deliverables**
- Move existing LeagueCard grid into the **List** tab
- Add placeholder containers for **Active** and **Clubs**
- Ensure scrollable container works correctly inside tab content
- Adjust container height to account for tab bar

**Time Estimate:** 2–3 hours

---

### Phase 4: Responsive Testing & Polish

**Deliverables**
- Validate on mobile web (≤480px)
- Confirm tab switching updates content instantly
- Ensure tab bar and BottomNav do not overlap
- Verify scroll behavior works correctly on List tab

**Time Estimate:** 2–3 hours

---

## Risks & Mitigation

- **Container Height Calculations**  
  Risk: Tab bar reduces available space for scrollable content  
  Mitigation: Update `maxHeight: calc(100vh - 140px - [tab-height])`

- **Responsive Tab Design**  
  Risk: Tab labels may truncate on small screens  
  Mitigation: Test with longer names; shorten if needed

- **State Management Complexity**  
  Risk: Tab state management could complicate page  
  Mitigation: Keep tab logic isolated in TabBar + TabContent components  

---

## Recommended Component Structure

    <div> // Page container (existing)
      <div> // Header (existing)
      {leaguesTabsFlag?.enabled ? (
        <>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          <TabContent activeTab={activeTab} />
        </>
      ) : (
        <div role="list"> // Current LeagueCard grid (existing)
      )}

---

## Styling Strategy

- Reuse BottomNav CSS patterns for consistency  
- Inline styles for tab bar responsiveness  
- CSS Grid for LeagueCard layout within List tab
