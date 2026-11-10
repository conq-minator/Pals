# PALS Frontend Application (`frontend/`)

> **Technology Stack:** Next.js 14+ (App Router), React, TailwindCSS, TypeScript  
> **Ownership:** Frontend & UX Engineering Group

---

## 1. Overview & Purpose

The `frontend/` directory houses the responsive web interface for PALS.

The interface presents a unified, conversational companion experience (interfacing exclusively with **GLY**) alongside interactive UI widgets for:
- Live streaming chat dialogue.
- Out-of-band asynchronous task indicators (e.g., "ARB is researching options...").
- Specification comparison tables.
- Interactive **Purchase Authorization Cards** (where users inspect total landed costs and cryptographically sign purchase approvals).
- User preference & spending limit management dashboards (defining budget ceilings, merchant allowlists, and currency preferences).

---

## 2. Boundaries & Safety Invariants

- **No Direct Agent Bypasses:** The frontend connects exclusively to GLY via WebSockets and REST. It never opens direct connections to ARB or PULSE.
- **No Direct PayPal Secret Storage:** Frontend code never stores PayPal API secrets or interacts with PayPal endpoints directly.
- **Deterministic Approval UI:** The authorization card must explicitly display item price, shipping fees, taxes, merchant domain, and total payable amount before generating a `UserApprovalToken`.

