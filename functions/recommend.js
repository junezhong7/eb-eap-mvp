const rules = require('./rules.json');
const resources = require('./resources.json');
const { createResourceToken } = require('./resourceLink');

function getApiOrigin(request) {
    try {
        const parsed = new URL(request.url);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return '';
    }
}

module.exports = async function (request, context) {
    const introMessage = 'Base on your circumstance, please find the recommended resources as following';
    const q1 = request.query.get('q1');
    const q2 = request.query.get('q2');
    const q3 = request.query.get('q3');
    const apiOrigin = getApiOrigin(request);

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

                const token = createResourceToken(resourceId);
                const query = new URLSearchParams({
                    id: resourceId,
                    exp: String(token.expiresAt),
                    sig: token.signature
                });

                const protectedPath = `/api/resource?${query.toString()}`;
                return {
                    title: resource.text,
                    url: `${apiOrigin}${protectedPath}`
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
