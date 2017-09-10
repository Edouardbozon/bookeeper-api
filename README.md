# Bookkeeper Api

![Bookkeeper Api](https://media.giphy.com/media/l0IyeL8r9UhJI5LcA/giphy.gif)

Join or create a Shared flat with your roommates, track your common expenses. 

## Pre-reqs
- Install Docker 
- Install Docker-compose

## Getting started
- Clone the repository
```
git clone git@github.com:Edouardbozon/bookkeeper-api.git
```
- Jump in dir
```
cd <bookkeeper-api>
```
- First time, build and run containers
```
docker-compose up --build
```
- :rainbow: It works! navigate to [http://localhost:3000](http://localhost:3000)

- Next time, just run containers
```
docker-compose up
```

## Road map

There is a lot of things to do:

1. Switch the app in full api mode
2. Make a full crud for public shared flats routes and enhance domain logic
    - :white_check_mark: Add ability to do a request to join a shared flat
    - :white_check_mark: Add user verification to create or join a shared flat
    - Add shared flat nested routes for join request actions
        - Add list route
        - Add ability to validate or refused a shared flat request for an admin
        - Add delete join request action only available for the author
    - Improve notification system to help user in those actions
        - add user nested routes to manipulate notifications
    - Add ability to modify a shared flat by an admin
        - add some user friendly fields like banner
    - Add query data validation to create a shared flat
    - Add single shared flat route detail as "profile" page for people that are outside
    - Add tests
3. Make residents shared flat functionnalities
    - Add list common expenses route
        - show 
    - Add ability to add common expense 
        - Maybe use event sourving solution to track expense history
    - Add tests
4. [Further] Add geo search for shared flats to join them more easily
    - Maybe use Elasticsearch to provide geo-search ?
5. [Further] Add realtime shared flat expenses tracking
    - Maybe use socket.io ?

## Helpfull Links

- [NodeJS](https://nodejs.org/dist/latest-v8.x/docs/api/)
- [TypeScript cookbook](https://basarat.gitbooks.io/typescript/content/docs/getting-started.html)
- [Express/TypeScript starter](https://github.com/sahat/hackathon-starter.git)
