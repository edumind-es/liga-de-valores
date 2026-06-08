# Security Audit - 2026-02-12

Scope:
- Codebase and local configuration in /var/www/liga_edumind
- Focus on secrets handling, authentication, access control, and exposure risk

Method:
- Static review of configuration, API routers, and sensitive paths
- Pattern search for secrets in code

Summary:
Status is acceptable but not hardened. One critical issue was found and fixed today.

Findings

High
1) Hardcoded Discord webhook in code
Impact: secret token exposed in source. Anyone with repo access can post to the webhook.
Location: backend/app/api/v1/sport_proposals.py
Action taken: removed hardcoded default. Now only uses DISCORD_WEBHOOK_URL from env.
Required: rotate the Discord webhook token in Discord settings.

Medium
1) No rate limiting on auth login/register
Impact: brute force risk on login and codigo enumeration.
Location: backend/app/api/v1/auth.py
Status: fixed (rate limiting added: 10/minute).

2) CORS includes http origin
Impact: allows non TLS origin in production (http://liga.edumind.es).
Location: backend/app/config.py
Status: fixed (removed http://liga.edumind.es from default list).

Low
1) Secrets and credentials live in .env files
Impact: if .env is leaked, secrets are exposed.
Current status: .env is gitignored. Use external secret stores for production.

Actions completed today
- Removed hardcoded Discord webhook from source.
- Ensured settings ignore extra env keys to avoid accidental crashes from system env vars.
- Added rate limiting to /auth/login and /auth/register.
- Removed http CORS origin for liga.edumind.es in default config.

Actions pending
- Rotate Discord webhook.
- Review production CORS allowlist in backend/.env to ensure only https.

Notes
- This audit is static only. No penetration testing or dependency scanning was executed.
- Network and DB access in this environment is sandboxed, so runtime checks were not run here.
