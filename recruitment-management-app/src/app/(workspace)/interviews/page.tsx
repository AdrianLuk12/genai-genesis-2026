"use client";

import { FormEvent, useEffect, useState } from "react";

type Interview = {
    id: string;
    type: string;
    scheduledAt: string;
    interviewer: string;
    status: string;
};

type Candidate = {
    id: string;
    name: string;
    jobId: string;
};

export default function InterviewsPage() {
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [statusFilter, setStatusFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("");
    const [form, setForm] = useState({
        candidateId: "",
        jobId: "",
        type: "Phone",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        interviewer: "",
        status: "Scheduled",
    });

    const loadData = async () => {
        const [interviewData, candidateData] = await Promise.all([
            fetch("/api/interviews").then((res) => res.json()),
            fetch("/api/candidates").then((res) => res.json()),
        ]);

        setInterviews(interviewData);
        setCandidates(candidateData);

        if (!form.candidateId && candidateData.length > 0) {
            setForm((prev) => ({
                ...prev,
                candidateId: candidateData[0].id,
                jobId: candidateData[0].jobId,
            }));
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredInterviews = interviews.filter((interview) => {
        const matchesStatus = statusFilter === "All" || interview.status === statusFilter;
        const matchesDate = !dateFilter || interview.scheduledAt.startsWith(dateFilter);
        return matchesStatus && matchesDate;
    });

    async function updateStatus(id: string, status: string) {
        await fetch(`/api/interviews/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        loadData();
    }

    async function removeInterview(id: string) {
        await fetch(`/api/interviews/${id}`, {
            method: "DELETE",
        });
        loadData();
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault();

        await fetch("/api/interviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                scheduledAt: new Date(form.scheduledAt).toISOString(),
            }),
        });

        setForm((prev) => ({ ...prev, interviewer: "" }));
        loadData();
    }

    return (
        <section className="stack">
            <header>
                <p className="eyebrow-light">Coordination and interview logistics</p>
                <h2 className="title">Interviews</h2>
            </header>

            <form className="panel form-grid" onSubmit={onSubmit}>
                <select
                    value={form.candidateId}
                    onChange={(event) => {
                        const selected = candidates.find((candidate) => candidate.id === event.target.value);
                        setForm((prev) => ({
                            ...prev,
                            candidateId: event.target.value,
                            jobId: selected?.jobId ?? "",
                        }));
                    }}
                >
                    {candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                            {candidate.name}
                        </option>
                    ))}
                </select>
                <select
                    value={form.type}
                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                >
                    <option>Phone</option>
                    <option>Technical</option>
                    <option>Panel</option>
                    <option>Final</option>
                </select>
                <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                    required
                />
                <input
                    placeholder="Interviewer"
                    value={form.interviewer}
                    onChange={(event) => setForm((prev) => ({ ...prev, interviewer: event.target.value }))}
                    required
                />
                <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                    <option>Scheduled</option>
                    <option>Completed</option>
                    <option>Canceled</option>
                </select>
                <button type="submit">Schedule Interview</button>
            </form>

            <section className="panel toolbar">
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option>All</option>
                    <option>Scheduled</option>
                    <option>Completed</option>
                    <option>Canceled</option>
                </select>
                <input
                    type="date"
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                />
            </section>

            <table>
                <thead>
                    <tr>
                        <th>When</th>
                        <th>Type</th>
                        <th>Interviewer</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredInterviews.map((interview) => (
                        <tr key={interview.id}>
                            <td>{new Date(interview.scheduledAt).toLocaleString()}</td>
                            <td>{interview.type}</td>
                            <td>{interview.interviewer}</td>
                            <td>
                                <select
                                    value={interview.status}
                                    onChange={(event) => updateStatus(interview.id, event.target.value)}
                                >
                                    <option>Scheduled</option>
                                    <option>Completed</option>
                                    <option>Canceled</option>
                                </select>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="danger-btn"
                                    onClick={() => removeInterview(interview.id)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}