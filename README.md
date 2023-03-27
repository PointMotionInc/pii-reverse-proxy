## Install Docker and Docker Compose
- https://docs.docker.com/get-docker/
- https://docs.docker.com/compose/install/

## Build image & start containers
- run `docker compose --profile local up -d`
- this will start the reverse proxy on port localhost `8000`
- the reverse proxy server will forward requests to pii-graphql server which runs on localhost `8081`