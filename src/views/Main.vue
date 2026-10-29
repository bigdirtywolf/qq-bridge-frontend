<template>
    <div class="main-container">
        <div class="section">
            <div class="section-title">消息</div>
            <div class="message-list" ref="listRef">
                <div class="message-item" v-for="(item, index) in messages" :key="index">
                    <span class="message-time">{{ timeText(item.at) }}</span>
                    <span class="message-tag" :class="item.direction === 'in' ? 'in' : 'out'">
                        {{ item.direction === 'in' ? '收' : '发' }}
                    </span>
                    <span class="message-tag kind">{{ item.kind === 'group' ? '群' : '私' }}</span>
                    <span class="message-name">{{ item.name }}</span>
                    <span class="message-text">{{ item.text }}</span>
                </div>
                <div class="message-empty" v-if="!messages.length">暂无消息</div>
            </div>

            <div class="send-row">
                <el-select v-model="send.kind" class="send-kind">
                    <el-option label="私聊" value="private" />
                    <el-option label="群聊" value="group" />
                </el-select>
                <el-input v-model="send.id" class="send-id" :placeholder="send.kind === 'group' ? '群号' : 'QQ 号'" />
                <el-input v-model="send.text" class="send-text" placeholder="要发送的内容" @keyup.enter="handleSend" />
                <el-checkbox v-model="send.viaDsh" class="send-via">交给 DSH</el-checkbox>
                <el-button type="primary" :loading="sending" @click="handleSend">发送</el-button>
                <el-button :disabled="sending" @click="handleClear">清空</el-button>
            </div>
        </div>

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
    import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
    import { ElMessage, ElMessageBox } from 'element-plus'
    import { clearMessages, connectBridge, disconnectBridge, getMessages, sendChatMessage } from '@/utils/bridge'
    import { bridgeStatus, refreshBridgeStatus } from '@/utils/bridgeStatus'
    import config from '@/const/config'

    const form = reactive({
        snowLuma: {
            homeDir: '',
        },
        dsh: {
            baseUrl: '',
        },
    })

    const send = reactive({
        kind: 'private',
        id: '',
        text: '',
        viaDsh: true,
    })

    const connecting = ref(false)
    const sending = ref(false)
    const messages = ref([])
    const listRef = ref(null)

    let messageTimer = null

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

    const timeText = (at) => {
        if (!at) return '-'
        const date = new Date(at)
        const pad = (value) => String(value).padStart(2, '0')
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }

    /** 拉到最新消息后滚到底部，不用手动往下拖。 */
    const refreshMessages = async () => {
        try {
            messages.value = (await getMessages(50)) || []
            await nextTick()
            if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
        } catch {
            // 后端没起来时保留上一次列表。
        }
    }

    const handleSend = async () => {
        const id = send.id.trim()
        const text = send.text.trim()
        if (!id) {
            ElMessage.warning(send.kind === 'group' ? '请填群号' : '请填 QQ 号')
            return
        }
        if (!text) {
            ElMessage.warning('请填要发送的内容')
            return
        }

        sending.value = true
        try {
            // 交给 DSH 时要等模型出话，可能比较久；接口本身没有超时压力。
            const result = await sendChatMessage({ kind: send.kind, id, text, viaDsh: send.viaDsh })
            if (result?.sent) {
                ElMessage.success(send.viaDsh ? 'DSH 已生成并发送' : '已发送')
                send.text = ''
            } else {
                // DSH 判定这次没什么好说的：没有内容可发。
                ElMessage.info('DSH 本次没有回复')
            }
            await refreshMessages()
        } catch {
            // api 拦截器已经提示过了。
        } finally {
            sending.value = false
        }
    }

    const handleClear = async () => {
        try {
            await ElMessageBox.confirm('确定清空消息记录吗？', '提示', { type: 'warning' })
        } catch {
            return
        }
        try {
            await clearMessages()
            await refreshMessages()
            ElMessage.success('已清空')
        } catch {
            //
        }
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

    onMounted(() => {
        refreshMessages()
        messageTimer = setInterval(refreshMessages, config.statusInterval)
    })

    onUnmounted(() => {
        if (messageTimer) clearInterval(messageTimer)
        messageTimer = null
    })
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

    /* 消息区 */
    .message-list {
        height: 280px;
        overflow-y: auto;
        border: 1px solid #ececf3;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px 12px;
        margin-bottom: 12px;
    }

    .message-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 13px;
        line-height: 22px;
        padding: 3px 0;
        color: #444;
    }

    .message-time {
        color: #999;
        flex-shrink: 0;
    }

    .message-tag {
        flex-shrink: 0;
        font-size: 12px;
        line-height: 18px;
        padding: 0 6px;
        border-radius: 4px;
        color: #ffffff;
    }

    .message-tag.in {
        background: #7d8ce8;
    }

    .message-tag.out {
        background: #57b28b;
    }

    .message-tag.kind {
        background: #c6c6d3;
    }

    .message-name {
        flex-shrink: 0;
        color: #666;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .message-text {
        word-break: break-all;
        white-space: pre-wrap;
    }

    .message-empty {
        font-size: 13px;
        color: #999;
        line-height: 260px;
        text-align: center;
    }

    .send-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .send-kind {
        width: 100px;
        flex-shrink: 0;
    }

    .send-id {
        width: 150px;
        flex-shrink: 0;
    }

    .send-text {
        flex: 1;
    }

    .send-via {
        flex-shrink: 0;
    }
</style>
