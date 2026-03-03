import { router, publicProcedure } from './trpc';
import { z } from 'zod';
import { agentService } from '../src/services/AgentService';
import { globalHybridSearchService } from '../src/services/RAGService';
import { userPreferenceService } from '../src/services/UserPreferenceService';
import { milvusService, COLLECTIONS } from '../src/services/MilvusService';

export const appRouter = router({
  agent: router({
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

    getSessionHistory: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const history = await agentService.getSessionHistory(input.sessionId);
        return { messages: history };
      }),

    clearSession: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await agentService.clearSession(input.sessionId);
        return { success: true };
      }),
  }),

  // RAG 文档管理
  rag: router({
    addDocument: publicProcedure
      .input(
        z.object({
          id: z.string(),
          content: z.string(),
          keywords: z.array(z.string()).optional(),
          userId: z.string().optional(),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // 生成模拟 embedding
        const embedding: number[] = [];
        for (let i = 0; i < 768; i++) {
          embedding.push(Math.sin(input.content.charCodeAt(i % input.content.length) + i) * 0.1);
        }

        const success = await globalHybridSearchService.addDocumentToMilvus(
          {
            id: input.id,
            content: input.content,
            embedding,
            keywords: input.keywords || [],
          },
          input.userId,
          input.category
        );
        return { success };
      }),

    search: publicProcedure
      .input(
        z.object({
          query: z.string(),
          userId: z.string().optional(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const embedding: number[] = [];
        for (let i = 0; i < 768; i++) {
          embedding.push(Math.sin(input.query.charCodeAt(i % input.query.length) + i) * 0.1);
        }

        const results = await globalHybridSearchService.search(input.query, embedding, {
          finalLimit: input.limit || 5,
          userId: input.userId,
        });
        return results;
      }),
  }),

  // 用户偏好管理
  preferences: router({
    getPreferences: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          category: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        if (input.category) {
          const prefs = await userPreferenceService.getUserPreferencesByCategory(
            input.userId,
            input.category
          );
          return { preferences: prefs };
        }
        const prefs = await userPreferenceService.searchPreferences(input.userId, '', { topK: 20 });
        return { preferences: prefs };
      }),

    addPreference: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          category: z.string(),
          key: z.string(),
          value: z.string(),
          source: z.enum(['explicit', 'inferred']).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const success = await userPreferenceService.savePreference({
          id: `pref-${input.userId}-${input.category}-${Date.now()}`,
          userId: input.userId,
          category: input.category,
          key: input.key,
          value: input.value,
          confidence: 0.9,
          source: input.source || 'explicit',
          timestamp: Date.now(),
        });
        return { success };
      }),
  }),

  // Milvus 状态
  milvus: router({
    status: publicProcedure.query(() => {
      return {
        connected: milvusService.getConnectionStatus(),
        collections: Object.values(COLLECTIONS),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
