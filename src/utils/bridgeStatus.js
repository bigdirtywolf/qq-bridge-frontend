import { reactive } from 'vue'
import config from '../const/config'
import { getBridgeStatus } from './bridge'

/** 两端连接状态的全局响应式副本：顶栏和主页读同一份。 */
export const bridgeStatus = reactive({
    snowLuma: null,
    dsh: null,
})

let timer = null

/** 拉一次后端状态。 */
export async function refreshBridgeStatus() {
    try {
        const data = await getBridgeStatus()
        bridgeStatus.snowLuma = data?.snowLuma ?? null
        bridgeStatus.dsh = data?.dsh ?? null
    } catch {
        // 后端没起来时保留上一次状态，不弹错误提示（轮询会自动重试）。
    }
}

/** 开始轮询；重复调用只保留一个定时器。 */
export function startBridgePolling() {
    if (timer) return
    refreshBridgeStatus()
    timer = setInterval(refreshBridgeStatus, config.statusInterval)
}

/** 停止轮询。 */
export function stopBridgePolling() {
    if (timer) clearInterval(timer)
    timer = null
}
