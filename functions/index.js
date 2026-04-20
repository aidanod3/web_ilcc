const { onRequest } = require('firebase-functions/v2/https');
const app = require('./server');

exports.api = onRequest(app);
