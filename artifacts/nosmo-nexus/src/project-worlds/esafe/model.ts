export const ESAFE_CATEGORIES = [
  "Survey",
  "BIM",
  "Design",
  "Production",
  "Construction",
  "Testing",
  "Research",
  "Communication",
] as const;

export type EsafeCategory = (typeof ESAFE_CATEGORIES)[number];
export type EsafeTimelineMode = "real" | "replay" | "simulation";
export type EsafePhase = "SURVEY" | "DESIGN + BIM" | "PROCUREMENT" | "CONSTRUCTION" | "TESTING + HANDOVER";

type EsafeRawRecord = readonly [id: string, date: string, title: string, fileCount: number, core: boolean];

export interface EsafeRecord {
  id: string;
  date: string;
  title: string;
  category: EsafeCategory;
  fileCount: number;
  core: boolean;
  url: string;
  license: "cc-by-4.0";
  sourceAdapter: "zenodo";
}

export interface EsafeRecordPreview {
  id: string;
  title: string;
  date: string;
  category: EsafeCategory;
  core: boolean;
  fileCount: number;
  url: string;
}

export interface EsafeCategoryState {
  visible: number;
  total: number;
  previews: EsafeRecordPreview[];
}

export interface EsafeTimelineState {
  mode: EsafeTimelineMode;
  progress: number;
  sourceDate: string;
  phase: EsafePhase;
  visibleRecordIds: string[];
  visibleRecordCount: number;
  visibleFileCount: number;
  categories: Record<EsafeCategory, EsafeCategoryState>;
}

const RAW_RECORDS: readonly EsafeRawRecord[] = [
  ["5607218","2021-06-28","Optimization of the slip force in a novel frictio…",1,false],
  ["5576084","2021-06-30","IMPACT OF RETROFIT OF RC FRAMES BY CLT PANELS AND…",1,false],
  ["5060152","2021-07-02","Deliverable D3.1 - Report with e-SAFE requirements",1,false],
  ["5139817","2021-07-02","Hygrothermal and Acoustic Performance of Two Inno…",1,false],
  ["5548289","2021-07-08","Hygrothermal analysis of CLT-based retrofit strat…",1,false],
  ["5140081","2021-07-27","Hygrothermal analysis of CLT-based retrofit strat…",1,false],
  ["5142195","2021-07-28","IMPACT OF RETROFIT OF RC FRAMES BY CLT PANELS AND…",1,false],
  ["5354570","2021-08-25","Poster on e-SAFE thermal and acoustic requirement…",1,false],
  ["5548328","2021-08-25","The e-SAFE energy and seismic renovation solution…",1,false],
  ["5603046","2021-09-08","Technological analysis of prefabricated timber-ba…",1,false],
  ["5506615","2021-09-09","Preliminary investigation on the tranisent hygrot…",1,false],
  ["5506679","2021-09-09","Preliminary investigation on the tranisent hygrot…",1,false],
  ["5552147","2021-09-09","Preliminary investigation on the transient hygrot…",1,false],
  ["5586372","2021-09-29","MECHANICAL CHARACTERIZATION OF ENERGY DISSIPATION…",1,false],
  ["5560506","2021-10-11","e-SAFE: energy and seismic affordable renovation …",1,false],
  ["5615542","2021-10-28","The e-SAFE solutions for the energy and seismic r…",1,false],
  ["5705263","2021-11-16","Multi-level stakeholder engagement",1,false],
  ["6496938","2021-12-31","Deliverable D4.2 - Decision Support System (e-DSS…",1,false],
  ["5925473","2022-01-21","Design of a novel seismic retrofitting system for…",1,false],
  ["6108953","2022-02-16","Optimization of the structural coupling between R…",1,false],
  ["6260847","2022-02-24","Deliverable D5.1 - Detailed survey of the real pilot",1,true],
  ["6346218","2022-03-10","Experimental Cyclic Response of a Novel Friction …",1,false],
  ["6598271","2022-03-31","CALL FOR EXPRESSION OF INTEREST FOR VIRTUAL PILOTS",6,false],
  ["6496970","2022-04-27","Deliverable D4.3 - e-SAFE DSS: first complete ver…",1,false],
  ["6496993","2022-04-27","Deliverable D2.4 - Call for expression of interes…",1,false],
  ["6497142","2022-04-27","Deliverable D2.2 - 3D physical and digital models…",1,true],
  ["6497154","2022-04-27","Deliverable D6.2 - Business Models and Financial …",1,false],
  ["6505195","2022-04-29","e-SAFE call for virtual pilot",7,false],
  ["6598254","2022-05-10","Application process open: EU-funded project offer…",1,false],
  ["6860922","2022-07-04","ENSURING SAFE AND ENERGY EFFICIENT BUILDINGS - Ho…",1,false],
  ["7018233","2022-07-31","Energy performance of a prefabricated timber-base…",1,false],
  ["7129241","2022-08-23","Deliverable D4.4 - e-SAFE BEMS early version",1,false],
  ["10907038","2022-08-24","External steel exoskeleton for a life-cycle  upgr…",1,false],
  ["7018198","2022-08-24","Heat and mass transfer modelling for moisture rel…",1,false],
  ["7018215","2022-08-24","Deliverable D5.2 - Report with the preliminary co…",1,false],
  ["7270438","2022-11-01","Probabilistic friction model for aluminium–steel …",1,false],
  ["7333030","2022-11-18","Moisture-Related Risks in Wood-Based Retrofit Sol…",1,false],
  ["10839559","2022-12-20","Technological analysis of a prefabricated timber-…",1,false],
  ["10877370","2022-12-28","Technological design of integrated seismic and en…",1,false],
  ["10878947","2022-12-28","Co-designing sustainability: the case of via Acqu…",1,false],
  ["10843361","2023","A sub-assembly based technique for calibration of…",1,false],
  ["15784905","2023-01-15","e-SAFE 4th Newsletter",1,false],
  ["10839207","2023-03-21","Energetic Optimisation of the Domestic Hot Water …",1,false],
  ["10069309","2023-05-19","Multi-objective study on an innovative system for…",1,false],
  ["8028027","2023-06-08","e-SAFE 5th Newsletter",1,false],
  ["10070014","2023-07-04","Techno-economic analysis of a novel retrofit solu…",1,false],
  ["10839067","2023-07-04","Techno-economic analysis of a novel retrofit solu…",1,false],
  ["10944917","2023-09-08","Prestazioni energetiche di sistemi di produzione …",1,false],
  ["15568681","2023-09-29","Energy Analysis of a Centralized Residential Ther…",1,false],
  ["10908487","2023-10","Application potentials of a 3D exoskeleton techno…",1,false],
  ["10839437","2023-12-15","6th e-SAFE Newsletter",1,false],
  ["10863906","2024-03-11","Heat and Mass Transfer Modelling for Moisture-Rel…",1,false],
  ["10845932","2024-03-20","Deliverable D2.5 - Report of the co-learning and …",1,false],
  ["10845961","2024-03-20","Deliverable D3.4 - BIM-based abacus of solutions",1,false],
  ["10846818","2024-03-21","Deliverable D3.5 - Certificates of successful tes…",1,false],
  ["10846894","2024-03-21","Deliverable D4.6 - Final integrated e-BEMS",1,false],
  ["10846973","2024-03-21","Deliverable D6.2 - Business Models and Financial …",1,false],
  ["10847025","2024-03-21","Deliverable D7.4 - Report on e-SAFE Dissemination…",1,false],
  ["10847132","2024-03-21","Deliverable D7.5 - Report on dissemination to pol…",1,false],
  ["10863956","2024-03-23","On the choice of the weather dataset in hygrother…",1,false],
  ["10864004","2024-03-23","A decision support tool for the co-design of ener…",1,false],
  ["10867509","2024-03-25","CYCLIC TESTS ON AN INNOVATIVE FRICTION DISSIPATIV…",1,false],
  ["10867529","2024-03-25","DESIGN OF ASYMMETRIC FRICTION CONNECTION FOR SESI…",1,false],
  ["10907964","2024-03-28","Application of a retrofit system to improve the s…",1,false],
  ["10906976","2024-04-02","Welfare abitativo e rigenerazione urbana nella fa…",1,false],
  ["10948464","2024-04-09","Presentation of e-DSS: the e-SAFE Decision Suppor…",1,false],
  ["12635566","2024-07-03","e-BEMS: e-SAFE Building Energy Management System",1,false],
  ["14049567","2024-11-07","Energy Retrofit Potential in the Public Housing S…",1,false],
  ["17257475","2025-02-17","Dissipative CLT-Based Seismic Upgrading System fo…",1,false],
  ["15784930","2025-03-24","e-SAFE 7th Newsletter",1,false],
  ["15568548","2025-05-29","A Decision Support Tool to Assess the Energy Reno…",1,false],
  ["15737097","2025-06-25","WEDEST – WE DEsign STudio. Servizi di progettazio…",1,false],
  ["15737248","2025-06-25","Seismic and Energy Renovation of RC-Framed Buildi…",1,false],
  ["15568597","2025-09-08","Energy Retrofit Potential in the Public Housing S…",1,false],
  ["17359911","2025-09-15","e-SAFE Newsletter #8: A journey's end and new beg…",1,false],
  ["19187178","2025-09-15","e-SAFE: CHANGING THE LANDSCAPE OF EU NON-HISTORIC…",1,false],
  ["19187259","2025-09-15","e-SAFE: Dare futuro agli edifici",1,false],
  ["19114712","2026-03-19","Deliverable D5.5 - Report on monitoring activities",1,true],
  ["19115030","2026-03-19","Deliverable D5.7 - Report on the evaluation at ur…",1,false],
  ["19115870","2026-03-19","Deliverable D5.6 - Detailed design for the virtua…",1,false],
  ["19126327","2026-03-20","Deliverable D5.8 - Guidelines for e-SAFE implemen…",1,false],
  ["19126519","2026-03-20","Deliverable D5.4 - Production and delivery of the…",1,true],
  ["19126674","2026-03-20","Deliverable D5.3 - Detailed design for the renova…",1,true],
  ["19127061","2026-03-20","Deliverable D4.5 - Final parameterized e-DSS",1,false],
  ["19127222","2026-03-20","Deliverable D6.2 - Business Models and Financial …",1,false],
  ["19127503","2026-03-20","Deliverable D3.7 - Final revised BIM-based abacus…",1,false],
  ["19127624","2026-03-20","Deliverable 3.8 - Pre-assembly manual for e-SAFE …",1,false],
  ["19144290","2026-03-21","Deliverable D2.6 - 3D physical and digital models…",1,false],
  ["19144356","2026-03-21","Deliverable D2.8 - Urban geo-dataset of potential…",1,false],
  ["19144392","2026-03-21","Deliverable D2.9 - Final e-SAFE engagement protocol",1,false],
  ["19144451","2026-03-21","Deliverable D2.10 - Final e-SAFE co-design protocol",1,false],
  ["19144742","2026-03-21","Deliverable D7.4 - Report on e-SAFE dissemination…",1,false],
  ["19144820","2026-03-21","Deliverable D7.5 - Report on dissemination to pol…",1,false],
  ["19144934","2026-03-21","Deliverable D7.7 - Report on training activities",1,false],
  ["19144991","2026-03-21","Deliverable D7.8 - Report on outreach activities …",1,false],
] as const;

function normalizeDate(value: string) {
  if (/^\d{4}$/.test(value)) return `${value}-01-01`;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}

function categoryForTitle(title: string): EsafeCategory {
  const value = title.toLowerCase();
  if (value.includes("survey")) return "Survey";
  if (value.includes("bim") || value.includes("3d physical") || value.includes("digital model")) return "BIM";
  if (value.includes("design") || value.includes("requirements") || value.includes("abacus")) return "Design";
  if (value.includes("production") || value.includes("delivery") || value.includes("pre-assembly")) return "Production";
  if (value.includes("monitor") || value.includes("test") || value.includes("certificate")) return "Testing";
  if (value.includes("newsletter") || value.includes("poster") || value.includes("dissemination") || value.includes("training") || value.includes("outreach")) return "Communication";
  if (value.includes("pilot") || value.includes("renovation") || value.includes("retrofit")) return "Construction";
  return "Research";
}

export const ESAFE_RECORDS: readonly EsafeRecord[] = RAW_RECORDS.map(([id, date, title, fileCount, core]) => ({
  id,
  date: normalizeDate(date),
  title,
  category: categoryForTitle(title),
  fileCount,
  core,
  url: `https://zenodo.org/records/${id}`,
  license: "cc-by-4.0",
  sourceAdapter: "zenodo",
}));

export const ESAFE_SOURCE_RECORD_COUNT = ESAFE_RECORDS.length;
export const ESAFE_SOURCE_FILE_COUNT = ESAFE_RECORDS.reduce((total, record) => total + record.fileCount, 0);
export const ESAFE_CORE_RECORDS = ESAFE_RECORDS.filter((record) => record.core);

export function esafePhase(progress: number): EsafePhase {
  if (progress < 0.15) return "SURVEY";
  if (progress < 0.35) return "DESIGN + BIM";
  if (progress < 0.55) return "PROCUREMENT";
  if (progress < 0.85) return "CONSTRUCTION";
  return "TESTING + HANDOVER";
}

function asPreview(record: EsafeRecord): EsafeRecordPreview {
  return {
    id: record.id,
    title: record.title,
    date: record.date,
    category: record.category,
    core: record.core,
    fileCount: record.fileCount,
    url: record.url,
  };
}

export function buildEsafeTimelineState(progressInput: number, mode: EsafeTimelineMode = "simulation"): EsafeTimelineState {
  const progress = Math.min(1, Math.max(0, progressInput));
  const sorted = [...ESAFE_RECORDS].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(`${sorted[0]?.date ?? "2021-01-01"}T00:00:00Z`).getTime();
  const last = new Date(`${sorted.at(-1)?.date ?? "2026-01-01"}T00:00:00Z`).getTime();
  const cutoffMs = first + (last - first) * progress;
  const cutoff = new Date(cutoffMs);
  const visible = sorted.filter((record) => new Date(`${record.date}T23:59:59Z`).getTime() <= cutoffMs);

  const categories = Object.fromEntries(
    ESAFE_CATEGORIES.map((category) => {
      const visibleCategory = visible.filter((record) => record.category === category);
      const allCategory = sorted.filter((record) => record.category === category);
      const source = visibleCategory.length ? visibleCategory : allCategory;
      return [
        category,
        {
          visible: visibleCategory.length,
          total: allCategory.length,
          previews: source.slice(-3).reverse().map(asPreview),
        },
      ];
    }),
  ) as Record<EsafeCategory, EsafeCategoryState>;

  return {
    mode,
    progress,
    sourceDate: cutoff.toISOString(),
    phase: esafePhase(progress),
    visibleRecordIds: visible.map((record) => record.id),
    visibleRecordCount: visible.length,
    visibleFileCount: visible.reduce((total, record) => total + record.fileCount, 0),
    categories,
  };
}

export function getEsafeRecord(recordId: string) {
  return ESAFE_RECORDS.find((record) => record.id === recordId) ?? null;
}
