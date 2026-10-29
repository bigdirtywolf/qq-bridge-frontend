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

/**
 * 手动发一条消息。
 *
 * viaDsh 为 true（默认）时后端会先让 DSH 生成回复再发出去；
 * 为 false 时把 text 原样发给 QQ。
 */
export function sendChatMessage({ kind, id, text, viaDsh = true }) {
    return api.post('/bridge/chat', { kind, id, text, viaDsh })
}

/** 最近收发过的消息（默认最近 50 条）。 */
export function getMessages(limit = 50) {
    return api.get('/bridge/messages', { limit })
}

/** 清空消息记录。 */
export function clearMessages() {
    return api.post('/bridge/messages/clear')
}

/** 读取配置：允许名单 + 当前人格 + 人格卡目录。 */
export function getBridgeConfig() {
    return api.get('/bridge/config')
}

/** 保存配置：允许名单与人格的启用状态、注入上限。 */
export function setBridgeConfig({ allow, persona }) {
    return api.post('/bridge/config', { allow, persona })
}

/** 人格卡列表（含当前启用项）。 */
export function getPersonaList() {
    return api.get('/bridge/persona')
}

/** 读取一份人格卡正文。 */
export function getPersonaDetail(name) {
    return api.get('/bridge/persona/detail', { name })
}

/** 新建人格卡；content 留空时后端写入模板。 */
export function createPersona(name, content = '') {
    return api.post('/bridge/persona/create', { name, content })
}

/** 保存人格卡正文（不存在则新建）。 */
export function savePersona(name, content) {
    return api.post('/bridge/persona/save', { name, content })
}

/** 删除人格卡。 */
export function deletePersona(name) {
    return api.post('/bridge/persona/delete', { name })
}

/** 「DSH → QQ」工具配置：完整动作目录 + 已开放名单 + DSH 侧挂载状态。 */
export function getTools() {
    return api.get('/bridge/tools')
}

/** 保存开放的动作名单（传动作名数组），后端会顺带把 MCP 条目同步到 DSH。 */
export function setTools(enabled) {
    return api.post('/bridge/tools', { enabled })
}
