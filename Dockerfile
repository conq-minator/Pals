# PALS: GLY + ARB + DEFENDER + PULSE and the React app, in one container.
# Works on Render, Railway, Fly.io or any Docker host. Secrets come from the host's
# environment settings, never from this file.

FROM node:22-bookworm-slim

# poppler-utils: pdftotext, for PayPal's Privacy Statement PDF in the knowledge base.
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first, so code changes don't reinstall them.
COPY package.json package-lock.json ./
COPY GLY/package.json GLY/package-lock.json GLY/
COPY frontend/package.json frontend/package-lock.json frontend/
RUN npm ci && npm ci --prefix GLY && npm ci --prefix frontend

COPY . .

# 1. The React app -> frontend/dist, served by the PALS server at /.
RUN npm run frontend:build

# 2. GLY's knowledge base. developer.paypal.com and the Privacy Statement PDF work from servers;
#    www.paypal.com help pages do not (bot check), so --max-pages=0 skips them here.
#    A failed fetch doesn't fail the build: GLY then answers from what is committed.
RUN (npm run fetch:paypal --prefix GLY -- --guides-only || echo "developer guides skipped") \
 && (npm run fetch:paypal-consumer --prefix GLY -- --max-pages=0 || echo "consumer docs skipped")

# 3. Embed the corpus now (downloads the ~35 MB embedding model once), so the server
#    starts in seconds instead of embedding ~1,800 chunks on every start.
RUN node GLY/GLY/rag/ingest/run.ts GLY/docs/knowledge/paypal

ENV NODE_ENV=production
EXPOSE 8787
CMD ["npm", "start"]
