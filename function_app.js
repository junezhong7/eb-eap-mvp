const { app } = require('@azure/functions');
const recommendFunction = require('./functions/recommend');

app.http('recommend', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: recommendFunction
});
