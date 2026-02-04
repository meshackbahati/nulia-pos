require('dotenv').config();
const path = require('path');

module.exports = {
    development: {
        url: process.env.***REMOVED***,
        dialect: 'postgres',
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
        url: process.env.***REMOVED***,
        dialect: 'postgres',
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
