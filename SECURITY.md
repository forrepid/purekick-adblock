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
| IndexedDB on `kick.com` | short-lived chat session snapshot (chat log, statistics, moderation log) so an accidentally closed tab can be restored; expires after 15 minutes | Yes — it holds only public chat from that channel |

No chat content is written to the extension's settings storage, and no personal
setting is written to the page's IndexedDB.

## Network

PureKick talks to:

- `kick.com` — the site it runs on
- `purekick.pumpzera.cc` — badge data, and an activity signal every 6 hours,
  only if the user has linked their account

Nothing else. There is no analytics or tracking.
