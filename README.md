# Project Trinity

Flair Technologies' automated, in-house B2B acquisition ecosystem.

## Architecture & Modules

1. **Central Database (`/database`)**: PostgreSQL database (single source of truth).
2. **Audit Engine (`/audit-engine`)**:
   - **Frontend (`/audit-engine/frontend`)**: Next.js dashboard and lead capture interface.
   - **Backend (`/audit-engine/backend`)**: Node.js microservice to run Lighthouse scans and generate PDF audits via Puppeteer.
3. **Intelligence Scrapers (`/scrapers`)**: Python outbound playbooks using Playwright and Asyncio to scan LinkedIn/Indeed and fetch BuiltWith tech-stack details.
