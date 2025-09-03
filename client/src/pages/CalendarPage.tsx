import { useState } from 'react'
import { Link } from 'wouter'
import CalendarGrid from '../components/CalendarGrid'
import DayDrawer from '../components/DayDrawer'

export function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setIsDrawerOpen(true) // Auto-open drawer when date is selected
  }

  const handleDrawerClose = () => {
    setIsDrawerOpen(false)
    // Keep selectedDate so user can see what they selected, but close drawer
  }

  const handleDayMarked = () => {
    // Trigger calendar refresh after successful day marking
    setRefreshTrigger(prev => prev + 1)
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
      
      
      {/* Calendar Grid Component */}
      <CalendarGrid 
        onDateSelect={handleDateSelect}
        refreshTrigger={refreshTrigger}
      />
      
      {/* Day Drawer Component */}
      <DayDrawer 
        selectedDate={selectedDate}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onDayMarked={handleDayMarked}
      />
    </div>
  )
}