import { useState, useEffect } from 'react'
import './CalendarGrid.css'
import DayCell from './DayCell'
import { apiClient } from '../lib/api'

interface CalendarGridProps {
  className?: string
  onDateSelect?: (date: string) => void
  refreshTrigger?: number // For forcing calendar refresh after marking
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ className = '', onDateSelect, refreshTrigger }) => {
  // Current date state - initialize to current month/year but restricted to 2025
  const now = new Date()
  const currentYear = 2025 // Force to 2025 for this app
  const currentMonth = now.getFullYear() === 2025 ? now.getMonth() : 0 // Jan if not 2025
  
  const [displayMonth, setDisplayMonth] = useState(currentMonth)
  const [displayYear] = useState(currentYear) // Fixed to 2025
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [markedDates, setMarkedDates] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userTimezone, setUserTimezone] = useState<string>('America/New_York') // Default, will be updated

  // Month names for header display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Day labels for calendar header
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get user profile and timezone
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.getProfile()
        if (!response.error && (response as any).user?.timezone) {
          setUserTimezone((response as any).user.timezone)
        }
      } catch (error) {
        // Use default timezone if profile fetch fails
      }
    }
    fetchUserProfile()
  }, [])

  // Fetch calendar data when month changes or refresh is triggered
  useEffect(() => {
    const fetchCalendarData = async () => {
      setIsLoading(true)
      const monthString = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`
      const response = await apiClient.getCalendar(monthString)
      
      if (response.error) {
        console.error('Failed to fetch calendar data:', response.error)
        setMarkedDates([])
      } else if ((response as any).markedDates) {
        setMarkedDates((response as any).markedDates)
      } else {
        setMarkedDates([])
      }
      setIsLoading(false)
    }
    
    fetchCalendarData()
  }, [displayMonth, displayYear, refreshTrigger])

  // Calculate if a date should be disabled (future dates except today in user timezone)
  const isDateDisabled = (date: number, month: number, year: number): boolean => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    
    // Get today in user's timezone using the most reliable method
    const today = new Date()
    const todayString = today.toLocaleDateString('en-CA', { timeZone: userTimezone }) // YYYY-MM-DD format
    
    
    // Disable if date is in the future (after today in user's timezone)
    return dateString > todayString
  }

  // Calculate calendar grid dates
  const getCalendarDates = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDay.getDay() // 0 = Sunday
    const daysInMonth = lastDay.getDate()
    
    const dates = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      dates.push(null)
    }
    
    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(day)
    }
    
    // Fill remaining cells to make 6 rows (42 total cells)
    while (dates.length < 42) {
      dates.push(null)
    }
    
    return dates
  }

  // Navigation handlers with 2025 restriction
  const goToPreviousMonth = () => {
    if (displayMonth > 0) { // Can't go before January
      setDisplayMonth(displayMonth - 1)
      setSelectedDate(null) // Clear selection when changing months
    }
  }

  const goToNextMonth = () => {
    if (displayMonth < 11) { // Can't go past December
      setDisplayMonth(displayMonth + 1)
      setSelectedDate(null) // Clear selection when changing months
    }
  }

  // Handle date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    if (onDateSelect) {
      onDateSelect(date)
    }
  }

  // Check if navigation buttons should be disabled
  const isPrevDisabled = displayMonth === 0 // January
  const isNextDisabled = displayMonth === 11 // December

  const calendarDates = getCalendarDates(displayMonth, displayYear)

  return (
    <div className={`calendar-grid ${className}`}>
      {/* Month Header with Navigation */}
      <div className="calendar-header">
        <button 
          className={`nav-btn ${isPrevDisabled ? 'disabled' : ''}`}
          onClick={goToPreviousMonth}
          disabled={isPrevDisabled}
          data-testid="button-prev-month"
        >
          ‹
        </button>
        
        <h2 className="month-year" data-testid="text-current-month">
          {monthNames[displayMonth]} {displayYear}
        </h2>
        
        <button 
          className={`nav-btn ${isNextDisabled ? 'disabled' : ''}`}
          onClick={goToNextMonth}
          disabled={isNextDisabled}
          data-testid="button-next-month"
        >
          ›
        </button>
      </div>

      {/* Day Labels Row */}
      <div className="day-labels">
        {dayLabels.map(day => (
          <div key={day} className="day-label">
            {day}
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading-indicator" data-testid="loading-calendar">
          Loading calendar data...
        </div>
      )}

      {/* Calendar Grid - 6 rows x 7 columns */}
      <div className="calendar-dates">
        {calendarDates.map((date, index) => {
          const dateString = date ? `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}` : null
          const isSelected = dateString === selectedDate
          const isMarked = dateString ? markedDates.includes(dateString) : false
          const isDisabled = date ? isDateDisabled(date, displayMonth, displayYear) : false
          
          return (
            <DayCell
              key={index}
              date={date}
              month={displayMonth}
              year={displayYear}
              isSelected={isSelected}
              isMarked={isMarked}
              isDisabled={isDisabled}
              onSelect={handleDateSelect}
            />
          )
        })}
      </div>

    </div>
  )
}

export default CalendarGrid