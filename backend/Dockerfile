FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY scripts/ ./scripts/
RUN npm install --only=production && npm cache clean --force
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
