```dockerfile
# Base image for building
FROM node:14 as build

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

# Production image
FROM node:14-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist

CMD ["node", "dist/main.js"]
```