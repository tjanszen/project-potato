import { Route, Switch } from 'wouter'
import { DevTestingPage } from './pages/DevTestingPage'
import { CalendarPage } from './pages/CalendarPage'

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={CalendarPage} />
      <Route path="/dev" component={DevTestingPage} />
      <Route>
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1>404 - Page Not Found</h1>
          <p>The page you're looking for doesn't exist.</p>
        </div>
      </Route>
    </Switch>
  )
}