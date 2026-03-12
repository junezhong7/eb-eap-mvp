module.exports = async function (request, context) {
    const q1 = request.query.get('q1');
    const q2 = request.query.get('q2');
    const q3 = request.query.get('q3');

    const responseData = {
        resources: []
    };

    if (q1 === "a1" && q2 === "b1" && q3 === "c1") {
        responseData.resources = [
            {
                title: "Base on your circumstance, we recommend you to check out followwing resources about how to manage work stress.",
                link: "https://emotionalbalance.sharepoint.com/:b:/s/ResourceCenter/IQDgPz6sd0DVS7DUijR-kGzAATR-T84l2OmarbxHTwZA70Q?e=2tJ0c3",
                linkText: "Click here to view the resource" 
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
