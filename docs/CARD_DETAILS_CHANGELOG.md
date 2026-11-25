# Card details and black credit design — 0.6.1

User-requested F6 refinement, 23 October 2026. No dependency changes.

- Cards portfolio, debit detail and Furaia Business Credit preview now share a masked card disclosure. Show card details fetches a deliberate development-only mock number/expiry/CVV; Hide removes the values from the rendered card.
- Non-payable display values start with 0000; CVV 000 and expiry 12/30 are fixed test placeholders. They do not represent issued card credentials, real PANs or credit access.
- Details stay only in local component memory, outside TanStack Query/mutation caches, fixtures and persistent browser storage. Requests/responses use no-store. MSW request logging stays quiet. Pending requests abort when the card context disappears or the window/tab hides.
- A 60-second timer, Hide, window blur, hidden tab, route change, changed card/version/identity and removed reveal permission remask. Print hides the entire disclosure. Card fields are masked by default; pending/unissued cards cannot reveal.
- New cards:reveal scope is granted to the existing development Admin/Finance roles; Viewer and Developer cannot reveal at the mock HTTP boundary. Real mode keeps reveal unavailable; no operational OTP or issuer reveal flow is invented.
- Credit uses the approved black face (#151719), dark metallic chip, subdued gray typography, business-credit badge and restrained lime corner/accent. No gradients, network logos or partner claims. Credit remains a design preview with unavailable repayments/limits.

## Verification

104 unit/API/domain/component tests across 14 files pass. All nine relevant browser journeys (two new disclosure/black-design journeys plus seven F6 journeys) pass. Browser checks include explicit hide, 60-second remasking, navigation, revealed expiry/CVV, masked portfolio defaults, credit preview/disabled repayment and 360/768/1440px overflow/runtime checks. Desktop portfolio and mobile credit detail were visually inspected. Type checking, lint, real-mode build and release mock-exclusion checks pass; no Windows/API/staging verification is claimed. See VERIFICATION.md for retained baseline evidence and limits.

## Integration boundary

POST /api/__mock/cards/:id/details is development-only and excluded from release. Real PAN/CVV access must use a confirmed backend/issuer authorization and step-up flow, ideally an issuer-hosted secure component, with strict no-store/redaction, scoped access and audited disclosure. Do not repurpose this display-only mock response as a real issuer contract. No real card numbers, issuer secrets, tokens or PINs are stored or requested.
