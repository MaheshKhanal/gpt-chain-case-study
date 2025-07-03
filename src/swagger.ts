import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Guideline Ingest API',
    version: '1.0.0',
    description: 'API for processing guidelines with GPT chaining',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/server.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJSDoc(options);