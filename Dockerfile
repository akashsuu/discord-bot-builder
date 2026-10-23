FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm install

# Copy source code and build frontend
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend and backend files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/plugins ./plugins
COPY --from=builder /app/kiodium.ico ./kiodium.ico
COPY --from=builder /app/server.js ./server.js

# Create data directory volume
RUN mkdir -p /app/data/projects
VOLUME /app/data

EXPOSE 3000

CMD ["node", "server.js"]
