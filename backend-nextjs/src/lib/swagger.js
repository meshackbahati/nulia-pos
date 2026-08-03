import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BorderShop POS API',
            version: '1.0.0',
            description: 'Enterprise POS system API for multi-business operations',
        },
        servers: [
            {
                url: '/',
                description: 'Current server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        './routes/*.js',
        './lib/swagger.js',
    ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
