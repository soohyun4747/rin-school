import { restInsert, restSelect, restUpsert } from "./supabase/rest";

type Application = {
  id: string;
  course_id: string;
  student_id: string;
  created_at: string;
};

type AvailabilitySlot = {
  id: string;
  course_id: string;
  user_id: string;
  role: "student" | "instructor";
  start_at: string;
  end_at: string;
  capacity: number;
};

type Match = {
  id: string;
  course_id: string;
  slot_start_at: string;
  slot_end_at: string;
  instructor_id: string;
  status: string;
};

type MatchStudent = {
  id: string;
  match_id: string;
  student_id: string;
};

export type RunAutoMatchingInput = {
  courseId: string;
  from: string;
  to: string;
};

export type RunAutoMatchingResult = {
  matched: number;
  unmatched: number;
};

function buildMatchKey(slot: AvailabilitySlot) {
  return `${slot.course_id}-${slot.user_id}-${slot.start_at}-${slot.end_at}`;
}

function isWithinRange(date: string, from: Date, to: Date) {
  const target = new Date(date);
  if (Number.isNaN(target.valueOf())) return false;
  return target >= from && target <= to;
}

export async function runAutoMatching(
  input: RunAutoMatchingInput,
): Promise<RunAutoMatchingResult> {
  const fromDate = new Date(input.from);
  const toDate = new Date(input.to);

  const [applications, studentSlots, instructorSlots, matches, matchStudents] =
    await Promise.all([
      restSelect<Application>("applications", {
        filters: { course_id: input.courseId },
        order: { column: "created_at" },
      }),
      restSelect<AvailabilitySlot>("availability_slots", {
        filters: { course_id: input.courseId, role: "student" },
        order: { column: "start_at" },
      }),
      restSelect<AvailabilitySlot>("availability_slots", {
        filters: { course_id: input.courseId, role: "instructor" },
        order: { column: "start_at" },
      }),
      restSelect<Match>("matches", {
        filters: { course_id: input.courseId },
        order: { column: "slot_start_at" },
      }),
      restSelect<MatchStudent>("match_students"),
    ]);

  const filteredApps = applications
    .filter((app) => isWithinRange(app.created_at, fromDate, toDate))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  const matchByKey = new Map<string, Match>();
  matches.forEach((match) => {
    const key = `${match.course_id}-${match.instructor_id}-${match.slot_start_at}-${match.slot_end_at}`;
    matchByKey.set(key, match);
  });

  const occupancy = new Map<string, number>();
  matchStudents.forEach((row) => {
    const current = occupancy.get(row.match_id) ?? 0;
    occupancy.set(row.match_id, current + 1);
  });

  let matched = 0;
  let unmatched = 0;
  const pendingMatchStudents: Array<{ match_id: string; student_id: string }>
    = [];

  for (const application of filteredApps) {
    const candidateSlots = studentSlots
      .filter((slot) => slot.user_id === application.student_id)
      .sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      );

    let placed = false;

    for (const studentSlot of candidateSlots) {
      const instructorSlot = instructorSlots.find(
        (slot) =>
          slot.start_at === studentSlot.start_at &&
          slot.end_at === studentSlot.end_at,
      );

      if (!instructorSlot) continue;

      const matchKey = buildMatchKey(instructorSlot);
      let match = matchByKey.get(matchKey);

      if (!match) {
        const [createdMatch] = (await restUpsert<Match>(
          "matches?on_conflict=course_id,slot_start_at,slot_end_at,instructor_id",
          {
            course_id: instructorSlot.course_id,
            slot_start_at: instructorSlot.start_at,
            slot_end_at: instructorSlot.end_at,
            instructor_id: instructorSlot.user_id,
            status: "proposed",
          },
        )) as Match[];

        if (!createdMatch) continue;
        match = createdMatch;
        matchByKey.set(matchKey, createdMatch);
      }

      const currentCount = occupancy.get(match.id) ?? 0;
      const capacityLimit = Math.min(instructorSlot.capacity ?? 1, 4);

      if (currentCount >= capacityLimit) continue;

      pendingMatchStudents.push({
        match_id: match.id,
        student_id: application.student_id,
      });
      occupancy.set(match.id, currentCount + 1);
      matched += 1;
      placed = true;
      break;
    }

    if (!placed) {
      unmatched += 1;
    }
  }

  if (pendingMatchStudents.length > 0) {
    await restInsert("match_students", pendingMatchStudents);
  }

  return { matched, unmatched };
}
