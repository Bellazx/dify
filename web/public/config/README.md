# API配置说明

## 配置文件位置
- `api-config.json` - API接口配置文件

## 配置结构

```json
{
  "api": {
    "encrypt": {
      "baseUrl": "http://127.0.0.1:8888",
      "endpoint": "/lib/auth/encrypt",
      "params": {
        "qryType": "1"
      }
    },
    "userIdentify": {
      "baseUrl": "http://10.119.4.239",
      "endpoint": "/docaffiresinterface/userIdentify.aspx",
      "suffix": "sjtulibt"
    }
  }
}
```

## 配置项说明

### encrypt 加密接口配置
- `baseUrl`: 基础URL
- `endpoint`: 接口端点
- `params.qryType`: 查询类型参数

### userIdentify 用户身份验证接口配置
- `baseUrl`: 基础URL
- `endpoint`: 接口端点
- `suffix`: URL后缀

## 使用方式

1. 修改 `api-config.json` 文件中的配置项
2. 重启前端应用，配置将在组件初始化时自动加载
3. 如果配置加载失败，系统会使用默认配置作为fallback

## 注意事项

- 配置文件必须是有效的JSON格式
- 修改配置后需要刷新页面才能生效
- 如果配置文件不存在或格式错误，系统会使用代码中的默认配置 