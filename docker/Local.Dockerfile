FROM node:16-alpine
USER root

RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

WORKDIR /usr/src/pii-reverse-proxy
RUN chown -R node:node /usr/src/pii-reverse-proxy
COPY package*.json ./

RUN npm install
ENV PATH=/usr/src/pii-reverse-proxy/node_modules/.bin:$PATH

WORKDIR /usr/src/pii-reverse-proxy/local
COPY . .

CMD ["npm", "run", "start"]
