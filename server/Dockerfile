FROM alpine
RUN apk add --no-cache --update nodejs npm

WORKDIR /app
COPY package.json package-lock.json ./
COPY .env ./.env
RUN npm install --omit=dev
COPY . .

CMD node /app/dist/server.js