# Security Policy

## Reporting a vulnerability

If you believe you have found a security or privacy issue in PureKick, please
report it privately.

**Email:** info@codebb.co
**Subject:** `PureKick security report`

Please do **not** post the issue publicly (store reviews, social media, forums)
before we have had a chance to fix it.

### What to include

- Which version of PureKick and which browser you tested
- Steps to reproduce, or a short proof of concept
- What an attacker could achieve with it

### What to expect

- Acknowledgement within **72 hours**
- An assessment and a planned fix date within **7 days**
- Credit in the release notes if you want it

## Supported versions

Only the latest version published on the Chrome Web Store, Microsoft Edge
Add-ons and Firefox Add-ons is supported. Older versions receive no fixes.

## Scope

In scope:

- Code execution, privilege escalation or data exfiltration through the
  extension
- Leakage of user data collected by the extension
- Bypass of the extension's own permission or consent checks

Out of scope:

- Issues in Kick.com itself — report those to Kick
- Bugs that require the user to install a malicious extension or run untrusted
  code in the page
- Cosmetic or purely functional bugs (send those to the same address, just not
  as a security report)

## What PureKick stores

PureKick has no backend account system beyond an optional link to
`purekick.pumpzera.cc`. Understanding what is kept where helps when assessing a
report:

| Where | What | Visible to the page? |
|---|---|---|
| `chrome.storage.local` (extension-private) | settings, personal notes, hidden users and channels, role colours, ban reasons, VOD resume points, optional account link | No |
| IndexedDB on `kick.com` | a 15-minute session-recovery snapshot, plus a separate chat archive retained until the user clears Kick site data; the archive has no message-count cap | Yes — page scripts on `kick.com` can read origin IndexedDB, which contains public chat and moderation records from that channel |

No chat content is written to the extension's settings storage. The session-recovery snapshot expires after 15 minutes; the separate archive persists in Kick-origin IndexedDB and is readable by scripts running on Kick.com. The archive currently has no dedicated in-extension delete control; users can remove it by clearing Kick site data in the browser.

## Network

PureKick talks to:

- `kick.com` and its subdomains — the site it runs on and its public/API endpoints
- `purekick.pumpzera.cc` — badge data, and an activity signal every 6 hours,
  only if the user has linked their account
- Instagram, X/Twitter, TikTok, Streamable and Lightshot endpoints — public profile or link-preview metadata when the matching chat preview is requested; requests omit cookies except the Instagram profile-card lookup, which uses the current Instagram session if available
- Other generic link hosts are not fetched by default. The all-sites patterns are optional permissions and are not requested during installation; a user can grant them through the browser extension site-access controls

There is no analytics or tracking.
