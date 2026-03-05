FROM node:22-slim

RUN npx playwright install --with-deps chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npm", "start"]
