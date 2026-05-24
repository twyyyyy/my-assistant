"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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

type InputTab = "schedule" | "task" | "training";

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
  targetDistance?: string;
};

type TimelineItem = {
  id: number;
  source: "event" | "task" | "training";
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  status: string;
  completed: boolean;
  completionKey: string;
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

type WeeklyLoadDay = {
  date: string;
  dayLabel: string;
  displayDate: string;
  itemCount: number;
  scheduledMinutes: number;
  trainingCount: number;
  taskCount: number;
  loadLevel: "Light" | "Moderate" | "Heavy";
};

type PriorityTask = FocusTask & {
  score: number;
  reason: string;
};

type OverloadWarning = {
  title: string;
  message: string;
  tone: "safe" | "watch" | "risk";
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
  completedItems: "life-optimiser-completed-items",
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
  session: TrainingSession,
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

function getDistanceUnit(sport: TrainingSport) {
  if (sport === "Run") return "km";
  if (sport === "Kayak") return "km";
  return "";
}

function getTrainingDistanceText(training: TrainingItem) {
  if (!training.targetDistance) return "";

  const unit = getDistanceUnit(training.sport);
  if (!unit) return "";

  return `${training.targetDistance} ${unit}`;
}

function getTrainingStatusText(training: TrainingItem) {
  const distanceText = getTrainingDistanceText(training);

  if (!distanceText) return training.intensity;

  return `${training.intensity} · ${distanceText}`;
}

function getCompletionKey(
  source: TimelineItem["source"],
  id: number,
  date: string,
) {
  return `${source}-${id}-${date}`;
}

function getProgressMessage(totalItems: number, completedItems: number) {
  const remainingItems = totalItems - completedItems;

  if (totalItems === 0) {
    return "Clean slate today. Add what matters, then execute with intent.";
  }

  if (remainingItems === 0) {
    return "Schedule cleared. Strong discipline today.";
  }

  if (remainingItems === 1) {
    return "One final item left. Finish clean.";
  }

  return `${remainingItems} items left. Stay locked in and keep moving.`;
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

function isTimeValue(time: string) {
  return /^\d{2}:\d{2}$/.test(time);
}

function getMinutesFromTime(time: string) {
  if (!isTimeValue(time)) return 0;

  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getTimelineSortValue(item: TimelineItem) {
  if (isTimeValue(item.startTime)) return getMinutesFromTime(item.startTime);
  return 1439;
}

function getTimelineTimeText(item: TimelineItem) {
  if (isTimeValue(item.startTime) && isTimeValue(item.endTime)) {
    return `${item.startTime} - ${item.endTime}`;
  }

  return item.startTime || "Anytime";
}

function getTaskCompletionKey(task: FocusTask, todayDate: string) {
  const belongsToToday = task.plannedDate === todayDate || task.deadline === todayDate;
  const completionDate = belongsToToday
    ? todayDate
    : task.plannedDate || task.deadline || todayDate;

  return getCompletionKey("task", task.id, completionDate);
}

function getWeeklyLoadBarClass(loadLevel: WeeklyLoadDay["loadLevel"]) {
  if (loadLevel === "Heavy") {
    return "w-full rounded-lg bg-gradient-to-t from-red-400 via-orange-300 to-amber-200 transition-all";
  }

  if (loadLevel === "Moderate") {
    return "w-full rounded-lg bg-gradient-to-t from-blue-400 via-sky-300 to-violet-300 transition-all";
  }

  return "w-full rounded-lg bg-gradient-to-t from-emerald-400 via-teal-300 to-cyan-200 transition-all";
}

function getWeeklyLoadCardClass(loadLevel: WeeklyLoadDay["loadLevel"]) {
  if (loadLevel === "Heavy") {
    return "rounded-2xl border border-red-300/20 bg-red-300/5 p-3";
  }

  if (loadLevel === "Moderate") {
    return "rounded-2xl border border-blue-300/20 bg-blue-300/5 p-3";
  }

  return "rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-3";
}

function getLoadLevelFromHours(hours: number): WeeklyLoadDay["loadLevel"] {
  if (hours >= 7) return "Heavy";
  if (hours >= 4) return "Moderate";
  return "Light";
}

function formatLoadFractionFromMinutes(minutes: number) {
  const roundedHours = Math.ceil(minutes / 60);

  return `${roundedHours}/24`;
}

function getLoadTextClass(loadLevel: WeeklyLoadDay["loadLevel"]) {
  if (loadLevel === "Heavy") return "text-red-300";
  if (loadLevel === "Moderate") return "text-amber-300";
  return "text-emerald-300";
}

function pickBrief(briefs: string[], seed: number) {
  return briefs[Math.abs(seed) % briefs.length];
}

function formatBriefHours(hours: number) {
  return Math.ceil(hours).toString();
}

function getTodayBrief({
  itemCount,
  scheduledHours,
  dueTodayTaskCount,
  trainingCount,
  highIntensityTrainingCount,
  planType,
  readinessScore,
  sleepHours,
  soreness,
  stress,
  fatigue,
  isWorkday,
}: {
  itemCount: number;
  scheduledHours: number;
  dueTodayTaskCount: number;
  trainingCount: number;
  highIntensityTrainingCount: number;
  planType: PlanType;
  readinessScore: number;
  sleepHours: number;
  soreness: number;
  stress: number;
  fatigue: number;
  isWorkday: boolean;
}) {
  const roundedHours = formatBriefHours(scheduledHours);
  const seed =
    readinessScore +
    itemCount * 7 +
    dueTodayTaskCount * 11 +
    trainingCount * 13 +
    stress * 17 +
    fatigue * 19;

  if (isWorkday && stress >= 7) {
    return pickBrief(
      [
        `Work may feel intense today. Start calm, protect your focus, and clear one thing at a time.`,
        `High stress workday. Keep your pace steady, take short resets, and do not carry every problem at once.`,
        `Stress is high today. Lead with the key task, breathe between blocks, and keep the day controlled.`,
      ],
      seed
    );
  }

  if (sleepHours < 6) {
    return pickBrief(
      [
        `Sleep is low today. Keep priorities tight, avoid extras, and give yourself room to recover.`,
        `Low sleep day. Do the essentials first, move steadily, and keep the evening lighter.`,
        `Energy may dip today. Start with the important work and protect your recovery later.`,
      ],
      seed
    );
  }

  if (fatigue >= 7) {
    return pickBrief(
      [
        `Fatigue is high. Keep the plan simple, finish essentials, and do not force unnecessary output.`,
        `Heavy fatigue today. Move carefully, reduce extras, and treat recovery as part of the plan.`,
        `Your body is asking for control. Clear the must do items and keep the rest realistic.`,
      ],
      seed
    );
  }

  if (soreness >= 7) {
    return pickBrief(
      [
        `Soreness is high today. Work steadily and keep training controlled, not heroic.`,
        `Your body is carrying load. Prioritise clean execution and avoid chasing extra intensity.`,
        `High soreness day. Stay productive, but leave enough margin for recovery.`,
      ],
      seed
    );
  }

  if (itemCount === 0) {
    return pickBrief(
      [
        `Open day with readiness at ${readinessScore}. Choose one meaningful priority and protect the rest of your energy.`,
        `Your schedule is clear today. Use the space well, reset properly, and move one important thing forward.`,
        `Light day ahead. Keep it simple, recover well, and avoid filling the day just because there is room.`,
      ],
      seed
    );
  }

  if (planType === "Recovery") {
    return pickBrief(
      [
        `Recovery focused day. Handle essentials only and avoid turning ${roundedHours}/24 planned hours into extra load.`,
        `Readiness is low today, so protect your energy. Clear the must do items and keep training or extras light.`,
        `Take the conservative route today. Finish what matters, leave buffer between commitments, and recover properly.`,
      ],
      seed
    );
  }

  if (scheduledHours >= 10) {
    return pickBrief(
      [
        `Very full day ahead with ${roundedHours}/24 planned. Start with the highest ranked task and keep the rest tight.`,
        `Your load is heavy today. Execute the plan, avoid new commitments, and protect recovery after the final block.`,
        `Packed schedule today. Stay disciplined, move through one block at a time, and do not add unnecessary extras.`,
      ],
      seed
    );
  }

  if (scheduledHours >= 7) {
    return pickBrief(
      [
        `Busy but manageable day. Prioritise your key work first, then keep the remaining blocks steady and clean.`,
        `You have a solid load today. Stay focused early, keep transitions sharp, and avoid stacking extra commitments.`,
        `Moderate to heavy day ahead. Follow the schedule closely and save decision making energy for what matters.`,
      ],
      seed
    );
  }

  if (dueTodayTaskCount > 0) {
    return pickBrief(
      [
        `${dueTodayTaskCount} task${dueTodayTaskCount === 1 ? " is" : "s are"} due today. Clear the urgent work early, then follow the schedule calmly.`,
        `Due date pressure today. Handle the deadline item first so the rest of your day feels lighter.`,
        `Start with the task due today. Once that is cleared, your schedule becomes much easier to manage.`,
      ],
      seed
    );
  }

  if (highIntensityTrainingCount > 0 && readinessScore < 80) {
    return pickBrief(
      [
        `Training is demanding today while readiness is ${readinessScore}. Keep work focused and leave space to recover.`,
        `You can train today, but do not overload the rest of the day. Protect energy before and after the hard session.`,
        `High intensity training is on the plan. Keep tasks realistic and treat recovery as part of execution.`,
      ],
      seed
    );
  }

  if (trainingCount > 0) {
    return pickBrief(
      [
        `Balanced day ahead with readiness at ${readinessScore}. Handle key work first, then train with intent.`,
        `Good day to stay consistent. Clear your main task early and keep training controlled, not excessive.`,
        `Work first, training second. Keep the day steady and avoid adding extras that do not move the needle.`,
      ],
      seed
    );
  }

  if (planType === "High Output") {
    return pickBrief(
      [
        `Strong day ahead. Use your readiness well by clearing focused work early and keeping momentum clean.`,
        `High readiness today. Push the important work forward, but keep the plan disciplined.`,
        `You have room to perform today. Attack the top priority first and keep the rest of the day structured.`,
      ],
      seed
    );
  }

  return pickBrief(
    [
      `Balanced day ahead. Stay steady, follow the plan, and finish the most important task before adding more.`,
      `A manageable day today. Keep your focus narrow, complete the key block, and maintain good recovery habits.`,
      `Steady execution day. Do the important work first and let the schedule guide the rest.`,
    ],
    seed
  );
}

function formatDisplayDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}`;
}

function getDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-SG", {
    weekday: "short",
  });
}

function getScheduledMinutesForDate({
  date,
  events,
  focusTasks,
  trainings,
}: {
  date: string;
  events: EventItem[];
  focusTasks: FocusTask[];
  trainings: TrainingItem[];
}) {
  const eventMinutes = events
    .filter((event) => eventOccursOnDate(event, date))
    .reduce(
      (total, event) =>
        total + calculateDuration(event.startTime, event.endTime),
      0,
    );

  const taskMinutes = focusTasks
    .filter(
      (task) => task.plannedDate === date && task.startTime && task.endTime,
    )
    .reduce(
      (total, task) => total + calculateDuration(task.startTime, task.endTime),
      0,
    );

  const trainingMinutes = trainings
    .filter((training) => training.date === date)
    .reduce(
      (total, training) =>
        total + calculateDuration(training.startTime, training.endTime),
      0,
    );

  return eventMinutes + taskMinutes + trainingMinutes;
}

function getWeeklyOverview({
  startDate,
  events,
  focusTasks,
  trainings,
}: {
  startDate: string;
  events: EventItem[];
  focusTasks: FocusTask[];
  trainings: TrainingItem[];
}): WeeklyLoadDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startDate, index);
    const dayEvents = events.filter((event) => eventOccursOnDate(event, date));
    const dayTasks = focusTasks.filter(
      (task) => task.plannedDate === date || task.deadline === date,
    );
    const dayTrainings = trainings.filter((training) => training.date === date);
    const scheduledMinutes = getScheduledMinutesForDate({
      date,
      events,
      focusTasks,
      trainings,
    });
    const itemCount = dayEvents.length + dayTasks.length + dayTrainings.length;
    const scheduledHours = scheduledMinutes / 60;

    let loadLevel: WeeklyLoadDay["loadLevel"] = "Light";

    if (scheduledHours >= 8 || itemCount >= 6) {
      loadLevel = "Heavy";
    } else if (scheduledHours >= 4 || itemCount >= 3) {
      loadLevel = "Moderate";
    }

    return {
      date,
      dayLabel: getDayLabel(date),
      displayDate: formatDisplayDate(date),
      itemCount,
      scheduledMinutes,
      trainingCount: dayTrainings.length,
      taskCount: dayTasks.length,
      loadLevel,
    };
  });
}

function getTaskPriorityScore(
  task: FocusTask,
  todayDate: string,
  readinessScore: number,
) {
  const tagScore: Record<FocusTag, number> = {
    Essential: 40,
    "High Focus": 35,
    Learning: 25,
    Admin: 15,
    "Low Priority": 5,
  };

  let score = tagScore[task.tag];

  if (task.deadline) {
    const daysUntilDeadline = Math.ceil(
      (new Date(`${task.deadline}T00:00:00`).getTime() -
        new Date(`${todayDate}T00:00:00`).getTime()) /
        86400000,
    );

    if (daysUntilDeadline < 0) score += 35;
    else if (daysUntilDeadline === 0) score += 30;
    else if (daysUntilDeadline <= 2) score += 22;
    else if (daysUntilDeadline <= 7) score += 12;
  }

  if (task.plannedDate === todayDate) score += 20;
  if (task.startTime && task.endTime) score += 10;
  if (readinessScore < 60 && task.tag === "Essential") score += 10;
  if (readinessScore >= 80 && task.tag === "High Focus") score += 8;

  return Math.min(score, 100);
}

function getTaskPriorityReason(task: FocusTask, todayDate: string) {
  if (task.deadline && task.deadline < todayDate) {
    return "Overdue deadline. Clear this before adding new work.";
  }

  if (task.deadline === todayDate) {
    return "Due today, so it should be handled early.";
  }

  if (task.tag === "Essential") {
    return "Essential item with high consequence if delayed.";
  }

  if (task.tag === "High Focus") {
    return "High focus task. Best done during your strongest energy block.";
  }

  if (task.plannedDate === todayDate) {
    return "Planned for today and already belongs in your execution queue.";
  }

  return "Ranked by tag, deadline, and planned timing.";
}

function getPriorityTasks(
  tasks: FocusTask[],
  todayDate: string,
  readinessScore: number,
): PriorityTask[] {
  return tasks
    .map((task) => ({
      ...task,
      score: getTaskPriorityScore(task, todayDate, readinessScore),
      reason: getTaskPriorityReason(task, todayDate),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
}

function getOverloadWarnings({
  todaySchedule,
  visibleTrainings,
  readinessScore,
  planType,
}: {
  todaySchedule: TimelineItem[];
  visibleTrainings: TrainingItem[];
  readinessScore: number;
  planType: PlanType;
}): OverloadWarning[] {
  const warnings: OverloadWarning[] = [];
  const scheduledMinutes = todaySchedule.reduce(
    (total, item) => total + calculateDuration(item.startTime, item.endTime),
    0,
  );
  const scheduledHours = scheduledMinutes / 60;
  const highIntensityTrainings = visibleTrainings.filter(
    (training) => training.intensity === "High",
  ).length;
  const sortedItems = todaySchedule
    .filter((item) => isTimeValue(item.startTime) && isTimeValue(item.endTime))
    .sort((a, b) => getTimelineSortValue(a) - getTimelineSortValue(b));
  const hasOverlap = sortedItems.some((item, index) => {
    const nextItem = sortedItems[index + 1];
    if (!nextItem) return false;

    return (
      getMinutesFromTime(item.endTime) > getMinutesFromTime(nextItem.startTime)
    );
  });

  if (scheduledHours >= 9) {
    warnings.push({
      title: "Heavy day detected",
      message: `You have ${scheduledHours.toFixed(1)} scheduled hours today. Move one low priority task or keep training very controlled.`,
      tone: "risk",
    });
  } else if (scheduledHours >= 7 && planType !== "High Output") {
    warnings.push({
      title: "Moderate overload risk",
      message: `You have ${scheduledHours.toFixed(1)} scheduled hours while readiness is ${readinessScore}. Keep buffers between commitments.`,
      tone: "watch",
    });
  }

  if (readinessScore < 60 && visibleTrainings.length > 0) {
    warnings.push({
      title: "Recovery conflict",
      message:
        "Readiness is low today. Keep training easy or shift intense sessions to another day.",
      tone: "risk",
    });
  }

  if (readinessScore < 75 && highIntensityTrainings > 0) {
    warnings.push({
      title: "High intensity check",
      message:
        "High intensity training is planned while readiness is not high. Warm up properly and avoid adding extra volume.",
      tone: "watch",
    });
  }

  if (todaySchedule.length >= 7) {
    warnings.push({
      title: "Too many moving parts",
      message: `${todaySchedule.length} items are planned today. Protect the top three and move anything non-essential.`,
      tone: "watch",
    });
  }

  if (hasOverlap) {
    warnings.push({
      title: "Schedule clash found",
      message:
        "At least two items overlap. Edit the timing before confirming the plan.",
      tone: "risk",
    });
  }

  if (warnings.length === 0) {
    warnings.push({
      title: "Load looks controlled",
      message:
        "No overload signals detected. Execute the plan as scheduled and keep normal recovery habits.",
      tone: "safe",
    });
  }

  return warnings;
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

const DEFAULT_READINESS: ReadinessState = {
  sleepHours: 7,
  soreness: 4,
  stress: 5,
  fatigue: 4,
};

function getDefaultEvents(todayDate: string): EventItem[] {
  return [
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
  ];
}

function getDefaultFocusTasks(todayDate: string): FocusTask[] {
  return [
    {
      id: 1,
      title: "Finish frontend task",
      tag: "High Focus",
      deadline: "",
      plannedDate: todayDate,
      startTime: "",
      endTime: "",
    },
  ];
}

function getDefaultTrainings(todayDate: string): TrainingItem[] {
  return [
    {
      id: 1,
      date: todayDate,
      startTime: "19:30",
      endTime: "20:30",
      sport: "Gym",
      session: "Upper Body",
      intensity: "Medium",
      targetDistance: "",
    },
  ];
}

export default function Home() {

  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const todayDate = getTodayDateString();
  const inputSectionRef = useRef<HTMLElement | null>(null);

  const [hasMounted, setHasMounted] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  const [sleepHours, setSleepHours] = useState(DEFAULT_READINESS.sleepHours);
  const [soreness, setSoreness] = useState(DEFAULT_READINESS.soreness);
  const [stress, setStress] = useState(DEFAULT_READINESS.stress);
  const [fatigue, setFatigue] = useState(DEFAULT_READINESS.fatigue);
  const [confirmedMessage, setConfirmedMessage] = useState("");

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTrainingId, setEditingTrainingId] = useState<number | null>(
    null,
  );
  const [activeInputTab, setActiveInputTab] = useState<InputTab>("schedule");
  const [openActionMenuKey, setOpenActionMenuKey] = useState<string | null>(null);

  const [completedItems, setCompletedItems] = useState<string[]>([]);

  const [events, setEvents] = useState<EventItem[]>(() =>
    getDefaultEvents(todayDate),
  );

  const [focusTasks, setFocusTasks] = useState<FocusTask[]>(() =>
    getDefaultFocusTasks(todayDate),
  );

  const [trainings, setTrainings] = useState<TrainingItem[]>(() =>
    getDefaultTrainings(todayDate),
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
    targetDistance: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedReadiness = loadFromStorage<ReadinessState>(
      STORAGE_KEYS.readiness,
      DEFAULT_READINESS,
    );

    setSleepHours(savedReadiness.sleepHours);
    setSoreness(savedReadiness.soreness);
    setStress(savedReadiness.stress);
    setFatigue(savedReadiness.fatigue);

    setEvents(
      loadFromStorage<EventItem[]>(
        STORAGE_KEYS.events,
        getDefaultEvents(todayDate),
      ),
    );

    setFocusTasks(
      loadFromStorage<FocusTask[]>(
        STORAGE_KEYS.focusTasks,
        getDefaultFocusTasks(todayDate),
      ),
    );

    setTrainings(
      loadFromStorage<TrainingItem[]>(
        STORAGE_KEYS.trainings,
        getDefaultTrainings(todayDate),
      ),
    );

    setCompletedItems(
      loadFromStorage<string[]>(STORAGE_KEYS.completedItems, []),
    );

    setHasMounted(true);
  }, [todayDate]);

  useEffect(() => {
    if (!hasMounted) return;
    window.localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
  }, [events, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    window.localStorage.setItem(
      STORAGE_KEYS.focusTasks,
      JSON.stringify(focusTasks),
    );
  }, [focusTasks, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    window.localStorage.setItem(
      STORAGE_KEYS.trainings,
      JSON.stringify(trainings),
    );
  }, [trainings, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    window.localStorage.setItem(
      STORAGE_KEYS.completedItems,
      JSON.stringify(completedItems),
    );
  }, [completedItems, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    window.localStorage.setItem(
      STORAGE_KEYS.readiness,
      JSON.stringify({
        sleepHours,
        soreness,
        stress,
        fatigue,
      }),
    );
  }, [sleepHours, soreness, stress, fatigue, hasMounted]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const updateDateTime = () => setCurrentDateTime(new Date());
    updateDateTime();

    const timer = window.setInterval(updateDateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!openActionMenuKey) return;

    const closeActionMenu = () => setOpenActionMenuKey(null);

    window.addEventListener("click", closeActionMenu);
    window.addEventListener("scroll", closeActionMenu, true);

    return () => {
      window.removeEventListener("click", closeActionMenu);
      window.removeEventListener("scroll", closeActionMenu, true);
    };
  }, [openActionMenuKey]);

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
    eventOccursOnDate(event, todayDate),
  );

  const visibleTasks = focusTasks.filter((task) => {
    const isPlannedToday =
      task.plannedDate === todayDate && task.startTime && task.endTime;
    const isDueToday = task.deadline === todayDate;

    return Boolean(isPlannedToday || isDueToday);
  });

  const visibleTrainings = trainings.filter(
    (training) => training.date === todayDate,
  );

  const taskTimelineItems: TimelineItem[] = visibleTasks.map((task) => {
    const completionKey = getTaskCompletionKey(task, todayDate);
    const isDueToday = task.deadline === todayDate;

    return {
      id: task.id,
      source: "task",
      startTime: task.startTime || (isDueToday ? "Due today" : "Anytime"),
      endTime: task.endTime || "",
      title: task.title,
      category: "Task",
      status: "",
      completed: completedItems.includes(completionKey),
      completionKey,
    };
  });

  const trainingTimelineItems: TimelineItem[] = visibleTrainings.map(
    (training) => {
      const completionKey = getCompletionKey(
        "training",
        training.id,
        todayDate,
      );

      return {
        id: training.id,
        source: "training",
        startTime: training.startTime,
        endTime: training.endTime,
        title: `${training.sport}: ${training.session}`,
        category: "Training",
        status: "",
        completed: completedItems.includes(completionKey),
        completionKey,
      };
    },
  );

  const eventTimelineItems: TimelineItem[] = visibleEvents.map((event) => {
    const completionKey = getCompletionKey("event", event.id, todayDate);

    return {
      id: event.id,
      source: "event",
      startTime: event.startTime,
      endTime: event.endTime,
      title: event.title,
      category: event.category,
      status: "",
      completed: completedItems.includes(completionKey),
      completionKey,
    };
  });

  const todaySchedule = [
    ...eventTimelineItems,
    ...taskTimelineItems,
    ...trainingTimelineItems,
  ].sort((a, b) => getTimelineSortValue(a) - getTimelineSortValue(b));

  const completedScheduleCount = todaySchedule.filter(
    (item) => item.completed,
  ).length;

  const progressMessage = getProgressMessage(
    todaySchedule.length,
    completedScheduleCount,
  );

  const todayScheduledMinutes = todaySchedule.reduce(
    (total, item) => total + calculateDuration(item.startTime, item.endTime),
    0,
  );

  const todayScheduledHours = todayScheduledMinutes / 60;
  const todayLoadLevel = getLoadLevelFromHours(todayScheduledHours);
  const todayLoadFraction = formatLoadFractionFromMinutes(todayScheduledMinutes);

  const dueTodayTaskCount = focusTasks.filter(
    (task) =>
      task.deadline === todayDate &&
      !completedItems.includes(getTaskCompletionKey(task, todayDate)),
  ).length;

  const highIntensityTrainingCount = visibleTrainings.filter(
    (training) => training.intensity === "High",
  ).length;

  const todayBrief = getTodayBrief({
    itemCount: todaySchedule.length,
    scheduledHours: todayScheduledHours,
    dueTodayTaskCount,
    trainingCount: visibleTrainings.length,
    highIntensityTrainingCount,
    planType,
    readinessScore,
    sleepHours,
    soreness,
    stress,
    fatigue,
    isWorkday: isWeekday(todayDate),
  });

  const currentDateLabel = currentDateTime
    ? currentDateTime.toLocaleDateString("en-SG", {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const currentTimeLabel = currentDateTime
    ? currentDateTime.toLocaleTimeString("en-SG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  const sortedFocusTasks = [...focusTasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  const sortedTrainings = [...visibleTrainings].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  const upcomingEvents = getUpcomingEvents(events, todayDate);

  const recommendation = getRecommendation({
    planType,
    trainingCount: visibleTrainings.length,
    taskCount: focusTasks.length,
  });

  const weeklyOverview = getWeeklyOverview({
    startDate: todayDate,
    events,
    focusTasks,
    trainings,
  });

  const priorityTasks = getPriorityTasks(focusTasks, todayDate, readinessScore);

  const overloadWarnings = getOverloadWarnings({
    todaySchedule,
    visibleTrainings,
    readinessScore,
    planType,
  });

  function scrollToInputSection() {
    window.setTimeout(() => {
      inputSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

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

  function resetTaskForm() {
    setNewFocusTask({
      title: "",
      tag: "High Focus",
      deadline: "",
      plannedDate: todayDate,
      startTime: "",
      endTime: "",
    });

    setEditingTaskId(null);
  }

  function resetTrainingForm() {
    setNewTraining({
      date: todayDate,
      startTime: "",
      endTime: "",
      sport: "Run",
      session: "Easy Run",
      intensity: "Low",
      targetDistance: "",
    });
    setEditingTrainingId(null);
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
            : event,
        ),
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

    setActiveInputTab("schedule");
    scrollToInputSection();
  }

  function addOrUpdateFocusTask() {
    if (!newFocusTask.title) return;

    if (editingTaskId) {
      setFocusTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: newFocusTask.title,
                tag: newFocusTask.tag,
                deadline: newFocusTask.deadline,
                plannedDate: newFocusTask.plannedDate,
                startTime: newFocusTask.startTime,
                endTime: newFocusTask.endTime,
              }
            : task,
        ),
      );
    } else {
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
    }

    resetTaskForm();
    setConfirmedMessage("");
  }

  function startEditingTask(id: number) {
    const taskToEdit = focusTasks.find((task) => task.id === id);

    if (!taskToEdit) return;

    setEditingTaskId(id);
    setNewFocusTask({
      title: taskToEdit.title,
      tag: taskToEdit.tag,
      deadline: taskToEdit.deadline,
      plannedDate: taskToEdit.plannedDate,
      startTime: taskToEdit.startTime,
      endTime: taskToEdit.endTime,
    });

    setConfirmedMessage("");

    setActiveInputTab("task");
    scrollToInputSection();
  }

  function addOrUpdateTraining() {
    if (!newTraining.date || !newTraining.startTime || !newTraining.endTime) {
      return;
    }

    if (editingTrainingId) {
      setTrainings((currentTrainings) =>
        currentTrainings.map((training) =>
          training.id === editingTrainingId
            ? {
                ...training,
                date: newTraining.date,
                startTime: newTraining.startTime,
                endTime: newTraining.endTime,
                sport: newTraining.sport,
                session: newTraining.session,
                intensity: newTraining.intensity,
                targetDistance: newTraining.targetDistance,
              }
            : training,
        ),
      );
    } else {
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
          targetDistance: newTraining.targetDistance,
        },
      ]);
    }

    resetTrainingForm();
    setConfirmedMessage("");
  }

  function startEditingTraining(id: number) {
    const trainingToEdit = trainings.find((training) => training.id === id);

    if (!trainingToEdit) return;

    setEditingTrainingId(id);
    setNewTraining({
      date: trainingToEdit.date,
      startTime: trainingToEdit.startTime,
      endTime: trainingToEdit.endTime,
      sport: trainingToEdit.sport,
      session: trainingToEdit.session,
      intensity: trainingToEdit.intensity,
      targetDistance: trainingToEdit.targetDistance ?? "",
    });
    setConfirmedMessage("");

    setActiveInputTab("training");
    scrollToInputSection();
  }

  function toggleCompletionKey(completionKey: string) {
    setCompletedItems((currentItems) => {
      if (currentItems.includes(completionKey)) {
        return currentItems.filter((key) => key !== completionKey);
      }

      return [...currentItems, completionKey];
    });

    setConfirmedMessage("");
  }

  function toggleTimelineCompletion(item: TimelineItem) {
    toggleCompletionKey(item.completionKey);
  }

  function removeTimelineItem(item: TimelineItem) {
    if (item.source === "event") {
      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== item.id),
      );
    }

    if (item.source === "task") {
      setFocusTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== item.id),
      );
    }

    if (item.source === "training") {
      setTrainings((currentTrainings) =>
        currentTrainings.filter((training) => training.id !== item.id),
      );
    }

    setConfirmedMessage("");
  }

  function removeFocusTask(id: number) {
    setFocusTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id),
    );

    setCompletedItems((currentItems) =>
      currentItems.filter((key) => !key.includes(`task-${id}-`)),
    );

    if (editingTaskId === id) {
      resetTaskForm();
    }

    setConfirmedMessage("");
  }

  function removeTraining(id: number) {
    setTrainings((currentTrainings) =>
      currentTrainings.filter((training) => training.id !== id),
    );

    setCompletedItems((currentItems) =>
      currentItems.filter((key) => !key.includes(`training-${id}-`)),
    );

    if (editingTrainingId === id) {
      resetTrainingForm();
    }

    setConfirmedMessage("");
  }

  function removeEvent(id: number) {
    setEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== id),
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
      targetDistance: sport === "Gym" ? "" : newTraining.targetDistance,
    });
  }

  function updateTrainingSession(session: TrainingSession) {
    setNewTraining({
      ...newTraining,
      session,
      intensity: getTrainingIntensity(newTraining.sport, session),
    });
  }

  async function signUp() {
    if (!authEmail || !authPassword) {
      setAuthMessage("Enter your email and password first.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage("Account created. Check your email if confirmation is required.");
    }

    setAuthLoading(false);
  }

  async function signIn() {
    if (!authEmail || !authPassword) {
      setAuthMessage("Enter your email and password first.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage("Logged in successfully.");
      setAuthEmail("");
      setAuthPassword("");
    }

    setAuthLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthMessage("Logged out.");
  }

  function clearSavedData() {
    window.localStorage.removeItem(STORAGE_KEYS.events);
    window.localStorage.removeItem(STORAGE_KEYS.focusTasks);
    window.localStorage.removeItem(STORAGE_KEYS.trainings);
    window.localStorage.removeItem(STORAGE_KEYS.readiness);
    window.localStorage.removeItem(STORAGE_KEYS.completedItems);
    window.location.reload();
  }

  function confirmPlan() {
    setConfirmedMessage(
      "Today’s plan is confirmed. Local device saving is still active. Supabase data sync comes next after login is tested.",
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
        <header className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
              Life Optimiser
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              {currentDateLabel && (
                <div className="mb-5">
                  <p className="text-base font-medium text-slate-300 sm:text-lg">
                    {currentDateLabel}
                  </p>
                  <p className="mt-2 font-mono text-6xl font-semibold leading-none tracking-tight text-white sm:text-7xl">
                    {currentTimeLabel}
                  </p>
                </div>
              )}

              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                Plan your day,{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                  Mabel.
                </span>
              </h1>
              <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-cyan-100">
                {todayBrief}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-[#0b1120]/90 p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:col-span-2 lg:col-span-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Readiness</p>
                    <p className="mt-2 font-mono text-5xl font-semibold">{readinessScore}</p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
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

              <div className="rounded-3xl border border-white/10 bg-[#020617]/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Daily load</p>
                    <p className="mt-2 font-mono text-3xl font-semibold text-white">
                      {todayLoadFraction}
                    </p>
                  </div>
                  <span className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium ${getLoadTextClass(todayLoadLevel)}`}>
                    {todayLoadLevel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {todaySchedule.length} item{todaySchedule.length === 1 ? "" : "s"} planned today
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {overloadWarnings[0]?.tone === "safe"
                    ? "Load is controlled. Execute the plan and keep normal recovery habits."
                    : overloadWarnings[0]?.message}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {user ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                  Account
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Logged in as <span className="text-white">{user.email}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={signOut}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-red-300/40 hover:text-red-300"
              >
                Log out
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                Account
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Sign in to sync your dashboard
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Create an account first. Supabase sync will be connected after login works.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50"
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50"
                />

                <button
                  type="button"
                  onClick={signIn}
                  disabled={authLoading}
                  className="rounded-2xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                >
                  Log in
                </button>

                <button
                  type="button"
                  onClick={signUp}
                  disabled={authLoading}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
                >
                  Sign up
                </button>
              </div>
            </div>
          )}

          {authMessage && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-[#020617]/70 px-4 py-2.5 text-sm text-slate-300">
              {authMessage}
            </p>
          )}
        </section>

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

        <section
          ref={inputSectionRef}
          className="scroll-mt-6 mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#020617]/80 p-2">
              <TabButton
                label="Schedule"
                active={activeInputTab === "schedule"}
                onClick={() => setActiveInputTab("schedule")}
              />
              <TabButton
                label="Task"
                active={activeInputTab === "task"}
                onClick={() => setActiveInputTab("task")}
              />
              <TabButton
                label="Training"
                active={activeInputTab === "training"}
                onClick={() => setActiveInputTab("training")}
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0b1120]/90 p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-6">
              {activeInputTab === "schedule" && (
                <CompactPanel
                  title={editingEventId ? "Edit Schedule Event" : "Add Schedule Event"}
                  label="Schedule Input"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <DateInput
                      label="Event Date"
                      value={newEvent.date}
                      onChange={(value) =>
                        setNewEvent({ ...newEvent, date: value })
                      }
                      optional={false}
                    />

                    <Input
                      placeholder="Event title, e.g. Internship"
                      value={newEvent.title}
                      onChange={(value) =>
                        setNewEvent({ ...newEvent, title: value })
                      }
                    />

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
                      className="rounded-2xl bg-cyan-300 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-200"
                    >
                      {editingEventId ? "Update Event" : "Add Event"}
                    </button>

                    {editingEventId && (
                      <button
                        onClick={resetEventForm}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-slate-300 transition hover:border-red-300/40 hover:text-red-300 md:col-span-2"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </CompactPanel>
              )}

              {activeInputTab === "task" && (
                <CompactPanel
                  title={editingTaskId ? "Edit Task" : "Add Task"}
                  label="Task Input"
                >
                  <div className="grid gap-4 md:grid-cols-2">
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

                    <button
                      onClick={addOrUpdateFocusTask}
                      className="rounded-2xl bg-violet-300 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-violet-200 md:col-span-2"
                    >
                      {editingTaskId ? "Update Task" : "Add Task"}
                    </button>

                    {editingTaskId && (
                      <button
                        onClick={resetTaskForm}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-slate-300 transition hover:border-red-300/40 hover:text-red-300 md:col-span-2"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </CompactPanel>
              )}

              {activeInputTab === "training" && (
                <CompactPanel
                  title={
                    editingTrainingId
                      ? "Edit Training Session"
                      : "Add Training Session"
                  }
                  label="Training Input"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <DateInput
                      label="Training Date"
                      value={newTraining.date}
                      onChange={(value) =>
                        setNewTraining({ ...newTraining, date: value })
                      }
                      optional={false}
                    />

                    <SelectInput
                      value={newTraining.sport}
                      options={trainingSports}
                      onChange={(value) =>
                        updateTrainingSport(value as TrainingSport)
                      }
                    />

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

                    <SelectInput
                      value={newTraining.session}
                      options={trainingSessionsBySport[newTraining.sport]}
                      onChange={(value) =>
                        updateTrainingSession(value as TrainingSession)
                      }
                    />

                    {newTraining.sport !== "Gym" ? (
                      <NumberInput
                        label={`Target Distance (${getDistanceUnit(newTraining.sport)})`}
                        placeholder={
                          newTraining.sport === "Run"
                            ? "e.g. 5, 8, 12"
                            : "e.g. 4, 6, 10"
                        }
                        value={newTraining.targetDistance}
                        onChange={(value) =>
                          setNewTraining({
                            ...newTraining,
                            targetDistance: value,
                          })
                        }
                      />
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm">
                        <p className="text-slate-500">Target Distance</p>
                        <p className="mt-1 text-slate-600">Not required for gym</p>
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm">
                      <p className="text-slate-500">Calculated intensity</p>
                      <p className="mt-1 font-semibold text-emerald-300">
                        {newTraining.intensity}
                      </p>
                    </div>

                    <button
                      onClick={addOrUpdateTraining}
                      className="rounded-2xl bg-emerald-300 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-200"
                    >
                      {editingTrainingId ? "Update Training" : "Add Training"}
                    </button>

                    {editingTrainingId && (
                      <button
                        onClick={resetTrainingForm}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-slate-300 transition hover:border-red-300/40 hover:text-red-300 md:col-span-2"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </CompactPanel>
              )}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-12">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl lg:col-span-12">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                  Weekly Overview
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Weekly Load</h2>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                Next 7 days
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-7">
              {weeklyOverview.map((day) => {
                const loadPercentage = Math.max(
                  6,
                  Math.round((day.scheduledMinutes / 1440) * 100),
                );

                return (
                  <div
                    key={day.date}
                    className={getWeeklyLoadCardClass(day.loadLevel)}
                  >
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-white">
                        {day.dayLabel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {day.displayDate}
                      </p>
                    </div>

                    <div className="flex h-24 items-end rounded-xl bg-white/5 p-1">
                      <div
                        className={getWeeklyLoadBarClass(day.loadLevel)}
                        style={{ height: `${loadPercentage}%` }}
                      />
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-400">
                      <p>{formatLoadFractionFromMinutes(day.scheduledMinutes)} planned</p>
                      <p>{day.itemCount} items</p>
                      <p
                        className={getLoadTextClass(day.loadLevel)}
                      >
                        {day.loadLevel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
                {hasMounted
                  ? `${completedScheduleCount}/${todaySchedule.length} complete`
                  : "Loading plan"}
              </span>
            </div>

            <p className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
              {hasMounted ? progressMessage : "Loading today’s plan..."}
            </p>

            <div className="space-y-4">
              {todaySchedule.map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setOpenActionMenuKey(
                      openActionMenuKey === `timeline-${item.source}-${item.id}`
                        ? null
                        : `timeline-${item.source}-${item.id}`,
                    );
                  }}
                  className={`relative rounded-2xl border border-white/10 bg-[#020617]/70 p-5 transition ${
                    item.completed ? "opacity-60" : ""
                  }`}
                >
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-300 to-violet-400" />
                  <div className="flex flex-col gap-4 pl-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-mono text-sm text-cyan-200">
                        {getTimelineTimeText(item)}
                      </p>
                      <h3
                        className={`mt-2 text-lg font-medium ${
                          item.completed
                            ? "line-through decoration-cyan-300/70"
                            : ""
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.category}
                      </p>
                    </div>


                    <MobileActionButton
                      isOpen={openActionMenuKey === `timeline-${item.source}-${item.id}`}
                      onClick={() =>
                        setOpenActionMenuKey(
                          openActionMenuKey === `timeline-${item.source}-${item.id}`
                            ? null
                            : `timeline-${item.source}-${item.id}`,
                        )
                      }
                    />

                    <ContextActions
                      isOpen={openActionMenuKey === `timeline-${item.source}-${item.id}`}
                      completed={item.completed}
                      onToggle={() => toggleTimelineCompletion(item)}
                      onEdit={() => {
                        if (item.source === "task") startEditingTask(item.id);
                        if (item.source === "event") startEditingEvent(item.id);
                        if (item.source === "training") startEditingTraining(item.id);
                      }}
                      onRemove={() => removeTimelineItem(item)}
                    />
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
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">
              Focus
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Ranked Tasks</h2>

            <ol className="mt-6 space-y-3">
              {priorityTasks.map((task, index) => {
                const taskCompletionKey = getTaskCompletionKey(task, todayDate);
                const taskCompleted =
                  completedItems.includes(taskCompletionKey);

                return (
                  <li
                    key={task.id}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setOpenActionMenuKey(
                        openActionMenuKey === `task-${task.id}`
                          ? null
                          : `task-${task.id}`,
                      );
                    }}
                    className={`relative rounded-2xl border border-white/10 bg-[#020617]/70 p-4 transition ${
                      taskCompleted ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                          {index + 1}
                        </span>
                        <div>
                          <p
                            className={`font-medium ${
                              taskCompleted
                                ? "line-through decoration-violet-300/70"
                                : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          <p
                            className={`mt-1 text-xs text-slate-500 ${
                              taskCompleted ? "line-through" : ""
                            }`}
                          >
                            {task.deadline ? `Due ${task.deadline}` : "No deadline"}
                            {task.startTime && task.endTime
                              ? ` · ${task.plannedDate} · ${task.startTime} - ${task.endTime}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <MobileActionButton
                        isOpen={openActionMenuKey === `task-${task.id}`}
                        onClick={() =>
                          setOpenActionMenuKey(
                            openActionMenuKey === `task-${task.id}`
                              ? null
                              : `task-${task.id}`,
                          )
                        }
                      />

                      <ContextActions
                        isOpen={openActionMenuKey === `task-${task.id}`}
                        completed={taskCompleted}
                        onToggle={() => toggleCompletionKey(taskCompletionKey)}
                        onEdit={() => startEditingTask(task.id)}
                        onRemove={() => removeFocusTask(task.id)}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl lg:col-span-7">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              Training
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Performance Plan</h2>

            <div className="mt-6 space-y-4">
              {sortedTrainings.map((training) => {
                const trainingCompletionKey = getCompletionKey(
                  "training",
                  training.id,
                  training.date,
                );
                const trainingCompleted = completedItems.includes(
                  trainingCompletionKey,
                );

                return (
                  <div
                    key={training.id}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setOpenActionMenuKey(
                        openActionMenuKey === `training-${training.id}`
                          ? null
                          : `training-${training.id}`,
                      );
                    }}
                    className={`relative rounded-2xl border border-white/10 bg-[#020617]/70 p-4 transition ${
                      trainingCompleted ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-sm text-emerald-300">
                          {training.startTime} - {training.endTime}
                        </p>
                        <h3
                          className={`mt-2 font-medium ${
                            trainingCompleted
                              ? "line-through decoration-emerald-300/70"
                              : ""
                          }`}
                        >
                          {training.sport}: {training.session}
                        </h3>
                        <p
                          className={`mt-1 text-sm text-slate-500 ${
                            trainingCompleted ? "line-through" : ""
                          }`}
                        >
                          {calculateDuration(
                            training.startTime,
                            training.endTime,
                          )}{" "}
                          min · {training.intensity} intensity
                          {getTrainingDistanceText(training)
                            ? ` · ${getTrainingDistanceText(training)}`
                            : ""}
                        </p>
                      </div>

                      <MobileActionButton
                        isOpen={openActionMenuKey === `training-${training.id}`}
                        onClick={() =>
                          setOpenActionMenuKey(
                            openActionMenuKey === `training-${training.id}`
                              ? null
                              : `training-${training.id}`,
                          )
                        }
                      />

                      <ContextActions
                        isOpen={openActionMenuKey === `training-${training.id}`}
                        completed={trainingCompleted}
                        onToggle={() => toggleCompletionKey(trainingCompletionKey)}
                        onEdit={() => startEditingTraining(training.id)}
                        onRemove={() => removeTraining(training.id)}
                      />
                    </div>
                  </div>
                );
              })}

              {sortedTrainings.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-[#020617]/70 p-4 text-sm text-slate-500">
                  No training added for today.
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
                  onContextMenu={(menuEvent) => {
                    menuEvent.preventDefault();
                    setOpenActionMenuKey(
                      openActionMenuKey === `upcoming-${event.eventId}-${event.occurrenceDate}`
                        ? null
                        : `upcoming-${event.eventId}-${event.occurrenceDate}`,
                    );
                  }}
                  className="relative rounded-2xl border border-white/10 bg-[#020617]/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm text-blue-300">
                        {event.occurrenceDate} · {event.startTime} -{" "}
                        {event.endTime}
                      </p>
                      <h3 className="mt-2 font-medium">{event.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {event.category} · {event.repeat}
                      </p>
                    </div>

                    <MobileActionButton
                      isOpen={openActionMenuKey === `upcoming-${event.eventId}-${event.occurrenceDate}`}
                      onClick={() =>
                        setOpenActionMenuKey(
                          openActionMenuKey === `upcoming-${event.eventId}-${event.occurrenceDate}`
                            ? null
                            : `upcoming-${event.eventId}-${event.occurrenceDate}`,
                        )
                      }
                    />

                    <ContextActions
                      isOpen={openActionMenuKey === `upcoming-${event.eventId}-${event.occurrenceDate}`}
                      completed={false}
                      onEdit={() => startEditingEvent(event.eventId)}
                      onRemove={() => removeEvent(event.eventId)}
                    />
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


function CompactPanel({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
        {label}
      </p>

      <div className="mb-5 mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-xs text-slate-500">
          Add only what needs to be planned.
        </p>
      </div>

      {children}
    </div>
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
    <div className="rounded-3xl border border-white/10 bg-[#0b1120]/90 p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
        {label}
      </p>
      <h2 className="mt-2 text-lg font-semibold sm:text-xl">{title}</h2>
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

function NumberInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-slate-500">{label}</span>
      <input
        type="number"
        min="0"
        step="0.1"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50"
      />
    </label>
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

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-xs font-semibold tracking-wide transition sm:px-4 sm:text-sm ${
        active
          ? "bg-gradient-to-r from-cyan-300 to-violet-300 text-slate-950 shadow-lg shadow-cyan-950/20"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}



function MobileActionButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Open actions"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border text-lg leading-none transition md:hidden ${
        isOpen
          ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200"
          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      ⋯
    </button>
  );
}

function ContextActions({
  isOpen,
  completed = false,
  onToggle,
  onEdit,
  onRemove,
}: {
  isOpen: boolean;
  completed?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onRemove: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-14 z-30 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#020617] px-3 py-2 shadow-2xl shadow-black/40 md:top-4">
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className={
            completed
              ? "rounded-full border border-slate-300/20 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
              : "rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-300 transition hover:bg-emerald-300/20"
          }
        >
          {completed ? "Undo" : "Done"}
        </button>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-slate-400 transition hover:text-cyan-300"
        >
          Edit
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-slate-400 transition hover:text-red-300"
      >
        Remove
      </button>
    </div>
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
