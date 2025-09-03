import { useAuth } from '../contexts/AuthContext'

export function UserInfo() {
  const { user, logout, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      padding: '10px 15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          color: '#333' 
        }}>
          {user.email}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#666' 
        }}>
          {user.timezone}
        </div>
      </div>
      
      <button
        onClick={logout}
        data-testid="button-logout"
        style={{
          padding: '6px 12px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        Sign Out
      </button>
    </div>
  )
}