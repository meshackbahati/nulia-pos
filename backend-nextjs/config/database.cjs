require('dotenv').config({ override: true });
const path = require('path');

const databaseUrl = process.env.***REMOVED***;

module.exports = {
    development: {
        url: databaseUrl,
        dialect: 'postgres',
        native: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        logging: console.log,
    },
    production: {
        url: databaseUrl,
        dialect: 'postgres',
        native: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 10,
            min: 2,
            acquire: 60000,
            idle: 10000
        },
        logging: false,
    }
};
