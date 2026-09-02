# Next.js backend (formerly Express) — single source is backend-nextjs
FROM node:18-alpine
WORKDIR /app
COPY backend-nextjs/package*.json ./
RUN npm ci --omit=dev
COPY backend-nextjs/ ./
# Next.js needs build at image build time
RUN npm run build
ENV PORT=3000
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
