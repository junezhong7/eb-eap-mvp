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

// 获取 SharePoint Site ID (使用 REST API)
async function getSharePointSiteId(siteUrl, accessToken, context) {
    try {
        const urlObj = new URL(siteUrl);
        const restApiUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}/_api/site/id`;
        
        context.log(`🔍 使用 REST API 获取 Site ID: ${restApiUrl}`);
        
        const response = await axios.get(restApiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        const siteId = response.data.value;
        context.log(`✅ 获取到 Site ID: ${siteId}`);
        return siteId;
    } catch (error) {
        context.log(`❌ 获取 Site ID 失败: ${error.response?.status} ${error.message}`);
        context.log(`   错误内容: ${JSON.stringify(error.response?.data)}`);
        throw error;
    }
}

// 查询 SharePoint List 获取推荐规则
async function getRecommendationRule(q1, q2, q3, accessToken, context) {
    const ruleKey = `${q1}|${q2}|${q3}`;
    const siteUrl = process.env.SHAREPOINT_SITE_URL;
    const listName = process.env.SHAREPOINT_LIST_NAME;
    
    try {
        context.log(`📝 查询规则: RuleKey = ${ruleKey}`);
        context.log(`🔗 SharePoint 网站: ${siteUrl}`);
        
        // 获取 Site ID
        const siteId = await getSharePointSiteId(siteUrl, accessToken, context);
        
        // 使用 REST API 获取 List ID
        const urlObj = new URL(siteUrl);
        const getListIdUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}/_api/web/lists/getByTitle('${listName}')/id`;
        
        context.log(`🔍 获取 List ID: ${getListIdUrl}`);
        
        let listIdResponse;
        try {
            listIdResponse = await axios.get(getListIdUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
        } catch (listError) {
            context.log(`❌ 获取 List ID 失败: ${listError.response?.status}`);
            context.log(`   错误: ${JSON.stringify(listError.response?.data)}`);
            
            // 尝试获取所有 List 来调试
            const listAllUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}/_api/web/lists`;
            try {
                const allLists = await axios.get(listAllUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                });
                const availableLists = allLists.data.value.map(l => l.Title).join(', ');
                context.log(`   可用的 List: ${availableLists}`);
            } catch (e) {
                context.log(`   无法获取 List 列表`);
            }
            throw listError;
        }
        
        const listId = listIdResponse.data.value;
        context.log(`✅ List ID: ${listId}`);
        
        // 查询匹配 RuleKey 的项
        const itemsUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}/_api/web/lists(guid'${listId}')/items?$filter=RuleKey eq '${ruleKey}'`;
        
        context.log(`🔍 查询项: ${itemsUrl}`);
        
        let itemsResponse;
        try {
            itemsResponse = await axios.get(itemsUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
        } catch (itemsError) {
            context.log(`❌ 查询项失败: ${itemsError.response?.status}`);
            context.log(`   错误: ${JSON.stringify(itemsError.response?.data)}`);
            throw itemsError;
        }
        
        context.log(`✅ 查询完成。找到 ${itemsResponse.data.value.length} 个匹配项`);
        
        if (itemsResponse.data.value && itemsResponse.data.value.length > 0) {
            const item = itemsResponse.data.value[0];
            context.log(`📦 找到的项: ${JSON.stringify(item)}`);
            
            return {
                title: item.ResourceTitle || '',
                link: item.ResourceLink || '',
                description: item.Description || ''
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
