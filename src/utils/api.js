import axios from 'axios'
import { ElMessage } from 'element-plus'
import config from '../const/config'

const request = axios.create({
    baseURL: config.baseUrl,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
})

// 后端统一返回 ResultData：{ code, msg, data }，这里直接解出 data。
request.interceptors.response.use(
    (response) => {
        const result = response.data
        if (result && result.code !== 200) {
            ElMessage.error(result.msg || '请求失败')
            return Promise.reject(new Error(result.msg || '请求失败'))
        }

        return result?.data ?? null
    },
    (error) => {
        console.log(error)
        ElMessage.error(error.message || '网络异常')
        return Promise.reject(error)
    },
)

const api = {
    get: (url, params) => request.get(url, { params }),
    post: (url, data) => request.post(url, data),
}

export default api
