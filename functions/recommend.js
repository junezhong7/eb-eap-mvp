const axios = require('axios');

// 获取 SharePoint Access Token
async function getSharePointAccessToken() {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    
    try {
        const response = await axios.post(tokenUrl, null, {
            params: {
                client_id: process.env.AZURE_CLIENT_ID,
                client_secret: process.env.AZURE_CLIENT_SECRET,
                scope: 'https://graph.microsoft.com/.default',
                grant_type: 'client_credentials'
            }
        });
        
        return response.data.access_token;
    } catch (error) {
        console.error('获取 Token 失败:', error.message);
        throw error;
    }
}

// 查询 SharePoint List 获取推荐规则
async function getRecommendationRule(q1, q2, q3, accessToken, context) {
    const ruleKey = `${q1}|${q2}|${q3}`;
    const siteUrl = process.env.SHAREPOINT_SITE_URL;
    const listName = process.env.SHAREPOINT_LIST_NAME;
    
    // 提取 SharePoint 站点 ID
    const hostName = new URL(siteUrl).hostname;
    const sitePath = new URL(siteUrl).pathname;
    
    try {
        context.log(`📝 查询规则: RuleKey = ${ruleKey}`);
        context.log(`🔗 SharePoint 网站: ${siteUrl}`);
        
        // 首先获取 Site ID
        const siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostName}:${sitePath}`;
        context.log(`🔍 获取 Site ID 请求: ${siteApiUrl}`);
        
        let siteResponse;
        try {
            siteResponse = await axios.get(siteApiUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
        } catch (siteError) {
            context.log(`❌ 获取 Site ID 失败: ${siteError.response?.status} ${JSON.stringify(siteError.response?.data)}`);
            throw siteError;
        }
        
        const siteId = siteResponse.data.id;
        context.log(`✅ Site ID: ${siteId}`);
        
        // 获取 List ID
        const listApiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
        context.log(`🔍 获取 List 请求: ${listApiUrl}`);
        
        let listResponse;
        try {
            listResponse = await axios.get(listApiUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
        } catch (listError) {
            context.log(`❌ 获取 List 失败: ${listError.response?.status} ${JSON.stringify(listError.response?.data)}`);
            throw listError;
        }
        
        const list = listResponse.data.value.find(l => l.displayName === listName);
        if (!list) {
            const availableLists = listResponse.data.value.map(l => l.displayName).join(', ');
            context.log(`❌ List "${listName}" 未找到。可用的 List: ${availableLists}`);
            return null;
        }
        
        const listId = list.id;
        context.log(`✅ List ID: ${listId}`);
        
        // 查询匹配 RuleKey 的项
        const filterUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$filter=fields/RuleKey eq '${ruleKey}'&$expand=fields`;
        context.log(`🔍 查询项请求: ${filterUrl}`);
        
        let itemsResponse;
        try {
            itemsResponse = await axios.get(filterUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
        } catch (itemsError) {
            context.log(`❌ 查询项失败: ${itemsError.response?.status} ${JSON.stringify(itemsError.response?.data)}`);
            throw itemsError;
        }
        
        context.log(`✅ 查询完成。找到 ${itemsResponse.data.value.length} 个匹配项`);
        
        if (itemsResponse.data.value && itemsResponse.data.value.length > 0) {
            const item = itemsResponse.data.value[0];
            const fields = item.fields;
            context.log(`📦 找到的字段: ${JSON.stringify(fields)}`);
            
            return {
                title: fields.ResourceTitle || '',
                link: fields.ResourceLink || '',
                description: fields.Description || ''
            };
        }
        
        context.log(`⚠️ 没有找到匹配 RuleKey="${ruleKey}" 的规则`);
        return null;
    } catch (error) {
        context.log(`❌ 查询 SharePoint List 失败: ${error.message}`);
        return null;
    }
}

module.exports = async function (request, context) {
    const q1 = request.query.get('q1');
    const q2 = request.query.get('q2');
    const q3 = request.query.get('q3');

    const responseData = {
        q1: q1,
        q2: q2,
        q3: q3,
        resources: []
    };

    try {
        // 获取 Access Token
        context.log('🔐 正在获取 Access Token...');
        const accessToken = await getSharePointAccessToken();
        context.log('✅ 成功获取 Access Token');
        
        // 从 SharePoint 查询推荐规则
        const rule = await getRecommendationRule(q1, q2, q3, accessToken, context);
        
        if (rule) {
            context.log('✅ 找到推荐规则，返回资源');
            responseData.resources.push({
                title: rule.title,
                link: rule.link,
                description: rule.description
            });
        } else {
            responseData.message = `⚠️ 未找到匹配 (q1=${q1}, q2=${q2}, q3=${q3}) 的推荐规则`;
            context.log(responseData.message);
        }
    } catch (error) {
        context.log('❌ 错误:', error.message);
        context.log(error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                error: '获取推荐资源失败',
                message: error.message,
                q1: q1,
                q2: q2,
                q3: q3
            }
        };
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
