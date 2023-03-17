const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { parse } = require('graphql');
var bodyParser = require('body-parser')
const fs = require('fs');

const app = express();

const PORT = 8080;
const DESTINATION_HOST = `http://graphql-engine:8080`;

const handleRequest = async (req, _, next) => {
  try {
    const gqlQuery = req.body.query;
    const parsedQuery = parse(gqlQuery);
  
    const isHealthRecordsQuery = parsedQuery.definitions.some(def => def.kind === 'OperationDefinition' && def.operation === 'query' && def.selectionSet.selections.some(sel => sel.name.value.includes('health_records')));
    if (isHealthRecordsQuery) {
      try {
        logAudit(req);
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
  }
  next();
};

function parseJwt (token) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

const logAudit = (req) => {
    const timestamp = new Date().toISOString();

    const token = req.headers.authorization.split(' ')[1];
    const parsedToken = parseJwt(token);

    const userId = parsedToken['https://hasura.io/jwt/claims']['x-hasura-user-id'];
    const userRole = parsedToken['https://hasura.io/jwt/claims']['x-hasura-default-role'];
    const organizationId = parsedToken['https://hasura.io/jwt/claims']['x-hasura-organization-id'];

    const query = req.body.query;

    const logRow = { timestamp, query, userId, userRole, organizationId };

    // append the log row to a file
    fs.appendFile('audit.log', JSON.stringify(logRow) + '\n', (err) => {
        if (err) {
            console.error(err);
        }
    });
}

const graphqlProxy = createProxyMiddleware({
  target: DESTINATION_HOST,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    if (!req.body || !Object.keys(req.body).length) {
      return;
    }
  
    const contentType = proxyReq.getHeader('Content-Type');
    const writeBody = (bodyData) => {
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    };
  
    if (contentType === 'application/json') {
      writeBody(JSON.stringify(req.body));
    }
  
    if (contentType === 'application/x-www-form-urlencoded') {
      writeBody(querystring.stringify(req.body));
    }
  },
});

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use('/*', handleRequest, graphqlProxy);
 
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});