FROM node:20-bullseye

# Install Python, pip, and chromium dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxrandr2 \
    libxdamage1 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libcups2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Setup Python Environment for Scrapers
COPY scrapers/requirements.txt ./scrapers/
RUN python3 -m venv /app/scrapers/venv
RUN /app/scrapers/venv/bin/pip install --no-cache-dir -r scrapers/requirements.txt
RUN /app/scrapers/venv/bin/playwright install chromium
RUN /app/scrapers/venv/bin/playwright install-deps

# 2. Setup Node Environment for Backend
COPY audit-engine/backend/package*.json ./audit-engine/backend/
WORKDIR /app/audit-engine/backend

# Install Puppeteer and other dependencies
RUN npm ci

# 3. Copy source code
WORKDIR /app
COPY audit-engine/backend ./audit-engine/backend
COPY scrapers ./scrapers

# 4. Build TypeScript Backend
WORKDIR /app/audit-engine/backend
RUN npm run build

# Create public reports directory so it doesn't fail on first run
RUN mkdir -p public/reports

# 5. Start Server
EXPOSE 4000
CMD ["npm", "start"]
