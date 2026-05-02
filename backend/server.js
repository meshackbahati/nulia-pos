import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import sequelize from './lib/database.js';

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Store io instance in app for access in routes
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    socket.on('join-branch', (branchId) => {
        socket.join(`branch-${branchId}`);
        console.log(`🏢 Socket ${socket.id} joined branch-${branchId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

async function startServer() {
    // Try to authenticate database but don't block server startup
    sequelize.authenticate({ alter: true })
        .then(() => console.log('✅ Connected to PostgreSQL database'))
        .catch(error => console.error('⚠️ Database connection failed, but server starting anyway:', error.message));

    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Health check: http://localhost:${PORT}/health`);
    });
}

startServer();

export { io };
