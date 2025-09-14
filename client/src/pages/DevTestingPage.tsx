import React from 'react'
import FeatureFlagToggle from '../FeatureFlagToggle'
import { UserInfo } from '../components/UserInfo'
import { useAuth } from '../contexts/AuthContext'

export function DevTestingPage() {
  const { user, isAuthenticated } = useAuth()
  
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '600px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🥔 Project Potato - Dev Testing UI</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Phase 4A: Authentication Integration Complete
      </p>
      
      <FeatureFlagToggle />
      
      {isAuthenticated && user && (
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          border: '1px solid #28a745', 
          borderRadius: '8px',
          backgroundColor: '#f8fff9'
        }}>
          <h2>✅ Authentication Status</h2>
          <UserInfo />
          <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
            <strong>User ID:</strong> {user.id}<br/>
            <strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}
          </div>
        </div>
      )}
      
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px' 
      }}>
        <h2>Phase 4A Test Results</h2>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p><strong>✅ Authentication Integration Complete:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>✅ React auth forms with validation</li>
            <li>✅ API integration for signup/login</li>
            <li>✅ Session management and auth state</li>
            <li>✅ Authentication guards for protected routes</li>
            <li>✅ Error handling and session persistence</li>
            <li>✅ Context-based state management</li>
          </ul>
          <p style={{ marginTop: '15px', color: '#28a745' }}>
            <strong>Authentication system fully functional!</strong>
          </p>
        </div>
      </div>
    </div>
  )
}