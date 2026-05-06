import axios from 'axios'

// Dev without Docker: set VITE_API_URL=http://localhost:8000/api in .env
// Docker / production: nginx proxies /api → backend:8000
const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE, timeout: 60000 })

// Normalise FastAPI validation errors → readable message
api.interceptors.response.use(
  r => r,
  err => {
    const detail = err?.response?.data?.detail
    if (detail) {
      err.message = Array.isArray(detail)
        ? detail.map(d => d.msg || JSON.stringify(d)).join('; ')
        : String(detail)
    }
    return Promise.reject(err)
  }
)

export const getDomains      = ()       => api.get('/domains').then(r => r.data)
export const setDomain       = (key)    => api.post(`/domain/${key}`).then(r => r.data)
export const uploadCSV       = (file)   => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload', fd).then(r => r.data)
}
export const useSampleData   = ()       => api.post('/upload/sample').then(r => r.data)
export const mapColumns      = (body)   => api.post('/map-columns', body).then(r => r.data)
export const prepareData     = (body)   => api.post('/prepare', body).then(r => r.data)
export const trainModel      = (body)   => api.post('/train', body).then(r => r.data)
export const quickTrain      = (body)   => api.post('/train/quick', body).then(r => r.data)
export const getMetrics      = ()       => api.get('/metrics').then(r => r.data)
export const getFeatureImp   = ()       => api.get('/feature-importance').then(r => r.data)
export const getWaterfall    = (idx)    => api.get(`/waterfall/${idx}`).then(r => r.data)
export const getPatients     = ()       => api.get('/patients').then(r => r.data)
export const getSubgroups    = ()       => api.get('/subgroup-analysis').then(r => r.data)
export const getTrainingChart = ()      => api.get('/training-data-chart').then(r => r.data)
export const downloadCert    = ()       => api.post('/generate-certificate', {}, { responseType: 'blob' })
export const healthCheck     = ()       => api.get('/health').then(r => r.data)

export default api
