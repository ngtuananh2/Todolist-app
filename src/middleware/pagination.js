// ==================== PAGINATION HELPER ====================

/**
 * Parse pagination params from query string.
 * If not provided, returns defaults that return ALL items (backward compatible).
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, skip: number, hasPagination: boolean }}
 */
function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = parseInt(query.limit) || 0; // 0 = no limit (all items)
  return {
    page,
    limit,
    skip: limit > 0 ? (page - 1) * limit : 0,
    hasPagination: limit > 0
  };
}

/**
 * Build paginated response.
 * @param {Array} items - data items
 * @param {number} total - total count
 * @param {{ page, limit }} opts - pagination opts from parsePagination
 * @returns {{ data, pagination }}
 */
function paginatedResponse(items, total, opts) {
  if (!opts.hasPagination) return items; // backward compatible: just return array

  return {
    data: items,
    pagination: {
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.ceil(total / opts.limit),
      hasNext: opts.page * opts.limit < total,
      hasPrev: opts.page > 1
    }
  };
}

module.exports = { parsePagination, paginatedResponse };
