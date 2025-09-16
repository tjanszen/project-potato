import { useState, useEffect } from 'react'
import { apiClient } from './lib/api'

interface FeatureFlag {
  enabled: boolean
}

const FeatureFlagToggle = () => {
  const [flagStatus, setFlagStatus] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const checkFlagStatus = async () => {
    try {
      const response = await apiClient.getFeatureFlag('ff.potato.no_drink_v1')
      if (!response.error && response.data) {
        setFlagStatus((response.data as FeatureFlag).enabled)
      }
    } catch (error) {
      console.error('Failed to check feature flag:', error)
    }
  }

  const toggleFlag = async () => {
    setLoading(true)
    try {
      const response = await apiClient.toggleFeatureFlag('ff.potato.no_drink_v1')
      if (!response.error && response.data) {
        setFlagStatus((response.data as FeatureFlag).enabled)
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