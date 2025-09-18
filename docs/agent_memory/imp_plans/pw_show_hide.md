# 🔄 Implementation Plan: Show/Hide Password Toggle

## 📋 Phase Structure Overview
We’ll add an eye-icon toggle to the password inputs in both the Sign In and Sign Up forms, but start with an investigation spike before implementation.

- **Phase A**: Spike / Investigation  
- **Phase B**: Prototype toggle in Sign In form  
- **Phase C**: Extend toggle to Sign Up form  
- **Phase D**: Polish UI and finalize  

---

## 🎯 Phase A: Spike / Investigation
**Goal:** Understand how the Sign In and Sign Up components render password inputs today.

**Do:**
- Identify file locations for Sign In and Sign Up components.  
- Confirm which UI library (plain HTML, shadcn/ui, or custom input components) is used.  
- Document how the `password` `<input>` is currently structured (type, props, styling).  

**Proof:**
- Logs or console output showing component file paths.  
- Annotated code snippet confirming how the password input is defined in each form.  

**Rollback:** None (read-only investigation).  

---

## 🎯 Phase B: Prototype in Sign In Form
**Goal:** Add a working show/hide toggle to the Sign In form only.

**Do:**
- Add a right-aligned eye icon inside the password input.  
- Default = `type="password"`.  
- Toggle to `type="text"` when clicked, swap between Eye and EyeOff icons.  
- Ensure value persistence (text doesn’t clear on toggle).  

**Proof:**
- In Preview: enter password → click eye icon → text becomes visible.  
- Click again → hides again.  
- Form submission still works.  

**Rollback:** Remove toggle code from Sign In form.  

---

## 🎯 Phase C: Extend to Sign Up Form
**Goal:** Apply the same toggle behavior to the Sign Up form’s password field(s).

**Do:**
- Reuse Sign In toggle logic in Sign Up form.  
- Ensure consistency (same icon, same placement, same behavior).  

**Proof:**
- Repeat Phase B verification on Sign Up form.  

**Rollback:** Remove toggle from Sign Up form.  

---

## 🎯 Phase D: UI Polish
**Goal:** Ensure consistent UI/UX and integration with design system.

**Do:**
- Confirm icons use `lucide-react` (Eye, EyeOff).  
- Ensure spacing, alignment, and accessibility (aria-labels for button).  
- Check both light/dark mode behavior (if relevant).  

**Proof:**
- Both forms look clean and toggle works with proper icons.  
- Accessibility checks pass (icon buttons are labeled).  

**Rollback:** Use simpler raw button icons if shadcn/lucide integration causes issues.  

---

## 🚀 Implementation Sequence Summary
1. **Phase A**: Spike to confirm input structure (no changes).  
2. **Phase B**: Prototype in Sign In.  
3. **Phase C**: Extend to Sign Up.  
4. **Phase D**: Polish UI and finalize.  

Each step is incremental, reversible, and verifiable.
