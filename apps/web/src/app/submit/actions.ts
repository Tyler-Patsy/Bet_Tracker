"use server";

import { redirect } from "next/navigation";
import { db, submissions } from "@graded/db";

export async function submitCapper(formData: FormData) {
  // Honeypot: real users never see or fill this field (visually hidden).
  // Bots that blindly fill every input trip it.
  if (String(formData.get("website") ?? "").trim() !== "") {
    redirect("/submit/thanks");
  }

  const name = String(formData.get("name") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim() || null;
  const why = String(formData.get("why") ?? "").trim() || null;

  if (!name) throw new Error("Capper name is required");

  await db.insert(submissions).values({ name, link, why });
  redirect("/submit/thanks");
}
