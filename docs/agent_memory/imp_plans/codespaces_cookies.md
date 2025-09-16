# Plan: Debug `/api/me` and Session Store Strategy

## 🔎 Phase 1 — Debug Session Resolution
**Goal:** Determine if `/api/me` failure is caused by cookie not being sent vs. session not being found.  

**Do:**
1. Add logging in `/api/me`:  
   - `req.headers.cookie`  
   - `req.sessionID`  
   - `req.session` contents (userId, etc.).  
2. Reproduce flow: signup → `/api/me`.  
3. Capture evidence:  
   - Browser DevTools → Request Headers (`Cookie`).  
   - Backend logs for `/api/me`.  

**Proof:**  
- Logs must show `req.headers.cookie` populated.  
- If cookie present but `req.session` empty → store problem.  
- If cookie absent → frontend fetch / credentials issue.  

**Blast radius:** Read-only debug, no risk.  

---

## 🔎 Phase 1B — Frontend Cookie / Fetch Debug
**Goal:** Confirm the frontend is sending the cookie with `/api/me` requests.  

**Do:**
1. Open **Browser DevTools → Network tab**.  
2. Trigger a frontend action that calls `/api/me` (e.g. signup redirect).  
3. Inspect the `/api/me` request:  
   - Check **Request Headers** → does it include `Cookie: connect.sid=...`?  
   - Check **Response** → is it 200 or 401?  
4. Review frontend code (`client/src/lib/api.ts`):  
   - Ensure all fetch calls (especially `/api/me`) include `credentials: 'include'`.  

**Proof:**  
- `/api/me` request in DevTools must show a `Cookie` header.  
- If missing → frontend not configured to include cookies.  
- If present but backend 401s → session store issue (Phase 2).  

**Blast radius:** No code changes yet, pure inspection.  

---
# Phase 1C — Frontend Integration Audit

**Goal:** Confirm the frontend is consistently using `ApiClient` and that the browser is storing the session cookie after signup/login.

---

## 🔎 Step 1 — Audit Frontend Usage
1. Search the frontend code (e.g. `client/src/components`, `client/src/pages`) for any direct calls to `fetch(`.  
   - If found, verify those calls include `credentials: 'include'`.  
   - If not, replace them with `apiClient.*` methods.  

2. Confirm that authentication flows (`SignupForm.tsx`, `LoginForm.tsx`, `AuthPage.tsx`, etc.) use:  
   - `apiClient.signup()`  
   - `apiClient.login()`  
   - `apiClient.getProfile()`  

⚠️ If any code bypasses `ApiClient`, cookies will not be included.

---

## 🔎 Step 2 — Confirm Cookie Storage in Browser
1. Open your frontend app in the browser:  
   https://upgraded-broccoli-rwrgrgqr6g2xxg9-5173.app.github.dev  

2. Sign up or log in with a test account.  

3. Open Chrome DevTools → **Application tab**.  
   - In the left sidebar, expand **Storage → Cookies**.  
   - Select:  
     https://upgraded-broccoli-rwrgrgqr6g2xxg9-3000.app.github.dev  

4. Look for a cookie named **`connect.sid`** in the list.  

✅ If `connect.sid` is present → the browser stored your session cookie.  
❌ If `connect.sid` is missing → cookie was not set (likely SameSite/domain config issue).

---

## 🔎 Step 3 — Re-test `/api/me`
1. With a stored cookie, reload the frontend app.  
2. Open **DevTools → Network tab**.  
3. Trigger a request to `/api/me` (this usually happens automatically on page load).  
4. Inspect the request → under **Request Headers**, confirm there is a line like:  


## 🗂️ Phase 2 — Decide Session Store Strategy
**Branching decision based on Phase 1/1B evidence:**  

- **Case A: Cookie missing**  
  → Fix frontend fetch config (double-check `credentials: 'include'`, Codespaces proxy quirks).  
  → Stay with in-memory store (low complexity).  

- **Case B: Cookie present, session missing**  
  → Switch to persistent store.  
  - **Option 1: Postgres (Neon)** → Simple, no extra service, but heavier writes.  
  - **Option 2: Redis (Upstash/Redis Cloud)** → Optimized for sessions, but new dependency.  
  - **Option 3: Stay ephemeral** → Accept sessions reset on restarts (only okay for dev).  

**Proof for store switch:**  
- After persistent store added, `/api/me` returns `{ userId: <id> }` consistently after signup.  
- Restart Codespaces → sessions persist across requests.  

**Blast radius:** Moderate — changes auth/session backbone. Gated behind feature flag `FF_SESSION_STORE_PERSISTENT=off` by default.  

---

## ✅ Readiness Check
- **Inputs ready?** `/api/me` route exists, can add logs.  
- **Flag named?** `FF_SESSION_STORE_PERSISTENT` if we go persistent.  
- **Evidence defined?** Headers + logs + curl proof + DevTools network capture.  
