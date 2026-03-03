import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { globalMemoryManager } from "../services/MemoryService";

export const memoryRouter = router({
  /**
   * 获取对话上下文（三层记忆）
   */
  getContext: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        vehicleId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const context = await globalMemoryManager.getConversationContext(
        input.sessionId,
        input.userId,
        input.vehicleId
      );
      return context;
    }),

  /**
   * 获取短期记忆（最近对话）
   */
  getShortTermMemory: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const shortTermService = globalMemoryManager.getShortTermMemoryService();
      const messages = await shortTermService.getRecentMessages(input.sessionId, input.limit);
      return { messages };
    }),

  /**
   * 获取长期记忆（用户偏好）
   */
  getLongTermMemory: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const longTermService = globalMemoryManager.getLongTermMemoryService();
      if (input.category) {
        const memories = await longTermService.getMemoriesByCategory(input.userId, input.category);
        return { memories };
      }
      return { memories: [] };
    }),

  /**
   * 获取车辆状态（实体记忆）
   */
  getVehicleState: publicProcedure
    .input(z.object({ vehicleId: z.string() }))
    .query(async ({ input }) => {
      const state = await globalMemoryManager.getVehicleState(input.vehicleId);
      return { state };
    }),

  /**
   * 更新车辆状态
   */
  updateVehicleState: publicProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        state: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await globalMemoryManager.updateVehicleState(input.vehicleId, input.state);
      return { success: true };
    }),

  /**
   * 清空会话记忆
   */
  clearSessionMemory: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const shortTermService = globalMemoryManager.getShortTermMemoryService();
      await shortTermService.clearMessages(input.sessionId);
      return { success: true };
    }),
});
