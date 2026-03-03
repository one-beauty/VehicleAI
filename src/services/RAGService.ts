/**
 * RAGService - 混合检索 RAG 系统 (集成 Milvus)
 */

import { milvusService, COLLECTIONS } from './MilvusService';

export interface Document {
  id: string;
  content: string;
  embedding: number[];
  keywords: string[];
  metadata?: Record<string, any>;
}

export interface SearchResult {
  documentId: string;
  content: string;
  score: number;
  source: 'vector' | 'keyword';
  metadata?: Record<string, any>;
}

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
 * 向量检索服务 - 优先使用 Milvus，降级到内存检索
 */
export class VectorSearchService {
  private documents: Map<string, Document> = new Map();

  addDocument(doc: Document): void {
    this.documents.set(doc.id, doc);
  }

  async search(queryEmbedding: number[], limit: number = 10, userId?: string): Promise<SearchResult[]> {
    // 优先使用 Milvus
    if (milvusService.getConnectionStatus()) {
      const milvusResults = await milvusService.search(
        COLLECTIONS.RAG_DOCUMENTS,
        queryEmbedding,
        { topK: limit, userId, threshold: 0.1 }
      );

      if (milvusResults.length > 0) {
        return milvusResults.map(r => ({
          documentId: r.id,
          content: r.content,
          score: r.score,
          source: 'vector' as const,
          metadata: r.metadata,
        }));
      }
    }

    // 降级到内存检索
    const results = Array.from(this.documents.values()).map(doc => ({
      documentId: doc.id,
      content: doc.content,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding),
      source: 'vector' as const,
      metadata: doc.metadata,
    }));

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export class KeywordSearchService {
  private documents: Map<string, Document> = new Map();

  addDocument(doc: Document): void {
    this.documents.set(doc.id, doc);
  }

  search(query: string, limit: number = 10): SearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results = Array.from(this.documents.values()).map(doc => {
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

    return results.filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export class RRFAlgorithm {
  private k: number = 60;

  fuse(vectorResults: SearchResult[], keywordResults: SearchResult[]): FusedResult[] {
    const fusedMap = new Map<string, FusedResult>();

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

    return Array.from(fusedMap.values()).sort((a, b) => b.finalScore - a.finalScore);
  }
}

export class RerankService {
  rerank(query: string, results: FusedResult[], limit: number = 5): FusedResult[] {
    const rerankResults = results.map(result => {
      const relevanceScore = this.calculateRelevance(query, result.content);
      return { ...result, finalScore: relevanceScore };
    });

    return rerankResults.sort((a, b) => b.finalScore - a.finalScore).slice(0, limit);
  }

  private calculateRelevance(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    const matchCount = queryTerms.filter(term => contentLower.includes(term)).length;
    const lengthFactor = Math.min(content.length / 100, 1);
    const baseScore = matchCount / queryTerms.length;
    return baseScore * 0.7 + lengthFactor * 0.3;
  }
}

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

  addDocument(doc: Document): void {
    this.vectorSearch.addDocument(doc);
    this.keywordSearch.addDocument(doc);
  }

  /**
   * 添加文档到 Milvus
   */
  async addDocumentToMilvus(doc: Document, userId?: string, category?: string): Promise<boolean> {
    // 同时添加到内存
    this.addDocument(doc);

    // 添加到 Milvus
    if (milvusService.getConnectionStatus()) {
      return await milvusService.insert(COLLECTIONS.RAG_DOCUMENTS, [{
        id: doc.id,
        content: doc.content,
        embedding: doc.embedding,
        metadata: doc.metadata || {},
        userId,
        category,
        timestamp: Date.now(),
      }]);
    }

    return false;
  }

  async search(
    query: string,
    queryEmbedding: number[],
    options: {
      vectorLimit?: number;
      keywordLimit?: number;
      finalLimit?: number;
      useRerank?: boolean;
      userId?: string;
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

    const vectorResults = await this.vectorSearch.search(queryEmbedding, vectorLimit, options.userId);
    const keywordResults = this.keywordSearch.search(query, keywordLimit);
    const fusedResults = this.rrfAlgorithm.fuse(vectorResults, keywordResults);

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
}

export const globalHybridSearchService = new HybridSearchService();
