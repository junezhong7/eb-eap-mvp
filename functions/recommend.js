module.exports = async function (request, context) {
    const q1 = request.query.get('q1');
    const q2 = request.query.get('q2');
    const q3 = request.query.get('q3');

    const responseData = {
        resources: []
    };

    if (q1 === "beginner" && q2 === "api" && q3 === "external") {
        responseData.resources = [
            {
                title: "API Starter Guide",
                link: "https://sharepoint-link"
            }
        ];
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
