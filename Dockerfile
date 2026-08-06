FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173

COPY package.json README.md PLAN.md ./
RUN npm install --omit=dev
COPY src ./src
COPY public ./public
COPY server.js ./server.js

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 4173
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "server.js"]
