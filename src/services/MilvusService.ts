/**
 * MilvusService - Milvus 向量数据库服务
 *
 * 用于存储和检索向量数据，支持：
 * 1. 长期记忆的语义检索
 * 2. RAG 文档的向量检索
 * 3. 用户偏好的向量存储
 */

import { MilvusClient, DataType, LoadState } from '@zilliz/milvus2-sdk-node';

// Milvus/Zilliz Cloud 配置
const MILVUS_ADDRESS = process.env.MILVUS_ADDRESS || 'localhost:19530';
const MILVUS_TOKEN = process.env.MILVUS_TOKEN || '';  // Zilliz Cloud API Key
const MILVUS_USERNAME = process.env.MILVUS_USERNAME || '';
const MILVUS_PASSWORD = process.env.MILVUS_PASSWORD || '';

// 集合名称
const COLLECTIONS = {
  LONG_TERM_MEMORY: 'long_term_memory',
  RAG_DOCUMENTS: 'rag_documents',
  USER_PREFERENCES: 'user_preferences',
};

// 向量维度 (Gemini embedding 维度)
const EMBEDDING_DIM = 768;

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  userId?: string;
  category?: string;
  timestamp: number;
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
}

class MilvusService {
  private client: MilvusClient | null = null;
  private isConnected: boolean = false;

  /**
   * 初始化 Milvus 连接
   */
  async connect(): Promise<boolean> {
    try {
      // 判断是否是 Zilliz Cloud (包含 https://)
      const isZillizCloud = MILVUS_ADDRESS.includes('cloud.zilliz.com');

      const config: any = {
        address: MILVUS_ADDRESS,
        timeout: 30000,
      };

      if (isZillizCloud && MILVUS_TOKEN) {
        // Zilliz Cloud Serverless 使用 token 认证
        config.token = MILVUS_TOKEN;
        console.log('🔗 使用 Zilliz Cloud Serverless 模式');
      } else if (MILVUS_USERNAME && MILVUS_PASSWORD) {
        // 传统用户名密码认证
        config.username = MILVUS_USERNAME;
        config.password = MILVUS_PASSWORD;
      }

      this.client = new MilvusClient(config);

      // 测试连接
      const healthCheck = await this.client.checkHealth();
      if (healthCheck.isHealthy !== false) {
        this.isConnected = true;
        console.log('✅ Milvus 连接成功:', MILVUS_ADDRESS);

        // 初始化集合
        await this.initCollections();

        return true;
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.error('❌ Milvus 连接失败:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 初始化所有集合
   */
  private async initCollections(): Promise<void> {
    if (!this.client) return;

    for (const [name, collectionName] of Object.entries(COLLECTIONS)) {
      await this.createCollectionIfNotExists(collectionName);
    }
  }

  /**
   * 创建集合（如果不存在）
   */
  private async createCollectionIfNotExists(collectionName: string): Promise<void> {
    if (!this.client) return;

    try {
      const hasCollection = await this.client.hasCollection({ collection_name: collectionName });

      if (!hasCollection.value) {
        // 创建集合
        await this.client.createCollection({
          collection_name: collectionName,
          fields: [
            {
              name: 'id',
              data_type: DataType.VarChar,
              is_primary_key: true,
              max_length: 256,
            },
            {
              name: 'content',
              data_type: DataType.VarChar,
              max_length: 65535,
            },
            {
              name: 'embedding',
              data_type: DataType.FloatVector,
              dim: EMBEDDING_DIM,
            },
            {
              name: 'userId',
              data_type: DataType.VarChar,
              max_length: 256,
            },
            {
              name: 'category',
              data_type: DataType.VarChar,
              max_length: 128,
            },
            {
              name: 'timestamp',
              data_type: DataType.Int64,
            },
          ],
        });

        // 创建向量索引
        await this.client.createIndex({
          collection_name: collectionName,
          field_name: 'embedding',
          index_type: 'IVF_FLAT',
          metric_type: 'COSINE',
          params: { nlist: 128 },
        });

        // 加载集合
        await this.client.loadCollectionSync({ collection_name: collectionName });

        console.log(`✅ Milvus 集合创建成功: ${collectionName}`);
      } else {
        // 确保集合已加载
        const loadState = await this.client.getLoadState({ collection_name: collectionName });
        if (loadState.state !== LoadState.LoadStateLoaded) {
          await this.client.loadCollectionSync({ collection_name: collectionName });
        }
      }
    } catch (error) {
      console.error(`创建集合失败 ${collectionName}:`, error);
    }
  }

  /**
   * 插入向量文档
   */
  async insert(collectionName: string, documents: VectorDocument[]): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('Milvus 未连接，跳过插入');
      return false;
    }

    try {
      console.log(`📥 准备插入 ${documents.length} 条数据到 ${collectionName}`);

      // 使用行式数据格式 (row-based format)
      const data = documents.map(d => ({
        id: d.id,
        content: d.content,
        embedding: d.embedding,
        userId: d.userId || '',
        category: d.category || '',
        timestamp: d.timestamp,
      }));

      console.log('📤 插入数据样例:', JSON.stringify(data[0], null, 2).slice(0, 300));

      const result = await this.client.insert({
        collection_name: collectionName,
        data,
      });

      console.log('✅ 插入成功:', result);

      return true;
    } catch (error) {
      console.error('❌ Milvus 插入失败:', error);
      return false;
    }
  }

  /**
   * 向量相似度搜索
   */
  async search(
    collectionName: string,
    queryEmbedding: number[],
    options: {
      topK?: number;
      userId?: string;
      category?: string;
      threshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.client || !this.isConnected) {
      console.warn('Milvus 未连接，返回空结果');
      return [];
    }

    const { topK = 10, userId, category, threshold = 0.0 } = options;

    try {
      // 构建过滤表达式
      let filter = '';
      const conditions: string[] = [];

      if (userId) {
        conditions.push(`userId == "${userId}"`);
      }
      if (category) {
        conditions.push(`category == "${category}"`);
      }

      if (conditions.length > 0) {
        filter = conditions.join(' && ');
      }

      const results = await this.client.search({
        collection_name: collectionName,
        vector: queryEmbedding,
        filter: filter || undefined,
        limit: topK,
        output_fields: ['id', 'content', 'userId', 'category', 'timestamp'],
        params: {
          metric_type: 'COSINE',
          params: JSON.stringify({ nprobe: 16 }),
        },
      });

      // 解析结果
      const searchResults: SearchResult[] = [];

      if (results.results && Array.isArray(results.results)) {
        for (const result of results.results) {
          const score = result.score || 0;
          if (score >= threshold) {
            searchResults.push({
              id: String(result.id),
              score,
              content: String(result.content || ''),
              metadata: {
                userId: result.userId,
                category: result.category,
                timestamp: result.timestamp,
              },
            });
          }
        }
      }

      return searchResults;
    } catch (error) {
      console.error('Milvus 搜索失败:', error);
      return [];
    }
  }

  /**
   * 删除文档
   */
  async delete(collectionName: string, ids: string[]): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.deleteEntities({
        collection_name: collectionName,
        filter: `id in [${ids.map(id => `"${id}"`).join(', ')}]`,
      });
      return true;
    } catch (error) {
      console.error('Milvus 删除失败:', error);
      return false;
    }
  }

  /**
   * 清空集合
   */
  async clearCollection(collectionName: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.deleteEntities({
        collection_name: collectionName,
        filter: 'id != ""',
      });
      return true;
    } catch (error) {
      console.error('Milvus 清空集合失败:', error);
      return false;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.closeConnection();
      this.isConnected = false;
      console.log('Milvus 连接已关闭');
    }
  }
}

// 导出单例
export const milvusService = new MilvusService();

// 导出集合名称常量
export { COLLECTIONS };
