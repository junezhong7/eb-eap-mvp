const rules = require('./rules.json');
const resources = require('./resources.json');

module.exports = async function (request, context) {
    const q1 = request.query.get('q1');
    const q2 = request.query.get('q2');

    const key = `${q1}_${q2}`;
    const rule = rules[key];

    const responseData = {
        title: null,
        resources: []
    };

    if (rule) {
        responseData.title = rule.title;

        responseData.resources = (rule.resourceIds || [])
            .map(resourceId => resources[resourceId])
            .filter(Boolean)
            .map(resource => ({
                title: resource.text,
                url: resource.url
            }));
    }

    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        jsonBody: responseData
    };
};
