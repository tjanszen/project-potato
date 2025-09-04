# v1 Fast Follows

## Authentication Fast Follows

### 1. Session Expiration Policy
- **Goal**: Clarify and standardize default session lifetime
- **Enhancement**: Add optional "Remember me" longer sessions
- **Priority**: Medium - improves user experience

### 2. Logout Endpoint  
- **Goal**: Add `/api/auth/logout` to destroy sessions
- **Benefit**: Prevents abandoned or stolen sessions from lingering
- **Priority**: High - security essential

### 3. Password Reset / Recovery
- **Goal**: Implement "Forgot Password" flow using email tokens or admin reset
- **Benefit**: Critical for real-world use
- **Priority**: High - user support requirement

### 4. Rate Limiting / Brute Force Protection
- **Goal**: Add middleware to limit repeated login attempts  
- **Enhancement**: Optionally lock accounts temporarily after too many failed attempts
- **Priority**: High - security hardening

### 5. Session Store Backend
- **Goal**: Move from in-memory store → Redis or PostgreSQL session store
- **Benefit**: Ensures persistence across restarts, scales for production
- **Priority**: Medium - production scaling requirement

### 6. Email Verification
- **Goal**: Add email confirmation step before granting full access
- **Benefit**: Prevents fake accounts and ensures communication channel
- **Priority**: Medium - data quality improvement

---

## Rate Limiting Fast Follows

### 7. Adjust Rate Limiting for Dev/Testing vs. Production
- **Goal**: Adjust rate limiting for dev/testing vs. production (loosen limits for smoother testing, tighten back down before real users).
- **Benefit**: Smoother development experience while maintaining production security
- **Priority**: Medium - development workflow improvement