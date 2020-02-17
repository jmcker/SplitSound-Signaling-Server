FROM node:12-buster-slim

LABEL maintainer="Symboxtra Software"
LABEL version="1.0.1"

RUN mkdir -p /usr/src/
WORKDIR /usr/src/
COPY package.json package-lock.json /usr/src/

RUN npm install .

COPY . /usr/src/

EXPOSE 8080

CMD ["npm", "run", "start:docker"]
