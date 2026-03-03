import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { AgentService } from "../services/AgentService";
import { globalMemoryManager } from "../services/MemoryService";
import { globalHybridSearchService } from "../services/RAGService";

// 初始化 Agent 服务
const agentService = new AgentService(globalMemoryManager, globalHybridSearchService);

export const agentRouter = router({
  /**
   * 发送消息到 Agent
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        vehicleId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const response = await agentService.sendMessage(
        input.sessionId,
        input.userId,
        input.vehicleId,
        input.message
      );
      return response;
    }),

  /**
   * 创建新会话
   */
  createSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        vehicleId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await agentService.createSession(input.sessionId, input.userId, input.vehicleId);
      return { success: true };
    }),

  /**
   * 获取会话历史
   */
  getSessionHistory: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const history = await agentService.getSessionHistory(input.sessionId);
      return { messages: history };
    }),

  /**
   * 清空会话
   */
  clearSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      await agentService.clearSession(input.sessionId);
      return { success: true };
    }),
});
