import app from './app.js';
import sequelize from './lib/database.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
    // Try to authenticate database but don't block server startup
    sequelize.authenticate({ alter: true })
        .then(() => console.log('✅ Connected to PostgreSQL database'))
        .catch(error => console.error('⚠️ Database connection failed, but server starting anyway:', error.message));

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Health check: http://localhost:${PORT}/health`);
    });
}

startServer();
