interface ApiConfig {
  api: {
    encrypt: {
      baseUrl: string
      endpoint: string
      params: {
        qryType: string
      }
    }
    userIdentify: {
      baseUrl: string
      endpoint: string
      suffix: string
    }
  }
  environments?: {
    [key: string]: {
      encryptBaseUrl: string
    }
  }
  currentEnvironment?: string
}

let apiConfig: ApiConfig | null = null

export const loadApiConfig = async (): Promise<ApiConfig> => {
  if (apiConfig) {
    return apiConfig
  }

  try {
    const response = await fetch('/config/api-config.json')
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`)
    }
    apiConfig = await response.json()
    return apiConfig!
  } catch (error) {
    console.error('Failed to load API configuration:', error)
    // 返回默认配置作为fallback
    apiConfig = {
      api: {
        encrypt: {
          baseUrl: 'http://111.186.61.148:8888',
          endpoint: '/lib/auth/encrypt',
          params: {
            qryType: '1'
          }
        },
        userIdentify: {
          baseUrl: 'http://10.119.4.239',
          endpoint: '/docaffiresinterface/userIdentify.aspx',
          suffix: 'sjtulibt'
        }
      }
    }
    return apiConfig
  }
}

export const getApiConfig = (): ApiConfig | null => {
  return apiConfig
}

export const buildEncryptUrl = (config: ApiConfig, qryStr: string, qryType?: string): string => {
  const { endpoint, params } = config.api.encrypt
  const actualQryType = qryType || params.qryType
  
  // 根据环境配置选择基础URL
  let baseUrl = config.api.encrypt.baseUrl
  if (config.environments && config.currentEnvironment) {
    const envConfig = config.environments[config.currentEnvironment]
    if (envConfig?.encryptBaseUrl) {
      baseUrl = envConfig.encryptBaseUrl
    }
  }
  
  return `${baseUrl}${endpoint}?qryType=${actualQryType}&qryStr=${qryStr}`
}

export const buildUserIdentifyUrl = (config: ApiConfig, codeStr: string): string => {
  const { baseUrl, endpoint, suffix } = config.api.userIdentify
  return `${baseUrl}${endpoint}?codeStr=${codeStr}${suffix}`
} 