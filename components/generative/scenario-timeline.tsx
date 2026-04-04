import type { ScenarioTimelineProps } from '@/types/components'

export function ScenarioTimeline({ title, events }: ScenarioTimelineProps) {
  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <h3 className="font-bold text-base">{title}</h3>
      <div className="relative pl-4 border-l-2 border-primary-200 flex flex-col gap-4">
        {events.map((event, i) => (
          <div key={i} className="relative flex flex-col gap-0.5">
            <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-primary border-2 border-white" />
            <p className="text-xs text-default-400">{event.date}</p>
            <p className="text-sm font-semibold">{event.label}</p>
            <p className={`text-sm font-bold ${event.amount < 0 ? 'text-danger' : 'text-success'}`}>
              {event.amount < 0 ? '-' : '+'}${Math.abs(event.amount).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
