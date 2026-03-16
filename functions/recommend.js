const rules = require('./rules.json');

module.exports = async function (request, context) {
    const q1 = request.query.get('q1');
    const q2 = request.query.get('q2');

    const key = `${q1}_${q2}`;
    const rule = rules[key];

    const responseData = rule
        ? { title: rule.title, links: rule.links }
        : { title: null, links: [] };

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
