import { describe, it, expect, beforeEach } from "vitest";
import {
  VectorSearchService,
  KeywordSearchService,
  RRFAlgorithm,
  RerankService,
  HybridSearchService,
  Document,
} from "./RAGService";

describe("VectorSearchService", () => {
  let service: VectorSearchService;

  beforeEach(() => {
    service = new VectorSearchService();
  });

  it("should search documents by vector similarity", () => {
    const doc1: Document = {
      id: "doc1",
      content: "Vehicle status information",
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      keywords: ["vehicle", "status"],
    };

    const doc2: Document = {
      id: "doc2",
      content: "Navigation system",
      embedding: [0.9, 0.8, 0.7, 0.6, 0.5],
      keywords: ["navigation", "system"],
    };

    service.addDocument(doc1);
    service.addDocument(doc2);

    // Search with embedding similar to doc1
    const results = service.search([0.1, 0.2, 0.3, 0.4, 0.5], 10);

    expect(results).toHaveLength(2);
    expect(results[0].documentId).toBe("doc1");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("should return limited results", () => {
    for (let i = 0; i < 10; i++) {
      service.addDocument({
        id: `doc${i}`,
        content: `Document ${i}`,
        embedding: Array(5).fill(i / 10),
        keywords: [`keyword${i}`],
      });
    }

    const results = service.search(Array(5).fill(0.5), 3);
    expect(results).toHaveLength(3);
  });
});

describe("KeywordSearchService", () => {
  let service: KeywordSearchService;

  beforeEach(() => {
    service = new KeywordSearchService();
  });

  it("should search documents by keywords", () => {
    const doc1: Document = {
      id: "doc1",
      content: "Vehicle status and diagnostics",
      embedding: [0.1, 0.2, 0.3],
      keywords: ["vehicle", "status", "diagnostics"],
    };

    const doc2: Document = {
      id: "doc2",
      content: "Music player features",
      embedding: [0.4, 0.5, 0.6],
      keywords: ["music", "player"],
    };

    service.addDocument(doc1);
    service.addDocument(doc2);

    const results = service.search("vehicle status", 10);

    expect(results).toHaveLength(1);
    expect(results[0].documentId).toBe("doc1");
  });

  it("should filter out non-matching documents", () => {
    service.addDocument({
      id: "doc1",
      content: "Vehicle information",
      embedding: [0.1, 0.2, 0.3],
      keywords: ["vehicle"],
    });

    const results = service.search("music", 10);
    expect(results).toHaveLength(0);
  });
});

describe("RRFAlgorithm", () => {
  let algorithm: RRFAlgorithm;

  beforeEach(() => {
    algorithm = new RRFAlgorithm();
  });

  it("should fuse vector and keyword search results", () => {
    const vectorResults = [
      { documentId: "doc1", content: "Content 1", score: 0.9, source: "vector" as const },
      { documentId: "doc2", content: "Content 2", score: 0.7, source: "vector" as const },
    ];

    const keywordResults = [
      { documentId: "doc2", content: "Content 2", score: 0.8, source: "keyword" as const },
      { documentId: "doc3", content: "Content 3", score: 0.6, source: "keyword" as const },
    ];

    const fused = algorithm.fuse(vectorResults, keywordResults);

    expect(fused).toHaveLength(3);
    expect(fused[0].documentId).toBe("doc2"); // doc2 appears in both lists
  });

  it("should calculate RRF scores correctly", () => {
    const vectorResults = [
      { documentId: "doc1", content: "Content 1", score: 0.9, source: "vector" as const },
    ];

    const keywordResults = [
      { documentId: "doc1", content: "Content 1", score: 0.8, source: "keyword" as const },
    ];

    const fused = algorithm.fuse(vectorResults, keywordResults);

    expect(fused).toHaveLength(1);
    expect(fused[0].rrfScore).toBeGreaterThan(0);
    expect(fused[0].vectorScore).toBe(0.9);
    expect(fused[0].keywordScore).toBe(0.8);
  });
});

describe("RerankService", () => {
  let service: RerankService;

  beforeEach(() => {
    service = new RerankService();
  });

  it("should rerank results based on relevance", () => {
    const results = [
      {
        documentId: "doc1",
        content: "Vehicle status and diagnostics",
        vectorScore: 0.8,
        keywordScore: 0.7,
        rrfScore: 0.75,
        finalScore: 0.75,
      },
      {
        documentId: "doc2",
        content: "Music player",
        vectorScore: 0.6,
        keywordScore: 0.5,
        rrfScore: 0.55,
        finalScore: 0.55,
      },
    ];

    const reranked = service.rerank("vehicle status", results, 2);

    expect(reranked).toHaveLength(2);
    expect(reranked[0].finalScore).toBeGreaterThanOrEqual(reranked[1].finalScore);
  });
});

describe("HybridSearchService", () => {
  let service: HybridSearchService;

  beforeEach(() => {
    service = new HybridSearchService();
  });

  it("should perform hybrid search", async () => {
    const doc: Document = {
      id: "doc1",
      content: "Vehicle status information",
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      keywords: ["vehicle", "status"],
    };

    service.addDocument(doc);

    const results = await service.search(
      "vehicle status",
      [0.1, 0.2, 0.3, 0.4, 0.5],
      { finalLimit: 5 }
    );

    expect(results.vectorResults).toBeDefined();
    expect(results.keywordResults).toBeDefined();
    expect(results.fusedResults).toBeDefined();
    expect(results.rerankResults).toBeDefined();
  });

  it("should support optional reranking", async () => {
    const doc: Document = {
      id: "doc1",
      content: "Test content",
      embedding: [0.1, 0.2, 0.3],
      keywords: ["test"],
    };

    service.addDocument(doc);

    const withRerank = await service.search("test", [0.1, 0.2, 0.3], {
      useRerank: true,
    });

    const withoutRerank = await service.search("test", [0.1, 0.2, 0.3], {
      useRerank: false,
    });

    expect(withRerank.rerankResults).toBeDefined();
    expect(withoutRerank.rerankResults).toBeUndefined();
  });
});
