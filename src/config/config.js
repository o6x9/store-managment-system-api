/**
 * Sequelize CLI configuration.
 * Used by `npx sequelize-cli db:migrate`, `db:seed:all`, etc.
 * The runtime connection (src/config/database.js) reads the same env vars.
 */
require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'store_management',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    underscored: true,
    freezeTableName: false,
  },
};

module.exports = {
  development: base,
  test: { ...base, database: `${base.database}_test` },
  production: {
    ...base,
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
    },
  },
};
