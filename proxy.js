const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { parse } = require('graphql');
var bodyParser = require('body-parser')
const fs = require('fs');
const app = express();

const PORT = 8000;

// Set destination host as per the env.
const LOCAL_DESTINATION_HOST = 'http://host.docker.internal:8081';
const DEV_DESTINATION_HOST = 'https://phi.dev.pointmotioncontrol.com';
const STAGE_DESTINATION_HOST = 'https://phi.stage.pointmotioncontrol.com';
const PROD_DESTINATION_HOST = 'https://phi.prod.pointmotioncontrol.com';

const handleRequest = async (req, _, next) => {
  try {
    if (req && req.body && req.body.query) {
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
    }
  } catch (error) {
    console.error(error);
  }
  next();
};

function parseJwt(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

const logAudit = (req) => {
  // console.log(req.headers);

  let logRow;
  const timestamp = new Date().toISOString();
  const request = req.body;

  if (req && req.headers && req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    const parsedToken = parseJwt(token);
    const accessByUserId = parsedToken['https://hasura.io/jwt/claims']['x-hasura-user-id'];
    const accessByUserRole = parsedToken['https://hasura.io/jwt/claims']['x-hasura-default-role'];
    const accessByOrganizationId = parsedToken['https://hasura.io/jwt/claims']['x-hasura-organization-id'];
    logRow = { timestamp, request, accessByUserId, accessByUserRole, accessByOrganizationId };
  }
  else {
    logRow = { timestamp, request, accessByUserRole: 'system' };
  }

  // append the log row to a file
  fs.appendFile('audit.log', JSON.stringify(logRow) + '\n', (err) => {
    if (err) {
      console.error(err);
    }
  });
}

function dynamicTarget(req) {
  // console.log(`x-hasura-env: ${req.headers['x-hasura-env']}`);
  switch (req.headers['x-hasura-env']) {
    case 'local':
      return LOCAL_DESTINATION_HOST;
    case 'development':
      return DEV_DESTINATION_HOST;
    case 'staging':
      return STAGE_DESTINATION_HOST;
    case 'production':
      return PROD_DESTINATION_HOST;
    default:
      throw new Error('Invalid [x-hasura-env] header!');
      break;
  }
}

const graphqlProxy = createProxyMiddleware({
  target: LOCAL_DESTINATION_HOST,
  router: dynamicTarget,
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
    console.log(`Server listening on port http://localhost:${PORT}`);
});
