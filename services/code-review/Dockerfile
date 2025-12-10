```Dockerfile
FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Install ESLint, PMD, Pylint
RUN npm install -g eslint
RUN apt-get update && apt-get install -y pmd
RUN pip install pylint

EXPOSE 3000
CMD ["node", "src/index.js"]
```