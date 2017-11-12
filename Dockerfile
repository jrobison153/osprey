FROM node:boron
WORKDIR /usr/src/app
COPY . .
HEALTHCHECK CMD curl --fail http://localhost:8082/health || exit 1
ENTRYPOINT ["npm", "start"]