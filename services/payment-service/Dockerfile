FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8004
CMD ["node", "src/index.js"]
