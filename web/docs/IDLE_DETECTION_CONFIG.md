# 空闲检测配置说明

## 概述

空闲检测功能允许在用户长时间无操作时自动重置对话。该功能的时间参数已经配置化，可以通过环境变量进行自定义。

## 配置参数

### 环境变量

可以通过以下环境变量来配置空闲检测的行为：

| 环境变量 | 描述 | 默认值 | 单位 |
|---------|------|--------|------|
| `NEXT_PUBLIC_IDLE_TIMEOUT` | 总空闲超时时间 | 45000 | 毫秒 |
| `NEXT_PUBLIC_IDLE_WARNING_TIME` | 警告倒计时时间 | 15000 | 毫秒 |

### 参数说明

- **总空闲超时时间 (TOTAL_TIMEOUT)**：用户无操作多长时间后触发自动重置
- **警告倒计时时间 (WARNING_TIME)**：在触发重置前多长时间开始显示倒计时警告
- **倒计时更新间隔 (COUNTDOWN_INTERVAL)**：倒计时更新的频率，固定为1000毫秒（1秒）

## 使用示例

### 1. 开发环境配置

在项目根目录的 `.env.local` 文件中添加：

```bash
# 设置60秒空闲超时，最后20秒显示警告
NEXT_PUBLIC_IDLE_TIMEOUT=60000
NEXT_PUBLIC_IDLE_WARNING_TIME=20000
```

### 2. 生产环境配置

在部署时设置环境变量：

```bash
# Docker 部署
docker run -e NEXT_PUBLIC_IDLE_TIMEOUT=30000 -e NEXT_PUBLIC_IDLE_WARNING_TIME=10000 ...

# 或者在 docker-compose.yml 中
environment:
  - NEXT_PUBLIC_IDLE_TIMEOUT=30000
  - NEXT_PUBLIC_IDLE_WARNING_TIME=10000
```

### 3. 常见配置场景

#### 快速测试（10秒超时，5秒警告）
```bash
NEXT_PUBLIC_IDLE_TIMEOUT=10000
NEXT_PUBLIC_IDLE_WARNING_TIME=5000
```

#### 标准配置（45秒超时，15秒警告）
```bash
NEXT_PUBLIC_IDLE_TIMEOUT=45000
NEXT_PUBLIC_IDLE_WARNING_TIME=15000
```

#### 长时间会话（5分钟超时，30秒警告）
```bash
NEXT_PUBLIC_IDLE_TIMEOUT=300000
NEXT_PUBLIC_IDLE_WARNING_TIME=30000
```

#### 禁用功能（设置很大的值）
```bash
NEXT_PUBLIC_IDLE_TIMEOUT=86400000  # 24小时
NEXT_PUBLIC_IDLE_WARNING_TIME=60000  # 1分钟
```

## 功能流程

1. **正常期**：用户在界面上操作，空闲计时器重置
2. **警告期**：达到 `(TOTAL_TIMEOUT - WARNING_TIME)` 时开始显示倒计时警告
3. **重置期**：达到 `TOTAL_TIMEOUT` 时自动重置对话并清空用户身份

## 注意事项

### 参数验证

系统会自动验证配置参数的合法性：

- `WARNING_TIME` 必须小于 `TOTAL_TIMEOUT`
- 所有时间参数必须为正数
- 如果配置不合法，控制台会显示警告信息

### 性能考虑

- 倒计时更新间隔固定为1秒，不建议修改
- 过短的超时时间可能影响用户体验
- 建议 `WARNING_TIME` 至少设置5秒以上，给用户足够的反应时间

### 浏览器兼容性

该功能监听以下浏览器事件来检测用户活动：
- `mousedown`、`mousemove`
- `keypress`、`keydown`、`input`
- `scroll`、`touchstart`、`click`

## 调试

在开发环境中，你可以在浏览器控制台看到空闲检测的日志信息：

```javascript
// 当用户空闲超时时
console.log('用户已空闲超过45秒，强制重新开始对话...')
```

## 更新配置

修改环境变量后需要重启应用才能生效：

```bash
# 开发环境
npm run dev

# 生产环境
npm run build && npm start
``` 