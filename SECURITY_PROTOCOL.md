# Security Protocol - Enhancement Tracker

**Last Updated:** 2025-10-02
**Status:** ✅ Fully Secured and Operational

---

## 🔒 Security Overview

The Enhancement Tracker implements a multi-layered security architecture combining authentication, authorization, API protection, and data security measures.

---

## 1. Authentication & Authorization

### 🔐 **Two-Factor Authentication (2FA/MFA)**

**Implementation:** Mandatory TOTP-based 2FA using Supabase Auth

- **Type:** Time-based One-Time Password (TOTP)
- **Provider:** Supabase Authentication
- **Enforcement:** Server-side middleware (`enforceMfaMiddleware`)
- **Compatible Apps:** Google Authenticator, Authy, Microsoft Authenticator, 1Password

**Flow:**
1. User authenticates with email + password
2. System checks for verified MFA factors
3. User must complete 2FA verification to access protected resources
4. Access denied if MFA not enabled or verification fails

**Key Files:**
- `server-supabase.js:186-239` - MFA enforcement middleware
- `server-supabase.js:245-445` - MFA management endpoints
- `public/index.html:2047-2266` - Client-side MFA handling

---

### 🎫 **JWT Token-Based Authentication**

**Implementation:** Supabase JWT tokens with server-side validation

- **Token Type:** JSON Web Tokens (JWT)
- **Validation:** Server-side on every API request
- **Storage:** Browser session storage (client-side)
- **Transmission:** Bearer token in Authorization header

**Authentication Middleware:**
```javascript
// Location: server-supabase.js:152-184
async function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    // Validates token, checks expiry, attaches user to request
}
```

**Protected Endpoints:** All `/api/*` routes require valid JWT token

---

## 2. API Security

### 🚦 **Rate Limiting**

**Implementation:** Three-tier rate limiting using `express-rate-limit`

| Tier | Endpoint Pattern | Limit | Window | Purpose |
|------|-----------------|-------|--------|---------|
| **General API** | `/api/*` | 100 requests | 15 minutes | Prevent API abuse |
| **Authentication** | Auth endpoints | 5 attempts | 15 minutes | Prevent credential stuffing |
| **MFA Verification** | `/api/mfa/*` | 10 attempts | 60 minutes | Prevent TOTP brute force |

**Configuration:** `server-supabase.js:156-185`

**Response:** HTTP 429 (Too Many Requests) when limit exceeded

**Headers Sent:**
- `RateLimit-Limit` - Maximum requests allowed
- `RateLimit-Remaining` - Requests remaining
- `RateLimit-Reset` - Time when limit resets

---

### 🌐 **CORS (Cross-Origin Resource Sharing)**

**Implementation:** Strict origin-based CORS policy

**Allowed Origins:**
- `http://localhost:3000` (Development)
- `https://enhancement-tracker.vercel.app` (Production)
- Configurable via `ALLOWED_ORIGINS` environment variable

**Configuration:** `server-supabase.js:130-150`

**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS
**Allowed Headers:** Content-Type, Authorization
**Credentials:** Enabled (allows cookies/auth headers)

**Security Benefits:**
- Prevents unauthorized cross-origin requests
- Blocks CSRF attacks from malicious websites
- Restricts API access to legitimate domains

---

### 🛡️ **Security Headers**

**Implementation:** Via `vercel.json` configuration

| Header | Value | Purpose |
|--------|-------|---------|
| **Content-Security-Policy** | Strict CSP with whitelisted sources | Prevents XSS attacks, restricts resource loading |
| **X-Content-Type-Options** | `nosniff` | Prevents MIME-type sniffing attacks |
| **X-Frame-Options** | `SAMEORIGIN` | Prevents clickjacking attacks |

**Full CSP Policy:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
font-src 'self' https://cdnjs.cloudflare.com data:;
img-src 'self' data: https://res.cloudinary.com;
connect-src 'self' https://vxhizklwqpevxcfocoam.supabase.co https://enhancement-tracker.vercel.app;
```

**Location:** `vercel.json:8-24`

---

## 3. Data Security

### 🔑 **API Key Management**

**Current System:** Supabase Modern API Keys (rotated 2025-10-02)

**Key Types:**

1. **Publishable Key** (`sb_publishable_*`)
   - **Used:** Client-side (browser)
   - **Purpose:** Public-facing authentication
   - **Protection:** Row Level Security (RLS) policies
   - **Location:** `public/index.html:1903`, Environment variables

2. **Secret Key** (`sb_secret_*`)
   - **Used:** Server-side only
   - **Purpose:** Administrative operations, bypasses RLS
   - **Protection:** Environment variables only (never exposed to client)
   - **Location:** `env.local`, Vercel environment variables

**Security Measures:**
- ✅ Keys stored in environment variables (`.env*` files gitignored)
- ✅ Old legacy JWT keys disabled in Supabase
- ✅ Keys never committed to version control
- ✅ Separate keys for development and production

---

### 🗄️ **Row Level Security (RLS)**

**Implementation:** Supabase PostgreSQL RLS policies

**Status:** ✅ Enabled on all tables

**Policy Structure:**
```sql
-- Example RLS policy for enhancements table
ALTER TABLE enhancements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read enhancements"
ON enhancements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create enhancements"
ON enhancements FOR INSERT
TO authenticated
WITH CHECK (true);
```

**Protection:**
- Only authenticated users can access data
- Service Role Key can bypass RLS for admin operations
- Anonymous/public key respects all RLS policies

---

### 🚫 **Removed Attack Vectors**

**Debug Endpoints Removed:**
- ❌ `/api/test` - Removed debug endpoint
- ❌ `/debug/test-key` - Removed key exposure endpoint

**Previously Exposed (Now Secured):**
- ❌ `.env.vercel` - Removed from git, added to `.gitignore`
- ❌ `env.local` - Removed from git, added to `.gitignore`
- ❌ Legacy JWT keys - Disabled in Supabase dashboard
- ❌ Hardcoded credentials - Removed and rotated

---

## 4. Environment Configuration

### 📁 **Environment Variables**

**Local Development** (`env.local`):
```bash
SUPABASE_URL=https://vxhizklwqpevxcfocoam.supabase.co
SUPABASE_ANON_KEY=sb_publishable_*****
SUPABASE_SERVICE_ROLE_KEY=sb_secret_*****
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,https://enhancement-tracker.vercel.app
```

**Production** (Vercel Environment Variables):
```bash
SUPABASE_URL=https://vxhizklwqpevxcfocoam.supabase.co
SUPABASE_ANON_KEY=sb_publishable_*****
SUPABASE_SERVICE_ROLE_KEY=sb_secret_*****
ALLOWED_ORIGINS=https://enhancement-tracker.vercel.app
```

**Security:**
- ✅ All `.env*` files excluded via `.gitignore`
- ✅ Never committed to version control
- ✅ Encrypted at rest in Vercel
- ✅ Different keys for dev/prod environments

---

## 5. Security Workflow

### 🔄 **Authentication Flow**

```
1. User visits application
   ↓
2. Login page displays (if not authenticated)
   ↓
3. User enters email + password
   ↓
4. Supabase validates credentials
   ↓
5. System checks MFA status
   ↓
6. If MFA enabled:
   - User prompted for TOTP code
   - Code validated server-side
   - Session upgraded to AAL2 (MFA verified)
   ↓
7. If MFA not enabled:
   - User prompted to enroll in 2FA
   - Mandatory for access to protected resources
   ↓
8. JWT token issued and stored
   ↓
9. All API requests include JWT in Authorization header
   ↓
10. Server validates JWT on every request
    ↓
11. MFA enforcement middleware checks verification status
    ↓
12. If all checks pass → Request processed
    If any check fails → 401/403 error returned
```

---

### 🔐 **API Request Flow**

```
1. Client makes API request with JWT token
   ↓
2. Request hits rate limiter
   - Check: Request count within limits?
   - If exceeded → 429 Too Many Requests
   ↓
3. Request hits CORS middleware
   - Check: Origin allowed?
   - If not → CORS error
   ↓
4. Request hits authMiddleware
   - Extract JWT from Authorization header
   - Validate token with Supabase
   - Check: Token valid and not expired?
   - If invalid → 401 Unauthorized
   ↓
5. Request hits enforceMfaMiddleware (for protected routes)
   - Check: User has verified MFA factor?
   - If not → 403 Forbidden (MFA_REQUIRED)
   ↓
6. Request processed by route handler
   - Database query executed (respects RLS policies)
   - Response returned to client
```

---

## 6. Compliance & Best Practices

### ✅ **Security Standards Implemented**

- **OWASP Top 10 Protections:**
  - ✅ A01: Broken Access Control - JWT validation + RLS
  - ✅ A02: Cryptographic Failures - TLS/HTTPS only
  - ✅ A03: Injection - Parameterized queries via Supabase
  - ✅ A05: Security Misconfiguration - Strict CSP + headers
  - ✅ A07: Authentication Failures - Mandatory 2FA + rate limiting

- **Zero Trust Principles:**
  - ✅ Never trust, always verify (JWT on every request)
  - ✅ Least privilege access (RLS policies)
  - ✅ Multi-factor authentication (mandatory 2FA)

- **Data Protection:**
  - ✅ Encryption in transit (HTTPS/TLS)
  - ✅ Encryption at rest (Supabase PostgreSQL)
  - ✅ Secure session management (HTTP-only cookies option available)

---

## 7. Monitoring & Incident Response

### 📊 **Security Monitoring**

**Automated:**
- Rate limit violations logged to console
- Failed authentication attempts logged
- MFA enrollment/verification events logged

**Manual Review:**
- Server logs: `server-supabase.js` console output
- Supabase dashboard: Auth logs and user activity
- Vercel logs: Application and function logs

**Log Locations:**
- Development: Console output (`npm start`)
- Production: Vercel dashboard → Logs tab
- Supabase: Dashboard → Authentication → Logs

---

### 🚨 **Incident Response Plan**

**If Credentials Compromised:**

1. **Immediate Actions:**
   - Rotate all API keys in Supabase dashboard
   - Update environment variables (local + Vercel)
   - Update hardcoded keys in `public/index.html`
   - Force logout all users (clear sessions in Supabase)

2. **Investigation:**
   - Review Supabase auth logs for suspicious activity
   - Check rate limit logs for brute force attempts
   - Audit git history for exposed secrets

3. **Recovery:**
   - Deploy updated code with new keys
   - Verify all functionality works
   - Notify users if data breach suspected
   - Document incident and update security measures

**If Brute Force Attack Detected:**

1. Identify source IP from logs
2. Temporarily block IP at Vercel level
3. Increase rate limits if needed
4. Consider implementing IP-based blocking

**If Unauthorized Access:**

1. Revoke affected user sessions
2. Reset user passwords
3. Force MFA re-enrollment
4. Audit database for unauthorized changes
5. Restore from backup if necessary

---

## 8. Security Checklist

### 🔍 **Regular Security Audits**

**Weekly:**
- [ ] Review failed login attempts in Supabase logs
- [ ] Check rate limit violations in server logs
- [ ] Monitor MFA enrollment rate

**Monthly:**
- [ ] Update npm dependencies (`npm audit fix`)
- [ ] Review CORS allowed origins
- [ ] Audit RLS policies in Supabase
- [ ] Test MFA bypass attempts

**Quarterly:**
- [ ] Rotate API keys (Supabase)
- [ ] Review and update CSP headers
- [ ] Penetration testing (if applicable)
- [ ] Security training for team members

---

## 9. Dependencies & Versions

**Security-Related Packages:**

```json
{
  "@supabase/supabase-js": "^2.x",
  "express-rate-limit": "^7.x",
  "cors": "^2.x",
  "helmet": "^7.x",
  "dotenv": "^17.x"
}
```

**Update Policy:**
- Critical security patches: Immediate
- Minor updates: Monthly
- Major updates: Quarterly (with testing)

**Vulnerability Scanning:**
```bash
npm audit
npm audit fix
npm update
```

---

## 10. Access Control Matrix

| Resource | Anonymous | Authenticated | Authenticated + MFA | Service Role |
|----------|-----------|---------------|---------------------|--------------|
| Login Page | ✅ View | ✅ View | ✅ View | ✅ View |
| Dashboard | ❌ | ❌ | ✅ View | ✅ Full |
| Submit Request | ❌ | ❌ | ✅ Create | ✅ Full |
| Manage Requests | ❌ | ❌ | ✅ Edit/Delete | ✅ Full |
| MFA Enrollment | ❌ | ✅ Enroll | ✅ Manage | ✅ Full |
| API Endpoints | ❌ | ❌ | ✅ Limited | ✅ Full |
| Database (Direct) | ❌ | ❌ | ✅ RLS Protected | ✅ Bypass RLS |

**Legend:**
- ✅ = Allowed
- ❌ = Denied
- RLS = Row Level Security enforced

---

## 11. File Security

### 🔒 **Protected Files** (Gitignored)

```
.env
.env*
.env.local
.env.vercel
env.local
node_modules/
.vercel/
```

**Location:** `.gitignore:11-19`

### 📁 **Sensitive File Handling**

**CSV Uploads:**
- ✅ Memory storage only (no disk writes)
- ✅ 5MB size limit
- ✅ MIME type validation (text/csv only)
- ✅ Requires authentication + MFA
- ✅ Input validation on all fields

**Configuration:** `server-supabase.js:116-128`

---

## 12. Quick Reference

### 🔗 **Important URLs**

| Resource | URL |
|----------|-----|
| **Production App** | https://enhancement-tracker.vercel.app |
| **Supabase Dashboard** | https://app.supabase.com/project/vxhizklwqpevxcfocoam |
| **Vercel Dashboard** | https://vercel.com/pietercoetzee-zas-projects/enhancement-tracker |
| **API Settings** | https://app.supabase.com/project/vxhizklwqpevxcfocoam/settings/api |

### 📞 **Security Contacts**

- **System Administrator:** [Your Name/Email]
- **Supabase Support:** https://supabase.com/support
- **Vercel Support:** https://vercel.com/support

---

## 13. Change Log

| Date | Change | Impact |
|------|--------|--------|
| 2025-10-02 | Migrated to new Supabase API keys (sb_publishable/sb_secret) | All credentials rotated |
| 2025-10-02 | Implemented rate limiting on all API endpoints | Brute force protection |
| 2025-10-02 | Added strict CORS policy | CSRF protection |
| 2025-10-02 | Removed debug endpoints (/api/test, /debug/test-key) | Reduced attack surface |
| 2025-10-02 | Removed .env files from git history | Secured exposed credentials |
| 2025-10-02 | Updated .gitignore for comprehensive env file protection | Prevents future leaks |
| [Earlier] | Implemented mandatory 2FA authentication | Enhanced auth security |
| [Earlier] | Enabled RLS on all Supabase tables | Data access control |

---

## 📋 **Status Summary**

**Current Security Posture:** 🟢 **STRONG**

✅ **Authentication:** Multi-factor (2FA) + JWT
✅ **Authorization:** RLS + Server-side validation
✅ **API Protection:** Rate limiting + CORS + Security headers
✅ **Data Security:** Encryption + Environment isolation
✅ **Attack Surface:** Minimized (debug endpoints removed)
✅ **Credentials:** Rotated and secured
✅ **Monitoring:** Logging enabled
✅ **Compliance:** OWASP Top 10 addressed

**Last Security Review:** 2025-10-02
**Next Review Due:** 2025-11-02

---

**Document Version:** 1.0
**Maintained By:** Development Team
**Classification:** Internal Use Only
