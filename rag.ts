import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { globalHybridSearchService, Document } from "../services/RAGService";

// 初始化示例文档
const initializeSampleDocuments = () => {
  const sampleDocs: Document[] = [
    {
      id: "doc1",
      content: "车载 AI 助手支持语音识别、自然语言理解、车辆控制等功能。",
      embedding: generateEmbedding("车载 AI 助手支持语音识别、自然语言理解、车辆控制等功能。"),
      keywords: ["车载", "AI", "助手", "语音识别", "车辆控制"],
      metadata: { category: "功能介绍" },
    },
    {
      id: "doc2",
      content: "车辆的油量充足，电池电量 85%，所有系统正常运行。最近一次保养是在上个月。",
      embedding: generateEmbedding("车辆的油量充足，电池电量 85%，所有系统正常运行。最近一次保养是在上个月。"),
      keywords: ["车辆", "油量", "电池", "保养", "系统"],
      metadata: { category: "车辆状态" },
    },
    {
      id: "doc3",
      content: "导航功能可以为您规划最优路线，支持实时路况查询和语音导航。",
      embedding: generateEmbedding("导航功能可以为您规划最优路线，支持实时路况查询和语音导航。"),
      keywords: ["导航", "路线", "路况", "语音"],
      metadata: { category: "功能介绍" },
    },
    {
      id: "doc4",
      content: "音乐播放功能支持多种音乐格式，可以连接到您的音乐库或在线音乐服务。",
      embedding: generateEmbedding("音乐播放功能支持多种音乐格式，可以连接到您的音乐库或在线音乐服务。"),
      keywords: ["音乐", "播放", "音乐库", "在线服务"],
      metadata: { category: "功能介绍" },
    },
    {
      id: "doc5",
      content: "天气预报显示今天晴天，温度在 20-25 摄氏度之间，建议穿着舒适的衣服。",
      embedding: generateEmbedding("天气预报显示今天晴天，温度在 20-25 摄氏度之间，建议穿着舒适的衣服。"),
      keywords: ["天气", "晴天", "温度", "预报"],
      metadata: { category: "天气信息" },
    },
  ];

  sampleDocs.forEach(doc => globalHybridSearchService.addDocument(doc));
};

// 生成 Embedding（模拟）
function generateEmbedding(text: string): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < 768; i++) {
    embedding.push(Math.sin(text.charCodeAt(i % text.length) + i) * 0.1);
  }
  return embedding;
}

// 初始化示例文档
initializeSampleDocuments();

export const ragRouter = router({
  /**
   * 执行混合检索
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        useRerank: z.boolean().default(true),
        finalLimit: z.number().default(5),
      })
    )
    .query(async ({ input }) => {
      const queryEmbedding = generateEmbedding(input.query);
      const results = await globalHybridSearchService.search(
        input.query,
        queryEmbedding,
        {
          vectorLimit: 20,
          keywordLimit: 20,
          finalLimit: input.finalLimit,
          useRerank: input.useRerank,
        }
      );
      return results;
    }),

  /**
   * 添加文档到索引
   */
  addDocument: publicProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string(),
        keywords: z.array(z.string()),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const doc: Document = {
        id: input.id,
        content: input.content,
        embedding: generateEmbedding(input.content),
        keywords: input.keywords,
        metadata: input.metadata,
      };
      globalHybridSearchService.addDocument(doc);
      return { success: true };
    }),

  /**
   * 获取向量检索服务统计
   */
  getStats: publicProcedure.query(async () => {
    return {
      message: "RAG 服务正在运行",
      timestamp: new Date().toISOString(),
    };
  }),
});
