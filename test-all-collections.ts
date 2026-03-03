/**
 * 测试所有 Milvus 集合的数据插入
 */

import 'dotenv/config';
import { milvusService, COLLECTIONS } from './src/services/MilvusService';

async function testAllCollections() {
  console.log('🧪 测试所有 Milvus 集合...\n');

  // 连接 Milvus
  const connected = await milvusService.connect();
  if (!connected) {
    console.error('❌ 连接失败');
    return;
  }
  console.log('✅ 连接成功\n');

  // 生成测试 embedding
  const testEmbedding = Array(768).fill(0).map(() => Math.random() * 0.1);

  // 1. 测试长期记忆
  console.log('📤 测试 long_term_memory...');
  const memoryResult = await milvusService.insert(COLLECTIONS.LONG_TERM_MEMORY, [{
    id: `test-memory-${Date.now()}`,
    content: '测试对话：用户喜欢听流行音乐',
    embedding: testEmbedding,
    metadata: { type: 'test' },
    userId: 'test-user',
    category: 'conversation',
    timestamp: Date.now(),
  }]);
  console.log(memoryResult ? '✅ long_term_memory 插入成功' : '❌ long_term_memory 插入失败\n');

  // 2. 测试用户偏好
  console.log('\n📤 测试 user_preferences...');
  const prefResult = await milvusService.insert(COLLECTIONS.USER_PREFERENCES, [{
    id: `test-pref-${Date.now()}`,
    content: 'music: preferred_artist = 周杰伦',
    embedding: testEmbedding,
    metadata: {
      category: 'music',
      key: 'preferred_artist',
      value: '周杰伦',
      confidence: 0.9,
      source: 'explicit',
    },
    userId: 'test-user',
    category: 'music',
    timestamp: Date.now(),
  }]);
  console.log(prefResult ? '✅ user_preferences 插入成功' : '❌ user_preferences 插入失败\n');

  // 3. 测试 RAG 文档
  console.log('\n📤 测试 rag_documents...');
  const ragResult = await milvusService.insert(COLLECTIONS.RAG_DOCUMENTS, [{
    id: `test-rag-${Date.now()}`,
    content: '车辆使用手册：在夜间行驶时，应降低车内音量，避免分散驾驶员注意力。',
    embedding: testEmbedding,
    metadata: { source: 'manual', page: 15 },
    userId: 'system',
    category: 'vehicle_manual',
    timestamp: Date.now(),
  }]);
  console.log(ragResult ? '✅ rag_documents 插入成功' : '❌ rag_documents 插入失败\n');

  // 等待数据同步
  console.log('⏳ 等待数据同步...');
  await new Promise(r => setTimeout(r, 2000));

  // 验证查询
  console.log('\n🔍 验证各集合数据...');

  const memorySearch = await milvusService.search(COLLECTIONS.LONG_TERM_MEMORY, testEmbedding, { topK: 1 });
  console.log(`long_term_memory: ${memorySearch.length} 条记录`);

  const prefSearch = await milvusService.search(COLLECTIONS.USER_PREFERENCES, testEmbedding, { topK: 1 });
  console.log(`user_preferences: ${prefSearch.length} 条记录`);

  const ragSearch = await milvusService.search(COLLECTIONS.RAG_DOCUMENTS, testEmbedding, { topK: 1 });
  console.log(`rag_documents: ${ragSearch.length} 条记录`);

  await milvusService.disconnect();
  console.log('\n✅ 测试完成');
}

testAllCollections().catch(console.error);
