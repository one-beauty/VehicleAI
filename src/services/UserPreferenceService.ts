/**
 * UserPreferenceService - 用户偏好管理服务
 *
 * 使用 Milvus 存储和检索用户偏好信息
 * 混合方案：正则优先，LLM 兜底
 */

import { milvusService, COLLECTIONS } from './MilvusService';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_API_KEY = 'AIzaSyAWfzEPC7WEeUUc3cutUAlk5oaqgK1VkeI';

export interface UserPreference {
  id: string;
  userId: string;
  category: string;  // music, navigation, climate, driving_style, etc.
  key: string;       // preferred_artist, home_address, frequent_route, etc.
  value: string;     // 偏好值
  confidence: number; // 置信度 0-1
  source: string;    // explicit (用户明确表达) | inferred (推断)
  timestamp: number;
}

class UserPreferenceService {
  /**
   * 保存用户偏好
   */
  async savePreference(preference: UserPreference): Promise<boolean> {
    if (!milvusService.getConnectionStatus()) {
      console.warn('Milvus 未连接，跳过偏好存储');
      return false;
    }

    try {
      const content = `${preference.category}: ${preference.key} = ${preference.value}`;
      const embedding = this.generateEmbedding(content);

      await milvusService.insert(COLLECTIONS.USER_PREFERENCES, [{
        id: preference.id,
        content,
        embedding,
        metadata: {
          category: preference.category,
          key: preference.key,
          value: preference.value,
          confidence: preference.confidence,
          source: preference.source,
        },
        userId: preference.userId,
        category: preference.category,
        timestamp: preference.timestamp,
      }]);

      console.log(`💾 用户偏好已保存: ${content}`);
      return true;
    } catch (error) {
      console.error('保存用户偏好失败:', error);
      return false;
    }
  }

  /**
   * 搜索用户偏好
   */
  async searchPreferences(
    userId: string,
    query: string,
    options: { topK?: number; category?: string } = {}
  ): Promise<UserPreference[]> {
    if (!milvusService.getConnectionStatus()) {
      return [];
    }

    try {
      const embedding = this.generateEmbedding(query);
      const results = await milvusService.search(COLLECTIONS.USER_PREFERENCES, embedding, {
        topK: options.topK || 10,
        userId,
        category: options.category,
        threshold: 0.3,
      });

      return results.map(r => ({
        id: r.id,
        userId: r.metadata.userId,
        category: r.metadata.category || '',
        key: r.metadata.key || '',
        value: r.metadata.value || '',
        confidence: r.metadata.confidence || 0.5,
        source: r.metadata.source || 'inferred',
        timestamp: r.metadata.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error('搜索用户偏好失败:', error);
      return [];
    }
  }

  /**
   * 获取用户所有偏好（按类别）
   */
  async getUserPreferencesByCategory(userId: string, category: string): Promise<UserPreference[]> {
    return this.searchPreferences(userId, category, { category, topK: 20 });
  }

  /**
   * 从对话中提取偏好（混合方案：正则优先，LLM 兜底）
   */
  async extractPreferenceFromMessage(userMessage: string): Promise<UserPreference | null> {
    // 1. 先用正则快速匹配
    const regexResult = this.extractWithRegex(userMessage);
    if (regexResult) {
      console.log('📌 正则匹配到偏好:', regexResult.category, regexResult.key, regexResult.value);
      return regexResult;
    }

    // 2. 判断是否值得调用 LLM（包含偏好相关词汇）
    if (!this.mightContainPreference(userMessage)) {
      return null;
    }

    // 3. 用 LLM 提取
    console.log('🤖 正则未匹配，使用 LLM 提取偏好...');
    const llmResult = await this.extractWithLLM(userMessage);
    if (llmResult) {
      console.log('📌 LLM 提取到偏好:', llmResult.category, llmResult.key, llmResult.value);
      return llmResult;
    }

    // 4. LLM 也没提取出来，用通用模式兜底
    return this.extractWithGeneralPattern(userMessage);
  }

  /**
   * 正则提取
   */
  private extractWithRegex(userMessage: string): UserPreference | null {
    const lowerMessage = userMessage.toLowerCase();

    // 音乐偏好
    const musicPatterns = [
      { pattern: /我喜欢听(.+?)的歌/, category: 'music', key: 'preferred_artist' },
      { pattern: /我喜欢(.+?)的音乐/, category: 'music', key: 'preferred_genre' },
      { pattern: /我喜欢(.+?)音乐/, category: 'music', key: 'preferred_genre' },
      { pattern: /我喜欢(.+?)歌/, category: 'music', key: 'preferred_genre' },
      { pattern: /播放(.+?)的歌/, category: 'music', key: 'recent_request' },
      { pattern: /我想听(.+)/, category: 'music', key: 'recent_request' },
      { pattern: /放(.+?)的歌/, category: 'music', key: 'recent_request' },
    ];

    // 导航偏好
    const navPatterns = [
      { pattern: /我(家|公司)在(.+)/, category: 'navigation', key: 'frequent_location' },
      { pattern: /导航到(.+)/, category: 'navigation', key: 'destination' },
      { pattern: /我常去(.+)/, category: 'navigation', key: 'frequent_location' },
      { pattern: /我的路线是(.+)/, category: 'navigation', key: 'frequent_route' },
      { pattern: /带我去(.+)/, category: 'navigation', key: 'destination' },
    ];

    // 气候偏好
    const climatePatterns = [
      { pattern: /我喜欢温度(\d+)/, category: 'climate', key: 'preferred_temp' },
      { pattern: /空调开到(\d+)/, category: 'climate', key: 'preferred_temp' },
      { pattern: /温度调到(\d+)/, category: 'climate', key: 'preferred_temp' },
      { pattern: /我喜欢(.+?)的风/, category: 'climate', key: 'fan_preference' },
    ];

    // 驾驶风格偏好
    const drivingPatterns = [
      { pattern: /我喜欢(.+?)驾驶/, category: 'driving_style', key: 'style' },
      { pattern: /我习惯(.+?)开车/, category: 'driving_style', key: 'habit' },
      { pattern: /我开车比较(.+)/, category: 'driving_style', key: 'style' },
    ];

    const allPatterns = [
      ...musicPatterns,
      ...navPatterns,
      ...climatePatterns,
      ...drivingPatterns,
    ];

    for (const { pattern, category, key } of allPatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        const value = match[1] || match[2] || '';
        if (value) {
          return {
            id: `pref-${category}-${key}-${Date.now()}`,
            userId: '', // 由调用者填充
            category,
            key,
            value: value.trim(),
            confidence: 0.9,
            source: 'explicit',
            timestamp: Date.now(),
          };
        }
      }
    }

    return null;
  }

  /**
   * 通用模式提取（兜底）
   */
  private extractWithGeneralPattern(userMessage: string): UserPreference | null {
    const lowerMessage = userMessage.toLowerCase();

    // 通用偏好模式 - 匹配 "我喜欢XXX" 句式
    const generalMatch = lowerMessage.match(/我喜欢(.+)/);
    if (generalMatch) {
      console.log('📌 通用模式匹配到偏好:', generalMatch[1].trim());
      return {
        id: `pref-general-liked-${Date.now()}`,
        userId: '',
        category: 'general',
        key: 'liked',
        value: generalMatch[1].trim(),
        confidence: 0.6,
        source: 'explicit',
        timestamp: Date.now(),
      };
    }

    // 通用不喜欢模式
    const dislikeMatch = lowerMessage.match(/我(不|不太)喜欢(.+)/);
    if (dislikeMatch) {
      console.log('📌 通用模式匹配到不喜欢:', dislikeMatch[2].trim());
      return {
        id: `pref-general-disliked-${Date.now()}`,
        userId: '',
        category: 'general',
        key: 'disliked',
        value: dislikeMatch[2].trim(),
        confidence: 0.6,
        source: 'explicit',
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * 判断消息是否可能包含偏好（用于决定是否调用 LLM）
   */
  private mightContainPreference(userMessage: string): boolean {
    const preferenceKeywords = [
      '喜欢', '讨厌', '偏好', '习惯', '经常', '总是', '我的',
      '记住', '设置', '默认', '温度', '空调', '音乐', '路线',
      '家', '公司', '常去', '开车', '驾驶',
    ];

    return preferenceKeywords.some(keyword => userMessage.includes(keyword));
  }

  /**
   * 使用 LLM 提取偏好
   */
  private async extractWithLLM(userMessage: string): Promise<UserPreference | null> {
    const prompt = `分析以下用户消息，提取用户偏好信息。

用户消息："${userMessage}"

如果有明确的偏好信息，返回 JSON（只返回 JSON，不要其他内容）：
{"category": "类别", "key": "偏好键", "value": "偏好值", "confidence": 0.8}

类别可选：music（音乐）、navigation（导航）、climate（气候/空调）、driving_style（驾驶风格）、general（通用）

如果没有偏好信息，返回：null

示例：
- "我喜欢流行音乐" → {"category": "music", "key": "preferred_genre", "value": "流行", "confidence": 0.8}
- "我不喜欢太吵的歌" → {"category": "music", "key": "volume_preference", "value": "安静", "confidence": 0.7}
- "你好" → null`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      });

      if (!response.ok) {
        console.error('LLM 提取偏好失败:', response.status);
        return null;
      }

      const data = await response.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text || text === 'null') {
        return null;
      }

      // 去掉 markdown 代码块标记
      text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      // 解析 JSON - 尝试直接解析
      try {
        const parsed = JSON.parse(text);
        return {
          id: `pref-${parsed.category}-${parsed.key}-${Date.now()}`,
          userId: '',
          category: parsed.category,
          key: parsed.key,
          value: parsed.value,
          confidence: parsed.confidence || 0.7,
          source: 'inferred',
          timestamp: Date.now(),
        };
      } catch {
        // 如果直接解析失败，尝试提取 JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.log('⚠️ 未找到有效 JSON');
          return null;
        }

        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            id: `pref-${parsed.category}-${parsed.key}-${Date.now()}`,
            userId: '',
            category: parsed.category,
            key: parsed.key,
            value: parsed.value,
            confidence: parsed.confidence || 0.7,
            source: 'inferred',
            timestamp: Date.now(),
          };
        } catch {
          console.log('⚠️ JSON 解析失败');
          return null;
        }
      }
    } catch (error) {
      console.error('LLM 提取偏好异常:', error);
      return null;
    }
  }

  /**
   * 生成简单的文本 embedding（模拟）
   */
  private generateEmbedding(text: string): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < 768; i++) {
      embedding.push(Math.sin(text.charCodeAt(i % text.length) + i) * 0.1);
    }
    return embedding;
  }

  /**
   * 格式化偏好为文本（用于 prompt）
   */
  formatPreferencesForPrompt(preferences: UserPreference[]): string {
    if (preferences.length === 0) {
      return '暂无用户偏好记录';
    }

    const grouped: Record<string, UserPreference[]> = {};
    for (const pref of preferences) {
      if (!grouped[pref.category]) {
        grouped[pref.category] = [];
      }
      grouped[pref.category].push(pref);
    }

    const lines: string[] = [];
    const categoryNames: Record<string, string> = {
      music: '🎵 音乐偏好',
      navigation: '🗺️ 导航偏好',
      climate: '🌡️ 气候偏好',
      driving_style: '🚗 驾驶风格',
    };

    for (const [category, prefs] of Object.entries(grouped)) {
      const categoryName = categoryNames[category] || category;
      lines.push(`${categoryName}:`);
      for (const pref of prefs.slice(0, 3)) { // 每类最多显示3条
        lines.push(`  - ${pref.key}: ${pref.value}`);
      }
    }

    return lines.join('\n');
  }
}

export const userPreferenceService = new UserPreferenceService();
