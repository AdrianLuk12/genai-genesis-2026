"use client";

import { FormEvent, useEffect, useState } from "react";

type Candidate = {
    id: string;
    name: string;
    email: string;
    stage: string;
    jobId: string;
    score: number;
};

type Job = {
    id: string;
    title: string;
};

export default function CandidatesPage() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [query, setQuery] = useState("");
    const [stageFilter, setStageFilter] = useState("All");
    const [form, setForm] = useState({
        name: "",
        email: "",
        stage: "Applied",
        jobId: "",
        score: 75,
    });

    const loadData = async () => {
        const [candidateData, jobData] = await Promise.all([
            fetch("/api/candidates").then((res) => res.json()),
            fetch("/api/jobs").then((res) => res.json()),
        ]);

        setCandidates(candidateData);
        setJobs(jobData);
        if (!form.jobId && jobData.length > 0) {
            setForm((prev) => ({ ...prev, jobId: jobData[0].id }));
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredCandidates = candidates.filter((candidate) => {
        const matchesQuery =
            candidate.name.toLowerCase().includes(query.toLowerCase()) ||
            candidate.email.toLowerCase().includes(query.toLowerCase());
        const matchesStage = stageFilter === "All" || candidate.stage === stageFilter;
        return matchesQuery && matchesStage;
    });

    async function updateStage(id: string, stage: string) {
        await fetch(`/api/candidates/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage }),
        });
        loadData();
    }

    async function removeCandidate(id: string) {
        await fetch(`/api/candidates/${id}`, {
            method: "DELETE",
        });
        loadData();
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault();

        await fetch("/api/candidates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, score: Number(form.score) }),
        });

        setForm((prev) => ({ ...prev, name: "", email: "", score: 75 }));
        loadData();
    }

    return (
        <section className="stack">
            <header>
                <p className="eyebrow-light">Talent funnel management</p>
                <h2 className="title">Candidates</h2>
            </header>

            <form className="panel form-grid" onSubmit={onSubmit}>
                <input
                    placeholder="Candidate name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                />
                <input
                    type="email"
                    placeholder="Candidate email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                />
                <select
                    value={form.stage}
                    onChange={(event) => setForm((prev) => ({ ...prev, stage: event.target.value }))}
                >
                    <option>Applied</option>
                    <option>Screening</option>
                    <option>Interview</option>
                    <option>Offer</option>
                    <option>Hired</option>
                    <option>Rejected</option>
                </select>
                <select
                    value={form.jobId}
                    onChange={(event) => setForm((prev) => ({ ...prev, jobId: event.target.value }))}
                >
                    {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                            {job.title}
                        </option>
                    ))}
                </select>
                <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.score}
                    onChange={(event) => setForm((prev) => ({ ...prev, score: Number(event.target.value) }))}
                />
                <button type="submit">Add Candidate</button>
            </form>

            <section className="panel toolbar">
                <input
                    placeholder="Search by name or email"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <select
                    value={stageFilter}
                    onChange={(event) => setStageFilter(event.target.value)}
                >
                    <option>All</option>
                    <option>Applied</option>
                    <option>Screening</option>
                    <option>Interview</option>
                    <option>Offer</option>
                    <option>Hired</option>
                    <option>Rejected</option>
                </select>
            </section>

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Stage</th>
                        <th>Score</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCandidates.map((candidate) => (
                        <tr key={candidate.id}>
                            <td>{candidate.name}</td>
                            <td>{candidate.email}</td>
                            <td>
                                <select
                                    value={candidate.stage}
                                    onChange={(event) => updateStage(candidate.id, event.target.value)}
                                >
                                    <option>Applied</option>
                                    <option>Screening</option>
                                    <option>Interview</option>
                                    <option>Offer</option>
                                    <option>Hired</option>
                                    <option>Rejected</option>
                                </select>
                            </td>
                            <td>{candidate.score}</td>
                            <td>
                                <button
                                    type="button"
                                    className="danger-btn"
                                    onClick={() => removeCandidate(candidate.id)}
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}