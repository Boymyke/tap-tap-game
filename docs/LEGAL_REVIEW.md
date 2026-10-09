# Legal review checklist

Generated from the `flag` notes in `src/ui/legal.js` (shown only to the Super admin on each legal page).
Nothing in the app claims legal compliance; each item below needs a Nigerian lawyer before real money is switched on.

**Version:** terms 2026-10-09 · 14 open items

## Game Rules

- [ ] **Winning** — Paid entry + cash prize contests may be regulated as gaming or promotional competitions by Nigerian state regulators (e.g. LSLGA in Lagos; FSGRN reciprocity). Confirm the licence or permit needed before enabling real-money paid pools and sponsored prizes.

## Fair Play & Anti-Cheating Policy

- [ ] **What happens if you cheat** — Confirm that withholding or reversing prizes after an anti-cheat review is enforceable under the Terms and Nigerian consumer law (FCCPA 2018).

## Prizes & Withdrawal Rules

- [ ] **Age** — Self-confirmation of age is the only age check in place. Ask counsel whether KYC/age verification (e.g. BVN or ID) is required for paid entry, payouts and payment-provider rules.
- [ ] **Withdrawals** — Check payout KYC obligations, tax treatment of prizes (including any withholding) and the right to hold payouts pending investigation.
- [ ] **Sponsored prizes** — Sponsored free-entry prize competitions may need a sales promotion approval (FCCPC) and/or a state promotional permit.

## Account Suspension Rules

- [ ] **What happens** — Decide the policy for wallet balances and winnings on permanently closed accounts (refund, forfeiture, or hold) and confirm it is lawful.

## Terms of Use

- [ ] **Who we are** — Insert the registered legal entity name, RC number and address once CAC registration is complete.
- [ ] **Who can use Tap Am** — Under the NDPA 2023 a child is under 18 and processing a child’s data needs a parent’s or guardian’s consent. Sign-up no longer asks for date of birth. Confirm whether the current self-declaration is enough or an age gate / parental consent flow is needed.
- [ ] **Our liability** — Review liability limits and consumer rights under the FCCPA 2018.

## Privacy Policy

- [ ] **Who is responsible** — Confirm whether Tap Am must register with the NDPC as a data controller of major importance, appoint a DPO and file an annual compliance audit.
- [ ] **Who can see it** — Sponsor lead sharing: confirm the consent wording, the sponsor’s status as an independent controller, and whether a data-sharing agreement with each sponsor is needed.
- [ ] **Where it is stored** — Cross-border transfer: confirm the NDPA basis (adequacy, contract clauses or consent) for processing on Cloudflare outside Nigeria.

## Disclaimer

- [ ] **Skill, not chance** — Whether paid-entry tapping contests are “gaming” under state law is a legal question — do not describe Tap Am as “not gambling” in marketing until counsel confirms.

## Consent notices

- [ ] **Cookies and storage** — Confirm that no cookie banner is required given only strictly necessary cookies are used.

## Also confirm

- [ ] Paystack live-mode and Transfers approval (business KYC) before turning off `PAYMENTS_TEST_MODE`.
- [ ] Subscription wording for Mapo (₦3,500/month, ₦35,000/year) and Nepo (₦50,000/month, ₦500,000/year): auto-renewal is **not** used — each period is paid manually; say so at checkout.
- [ ] The one-time 18+ confirmation shown before paid entry, funding, buying and withdrawing.
- [ ] Lead capture: off by default per sponsor, explicit unticked consent box, data shared only with that sponsor.
