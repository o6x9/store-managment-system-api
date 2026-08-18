const { validationResult } = require('express-validator');

/**
 * Runs after an express-validator chain: collects errors and returns 422
 * before the controller ever sees the request.
 */
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(422).json({
    error: 'Validation failed',
    message: 'One or more fields are invalid',
    details: result.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};
