<template>
    <div class="setup-container">
        <div class="section">
            <div class="section-title">允许名单</div>
            <div class="input-row">
                <div class="input-text">允许的qq联系人：</div>
                <el-select v-model="allow.private" class="input-control" multiple filterable allow-create default-first-option
                    placeholder="填 QQ 号后回车，可填多个">
                </el-select>
            </div>
            <div class="input-row">
                <div class="input-text">允许的 qq 群：</div>
                <el-select v-model="allow.groups" class="input-control" multiple filterable allow-create default-first-option
                    placeholder="填群号后回车，可填多个（群里只有 @ 机器人时才回）">
                </el-select>
            </div>
            <div class="input-row">
                <div class="input-text">空名单放行全部：</div>
                <el-switch v-model="allow.allowAllWhenEmpty" />
                <div class="tip">关闭时，只有名单里的联系人与群会被回复</div>
            </div>
            <div class="input-row">
                <el-button type="primary" :loading="savingAllow" @click="handleSaveAllow">保存名单</el-button>
            </div>
        </div>

        <div class="section">
            <div class="section-title">人格</div>
            <div class="input-row">
                <div class="input-text">当前人格：</div>
                <el-select v-model="persona.current" class="input-control small" clearable placeholder="不使用人格">
                    <el-option v-for="item in personas" :key="item.name" :label="`${item.name}（${item.chars} 字）`" :value="item.name" />
                </el-select>
                <div class="input-text">注入上限：</div>
                <el-input-number v-model="persona.maxInjectChars" :min="1000" :max="20000" :step="1000" />
                <el-button type="primary" :loading="savingPersona" @click="handleSavePersona">保存设置</el-button>
            </div>
            <div class="input-row">
                <div class="tip">人格卡目录：{{ rolesDir || '-' }}（正文以 Markdown 存在该目录下，每条消息按「人格 + 消息」前缀注入）</div>
            </div>

            <div class="input-row">
                <div class="input-text">人格卡：</div>
                <el-select v-model="editing" class="input-control small" clearable placeholder="选择一份人格卡" @change="handleSelect">
                    <el-option v-for="item in personas" :key="item.name" :label="item.name" :value="item.name" />
                </el-select>
                <el-input v-model="newName" class="input-control small" placeholder="新人格名" />
                <el-button :loading="creating" @click="handleCreate">新建</el-button>
                <el-button :disabled="!editing" @click="handleDelete">删除</el-button>
            </div>

            <el-input v-model="content" class="editor" type="textarea" :rows="16" resize="vertical"
                placeholder="人格卡正文（Markdown）：你是谁、说话风格、性格与反应、回复示例" />

            <div class="input-row actions">
                <el-button type="primary" :loading="savingContent" @click="handleSaveContent">保存人格卡</el-button>
                <el-button :disabled="!editing" @click="handleExport">导出 .md</el-button>
                <el-button @click="triggerImport">导入 .md</el-button>
                <input ref="fileRef" class="file-input" type="file" accept=".md,.markdown,text/markdown" @change="handleImport" />
                <div class="tip" v-if="editing">正在编辑：{{ editing }}.md</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">DSH → QQ 工具</div>
            <div class="input-row">
                <div class="input-text">开放动作：</div>
                <div class="tip">
                    勾选后 DSH 才能把该动作当工具调用；未勾选的动作不会出现在 DSH 的工具清单里。
                    保存时会把 MCP 条目写进 DSH 的 cordis.patch.yml，重启 DSH 后生效。
                </div>
            </div>
            <div class="input-row">
                <el-button size="small" :disabled="toolsLoading" @click="handleToolsDefault">恢复默认安全子集</el-button>
                <el-button size="small" :disabled="toolsLoading" @click="handleToolsAll">全选</el-button>
                <el-button size="small" :disabled="toolsLoading" @click="handleToolsNone">全不选</el-button>
                <div class="tip">已选 {{ toolsEnabled.length }} / {{ toolsActions.length }}</div>
            </div>

            <div class="action-groups">
                <div v-for="group in toolsGroups" :key="group.name" class="action-group">
                    <div class="action-group-title">{{ group.name }}（{{ group.items.length }}）</div>
                    <el-checkbox-group v-model="toolsEnabled" class="action-list">
                        <el-checkbox v-for="item in group.items" :key="item.name" :value="item.name">
                            {{ item.summary || item.name }}
                        </el-checkbox>
                    </el-checkbox-group>
                </div>
            </div>

            <div class="input-row actions">
                <el-button type="primary" :loading="savingTools" @click="handleSaveTools">保存并同步到 DSH</el-button>
                <div class="tip" v-if="!toolsEndpointReady">尚未发现 OneBot 端点：先在主页连接 SnowLuma，DSH 才调得到 QQ</div>
                <div class="tip" v-else-if="toolsDsh && !toolsDsh.ok">DSH 侧未同步：{{ toolsDsh.reason }}</div>
                <div class="tip" v-else-if="toolsDsh && toolsDsh.registered">DSH 侧已挂载：{{ toolsDsh.configPaths.join('、') }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted, reactive, ref } from 'vue'
    import { ElMessage, ElMessageBox } from 'element-plus'
    import {
        createPersona,
        deletePersona,
        getBridgeConfig,
        getPersonaDetail,
        getPersonaList,
        getTools,
        savePersona,
        setBridgeConfig,
        setTools,
    } from '@/utils/bridge'

    const allow = reactive({
        private: [],
        groups: [],
        allowAllWhenEmpty: false,
    })

    const persona = reactive({
        current: null,
        maxInjectChars: 6000,
    })

    const personas = ref([])
    const rolesDir = ref('')
    const editing = ref('')
    const newName = ref('')
    const content = ref('')

    const savingAllow = ref(false)
    const savingPersona = ref(false)
    const savingContent = ref(false)
    const creating = ref(false)
    const fileRef = ref(null)

    /** 「DSH → QQ 工具」的状态：目录按分类分组展示，勾选结果存成动作名数组。 */
    const toolsCategories = ref([])
    const toolsActions = ref([])
    const toolsEnabled = ref([])
    const toolsDefault = ref([])
    const toolsEndpointReady = ref(false)
    const toolsDsh = ref(null)
    const toolsLoading = ref(false)
    const savingTools = ref(false)

    /** 按目录的分类顺序把动作分组，前端一屏看得到每类有多少个、开了几个。 */
    const toolsGroups = computed(() => {
        const bucket = new Map()
        for (const item of toolsActions.value) {
            if (!bucket.has(item.category)) bucket.set(item.category, [])
            bucket.get(item.category).push(item)
        }
        const order = toolsCategories.value.length
            ? toolsCategories.value.map((item) => item.name)
            : [...bucket.keys()]
        return order
            .map((name) => ({ name, items: bucket.get(name) ?? [] }))
            .filter((group) => group.items.length > 0)
    })

    /** 读配置：允许名单 + 当前人格 + 人格卡目录。 */
    const loadConfig = async () => {
        try {
            const data = await getBridgeConfig()
            if (!data) return
            allow.private = data.allow?.private ?? []
            allow.groups = data.allow?.groups ?? []
            allow.allowAllWhenEmpty = data.allow?.allowAllWhenEmpty === true
            persona.current = data.persona?.name ?? null
            persona.maxInjectChars = data.persona?.maxInjectChars ?? 6000
            rolesDir.value = data.rolesDir || ''
        } catch {
            // api 拦截器已经提示过了。
        }
    }

    /** 读人格卡列表。 */
    const loadPersonas = async () => {
        try {
            const data = await getPersonaList()
            personas.value = data?.list ?? []
            rolesDir.value = data?.dir || rolesDir.value
        } catch {
            //
        }
    }

    const handleSaveAllow = async () => {
        savingAllow.value = true
        try {
            await setBridgeConfig({
                allow: {
                    private: allow.private,
                    groups: allow.groups,
                    allowAllWhenEmpty: allow.allowAllWhenEmpty,
                },
            })
            await loadConfig()
            ElMessage.success('名单已保存')
        } catch {
            //
        } finally {
            savingAllow.value = false
        }
    }

    const handleSavePersona = async () => {
        savingPersona.value = true
        try {
            await setBridgeConfig({
                persona: {
                    current: persona.current || null,
                    maxInjectChars: persona.maxInjectChars,
                },
            })
            await loadConfig()
            await loadPersonas()
            ElMessage.success(persona.current ? `已启用「${persona.current}」` : '已关闭人格注入')
        } catch {
            //
        } finally {
            savingPersona.value = false
        }
    }

    /** 选中一份人格卡时把正文读进编辑器。 */
    const handleSelect = async (name) => {
        if (!name) {
            content.value = ''
            return
        }
        try {
            const data = await getPersonaDetail(name)
            content.value = data?.content ?? ''
        } catch {
            content.value = ''
        }
    }

    const handleCreate = async () => {
        const name = newName.value.trim()
        if (!name) {
            ElMessage.warning('请先填新人格名')
            return
        }
        creating.value = true
        try {
            // 正文留空时由后端写入模板。
            const data = await createPersona(name, content.value)
            content.value = data?.content ?? content.value
            editing.value = name
            newName.value = ''
            await loadPersonas()
            ElMessage.success(`已新建「${name}」`)
        } catch {
            //
        } finally {
            creating.value = false
        }
    }

    const handleSaveContent = async () => {
        const name = (editing.value || newName.value).trim()
        if (!name) {
            ElMessage.warning('请先选择或填写人格名')
            return
        }
        savingContent.value = true
        try {
            await savePersona(name, content.value)
            editing.value = name
            newName.value = ''
            await loadPersonas()
            ElMessage.success(`已保存「${name}」`)
        } catch {
            //
        } finally {
            savingContent.value = false
        }
    }

    const handleDelete = async () => {
        try {
            await ElMessageBox.confirm(`确定删除人格「${editing.value}」吗？`, '提示', { type: 'warning' })
        } catch {
            return
        }
        try {
            await deletePersona(editing.value)
            editing.value = ''
            content.value = ''
            await loadPersonas()
            await loadConfig()
            ElMessage.success('已删除')
        } catch {
            //
        }
    }

    /** 把编辑器里的正文导出成本地 .md 文件。 */
    const handleExport = () => {
        if (!editing.value) return
        const blob = new Blob([content.value ?? ''], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${editing.value}.md`
        link.click()
        URL.revokeObjectURL(url)
    }

    const triggerImport = () => {
        fileRef.value?.click()
    }

    /** 读本地 .md：正文填进编辑器，文件名作为人格名，保存时写入后端。 */
    const handleImport = (event) => {
        const file = event.target?.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            content.value = String(reader.result ?? '')
            newName.value = file.name.replace(/\.(md|markdown)$/i, '')
            ElMessage.success(`已读入 ${file.name}，点「保存人格卡」写入`)
        }
        reader.onerror = () => ElMessage.error('读取文件失败')
        reader.readAsText(file, 'utf-8')
        // 清掉 value，同一个文件再选一次也能触发 change。
        event.target.value = ''
    }

    /** 读「DSH → QQ 工具」配置：动作目录 + 已开放名单 + DSH 侧挂载状态。 */
    const loadTools = async () => {
        toolsLoading.value = true
        try {
            const data = await getTools()
            if (!data) return
            toolsCategories.value = data.categories ?? []
            toolsActions.value = data.actions ?? []
            toolsEnabled.value = data.enabled ?? []
            toolsDefault.value = data.defaultEnabled ?? []
            toolsEndpointReady.value = data.endpointReady === true
            toolsDsh.value = data.dsh ?? null
        } catch {
            //
        } finally {
            toolsLoading.value = false
        }
    }

    const handleToolsDefault = () => {
        toolsEnabled.value = [...toolsDefault.value]
    }

    const handleToolsAll = () => {
        toolsEnabled.value = toolsActions.value.map((item) => item.name)
    }

    const handleToolsNone = () => {
        toolsEnabled.value = []
    }

    const handleSaveTools = async () => {
        savingTools.value = true
        try {
            const data = await setTools(toolsEnabled.value)
            if (!data) return
            toolsEnabled.value = data.enabled ?? toolsEnabled.value
            toolsDsh.value = data.dsh ?? toolsDsh.value
            // 名单一定存下来了，只是可能没同步进 DSH（例如本机没装）：如实提示，别报成功。
            if (data.dsh && data.dsh.ok === false) {
                ElMessage.warning(`已保存，但同步到 DSH 失败：${data.dsh.reason ?? '未知原因'}`)
            } else {
                ElMessage.success('已保存，重启 DSH 后生效')
            }
        } catch {
            //
        } finally {
            savingTools.value = false
        }
    }

    onMounted(() => {
        loadConfig()
        loadPersonas()
        loadTools()
    })
</script>

<style scoped>
    .setup-container {
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

    .input-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .input-row.actions {
        margin-bottom: 0;
    }

    .input-text {
        width: 130px;
        color: #666;
        font-size: 13px;
        flex-shrink: 0;
    }

    .input-control {
        flex: 1;
        min-width: 200px;
    }

    .input-control.small {
        flex: 0 0 220px;
    }

    .tip {
        color: #999;
        font-size: 12px;
        line-height: 20px;
    }

    .editor {
        margin-bottom: 12px;
    }

    .editor :deep(textarea) {
        font-family: Consolas, Monaco, 'Courier New', monospace;
        font-size: 13px;
        line-height: 22px;
    }

    .file-input {
        display: none;
    }

    /* 动作目录有近两百条，分组装进固定高度的滚动区，别把整页撑长。 */
    .action-groups {
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: 380px;
        overflow-y: auto;
        padding: 4px 8px 4px 0;
        margin-bottom: 12px;
        border: 1px solid #eeeef5;
        border-radius: 8px;
    }

    .action-group {
        padding: 0 8px;
    }

    .action-group-title {
        font-size: 13px;
        font-weight: 600;
        color: #555;
        margin-bottom: 6px;
    }

    .action-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 18px;
    }

    .action-list :deep(.el-checkbox) {
        margin-right: 0;
        height: 24px;
    }
</style>
