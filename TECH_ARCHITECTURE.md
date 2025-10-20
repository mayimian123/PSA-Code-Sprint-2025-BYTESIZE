# PSA ByteSize 技术实现白皮书

---

## 1. 总览架构
```
┌───────────────────────────────┐
│           Frontend            │
│  Next.js 15 (App Router)      │
│  React 19 + CSS Modules       │
│  SWR-like fetchers (api.ts)   │
└───────────────┬───────────────┘
                │REST over HTTPS
┌───────────────▼────────────────┐
│           Backend              │
│  FastAPI + Uvicorn             │
│  Layered Services Architecture │
│  Azure OpenAI Client Wrapper   │
│  Data Repository (CSV/JSON)    │
└───────────────┬────────────────┘
                │Azure OpenAI SDK
┌───────────────▼────────────────┐
│        AI Providers            │
│  Chat Completions (gpt-4.1)    │
│  Embeddings (text-embedding)   │
└───────────────────────────────┘
```
核心思想：前端专注于模块化体验层，后端负责业务编排与 AI 工作流，所有模型调用通过统一的 OpenAIClient 进行治理。

---

## 2. 后端实现（FastAPI）

### 2.1 配置与依赖注入
- `app/config.py` 使用 dataclass + `.env` 自动加载，区分 Chat 与 Embedding 部署。
- `get_settings()` 校验知识库路径、Prompt 目录、数据目录，确保运行时环境完整。
- 所有服务在 `create_app()` 中惰性实例化，便于单元测试与复用。

### 2.2 数据层（DataRepository）
- 读取 `backend/data/` 下的 CSV / JSON（社区、岗位、课程、员工、健康活动）。
- 引入缓存（内存级）以减少 IO。
- 标准化 Course / Job / Wellness 等实体，避免前端处理弱类型数据。

### 2.3 服务层
- **RAGService**：负责 `content_psa.txt` 分块、embedding 缓存与 Top-K 检索，支持自定义 chunk size 与 overlap。
- **ChatbotService**：组合系统 Prompt + 历史对话 + 检索 Context 调用 AI。
- **CommunityPolishService**：构建 JSON Schema 引导润色结果返回 `polished_content`。
- **LearningHubService / CareerNavigatorService**：生成包含结构化 schema 的 prompt，解析模型返回（fallback 逻辑应对非 JSON）。
- **RecommendedQuestionsService**：从 markdown 生成“推荐问题”列表。

### 2.4 API 设计
- `/api/chatbot`：POST；输入 `query + history`，返回回答文本。
- `/api/community/polish`：POST；输入 `content + tone`，返回润色后结果。
- `/api/learning/recommendation`：POST；输入 course/profile，返回 narrative。
- `/api/career/navigator`：POST；输入 job/employee，返回 fit 与各维度评分。
- 其余 GET 接口负责社区、课程、岗位、员工档案、健康活动列表。
- FastAPI 自带 Pydantic 校验，`app/models.py` 定义所有 request/response 模型。

### 2.5 客户端封装（OpenAIClient）
- 使用 AzureOpenAI SDK，统一设置超时、重试与部署 ID。
- `create_chat_completion()` 支持温度、max tokens；`create_embedding()` 批量请求并保持顺序。
- `structured_completion()` 帮助构造 system/user message，用于 JSON Schema 指导。
- `to_json()` 统一解析模型输出，异常时抛出 `ValueError` 供上层 fallback。

---

## 3. 后端 AI Workflow 详解

### 3.1 Prompt 架构
- 所有 Prompt 均存放在 `backend/prompt/`，业务可直接在文件中维护文案与规则。
- 引入 JSON Schema（以 `response` 字段写入）约束模型输出结构：
  ```json
  {
    "format": "json",
    "schema": {
      "type": "object",
      "properties": { ... },
      "required": [...]
    },
    "instructions": [ "语气要求...", "输出条数..." ]
  }
  ```
- 通过这种方式确保 LLM 输出可机读、可被前端展示，且符合业务语气。

### 3.2 PSAiTalk（RAG Chatbot）
1. 用户查询 → `ChatbotService.answer()`。
2. RAGService 分块 + Embedding 检索 Top-K。
3. 组合 system prompt：「你是 PSA 内部助手，基于上下文回答，缺信息时直言」。
4. messages = system + 历史 + user（包含 context + question）。
5. 调用 Chat Completions，返回回答文本。
6. 前端目前仅展示回答（内部保留 chunk 可扩展为 citation）。

### 3.3 Connect@PSA 润色
1. 输入 `content/tone` → JSON.stringify → `structured_completion`。
2. Prompt 包含 tone options + 示例 + JSON schema。
3. 模型返回 JSON，解析 `polished_content`。
4. Fallback：若返回非 JSON，直接 strip 结果，确保用户总能得到润色文本。

### 3.4 Learning Hub 推荐
1. Course + Employee Profile 以 JSON 形式注入 Prompt。
2. Schema 要求输出 `fit_percentage` + narrative（含五大部分）。
3. 返回 narrative，前端以 Markdown 格式渲染（支持 **bold** / 换行）。
4. prompt 目标：解释“为什么推荐”、“如何行动”，增强学习动机。

### 3.5 Career Navigator 分析
1. 输入 Job & Employee 信息。
2. Prompt 指定匹配算法（Functional Alignment / Skill Match / etc.），要求 narrative + dimension scores。
3. 若模型未返回 JSON，fallback 通过文本解析 Fit%与默认维度权重，确保接口不失败。
4. 输出 Fit Percentage、五段 narrative、维度评分，帮助 HR 与员工共创成长计划。

### 3.6 Recommended Questions
- 简单 markdown 解析 → 推荐问题列表 → 前端引导用户提问。

---

## 4. 前端实现（Next.js 15 + React 19）

### 4.1 架构模式
- 使用 App Router 与 `src/app/modules/*` 模块化目录组织页面（psai-talk、connect、learning-hub、career-navigator、wellness、account）。
- 所有 API 调用集中在 `src/lib/api.ts`，统一设置 base URL 与错误处理。
- 通过 `NEXT_PUBLIC_API_BASE_URL` 实现前后端解耦，可在不同环境切换。
- 页面组件大多使用 `use client`，以便处理交互状态（加载、错误、提示）。

### 4.2 UI 细节
- 样式使用 CSS Modules（`*.module.css`），保证样式作用域隔离。
- Markdown 渲染：使用自定义 helper `toSimpleMarkdownHtml` 将 **bold**、`\n` 转换为 `<strong>` 与 `<br />`，避免引入大型 Markdown 依赖。
- 动态状态管理：`useState/useEffect/useMemo` 管理核心交互。
  - Learning Hub：分析按钮触发 AI 调用，成功后显示 Markdown 叙述。
  - Career Navigator：分析结果包含 narrative + 维度列表，使用 `<ul>` 展示评分。
  - Connect@PSA：Tone dropdown + Polish 按钮，润色结果实时展示。
  - PSAiTalk：消息列表 + 建议问题 + Loading 状态提示。

### 4.3 模块划分
- `psai-talk`：聊天头部、推荐提问、对话历史、错误状态。
- `connect`：社区贴文列表、润色控制区、草稿编辑框。
- `learning-hub`：课程筛选 tabs + 列表 + 详情区 + AI 分析面板。
- `career-navigator`：岗位列表 + 详情 + 分析输出（含 Markdown + 维度分项）。
- `wellness`：情绪按钮 + 活动卡片（来自后端推荐）。
- `account`：员工档案基础信息、语言能力等。

---

## 5. 安全性与可扩展性考量
- 环境隔离：后端 `.env` 用于存储 Azure Key/Endpoint，前端 `.env.local` 控制 API base URL。
- 网络调用：OpenAIClient 设置 30 秒超时 + 3 次重试，避免短时网络波动导致失败。
- 异常处理：
  - 后端统一捕获异常并返回 HTTP 500/400。
  - Career/Learning 等服务提供 fallback（文本解析）避免终端失败。
- 数据源扩展：DataRepository 可轻松替换为数据库或 API；当前版本使用静态资产模拟。
- CORS 与部署：可结合 FastAPI `CORSMiddleware` 与 Next.js `npm run build` 部署在不同域名，通过环境变量完成配置。

---

## 6. Prompt 设计与治理策略
| 模块 | Prompt 文件 | 目标 | 关键策略 |
|------|-------------|------|----------|
| PSAiTalk | 内嵌 system prompt | 可靠回答企业知识 | RAG 提供上下文，强调“无答案则坦诚” |
| Connect@PSA | `Connect@PSA_AIPolish.md` | 语气适配跨世代沟通 | Tone 参数 + 示例 + JSON Schema |
| Career Navigator | `Career_Navigator.md` | 岗位匹配分析 | 指定维度权重、五段 narrative、示例 |
| Learning Hub | `Learning_Hub_course_recommend.md` | 课程推荐动机强化 | 定义 Fit%、Strength/Weakness/Advice |

治理要点：
- Prompt 中明确角色、语气、结构，减少模型幻觉。
- JSON Schema 约束输出字段，后端进行严格解析，无法解析时执行 fallback。
- Prompt 文件独立于代码，业务团队可在不改动代码的情况下迭代。

---

## 7. 部署建议与 DevOps
- **Backend**：推荐 Uvicorn + Gunicorn 组合或 Azure App Service。健康检查可通过 `/docs` 或 `/openapi.json`。
- **Frontend**：Next.js 可使用 Vercel、Azure Static Web Apps 或容器化部署，`npm run build` 生成 `.next`。
- **监控**：建议引入 Application Insights / Prometheus 收集 API 延迟与错误；前端可使用 Sentry 记录交互异常。
- **CI/CD**：可通过 GitHub Actions 实现 `lint → test → build → deploy`。后端可加入 `pytest` + `mypy`，前端保持 `npm run lint`。

---

## 8. 后续优化方向
1. **数据联通**：对接 HRIS、LMS、绩效系统，获取实时技能与岗位信息。
2. **反馈闭环**：收集员工对 AI 输出的反馈，动态优化 prompt。
3. **多语言支持**：扩展 prompt 与 UI，服务 PSA 全球化团队。
4. **AI 审计**：记录提示词与响应，便于追踪质量与合规性。

---

## 9. 总结
PSA ByteSize 以分层架构、可治理的 Prompt 工程与模块化前端设计，为“未来就绪的员工队伍”提供了一体化的 AI 平台。后端通过 FastAPI 编排工作流，前端借助 Next.js 呈现沉浸式体验，Sara the Octopus 的每一条触角都连接着员工成长旅程的关键节点：知识、学习、职业、社区与关怀。技术的复杂度是为了把体验做得更简单——让每位 PSA 员工都能在灯塔的照耀下找到前行坐标。
