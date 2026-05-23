"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type PlanType = "Recovery" | "Balanced" | "High Output";

type ScheduleCategory =
  | "Work"
  | "School"
  | "Friend Catchup"
  | "Family Plan"
  | "Personal"
  | "Admin";

type TrainingSport = "Run" | "Gym" | "Kayak";

type TrainingSession =
  | "Upper Body"
  | "Intervals"
  | "Tempo"
  | "Easy Run"
  | "Long Run"
  | "Technical"
  | "Lactate"
  | "Speed"
  | "Aerobic";

type TrainingIntensity = "Low" | "Medium" | "High";

type EventStatus = "Fixed" | "Flexible" | "Planned";

type RepeatOption = "None" | "Daily" | "Weekdays" | "Weekly";

type FocusTag =
  | "Essential"
  | "High Focus"
  | "Learning"
  | "Admin"
  | "Low Priority";

type EventItem = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  category: ScheduleCategory;
  status: EventStatus;
  repeat: RepeatOption;
};

type FocusTask = {
  id: number;
  title: string;
  tag: FocusTag;
  deadline: string;
  plannedDate: string;
  startTime: string;
  endTime: string;
};

type TrainingItem = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  sport: TrainingSport;
  session: TrainingSession;
  intensity: TrainingIntensity;
};

type TimelineItem = {
  id: number;
  source: "event" | "task" | "training";
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  status: string;
};

type UpcomingEvent = {
  eventId: number;
  occurrenceDate: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  repeat: RepeatOption;
};

type ReadinessState = {
  sleepHours: number;
  soreness: number;
  stress: number;
  fatigue: number;
};

const scheduleCategories: ScheduleCategory[] = [
  "Work",
  "School",
  "Friend Catchup",
  "Family Plan",
  "Personal",
  "Admin",
];

const eventStatuses: EventStatus[] = ["Fixed", "Flexible", "Planned"];

const repeatOptions: RepeatOption[] = ["None", "Daily", "Weekdays", "Weekly"];

const focusTags: FocusTag[] = [
  "Essential",
  "High Focus",
  "Learning",
  "Admin",
  "Low Priority",
];

const trainingSports: TrainingSport[] = ["Run", "Gym", "Kayak"];

const trainingSessionsBySport: Record<TrainingSport, TrainingSession[]> = {
  Run: ["Intervals", "Tempo", "Easy Run", "Long Run"],
  Gym: ["Upper Body"],
  Kayak: ["Technical", "Lactate", "Speed", "Aerobic"],
};

const STORAGE_KEYS = {
  events: "life-optimiser-events",
  focusTasks: "life-optimiser-focus-tasks",
  trainings: "life-optimiser-trainings",
  readiness: "life-optimiser-readiness",
};

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const savedValue = window.localStorage.getItem(key);
    if (!savedValue) return fallback;
    return JSON.parse(savedValue) as T;
  } catch {
    return fallback;
  }
}

function calculateReadinessScore({
  sleepHours,
  soreness,
  stress,
  fatigue,
}: {
  sleepHours: number;
  soreness: number;
  stress: number;
  fatigue: number;
}) {
  const sleepScore = Math.min(sleepHours / 8, 1) * 25;
  const sorenessScore = ((10 - soreness) / 9) * 25;
  const stressScore = ((10 - stress) / 9) * 25;
  const fatigueScore = ((10 - fatigue) / 9) * 25;

  return Math.round(sleepScore + sorenessScore + stressScore + fatigueScore);
}

function getPlanType(score: number): PlanType {
  if (score < 60) return "Recovery";
  if (score < 80) return "Balanced";
  return "High Output";
}

function getReadinessMessage({
  planType,
  readinessScore,
  sleepHours,
  soreness,
  stress,
  fatigue,
}: {
  planType: PlanType;
  readinessScore: number;
  sleepHours: number;
  soreness: number;
  stress: number;
  fatigue: number;
}) {
  if (planType === "Recovery") {
    return `Readiness is ${readinessScore}. Today is a recovery vibe. You had ${sleepHours}h sleep, soreness is ${soreness}/10, stress is ${stress}/10, and fatigue is ${fatigue}/10. Keep the day light, protect your energy, and only push what genuinely matters.`;
  }

  if (planType === "Balanced") {
    return `Readiness is ${readinessScore}. Today is a steady execution vibe. With ${sleepHours}h sleep, soreness ${soreness}/10, stress ${stress}/10, and fatigue ${fatigue}/10, you can train and work normally, but avoid stacking unnecessary extras.`;
  }

  return `Readiness is ${readinessScore}. Today is a high-output vibe. With ${sleepHours}h sleep, soreness ${soreness}/10, stress ${stress}/10, and fatigue ${fatigue}/10, you have room to push harder, train with intent, and attack your key tasks.`;
}

function getTrainingIntensity(
  sport: TrainingSport,
  session: TrainingSession
): TrainingIntensity {
  if (sport === "Run") {
    if (session === "Intervals" || session === "Tempo") return "High";
    if (session === "Long Run") return "Medium";
    return "Low";
  }

  if (sport === "Kayak") {
    if (session === "Speed" || session === "Lactate") return "High";
    if (session === "Aerobic") return "Medium";
    return "Low";
  }

  return "Medium";
}

function getRecommendation({
  planType,
  trainingCount,
  taskCount,
}: {
  planType: PlanType;
  trainingCount: number;
  taskCount: number;
}) {
  if (planType === "Recovery") {
    return "Today should be recovery focused. Keep only essential tasks, avoid unnecessary plans, and reduce training load if soreness or fatigue is high.";
  }

  if (planType === "Balanced") {
    return `Today is balanced. Complete your key tasks, manage your schedule realistically, and complete ${trainingCount} training session${
      trainingCount === 1 ? "" : "s"
    } without overloading yourself.`;
  }

  return `You have strong readiness today. Push your main work forward, complete your ${taskCount} task${
    taskCount === 1 ? "" : "s"
  }, and train with intent if your schedule allows.`;
}

function generateTimeOptions(startHour = 0, endHour = 23) {
  const options: string[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const formattedHour = String(hour).padStart(2, "0");
      const formattedMinute = String(minute).padStart(2, "0");
      options.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  return options;
}

function calculateDuration(startTime: string, endTime: string) {
  if (!startTime || !endTime) return 0;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  return Math.max(endTotal - startTotal, 0);
}

function getDayOfWeek(date: string) {
  return new Date(`${date}T00:00:00`).getDay();
}

function isWeekday(date: string) {
  const day = getDayOfWeek(date);
  return day >= 1 && day <= 5;
}

function eventOccursOnDate(event: EventItem, date: string) {
  if (event.repeat === "None") return event.date === date;
  if (event.repeat === "Daily") return date >= event.date;
  if (event.repeat === "Weekdays") return date >= event.date && isWeekday(date);
  if (event.repeat === "Weekly") {
    return (
      date >= event.date && getDayOfWeek(event.date) === getDayOfWeek(date)
    );
  }

  return false;
}

function isRoutineEvent(event: EventItem) {
  const title = event.title.toLowerCase();

  const isInternship =
    title.includes("internship") ||
    title.includes("intern") ||
    title.includes("work");

  const isRoutineRepeat =
    event.repeat === "Daily" || event.repeat === "Weekdays";

  return isInternship || isRoutineRepeat;
}

function getUpcomingEvents(events: EventItem[], startDate: string) {
  const upcoming: UpcomingEvent[] = [];

  const notableEvents = events.filter((event) => !isRoutineEvent(event));

  for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
    const occurrenceDate = addDays(startDate, dayIndex);

    notableEvents.forEach((event) => {
      if (eventOccursOnDate(event, occurrenceDate)) {
        upcoming.push({
          eventId: event.id,
          occurrenceDate,
          startTime: event.startTime,
          endTime: event.endTime,
          title: event.title,
          category: event.category,
          repeat: event.repeat,
        });
      }
    });
  }

  return upcoming
    .sort((a, b) => {
      if (a.occurrenceDate !== b.occurrenceDate) {
        return a.occurrenceDate.localeCompare(b.occurrenceDate);
      }

      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 6);
}

export default function Home() {
  const todayDate = getTodayDateString();

  const savedReadiness = loadFromStorage<ReadinessState>(STORAGE_KEYS.readiness, {
    sleepHours: 7,
    soreness: 4,
    stress: 5,
    fatigue: 4,
  });

  const [sleepHours, setSleepHours] = useState(savedReadiness.sleepHours);
  const [soreness, setSoreness] = useState(savedReadiness.soreness);
  const [stress, setStress] = useState(savedReadiness.stress);
  const [fatigue, setFatigue] = useState(savedReadiness.fatigue);
  const [confirmedMessage, setConfirmedMessage] = useState("");

  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const [events, setEvents] = useState<EventItem[]>(() =>
    loadFromStorage<EventItem[]>(STORAGE_KEYS.events, [
      {
        id: 1,
        date: todayDate,
        startTime: "09:00",
        endTime: "18:00",
        title: "Internship",
        category: "Work",
        status: "Fixed",
        repeat: "Weekdays",
      },
    ])
  );

  const [focusTasks, setFocusTasks] = useState<FocusTask[]>(() =>
    loadFromStorage<FocusTask[]>(STORAGE_KEYS.focusTasks, [
      {
        id: 1,
        title: "Finish frontend task",
        tag: "High Focus",
        deadline: "",
        plannedDate: todayDate,
        startTime: "",
        endTime: "",
      },
    ])
  );

  const [trainings, setTrainings] = useState<TrainingItem[]>(() =>
    loadFromStorage<TrainingItem[]>(STORAGE_KEYS.trainings, [
      {
        id: 1,
        date: todayDate,
        startTime: "19:30",
        endTime: "20:30",
        sport: "Gym",
        session: "Upper Body",
        intensity: "Medium",
      },
    ])
  );

  const [newEvent, setNewEvent] = useState({
    date: todayDate,
    startTime: "",
    endTime: "",
    title: "",
    category: "Work" as ScheduleCategory,
    status: "Planned" as EventStatus,
    repeat: "None" as RepeatOption,
  });

  const [newFocusTask, setNewFocusTask] = useState({
    title: "",
    tag: "High Focus" as FocusTag,
    deadline: "",
    plannedDate: todayDate,
    startTime: "",
    endTime: "",
  });

  const [newTraining, setNewTraining] = useState({
    date: todayDate,
    startTime: "",
    endTime: "",
    sport: "Run" as TrainingSport,
    session: "Easy Run" as TrainingSession,
    intensity: "Low" as TrainingIntensity,
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.focusTasks,
      JSON.stringify(focusTasks)
    );
  }, [focusTasks]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.trainings, JSON.stringify(trainings));
  }, [trainings]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.readiness,
      JSON.stringify({
        sleepHours,
        soreness,
        stress,
        fatigue,
      })
    );
  }, [sleepHours, soreness, stress, fatigue]);

  const readinessScore = useMemo(() => {
    return calculateReadinessScore({
      sleepHours,
      soreness,
      stress,
      fatigue,
    });
  }, [sleepHours, soreness, stress, fatigue]);

  const planType = getPlanType(readinessScore);

  const readinessMessage = getReadinessMessage({
    planType,
    readinessScore,
    sleepHours,
    soreness,
    stress,
    fatigue,
  });

  const visibleEvents = events.filter((event) =>
    eventOccursOnDate(event, todayDate)
  );

  const visibleTasks = focusTasks.filter((task) => {
    return task.plannedDate === todayDate && task.startTime && task.endTime;
  });

  const visibleTrainings = trainings.filter(
    (training) => training.date === todayDate
  );

  const taskTimelineItems: TimelineItem[] = visibleTasks.map((task) => ({
    id: task.id,
    source: "task",
    startTime: task.startTime,
    endTime: task.endTime,
    title: task.title,
    category: "Task",
    status: task.tag,
  }));

  const trainingTimelineItems: TimelineItem[] = visibleTrainings.map(
    (training) => ({
      id: training.id,
      source: "training",
      startTime: training.startTime,
      endTime: training.endTime,
      title: `${training.sport}: ${training.session}`,
      category: "Training",
      status: training.intensity,
    })
  );

  const eventTimelineItems: TimelineItem[] = visibleEvents.map((event) => ({
    id: event.id,
    source: "event",
    startTime: event.startTime,
    endTime: event.endTime,
    title: event.title,
    category: event.category,
    status:
      event.repeat === "None"
        ? event.status
        : `${event.status} · ${event.repeat}`,
  }));

  const todaySchedule = [
    ...eventTimelineItems,
    ...taskTimelineItems,
    ...trainingTimelineItems,
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const sortedFocusTasks = [...focusTasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  const sortedTrainings = [...visibleTrainings].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const upcomingEvents = getUpcomingEvents(events, todayDate);

  const recommendation = getRecommendation({
    planType,
    trainingCount: visibleTrainings.length,
    taskCount: focusTasks.length,
  });

  function resetEventForm() {
    setNewEvent({
      date: todayDate,
      startTime: "",
      endTime: "",
      title: "",
      category: "Work",
      status: "Planned",
      repeat: "None",
    });
    setEditingEventId(null);
  }

  function addOrUpdateEvent() {
    if (
      !newEvent.date ||
      !newEvent.startTime ||
      !newEvent.endTime ||
      !newEvent.title
    ) {
      return;
    }

    if (editingEventId) {
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === editingEventId
            ? {
                ...event,
                date: newEvent.date,
                startTime: newEvent.startTime,
                endTime: newEvent.endTime,
                title: newEvent.title,
                category: newEvent.category,
                status: newEvent.status,
                repeat: newEvent.repeat,
              }
            : event
        )
      );
    } else {
      setEvents((currentEvents) => [
        ...currentEvents,
        {
          id: Date.now(),
          date: newEvent.date,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          title: newEvent.title,
          category: newEvent.category,
          status: newEvent.status,
          repeat: newEvent.repeat,
        },
      ]);
    }

    resetEventForm();
    setConfirmedMessage("");
  }

  function startEditingEvent(id: number) {
    const eventToEdit = events.find((event) => event.id === id);

    if (!eventToEdit) return;

    setEditingEventId(id);
    setNewEvent({
      date: eventToEdit.date,
      startTime: eventToEdit.startTime,
      endTime: eventToEdit.endTime,
      title: eventToEdit.title,
      category: eventToEdit.category,
      status: eventToEdit.status,
      repeat: eventToEdit.repeat,
    });
    setConfirmedMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function addFocusTask() {
    if (!newFocusTask.title) return;

    setFocusTasks((currentTasks) => [
      ...currentTasks,
      {
        id: Date.now(),
        title: newFocusTask.title,
        tag: newFocusTask.tag,
        deadline: newFocusTask.deadline,
        plannedDate: newFocusTask.plannedDate,
        startTime: newFocusTask.startTime,
        endTime: newFocusTask.endTime,
      },
    ]);

    setNewFocusTask({
      title: "",
      tag: "High Focus",
      deadline: "",
      plannedDate: todayDate,
      startTime: "",
      endTime: "",
    });

    setConfirmedMessage("");
  }

  function addTraining() {
    if (!newTraining.date || !newTraining.startTime || !newTraining.endTime) {
      return;
    }

    setTrainings((currentTrainings) => [
      ...currentTrainings,
      {
        id: Date.now(),
        date: newTraining.date,
        startTime: newTraining.startTime,
        endTime: newTraining.endTime,
        sport: newTraining.sport,
        session: newTraining.session,
        intensity: newTraining.intensity,
      },
    ]);

    setNewTraining({
      date: todayDate,
      startTime: "",
      endTime: "",
      sport: "Run",
      session: "Easy Run",
      intensity: "Low",
    });

    setConfirmedMessage("");
  }

  function removeTimelineItem(item: TimelineItem) {
    if (item.source === "event") {
      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== item.id)
      );
    }

    if (item.source === "task") {
      setFocusTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== item.id)
      );
    }

    if (item.source === "training") {
      setTrainings((currentTrainings) =>
        currentTrainings.filter((training) => training.id !== item.id)
      );
    }

    setConfirmedMessage("");
  }

  function removeFocusTask(id: number) {
    setFocusTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id)
    );

    setConfirmedMessage("");
  }

  function removeTraining(id: number) {
    setTrainings((currentTrainings) =>
      currentTrainings.filter((training) => training.id !== id)
    );

    setConfirmedMessage("");
  }

  function removeEvent(id: number) {
    setEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== id)
    );

    setConfirmedMessage("");
  }

  function updateTrainingSport(sport: TrainingSport) {
    const firstSession = trainingSessionsBySport[sport][0];

    setNewTraining({
      ...newTraining,
      sport,
      session: firstSession,
      intensity: getTrainingIntensity(sport, firstSession),
    });
  }

  function updateTrainingSession(session: TrainingSession) {
    setNewTraining({
      ...newTraining,
      session,
      intensity: getTrainingIntensity(newTraining.sport, session),
    });
  }

  function clearSavedData() {
    window.localStorage.removeItem(STORAGE_KEYS.events);
    window.localStorage.removeItem(STORAGE_KEYS.focusTasks);
    window.localStorage.removeItem(STORAGE_KEYS.trainings);
    window.localStorage.removeItem(STORAGE_KEYS.readiness);
    window.location.reload();
  }

  function confirmPlan() {
    setConfirmedMessage(
      "Today’s plan is confirmed. Data is saved on this device. Use Supabase later when you want laptop and phone to share the same account data."
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#030712] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[30%] h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <nav className="mb-8 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl sm:mb-10 sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:py-3">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
            Life Optimiser
          </p>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
              Personal Mode
            </span>
            <span>Saved on Device</span>
          </div>
        </nav>

        <header className="mb-8 grid gap-6 lg:mb-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <p className="mb-3 text-sm text-slate-400">Command Centre</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Good morning, {" "}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                Slayer.
              </span>
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
              {readinessMessage}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Readiness Score</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-5xl font-semibold">{readinessScore}</span>
              <span className="mb-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
                {planType}
              </span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all duration-500"
                style={{ width: `${readinessScore}%` }}
              />
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-5 rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          <InputSlider
            label="Sleep"
            value={sleepHours}
            min={0}
            max={10}
            step={0.5}
            suffix="h"
            onChange={setSleepHours}
          />
          <InputSlider
            label="Soreness"
            value={soreness}
            min={1}
            max={10}
            step={1}
            suffix="/10"
            onChange={setSoreness}
          />
          <InputSlider
            label="Stress"
            value={stress}
            min={1}
            max={10}
            step={1}
            suffix="/10"
            onChange={setStress}
          />
          <InputSlider
            label="Fatigue"
            value={fatigue}
            min={1}
            max={10}
            step={1}
            suffix="/10"
            onChange={setFatigue}
          />
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-3">
          <Panel
            title={editingEventId ? "Edit Schedule Event" : "Add Schedule Event"}
            label="Schedule Input"
          >
            <div className="space-y-3">
              <DateInput
                label="Event Date"
                value={newEvent.date}
                onChange={(value) =>
                  setNewEvent({ ...newEvent, date: value })
                }
                optional={false}
              />

              <div className="grid grid-cols-2 gap-3">
                <TimeInput
                  label="Start"
                  value={newEvent.startTime}
                  onChange={(value) =>
                    setNewEvent({ ...newEvent, startTime: value })
                  }
                />
                <TimeInput
                  label="End"
                  value={newEvent.endTime}
                  onChange={(value) =>
                    setNewEvent({ ...newEvent, endTime: value })
                  }
                />
              </div>

              <Input
                placeholder="Event title, e.g. Internship"
                value={newEvent.title}
                onChange={(value) =>
                  setNewEvent({ ...newEvent, title: value })
                }
              />

              <SelectInput
                value={newEvent.category}
                options={scheduleCategories}
                onChange={(value) =>
                  setNewEvent({
                    ...newEvent,
                    category: value as ScheduleCategory,
                  })
                }
              />

              <SelectInput
                value={newEvent.status}
                options={eventStatuses}
                onChange={(value) =>
                  setNewEvent({
                    ...newEvent,
                    status: value as EventStatus,
                  })
                }
              />

              <SelectInput
                value={newEvent.repeat}
                options={repeatOptions}
                onChange={(value) =>
                  setNewEvent({
                    ...newEvent,
                    repeat: value as RepeatOption,
                  })
                }
              />

              <button
                onClick={addOrUpdateEvent}
                className="w-full rounded-2xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                {editingEventId ? "Update Event" : "Add Event"}
              </button>

              {editingEventId && (
                <button
                  onClick={resetEventForm}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-slate-300 transition hover:border-red-300/40 hover:text-red-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </Panel>

          <Panel title="Add Task" label="Task Input">
            <div className="space-y-3">
              <Input
                placeholder="Task, e.g. Finish work ticket"
                value={newFocusTask.title}
                onChange={(value) =>
                  setNewFocusTask({ ...newFocusTask, title: value })
                }
              />

              <SelectInput
                value={newFocusTask.tag}
                options={focusTags}
                onChange={(value) =>
                  setNewFocusTask({
                    ...newFocusTask,
                    tag: value as FocusTag,
                  })
                }
              />

              <DateInput
                label="Deadline"
                value={newFocusTask.deadline}
                onChange={(value) =>
                  setNewFocusTask({ ...newFocusTask, deadline: value })
                }
              />

              <DateInput
                label="Planned Date"
                value={newFocusTask.plannedDate}
                onChange={(value) =>
                  setNewFocusTask({ ...newFocusTask, plannedDate: value })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <TimeInput
                  label="Planned Start"
                  value={newFocusTask.startTime}
                  onChange={(value) =>
                    setNewFocusTask({ ...newFocusTask, startTime: value })
                  }
                />
                <TimeInput
                  label="Planned End"
                  value={newFocusTask.endTime}
                  onChange={(value) =>
                    setNewFocusTask({ ...newFocusTask, endTime: value })
                  }
                />
              </div>

              <button
                onClick={addFocusTask}
                className="w-full rounded-2xl bg-violet-300 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-violet-200"
              >
                Add Task
              </button>
            </div>
          </Panel>

          <Panel title="Add Training Session" label="Training Input">
            <div className="space-y-3">
              <DateInput
                label="Training Date"
                value={newTraining.date}
                onChange={(value) =>
                  setNewTraining({ ...newTraining, date: value })
                }
                optional={false}
              />

              <div className="grid grid-cols-2 gap-3">
                <TrainingTimeInput
                  label="Start"
                  value={newTraining.startTime}
                  onChange={(value) =>
                    setNewTraining({ ...newTraining, startTime: value })
                  }
                />
                <TrainingTimeInput
                  label="End"
                  value={newTraining.endTime}
                  onChange={(value) =>
                    setNewTraining({ ...newTraining, endTime: value })
                  }
                />
              </div>

              <SelectInput
                value={newTraining.sport}
                options={trainingSports}
                onChange={(value) =>
                  updateTrainingSport(value as TrainingSport)
                }
              />

              <SelectInput
                value={newTraining.session}
                options={trainingSessionsBySport[newTraining.sport]}
                onChange={(value) =>
                  updateTrainingSession(value as TrainingSession)
                }
              />

              <div className="rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm">
                <p className="text-slate-500">Calculated intensity</p>
                <p className="mt-1 font-semibold text-emerald-300">
                  {newTraining.intensity}
                </p>
              </div>

              <button
                onClick={addTraining}
                className="w-full rounded-2xl bg-emerald-300 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Add Training
              </button>
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl lg:col-span-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                  Schedule
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Today’s Plan</h2>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                {todaySchedule.length} items
              </span>
            </div>

            <div className="space-y-4">
              {todaySchedule.map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#020617]/70 p-5"
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-300 to-violet-400" />
                  <div className="flex flex-col gap-4 pl-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-cyan-200">
                        {item.startTime} - {item.endTime}
                      </p>
                      <h3 className="mt-2 text-lg font-medium">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {item.status}
                      </span>

                      {item.source === "event" && (
                        <button
                          onClick={() => startEditingEvent(item.id)}
                          className="text-xs text-slate-500 transition hover:text-cyan-300"
                        >
                          Edit
                        </button>
                      )}

                      <button
                        onClick={() => removeTimelineItem(item)}
                        className="text-xs text-slate-500 transition hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {todaySchedule.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-[#020617]/70 p-4 text-sm text-slate-500">
                  No schedule items for today.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-300">
              Calendar
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Upcoming Events</h2>

            <div className="mt-6 space-y-4">
              {upcomingEvents.map((event) => (
                <div
                  key={`${event.eventId}-${event.occurrenceDate}`}
                  className="rounded-2xl border border-white/10 bg-[#020617]/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-blue-300">
                        {event.occurrenceDate} · {event.startTime} - {" "}
                        {event.endTime}
                      </p>
                      <h3 className="mt-2 font-medium">{event.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {event.category} · {event.repeat}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => startEditingEvent(event.eventId)}
                        className="text-xs text-slate-500 transition hover:text-cyan-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeEvent(event.eventId)}
                        className="text-xs text-slate-500 transition hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {upcomingEvents.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-[#020617]/70 p-4 text-sm text-slate-500">
                  No notable upcoming events.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">
              Focus
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Top Tasks</h2>

            <ol className="mt-6 space-y-4">
              {sortedFocusTasks.map((task, index) => (
                <li
                  key={task.id}
                  className="rounded-2xl border border-white/10 bg-[#020617]/70 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-950">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {task.tag} · {" "}
                          {task.deadline
                            ? `Due ${task.deadline}`
                            : "No deadline"}
                          {task.startTime && task.endTime
                            ? ` · ${task.plannedDate} · ${task.startTime} - ${task.endTime}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFocusTask(task.id)}
                      className="text-xs text-slate-500 transition hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl lg:col-span-7">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              Training
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Performance Plan</h2>

            <div className="mt-6 space-y-4">
              {sortedTrainings.map((training) => (
                <div
                  key={training.id}
                  className="rounded-2xl border border-white/10 bg-[#020617]/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-emerald-300">
                        {training.startTime} - {training.endTime}
                      </p>
                      <h3 className="mt-2 font-medium">
                        {training.sport}: {training.session}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {calculateDuration(
                          training.startTime,
                          training.endTime
                        )}{" "}
                        min · {training.intensity} intensity
                      </p>
                    </div>

                    <button
                      onClick={() => removeTraining(training.id)}
                      className="text-xs text-slate-500 transition hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {sortedTrainings.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-[#020617]/70 p-4 text-sm text-slate-500">
                  No training added for today.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/10 via-white/[0.06] to-violet-400/10 p-6 shadow-2xl backdrop-blur-xl lg:col-span-12">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
              Assistant
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Recommendation</h2>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#020617]/70 p-5">
              <p className="leading-7 text-slate-300">{recommendation}</p>
            </div>

            <button
              onClick={confirmPlan}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-violet-400 px-5 py-4 font-semibold text-slate-950 transition hover:scale-[1.01]"
            >
              Confirm Today’s Plan
            </button>

            <button
              onClick={clearSavedData}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-semibold text-slate-300 transition hover:border-red-300/40 hover:text-red-300"
            >
              Reset Saved Data
            </button>

            {confirmedMessage && (
              <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300">
                {confirmedMessage}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
        {label}
      </p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50"
    />
  );
}

function DateInput({
  label,
  value,
  onChange,
  optional = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-slate-500">
        {label} {optional && <span className="text-slate-600">(optional)</span>}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50"
      />
    </label>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const timeOptions = generateTimeOptions();

  return (
    <label className="block">
      <span className="mb-2 block text-xs text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50"
      >
        <option value="">Select time</option>
        {timeOptions.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </label>
  );
}

function TrainingTimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const trainingTimeOptions = generateTimeOptions(5, 23);

  return (
    <label className="block">
      <span className="mb-2 block text-xs text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50"
      >
        <option value="">Select time</option>
        {trainingTimeOptions.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function InputSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#020617]/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="font-semibold text-cyan-300">
          {value}
          {suffix}
        </p>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-300"
      />
    </div>
  );
}
