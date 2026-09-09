# Next.js backend (formerly Express) — single source is server
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
# Next.js needs build at image build time
RUN npm run build
ENV PORT=3000
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
