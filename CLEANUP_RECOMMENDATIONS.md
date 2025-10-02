# Codebase Cleanup Recommendations

**Date:** 2025-10-02
**Analysis:** Unused and legacy files identified

---

## 🗑️ Safe to Remove - High Confidence

### **1. Legacy Server File**
```
✅ server.js (11.7 KB)
```
**Reason:**
- Old SQLite-based server (deprecated)
- Current system uses `server-supabase.js` (Supabase/PostgreSQL)
- `package.json` main entry is listed as `server.js` but scripts use `server-supabase.js`
- No active imports or requires found

**Impact:** None - completely replaced by `server-supabase.js`

---

### **2. Test Files**
```
✅ test-submission.js (3.1 KB)
✅ test-supabase.js (1.5 KB)
✅ test-db-constraints.js (3.6 KB)
```
**Reason:**
- Development/debugging scripts with no production usage
- Not referenced in package.json scripts
- Not imported by any active code
- Functionality now covered by production code

**Impact:** None - purely development utilities

---

### **3. Legacy Database Files**
```
✅ enhancements.db (12 KB) - SQLite database
✅ database-update.sql (6.2 KB) - SQL migration script
✅ database-update-simple.sql (3.0 KB) - SQL migration script
```
**Reason:**
- Old SQLite database (system now uses Supabase PostgreSQL)
- SQL files were one-time migrations (already applied)
- No longer referenced or used

**Impact:** None - migrated to Supabase

---

### **4. Temporary/Debug Files**
```
✅ tatus badge alignment and Who Benefits form submission (15 KB)
```
**Reason:**
- Appears to be a temporary file with corrupted/incomplete name
- No references found in codebase
- Likely a backup or test file

**Impact:** None

---

### **5. Legacy HTML File**
```
✅ enhancement_tracker.html (32.4 KB)
```
**Reason:**
- Old standalone HTML file
- Current system uses `public/index.html` (55+ KB, much newer)
- Dated September 26, 22:52 (older than current version)
- No references in active code

**Impact:** None - replaced by `public/index.html`

---

## ⚠️ Consider Removing - Medium Confidence

### **6. Migration Scripts** (scripts/)
```
⚠️ scripts/migrate-to-supabase.js (3.2 KB)
⚠️ scripts/simple-migration.js (2.0 KB)
⚠️ scripts/add-request-id.js (2.5 KB)
⚠️ scripts/fix-db-sequence.js (4.8 KB) - also in root
```
**Reason:**
- One-time migration scripts (already executed)
- System successfully migrated to Supabase
- Not in package.json scripts

**Recommendation:**
- ✅ Safe to remove IF migration is complete and verified
- 💾 Archive first (move to `archive/` folder) if you want to keep for reference

**Impact:** None if migration is complete

---

### **7. Database Constraint Scripts** (scripts/)
```
⚠️ scripts/update-enum-values.js (8.6 KB)
⚠️ scripts/remove-who-benefits-constraint.js (1.7 KB)
⚠️ scripts/check-db-constraints.js (3.5 KB)
⚠️ scripts/check-rls-status.js (3.1 KB)
```
**Reason:**
- One-time database modification scripts
- Constraints/enums now properly configured
- RLS already verified as working

**Recommendation:**
- ✅ Safe to remove IF database schema is stable
- 💾 Keep if you frequently modify database schema

**Impact:** None if schema is finalized

---

### **8. Initialization Scripts** (scripts/)
```
⚠️ scripts/init-db.js (8.0 KB)
```
**Reason:**
- SQLite database initialization (system now uses Supabase)
- Listed in package.json: `"init-db": "node scripts/init-db.js"`
- May be legacy from SQLite days

**Recommendation:**
- Check if it's still needed for any initialization
- If Supabase-only, remove it and update package.json

**Impact:** Check first - may still be used

---

## 📁 Keep - Active Files

### **9. Active Scripts** (scripts/)
```
✅ KEEP: scripts/backup-data.js
✅ KEEP: scripts/clear-test-data.js
✅ KEEP: scripts/check-supabase-db.js
```
**Reason:**
- `backup-data.js` - Listed in package.json: `"backup": "node scripts/backup-data.js"`
- `clear-test-data.js` - Utility for cleaning test data
- `check-supabase-db.js` - Useful for database health checks

**Impact:** Active maintenance utilities

---

### **10. Documentation & Config**
```
✅ KEEP: DATABASE_STRATEGY.md
✅ KEEP: SECURITY_FIXES.md
✅ KEEP: SECURITY_PROTOCOL.md
✅ KEEP: README.md
✅ KEEP: LICENSE
```
**Reason:** Active documentation and licensing

---

### **11. Production Code**
```
✅ KEEP: server-supabase.js (Active server)
✅ KEEP: public/index.html (Active frontend)
✅ KEEP: vercel.json (Deployment config)
✅ KEEP: package.json, package-lock.json
✅ KEEP: .gitignore
✅ KEEP: env.local (gitignored, local dev config)
```

---

## 🗂️ Other Considerations

### **12. Duplicate Environment Files**
```
⚠️ .env.vercel (1.5 KB) - In root directory
```
**Status:** Already removed from git tracking (in .gitignore)

**Note:** This file still exists locally but is properly gitignored. Keep it for local Vercel development if needed.

---

### **13. Old Backups**
```
📁 backups/ directory
```
**Recommendation:** Review and clean old backup files periodically

---

### **14. Database Directory**
```
📁 database/ directory
```
**Recommendation:** Check contents - may contain old SQLite setup files

---

## 📋 Cleanup Action Plan

### **Phase 1: Immediate Safe Removals (Zero Risk)**

```bash
# Remove test files
rm test-submission.js
rm test-supabase.js
rm test-db-constraints.js

# Remove legacy database files
rm enhancements.db
rm database-update.sql
rm database-update-simple.sql

# Remove legacy server
rm server.js

# Remove legacy HTML
rm enhancement_tracker.html

# Remove temporary file
rm "tatus badge alignment and Who Benefits form submission"

# Remove duplicate fix script (also in scripts/)
rm fix-db-sequence.js
```

**Space Saved:** ~77 KB

---

### **Phase 2: Archive Migration Scripts (Low Risk)**

Create archive folder and move one-time scripts:

```bash
# Create archive folder
mkdir -p archive/migrations

# Move migration scripts
mv scripts/migrate-to-supabase.js archive/migrations/
mv scripts/simple-migration.js archive/migrations/
mv scripts/add-request-id.js archive/migrations/
mv scripts/update-enum-values.js archive/migrations/
mv scripts/remove-who-benefits-constraint.js archive/migrations/
mv scripts/check-db-constraints.js archive/migrations/
mv scripts/check-rls-status.js archive/migrations/

# Update .gitignore to exclude archive
echo "archive/" >> .gitignore
```

**Space Saved:** ~23 KB (but preserved in archive)

---

### **Phase 3: Review Package.json (Medium Risk)**

Update `package.json`:

```json
{
  "main": "server-supabase.js",  // Change from "server.js"
  "scripts": {
    "start": "node server-supabase.js",
    "dev": "nodemon server-supabase.js",
    "backup": "node scripts/backup-data.js",
    "deploy": "vercel --prod"
    // Remove "init-db" if not needed for Supabase
  }
}
```

---

### **Phase 4: Check Old Dependencies (Optional)**

Review if still needed:

```bash
# SQLite3 - likely not needed anymore (using Supabase)
npm uninstall sqlite3

# Check if anything breaks
npm start
```

**Space Saved:** ~2 MB (node_modules)

---

## 🎯 Summary

### **Total Files to Remove:**
- **High Confidence (Safe):** 10 files (~77 KB)
- **Medium Confidence (Archive):** 8 scripts (~23 KB)
- **Dependencies:** 1 package (sqlite3)

### **Estimated Total Cleanup:**
- **Disk Space:** ~100 KB (files) + ~2 MB (dependencies)
- **Clutter Reduction:** 18 files removed/archived

### **Risk Level:**
- ✅ **Phase 1:** Zero risk (completely unused)
- ⚠️ **Phase 2:** Low risk (archived for reference)
- ⚠️ **Phase 3:** Medium risk (test after changes)
- ⚠️ **Phase 4:** Medium risk (test thoroughly)

---

## ⚡ Quick Cleanup Commands

**Conservative Approach (Safest):**
```bash
# Only remove obviously unused files
rm test-*.js
rm enhancements.db
rm *.sql
rm enhancement_tracker.html
rm "tatus badge alignment and Who Benefits form submission"
```

**Aggressive Approach (Archive Everything):**
```bash
# Create archive
mkdir -p archive/legacy archive/migrations

# Move legacy files
mv server.js archive/legacy/
mv enhancement_tracker.html archive/legacy/
mv enhancements.db archive/legacy/
mv *.sql archive/legacy/
mv test-*.js archive/legacy/
mv fix-db-sequence.js archive/legacy/

# Move migration scripts
mv scripts/migrate-to-supabase.js archive/migrations/
mv scripts/simple-migration.js archive/migrations/
mv scripts/add-request-id.js archive/migrations/
mv scripts/update-enum-values.js archive/migrations/
mv scripts/remove-who-benefits-constraint.js archive/migrations/
mv scripts/check-db-constraints.js archive/migrations/
mv scripts/check-rls-status.js archive/migrations/

# Update .gitignore
echo "archive/" >> .gitignore

# Commit changes
git add .
git commit -m "chore: archive legacy and migration files"
```

---

## ✅ Post-Cleanup Verification

After cleanup, verify everything works:

```bash
# 1. Test local server
npm start

# 2. Test all functionality
- Login with 2FA
- Create enhancement
- Edit enhancement
- CSV import (if used)

# 3. Test production deployment
git push
vercel --prod

# 4. Verify production works
- Test on live URL
- Check all features
```

---

## 📝 Notes

1. **Before cleanup:** Create a backup or git commit
2. **After cleanup:** Test thoroughly
3. **Archived files:** Keep archive folder locally (gitignored)
4. **Future cleanups:** Review archive folder quarterly

---

**Recommendation:** Start with **Phase 1** (safest), test thoroughly, then proceed to Phase 2 if comfortable.
