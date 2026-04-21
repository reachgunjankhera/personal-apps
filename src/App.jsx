import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import WorkoutScreen from './screens/WorkoutScreen'
import CalendarScreen from './screens/CalendarScreen'
import { useWorkoutLog } from './hooks/useWorkoutLog'

export default function App() {
  const [view, setView] = useState('home')
  const [activeDay, setActiveDay] = useState(null)

  const { logSet, markWorkoutComplete, isWorkoutComplete, getLastWeight, log, resetAll, resetWeek } = useWorkoutLog()

  function handleStartDay(dayData) {
    setActiveDay(dayData)
    setView('workout')
  }

  function handleWorkoutComplete() {
    markWorkoutComplete(activeDay.id)
    setView('done')
  }

  function handleBack() {
    setView('home')
    setActiveDay(null)
  }

  if (view === 'done' && activeDay) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 text-white px-8 text-center">
        <div className="text-8xl mb-6">🎉</div>
        <h2 className="text-4xl font-bold mb-2">Week {activeDay.week} · Day {activeDay.day}</h2>
        <p className="text-gray-400 text-xl mb-1">Workout Complete!</p>
        <p className="text-gray-600 text-base mb-12">Great work. Rest up and come back stronger.</p>
        <button
          onClick={() => { setView('home'); setActiveDay(null) }}
          className="w-full max-w-sm py-5 bg-orange-500 text-white text-lg font-bold rounded-2xl active:bg-orange-600 active:scale-95 transition-all"
        >
          Back to Program
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {view === 'home' && (
        <HomeScreen
          onStartDay={handleStartDay}
          isWorkoutComplete={isWorkoutComplete}
          onOpenCalendar={() => setView('calendar')}
          resetAll={resetAll}
        />
      )}
      {view === 'workout' && activeDay && (
        <WorkoutScreen
          dayData={activeDay}
          onBack={handleBack}
          onComplete={handleWorkoutComplete}
          logSet={logSet}
          getLastWeight={getLastWeight}
        />
      )}
      {view === 'calendar' && (
        <CalendarScreen
          isWorkoutComplete={isWorkoutComplete}
          log={log}
          onBack={() => setView('home')}
          resetWeek={resetWeek}
          resetAll={resetAll}
        />
      )}
    </div>
  )
}
