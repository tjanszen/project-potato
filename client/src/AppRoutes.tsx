import { Route, Switch } from 'wouter'
import { AuthGuard } from './components/AuthGuard'
import { AuthPage } from './pages/AuthPage'
import { DevTestingPage } from './pages/DevTestingPage'
import { CalendarPage } from './pages/CalendarPage'

export function AppRoutes() {
  return (
    <Switch>
      {/* Authentication page - accessible without login */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes - require authentication */}
      <Route path="/">
        <AuthGuard>
          <CalendarPage />
        </AuthGuard>
      </Route>
      
      <Route path="/dev">
        <AuthGuard>
          <DevTestingPage />
        </AuthGuard>
      </Route>
      
      {/* 404 page */}
      <Route>
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1>404 - Page Not Found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <a href="/auth" style={{ color: '#007bff', textDecoration: 'underline' }}>
            Go to Sign In
          </a>
        </div>
      </Route>
    </Switch>
  )
}