/**
 * Standardized API success response wrapper.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (2xx)
   * @param {*}      data       - Response payload
   * @param {string} [message]  - Optional human-readable message
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.success    = statusCode < 400;
    this.message    = message;
    this.data       = data;
  }
}

export { ApiResponse };
