FROM node:8.4.0-alpine

RUN mkdir /code
WORKDIR /code

COPY package.json /code
RUN yarn install
COPY . /code

EXPOSE 3000

RUN yarn run serve