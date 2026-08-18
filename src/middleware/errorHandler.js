const {
  ValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  DatabaseError,
} = require('sequelize');
const ApiError = require('../utils/ApiError');

/* eslint-disable no-unused-vars */
module.exports = (err, req, res, next) => {
  // Sequelize model validation + unique constraint violations
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      error: 'Conflict',
      message: err.errors?.[0]?.message || 'Resource already exists',
      details: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  if (err instanceof ValidationError) {
    return res.status(422).json({
      error: 'Validation failed',
      message: 'One or more fields are invalid',
      details: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Related record is missing or still referenced by other records',
      details: { table: err.table, fields: err.fields },
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.statusCode >= 500 ? 'Internal server error' : 'Request failed',
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof DatabaseError) {
    console.error('[db]', err.message);
    return res.status(500).json({ error: 'Database error', message: 'Could not complete the request' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Bad request', message: 'Request body is not valid JSON' });
  }

  console.error('[unhandled]', err);
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
};
