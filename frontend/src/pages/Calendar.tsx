import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCalendar } from "@/lib/normalize";
import type { CalendarDay } from "@/lib/types";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthCell {
  number: number;
  date: string;
  data?: CalendarDay;
  future: boolean;
}

export default function Calendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [zoomedMonth, setZoomedMonth] = useState<number | null>(null);
  const navigate = useNavigate();
  const calendar = useQuery({ queryKey: ["calendar", year], queryFn: () => fetchCalendar(year) });
  const days = new Map((calendar.data?.days ?? []).map((day) => [day.date, day]));
  const todayIso = new Date().toISOString().slice(0, 10);
  const monthCells = monthNames.map((_, month) => Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => { const day = `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`; return { number: index + 1, date: day, data: days.get(day), future: day > todayIso }; }));

  const changeYear = (delta: number) => {
    setZoomedMonth(null);
    setYear((value) => value + delta);
  };

  const goDay = (cell: MonthCell) => {
    if (cell.data) navigate(`/app/entry/${cell.data.entry_id}`);
    else if (!cell.future) navigate(`/app/today?date=${cell.date}`);
  };

  const dayTitle = (cell: MonthCell) => cell.data
    ? `${cell.date}: ${cell.data.words} words`
    : cell.future ? `${cell.date}: not yet` : `${cell.date}: Write a backfill`;

  const dayLabel = (cell: MonthCell) => cell.data
    ? `Open entry for ${cell.date}`
    : cell.future ? `${cell.date} is in the future` : `Write a backfill for ${cell.date}`;

  const dayClass = (cell: MonthCell) => `heat-cell heat-${cell.data ? Math.min(4, Math.max(1, Math.ceil(cell.data.words / 80))) : 0} ${cell.future && !cell.data ? "opacity-40" : ""}`;

  const DayCell = ({ cell, showNumber, delay }: { cell: MonthCell; showNumber: boolean; delay: number }) => (
    <motion.button
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 420, damping: 26 }}
      disabled={cell.future && !cell.data}
      title={dayTitle(cell)}
      onClick={() => goDay(cell)}
      className={`${dayClass(cell)}${showNumber ? " heat-numbered" : ""}`}
      data-testid={`calendar-day-${cell.date}`}
      aria-label={dayLabel(cell)}>
      {showNumber && <span aria-hidden="true">{cell.number}</span>}
    </motion.button>
  );

  const zoomedCells = zoomedMonth === null ? [] : monthCells[zoomedMonth];
  const zoomLeadBlanks = zoomedMonth === null ? 0 : (new Date(year, zoomedMonth, 1).getDay() + 6) % 7;
  return <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12" data-testid="calendar-page"><header className="flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow eyebrow-rule" data-testid="calendar-eyebrow">The shape of a year</p><h1 className="display-heading mt-3 text-balance text-[32px] leading-[1.08] sm:text-5xl" data-testid="calendar-heading">Your writing year</h1><p className="mt-3 text-sm text-[var(--muted-ink)]" data-testid="calendar-description">Every filled square is a day you chose to pay attention.</p></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => changeYear(-1)} data-testid="calendar-previous-year-button" aria-label="Previous year"><ChevronLeft size={16} /></Button><span className="min-w-16 text-center font-serif text-xl tabular-nums" data-testid="calendar-year-label">{year}</span><Button variant="outline" size="icon" onClick={() => changeYear(1)} data-testid="calendar-next-year-button" aria-label="Next year"><ChevronRight size={16} /></Button></div></header><div className="mt-8 rounded-[28px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-md)] sm:p-8" data-testid="calendar-heatmap-card"><div className="mb-7 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs text-[var(--muted-ink)]" data-testid="calendar-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((value) => <span key={value} className={`heat-cell heat-${value}`} data-testid={`calendar-legend-cell-${value}`} />)}<span>More</span></div><span className="text-xs text-[var(--muted-ink)]" data-testid="calendar-written-count">{calendar.data?.days.length ?? 0} written days</span></div><p className="mt-3 text-xs text-[var(--muted-ink)]" data-testid="calendar-zoom-hint">Tip — choose a month to inspect its days up close.</p>{zoomedMonth === null ? <div key={year} className="grid grid-cols-2 gap-5 md:grid-cols-4 lg:grid-cols-6" data-testid="calendar-month-grid">{monthCells.map((cells, month) => <div key={month} data-testid={`calendar-month-${month + 1}`}><button onClick={() => setZoomedMonth(zoomedMonth === month ? null : month)} aria-expanded={zoomedMonth === month} aria-label={`Zoom into ${monthNames[month]} ${year}`} data-testid={`calendar-zoom-month-${month + 1}`} className="mb-3 cursor-pointer text-xs font-semibold text-[var(--muted-ink)] hover:text-[var(--terracotta)] hover:underline hover:underline-offset-4">{monthNames[month]}</button><div className="grid grid-cols-7 gap-1 sm:gap-1.5">{cells.map((cell, index) => <DayCell key={cell.date} cell={cell} showNumber={false} delay={Math.min(0.7, month * 0.04 + index * 0.007)} />)}</div></div>)}</div> : <div data-testid="calendar-month-zoom"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-serif text-xl" data-testid="calendar-zoom-heading">{monthNames[zoomedMonth]} {year}</h2><Button variant="outline" size="sm" onClick={() => setZoomedMonth(null)} data-testid="calendar-zoom-back">Back to year</Button></div><div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2" data-testid="calendar-zoom-weekdays" aria-hidden="true">{weekdayNames.map((day) => <span key={day} className="pb-1 text-center text-[11px] font-semibold text-[var(--muted-ink)]">{day}</span>)}</div><div className="grid grid-cols-7 gap-1.5 sm:gap-2" data-testid="calendar-zoom-grid">{Array.from({ length: zoomLeadBlanks }, (_, i) => <span key={`blank-${i}`} />)}{zoomedCells.map((cell, index) => <DayCell key={cell.date} cell={cell} showNumber delay={Math.min(0.4, index * 0.01)} />)}</div></div>}</div>{!calendar.isPending && (calendar.data?.days.length ?? 0) === 0 && <p className="mt-6 text-center text-sm leading-6 text-[var(--muted-ink)]" data-testid="calendar-empty-caption">Nothing here yet — every filled square will be a day you chose to pay attention. <Link to="/app" className="font-semibold text-[var(--terracotta)] underline underline-offset-4" data-testid="calendar-empty-action">Write today’s page →</Link></p>}<div className="mt-5 flex items-start gap-3 rounded-2xl bg-[var(--sand)] px-5 py-4 text-sm leading-6 text-[var(--muted-ink)]" data-testid="calendar-backfill-note"><Info size={17} className="mt-0.5 shrink-0 text-[var(--terracotta)]" /><p data-testid="calendar-backfill-copy"><strong className="text-[var(--ink-soft)]">Missed a day?</strong> Tap an empty square to add a backfilled memory. It will stay part of your story without changing your daily rhythm.</p></div></section>;
}
