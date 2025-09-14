import React, { useState } from 'react'
import { Link } from 'wouter'
import { useQueryClient } from '@tanstack/react-query'
import CalendarGrid from '../components/CalendarGrid'
import DayDrawer from '../components/DayDrawer'
import { UserInfo } from '../components/UserInfo'
import { TotalsPanel } from '../components/TotalsPanel'

export function CalendarPage() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [optimisticMarkedDates, setOptimisticMarkedDates] = useState<string[]>([])

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
    // Invalidate totals cache to refresh stats (Phase 7C-1)
    queryClient.invalidateQueries({ queryKey: ['totals'] })
  }

  // Optimistic marking functions for immediate visual feedback
  const handleOptimisticMark = (date: string) => {
    setOptimisticMarkedDates(prev => {
      if (!prev.includes(date)) {
        return [...prev, date]
      }
      return prev
    })
  }

  const handleOptimisticUnmark = (date: string) => {
    setOptimisticMarkedDates(prev => prev.filter(d => d !== date))
  }

  // Enhanced day marked handler that clears optimistic updates
  const handleDayMarkedSuccess = () => {
    setOptimisticMarkedDates([]) // Clear optimistic updates on success
    handleDayMarked() // Trigger refresh
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
        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <UserInfo />
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
      
      {/* Totals Panel - Phase 7C-1 */}
      <div style={{ marginBottom: '30px' }}>
        <TotalsPanel />
      </div>
      
      {/* Calendar Grid Component */}
      <CalendarGrid 
        onDateSelect={handleDateSelect}
        refreshTrigger={refreshTrigger}
        optimisticMarkedDates={optimisticMarkedDates}
      />
      
      {/* Day Drawer Component */}
      <DayDrawer 
        selectedDate={selectedDate}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onDayMarked={handleDayMarkedSuccess}
        onOptimisticMark={handleOptimisticMark}
        onOptimisticUnmark={handleOptimisticUnmark}
      />
    </div>
  )
}