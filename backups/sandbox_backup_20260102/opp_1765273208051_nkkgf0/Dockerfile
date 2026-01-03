FROM node:16.7-alpine as build-stage
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production && mkdir src
COPY . .
RUN echo 'export DATABASE_URL="postgres://lifeos-neo@localhost:5432/lightweightassistant?sslmode=require&applicationIntent=high"' > .env.local && chmod +x ./docker-entrypoint.sh && mv docker-entrypoint.sh /usr0
RUN npm run build --ifne
COPY dist ./dist