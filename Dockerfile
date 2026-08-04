FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173

COPY package.json README.md PLAN.md ./
COPY src ./src
COPY public ./public
COPY server.js ./server.js

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 4173
VOLUME ["/app/data"]

CMD ["node", "server.js"]
