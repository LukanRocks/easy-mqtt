# Security Policy

## Supported Versions

Only the latest release of easy-mqtt receives security fixes.

| Version | Supported |
| ------- | --------- |
| Latest  | ✓         |
| Older   | ✗         |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not open a public GitHub issue**. Instead, report it privately via [GitHub's private vulnerability reporting](https://github.com/LukanRocks/easy-mqtt/security/advisories/new) so it can be addressed before public disclosure.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested remediation, if you have one

You can expect an acknowledgement within **48 hours** and a status update within **7 days**.

## Scope

easy-mqtt bundles a Mosquitto broker and a web admin UI in a single self-hosted container. The security model assumes you run it on a trusted private network or behind appropriate access controls (reverse proxy, VPN, firewall, etc.). As a result:

- Vulnerabilities that require physical or administrative access to the host are out of scope.
- Vulnerabilities in your deployment infrastructure (e.g. an exposed Docker socket) are out of scope.
- In-scope issues include: authentication/authorization bypass in the admin API, session or sealed-cookie handling flaws, path traversal, XSS, CSRF, and insecure defaults that could affect a standard deployment.

## Disclosure Policy

Once a fix is available and released, the vulnerability will be disclosed publicly with appropriate credit to the reporter (unless anonymity is requested).
