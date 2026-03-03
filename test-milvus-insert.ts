/**
 * 测试 Milvus 数据插入
 */

import 'dotenv/config';
import { milvusService, COLLECTIONS } from './src/services/MilvusService';

async function testInsert() {
  console.log('🧪 开始测试 Milvus 数据插入...\n');

  // 连接 Milvus
  const connected = await milvusService.connect();
  if (!connected) {
    console.error('❌ 连接失败');
    return;
  }

  console.log('✅ 连接成功\n');

  // 测试数据
  const testDoc = {
    id: `test-${Date.now()}`,
    content: '这是一条测试对话：记住我喜欢听流行音乐',
    embedding: Array(768).fill(0).map(() => Math.random() * 0.1),  // 模拟 embedding
    metadata: {
      sessionId: 'test-session',
      type: 'conversation',
    },
    userId: 'test-user',
    category: 'conversation',
    timestamp: Date.now(),
  };

  console.log('📤 准备插入数据:');
  console.log(JSON.stringify(testDoc, null, 2));
  console.log('');

  // 插入数据
  const success = await milvusService.insert(COLLECTIONS.LONG_TERM_MEMORY, [testDoc]);

  if (success) {
    console.log('✅ 插入成功！');
  } else {
    console.log('❌ 插入失败');
  }

  // 等待一下让数据同步
  await new Promise(r => setTimeout(r, 2000));

  // 查询数据验证
  console.log('\n🔍 尝试查询数据...');

  const results = await milvusService.search(COLLECTIONS.LONG_TERM_MEMORY, testDoc.embedding, { topK: 5 });
  console.log(`📊 查询到 ${results.length} 条结果:`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.content.slice(0, 50)}... (score: ${r.score.toFixed(4)})`);
  });

  await milvusService.disconnect();
  console.log('\n✅ 测试完成');
}

testInsert().catch(console.error);
