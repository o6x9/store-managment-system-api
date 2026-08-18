const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Turns ?page= & ?limit= into Sequelize limit/offset, with sane bounds. */
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  return { page, limit, offset: (page - 1) * limit };
}

/** Standard envelope for paginated list responses. */
function paginatedResponse({ count, rows }, { page, limit }) {
  return {
    data: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

module.exports = { getPagination, paginatedResponse };
