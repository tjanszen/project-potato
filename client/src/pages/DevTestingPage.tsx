import SignupForm from '../SignupForm'
import FeatureFlagToggle from '../FeatureFlagToggle'

export function DevTestingPage() {
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '500px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🥔 Project Potato - Dev Testing UI</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Phase 1B: Testing the signup API (Phase 1A)
      </p>
      
      <FeatureFlagToggle />
      
      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Test User Signup</h2>
        <SignupForm />
      </div>
    </div>
  )
}