import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Candidate, Interview, Job, Store } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "recruitment.json");

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildSeedJobs(): Job[] {
  return [
    {
      id: crypto.randomUUID(),
      title: "Senior Software Engineer",
      department: "Engineering",
      location: "Austin, TX",
      status: "Open",
      openings: 2,
      createdAt: isoDaysAgo(24),
    },
    {
      id: crypto.randomUUID(),
      title: "Data Analyst",
      department: "Analytics",
      location: "Remote",
      status: "Open",
      openings: 1,
      createdAt: isoDaysAgo(19),
    },
    {
      id: crypto.randomUUID(),
      title: "Product Designer",
      department: "Design",
      location: "San Francisco, CA",
      status: "Open",
      openings: 1,
      createdAt: isoDaysAgo(14),
    },
    {
      id: crypto.randomUUID(),
      title: "Technical Recruiter",
      department: "People",
      location: "New York, NY",
      status: "Paused",
      openings: 1,
      createdAt: isoDaysAgo(10),
    },
    {
      id: crypto.randomUUID(),
      title: "DevOps Engineer",
      department: "Platform",
      location: "Remote",
      status: "Open",
      openings: 2,
      createdAt: isoDaysAgo(7),
    },
    {
      id: crypto.randomUUID(),
      title: "QA Automation Engineer",
      department: "Quality",
      location: "Chicago, IL",
      status: "Closed",
      openings: 1,
      createdAt: isoDaysAgo(4),
    },
  ];
}

function buildSeedCandidates(jobs: Job[]): Candidate[] {
  if (jobs.length === 0) {
    return [];
  }

  const templates: Array<Pick<Candidate, "name" | "email" | "stage" | "score">> = [
    { name: "Ava Chen", email: "ava.chen@example.com", stage: "Applied", score: 72 },
    { name: "Noah Patel", email: "noah.patel@example.com", stage: "Screening", score: 79 },
    { name: "Mia Johnson", email: "mia.johnson@example.com", stage: "Interview", score: 86 },
    { name: "Liam Rivera", email: "liam.rivera@example.com", stage: "Offer", score: 91 },
    { name: "Sophia Kim", email: "sophia.kim@example.com", stage: "Hired", score: 94 },
    { name: "Ethan Brooks", email: "ethan.brooks@example.com", stage: "Rejected", score: 61 },
    { name: "Isabella Nguyen", email: "isabella.nguyen@example.com", stage: "Applied", score: 70 },
    { name: "Lucas Walker", email: "lucas.walker@example.com", stage: "Screening", score: 83 },
    { name: "Charlotte Diaz", email: "charlotte.diaz@example.com", stage: "Interview", score: 88 },
    { name: "James Lee", email: "james.lee@example.com", stage: "Offer", score: 90 },
    { name: "Amelia Turner", email: "amelia.turner@example.com", stage: "Hired", score: 95 },
    { name: "Benjamin Green", email: "benjamin.green@example.com", stage: "Rejected", score: 65 },
  ];

  return templates.map((template, index) => ({
    id: crypto.randomUUID(),
    name: template.name,
    email: template.email,
    stage: template.stage,
    jobId: jobs[index % jobs.length].id,
    score: template.score,
    createdAt: isoDaysAgo(18 - Math.min(index, 17)),
  }));
}

function buildSeedInterviews(candidates: Candidate[]): Interview[] {
  const interviewable = candidates.filter(
    (candidate) => candidate.stage === "Interview" || candidate.stage === "Offer" || candidate.stage === "Hired",
  );

  const interviewers = [
    "Taylor Morgan",
    "Jordan Smith",
    "Casey Thompson",
    "Alex Kim",
    "Riley Martin",
  ];

  const types: Interview["type"][] = ["Phone", "Technical", "Panel", "Final"];
  const statuses: Interview["status"][] = ["Completed", "Completed", "Scheduled", "Scheduled", "Canceled"];

  return interviewable.map((candidate, index) => ({
    id: crypto.randomUUID(),
    candidateId: candidate.id,
    jobId: candidate.jobId,
    type: types[index % types.length],
    scheduledAt: new Date(Date.now() + (index - 3) * 12 * 60 * 60 * 1000).toISOString(),
    interviewer: interviewers[index % interviewers.length],
    status: statuses[index % statuses.length],
  }));
}

function buildSeedStore(): Store {
  const jobs = buildSeedJobs();
  const candidates = buildSeedCandidates(jobs);
  const interviews = buildSeedInterviews(candidates);

  return {
    jobs,
    candidates,
    interviews,
  };
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(buildSeedStore(), null, 2), "utf8");
  }
}

async function readStore(): Promise<Store> {
  await ensureStore();
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Store;

  let changed = false;

  if (!Array.isArray(parsed.jobs) || parsed.jobs.length === 0) {
    parsed.jobs = buildSeedJobs();
    changed = true;
  }

  if (!Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
    parsed.candidates = buildSeedCandidates(parsed.jobs);
    changed = true;
  }

  if (!Array.isArray(parsed.interviews) || parsed.interviews.length === 0) {
    parsed.interviews = buildSeedInterviews(parsed.candidates);
    changed = true;
  }

  if (changed) {
    await saveStore(parsed);
  }

  return parsed;
}

async function saveStore(store: Store) {
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listJobs() {
  const store = await readStore();
  return store.jobs;
}

export async function getJobById(id: string) {
  const store = await readStore();
  return store.jobs.find((job) => job.id === id) ?? null;
}

export async function createJob(input: Omit<Job, "id" | "createdAt">) {
  const store = await readStore();
  const item: Job = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  store.jobs.unshift(item);
  await saveStore(store);
  return item;
}

export async function updateJobStatus(id: string, status: Job["status"]) {
  const store = await readStore();
  const index = store.jobs.findIndex((job) => job.id === id);

  if (index === -1) {
    return null;
  }

  store.jobs[index] = {
    ...store.jobs[index],
    status,
  };
  await saveStore(store);
  return store.jobs[index];
}

export async function deleteJob(id: string) {
  const store = await readStore();
  const before = store.jobs.length;
  store.jobs = store.jobs.filter((job) => job.id !== id);

  if (before === store.jobs.length) {
    return false;
  }

  store.candidates = store.candidates.filter((candidate) => candidate.jobId !== id);
  store.interviews = store.interviews.filter((interview) => interview.jobId !== id);

  await saveStore(store);
  return true;
}

export async function listCandidates() {
  const store = await readStore();
  return store.candidates;
}

export async function createCandidate(input: Omit<Candidate, "id" | "createdAt">) {
  const store = await readStore();
  const item: Candidate = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  store.candidates.unshift(item);
  await saveStore(store);
  return item;
}

export async function updateCandidateStage(id: string, stage: Candidate["stage"]) {
  const store = await readStore();
  const index = store.candidates.findIndex((candidate) => candidate.id === id);

  if (index === -1) {
    return null;
  }

  store.candidates[index] = {
    ...store.candidates[index],
    stage,
  };
  await saveStore(store);
  return store.candidates[index];
}

export async function deleteCandidate(id: string) {
  const store = await readStore();
  const before = store.candidates.length;
  store.candidates = store.candidates.filter((candidate) => candidate.id !== id);

  if (before === store.candidates.length) {
    return false;
  }

  store.interviews = store.interviews.filter((interview) => interview.candidateId !== id);
  await saveStore(store);
  return true;
}

export async function listInterviews() {
  const store = await readStore();
  return store.interviews;
}

export async function createInterview(input: Omit<Interview, "id">) {
  const store = await readStore();
  const item: Interview = {
    id: crypto.randomUUID(),
    ...input,
  };
  store.interviews.unshift(item);
  await saveStore(store);
  return item;
}

export async function updateInterviewStatus(id: string, status: Interview["status"]) {
  const store = await readStore();
  const index = store.interviews.findIndex((interview) => interview.id === id);

  if (index === -1) {
    return null;
  }

  store.interviews[index] = {
    ...store.interviews[index],
    status,
  };
  await saveStore(store);
  return store.interviews[index];
}

export async function deleteInterview(id: string) {
  const store = await readStore();
  const before = store.interviews.length;
  store.interviews = store.interviews.filter((interview) => interview.id !== id);

  if (before === store.interviews.length) {
    return false;
  }

  await saveStore(store);
  return true;
}

export async function getMetrics() {
  const store = await readStore();

  const stageCounts = {
    Applied: 0,
    Screening: 0,
    Interview: 0,
    Offer: 0,
    Hired: 0,
    Rejected: 0,
  };

  for (const candidate of store.candidates) {
    stageCounts[candidate.stage] += 1;
  }

  const avgCandidateScore =
    store.candidates.length === 0
      ? 0
      : Math.round(
          store.candidates.reduce((acc, candidate) => acc + candidate.score, 0) /
            store.candidates.length,
        );

  return {
    openJobs: store.jobs.filter((job) => job.status === "Open").length,
    candidates: store.candidates.length,
    interviewsScheduled: store.interviews.filter((interview) => interview.status === "Scheduled").length,
    offers: store.candidates.filter((candidate) => candidate.stage === "Offer").length,
    hires: stageCounts.Hired,
    avgCandidateScore,
    stageCounts,
    upcomingInterviews: store.interviews
      .filter((interview) => interview.status === "Scheduled")
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 8),
  };
}
