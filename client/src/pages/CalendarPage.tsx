import { useState } from 'react'
import { Link } from 'wouter'
import CalendarGrid from '../components/CalendarGrid'

export function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    console.log('Date selected:', date) // Debug logging for testing
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
          🥔 Potato No Drink Tracker
        </h1>
        <nav>
          <Link 
            href="/dev" 
            style={{
              color: '#666', 
              textDecoration: 'underline'
            }}
          >
            Dev Tools
          </Link>
        </nav>
      </header>
      
      {/* Selected Date Display for Testing */}
      {selectedDate && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          <strong>Selected Date:</strong> {selectedDate}
        </div>
      )}
      
      {/* Calendar Grid Component */}
      <CalendarGrid onDateSelect={handleDateSelect} />
    </div>
  )
}