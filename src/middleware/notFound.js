module.exports = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
};
