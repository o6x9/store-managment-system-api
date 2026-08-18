/**
 * Error with an attached HTTP status code.
 * Anything thrown that is not an ApiError is treated as a 500 by the error handler.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details) {
    return new ApiError(400, msg, details);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg = 'Resource already exists') {
    return new ApiError(409, msg);
  }

  static unprocessable(msg = 'Unprocessable entity', details) {
    return new ApiError(422, msg, details);
  }
}

module.exports = ApiError;
