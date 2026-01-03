FROM node:latest as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build # Assuming we have a script to bundle our frontend assets.