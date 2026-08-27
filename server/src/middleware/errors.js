const logger = require('../logger');

function notFound(req, res) {
  res.status(404).json({ error: 'not_found', path: req.path });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) logger.error({ err, path: req.path }, 'unhandled error');
  res.status(status).json({
    error: status >= 500 ? 'internal_error' : (err.code || 'bad_request'),
    message: status >= 500 && process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
}

module.exports = { notFound, errorHandler };
