const config = {
    // 桥接后端地址：开发环境留空走 vite 代理（/bridge → http://localhost:4000），
    // 生产环境可用 VITE_BRIDGE_BASE_URL 指向真实后端。
    baseUrl: import.meta.env.VITE_BRIDGE_BASE_URL || '',
    // 连接状态轮询间隔（毫秒）。
    statusInterval: 3000,
}

export default config
