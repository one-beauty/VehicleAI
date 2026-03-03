import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Send, Loader2, MessageCircle, Database, Zap, BarChart3 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AgentDemo() {
  const { user } = useAuth();
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [userId] = useState(() => user?.id?.toString() || "user-demo");
  const [vehicleId] = useState("vehicle-001");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "你好！我是车载 AI 助手。有什么我可以帮助你的吗？" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessageMutation = trpc.agent.sendMessage.useMutation();

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    const userMessage = input;
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");

    try {
      const response = await sendMessageMutation.mutateAsync({
        sessionId,
        userId,
        vehicleId,
        message: userMessage,
      });
      setMessages(prev => [...prev, { role: "assistant", content: response.message }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，发生了错误。请稍后重试。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">车载 AI 语音网关</h1>
          </div>
          <div className="text-sm text-gray-600">
            {user ? `欢迎, ${user.name || "用户"}` : "未登录"}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col shadow-lg">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      处理中...
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t p-4 bg-white">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="输入你的问题..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* System Status */}
            <Card className="p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-gray-900">系统状态</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">会话 ID:</span>
                  <span className="font-mono text-xs text-gray-900 truncate">{sessionId.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">用户 ID:</span>
                  <span className="font-mono text-xs text-gray-900">{userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">车辆 ID:</span>
                  <span className="font-mono text-xs text-gray-900">{vehicleId}</span>
                </div>
              </div>
            </Card>

            {/* Memory Status */}
            <Card className="p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">记忆系统</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">短期记忆:</span>
                  <span className="text-gray-900 font-semibold">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">长期记忆:</span>
                  <span className="text-gray-900 font-semibold">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">实体记忆:</span>
                  <span className="text-gray-900 font-semibold">活跃</span>
                </div>
              </div>
            </Card>

            {/* Features */}
            <Card className="p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">核心功能</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ 多轮对话</li>
                <li>✓ 混合检索 RAG</li>
                <li>✓ 虚拟线程池</li>
                <li>✓ 三层记忆</li>
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
