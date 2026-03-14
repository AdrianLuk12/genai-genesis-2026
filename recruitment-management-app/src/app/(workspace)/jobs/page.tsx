"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Job = {
    id: string;
    title: string;
    department: string;
    location: string;
    status: string;
    openings: number;
};

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [form, setForm] = useState({
        title: "",
        department: "",
        location: "",
        status: "Open",
        openings: 1,
    });

    const loadJobs = () => {
        fetch("/api/jobs")
            .then((res) => res.json())
            .then((data: Job[]) => setJobs(data));
    };

    useEffect(() => {
        loadJobs();
    }, []);

    const filteredJobs = jobs.filter((job) => {
        const matchesQuery =
            job.title.toLowerCase().includes(query.toLowerCase()) ||
            job.department.toLowerCase().includes(query.toLowerCase()) ||
            job.location.toLowerCase().includes(query.toLowerCase());

        const matchesStatus = statusFilter === "All" || job.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    async function updateStatus(id: string, status: string) {
        await fetch(`/api/jobs/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        loadJobs();
    }

    async function removeJob(id: string) {
        await fetch(`/api/jobs/${id}`, { method: "DELETE" });
        loadJobs();
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault();

        await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, openings: Number(form.openings) }),
        });

        setForm({
            title: "",
            department: "",
            location: "",
            status: "Open",
            openings: 1,
        });
        loadJobs();
    }

    return (
        <section className="stack">
            <header>
                <p className="eyebrow-light">Role planning and headcount</p>
                <h2 className="title">Jobs</h2>
            </header>

            <form onSubmit={onSubmit} className="panel form-grid">
                <input
                    placeholder="Title"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                />
                <input
                    placeholder="Department"
                    value={form.department}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, department: event.target.value }))
                    }
                    required
                />
                <input
                    placeholder="Location"
                    value={form.location}
                    onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                    required
                />
                <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                    <option>Open</option>
                    <option>Paused</option>
                    <option>Closed</option>
                </select>
                <input
                    type="number"
                    min={1}
                    value={form.openings}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, openings: Number(event.target.value) }))
                    }
                />
                <button type="submit">Create Job</button>
            </form>

            <section className="panel toolbar">
                <input
                    placeholder="Search by title, department, or location"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option>All</option>
                    <option>Open</option>
                    <option>Paused</option>
                    <option>Closed</option>
                </select>
            </section>

            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Department</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Openings</th>
                        <th>Actions</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredJobs.map((job) => (
                        <tr key={job.id}>
                            <td>{job.title}</td>
                            <td>{job.department}</td>
                            <td>{job.location}</td>
                            <td>
                                <select
                                    value={job.status}
                                    onChange={(event) => updateStatus(job.id, event.target.value)}
                                >
                                    <option>Open</option>
                                    <option>Paused</option>
                                    <option>Closed</option>
                                </select>
                            </td>
                            <td>{job.openings}</td>
                            <td>
                                <button
                                    type="button"
                                    className="danger-btn"
                                    onClick={() => removeJob(job.id)}
                                >
                                    Delete
                                </button>
                            </td>
                            <td>
                                <Link href={`/jobs/${job.id}`}>View</Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}