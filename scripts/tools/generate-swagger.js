const swaggerAutogen = require('swagger-autogen')();
const path = require('path');

const doc = {
  info: {
    title: 'Mycelium ERP API',
    description: 'API Documentation for Mycelium ERP to audit data exposure',
    version: '1.0.0',
  },
  host: 'localhost:3000',
  basePath: '/',
  schemes: ['http'],
};

const outputFile = path.join(__dirname, '../../swagger-output.json');
const endpointsFiles = [path.join(__dirname, '../../backend/server.cjs')];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log('Swagger documentation generated successfully at swagger-output.json');
});
