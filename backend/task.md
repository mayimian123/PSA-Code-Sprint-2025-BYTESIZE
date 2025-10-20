任务：写后端中的4个AI板块：

1. Chatbot 
【可以问公司的所有问题 用RAG+Embedding+数据库文件路径Problem Statement 4 - Future-Ready Workforce/backend/data/content_psa.txt】

2. Community@PSA： 
  1. 点击：AI polish icon 
  2. 输入：想在community里面发的内容 + 选择语言风格（Options: Professional, Friendly, Concise）
  3. 输出：完善的polish句子

3. Career Navigator： 
  1. 点击：Personalized job analysis 
  2. 输入：Job description + Staff information 
  3. 输出：（分点呈现）对这个工作的匹配度等信息

4. Learning Hub：AI 
  1. 点击: Is this course recommended？ 
  2. 输入: Course infomation+ Staff skill 
  3. 输出: 生成对课程的推荐理由

参考内容路径：
1. Embedding数据：/Users/laurenma/Desktop/PSA/bytesize/backend/data/content_psa.txt
2. Prompt路径：/Users/laurenma/Desktop/PSA/bytesize/backend/prompt


OpenAI的API
Primary key：498afcc7ed0640548daa3990afa34649
Secondary key：ee34e2b84e2b431bb0a50b675d2dcafc

可以使用的模型：
1. gpt-4.1-mini
deployment-id: gpt-4.1-mini
api-version: 2025-01-01-preview

2. text-embedding-3-small
Embeddings are a numerical representation of text that can be used to measure the relatedness between two pieces of text. Embeddings are useful for search, clustering, recommendations, anomaly detection, and classification tasks.