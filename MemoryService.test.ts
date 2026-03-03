import { describe, it, expect, beforeEach } from "vitest";
import {
  ShortTermMemoryService,
  LongTermMemoryService,
  EntityMemoryService,
  MemoryManager,
  ShortTermMemoryItem,
  LongTermMemoryItem,
} from "./MemoryService";

describe("ShortTermMemoryService", () => {
  let service: ShortTermMemoryService;

  beforeEach(() => {
    service = new ShortTermMemoryService();
  });

  it("should add and retrieve messages", async () => {
    const sessionId = "session-1";
    const message: ShortTermMemoryItem = {
      id: "msg-1",
      timestamp: new Date(),
      content: "Hello",
      role: "user",
      sessionId,
    };

    await service.addMessage(sessionId, message);
    const messages = await service.getMessages(sessionId);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("Hello");
  });

  it("should get recent messages with limit", async () => {
    const sessionId = "session-1";

    for (let i = 0; i < 20; i++) {
      await service.addMessage(sessionId, {
        id: `msg-${i}`,
        timestamp: new Date(),
        content: `Message ${i}`,
        role: "user",
        sessionId,
      });
    }

    const recent = await service.getRecentMessages(sessionId, 5);
    expect(recent).toHaveLength(5);
  });

  it("should clear messages for a session", async () => {
    const sessionId = "session-1";
    await service.addMessage(sessionId, {
      id: "msg-1",
      timestamp: new Date(),
      content: "Hello",
      role: "user",
      sessionId,
    });

    await service.clearMessages(sessionId);
    const messages = await service.getMessages(sessionId);

    expect(messages).toHaveLength(0);
  });
});

describe("LongTermMemoryService", () => {
  let service: LongTermMemoryService;

  beforeEach(() => {
    service = new LongTermMemoryService();
  });

  it("should add and search memories by vector", async () => {
    const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    const memory: LongTermMemoryItem = {
      id: "mem-1",
      timestamp: new Date(),
      content: "User preference",
      userId: "user-1",
      category: "preference",
      embedding,
    };

    await service.addMemory(memory);

    // Search with similar embedding
    const results = await service.searchByVector(embedding, 5);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("mem-1");
  });

  it("should get memories by category", async () => {
    const memory1: LongTermMemoryItem = {
      id: "mem-1",
      timestamp: new Date(),
      content: "Preference 1",
      userId: "user-1",
      category: "preference",
      embedding: [0.1, 0.2, 0.3],
    };

    const memory2: LongTermMemoryItem = {
      id: "mem-2",
      timestamp: new Date(),
      content: "Habit 1",
      userId: "user-1",
      category: "habit",
      embedding: [0.4, 0.5, 0.6],
    };

    await service.addMemory(memory1);
    await service.addMemory(memory2);

    const preferences = await service.getMemoriesByCategory("user-1", "preference");
    expect(preferences).toHaveLength(1);
    expect(preferences[0].category).toBe("preference");
  });

  it("should update memory", async () => {
    const memory: LongTermMemoryItem = {
      id: "mem-1",
      timestamp: new Date(),
      content: "Original content",
      userId: "user-1",
      category: "preference",
      embedding: [0.1, 0.2, 0.3],
    };

    await service.addMemory(memory);
    await service.updateMemory("mem-1", { content: "Updated content" });

    const results = await service.searchByVector([0.1, 0.2, 0.3], 5);
    expect(results[0].content).toBe("Updated content");
  });
});

describe("EntityMemoryService", () => {
  let service: EntityMemoryService;

  beforeEach(() => {
    service = new EntityMemoryService();
  });

  it("should set and get entity state", async () => {
    const vehicleState = {
      speed: 0,
      fuel: 85,
      battery: 85,
      temperature: 22,
    };

    await service.setState("vehicle-1", "vehicle", vehicleState);
    const state = await service.getState("vehicle-1");

    expect(state).not.toBeNull();
    expect(state?.state.speed).toBe(0);
    expect(state?.state.fuel).toBe(85);
  });

  it("should update entity state", async () => {
    const initialState = { speed: 0, fuel: 85 };
    await service.setState("vehicle-1", "vehicle", initialState);

    await service.updateState("vehicle-1", { speed: 50 });
    const state = await service.getState("vehicle-1");

    expect(state?.state.speed).toBe(50);
    expect(state?.state.fuel).toBe(85);
  });

  it("should get all entities", async () => {
    await service.setState("vehicle-1", "vehicle", { speed: 0 });
    await service.setState("vehicle-2", "vehicle", { speed: 50 });

    const all = await service.getAllEntities();
    expect(all).toHaveLength(2);
  });
});

describe("MemoryManager", () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager();
  });

  it("should get conversation context", async () => {
    const sessionId = "session-1";
    const userId = "user-1";
    const vehicleId = "vehicle-1";

    // Add some short-term memory
    await manager.saveMessage(sessionId, {
      id: "msg-1",
      timestamp: new Date(),
      content: "Hello",
      role: "user",
      sessionId,
    });

    // Set vehicle state
    await manager.updateVehicleState(vehicleId, { speed: 0, fuel: 85 });

    const context = await manager.getConversationContext(sessionId, userId, vehicleId);

    expect(context.shortTerm).toHaveLength(1);
    expect(context.entity).not.toBeNull();
    expect(context.entity?.state.fuel).toBe(85);
  });

  it("should search long-term memory by embedding", async () => {
    const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    const memory: LongTermMemoryItem = {
      id: "mem-1",
      timestamp: new Date(),
      content: "User preference",
      userId: "user-1",
      category: "preference",
      embedding,
    };

    await manager.addLongTermMemory(memory);
    const results = await manager.searchLongTermMemory(embedding, 5);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("mem-1");
  });
});
