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
  const [timerRunning, setTimerRunning] = useState(true)
  const [timerElapsed, setTimerElapsed] = useState(0)
  const [countdownVal, setCountdownVal] = useState(0)
  const [timedDone, setTimedDone] = useState(false)  // signals countdown hit 0
  const [restDone, setRestDone] = useState(false)    // signals rest timer hit 0

  const timerRef = useRef(null)
  const exerciseTimerRef = useRef(null)

  const currentEx = dayData.exercises[exerciseIdx]
  const exData = getExercise(currentEx.ex_id)
  const isTimed = exData?.type === 'Timed'
  const isBodyWeight = exData?.type === 'Body Weight'
  const isStrength = !isTimed && !isBodyWeight
  const isLastExercise = exerciseIdx === dayData.exercises.length - 1
  const isLastSet = setIdx === currentEx.sets - 1

  // Reset everything when exercise changes (including when Next/Prev is tapped)
  useEffect(() => {
    if (!isTimed && !isBodyWeight) setWeight(getLastWeight(currentEx.name))
    setReps(currentEx.reps)
    setSetIdx(0)
    setShowDesc(false)
    setJustLogged(false)
    setTimedDone(false)
    setRestDone(false)
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

  // Reset countdown when set changes (after rest advances to next set)
  useEffect(() => {
    if (!isTimed) return
    setCountdownVal(currentEx.reps)
    setTimedDone(false)
  }, [setIdx])

  // Stopwatch for strength/bodyweight — exerciseIdx in deps ensures restart on Next
  useEffect(() => {
    if (isTimed || phase !== 'exercise') return
    clearInterval(exerciseTimerRef.current)
    if (timerRunning) {
      exerciseTimerRef.current = setInterval(() => {
        setTimerElapsed(t => t + 1)
      }, 1000)
    }
    return () => clearInterval(exerciseTimerRef.current)
  }, [timerRunning, isTimed, phase, exerciseIdx])

  // Countdown for timed exercises — exerciseIdx in deps ensures restart on Next
  useEffect(() => {
    if (!isTimed || phase !== 'exercise') return
    clearInterval(exerciseTimerRef.current)
    if (timerRunning) {
      exerciseTimerRef.current = setInterval(() => {
        setCountdownVal(c => {
          if (c <= 1) {
            clearInterval(exerciseTimerRef.current)
            setTimedDone(true)
            return 0
          }
          return c - 1
        })
      }, 1000)
    }
    return () => clearInterval(exerciseTimerRef.current)
  }, [timerRunning, isTimed, phase, exerciseIdx])

  // Handle countdown completion — fresh state access via effect (fixes stale closure)
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

  // Rest timer — only signals restDone (fixes stale closure in advanceAfterRest)
  useEffect(() => {
    if (phase !== 'rest') return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRestRemaining(r => {
        if (r <= 1) {
          clearInterval(timerRef.current)
          setRestDone(true)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // Handle rest completion — fresh state access via effect (fixes Bug 1)
  useEffect(() => {
    if (!restDone) return
    setRestDone(false)
    advanceFromRest()
  }, [restDone])

  function advanceFromRest() {
    if (isLastSet) {
      if (isLastExercise) {
        onComplete()
      } else {
        setExerciseIdx(i => i + 1)
        setSetIdx(0)
      }
    } else {
      setSetIdx(s => s + 1)
      if (isTimed) {
        setCountdownVal(currentEx.reps)
      } else {
        setTimerElapsed(0)
      }
      setTimerRunning(true)
    }
    setPhase('exercise')
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
    setRestDone(false)
    advanceFromRest()
  }

  function toggleTimer() {
    setTimerRunning(r => !r)
  }

  function formatStopwatch(s) {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
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
  const kbClass = `kb-${exerciseIdx % 4}`
  const timerLabel = isTimed ? `${countdownVal}s` : formatStopwatch(timerElapsed)

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 active:text-white py-1 px-2">
          <span className="text-2xl leading-none">‹</span><span className="text-base">Back</span>
        </button>
        <div className="text-orange-400 font-bold text-xl italic">Week {dayData.week} · Day {dayData.day}</div>
        <div className="w-16" />
      </div>

      {/* Exercise name + counter */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 flex-shrink-0">
        <h2 className="text-xl font-bold text-white leading-tight flex-1 mr-3">{currentEx.name}</h2>
        <div className="text-gray-400 font-semibold text-lg whitespace-nowrap">{exerciseIdx + 1} / {dayData.exercises.length}</div>
      </div>

      {/* Main area: [weight] | image | [reps] */}
      <div className="flex flex-1 min-h-0">

        {/* Left panel: weight (strength only) */}
        {isStrength && (
          <div className="flex flex-col items-center justify-center w-16 bg-gray-900 border-r border-gray-800 gap-3 py-6 flex-shrink-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide">lbs</div>
            <StepBtn label="+" onPress={() => setWeight(w => Math.round((w + 2.5) * 2) / 2)} />
            <div className="text-xl font-bold num-display text-center">{weight}</div>
            <StepBtn label="−" onPress={() => setWeight(w => Math.max(5, Math.round((w - 2.5) * 2) / 2))} />
          </div>
        )}

        {/* Center: image + overlays */}
        <div className="relative flex-1 bg-black min-h-0 overflow-hidden">
          {previewImg && (
            <img
              src={previewImg}
              className={`w-full h-full object-cover ${kbClass}`}
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          {/* Muscles chip */}
          {exData?.muscles && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white/80">
              {exData.muscles}
            </div>
          )}

          {/* How to button */}
          <button
            onClick={() => setShowDesc(d => !d)}
            className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-white/80 active:bg-black/70"
          >
            How to
          </button>

          {/* How to overlay */}
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

          {/* Timer — large, centered — tap to play/pause */}
          <button
            onClick={toggleTimer}
            className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-1"
          >
            <span className={`text-7xl font-black num-display drop-shadow-lg ${isTimed ? 'text-orange-400' : 'text-white/90'}`}>
              {timerLabel}
            </span>
            <span className="text-white/40 text-xs mt-1">{timerRunning ? '⏸ tap to pause' : '▶ tap to resume'}</span>
          </button>

          {/* Set dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {Array.from({ length: currentEx.sets }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  i < setIdx ? 'bg-green-500 border-green-500' : i === setIdx ? 'bg-orange-400 border-orange-400' : 'bg-transparent border-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right panel: reps (strength or bodyweight) */}
        {(isStrength || isBodyWeight) && (
          <div className="flex flex-col items-center justify-center w-16 bg-gray-900 border-l border-gray-800 gap-3 py-6 flex-shrink-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide">reps</div>
            <StepBtn label="+" onPress={() => setReps(r => r + 1)} />
            <div className="text-xl font-bold num-display text-center">{reps}</div>
            <StepBtn label="−" onPress={() => setReps(r => Math.max(1, r - 1))} />
          </div>
        )}
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

      {/* Log Set button */}
      <div className="px-6 py-2 flex-shrink-0">
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

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between px-4 pb-5 pt-1 flex-shrink-0">
        <button
          onClick={() => setExerciseIdx(i => Math.max(0, i - 1))}
          disabled={exerciseIdx === 0}
          className="flex items-center text-orange-400 font-black text-3xl disabled:opacity-30 active:text-orange-300 py-4 px-6 uppercase"
        >
          ‹ PREV
        </button>
        <div className="flex gap-1.5">
          {dayData.exercises.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i < exerciseIdx ? 'w-2 h-2 bg-green-500' : i === exerciseIdx ? 'w-3 h-3 bg-orange-400' : 'w-2 h-2 bg-gray-700'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setExerciseIdx(i => Math.min(dayData.exercises.length - 1, i + 1))}
          disabled={exerciseIdx === dayData.exercises.length - 1}
          className="flex items-center text-orange-400 font-black text-3xl disabled:opacity-30 active:text-orange-300 py-4 px-6 uppercase"
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
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#fb923c" strokeWidth="10"
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
