import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, getTRPCClient } from './lib/trpc';
import { AgentDemo } from './pages/AgentDemo';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={getTRPCClient()} queryClient={queryClient}>
        <AgentDemo />
      </trpc.Provider>
    </QueryClientProvider>
  );
}

export default App;
