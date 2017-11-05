FROM node:8.4.0-alpine

RUN mkdir /code
WORKDIR /code

COPY package.json /code
RUN npm install

COPY . /code

EXPOSE 3000