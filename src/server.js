const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL connection established');

    // Handy in development; use migrations in production.
    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      console.log('✓ Models synced');
    }

    const server = app.listen(PORT, () => {
      console.log(`✓ API listening on http://localhost:${PORT}/api/v1`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down...`);
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('✗ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
