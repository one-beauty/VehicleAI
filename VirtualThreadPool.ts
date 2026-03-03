/**
 * VirtualThreadPool - 模拟 Spring Boot 3.x 虚拟线程池
 * 
 * 这是一个模拟 Java 21 Virtual Thread 的 TypeScript 实现。
 * 在 Spring Boot 3.x 中，虚拟线程通过 async/await 和 Promise 来模拟，
 * 提供轻量级并发处理能力。
 */

export interface VirtualThreadConfig {
  maxPoolSize: number;
  corePoolSize: number;
  queueCapacity: number;
  keepAliveTime: number; // ms
  threadNamePrefix: string;
}

export interface VirtualThreadTask {
  id: string;
  name: string;
  execute: () => Promise<any>;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: Error;
  result?: any;
}

export class VirtualThreadPool {
  private config: VirtualThreadConfig;
  private taskQueue: VirtualThreadTask[] = [];
  private runningTasks: Map<string, VirtualThreadTask> = new Map();
  private completedTasks: VirtualThreadTask[] = [];
  private activeThreads: number = 0;
  private totalTasksProcessed: number = 0;
  private totalTasksFailed: number = 0;

  constructor(config: Partial<VirtualThreadConfig> = {}) {
    this.config = {
      maxPoolSize: config.maxPoolSize || 1000,
      corePoolSize: config.corePoolSize || 10,
      queueCapacity: config.queueCapacity || 10000,
      keepAliveTime: config.keepAliveTime || 60000,
      threadNamePrefix: config.threadNamePrefix || 'vthread-',
    };
  }

  /**
   * 提交任务到虚拟线程池
   * 模拟 Spring Boot 的 @Async 或 ExecutorService.submit()
   */
  async submit<T>(
    task: () => Promise<T>,
    name: string = 'unnamed-task',
    priority: number = 0
  ): Promise<T> {
    if (this.taskQueue.length >= this.config.queueCapacity) {
      throw new Error(`Task queue is full (capacity: ${this.config.queueCapacity})`);
    }

    const taskId = `${this.config.threadNamePrefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const virtualTask: VirtualThreadTask = {
      id: taskId,
      name,
      execute: task,
      priority,
      createdAt: new Date(),
      status: 'pending',
    };

    this.taskQueue.push(virtualTask);
    // 按优先级排序
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    // 异步处理任务
    this.processNextTask();

    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        const completed = this.completedTasks.find(t => t.id === taskId);
        if (completed) {
          if (completed.status === 'failed' && completed.error) {
            reject(completed.error);
          } else {
            resolve(completed.result);
          }
        } else {
          const running = this.runningTasks.get(taskId);
          if (running && running.status === 'failed' && running.error) {
            reject(running.error);
          } else {
            setTimeout(checkCompletion, 10);
          }
        }
      };
      checkCompletion();
    });
  }

  /**
   * 处理队列中的下一个任务
   */
  private async processNextTask(): Promise<void> {
    if (this.activeThreads >= this.config.maxPoolSize || this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    this.activeThreads++;
    this.runningTasks.set(task.id, task);
    task.status = 'running';
    task.startedAt = new Date();

    try {
      task.result = await task.execute();
      task.status = 'completed';
      this.totalTasksProcessed++;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error : new Error(String(error));
      this.totalTasksFailed++;
    } finally {
      task.completedAt = new Date();
      this.runningTasks.delete(task.id);
      this.completedTasks.push(task);

      // 保持完成任务历史（最多 1000 条）
      if (this.completedTasks.length > 1000) {
        this.completedTasks = this.completedTasks.slice(-1000);
      }

      this.activeThreads--;

      // 继续处理下一个任务
      if (this.taskQueue.length > 0) {
        this.processNextTask();
      }
    }
  }

  /**
   * 获取线程池统计信息
   */
  getStats() {
    return {
      activeThreads: this.activeThreads,
      queueSize: this.taskQueue.length,
      runningTasksCount: this.runningTasks.size,
      completedTasksCount: this.completedTasks.length,
      totalTasksProcessed: this.totalTasksProcessed,
      totalTasksFailed: this.totalTasksFailed,
      config: this.config,
    };
  }

  /**
   * 获取所有运行中的任务
   */
  getRunningTasks(): VirtualThreadTask[] {
    return Array.from(this.runningTasks.values());
  }

  /**
   * 获取最近完成的任务
   */
  getRecentCompletedTasks(limit: number = 10): VirtualThreadTask[] {
    return this.completedTasks.slice(-limit).reverse();
  }

  /**
   * 关闭线程池
   */
  async shutdown(): Promise<void> {
    // 等待所有运行中的任务完成
    while (this.activeThreads > 0 || this.taskQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// 全局虚拟线程池实例
export const globalVirtualThreadPool = new VirtualThreadPool({
  maxPoolSize: 1000,
  corePoolSize: 10,
  queueCapacity: 10000,
  threadNamePrefix: 'vthread-',
});
