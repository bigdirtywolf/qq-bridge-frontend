<template>
    <div class="layout-container">
        <div class="left-bar">
            <div class="header">
                qq-bridge
            </div>
            <div class="routes-container">
                <div class="route" :class="{ active: isActive(item.path) }" v-for="(item, index) in routeItems" :key="index" @click="$router.push(item.path)">
                    {{ item.name }}
                </div>
            </div>
        </div>
        <div class="layout-right">
            <div class="top-bar">
                <span class="status-item">
                    QQ{{ isSnowLumaConnected ? '已连接' : '未连接' }}
                </span>
                <span class="status-item">
                    DSH{{ isDshConnected ? '已连接' : '未连接' }}
                </span>
            </div>
            <div class="view">
                <router-view></router-view>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted, onUnmounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { bridgeStatus, startBridgePolling, stopBridgePolling } from '@/utils/bridgeStatus'

    const router = useRouter()

    const routeItems = [{
        name: '主页',
        path: '/main'
    }, {
        name: '配置',
        path: '/setup'
    }]

    // 顶栏状态来自后端（浏览器不直接连 SnowLuma / DSH）。
    const isSnowLumaConnected = computed(() => bridgeStatus.snowLuma?.status === 'connected')
    const isDshConnected = computed(() => bridgeStatus.dsh?.status === 'connected')

    const isActive = (path) => {
        return router.currentRoute.value.path === path
    }

    onMounted(startBridgePolling)
    onUnmounted(stopBridgePolling)
</script>

<style scoped>
    .layout-container {
        --sidebar-bg: #999fdd;
        --sidebar-active: #a166ea;
        --sidebar-text: #ffffff;
        --topbar-bg: #f5f6fa;
        --topbar-text: #333;
        display: flex;
        flex-direction: row;
        height: 100vh;
        overflow: hidden;
    }

    /* 左侧栏 */
    .left-bar {
        width: 150px;
        height: 100%;
        background: var(--sidebar-bg);
        display: flex;
        flex-direction: column;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
        flex-shrink: 0;
    }

    .header {
        font-size: 20px;
        padding: 24px 12px 16px;
        text-align: center;
        font-weight: bold;
        color: var(--sidebar-text);
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    .routes-container {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        margin-top: 16px;
        padding: 0 8px;
        gap: 4px;
        overflow-y: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .routes-container::-webkit-scrollbar {
        display: none;
    }

    .route {
        color: var(--sidebar-text);
        height: 46px;
        line-height: 46px;
        text-align: center;
        cursor: pointer;
        border-radius: 8px;
        font-size: 14px;
        transition: background 0.25s ease, transform 0.15s ease;
        user-select: none;
    }

    .route:hover {
        background: rgba(255, 255, 255, 0.18);
        transform: translateX(2px);
    }

    .route:active {
        transform: translateX(2px) scale(0.98);
    }

    .route.active {
        background: var(--sidebar-active);
        box-shadow: 0 2px 8px rgba(161, 102, 234, 0.45);
        font-weight: 600;
    }

    /* 右侧区域 */
    .layout-right {
        display: flex;
        flex-direction: column;
        height: 100%;
        flex: 1;
        min-width: 0;
    }

    .top-bar {
        display: flex;
        align-items: center;
        gap: 20px;
        height: 52px;
        padding: 0 24px;
        background: var(--topbar-bg);
        color: var(--topbar-text);
        font-size: 14px;
        font-weight: 500;
        border-bottom: 1px solid #e8e8ef;
        flex-shrink: 0;
    }

    .status-item {
        display: inline-flex;
        align-items: center;
    }

    .view {
        flex: 1;
        height: 100%;
        overflow: auto;
        padding: 20px;
        background: #ffffff;

        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .view::-webkit-scrollbar {
        display: none;
    }
</style>
