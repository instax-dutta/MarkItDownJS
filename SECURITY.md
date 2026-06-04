# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via GitHub's Security Advisory feature:
**[Report a vulnerability](../../security/advisories/new)**

Or email: security@markitdownjs.dev (if configured)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

### Response timeline

- **Acknowledgement**: within 48 hours
- **Assessment**: within 7 days
- **Fix + disclosure**: coordinated with reporter

### Scope

In scope:
- Remote code execution
- Arbitrary file read/write via document parsing
- Dependency confusion attacks
- Prototype pollution

Out of scope:
- Vulnerabilities in dependencies (report upstream)
- Issues requiring physical access
- Social engineering
