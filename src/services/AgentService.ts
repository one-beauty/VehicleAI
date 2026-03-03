/**
 * AgentService - 多轮对话 Agent 系统 (使用 Gemini 2.5 Flash)
 */

import { globalMemoryManager, ShortTermMemoryItem } from './MemoryService';
import { globalHybridSearchService, FusedResult } from './RAGService';
import { milvusService, COLLECTIONS } from './MilvusService';
import { userPreferenceService } from './UserPreferenceService';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_API_KEY = 'AIzaSyAWfzEPC7WEeUUc3cutUAlk5oaqgK1VkeI';

// 带重试的 API 调用
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    if (response.ok || response.status !== 429) {
      return response;
    }
    // 429 限流，等待后重试
    const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
    console.log(`⏳ API 限流，等待 ${Math.round(waitTime / 1000)}s 后重试...`);
    await new Promise(r => setTimeout(r, waitTime));
  }
  return fetch(url, options);
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AgentResponse {
  sessionId: string;
  message: string;
  context: {
    retrievedDocuments: FusedResult[];
    memoryUsed: {
      shortTerm: number;
      longTerm: number;
      entity: boolean;
    };
  };
  timestamp: Date;
}

export class LLMCallService {
  async call(systemPrompt: string, userMessage: string, conversationHistory: Message[]): Promise<string> {
    const contents: any[] = [];

    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: '好的，我已经理解了我的角色和能力。请随时向我提问。' }]
    });

    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    try {
      const response = await fetchWithRetry(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error('Unexpected Gemini response:', data);
        throw new Error('Empty response from Gemini');
      }

      return text;
    } catch (error) {
      console.error('LLM call failed:', error);
      return `抱歉，AI 服务暂时不可用。您的请求 "${userMessage}" 已收到，请稍后重试。`;
    }
  }
}

export class AgentService {
  private llmCallService: LLMCallService;

  constructor() {
    this.llmCallService = new LLMCallService();
  }

  async sendMessage(sessionId: string, userId: string, vehicleId: string, userMessage: string): Promise<AgentResponse> {
    // 1. 获取对话上下文
    const context = await globalMemoryManager.getConversationContext(sessionId, userId, vehicleId);

    // 2. 获取用户偏好
    const userPreferences = await userPreferenceService.searchPreferences(userId, userMessage, { topK: 10 });

    // 3. 执行 RAG 检索
    const queryEmbedding = this.generateEmbedding(userMessage);
    const searchResults = await globalHybridSearchService.search(userMessage, queryEmbedding, { finalLimit: 5 });

    // 4. 构建 LLM Prompt
    const systemPrompt = this.buildSystemPrompt(sessionId, userId, vehicleId, context, searchResults.rerankResults || [], userPreferences);

    // 5. 调用 LLM
    const messages: Message[] = context.shortTerm.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    const llmResponse = await this.llmCallService.call(systemPrompt, userMessage, messages);

    // 6. 保存消息到短期记忆
    const userMemoryItem: ShortTermMemoryItem = {
      id: `${sessionId}-${Date.now()}`,
      timestamp: new Date(),
      content: userMessage,
      role: 'user',
      sessionId,
    };

    const assistantMemoryItem: ShortTermMemoryItem = {
      id: `${sessionId}-${Date.now()}-response`,
      timestamp: new Date(),
      content: llmResponse,
      role: 'assistant',
      sessionId,
    };

    await globalMemoryManager.saveMessage(sessionId, userMemoryItem);
    await globalMemoryManager.saveMessage(sessionId, assistantMemoryItem);

    // 7. 将重要对话存入 Milvus 长期记忆
    await this.saveToLongTermMemory(userId, sessionId, userMessage, llmResponse);

    // 8. 提取并保存用户偏好
    await this.extractAndSavePreference(userId, userMessage);

    // 9. 返回响应
    return {
      sessionId,
      message: llmResponse,
      context: {
        retrievedDocuments: searchResults.rerankResults || searchResults.fusedResults,
        memoryUsed: {
          shortTerm: context.shortTerm.length,
          longTerm: context.longTerm.length,
          entity: context.entity !== null,
        },
      },
      timestamp: new Date(),
    };
  }

  private generateEmbedding(text: string): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < 768; i++) {
      embedding.push(Math.sin(text.charCodeAt(i % text.length) + i) * 0.1);
    }
    return embedding;
  }

  private buildSystemPrompt(
    sessionId: string,
    userId: string,
    vehicleId: string,
    context: any,
    retrievedDocuments: FusedResult[],
    userPreferences: any[] = []
  ): string {
    const messagesText = context.shortTerm.map((m: any) => `${m.role}: ${m.content}`).join('\n');
    const docsText = retrievedDocuments.map(doc => `- ${doc.content}`).join('\n');
    const vehicleStateText = context.entity ? JSON.stringify(context.entity.state, null, 2) : '无车辆状态信息';
    const preferencesText = userPreferenceService.formatPreferencesForPrompt(userPreferences);

    // 获取当前时间信息
    const now = new Date();
    const hour = now.getHours();
    const isNight = hour >= 22 || hour < 6;
    const timeContext = `当前时间: ${now.toLocaleString('zh-CN')} (${isNight ? '夜间模式' : '日间模式'})`;

    return `你是一个车载 AI 助手，具有以下能力：
- 语音识别和自然语言理解
- 车辆控制和状态查询
- 信息查询和推荐
- 多轮对话管理

## 🔴 安全规则（必须遵守）
在执行任何操作前，你必须检查以下安全条件：

1. **行驶安全检查**
   - 如果车辆正在行驶（speed > 0），拒绝执行可能分散驾驶员注意力的操作
   - 行驶中禁止：播放大声音乐、复杂导航设置、视频播放等

2. **夜间模式检查**
   - 夜间（22:00-06:00）应降低音量、调暗屏幕亮度
   - 避免在夜间推荐娱乐内容，除非用户明确要求

3. **驾驶员状态检查**
   - 考虑驾驶员疲劳程度，适时提醒休息
   - 长时间驾驶后建议休息

4. **操作确认**
   - 敏感操作（如车门控制、车窗控制）需要用户确认
   - 明确告知操作的影响

## 当前对话信息
- 会话 ID: ${sessionId}
- 用户 ID: ${userId}
- 车辆 ID: ${vehicleId}
- ${timeContext}

## 最近的对话历史
${messagesText || '无历史对话'}

## 当前车辆状态
${vehicleStateText}

## 用户偏好
${preferencesText}

## 检索到的相关文档
${docsText || '无相关文档'}

---

请根据上述信息，为用户提供安全、有帮助的回复。回复要简洁友好。
如果用户的请求可能影响驾驶安全，请礼貌地提醒并建议替代方案。
请根据用户偏好提供个性化服务。`;
  }

  async createSession(sessionId: string, userId: string, vehicleId: string): Promise<void> {
    // 获取当前时间判断是否夜间
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;

    // 初始化会话，包含更完整的车辆状态
    await globalMemoryManager.updateEntityMemory(vehicleId, {
      speed: 0,
      fuel: 85,
      battery: 90,
      temperature: 22,
      status: 'parked', // parked | driving | idle
      isNightMode: isNight,
      drivingDuration: 0, // 分钟
      lastRestTime: new Date().toISOString(),
      volumeLevel: isNight ? 30 : 50,
      screenBrightness: isNight ? 40 : 80,
    });
  }

  async getSessionHistory(sessionId: string): Promise<Message[]> {
    const items = globalMemoryManager.getShortTermMemory(sessionId);
    return items.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
  }

  /**
   * 将重要对话存入 Milvus 长期记忆
   */
  private async saveToLongTermMemory(
    userId: string,
    sessionId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<void> {
    // 检查 Milvus 是否连接
    if (!milvusService.getConnectionStatus()) {
      console.log('⚠️ Milvus 未连接，跳过长期记忆存储');
      return;
    }

    // 判断是否是重要对话（需要存入长期记忆）
    const isImportant = this.isImportantConversation(userMessage, assistantResponse);

    if (!isImportant) {
      return;
    }

    try {
      // 生成对话摘要
      const summary = `用户: ${userMessage}\n助手: ${assistantResponse}`;
      const embedding = this.generateEmbedding(summary);

      // 存入 Milvus
      await milvusService.insert(COLLECTIONS.LONG_TERM_MEMORY, [{
        id: `memory-${userId}-${Date.now()}`,
        content: summary,
        embedding,
        metadata: {
          sessionId,
          type: 'conversation',
        },
        userId,
        category: 'conversation',
        timestamp: Date.now(),
      }]);

      console.log('💾 对话已存入 Milvus 长期记忆');
    } catch (error) {
      console.error('存入 Milvus 失败:', error);
    }
  }

  /**
   * 判断对话是否重要（需要存入长期记忆）
   */
  private isImportantConversation(userMessage: string, assistantResponse: string): boolean {
    // 关键词判断
    const importantKeywords = [
      '记住', '记住我', '我喜欢', '我讨厌', '偏好', '设置',
      '提醒', '日程', '会议', '路线', '导航到', '常去',
      '我的', '帮我', '习惯', '经常', '总是',
    ];

    const lowerMessage = userMessage.toLowerCase();

    // 检查是否包含重要关键词
    for (const keyword of importantKeywords) {
      if (lowerMessage.includes(keyword)) {
        return true;
      }
    }

    // 检查消息长度（长消息可能包含重要信息）
    if (userMessage.length > 50) {
      return true;
    }

    return false;
  }

  /**
   * 从用户消息中提取并保存偏好
   */
  private async extractAndSavePreference(userId: string, userMessage: string): Promise<void> {
    const preference = await userPreferenceService.extractPreferenceFromMessage(userMessage);

    if (preference) {
      preference.userId = userId;
      await userPreferenceService.savePreference(preference);
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    globalMemoryManager.clearSession(sessionId);
  }
}

export const agentService = new AgentService();
