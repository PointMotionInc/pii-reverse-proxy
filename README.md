# Introduction
The reverse proxy server is used to log PII (Personally Identifiable Information) access, this is required for regulatory compliance. Reverse proxy server does the following when a request to fetch PII is made.

```
1. it makes a log entry specifying who made the request, and PII fields requested.
2. appends logs to `audit.log` file on disk
3. it forwards the request to appropiate PII Hasura backend server, depending on the environment variable set in the request header
4. finally, it returns the response, completing its job as reverse proxy.

note: here, Hasura server is responsible for validating the authorization of the request.
```


# Setup

## Install Docker and Docker Compose

- <https://docs.docker.com/get-docker/>
- <https://docs.docker.com/compose/install/>

## Build image & start containers

- run `docker compose --profile local up -d`
- this will start the reverse proxy on port localhost `8001`
- the reverse proxy server will forward requests to pii-graphql server which runs on localhost `8081`
