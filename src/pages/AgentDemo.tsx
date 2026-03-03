import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useAuth } from '../_core/hooks/useAuth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AgentDemo() {
  const { user } = useAuth();
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [userId] = useState(() => user?.id?.toString() || 'user-demo');
  const [vehicleId] = useState('vehicle-001');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是车载 AI 助手。有什么我可以帮助你的吗？' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessageMutation = trpc.agent.sendMessage.useMutation();

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');

    try {
      const response = await sendMessageMutation.mutateAsync({
        sessionId,
        userId,
        vehicleId,
        message: userMessage,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，发生了错误。请稍后重试。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)' }}>
      {/* Header */}
      <header style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚗</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>车载 AI 语音网关</h1>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            {user ? `欢迎, ${user.name || '用户'}` : '未登录'}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Chat Interface */}
          <div>
            <div style={{
              height: '500px',
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      background: msg.role === 'user' ? '#4f46e5' : 'white',
                      color: msg.role === 'user' ? 'white' : '#111827',
                      border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      background: 'white',
                      color: '#111827',
                      border: '1px solid #e5e7eb',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                      处理中...
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem', background: 'white' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="输入你的问题..."
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: isLoading || !input.trim() ? '#9ca3af' : '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* System Status */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span>⚡</span>
                <h3 style={{ fontWeight: 600, color: '#111827' }}>系统状态</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>会话 ID:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#111827' }}>{sessionId.slice(0, 16)}...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>用户 ID:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#111827' }}>{userId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>车辆 ID:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#111827' }}>{vehicleId}</span>
                </div>
              </div>
            </div>

            {/* Memory Status */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span>💾</span>
                <h3 style={{ fontWeight: 600, color: '#111827' }}>记忆系统</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>短期记忆:</span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>{messages.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>长期记忆:</span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>--</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4b5563' }}>实体记忆:</span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>活跃</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span>📊</span>
                <h3 style={{ fontWeight: 600, color: '#111827' }}>核心功能</h3>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563', listStyle: 'none' }}>
                <li>✓ 多轮对话</li>
                <li>✓ 混合检索 RAG</li>
                <li>✓ Gemini 2.5 Flash</li>
                <li>✓ 三层记忆</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
