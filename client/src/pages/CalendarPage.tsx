import { Link } from 'wouter'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function CalendarPage() {
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1>🥔 Potato No Drink Tracker</h1>
        <nav>
          <Link href="/dev" style={{ 
            color: '#666', 
            textDecoration: 'underline',
            marginRight: '10px' 
          }}>
            Dev Tools
          </Link>
        </nav>
      </header>
      
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h2>Calendar Coming Soon</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Phase 3A: Frontend setup complete!<br />
          Calendar interface will be built in Phase 3B-3E.
        </p>
        <LoadingSpinner />
        <p style={{ fontSize: '14px', marginTop: '20px' }}>
          This is a placeholder for the calendar component.
        </p>
      </div>
    </div>
  )
}