import { requireSession } from "../server/auth.mjs";
import { readSheetRange, safeGoogleError } from "../server/google.mjs";
import { CATEGORY_CV } from "../server/config.mjs";

const value = (row, index) => String(row[index] ?? "").trim();

const scoreJob = (job) => {
  let score = job.priority === "A" ? 84 : job.priority === "B" ? 70 : 55;
  const shift = job.shift.toLowerCase();
  const transport = job.transport.toLowerCase();
  if (/07:00|08:00|09:00|morning/.test(shift)) score += 8;
  if (/night|18:00|22:00/.test(shift)) score += 8;
  if (/high|excellent|strong/.test(transport)) score += 5;
  if (/weak|poor/.test(transport)) score -= 12;
  if (/form required/.test(job.status.toLowerCase())) score -= 2;
  return Math.max(20, Math.min(99, score));
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!requireSession(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    const rows = await readSheetRange("BAZA AKTYWNA!A1:AF400");
    const jobs = rows.slice(1).map((row, offset) => {
      const category = value(row, 2);
      const job = {
        row: offset + 2,
        priority: value(row, 0) || "C",
        role: value(row, 1),
        category,
        company: value(row, 3),
        agency: value(row, 4),
        location: value(row, 5),
        transport: value(row, 7),
        travelTime: value(row, 8),
        shift: value(row, 9),
        days: value(row, 10),
        daypart: value(row, 11),
        contract: value(row, 12),
        pay: value(row, 13),
        startDate: value(row, 14),
        experience: value(row, 15),
        requirements: value(row, 16),
        cvCode: value(row, 17) || CATEGORY_CV[category] || "",
        coverLetter: value(row, 18),
        applicationMethod: value(row, 19),
        applicationLink: value(row, 20),
        email: value(row, 21),
        phone: value(row, 22),
        contactPerson: value(row, 23),
        dateFound: value(row, 24),
        listingAge: value(row, 25),
        status: value(row, 26) || "ACTIVE",
        notes: value(row, 27),
        whatsapp: value(row, 28),
        whatsappInfo: value(row, 29),
        bestContact: value(row, 30),
        sourceUrl: value(row, 31),
      };
      return { ...job, match: scoreJob(job) };
    }).filter((job) => job.role && job.company);

    return res.status(200).json({
      ok: true,
      source: "google-sheets",
      jobs,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({ ok: false, ...safeGoogleError(error) });
  }
}
