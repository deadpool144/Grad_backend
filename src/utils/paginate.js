/**
 * Parse pagination params from query string with safe defaults.
 * @param {object} query - req.query
 * @param {number} [defaultLimit=20]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const parsePage = (query, defaultLimit = 20) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Build a standard paginated response envelope.
 * @param {any[]}  data
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 */
export const paginateResult = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
  },
});
