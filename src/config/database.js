require('dotenv').config({ path: '.env.local' });

module.exports = {
  development: {
    url: process.env.***REMOVED***,
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    logging: process.env.DEBUG_MODE === 'true' ? console.log : false
  },
  test: {
    url: process.env.TEST_***REMOVED*** || process.env.***REMOVED***,
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    logging: false
  },
  production: {
    url: process.env.***REMOVED***,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
};