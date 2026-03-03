/**
 * MemoryService - 三层记忆管理系统
 * 
 * 模拟 Spring Boot 的 Service 层，实现三层记忆架构：
 * 1. 短期记忆 (ShortTermMemory) - Redis 模拟，存储最近对话
 * 2. 长期记忆 (LongTermMemory) - 向量检索模拟，存储用户偏好
 * 3. 实体记忆 (EntityMemory) - 车辆状态，存储当前环境信息
 */

/**
 * 记忆项基础接口
 */
export interface MemoryItem {
  id: string;
  timestamp: Date;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * 短期记忆项 - 对话历史
 */
export interface ShortTermMemoryItem extends MemoryItem {
  role: 'user' | 'assistant';
  sessionId: string;
  embedding?: number[]; // 可选的 embedding 向量
}

/**
 * 长期记忆项 - 用户偏好
 */
export interface LongTermMemoryItem extends MemoryItem {
  userId: string;
  category: string; // 'preference' | 'habit' | 'history'
  embedding: number[]; // 必须有 embedding 用于向量检索
  relevanceScore?: number;
}

/**
 * 实体记忆项 - 车辆状态
 */
export interface EntityMemoryItem extends MemoryItem {
  entityType: string; // 'vehicle' | 'user' | 'environment'
  entityId: string;
  state: Record<string, any>;
}

/**
 * 记忆查询条件
 */
export interface MemoryQueryOptions {
  limit?: number;
  offset?: number;
  startTime?: Date;
  endTime?: Date;
  category?: string;
  sortBy?: 'timestamp' | 'relevance';
}

/**
 * 短期记忆服务接口
 */
export interface IShortTermMemoryService {
  addMessage(sessionId: string, message: ShortTermMemoryItem): Promise<void>;
  getMessages(sessionId: string, options?: MemoryQueryOptions): Promise<ShortTermMemoryItem[]>;
  clearMessages(sessionId: string): Promise<void>;
  getRecentMessages(sessionId: string, limit: number): Promise<ShortTermMemoryItem[]>;
}

/**
 * 长期记忆服务接口
 */
export interface ILongTermMemoryService {
  addMemory(memory: LongTermMemoryItem): Promise<void>;
  searchByVector(embedding: number[], limit: number): Promise<LongTermMemoryItem[]>;
  updateMemory(id: string, updates: Partial<LongTermMemoryItem>): Promise<void>;
  getMemoriesByCategory(userId: string, category: string): Promise<LongTermMemoryItem[]>;
}

/**
 * 实体记忆服务接口
 */
export interface IEntityMemoryService {
  setState(entityId: string, entityType: string, state: Record<string, any>): Promise<void>;
  getState(entityId: string): Promise<EntityMemoryItem | null>;
  updateState(entityId: string, updates: Record<string, any>): Promise<void>;
  getAllEntities(): Promise<EntityMemoryItem[]>;
}

/**
 * 短期记忆服务实现 - 模拟 Redis
 */
export class ShortTermMemoryService implements IShortTermMemoryService {
  private storage: Map<string, ShortTermMemoryItem[]> = new Map();

  async addMessage(sessionId: string, message: ShortTermMemoryItem): Promise<void> {
    if (!this.storage.has(sessionId)) {
      this.storage.set(sessionId, []);
    }
    const messages = this.storage.get(sessionId)!;
    messages.push(message);

    // 保持最近 50 条消息
    if (messages.length > 50) {
      this.storage.set(sessionId, messages.slice(-50));
    }
  }

  async getMessages(sessionId: string, options?: MemoryQueryOptions): Promise<ShortTermMemoryItem[]> {
    const messages = this.storage.get(sessionId) || [];
    let result = [...messages];

    if (options?.startTime) {
      result = result.filter(m => m.timestamp >= options.startTime!);
    }
    if (options?.endTime) {
      result = result.filter(m => m.timestamp <= options.endTime!);
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || 10;
    return result.slice(offset, offset + limit);
  }

  async clearMessages(sessionId: string): Promise<void> {
    this.storage.delete(sessionId);
  }

  async getRecentMessages(sessionId: string, limit: number): Promise<ShortTermMemoryItem[]> {
    const messages = this.storage.get(sessionId) || [];
    return messages.slice(-limit);
  }
}

/**
 * 长期记忆服务实现 - 模拟向量数据库
 */
export class LongTermMemoryService implements ILongTermMemoryService {
  private storage: Map<string, LongTermMemoryItem> = new Map();
  private embeddings: Map<string, number[]> = new Map();

  async addMemory(memory: LongTermMemoryItem): Promise<void> {
    this.storage.set(memory.id, memory);
    this.embeddings.set(memory.id, memory.embedding);
  }

  async searchByVector(embedding: number[], limit: number): Promise<LongTermMemoryItem[]> {
    // 计算余弦相似度
    const similarities = Array.from(this.storage.values()).map(memory => ({
      memory,
      score: this.cosineSimilarity(embedding, memory.embedding),
    }));

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        ...item.memory,
        relevanceScore: item.score,
      }));
  }

  async updateMemory(id: string, updates: Partial<LongTermMemoryItem>): Promise<void> {
    const memory = this.storage.get(id);
    if (memory) {
      Object.assign(memory, updates);
      if (updates.embedding) {
        this.embeddings.set(id, updates.embedding);
      }
    }
  }

  async getMemoriesByCategory(userId: string, category: string): Promise<LongTermMemoryItem[]> {
    return Array.from(this.storage.values()).filter(
      m => m.userId === userId && m.category === category
    );
  }

  /**
   * 计算两个向量的余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

/**
 * 实体记忆服务实现 - 车辆状态管理
 */
export class EntityMemoryService implements IEntityMemoryService {
  private storage: Map<string, EntityMemoryItem> = new Map();

  async setState(entityId: string, entityType: string, state: Record<string, any>): Promise<void> {
    const item: EntityMemoryItem = {
      id: entityId,
      entityType,
      entityId,
      timestamp: new Date(),
      content: JSON.stringify(state),
      state,
    };
    this.storage.set(entityId, item);
  }

  async getState(entityId: string): Promise<EntityMemoryItem | null> {
    return this.storage.get(entityId) || null;
  }

  async updateState(entityId: string, updates: Record<string, any>): Promise<void> {
    const item = this.storage.get(entityId);
    if (item) {
      item.state = { ...item.state, ...updates };
      item.content = JSON.stringify(item.state);
      item.timestamp = new Date();
    }
  }

  async getAllEntities(): Promise<EntityMemoryItem[]> {
    return Array.from(this.storage.values());
  }
}

/**
 * 记忆管理器 - 协调三层记忆
 */
export class MemoryManager {
  private shortTermMemory: ShortTermMemoryService;
  private longTermMemory: LongTermMemoryService;
  private entityMemory: EntityMemoryService;

  constructor() {
    this.shortTermMemory = new ShortTermMemoryService();
    this.longTermMemory = new LongTermMemoryService();
    this.entityMemory = new EntityMemoryService();
  }

  /**
   * 获取完整的对话上下文（整合三层记忆）
   */
  async getConversationContext(
    sessionId: string,
    userId: string,
    vehicleId: string
  ): Promise<{
    shortTerm: ShortTermMemoryItem[];
    longTerm: LongTermMemoryItem[];
    entity: EntityMemoryItem | null;
  }> {
    const shortTerm = await this.shortTermMemory.getRecentMessages(sessionId, 10);
    const longTerm = await this.longTermMemory.getMemoriesByCategory(userId, 'preference');
    const entity = await this.entityMemory.getState(vehicleId);

    return {
      shortTerm,
      longTerm,
      entity,
    };
  }

  /**
   * 保存对话消息到短期记忆
   */
  async saveMessage(sessionId: string, message: ShortTermMemoryItem): Promise<void> {
    await this.shortTermMemory.addMessage(sessionId, message);
  }

  /**
   * 添加长期记忆
   */
  async addLongTermMemory(memory: LongTermMemoryItem): Promise<void> {
    await this.longTermMemory.addMemory(memory);
  }

  /**
   * 向量搜索长期记忆
   */
  async searchLongTermMemory(embedding: number[], limit: number = 5): Promise<LongTermMemoryItem[]> {
    return await this.longTermMemory.searchByVector(embedding, limit);
  }

  /**
   * 更新车辆状态
   */
  async updateVehicleState(vehicleId: string, state: Record<string, any>): Promise<void> {
    await this.entityMemory.setState(vehicleId, 'vehicle', state);
  }

  /**
   * 获取车辆状态
   */
  async getVehicleState(vehicleId: string): Promise<EntityMemoryItem | null> {
    return await this.entityMemory.getState(vehicleId);
  }

  // 暴露内部服务供直接访问
  getShortTermMemoryService(): ShortTermMemoryService {
    return this.shortTermMemory;
  }

  getLongTermMemoryService(): LongTermMemoryService {
    return this.longTermMemory;
  }

  getEntityMemoryService(): EntityMemoryService {
    return this.entityMemory;
  }
}

// 全局记忆管理器实例
export const globalMemoryManager = new MemoryManager();
