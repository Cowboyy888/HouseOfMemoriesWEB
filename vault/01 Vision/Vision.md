---
status: accepted
owner: CEO Agent
sprint: 0
---

# Vision — "DriveHub" (placeholder brand)

## Executive Summary
DriveHub is an enterprise-grade platform unifying **car rental** and **car sales** on one operational backbone: a shared fleet inventory, a single customer identity, and one admin/employee back office. Target launch market is the United States (USD pricing), built with multi-language infrastructure from day one so additional locales can be added without re-architecting routing or content.

## Business Model
Two revenue streams, one shared operational core:

1. **Car Rental** — short/long-term rentals, deposit holds, damage/return workflow.
2. **Car Sales** — used/new vehicle listings, inquiry-to-purchase flow, checkout.

Both draw from a single `Vehicle` entity (see [[Decisions#ADR-002]]). A vehicle carries a `listingType` (`RENTAL`, `SALE`, `BOTH`) and a `status` state machine that prevents invalid transitions (e.g. a vehicle mid-rental cannot be marked `SOLD`).

## Target Market
- **Primary market:** United States, USD pricing, US tax/legal defaults.
- **Language:** Multi-language from day one — English is the only shipped locale at MVP, but routing/content are locale-aware from Sprint 1 (see [[Decisions#ADR-001]]).
- **Customers:** Retail consumers renting or buying vehicles online. Phase 2+ adds business/corporate accounts.

## Personas
| Persona | Needs |
|---|---|
| Customer (Renter/Buyer) | Search, compare, book/purchase, manage bookings, pay online |
| Branch Employee | Check vehicles in/out, manage local inventory, handle walk-in bookings |
| Fleet Manager | Oversee inventory across branches, pricing, maintenance schedules |
| Platform Admin | Manage employees, view reports, configure platform-wide settings |

## Core Modules (in scope for the platform)
Car Rental · Car Sales · Fleet Management · Booking System · Customer Portal · Admin Dashboard · Employee Management · Reports & Analytics · SEO · AI Features

## Phased Roadmap
- **Phase 1 (MVP):** Auth (email + Google + Facebook), shared vehicle catalog, rental booking engine, customer portal basics, admin dashboard basics, Stripe payments (deposits + checkout).
- **Phase 2:** Car sales flow (listing → inquiry → purchase), employee management, reports & analytics, SEO foundation (metadata, sitemaps, structured data).
- **Phase 3:** AI features (recommendations, chat assistant, dynamic pricing), advanced analytics, multi-branch fleet operations.

## Success Metrics (KPIs)
- Booking conversion rate (search → confirmed booking)
- Rental fleet utilization rate
- Average time-to-sale (sales listings)
- Customer portal satisfaction (NPS)
- Admin operational efficiency (time to onboard a vehicle, time to process a booking/return)

## Out of Scope for MVP
- Insurance underwriting / claims processing
- Cross-border / international rentals
- In-house financing origination (a Phase 2+ integration with a third-party financing partner may be considered, not built in-house)

## Brand
"DriveHub" is a **placeholder** brand name pending the user's final choice. It is not hardcoded into business logic — renaming is a mechanical pass across repo name, package scope (`@drivehub/*`), and this vault, tracked in [[Decisions]].

## Locked-In Decisions Feeding This Vision
See [[Decisions]] for the full ADR log (market/locale, fleet model, monorepo tooling, payment provider, vault location).
