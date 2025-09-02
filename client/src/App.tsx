import { Router } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './AppRoutes'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div style={{ 
            minHeight: '100vh',
            fontFamily: 'Arial, sans-serif'
          }}>
            <AppRoutes />
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App