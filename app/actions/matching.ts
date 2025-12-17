"use server";

import { runAutoMatching } from "@/lib/matching";

export async function runMatchingAction(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const from = String(formData.get("from"));
  const to = String(formData.get("to"));

  return runAutoMatching({ courseId, from, to });
}
