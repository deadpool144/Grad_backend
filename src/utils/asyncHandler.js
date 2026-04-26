/**
 * Wraps an async Express route handler to forward errors to next().
 * Eliminates try/catch boilerplate in every controller.
 *
 * @param {Function} fn - Async (req, res, next) handler
 * @returns {Function}  Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { asyncHandler };
