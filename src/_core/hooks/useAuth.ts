import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 模拟用户登录状态
    setUser({ id: 1, name: '演示用户' });
  }, []);

  return { user };
}
