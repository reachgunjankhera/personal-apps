import { useState, useEffect, useRef } from 'react'
import { getExercise } from '../data/exercises'

export default function WorkoutScreen({ dayData, onBack, onComplete, logSet, getLastWeight }) {
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [setIdx, setSetIdx] = useState(0)
  const [weight, setWeight] = useState(10)
  const [reps, setReps] = useState(10)
  const [phase, setPhase] = useState('exercise')
  const [restRemaining, setRestRemaining] = useState(0)
  const [justLogged, setJustLogged] = useState(false)
  const [showDesc, setShowDesc] = useState(false)
  // Timer state
  const [timerRunning, setTimerRunning] = useState(true)
  const [timerElapsed, setTimerElapsed] = useState(0)   // for stopwatch (strength/bodyweight)
  const [countdownVal, setCountdownVal] = useState(0)   // for countdown (timed)

  const timerRef = useRef(null)
  const exerciseTimerRef = useRef(null)
  const [timedDone, setTimedDone] = useState(false) // signal when countdown hits 0

  const currentEx = dayData.exercises[exerciseIdx]
  const exData = getExercise(currentEx.ex_id)
  const isTimed = exData?.type === 'Timed'
  const isBodyWeight = exData?.type === 'Body Weight'
  const isStrength = !isTimed && !isBodyWeight
  const isLastExercise = exerciseIdx === dayData.exercises.length - 1
  const isLastSet = setIdx === currentEx.sets - 1

  // Reset when exercise changes
  useEffect(() => {
    if (!isTimed && !isBodyWeight) setWeight(getLastWeight(currentEx.name))
    setReps(currentEx.reps)
    setSetIdx(0)
    setShowDesc(false)
    setJustLogged(false)
    setTimedDone(false)
    setPhase('exercise')
    clearInterval(timerRef.current)
    clearInterval(exerciseTimerRef.current)
    if (isTimed) {
      setCountdownVal(currentEx.reps)
    } else {
      setTimerElapsed(0)
    }
    setTimerRunning(true)
  }, [exerciseIdx])

  // Also reset countdown when set changes (after rest)
  useEffect(() => {
    if (!isTimed) return
    setCountdownVal(currentEx.reps)
    setTimedDone(false)
  }, [setIdx])

  // Stopwatch for strength/bodyweight
  useEffect(() => {
    if (isTimed || phase !== 'exercise') return
    clearInterval(exerciseTimerRef.current)
    if (timerRunning) {
      exerciseTimerRef.current = setInterval(() => {
        setTimerElapsed(t => t + 1)
      }, 1000)
    }
    return () => clearInterval(exerciseTimerRef.current)
  }, [timerRunning, isTimed, phase])

  // Countdown for timed exercises — only sets timedDone flag when done
  useEffect(() => {
    if (!isTimed || phase !== 'exercise') return
    clearInterval(exerciseTimerRef.current)
    if (timerRunning) {
      exerciseTimerRef.current = setInterval(() => {
        setCountdownVal(c => {
          if (c <= 1) {
            clearInterval(exerciseTimerRef.current)
            setTimedDone(true) // signal completion cleanly
            return 0
          }
          return c - 1
        })
      }, 1000)
    }
    return () => clearInterval(exerciseTimerRef.current)
  }, [timerRunning, isTimed, phase])

  // React to countdown completion — has access to fresh state via closure
  useEffect(() => {
    if (!timedDone) return
    setTimedDone(false)
    setTimerRunning(false)
    logSet(dayData.id, currentEx.name, setIdx, 0, currentEx.reps)
    setJustLogged(true)
    setTimeout(() => {
      setJustLogged(false)
      if (isLastSet && isLastExercise) { onComplete(); return }
      setRestRemaining(currentEx.rest)
      setPhase('rest')
    }, 600)
  }, [timedDone])

  // Rest phase timer
  useEffect(() => {
    if (phase !== 'rest') return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRestRemaining(r => {
        if (r <= 1) { clearInterval(timerRef.current); advanceAfterRest(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  function advanceAfterRest() {
    setPhase('exercise')
    if (isLastSet) {
      if (isLastExercise) onComplete()
      else {
        setExerciseIdx(i => i + 1)
        setSetIdx(0)
      }
    } else {
      setSetIdx(s => s + 1)
      // Restart exercise timer after rest
      if (isTimed) {
        setCountdownVal(currentEx.reps)
        setTimerRunning(true)
      } else {
        setTimerElapsed(0)
        setTimerRunning(true)
      }
    }
  }

  function handleLogSet() {
    setTimerRunning(false)
    clearInterval(exerciseTimerRef.current)
    logSet(dayData.id, currentEx.name, setIdx, isTimed ? 0 : weight, reps)
    setJustLogged(true)
    setTimeout(() => {
      setJustLogged(false)
      if (isLastSet && isLastExercise) { onComplete(); return }
      setRestRemaining(currentEx.rest)
      setPhase('rest')
    }, 400)
  }

  function skipRest() {
    clearInterval(timerRef.current)
    advanceAfterRest()
  }

  function toggleTimer() {
    setTimerRunning(r => !r)
  }

  function formatStopwatch(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function formatCountdown(seconds) {
    return `${seconds}s`
  }

  if (phase === 'rest') {
    return (
      <RestScreen
        seconds={restRemaining}
        total={currentEx.rest}
        nextExercise={isLastSet && !isLastExercise ? dayData.exercises[exerciseIdx + 1]?.name : null}
        onSkip={skipRest}
      />
    )
  }

  const previewImg = exData?.preview ? `./exercises/previews/${exData.preview}` : null

  const timerLabel = isTimed ? formatCountdown(countdownVal) : formatStopwatch(timerElapsed)

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 active:text-white py-1 px-2">
          <span className="text-2xl leading-none">‹</span><span className="text-base">Back</span>
        </button>
        <div className="text-center">
          <div className="text-orange-400 font-bold text-xl italic">Week {dayData.week} · Day {dayData.day}</div>
        </div>
        <div className="w-16" />
      </div>

      {/* Exercise name + counter */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 flex-shrink-0">
        <h2 className="text-xl font-bold text-white leading-tight flex-1 mr-3">{currentEx.name}</h2>
        <div className="text-gray-400 font-semibold text-lg whitespace-nowrap">{exerciseIdx + 1} / {dayData.exercises.length}</div>
      </div>

      {/* Image area — flex-1, Ken Burns, overlays */}
      <div className="relative flex-1 bg-black min-h-0 overflow-hidden">
        {previewImg && (
          <img
            src={previewImg}
            className="w-full h-full object-contain kenburns"
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Muscles chip — top-left */}
        {exData?.muscles && (
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white/80">
            {exData.muscles}
          </div>
        )}

        {/* How to button — top-right */}
        <button
          onClick={() => setShowDesc(d => !d)}
          className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-white/80 active:bg-black/70"
        >
          How to
        </button>

        {/* How to overlay — covers image with semi-transparent bg */}
        {showDesc && exData?.description && (
          <div className="absolute inset-0 bg-black/85 flex items-start justify-center p-8 pt-12">
            <button
              onClick={() => setShowDesc(false)}
              className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center bg-white/20 rounded-full text-white text-xl font-bold active:bg-white/30"
            >
              ✕
            </button>
            <p className="text-white text-base leading-relaxed text-center">{exData.description}</p>
          </div>
        )}

        {/* Timer overlay — bottom-left, tap to play/pause */}
        <button
          onClick={toggleTimer}
          className="absolute bottom-10 left-3 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 active:bg-black/80"
        >
          <span className="text-white/60 text-sm">{timerRunning ? '⏸' : '▶'}</span>
          <span className={`text-2xl font-bold num-display ${isTimed ? 'text-orange-400' : 'text-white'}`}>
            {timerLabel}
          </span>
        </button>

        {/* Set dots — bottom-center */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
          {Array.from({ length: currentEx.sets }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border-2 border-white/40 transition-all ${
                i < setIdx ? 'bg-green-500 border-green-500' : i === setIdx ? 'bg-orange-500 border-orange-500' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Set info strip */}
      <div className="flex items-stretch bg-gray-900 border-t border-gray-800 flex-shrink-0">
        <div className="flex-1 text-center py-3 border-r border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Set</div>
          <div className="text-2xl font-bold num-display">{setIdx + 1}<span className="text-gray-600">/{currentEx.sets}</span></div>
        </div>
        <div className="flex-1 text-center py-3 border-r border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Target</div>
          <div className="text-2xl font-bold num-display text-orange-400">{isTimed ? `${currentEx.reps}s` : `${currentEx.reps} reps`}</div>
        </div>
        <div className="flex-1 text-center py-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Rest</div>
          <div className="text-2xl font-bold num-display">{currentEx.rest}s</div>
        </div>
      </div>

      {/* Inputs row — weight + reps for strength; nothing for timed */}
      {isStrength && (
        <div className="flex gap-4 px-6 py-2 bg-gray-950 flex-shrink-0">
          <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-800 p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 text-center">Weight (lbs)</div>
            <div className="flex items-center gap-2">
              <StepBtn label="−" onPress={() => setWeight(w => Math.max(5, Math.round((w - 2.5) * 2) / 2))} />
              <div className="text-2xl font-bold text-center flex-1 num-display">{weight}</div>
              <StepBtn label="+" onPress={() => setWeight(w => Math.round((w + 2.5) * 2) / 2)} />
            </div>
          </div>
          <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-800 p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 text-center">Reps Done</div>
            <div className="flex items-center gap-2">
              <StepBtn label="−" onPress={() => setReps(r => Math.max(1, r - 1))} />
              <div className="text-2xl font-bold text-center flex-1 num-display">{reps}</div>
              <StepBtn label="+" onPress={() => setReps(r => r + 1)} />
            </div>
          </div>
        </div>
      )}

      {/* Body weight: reps stepper only */}
      {isBodyWeight && (
        <div className="flex gap-4 px-6 py-2 bg-gray-950 flex-shrink-0">
          <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-800 p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 text-center">Reps Done</div>
            <div className="flex items-center gap-2">
              <StepBtn label="−" onPress={() => setReps(r => Math.max(1, r - 1))} />
              <div className="text-2xl font-bold text-center flex-1 num-display">{reps}</div>
              <StepBtn label="+" onPress={() => setReps(r => r + 1)} />
            </div>
          </div>
        </div>
      )}

      {/* Log Set button — smaller */}
      <div className="px-6 pb-2 flex-shrink-0">
        <button
          onClick={handleLogSet}
          disabled={justLogged}
          className={`w-full py-3 rounded-2xl text-base font-bold transition-all active:scale-95 ${
            justLogged ? 'bg-green-600' : 'bg-orange-500 active:bg-orange-600'
          }`}
        >
          {justLogged ? '✓ Logged!' : isLastSet && isLastExercise ? 'Finish Workout' : 'Log Set'}
        </button>
      </div>

      {/* Prev / Next navigation — bold, big */}
      <div className="flex items-center justify-between px-4 pb-5 pt-1 flex-shrink-0">
        <button
          onClick={() => { setExerciseIdx(i => Math.max(0, i - 1)); setSetIdx(0) }}
          disabled={exerciseIdx === 0}
          className="flex items-center text-orange-500 font-black text-3xl disabled:opacity-30 active:text-orange-400 py-4 px-6 uppercase"
        >
          ‹ PREV
        </button>
        <div className="flex gap-1.5">
          {dayData.exercises.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i < exerciseIdx ? 'w-2 h-2 bg-green-500' : i === exerciseIdx ? 'w-3 h-3 bg-orange-500' : 'w-2 h-2 bg-gray-700'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => { setExerciseIdx(i => Math.min(dayData.exercises.length - 1, i + 1)); setSetIdx(0) }}
          disabled={exerciseIdx === dayData.exercises.length - 1}
          className="flex items-center text-orange-500 font-black text-3xl disabled:opacity-30 active:text-orange-400 py-4 px-6 uppercase"
        >
          NEXT ›
        </button>
      </div>
    </div>
  )
}

function StepBtn({ label, onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-10 h-10 rounded-xl bg-gray-800 text-white text-xl font-bold flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all flex-shrink-0"
    >
      {label}
    </button>
  )
}

function RestScreen({ seconds, total, nextExercise, onSkip }) {
  const pct = total > 0 ? (seconds / total) * 100 : 0
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDash = (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 text-white px-8">
      <div className="text-2xl font-bold text-gray-400 mb-8 uppercase tracking-widest">Rest</div>
      <div className="relative mb-8">
        <svg width="180" height="180" className="-rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#f97316" strokeWidth="10"
            strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-bold num-display">{seconds}</span>
        </div>
      </div>
      {nextExercise && (
        <div className="text-center mb-8">
          <div className="text-gray-500 text-sm mb-1">Next exercise</div>
          <div className="text-white text-xl font-semibold">{nextExercise}</div>
        </div>
      )}
      <button onClick={onSkip} className="bg-gray-800 text-white px-10 py-4 rounded-2xl text-lg font-semibold active:bg-gray-700 active:scale-95 transition-all">
        Skip Rest →
      </button>
    </div>
  )
}
