const rules = require('./rules.json');
const resources = require('./resources.json');

const BLOB_BASE = process.env.BLOB_BASE_URL
    || 'https://steapresources.blob.core.windows.net/resources';

module.exports = async function (request, context) {
    const introMessage = 'Base on your circumstance, please find the recommended resources as following';
    const q1 = request.query.get('q1');
    const q2 = request.query.get('q2');
    const q3 = request.query.get('q3');

    const key = `${q1}_${q2}`;
    const rule = rules[key];

    const responseData = {
        title: introMessage,
        resources: [],
        supportMessage: null,
        bookingLinkText: 'Book an Online Session',
        bookingUrl: 'https://outlook.office.com/book/EBCounseling@www.emotionalbalance.com.au/?ismsaljsauthenabled'
    };

    if (rule) {
        responseData.resources = (rule.resourceIds || [])
            .map(resourceId => {
                const resource = resources[resourceId];
                if (!resource) return null;

                // Blob naming convention: <ID>-<original file name>
                const fileName = `${resourceId}-${resource.text}`;
                return {
                    title: resource.text,
                    url: `${BLOB_BASE}/${encodeURIComponent(fileName)}`
                };
            })
            .filter(Boolean);
    }

    if (q3 === 'c1' || q3 === 'c2') {
        responseData.supportMessage = 'If you would like to speak to a counselor, please';
    } else if (q3 === 'c3') {
        responseData.supportMessage = 'It looks like you need immediate attention, please';
        responseData.supportMessageSuffix = 'for counselling soon';
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
