# EAP MVP - Azure Functions

简单的 Azure Function App，用于 EAP MVP 项目。

## 项目结构

```text
.
├── function_app.js           # 主入口文件
├── functions/
│   └── recommend.js          # HTTP Trigger Function - 推荐 API
├── host.json                 # Azure Functions 配置
├── local.settings.json       # 本地开发设置
├── package.json              # 依赖管理
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 安装 Azure Functions Core Tools

确保已安装 [Azure Functions Core Tools](https://learn.microsoft.com/zh-cn/azure/azure-functions/functions-run-local)

### 3. 在本地运行

```bash
npm start
# 或
func start
```

函数应该会在 `http://localhost:7071` 运行

## 资源访问安全配置

为了避免前端暴露 Blob 直链，项目使用了短时签名链接：

- `RESOURCE_LINK_SECRET` - 签名密钥（生产环境必须设置为随机高强度字符串）
- `RESOURCE_LINK_TTL_SECONDS` - 链接有效期（秒），默认 `300`，最大 `3600`
- `BLOB_BASE_URL` - 资源 Blob 容器基础地址（不带文件名）
- `BLOB_READ_SAS_TOKEN` - 可选，后端读取私有 Blob 容器时使用（不要暴露到前端）

`/api/recommend` 会返回 `/api/resource` 的签名地址，资源文件通过后端代理输出，并带 `Content-Disposition: inline` 与 `no-store` 缓存策略。

建议将 Blob 容器设置为私有，并仅通过 `/api/resource` 访问。

## API 端点

### GET /api/recommend

根据三个查询参数返回推荐资源。

**查询参数：**

- `q1` - 用户级别 (e.g., "beginner")
- `q2` - 主题 (e.g., "api")
- `q3` - 类型 (e.g., "external")

**示例：**

```http
GET http://localhost:7071/api/recommend?q1=beginner&q2=api&q3=external
```

**响应（成功匹配）：**

```json
{
  "resources": [
    {
      "title": "API Starter Guide",
      "url": "https://sharepoint-link"
    }
  ]
}
```

**响应（不匹配）：**

```json
{
  "resources": []
}
```

## 测试

使用 curl 或 Postman 测试 API：

```bash
# 返回资源
curl "http://localhost:7071/api/recommend?q1=beginner&q2=api&q3=external"

# 返回空资源
curl "http://localhost:7071/api/recommend?q1=intermediate&q2=database&q3=internal"
```

## 下一步

- [ ] 连接 SharePoint 数据源
- [ ] 扩展硬编码逻辑为动态推荐
- [ ] 添加更多查询参数
- [ ] 部署到 Azure

## 相关资源

- [Azure Functions JavaScript 开发指南](https://learn.microsoft.com/zh-cn/azure/azure-functions/functions-reference-node)
- [HTTP Trigger 函数](https://learn.microsoft.com/zh-cn/azure/azure-functions/functions-bindings-http-webhook)
