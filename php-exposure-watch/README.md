# PHP Exposure Watch — Nigeria

A single-file, self-contained public-interest **awareness** dashboard about outdated /
end-of-life PHP across the Nigerian web, with a **check-your-own-site** helper and real
remediation guidance.

Open `index.html` in any browser — no build step, no dependencies, no network calls on load.

## What it is
- Plain-language explanation of why unsupported PHP = unpatched PHP.
- **Factual** PHP branch support dates (verify against php.net/supported-versions).
- A self-service helper that builds copy-paste `curl` / `php -v` checks for a domain
  **you own**, plus links to passive fingerprinting services.
- Step-by-step migration and mitigation guidance.
- Neobrutalist design, responsive, light/dark aware.

## What it deliberately is NOT
- It is **not** a scanner and runs no exploit code.
- It does **not** publish a searchable directory of named organisations and their live
  vulnerabilities. A per-organisation vulnerability index is a targeting aid, not a public
  good — so this tool stays on the awareness + self-help side of that line.

## The statistics are samples
The version-spread chart uses clearly-labelled **illustrative** figures. Replace them with
properly-sourced **aggregate** percentages (Shodan / Censys / BuiltWith trends) before
citing anything here as fact. Keep published data aggregate — never per-organisation.

## Ethics
Only test infrastructure you own or are explicitly authorised to assess. Version banners can
be wrong (hidden headers, backported distro security patches), so confirm on the server
itself before acting.
