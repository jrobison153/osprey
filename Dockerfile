FROM node:boron
WORKDIR /usr/src/app
COPY . .
HEALTHCHECK CMD curl --fail http://localhost:${PORT}/health || exit 1
ENTRYPOINT ["npm", "start"]