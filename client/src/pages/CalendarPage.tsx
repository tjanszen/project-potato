import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'wouter'
import CalendarGrid from '../components/CalendarGrid'
import DayDrawer from '../components/DayDrawer'
import { TotalsPanel } from '../components/TotalsPanel'
import { UserInfo } from '../components/UserInfo'

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

  console.log("[Phase1] Header removed, emoji only");
  console.log("Footer rendered");
  console.log("Phase 3 footer controls rendered");

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Standalone Potato Emoji */}
      <div style={{ 
        fontSize: '28px', 
        marginBottom: '30px', 
        textAlign: 'left'
      }}>🥔</div>
      
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
      
      {/* Footer - Phase 3 */}
      <footer className="flex justify-between items-center w-full p-2 border-t">
        <UserInfo />
        <Link 
          href="/dev" 
          data-testid="link-dev-tools"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Dev Tools
        </Link>
      </footer>
      
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