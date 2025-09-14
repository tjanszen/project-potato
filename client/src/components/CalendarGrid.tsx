import React, { useState, useEffect, useMemo } from 'react'
import './CalendarGrid.css'
import DayCell from './DayCell'
import { apiClient } from '../lib/api'

interface CalendarGridProps {
  className?: string
  onDateSelect?: (date: string) => void
  refreshTrigger?: number // For forcing calendar refresh after marking
  optimisticMarkedDates?: string[] // For immediate visual feedback
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  className = '', 
  onDateSelect, 
  refreshTrigger,
  optimisticMarkedDates = []
}) => {
  // Current date state - initialize to current month/year but restricted to 2025
  const now = new Date()
  const currentYear = 2025 // Force to 2025 for this app
  const currentMonth = now.getFullYear() === 2025 ? now.getMonth() : 0 // Jan if not 2025
  
  const [displayMonth, setDisplayMonth] = useState(currentMonth)
  const [displayYear] = useState(currentYear) // Fixed to 2025
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [markedDates, setMarkedDates] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUserLoading, setIsUserLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setIsUserLoading(true)
      try {
        const response = await apiClient.getProfile()
        if (!response.error && (response as any).user?.timezone) {
          setUserTimezone((response as any).user.timezone)
        }
      } catch (error) {
        // Use default timezone if profile fetch fails
      } finally {
        setIsUserLoading(false)
      }
    }
    fetchUserProfile()
  }, [])

  // Fetch calendar data when month changes or refresh is triggered
  useEffect(() => {
    const fetchCalendarData = async () => {
      setIsLoading(true)
      setError(null) // Clear previous errors
      const monthString = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`
      
      try {
        const response = await apiClient.getCalendar(monthString)
        
        if (response.error) {
          const errorMessage = response.error === 'Authentication required' 
            ? 'Please log in to view your calendar data.'
            : `Failed to load calendar: ${response.error}`
          setError(errorMessage)
          setMarkedDates([])
        } else if ((response as any).markedDates) {
          setMarkedDates((response as any).markedDates)
          setError(null) // Clear error on success
        } else {
          setMarkedDates([])
          setError(null)
        }
      } catch (error) {
        setError('Unable to connect to server. Please check your connection and try again.')
        setMarkedDates([])
      }
      
      setIsLoading(false)
    }
    
    fetchCalendarData()
  }, [displayMonth, displayYear, refreshTrigger])


  // Memoize today's date calculation for performance
  const todayString = useMemo(() => {
    const today = new Date()
    return today.toLocaleDateString('en-CA', { timeZone: userTimezone }) // YYYY-MM-DD format
  }, [userTimezone])

  // Calculate if a date should be disabled (memoized for performance)
  const isDateDisabled = useMemo(() => {
    return (date: number, month: number, year: number): boolean => {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
      // Disable if date is in the future (after today in user's timezone)
      return dateString > todayString
    }
  }, [todayString])

  // Memoize calendar grid dates calculation for performance
  const calendarDates = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth, 1)
    const lastDay = new Date(displayYear, displayMonth + 1, 0)
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
  }, [displayMonth, displayYear])

  // Combine real marked dates with optimistic updates for better performance
  const allMarkedDates = useMemo(() => {
    return [...markedDates, ...optimisticMarkedDates]
  }, [markedDates, optimisticMarkedDates])

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

  // Memoize navigation button states
  const isPrevDisabled = useMemo(() => displayMonth === 0, [displayMonth]) // January
  const isNextDisabled = useMemo(() => displayMonth === 11, [displayMonth]) // December

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

      {/* Loading indicators */}
      {isUserLoading && (
        <div className="loading-indicator" data-testid="loading-user-profile">
          <span style={{ marginRight: '8px' }}>⏳</span>
          Loading user profile...
        </div>
      )}
      
      {isLoading && (
        <div className="loading-indicator" data-testid="loading-calendar">
          <span style={{ marginRight: '8px' }}>📅</span>
          Loading calendar data...
        </div>
      )}

      {/* Error message */}
      {error && (
        <div 
          className="error-message" 
          data-testid="error-calendar"
          style={{
            padding: '12px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            color: '#721c24',
            fontSize: '14px',
            margin: '10px 0',
            textAlign: 'center'
          }}
        >
          {error}
        </div>
      )}

      {/* Calendar Grid - 6 rows x 7 columns */}
      <div className="calendar-dates">
        {calendarDates.map((date, index) => {
          const dateString = date ? `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}` : null
          const isSelected = dateString === selectedDate
          const isMarked = dateString ? allMarkedDates.includes(dateString) : false
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