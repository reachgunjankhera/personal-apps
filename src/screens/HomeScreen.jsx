import { ALL_DAYS, CHALLENGE } from '../data/workouts'

const WEEK_COLORS = ['bg-orange-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-600', 'bg-blue-600', 'bg-purple-600']

export default function HomeScreen({ onStartDay, isWorkoutComplete, onOpenCalendar, resetAll }) {
  const totalCompleted = ALL_DAYS.filter(d => isWorkoutComplete(d.id)).length
  const nextDay = ALL_DAYS.find(d => !isWorkoutComplete(d.id))
  const allComplete = totalCompleted === 18

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-y-auto">
      <div className="bg-gray-900 px-8 pt-10 pb-6 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl">🏋️</span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">Bowflex Training</h1>
            <p className="text-gray-400 text-base">6-Week Dumbbell Challenge</p>
          </div>
          <button
            onClick={onOpenCalendar}
            className="text-3xl active:scale-90 transition-all p-2"
            aria-label="View progress calendar"
          >
            📅
          </button>
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{totalCompleted} of 18 workouts complete</span>
            <span className="font-semibold text-white">{Math.round((totalCompleted / 18) * 100)}%</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${(totalCompleted / 18) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex divide-x divide-gray-800 bg-gray-900 border-b border-gray-800">
        {[{ label: 'Workouts', value: '18' }, { label: 'Per Week', value: '3×' }, { label: 'Duration', value: '~30 min' }, { label: 'Equipment', value: 'Dumbbells' }].map(({ label, value }) => (
          <div key={label} className="flex-1 text-center py-4">
            <div className="text-xl font-bold text-orange-400">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {allComplete ? (
        <div className="mx-6 mt-6">
          <div className="w-full bg-orange-500 rounded-2xl px-6 py-5">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-xl font-bold text-white">Challenge Complete!</div>
              <div className="text-orange-200 text-sm mt-1">You crushed the 6-week challenge.</div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Start over? This will reset all your progress.')) resetAll()
              }}
              className="w-full bg-white text-orange-600 font-bold py-3 rounded-xl active:scale-95 transition-all"
            >
              Start Over
            </button>
          </div>
        </div>
      ) : nextDay && (
        <div className="mx-6 mt-6">
          <button onClick={() => onStartDay(nextDay)} className="w-full bg-orange-500 rounded-2xl px-6 py-5 flex items-center justify-between active:bg-orange-600 transition-all">
            <div className="text-left">
              <div className="text-xs font-semibold text-orange-200 uppercase tracking-wider mb-1">Up Next</div>
              <div className="text-xl font-bold text-white">Week {nextDay.week} · Day {nextDay.day}</div>
              <div className="text-orange-200 text-sm mt-0.5">{nextDay.exercises.length} exercises</div>
            </div>
            <div className="text-5xl">▶</div>
          </button>
        </div>
      )}

      <div className="px-6 mt-6 mb-8 space-y-6">
        {CHALLENGE.weeks.map((week, wi) => {
          const weekNum = wi + 1
          const weekDays = ALL_DAYS.filter(d => d.week === weekNum)
          const weekCompleted = weekDays.filter(d => isWorkoutComplete(d.id)).length
          const isWeekDone = weekCompleted === 3

          return (
            <div key={weekNum}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`${WEEK_COLORS[wi]} text-white text-xs font-bold px-3 py-1 rounded-full`}>WEEK {weekNum}</div>
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i < weekCompleted ? WEEK_COLORS[wi] : 'bg-gray-700'}`} />)}
                </div>
                {isWeekDone && <span className="text-green-500 text-sm font-semibold">Complete ✓</span>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {weekDays.map((dayData) => {
                  const completed = isWorkoutComplete(dayData.id)
                  return (
                    <button key={dayData.id} onClick={() => onStartDay(dayData)}
                      className={`rounded-2xl border text-left transition-all active:scale-95 overflow-hidden ${completed ? 'bg-gray-900 border-gray-700' : 'bg-gray-900 border-gray-800 active:border-orange-500'}`}>
                      <div className="relative h-28 bg-gray-800 overflow-hidden">
                        <img src={`./exercises/previews/${getFirstPreview(dayData.exercises)}`} className="w-full h-full object-cover" onError={e => { e.target.style.display='none' }} />
                        {completed && <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center"><span className="text-4xl">✅</span></div>}
                        <div className={`absolute top-2 left-2 ${WEEK_COLORS[wi]} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>Day {dayData.day}</div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="text-sm font-semibold text-white mb-1">{dayData.exercises.length} exercises</div>
                        <div className="text-xs text-gray-500 truncate">{dayData.exercises[0]?.name}</div>
                        <div className={`mt-3 rounded-lg py-2 text-center text-xs font-bold ${completed ? 'bg-gray-700 text-gray-200' : 'bg-orange-500 text-white'}`}>{completed ? 'Done' : 'Start'}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PREVIEW_MAP = {2:'AlternatingStepUpsPreview.jpg',5:'BenchTricepDipsPreview.jpg',7:'BurpeesPreview.jpg',12:'DumbbellBenchTricepsExtensionPreview.jpg',13:'DumbbellBentOverBackRowPreview.jpg',14:'DumbbellBicepsCurlPreview.jpg',15:'DumbbellBicepsCurlSupinationPreview.jpg',16:'DumbbellChestFlysPreview.jpg',17:'DumbbellChestPressPreview.jpg',20:'DumbbellDeadliftPreview.jpg',23:'DumbbellFrontLateralShoulderRaisesPreview.jpg',24:'DumbbellGobletSquatPreview.jpg',26:'DumbbellInclineChestFlysPreview.jpg',27:'DumbbellInclineChestPressPreview.jpg',29:'DumbbellLatPullOverHipBridgePreview.jpg',33:'DumbbellLungePreview.jpg',37:'DumbbellOneArmBentOverBackRowPreview.jpg',39:'DumbbellReachUpsPreview.jpg',40:'DumbbellRearDeltFlyPreview.jpg',41:'DumbbellReverseLungesShoulderThrustersPreview.jpg',44:'DumbbellShoulderPressPreview.jpg',48:'DumbbellSquatcapturePreview.jpg',49:'DumbbellSquatShoulderThrustersPreview.jpg',50:'DumbbellSquatSwingsPreview.jpg',51:'DumbbellSquatHighPullPreview.jpg',52:'DumbbellSquatwithBicepsCurlPreview.jpg',55:'DumbbellSumoBackRowPreview.jpg',57:'DumbbellTricepsOverheadExtensionPreview.jpg',59:'DumbbellVSitPunchesPreview.jpg',61:'HighKneesPreview.jpg',63:'DumbbellJumpSquatsPreview.jpg',64:'JumpingJacksPreview.jpg',67:'MountainClimbersPreview.jpg',72:'SkatersPreview.jpg',73:'SpeedPushUpsPreview.jpg',76:'TricepsPushUpsPreview.jpg',77:'VUpsPreview.jpg',78:'WindshieldWipersPreview.jpg'}

function getFirstPreview(exercises) {
  for (const ex of exercises) {
    if (PREVIEW_MAP[ex.ex_id]) return PREVIEW_MAP[ex.ex_id]
  }
  return ''
}
