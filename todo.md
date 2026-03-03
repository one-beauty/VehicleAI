# Vehicle AI Voice Gateway & RAG System - TODO

## Backend 后端开发

### 虚拟线程池与网关骨架
- [x] 配置 Express 服务器与虚拟线程池模拟（VirtualThreadPool）
- [x] 实现 WebFlux 风格的异步路由配置（RouteConfig）
- [x] 实现网关中间件：限流、熔断、缓存

### 三层记忆管理系统
- [x] 实现 MemoryService 接口与抽象类
- [x] 实现 ShortTermMemoryService（Redis 模拟）
- [x] 实现 LongTermMemoryService（向量检索模拟）
- [x] 实现 EntityMemoryService（车辆状态）
- [x] 实现记忆管理器（MemoryManager）

### 混合检索 RAG 系统
- [x] 实现 RAGService 接口与抽象类
- [x] 实现 VectorSearchService（向量检索）
- [x] 实现 KeywordSearchService（关键词检索）
- [x] 实现 RRFAlgorithm（RRF 融合算法）
- [x] 实现 RerankService（Rerank 模拟）
- [x] 实现 HybridSearchService（混合检索协调）

### 多轮对话 Agent 系统
- [x] 实现 AgentService 接口与抽象类
- [x] 实现 ConversationContext（对话上下文管理）
- [x] 实现 LLMCallService（LLM 调用模拟）
- [x] 实现 ToolCallService（工具调用）
- [x] 实现 AgentExecutor（Agent 执行器）

### RESTful API 接口
- [x] POST /api/v1/conversation/chat - 多轮对话接口
- [x] GET /api/v1/conversation/{sessionId}/history - 对话历史
- [x] POST /api/v1/memory/query - 记忆查询接口
- [x] POST /api/v1/rag/search - RAG 检索接口
- [x] GET /api/v1/system/status - 系统状态接口
- [x] GET /api/v1/system/metrics - 性能指标接口

## Frontend 前端开发

### 对话界面
- [x] 实现 ChatBox 组件（消息展示、输入框）
- [x] 实现消息流式渲染
- [x] 实现会话管理（新建、切换、删除）

### 记忆可视化
- [x] 实现 MemoryViewer 组件（三层记忆展示）
- [x] 实现 ShortTermMemory 展示（最近对话）
- [x] 实现 LongTermMemory 展示（用户偏好）
- [x] 实现 EntityMemory 展示（车辆状态）

### 检索结果展示
- [x] 实现 RAGResults 组件（检索结果展示）
- [x] 实现 VectorSearchResults 展示
- [x] 实现 KeywordSearchResults 展示
- [x] 实现 RRFScores 展示
- [x] 实现 RerankResults 展示

### 系统监控面板
- [x] 实现 Dashboard 组件（系统概述）
- [x] 实现 MetricsPanel（性能指标）
- [x] 实现 SystemStatus（系统状态）
- [x] 实现 ThreadPoolStatus（虚拟线程池状态）

### 页面路由与布局
- [x] 更新 App.tsx 路由配置
- [x] 实现 AgentPage（主对话页面）
- [x] 实现 MemoryPage（记忆管理页面）
- [x] 实现 RAGPage（检索演示页面）
- [x] 实现 DashboardPage（系统监控页面）

## 测试与文档

- [x] 编写 MemoryService 单元测试
- [x] 编写 RAGService 单元测试
- [x] 编写 AgentService 单元测试
- [x] 编写 API 集成测试
- [x] 编写 README 文档与使用说明
- [x] 编写架构设计文档

## 部署与优化

- [ ] 性能测试与优化
- [ ] 错误处理与日志完善
- [ ] 环境配置与部署准备
