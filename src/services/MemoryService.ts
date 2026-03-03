/**
 * MemoryService - 三层记忆管理系统
 */

export interface ShortTermMemoryItem {
  id: string;
  timestamp: Date;
  content: string;
  role: 'user' | 'assistant';
  sessionId: string;
}

export interface LongTermMemoryItem {
  id: string;
  timestamp: Date;
  content: string;
  embedding: number[];
  userId: string;
  category: string;
}

export interface EntityMemoryItem {
  id: string;
  vehicleId: string;
  state: {
    speed: number;
    fuel: number;
    battery: number;
    temperature: number;
    status: string;
  };
  lastUpdated: Date;
}

export interface MemoryContext {
  shortTerm: ShortTermMemoryItem[];
  longTerm: LongTermMemoryItem[];
  entity: EntityMemoryItem | null;
}

export class MemoryManager {
  private shortTermMemory: Map<string, ShortTermMemoryItem[]> = new Map();
  private longTermMemory: Map<string, LongTermMemoryItem[]> = new Map();
  private entityMemory: Map<string, EntityMemoryItem> = new Map();

  async saveMessage(sessionId: string, item: ShortTermMemoryItem): Promise<void> {
    if (!this.shortTermMemory.has(sessionId)) {
      this.shortTermMemory.set(sessionId, []);
    }
    this.shortTermMemory.get(sessionId)!.push(item);

    // 保留最近 50 条消息
    const messages = this.shortTermMemory.get(sessionId)!;
    if (messages.length > 50) {
      this.shortTermMemory.set(sessionId, messages.slice(-50));
    }
  }

  async getConversationContext(sessionId: string, userId: string, vehicleId: string): Promise<MemoryContext> {
    const shortTerm = this.shortTermMemory.get(sessionId) || [];
    const longTerm = this.longTermMemory.get(userId) || [];
    const entity = this.entityMemory.get(vehicleId) || null;

    return { shortTerm, longTerm, entity };
  }

  async saveToLongTerm(userId: string, item: LongTermMemoryItem): Promise<void> {
    if (!this.longTermMemory.has(userId)) {
      this.longTermMemory.set(userId, []);
    }
    this.longTermMemory.get(userId)!.push(item);
  }

  async updateEntityMemory(vehicleId: string, state: EntityMemoryItem['state']): Promise<void> {
    this.entityMemory.set(vehicleId, {
      id: `entity-${vehicleId}`,
      vehicleId,
      state,
      lastUpdated: new Date(),
    });
  }

  getShortTermMemory(sessionId: string): ShortTermMemoryItem[] {
    return this.shortTermMemory.get(sessionId) || [];
  }

  clearSession(sessionId: string): void {
    this.shortTermMemory.delete(sessionId);
  }
}

export const globalMemoryManager = new MemoryManager();
