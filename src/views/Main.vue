<template>
    <div class="main-container">
        <div class="section">
            <div class="section-title">连接设置</div>
            <div class="form-row">
                <span class="label">SnowLuma 目录</span>
                <el-input v-model="form.snowLuma.homeDir" placeholder="留空自动发现，例如 D:\SnowLuma" />
            </div>
            <div class="form-row">
                <span class="label">DSH 地址</span>
                <el-input v-model="form.dsh.baseUrl" placeholder="留空自动识别，例如 http://127.0.0.1:3080" />
            </div>
            <div class="form-row actions">
                <el-button type="primary" :loading="connecting" @click="handleConnect">连接</el-button>
                <el-button :disabled="connecting" @click="handleDisconnect">断开</el-button>
            </div>
        </div>

        <div class="section">
            <div class="section-title">QQ（SnowLuma / OneBot）</div>
            <div class="status-line">状态：{{ statusText(snowLuma?.status) }}</div>
            <div class="status-line">HTTP API：{{ snowLuma?.httpUrl || '-' }}</div>
            <div class="status-line">WebSocket：{{ snowLuma?.wsUrl || '-' }}</div>
            <div class="status-line">访问令牌：{{ snowLuma?.token || '-' }}
                <span v-if="snowLuma?.source" class="dim">（来源 {{ snowLuma.source }}）</span>
            </div>
            <div class="status-line">登录账号：{{ accountText }}</div>
            <div class="status-line">上游心跳：{{ heartbeatText }}</div>
            <div class="status-line error" v-if="snowLuma?.lastError">{{ snowLuma.lastError }}</div>
        </div>

        <div class="section">
            <div class="section-title">DSH</div>
            <div class="status-line">状态：{{ statusText(dsh?.status) }}</div>
            <div class="status-line">服务地址：{{ dsh?.baseUrl || '-' }}
                <span v-if="dsh?.auto" class="dim">（自动识别）</span>
            </div>
            <div class="status-line">端口可连：{{ dsh?.reachable ? '是' : '否' }}</div>
            <div class="status-line">鉴权方式：{{ authText }}</div>
            <div class="status-line">事件流：{{ eventStreamText }}</div>
            <div class="status-line error" v-if="dsh?.lastError">{{ dsh.lastError }}</div>
        </div>
    </div>
</template>

<script setup>
    import { computed, reactive, ref } from 'vue'
    import { ElMessage } from 'element-plus'
    import { connectBridge, disconnectBridge } from '@/utils/bridge'
    import { bridgeStatus, refreshBridgeStatus } from '@/utils/bridgeStatus'

    const form = reactive({
        snowLuma: {
            homeDir: '',
        },
        dsh: {
            baseUrl: '',
        },
    })

    const connecting = ref(false)

    const snowLuma = computed(() => bridgeStatus.snowLuma)
    const dsh = computed(() => bridgeStatus.dsh)

    const accountText = computed(() => {
        const self = snowLuma.value?.self
        return self ? `${self.nickname}（${self.userId}）` : '-'
    })

    const heartbeatText = computed(() => {
        const good = snowLuma.value?.heartbeatGood
        if (good === null || good === undefined) return '未收到心跳'
        return good ? '正常' : '异常（可能收不到消息）'
    })

    const authText = computed(() => {
        const map = {
            minted: '离线铸造 Cookie',
            token: '启动 token 交换',
            none: '未鉴权',
        }
        return map[dsh.value?.authStrategy] || '-'
    })

    const eventStreamText = computed(() => {
        const stream = dsh.value?.eventStream
        if (!stream) return '-'
        if (stream.ready) return '已订阅（$events）'
        return `${statusText(stream.status)}${stream.lastError ? `（${stream.lastError}）` : ''}`
    })

    const statusText = (status) => {
        const map = {
            idle: '未连接',
            connecting: '连接中',
            connected: '已连接',
            disconnected: '已断开',
        }
        return map[status] || '未连接'
    }

    const handleConnect = async () => {
        connecting.value = true
        try {
            // 留空的字段交给后端自动发现。
            await connectBridge({
                snowLuma: form.snowLuma.homeDir ? { homeDir: form.snowLuma.homeDir } : {},
                dsh: form.dsh.baseUrl ? { baseUrl: form.dsh.baseUrl } : {},
            })
            await refreshBridgeStatus()
            ElMessage.success('已发起连接')
        } catch {
            // api 拦截器已经提示过了。
        } finally {
            connecting.value = false
        }
    }

    const handleDisconnect = async () => {
        connecting.value = true
        try {
            await disconnectBridge()
            await refreshBridgeStatus()
            ElMessage.success('已断开连接')
        } catch {
            //
        } finally {
            connecting.value = false
        }
    }
</script>

<style scoped>
    .main-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .section {
        border: 1px solid #e8e8ef;
        border-radius: 10px;
        padding: 16px 20px;
        background: #fafafe;
    }

    .section-title {
        font-size: 15px;
        font-weight: 600;
        color: #333;
        margin-bottom: 12px;
    }

    .form-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .form-row.actions {
        margin-bottom: 0;
    }

    .label {
        width: 110px;
        color: #666;
        font-size: 13px;
        flex-shrink: 0;
    }

    .status-line {
        font-size: 13px;
        line-height: 26px;
        color: #444;
        word-break: break-all;
    }

    .status-line.error {
        color: #e34d4d;
    }

    .dim {
        color: #999;
    }
</style>
