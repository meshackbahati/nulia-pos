import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const databaseUrl = process.env.***REMOVED***;

if (!databaseUrl) {
    console.warn('⚠️ No database URL found (***REMOVED***). Database connection will likely fail.');
}

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    native: false,
    dialectOptions: {
        ssl: {
            rejectUnauthorized: false
        }
    },
    logging: process.env.DEBUG_MODE === 'true' ? console.log : false,
    pool: {
        max: 1, // Serverless-optimized pool: one connection per function instance
        min: 0,
        acquire: 30000,
        idle: 10000,
        idleTimeoutMillis: 10000,
        evict: 10000,
    },
    define: {
        timestamps: true,
        underscored: false,
    }
});

export const getConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connection established successfully');
        return sequelize;
    } catch (error) {
        console.error('❌ Unable to connect to database:', error);
        throw error;
    }
};

export default sequelize;
