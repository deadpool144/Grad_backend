/**
 * Standardized API error class.
 * Extends native Error so Express error middleware can detect it.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   * @param {string} message    - Human-readable error message
   * @param {string[]} [errors] - Optional field-level validation errors
   */
  constructor(statusCode, message = "Something went wrong", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.success    = false;
    this.message    = message;
    this.errors     = errors;
  }
}

export { ApiError };
