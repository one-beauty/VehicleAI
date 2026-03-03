/**
 * RAGService - 混合检索 RAG 系统
 * 
 * 实现混合检索架构：
 * 1. 向量检索 (VectorSearch) - 语义相似度
 * 2. 关键词检索 (KeywordSearch) - 精确匹配
 * 3. RRF 融合算法 - 结果融合
 * 4. Rerank 模块 - 精排序
 */

/**
 * 检索文档
 */
export interface Document {
  id: string;
  content: string;
  embedding: number[];
  keywords: string[];
  metadata?: Record<string, any>;
}

/**
 * 检索结果
 */
export interface SearchResult {
  documentId: string;
  content: string;
  score: number;
  source: 'vector' | 'keyword';
  metadata?: Record<string, any>;
}

/**
 * 融合结果
 */
export interface FusedResult {
  documentId: string;
  content: string;
  vectorScore: number;
  keywordScore: number;
  rrfScore: number;
  finalScore: number;
  metadata?: Record<string, any>;
}

/**
 * 向量检索服务
 */
export class VectorSearchService {
  private documents: Map<string, Document> = new Map();

  /**
   * 添加文档
   */
  addDocument(doc: Document): void {
    this.documents.set(doc.id, doc);
  }

  /**
   * 向量搜索
   */
  search(queryEmbedding: number[], limit: number = 10): SearchResult[] {
    const results = Array.from(this.documents.values()).map(doc => ({
      documentId: doc.id,
      content: doc.content,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding),
      source: 'vector' as const,
      metadata: doc.metadata,
    }));

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 计算余弦相似度
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
 * 关键词检索服务
 */
export class KeywordSearchService {
  private documents: Map<string, Document> = new Map();

  /**
   * 添加文档
   */
  addDocument(doc: Document): void {
    this.documents.set(doc.id, doc);
  }

  /**
   * 关键词搜索
   */
  search(query: string, limit: number = 10): SearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results = Array.from(this.documents.values()).map(doc => {
      // 计算匹配度
      const matchCount = queryTerms.filter(term =>
        doc.keywords.some(kw => kw.toLowerCase().includes(term)) ||
        doc.content.toLowerCase().includes(term)
      ).length;

      const score = matchCount > 0 ? matchCount / queryTerms.length : 0;

      return {
        documentId: doc.id,
        content: doc.content,
        score,
        source: 'keyword' as const,
        metadata: doc.metadata,
      };
    });

    return results
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

/**
 * RRF (Reciprocal Rank Fusion) 融合算法
 * 
 * RRF 是一个无参数的融合算法，通过倒数排名来融合多个检索结果。
 * 公式：RRF(d) = Σ 1 / (k + rank(d))
 * 其中 k 是一个常数（通常为 60），rank 是文档在各个排序列表中的排名。
 */
export class RRFAlgorithm {
  private k: number = 60; // RRF 常数

  /**
   * 融合多个检索结果
   */
  fuse(vectorResults: SearchResult[], keywordResults: SearchResult[]): FusedResult[] {
    const fusedMap = new Map<string, FusedResult>();

    // 处理向量检索结果
    vectorResults.forEach((result, index) => {
      const rrfScore = 1 / (this.k + index + 1);
      fusedMap.set(result.documentId, {
        documentId: result.documentId,
        content: result.content,
        vectorScore: result.score,
        keywordScore: 0,
        rrfScore,
        finalScore: rrfScore,
        metadata: result.metadata,
      });
    });

    // 处理关键词检索结果
    keywordResults.forEach((result, index) => {
      const rrfScore = 1 / (this.k + index + 1);
      const existing = fusedMap.get(result.documentId);

      if (existing) {
        existing.keywordScore = result.score;
        existing.rrfScore += rrfScore;
        existing.finalScore = existing.rrfScore;
      } else {
        fusedMap.set(result.documentId, {
          documentId: result.documentId,
          content: result.content,
          vectorScore: 0,
          keywordScore: result.score,
          rrfScore,
          finalScore: rrfScore,
          metadata: result.metadata,
        });
      }
    });

    // 按最终分数排序
    return Array.from(fusedMap.values())
      .sort((a, b) => b.finalScore - a.finalScore);
  }
}

/**
 * Rerank 服务 - 精排序
 * 
 * 使用更强大的模型对融合结果进行二次排序，
 * 提升最终的准确率。
 */
export class RerankService {
  /**
   * 重排序
   */
  rerank(query: string, results: FusedResult[], limit: number = 5): FusedResult[] {
    // 模拟 Cohere Rerank 的行为
    // 计算每个结果与查询的相关性分数
    const rerankResults = results.map(result => {
      const relevanceScore = this.calculateRelevance(query, result.content);
      return {
        ...result,
        finalScore: relevanceScore,
      };
    });

    return rerankResults
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);
  }

  /**
   * 计算相关性分数
   * 这是一个简化的实现，实际应用中应使用 Cohere Rerank API
   */
  private calculateRelevance(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    // 计算查询词在内容中的出现频率
    const matchCount = queryTerms.filter(term =>
      contentLower.includes(term)
    ).length;

    // 计算内容长度的影响（更长的内容可能更相关）
    const lengthFactor = Math.min(content.length / 100, 1);

    // 综合分数
    const baseScore = matchCount / queryTerms.length;
    return baseScore * 0.7 + lengthFactor * 0.3;
  }
}

/**
 * 混合检索服务 - 协调所有检索模块
 */
export class HybridSearchService {
  private vectorSearch: VectorSearchService;
  private keywordSearch: KeywordSearchService;
  private rrfAlgorithm: RRFAlgorithm;
  private rerankService: RerankService;

  constructor() {
    this.vectorSearch = new VectorSearchService();
    this.keywordSearch = new KeywordSearchService();
    this.rrfAlgorithm = new RRFAlgorithm();
    this.rerankService = new RerankService();
  }

  /**
   * 添加文档到索引
   */
  addDocument(doc: Document): void {
    this.vectorSearch.addDocument(doc);
    this.keywordSearch.addDocument(doc);
  }

  /**
   * 执行混合检索
   */
  async search(
    query: string,
    queryEmbedding: number[],
    options: {
      vectorLimit?: number;
      keywordLimit?: number;
      finalLimit?: number;
      useRerank?: boolean;
    } = {}
  ): Promise<{
    vectorResults: SearchResult[];
    keywordResults: SearchResult[];
    fusedResults: FusedResult[];
    rerankResults?: FusedResult[];
  }> {
    const vectorLimit = options.vectorLimit || 20;
    const keywordLimit = options.keywordLimit || 20;
    const finalLimit = options.finalLimit || 5;
    const useRerank = options.useRerank !== false;

    // 执行向量检索
    const vectorResults = this.vectorSearch.search(queryEmbedding, vectorLimit);

    // 执行关键词检索
    const keywordResults = this.keywordSearch.search(query, keywordLimit);

    // RRF 融合
    const fusedResults = this.rrfAlgorithm.fuse(vectorResults, keywordResults);

    // 可选的 Rerank
    let rerankResults: FusedResult[] | undefined;
    if (useRerank) {
      rerankResults = this.rerankService.rerank(query, fusedResults, finalLimit);
    }

    return {
      vectorResults,
      keywordResults,
      fusedResults: fusedResults.slice(0, finalLimit),
      rerankResults,
    };
  }

  /**
   * 获取向量检索服务
   */
  getVectorSearchService(): VectorSearchService {
    return this.vectorSearch;
  }

  /**
   * 获取关键词检索服务
   */
  getKeywordSearchService(): KeywordSearchService {
    return this.keywordSearch;
  }

  /**
   * 获取 RRF 算法
   */
  getRRFAlgorithm(): RRFAlgorithm {
    return this.rrfAlgorithm;
  }

  /**
   * 获取 Rerank 服务
   */
  getRerankService(): RerankService {
    return this.rerankService;
  }
}

// 全局混合检索服务实例
export const globalHybridSearchService = new HybridSearchService();
