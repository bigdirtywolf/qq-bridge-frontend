import api from './api'

/**
 * 发起连接。
 *
 * snowLuma / dsh 里的字段都可以留空：留空时由后端自动发现
 * SnowLuma 的端点与令牌、DSH 的端口与凭据。
 */
export function connectBridge(options = {}) {
    return api.post('/bridge/connect', options)
}

/** 断开两端连接。 */
export function disconnectBridge() {
    return api.post('/bridge/disconnect')
}

/** 查询两端连接状态。 */
export function getBridgeStatus() {
    return api.get('/bridge/status')
}
