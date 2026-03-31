const path = require('path');
const resources = require('./resources.json');
const { verifyResourceToken } = require('./resourceLink');

const BLOB_BASE = (process.env.BLOB_BASE_URL
    || 'https://steapresources.blob.core.windows.net/resources').replace(/\/+$/, '');
const BLOB_READ_SAS_TOKEN = (process.env.BLOB_READ_SAS_TOKEN || '').replace(/^\?/, '');

const FALLBACK_CONTENT_TYPE_BY_EXT = {
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg'
};

function toInlineContentDisposition(fileName) {
    const safeFileName = String(fileName || 'resource')
        .replace(/[\r\n]/g, ' ')
        .replace(/["\\]/g, '_');

    const asciiFallback = safeFileName.replace(/[^\x20-\x7E]/g, '_');
    return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`;
}

function buildBlobUrl(resourceId, resourceText) {
    const blobName = `${resourceId}-${resourceText}`;
    const blobUrl = `${BLOB_BASE}/${encodeURIComponent(blobName)}`;
    if (!BLOB_READ_SAS_TOKEN) {
        return blobUrl;
    }

    return `${blobUrl}?${BLOB_READ_SAS_TOKEN}`;
}

module.exports = async function (request, context) {
    const resourceId = request.query.get('id');
    const exp = request.query.get('exp');
    const sig = request.query.get('sig');

    if (!resourceId || !exp || !sig) {
        return {
            status: 400,
            jsonBody: {
                error: 'Missing required query params: id, exp, sig'
            }
        };
    }

    if (!verifyResourceToken(resourceId, exp, sig)) {
        return {
            status: 403,
            jsonBody: {
                error: 'Link is invalid or expired'
            }
        };
    }

    const resource = resources[resourceId];
    if (!resource) {
        return {
            status: 404,
            jsonBody: {
                error: 'Resource not found'
            }
        };
    }

    const blobUrl = buildBlobUrl(resourceId, resource.text);

    let upstreamResponse;
    try {
        upstreamResponse = await fetch(blobUrl);
    } catch (error) {
        context.error(`Failed to fetch blob for ${resourceId}: ${error.message}`);
        return {
            status: 502,
            jsonBody: {
                error: 'Unable to fetch resource file'
            }
        };
    }

    if (!upstreamResponse.ok || !upstreamResponse.body) {
        const statusCode = upstreamResponse.status === 404 ? 404 : 502;
        return {
            status: statusCode,
            jsonBody: {
                error: statusCode === 404 ? 'Resource file not found' : 'Resource file request failed'
            }
        };
    }

    const extension = path.extname(resource.text || '').toLowerCase();
    const contentType = upstreamResponse.headers.get('content-type')
        || FALLBACK_CONTENT_TYPE_BY_EXT[extension]
        || 'application/octet-stream';

    const contentLength = upstreamResponse.headers.get('content-length');
    const responseHeaders = {
        'Content-Type': contentType,
        'Content-Disposition': toInlineContentDisposition(resource.text),
        'Cache-Control': 'private, no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (contentLength) {
        responseHeaders['Content-Length'] = contentLength;
    }

    return {
        status: 200,
        headers: responseHeaders,
        body: upstreamResponse.body
    };
};