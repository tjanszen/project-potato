import { useState, useEffect } from 'react'

const FeatureFlagToggle = () => {
  const [flagStatus, setFlagStatus] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const checkFlagStatus = async () => {
    try {
      const response = await fetch('/api/feature-flags/ff.potato.no_drink_v1')
      console.log('Check flag response status:', response.status)
      
      if (response.ok) {
        const flag = await response.json()
        console.log('Flag check result:', flag)
        setFlagStatus(flag.enabled)
      } else {
        const errorText = await response.text()
        console.error('Flag check failed with status:', response.status, 'Error:', errorText)
      }
    } catch (error) {
      console.error('Failed to check feature flag:', error)
    }
  }

  const toggleFlag = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/toggle-flag/ff.potato.no_drink_v1', {
        method: 'POST'
      })
      
      console.log('Toggle response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Toggle result:', result)
        setFlagStatus(result.enabled)
      } else {
        const errorText = await response.text()
        console.error('Toggle failed with status:', response.status, 'Error:', errorText)
      }
    } catch (error) {
      console.error('Failed to toggle feature flag:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkFlagStatus()
  }, [])

  return (
    <div style={{ 
      padding: '15px', 
      backgroundColor: flagStatus ? '#d4edda' : '#f8d7da', 
      border: `1px solid ${flagStatus ? '#c3e6cb' : '#f5c6cb'}`,
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Feature Flag: ff.potato.no_drink_v1</strong>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            Status: {flagStatus === null ? 'Loading...' : (flagStatus ? 'ENABLED ✅' : 'DISABLED ❌')}
          </div>
          {!flagStatus && (
            <div style={{ fontSize: '12px', color: '#721c24', marginTop: '4px' }}>
              ⚠️ Signup endpoint will return 403 when disabled
            </div>
          )}
        </div>
        <button 
          onClick={toggleFlag}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: flagStatus ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? 'Toggling...' : (flagStatus ? 'Disable' : 'Enable')}
        </button>
      </div>
    </div>
  )
}

export default FeatureFlagToggle