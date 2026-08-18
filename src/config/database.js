const { Sequelize } = require('sequelize');
const config = require('./config');

const env = process.env.NODE_ENV || 'development';
const settings = config[env];

const sequelize = new Sequelize(
  settings.database,
  settings.username,
  settings.password,
  {
    host: settings.host,
    port: settings.port,
    dialect: settings.dialect,
    logging: settings.logging,
    define: settings.define,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

module.exports = sequelize;
