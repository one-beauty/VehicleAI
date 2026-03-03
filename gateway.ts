import { publicProcedure, router } from "../_core/trpc";
import { globalVirtualThreadPool } from "../core/VirtualThreadPool";

export const gatewayRouter = router({
  /**
   * 获取网关状态
   */
  getStatus: publicProcedure.query(async () => {
    const stats = globalVirtualThreadPool.getStats();
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      virtualThreadPool: stats,
    };
  }),

  /**
   * 获取虚拟线程池统计
   */
  getThreadPoolStats: publicProcedure.query(async () => {
    const stats = globalVirtualThreadPool.getStats();
    return stats;
  }),

  /**
   * 获取运行中的任务
   */
  getRunningTasks: publicProcedure.query(async () => {
    const tasks = globalVirtualThreadPool.getRunningTasks();
    return {
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
      })),
    };
  }),

  /**
   * 获取最近完成的任务
   */
  getRecentCompletedTasks: publicProcedure.query(async () => {
    const tasks = globalVirtualThreadPool.getRecentCompletedTasks(10);
    return {
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
      })),
    };
  }),

  /**
   * 健康检查
   */
  healthCheck: publicProcedure.query(async () => {
    return {
      healthy: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }),
});
