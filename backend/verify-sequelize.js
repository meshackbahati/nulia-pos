require('dotenv').config();
const { Sequelize } = require('sequelize');

try {
    console.log('Checking pg-native availability...');
    const native = require('pg').native;
    console.log('pg-native is available via require("pg").native. Client type:', typeof native.Client);
} catch (e) {
    console.error('pg-native NOT available:', e.message);
}

// Ensure connection string has sslmode=require if needed by libpq
let url = process.env.***REMOVED***;
if (!url.includes('sslmode=')) {
    console.log('Appending sslmode=require to connection string for libpq');
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
}

const sequelize = new Sequelize(url, {
    dialect: 'postgres',
    dialectOptions: {
        native: true
    },
    logging: false
});

(async () => {
    try {
        console.log('Authenticating...');
        await sequelize.authenticate();
        console.log('Authenticated!');

        // Quick query
        const [results] = await sequelize.query('SELECT version()');
        console.log('Version:', results[0].version);

        process.exit(0);
    } catch (err) {
        console.error('Failed:', err);
        process.exit(1);
    }
})();
