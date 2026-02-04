import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Neon PostgreSQL serverless-optimized connection
const sequelize = new Sequelize(process.env.***REMOVED***!, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: process.env.DEBUG_MODE === 'true' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: false,
    }
});

// Singleton pattern for serverless
let cachedConnection: Sequelize | null = null;

export const getConnection = async (): Promise<Sequelize> => {
    if (cachedConnection) {
        // Reuse existing connection in serverless environment
        return cachedConnection;
    }

    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL (Neon) connection established successfully');
        cachedConnection = sequelize;
        return sequelize;
    } catch (error) {
        console.error('❌ Unable to connect to database:', error);
        throw error;
    }
};

// Test connection
sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connection has been established successfully.');
    })
    .catch((error) => {
        console.error('❌ Unable to connect to the database:', error);
    });

export default sequelize;
