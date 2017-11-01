# Bookeeper Api

![Bookeeper Api](https://media.giphy.com/media/l0IyeL8r9UhJI5LcA/giphy.gif)

Join or create a Shared flat with your roommates, track your common expenses. 

## Pre-requisites
- Install Docker 
- Install Docker-compose

## Getting started
- Clone the repository
```
$ git clone git@github.com:Edouardbozon/bookeeper-api.git
```
- Jump in dir
```
$ cd <bookeeper-api>
```
- First time build and run containers, next time build is unnecessary
```
$ docker-compose up --build
```
- :rainbow: It works! By default the api is running on `http://localhost:3000/`
- You can easily interact with the api using [Postman](https://www.getpostman.com/)

## Road map

There is a lot of things to do:

1. Switch the app in full api mode
2. Make a full crud for public shared flats routes and enhance domain logic
    - :white_check_mark: Add ability to do a request to join a shared flat
    - :white_check_mark: Add user verification to create or join a shared flat
    - Add shared flat nested routes for join request actions
        - :white_check_mark: Add list route
        - :white_check_mark: Add ability to validate or refused a shared flat request for an admin
        - Add delete join request action only available for the author
    - Improve notification system to help user in those actions
        - :white_check_mark: Add read action when user saw them
        - Add links props in model to improve navigation
        - :white_check_mark: list notifications by user
    - Add ability to modify a shared flat by an admin
        - add some user friendly fields like banner
        - Improve address with lat and long
        - Add geo validation for address
    - Add tests
3. Make residents shared flat functionalities
    - Add events system
        - :white_check_mark: list action
        - show action
        - improve event types to reflect IRL shared flat events
            - detailed actions
        - add event type "need"
    - Add tests
4. [Further] Add geo search for shared flats to join them more easily
    - Maybe use Elasticsearch to provide geo-search ?
5. [Further] Add real-time shared flat event tracking
    - Maybe use socket.io ?
6. [Further] Add auto generated docs

## Helpfull links

- [NodeJS](https://nodejs.org/dist/latest-v8.x/docs/api/)
- [TypeScript cookbook](https://basarat.gitbooks.io/typescript/content/docs/getting-started.html)
- [Express/TypeScript starter](https://github.com/sahat/hackathon-starter.git)
