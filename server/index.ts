import 'dotenv/config';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import { appRouter } from './router';
import { milvusService } from '../src/services/MilvusService';

const app = express();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// tRPC middleware
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
  })
);

// 启动服务
async function startServer() {
  // 初始化 Milvus 连接
  console.log('🔄 正在连接 Milvus...');
  const milvusConnected = await milvusService.connect();

  if (milvusConnected) {
    console.log('✅ Milvus 向量数据库已就绪');
  } else {
    console.log('⚠️  Milvus 连接失败，将使用内存模式');
  }

  app.listen(PORT, () => {
    console.log(`🚗 车载 AI 服务已启动: http://localhost:${PORT}`);
    console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
  });
}

startServer().catch(console.error);
