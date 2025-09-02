import { Link } from 'wouter'
import CalendarGrid from '../components/CalendarGrid'

export function CalendarPage() {
  return (
    <div className="p-5 max-w-6xl mx-auto font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">🥔 Potato No Drink Tracker</h1>
        <nav>
          <Link 
            href="/dev" 
            className="text-gray-600 underline hover:text-gray-800 transition-colors"
          >
            Dev Tools
          </Link>
        </nav>
      </header>
      
      {/* Calendar Grid Component */}
      <CalendarGrid />
    </div>
  )
}