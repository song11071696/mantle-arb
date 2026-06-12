# SECURITY.md — MantleArb Security Policy

## Overview

MantleArb is an **open-source arbitrage agent prototype** for research and educational purposes. Security is a top priority, especially given the financial nature of the domain.

## Security Architecture

### Defense in Depth

MantleArb uses a layered security approach:

1. **Safety Layer (Primary)**: Hard-coded constraints that cannot be bypassed by any other component
   - Router whitelist enforcement
   - Token whitelist enforcement
   - Profit threshold validation
   - Slippage limits
   - Gas cost limits

2. **AI Boundary (Secondary)**: AI components are strictly advisory
   - AI cannot access private keys
   - AI cannot execute trades
   - AI suggestions always pass through Safety Layer
   - AI advisory-only flag is immutable

3. **Execution Control (Tertiary)**: Execution modes provide additional safety
   - Manual mode (default): requires human confirmation
   - Configurable auto-mode: user explicitly opts in
   - Retry limits prevent runaway execution

### Key Security Principles

- **AI decisions are advisory only** — never autonomous
- **All trades require Safety Layer validation** — no exceptions
- **Whitelist-based access control** — deny by default
- **Human-in-the-loop** — manual confirmation by default
- **No direct fund access by AI** — AI module cannot sign transactions

## Vulnerability Reporting

If you discover a security vulnerability in MantleArb:

1. **Do NOT open a public GitHub issue**
2. Email: [security@example.com] (replace with actual contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
4. We aim to acknowledge reports within 48 hours

## Security Checklist for Contributors

Before submitting code that touches:
- [ ] **Safety Layer**: Ensure no bypasses are possible
- [ ] **API endpoints**: Validate all inputs, enforce authentication
- [ ] **AI module**: Verify advisory-only boundary is maintained
- [ ] **Execution engine**: Ensure safety validation is enforced before execution
- [ ] **Configuration**: Ensure safe defaults

## Known Limitations

This is a **prototype** with the following known security limitations:
- No real transaction signing (placeholder implementation)
- No persistent storage (in-memory only)
- No rate limiting on API endpoints
- No CORS configuration
- No input sanitization beyond safety checks
- No audit logging

These limitations should be addressed before any production use.

## Dependencies

- Regularly audit npm dependencies for known vulnerabilities
- Run `npm audit` before releases
- Pin dependency versions in production

## Smart Contract Interactions

When interacting with DEX routers:
- Only interact with whitelisted router contracts
- Verify contract addresses on-chain before use
- Use `eth_call` to simulate transactions before submission
- Monitor for reentrancy risks in multi-hop swaps
- Be aware of sandwich attack vectors
