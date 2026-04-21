import { useState, useCallback } from 'react'

const STORAGE_KEY = 'bowflex_workout_log'

function loadLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLog(log) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
}

export function useWorkoutLog() {
  const [log, setLog] = useState(loadLog)

  const logSet = useCallback((workoutId, exerciseName, setIndex, weight, reps) => {
    setLog(prev => {
      const next = { ...prev }
      const wKey = `workout_${workoutId}`
      if (!next[wKey]) next[wKey] = { completed: false, exercises: {} }
      if (!next[wKey].exercises[exerciseName]) next[wKey].exercises[exerciseName] = { sets: [] }
      const sets = [...(next[wKey].exercises[exerciseName].sets)]
      sets[setIndex] = { weight, reps, loggedAt: new Date().toISOString() }
      next[wKey].exercises[exerciseName] = { sets }
      saveLog(next)
      return next
    })
  }, [])

  const markWorkoutComplete = useCallback((workoutId) => {
    setLog(prev => {
      const next = { ...prev }
      const wKey = `workout_${workoutId}`
      if (!next[wKey]) next[wKey] = { completed: false, exercises: {} }
      next[wKey].completed = true
      next[wKey].completedAt = new Date().toISOString()
      saveLog(next)
      return next
    })
  }, [])

  const isWorkoutComplete = useCallback((workoutId) => {
    return log[`workout_${workoutId}`]?.completed === true
  }, [log])

  const getLastWeight = useCallback((exerciseName) => {
    for (let id = 18; id >= 1; id--) {
      const wLog = log[`workout_${id}`]
      if (wLog?.exercises?.[exerciseName]?.sets?.length > 0) {
        const sets = wLog.exercises[exerciseName].sets
        const lastSet = sets.filter(Boolean).pop()
        if (lastSet?.weight) return lastSet.weight
      }
    }
    return 10
  }, [log])

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setLog({})
  }, [])

  const resetWeek = useCallback((weekNum) => {
    setLog(prev => {
      const next = { ...prev }
      const startId = (weekNum - 1) * 3 + 1
      for (let id = startId; id < startId + 3; id++) {
        delete next[`workout_${id}`]
      }
      saveLog(next)
      return next
    })
  }, [])

  return { log, logSet, markWorkoutComplete, isWorkoutComplete, getLastWeight, resetAll, resetWeek }
}
