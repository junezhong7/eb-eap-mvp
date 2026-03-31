const { app } = require('@azure/functions');
const recommendFunction = require('./functions/recommend');
const resourceFunction = require('./functions/resource');

app.http('recommend', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: recommendFunction
});

app.http('resource', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: resourceFunction
});
