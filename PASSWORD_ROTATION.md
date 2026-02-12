# Memory Archive Password Rotation Workflow

The Memory Archive is password-protected using client-side SHA-256 hashing. This document describes the monthly password rotation process.

## Current Password

**Password:** `nine-tails-den`
**Hash:** `dc3e251fb1a6be51a989d2966278e2483c32108cafb2028f48c2a546bf8732f7`
**Set:** 2026-02-12
**Rotate by:** 2026-03-12

## Monthly Rotation Schedule

Rotate password on the 12th of each month (Miru's birthday).

### Rotation Steps

1. **Generate new password**
   - Choose memorable phrase (lowercase, hyphens)
   - Example pattern: `[adjective]-[noun]-[location]`
   - Good: `starlit-fox-sanctuary`, `amber-dawn-shrine`, `quiet-tail-grove`
   - Avoid: special chars, numbers, spaces

2. **Generate SHA-256 hash**
   ```bash
   node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR-NEW-PASSWORD')).then(h => console.log(Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')))"
   ```

3. **Update app.js**
   - Edit `/root/.openclaw/memory-archive/app.js`
   - Replace `AUTH_HASH` value with new hash
   - Update password comment: `// Current password: YOUR-NEW-PASSWORD (rotate monthly)`

4. **Test locally**
   ```bash
   cd /root/.openclaw/memory-archive
   python3 -m http.server 8888
   # Visit http://localhost:8888 and test password
   ```

5. **Commit and push**
   ```bash
   git add app.js
   git commit -m "Rotate password (monthly)"
   git push origin main
   ```

6. **Verify deployment**
   - Wait 2-3 minutes for GitHub Pages rebuild
   - Visit https://miruandmu.github.io/archive/
   - Test new password

7. **Update this file**
   - Update "Current Password" section with new password, hash, and dates
   - Commit: `git commit -am "Update password rotation doc" && git push`

## Password History

| Date Set   | Password          | Rotated By |
|------------|-------------------|------------|
| 2026-02-12 | nine-tails-den    | 2026-03-12 |

## Emergency Password Reset

If password is lost:

1. Generate new hash using any known phrase
2. Update `AUTH_HASH` in app.js
3. Commit and push
4. Update this document

## Security Notes

- Password is hashed client-side (SHA-256)
- No server-side authentication
- Hash is visible in source code (security through obscurity)
- Intended for small trusted community, not cryptographic security
- Change password if link is accidentally shared publicly

## Future: Automated Rotation

When ready to automate:

1. Add password rotation to strategic thinker monthly checks
2. Generate passwords from word lists
3. Auto-commit and push
4. Send notification via dashboard chat

Current approach: manual rotation, documented workflow.
