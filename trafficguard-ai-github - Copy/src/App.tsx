import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  CarFront,
  Check,
  ChevronDown,
  Cloud,
  CloudRain,
  Construction,
  Gauge as GaugeIcon,
  Info,
  MapPin,
  RefreshCcw,
  Route,
  Sun,
  Timer,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { Route as WouterRoute, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const ROADS = ['MG Road', 'Whitefield', 'Electronic City', 'Hebbal', 'Indiranagar'] as const;
type Road = (typeof ROADS)[number];
type Weather = 'Clear' | 'Cloudy' | 'Rain';
type DayType = 'Weekday' | 'Weekend';
type Level = 'LOW' | 'MEDIUM' | 'HIGH';

const HISTORICAL: Record<Road, number[]> = {
  'MG Road': [82, 88, 85, 90, 48, 18],
  Whitefield: [78, 83, 81, 94, 45, 15],
  'Electronic City': [75, 80, 78, 96, 42, 12],
  Hebbal: [68, 74, 72, 86, 40, 10],
  Indiranagar: [80, 86, 84, 98, 50, 16],
};

const BASELINE: Record<Road, { volume: number; capacity: number }> = {
  'MG Road': { volume: 1800, capacity: 2000 },
  Whitefield: { volume: 1650, capacity: 2200 },
  'Electronic City': { volume: 2100, capacity: 2600 },
  Hebbal: { volume: 1500, capacity: 2400 },
  Indiranagar: { volume: 1400, capacity: 1800 },
};

const PEAK_HOURS = [
  { label: 'Morning peak', window: '07:00 – 10:00', from: 7, to: 10, effect: 20 },
  { label: 'Evening peak', window: '17:00 – 20:00', from: 17, to: 20, effect: 22 },
] as const;

type Conditions = {
  weather: Weather;
  volume: number;
  capacity: number;
  specialEvent: boolean;
  accident: boolean;
  construction: boolean;
};

const defaultConditions = (): Record<Road, Conditions> =>
  ROADS.reduce((all, road) => {
    all[road] = {
      weather: 'Clear',
      volume: BASELINE[road].volume,
      capacity: BASELINE[road].capacity,
      specialEvent: false,
      accident: false,
      construction: false,
    };
    return all;
  }, {} as Record<Road, Conditions>);

const average = (road: Road) => HISTORICAL[road].reduce((sum, value) => sum + value, 0) / HISTORICAL[road].length;
const vcRatio = (volume: number, capacity: number) => (capacity > 0 ? (volume / capacity) * 100 : 0);
const timeEffect = (hour: number) => (hour >= 7 && hour <= 10 ? 20 : hour >= 17 && hour <= 20 ? 22 : hour <= 5 ? -20 : 0);
const weatherEffect = (weather: Weather) => (weather === 'Rain' ? 12 : weather === 'Cloudy' ? 5 : 0);
const vehicleEffect = (volume: number, capacity: number) => {
  const ratio = vcRatio(volume, capacity);
  return ratio >= 100 ? 25 : ratio >= 80 ? 18 : ratio >= 60 ? 10 : ratio >= 40 ? 5 : 0;
};
const isPeak = (hour: number) => PEAK_HOURS.some((period) => hour >= period.from && hour <= period.to);
const classify = (index: number): Level => (index >= 70 ? 'HIGH' : index >= 40 ? 'MEDIUM' : 'LOW');
const recommendation = (level: Level) =>
  level === 'HIGH'
    ? 'High congestion expected. Consider an alternate route or travel time.'
    : level === 'MEDIUM'
      ? 'Medium congestion expected. Allow additional travel time.'
      : 'Low congestion expected. Traffic should be relatively normal.';

function predict(road: Road, hour: number, dayType: DayType, conditions: Conditions) {
  const raw =
    average(road) * 0.5 +
    timeEffect(hour) +
    vehicleEffect(conditions.volume, conditions.capacity) +
    weatherEffect(conditions.weather) +
    (conditions.specialEvent ? 12 : 0) +
    (conditions.accident ? 20 : 0) +
    (conditions.construction ? 15 : 0) +
    (dayType === 'Weekend' ? -5 : 0);
  return Math.min(100, Math.max(0, raw));
}

const levelStyle: Record<Level, { text: string; bg: string; bar: string; ring: string; marker: string }> = {
  LOW: { text: 'text-[#16806d]', bg: 'bg-[#16806d]/10 border-[#16806d]/25', bar: 'bg-[#16806d]', ring: 'stroke-[#16806d]', marker: 'bg-[#16806d]' },
  MEDIUM: { text: 'text-[#b66d06]', bg: 'bg-[#b66d06]/10 border-[#b66d06]/25', bar: 'bg-[#d58a10]', ring: 'stroke-[#d58a10]', marker: 'bg-[#d58a10]' },
  HIGH: { text: 'text-[#b54037]', bg: 'bg-[#b54037]/10 border-[#b54037]/25', bar: 'bg-[#b54037]', ring: 'stroke-[#b54037]', marker: 'bg-[#b54037]' },
};

function Toggle({
  label,
  icon,
  value,
  onChange,
  testId,
}: {
  label: string;
  icon: ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      data-testid={testId}
      onClick={() => onChange(!value)}
      className={`group flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-all hover:-translate-y-px ${
        value ? 'border-[#16806d]/40 bg-[#16806d]/[.07]' : 'border-[#cfc9bb] bg-[#faf9f4] hover:border-[#a8a194]'
      }`}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[#31434a]">
        <span className={value ? 'text-[#16806d]' : 'text-[#8a918f]'}>{icon}</span>
        {label}
      </span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-[#16806d]' : 'bg-[#d4d0c6]'}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-[#faf9f4] shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

function Gauge({ index, level }: { index: number; level: Level }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const style = levelStyle[level];
  return (
    <div className="relative size-[190px] shrink-0" data-testid="gauge-traffic-index">
      <svg viewBox="0 0 160 160" className="-rotate-90 size-full">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(38 19% 84%)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          className={`${style.ring} transition-all duration-700`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - index / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`tg-display text-[42px] font-bold tracking-[-.06em] ${style.text}`} data-testid="text-traffic-index">
          {index.toFixed(1)}
        </span>
        <span className="tg-number text-[10px] uppercase tracking-[.15em] text-[#6c7779]">of 100</span>
      </div>
    </div>
  );
}

function TrafficPulseChart({
  road,
  hour,
  dayType,
  conditions,
  onHourChange,
}: {
  road: Road;
  hour: number;
  dayType: DayType;
  conditions: Conditions;
  onHourChange: (hour: number) => void;
}) {
  const chartHours = [0, 4, 7, 10, 13, 16, 18, 20, 23];
  const points = chartHours.map((chartHour) => ({
    hour: chartHour,
    index: predict(road, chartHour, dayType, conditions),
  }));
  const left = 30;
  const right = 650;
  const top = 18;
  const bottom = 168;
  const x = (chartHour: number) => left + (chartHour / 23) * (right - left);
  const y = (value: number) => bottom - (value / 100) * (bottom - top);
  const linePath = points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${x(point.hour)} ${y(point.index)}`).join(' ');
  const areaPath = `${linePath} L ${x(23)} ${bottom} L ${x(0)} ${bottom} Z`;

  return (
    <div className="tg-card mt-5 rounded-[26px] border border-[#ddd8cc] p-5 sm:p-6" data-testid="panel-traffic-pulse">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#16806d]">
            <BarChart3 size={13} /> Graphical representation
          </p>
          <h3 className="tg-display mt-1 text-xl font-bold tracking-[-.04em]">Traffic pulse by hour</h3>
        </div>
        <div className="rounded-full border border-[#d6e9e0] bg-[#edf7f2] px-3 py-1.5 text-[10px] font-bold text-[#16806d]">
          {road} · {dayType}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e0dbd1] bg-[#fbfaf6] p-2 sm:p-4">
        <div className="overflow-x-auto">
          <svg viewBox="0 0 680 208" className="min-w-[620px] w-full" role="img" aria-label={`Traffic index forecast for ${road}`}>
            <defs>
              <linearGradient id="trafficPulseFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#16806d" stopOpacity=".24" />
                <stop offset="100%" stopColor="#16806d" stopOpacity=".02" />
              </linearGradient>
            </defs>
            {[25, 50, 75].map((gridValue) => (
              <g key={gridValue}>
                <line x1={left} x2={right} y1={y(gridValue)} y2={y(gridValue)} stroke="#e6e1d7" strokeDasharray="4 5" />
                <text x="0" y={y(gridValue) + 4} fill="#9aa19e" fontSize="9" fontFamily="DM Mono, monospace">{gridValue}</text>
              </g>
            ))}
            <line x1={left} x2={right} y1={y(70)} y2={y(70)} stroke="#b54037" strokeOpacity=".35" strokeDasharray="5 5" />
            <text x={right - 2} y={y(70) - 6} textAnchor="end" fill="#b54037" fontSize="9" fontWeight="700">high risk</text>
            <path d={areaPath} fill="url(#trafficPulseFill)" />
            <path d={linePath} fill="none" stroke="#16806d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point) => {
              const selected = point.hour === hour;
              return (
                <g key={point.hour}>
                  {selected && <line x1={x(point.hour)} x2={x(point.hour)} y1={top} y2={bottom} stroke="#d58a10" strokeDasharray="4 4" />}
                  <circle
                    cx={x(point.hour)}
                    cy={y(point.index)}
                    r={selected ? 7 : 5}
                    fill={selected ? '#d58a10' : '#faf9f4'}
                    stroke={selected ? '#a86a09' : '#16806d'}
                    strokeWidth="3"
                    className="cursor-pointer transition-all hover:stroke-[#b54037]"
                    role="button"
                    tabIndex={0}
                    aria-label={`Set hour to ${String(point.hour).padStart(2, '0')}:00, traffic index ${point.index.toFixed(1)}`}
                    data-testid={`chart-point-${point.hour}`}
                    onClick={() => onHourChange(point.hour)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') onHourChange(point.hour);
                    }}
                  />
                  <text x={x(point.hour)} y={bottom + 22} textAnchor="middle" fill="#7d8988" fontSize="9" fontFamily="DM Mono, monospace">
                    {String(point.hour).padStart(2, '0')}
                  </text>
                </g>
              );
            })}
            <text x={left} y="202" fill="#a0a5a1" fontSize="9">00:00</text>
            <text x={right} y="202" textAnchor="end" fill="#a0a5a1" fontSize="9">23:00</text>
          </svg>
        </div>
      </div>
      <p className="mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold text-[#89918f]">
        <span>Click any point to set the prediction hour.</span>
        <span className="tg-number text-[#b66d06]">selected · {String(hour).padStart(2, '0')}:00</span>
      </p>
    </div>
  );
}

function FieldLabel({ children, htmlFor, detail }: { children: ReactNode; htmlFor?: string; detail?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[.13em] text-[#677579]">
      <span>{children}</span>
      {detail}
    </label>
  );
}

function Home() {
  const [road, setRoad] = useState<Road>('MG Road');
  const [hour, setHour] = useState(18);
  const [dayType, setDayType] = useState<DayType>('Weekday');
  const [conditions, setConditions] = useState<Record<Road, Conditions>>(defaultConditions);
  const [tab, setTab] = useState<'peak' | 'roads'>('peak');

  const current = conditions[road];
  const update = (patch: Partial<Conditions>) => setConditions((prev) => ({ ...prev, [road]: { ...prev[road], ...patch } }));
  const resetRoad = () => setConditions((prev) => ({ ...prev, [road]: defaultConditions()[road] }));
  const resetAll = () => setConditions(defaultConditions());
  const index = predict(road, hour, dayType, current);
  const level = classify(index);
  const style = levelStyle[level];
  const confidence = HISTORICAL[road].length > 5 ? 90 : HISTORICAL[road].length > 3 ? 75 : HISTORICAL[road].length > 0 ? 60 : 50;
  const ratio = vcRatio(current.volume, current.capacity);
  const peak = isPeak(hour);
  const factors = [
    { label: 'Historical base', value: average(road) * 0.5, detail: `${average(road).toFixed(2)} avg × 0.5` },
    { label: 'Time of day', value: timeEffect(hour), detail: `${String(hour).padStart(2, '0')}:00` },
    { label: 'Volume / capacity', value: vehicleEffect(current.volume, current.capacity), detail: `${ratio.toFixed(0)}% V/C` },
    { label: 'Weather', value: weatherEffect(current.weather), detail: current.weather },
    { label: 'Special event', value: current.specialEvent ? 12 : 0 },
    { label: 'Accident', value: current.accident ? 20 : 0 },
    { label: 'Construction', value: current.construction ? 15 : 0 },
    { label: 'Day type', value: dayType === 'Weekend' ? -5 : 0, detail: dayType },
  ];
  const analysis = useMemo(
    () => ROADS.map((name) => ({ road: name, avg: average(name), samples: HISTORICAL[name].length })).sort((a, b) => b.avg - a.avg),
    [],
  );

  return (
    <main className="tg-grid min-h-[100dvh] bg-[#f2efe7] text-[#203238]">
      <div className="pointer-events-none fixed -left-24 -top-32 size-[440px] rounded-full bg-[#d4ede5]/65 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-44 -right-20 size-[500px] rounded-full bg-[#f6dfbd]/55 blur-3xl" />

      <div className="relative mx-auto max-w-[1420px] px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#173e42] text-[#f4b44a] shadow-[0_8px_20px_hsl(182_45%_18%/.16)]">
              <Route size={23} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="tg-display text-[21px] font-bold tracking-[-.04em] text-[#173e42]">TrafficGuard AI</h1>
                <span className="rounded-full bg-[#d8ede5] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[.13em] text-[#16806d]">Bengaluru</span>
              </div>
              <p className="mt-0.5 text-xs text-[#748084]">A clearer call before the road gets busy.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#cfc9bb] bg-[#faf9f4]/80 px-3 py-2 text-[11px] font-semibold text-[#667477] sm:flex">
              <span className="relative flex size-2"><span className="tg-breathe absolute inset-0 rounded-full bg-[#16806d]" /><span className="relative size-2 rounded-full bg-[#16806d]" /></span>
              Deterministic model · v2.4
            </div>
            <button
              type="button"
              onClick={resetAll}
              data-testid="button-reset-all-header"
              aria-label="Reset all roads"
              className="grid size-10 place-items-center rounded-xl border border-[#cfc9bb] bg-[#faf9f4]/80 text-[#637174] transition hover:border-[#16806d]/45 hover:text-[#16806d]"
            >
              <RefreshCcw size={16} />
            </button>
          </div>
        </header>

        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#16806d]"><MapPin size={13} /> Command center</p>
            <h2 className="tg-display text-3xl font-bold tracking-[-.055em] text-[#203238] sm:text-4xl">Know the road<br className="sm:hidden" /> before you take it.</h2>
          </div>
          <div className="hidden max-w-[270px] text-right text-xs leading-relaxed text-[#7b8584] md:block">
            Shape the conditions, then read the decision. Every value updates locally and predictably.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(330px,390px)_minmax(0,1fr)]">
          <section className="tg-card rounded-[26px] border border-[#ddd8cc] p-5 sm:p-6" data-testid="panel-prediction-inputs">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#16806d]">Scenario builder</p>
                <h3 className="tg-display mt-1 text-xl font-bold tracking-[-.04em]">Prediction inputs</h3>
              </div>
              <button type="button" onClick={resetRoad} data-testid="button-reset-road" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#758183] transition hover:bg-[#e6f2ed] hover:text-[#16806d]">
                <RefreshCcw size={13} /> Reset road
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="road-select" detail={<span className="font-normal normal-case tracking-normal text-[#9aa19e]">historical baseline</span>}>Road segment</FieldLabel>
                <div className="relative">
                  <select id="road-select" value={road} onChange={(event) => setRoad(event.target.value as Road)} data-testid="select-road" className="w-full appearance-none rounded-xl border border-[#cfc9bb] bg-[#faf9f4] px-3.5 py-3 text-sm font-bold text-[#304248] outline-none transition focus:border-[#16806d] focus:ring-2 focus:ring-[#16806d]/15">
                    {ROADS.map((item, i) => <option key={item} value={item}>{i + 1}. {item} · avg {average(item).toFixed(2)}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-[#788482]" size={16} />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="hour-range" detail={<span className="tg-number text-sm font-bold normal-case tracking-normal text-[#16806d]">{String(hour).padStart(2, '0')}:00 {peak && <span className="text-[#b54037]">· peak</span>}</span>}>Future hour</FieldLabel>
                <input id="hour-range" type="range" min="0" max="23" value={hour} onChange={(event) => setHour(Number(event.target.value))} data-testid="input-future-hour" className="tg-range h-1.5 w-full cursor-pointer" />
                <div className="mt-2 flex justify-between text-[10px] font-semibold text-[#929996]"><span>00</span><span>07–10 peak</span><span>17–20 peak</span><span>23</span></div>
              </div>

              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.13em] text-[#677579]">Day type</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['Weekday', 'Weekend'] as DayType[]).map((day) => (
                    <button key={day} type="button" onClick={() => setDayType(day)} aria-pressed={dayType === day} data-testid={`button-day-${day.toLowerCase()}`} className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${dayType === day ? 'border-[#16806d]/50 bg-[#dff0e9] text-[#146d5e]' : 'border-[#d3cec3] bg-[#faf9f4] text-[#788482] hover:border-[#a8b1ad]'}`}>
                      {day}{day === 'Weekend' && <span className="ml-1 font-normal text-[#929996]">−5</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.13em] text-[#677579]">Weather</span>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { name: 'Clear' as Weather, icon: <Sun size={15} /> },
                    { name: 'Cloudy' as Weather, icon: <Cloud size={15} /> },
                    { name: 'Rain' as Weather, icon: <CloudRain size={15} /> },
                  ]).map((item) => (
                    <button key={item.name} type="button" onClick={() => update({ weather: item.name })} aria-pressed={current.weather === item.name} data-testid={`button-weather-${item.name.toLowerCase()}`} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-bold transition ${current.weather === item.name ? 'border-[#16806d]/50 bg-[#dff0e9] text-[#146d5e]' : 'border-[#d3cec3] bg-[#faf9f4] text-[#788482] hover:border-[#a8b1ad]'}`}>
                      {item.icon}{item.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="volume-input">Vehicle volume</FieldLabel>
                  <div className="relative"><input id="volume-input" type="number" min="0" value={current.volume} onChange={(event) => update({ volume: Math.max(0, Number(event.target.value))})} data-testid="input-vehicle-volume" className="tg-number w-full rounded-xl border border-[#cfc9bb] bg-[#faf9f4] px-3.5 py-3 text-sm font-medium outline-none transition focus:border-[#16806d] focus:ring-2 focus:ring-[#16806d]/15" /><span className="pointer-events-none absolute right-3 top-3.5 text-[10px] font-bold text-[#9aa19e]">veh/h</span></div>
                </div>
                <div>
                  <FieldLabel htmlFor="capacity-input">Road capacity</FieldLabel>
                  <div className="relative"><input id="capacity-input" type="number" min="0" value={current.capacity} onChange={(event) => update({ capacity: Math.max(0, Number(event.target.value))})} data-testid="input-road-capacity" className="tg-number w-full rounded-xl border border-[#cfc9bb] bg-[#faf9f4] px-3.5 py-3 text-sm font-medium outline-none transition focus:border-[#16806d] focus:ring-2 focus:ring-[#16806d]/15" /><span className="pointer-events-none absolute right-3 top-3.5 text-[10px] font-bold text-[#9aa19e]">veh/h</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-[#ddd8cc] bg-[#f1eee6] p-3.5" data-testid="metric-vc-ratio">
                <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#707c7d]">Volume / capacity ratio</span><span className="tg-number text-sm font-bold text-[#304248]">{ratio.toFixed(1)}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-[#d9d4c9]"><div className={`h-full rounded-full transition-all duration-500 ${ratio >= 80 ? 'bg-[#b54037]' : ratio >= 60 ? 'bg-[#d58a10]' : 'bg-[#16806d]'}`} style={{ width: `${Math.min(100, ratio)}%` }} /></div>
                <div className="mt-1.5 flex justify-between text-[9px] font-semibold text-[#9aa19e]"><span>comfortable</span><span>strained at 80%</span></div>
              </div>

              <div className="space-y-2">
                <Toggle label="Special event nearby" icon={<Zap size={15} />} value={current.specialEvent} onChange={(value) => update({ specialEvent: value })} testId="toggle-special-event" />
                <Toggle label="Accident reported nearby" icon={<TriangleAlert size={15} />} value={current.accident} onChange={(value) => update({ accident: value })} testId="toggle-accident" />
                <Toggle label="Road construction / closure" icon={<Construction size={15} />} value={current.construction} onChange={(value) => update({ construction: value })} testId="toggle-construction" />
              </div>
            </div>
          </section>

          <section className="tg-card rounded-[26px] border border-[#ddd8cc] p-5 sm:p-6" data-testid="panel-traffic-prediction">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#16806d]">Decision readout</p>
                <h3 className="tg-display mt-1 text-xl font-bold tracking-[-.04em]">Traffic prediction</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold tracking-[.1em] ${style.bg} ${style.text}`} data-testid="status-traffic-level"><span className={`size-1.5 rounded-full ${style.marker}`} />{level}</span>
                <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold tracking-[.08em] ${peak ? 'border-[#b54037]/25 bg-[#b54037]/10 text-[#b54037]' : 'border-[#d3cec3] bg-[#f5f2eb] text-[#89918f]'}`} data-testid="status-peak-alert"><Timer size={12} /> Peak time alert: {peak ? 'Yes' : 'No'}</span>
              </div>
            </div>

            <div className="tg-rise">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <Gauge index={index} level={level} />
                <div className="grid w-full flex-1 grid-cols-2 gap-3 sm:grid-cols-1">
                  <div className="rounded-xl border border-[#ddd8cc] bg-[#f6f3ec] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#89918f]">Congestion level</p>
                    <p className={`tg-display mt-1 text-2xl font-bold tracking-[-.04em] ${style.text}`} data-testid="text-congestion-level">{level}</p>
                  </div>
                  <div className="rounded-xl border border-[#ddd8cc] bg-[#f6f3ec] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#89918f]">Prediction confidence</p>
                    <p className="tg-display mt-1 text-2xl font-bold tracking-[-.04em] text-[#304248]" data-testid="text-prediction-confidence">{confidence.toFixed(1)}%</p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-[#ddd8cc] bg-[#f6f3ec] p-3.5 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#89918f]">{road} · {String(hour).padStart(2, '0')}:00 · {dayType}</p>
                    <p className="tg-number mt-2 text-xs font-medium text-[#526466]" data-testid="text-traffic-bar">[{'#'.repeat(Math.round(index / 5))}{'.'.repeat(20 - Math.round(index / 5))}] {index.toFixed(1)} / 100</p>
                  </div>
                </div>
              </div>

              <div className="mt-7" data-testid="metric-traffic-scale">
                <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-[.12em] text-[#89918f]"><span>Free flow</span><span>Gridlock</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-[#dedbd2]"><div className="tg-fill h-full rounded-full bg-gradient-to-r from-[#16806d] via-[#d58a10] to-[#b54037]" style={{ width: `${index}%` }} /></div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as Level[]).map((item) => <div key={item} className={`rounded-xl border py-2 text-center text-[10px] font-extrabold uppercase tracking-[.1em] ${level === item ? `${levelStyle[item].bg} ${levelStyle[item].text}` : 'border-[#e0dbd1] bg-[#f7f4ed] text-[#9aa19e]'}`}><span className={`mx-auto mb-1 block size-1.5 rounded-full ${levelStyle[item].marker}`} />{item}</div>)}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#cce4db] bg-[#e8f4ef] p-4" data-testid="text-recommendation">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#16806d]"><Check size={13} /> Recommendation</p>
                <p className="text-sm font-semibold leading-relaxed text-[#294a48]">{recommendation(level)}</p>
              </div>

              <div className="mt-4 rounded-xl border border-[#ddd8cc] bg-[#f8f6f0] p-4" data-testid="panel-factor-breakdown">
                <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#707c7d]">Factor breakdown</p><Info size={14} className="text-[#9aa19e]" /></div>
                <ul className="space-y-2">
                  {factors.map((factor) => <li key={factor.label} className="flex items-center justify-between gap-3 text-xs"><span className="text-[#687779]">{factor.label}{factor.detail && <span className="ml-1 text-[10px] text-[#9aa19e]">({factor.detail})</span>}</span><span className={`tg-number font-medium ${factor.value > 0 ? 'text-[#b54037]' : factor.value < 0 ? 'text-[#16806d]' : 'text-[#89918f]'}`}>{factor.value > 0 ? '+' : ''}{factor.value.toFixed(2)}</span></li>)}
                  <li className="mt-3 flex items-center justify-between border-t border-[#e0dbd1] pt-3 text-xs font-extrabold text-[#304248]"><span>Traffic index · clamped 0–100</span><span className={`tg-number ${style.text}`}>{index.toFixed(2)}</span></li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <TrafficPulseChart road={road} hour={hour} dayType={dayType} conditions={current} onHourChange={setHour} />

        <section className="tg-card mt-5 rounded-[26px] border border-[#ddd8cc] p-5 sm:p-6" data-testid="panel-road-network">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#16806d]">Live scenario comparison</p><h3 className="tg-display mt-1 text-xl font-bold tracking-[-.04em]">Road network</h3></div>
            <button type="button" onClick={resetAll} data-testid="button-reset-all-roads" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#758183] transition hover:bg-[#e6f2ed] hover:text-[#16806d]"><RefreshCcw size={13} /> Reset all roads</button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ROADS.map((item) => {
              const itemConditions = conditions[item];
              const itemIndex = predict(item, hour, dayType, itemConditions);
              const itemLevel = classify(itemIndex);
              const itemStyle = levelStyle[itemLevel];
              const selected = item === road;
              return <button key={item} type="button" onClick={() => setRoad(item)} aria-pressed={selected} data-testid={`card-road-${item.toLowerCase().replaceAll(' ', '-')}`} className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${selected ? 'border-[#16806d]/55 bg-[#e8f4ef] shadow-[0_8px_20px_hsl(166_73%_32%/.08)]' : 'border-[#ddd8cc] bg-[#faf9f4] hover:border-[#aab9b1]'}`}>
                <div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold text-[#304248]">{item}</span><span className={`size-2 rounded-full ${itemStyle.marker}`} /></div>
                <div className="h-2 overflow-hidden rounded-full bg-[#dfdcd3]"><div className={`h-full rounded-full transition-all duration-500 ${itemStyle.bar}`} style={{ width: `${itemIndex}%` }} /></div>
                <div className="mt-2 flex items-end justify-between"><span className={`tg-number text-xl font-bold ${itemStyle.text}`} data-testid={`text-road-index-${item.toLowerCase().replaceAll(' ', '-')}`}>{itemIndex.toFixed(1)}</span><span className="tg-number text-[10px] font-semibold text-[#89918f]">V/C {vcRatio(itemConditions.volume, itemConditions.capacity).toFixed(0)}%</span></div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {itemConditions.weather === 'Clear' && <span className="inline-flex items-center gap-1 rounded-full border border-[#cce4db] bg-[#eef7f1] px-2 py-0.5 text-[9px] font-bold text-[#16806d]"><Sun size={10} /> Normal</span>}
                  {itemConditions.weather === 'Cloudy' && <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d5cb] bg-[#f0eee8] px-2 py-0.5 text-[9px] font-bold text-[#748084]"><Cloud size={10} /> Cloudy</span>}
                  {itemConditions.weather === 'Rain' && <span className="inline-flex items-center gap-1 rounded-full border border-[#badbd8] bg-[#e3f2f0] px-2 py-0.5 text-[9px] font-bold text-[#16726b]"><CloudRain size={10} /> Rain</span>}
                  {itemConditions.specialEvent && <span className="inline-flex items-center gap-1 rounded-full border border-[#ecd4ad] bg-[#fff3de] px-2 py-0.5 text-[9px] font-bold text-[#a86a09]"><Zap size={10} /> Event</span>}
                  {itemConditions.accident && <span className="inline-flex items-center gap-1 rounded-full border border-[#eccac6] bg-[#fff0ee] px-2 py-0.5 text-[9px] font-bold text-[#b54037]"><AlertTriangle size={10} /> Accident</span>}
                  {itemConditions.construction && <span className="inline-flex items-center gap-1 rounded-full border border-[#ecd4ad] bg-[#fff3de] px-2 py-0.5 text-[9px] font-bold text-[#a86a09]"><Construction size={10} /> Works</span>}
                </div>
              </button>;
            })}
          </div>
        </section>

        <section className="tg-card mt-5 rounded-[26px] border border-[#ddd8cc] p-5 sm:p-6" data-testid="panel-analysis">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#16806d]">Historical context</p><h3 className="tg-display mt-1 text-xl font-bold tracking-[-.04em]">Understand the pattern</h3></div>
            <div className="flex rounded-xl border border-[#d8d3c8] bg-[#f4f1e9] p-1">
              <button type="button" onClick={() => setTab('peak')} aria-pressed={tab === 'peak'} data-testid="button-tab-peak-hours" className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${tab === 'peak' ? 'bg-[#173e42] text-[#f7f4ed] shadow-sm' : 'text-[#7e8988] hover:text-[#304248]'}`}><Timer size={13} /> Peak hours</button>
              <button type="button" onClick={() => setTab('roads')} aria-pressed={tab === 'roads'} data-testid="button-tab-road-analysis" className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${tab === 'roads' ? 'bg-[#173e42] text-[#f7f4ed] shadow-sm' : 'text-[#7e8988] hover:text-[#304248]'}`}><BarChart3 size={13} /> Road analysis</button>
            </div>
          </div>
          {tab === 'peak' ? <div className="grid gap-3 sm:grid-cols-2" data-testid="view-peak-hours">
            {PEAK_HOURS.map((period) => {
              const active = hour >= period.from && hour <= period.to;
              return <div key={period.label} className={`rounded-2xl border p-5 transition ${active ? 'border-[#edc9a2] bg-[#fff4e5]' : 'border-[#ddd8cc] bg-[#faf9f4]'}`}>
                <div className="flex items-start justify-between"><div><p className="tg-display text-lg font-bold text-[#304248]">{period.label}</p><p className="mt-1 text-xs text-[#808b8b]">{period.window}</p></div><div className={`grid size-9 place-items-center rounded-xl ${active ? 'bg-[#f5d6aa] text-[#a86a09]' : 'bg-[#e9e5dc] text-[#89918f]'}`}><Timer size={16} /></div></div>
                <p className="mt-4 text-xs font-semibold text-[#657375]">Time effect <span className="tg-number ml-1 font-bold text-[#b54037]">+{period.effect.toFixed(2)}</span></p>
                {active && <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#f7dfbd] px-2.5 py-1 text-[10px] font-extrabold text-[#a86a09]"><span className="size-1.5 rounded-full bg-[#d58a10]" /> Selected hour is inside this window</span>}
              </div>;
            })}
          </div> : <div data-testid="view-road-analysis">
            <p className="mb-5 text-xs text-[#7f8988]">Average historical index per road segment. Higher values indicate more observed congestion.</p>
            <div className="space-y-4">
              {analysis.map((item, i) => {
                const itemLevel = classify(item.avg);
                return <div key={item.road}><div className="mb-1.5 flex items-center justify-between text-xs font-semibold"><span className="text-[#4f6265]">{i + 1}. {item.road} <span className="font-normal text-[#9aa19e]">({item.samples} samples)</span></span><span className={`tg-number font-bold ${levelStyle[itemLevel].text}`}>{item.avg.toFixed(2)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#dfdcd3]"><div className={`tg-fill h-full rounded-full ${levelStyle[itemLevel].bar}`} style={{ width: `${item.avg}%` }} /></div></div>;
              })}
            </div>
          </div>}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-1 py-7 text-[10px] font-semibold uppercase tracking-[.12em] text-[#8b9491]">
          <span className="flex items-center gap-1.5"><CarFront size={13} /> Built for the Bengaluru commute</span>
          <span className="flex items-center gap-1.5"><GaugeIcon size={13} /> Illustrative model · not live telemetry</span>
        </footer>
      </div>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <WouterRoute path="/" component={Home} />
        <WouterRoute component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;