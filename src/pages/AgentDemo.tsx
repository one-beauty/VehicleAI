import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { useAuth } from '../_core/hooks/useAuth';
import { useSpeech } from '../hooks/useSpeech';

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
  const [autoSpeak, setAutoSpeak] = useState(true);

  const {
    isListening,
    transcript,
    toggleListening,
    clearTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    isSupported,
  } = useSpeech();

  const sendMessageMutation = trpc.agent.sendMessage.useMutation();

  // 语音识别结果变化时自动发送
  useEffect(() => {
    if (transcript && !isListening) {
      setInput(transcript);
      // 自动发送
      handleSendMessageWithText(transcript);
      clearTranscript();
    }
  }, [isListening, transcript]);

  const handleSendMessageWithText = async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      const response = await sendMessageMutation.mutateAsync({
        sessionId,
        userId,
        vehicleId,
        message: text,
      });
      const assistantMessage = response.message;
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

      // 自动语音播报
      if (autoSpeak) {
        speak(assistantMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = '抱歉，发生了错误。请稍后重试。';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await handleSendMessageWithText(text);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)' }}>
      {/* Header */}
      <header style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚗</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>车载 AI 语音助手</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* 语音状态指示 */}
            {isSpeaking && (
              <span style={{ fontSize: '0.875rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                🔊 播放中...
              </span>
            )}
            {isListening && (
              <span style={{ fontSize: '0.875rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                🎤 正在聆听...
              </span>
            )}
            <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
              {user ? `欢迎, ${user.name || '用户'}` : '未登录'}
            </div>
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
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: msg.role === 'user' ? '#4f46e5' : 'white',
                        color: msg.role === 'user' ? 'white' : '#111827',
                        border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb',
                        cursor: msg.role === 'assistant' ? 'pointer' : 'default',
                      }}
                      onClick={() => msg.role === 'assistant' && speak(msg.content)}
                      title={msg.role === 'assistant' ? '点击朗读' : undefined}
                    >
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
                  {/* 语音输入按钮 */}
                  {isSupported && (
                    <button
                      onClick={toggleListening}
                      disabled={isLoading}
                      style={{
                        padding: '0.75rem',
                        background: isListening ? '#dc2626' : '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '1.25rem',
                        minWidth: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      title={isListening ? '停止录音' : '开始语音输入'}
                    >
                      {isListening ? '⏹️' : '🎤'}
                    </button>
                  )}

                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isListening ? '正在聆听...' : '输入你的问题...'}
                    disabled={isLoading || isListening}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none',
                      background: isListening ? '#fef3c7' : 'white',
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

                {/* 语音识别中显示 */}
                {isListening && transcript && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fef3c7', borderRadius: '0.25rem', fontSize: '0.875rem', color: '#92400e' }}>
                    识别中: {transcript}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Voice Controls */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span>🎙️</span>
                <h3 style={{ fontWeight: 600, color: '#111827' }}>语音控制</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoSpeak}
                    onChange={(e) => setAutoSpeak(e.target.checked)}
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  自动朗读回复
                </label>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    ⏹️ 停止朗读
                  </button>
                )}
                {!isSupported && (
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', padding: '0.5rem', background: '#fee2e2', borderRadius: '0.25rem' }}>
                    ⚠️ 浏览器不支持语音功能，请使用 Chrome/Edge
                  </div>
                )}
              </div>
            </div>

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
                <li>✓ 语音识别 (ASR)</li>
                <li>✓ 语音合成 (TTS)</li>
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
