# Security Policy

This document describes how to report security issues, our responsible disclosure policy, supported versions, and the security controls implemented by the project.

## Reporting security vulnerabilities (preferred)

If you discover a potential security vulnerability, please report it to the maintainers using one of the following secure channels:

- Preferred: create a private issue in this repository and mark it "security" (if the hosting supports private issues)
- Email: security@mycelium.example (use PGP to encrypt sensitive details if possible)
- If you need to share sensitive PoC code or data, please ask for a secure upload method in the initial report.

What to include in your report:

- A clear description of the vulnerability and the affected component (file/module)
- Steps to reproduce (minimal PoC if possible)
- Expected and actual behavior
- Impact assessment (data exposure, RCE, privilege escalation, etc.)
- Any suggested mitigations or patches

If you prefer to open a public issue first, please avoid posting full exploit code or sensitive data in public.

## Responsible disclosure policy and timelines

- Acknowledge receipt: within 2 business days
- Initial triage: within 7 calendar days
- Fix or mitigation plan: within 30 calendar days for high/critical issues when practical
- Public disclosure / advisory: coordinated with reporter; typically within 90 days of initial report for critical issues unless a longer embargo is required

If there are legal or operational constraints that prevent us from meeting these timelines we will communicate them to the reporter.

## Severity & CVE handling

- We classify issues as Low / Medium / High / Critical based on impact and exploitability.
- For High/Critical vulnerabilities we will request a CVE assignment and publish an advisory once a fix or mitigation is available.

## Security contact and PGP

- Email: security@mycelium.example
- PGP key fingerprint: 0000 0000 0000 0000 0000 0000 0000 0000 (replace with real key)

## Disclosure & credits

We aim to credit external researchers who report security issues, unless they request anonymity.

## Security features (summary)

The following is a high-level summary of the security controls implemented by this project. For implementation details see source files under `middleware/`, `services/`, and `config/`.

- Authentication & sessions
  - Advanced session management with token validation and rotation
  - Idle timeout (configurable, default 30 minutes) and max session duration
  - Dynamic session secret rotation with fallback
  - HTTPOnly, Secure, SameSite cookie attributes

- Password security
  - Enforced complexity checks and client-side strength feedback
  - Password history checks to prevent reuse
  - bcrypt hashing (configurable rounds)

- Input protection
  - Server-side validation and sanitization
  - CSP and XSS mitigations (sanitizers and DOM sanitization)
  - Parameterized queries to prevent SQL injection
  - CSRF protection (tokens validated for state-changing requests)

- Rate limiting & brute force protections
  - Login throttling and global/request-level rate limits

- Security headers
  - HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy

- Monitoring & logging
  - Security logging of suspicious events and failed logins

## Implementation details (where to find them)

- Session management: `services/SessionManagementService.js`, `middleware/DynamicSessionMiddleware.js`
- CSRF protection: `middleware/csrfProtection.js`
- Rate limiting: `middleware/rateLimiting.js`
- Input validation: `middleware/inputValidation.js`, `services/SanitizationService.js`

## Supported versions

We publish security support windows for releases. Supported versions currently:

| Version | Support status | Notes |
| ------- | -------------- | ----- |
| 1.0.x   | Supported      | Active maintenance for security issues |

If you are running an older fork or custom deployment, please upgrade to the latest 1.0.x patch release.

## Reporting process (example)

1. Send an email to `security@mycelium.example` or open a private issue with the subject `SECURITY REPORT: <short description>`.
2. Attach PoC or steps to reproduce. If data is sensitive, ask for a secure upload channel.
3. We will acknowledge and triage the issue and provide a reference number.

## Disclosure and coordination

We will coordinate patch releases and advisories with the reporter. Where possible, we will ship a patch and release notes, then publish an advisory.

## Emergency contact

If you believe a vulnerability is being actively exploited in production and immediate action is required, please mark the initial report as "urgent" and include contact phone number or alternate secure channel for faster coordination.

## Other notes

- Never send secrets (passwords, private keys) in plain email. Use PGP or a secure upload.
- Do not attempt to access, exfiltrate, or modify production data during testing without prior authorization.
- We reserve the right to notify affected parties and hosting providers if there is imminent risk to users.

---

Last updated: 2025-10-10

