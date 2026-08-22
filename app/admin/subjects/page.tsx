"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Subject {
  id: string;
  name: string;
  gradeLevel: string;
  track: string | null;
  createdAt: string;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", gradeLevel: "", track: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    try {
      const response = await fetch("/api/admin/subjects");
      if (response.ok) {
        setSubjects(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...formData, id: editingId } : formData;

      const response = await fetch("/api/admin/subjects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setFormData({ name: "", gradeLevel: "", track: "" });
        setEditingId(null);
        setShowForm(false);
        await fetchSubjects();
      }
    } catch (error) {
      console.error("Failed to save subject:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this subject?")) return;
    try {
      const response = await fetch(`/api/admin/subjects?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchSubjects();
      }
    } catch (error) {
      console.error("Failed to delete subject:", error);
    }
  }

  function handleEdit(subject: Subject) {
    setFormData({ name: subject.name, gradeLevel: subject.gradeLevel, track: subject.track || "" });
    setEditingId(subject.id);
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Subjects Management</h1>
          <p className="text-slate-400">Manage all subjects in the system</p>
        </div>

        {/* Add Subject Button */}
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              setFormData({ name: "", gradeLevel: "", track: "" });
            }
          }}
          className="mb-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          {showForm ? "Cancel" : "Add Subject"}
        </button>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Grade Level</label>
                <select
                  required
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Grade Level</option>
                  <option value="G11">Grade 11</option>
                  <option value="G12">Grade 12</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Track (Optional)</label>
                <select
                  value={formData.track}
                  onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Tracks</option>
                  <option value="ABM">ABM</option>
                  <option value="HUMSS">HUMSS</option>
                  <option value="STEM">STEM</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                {editingId ? "Update Subject" : "Create Subject"}
              </button>
            </form>
          </div>
        )}

        {/* Subjects Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : subjects.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No subjects found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Grade Level</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Track</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="px-6 py-3 text-white">{subject.name}</td>
                    <td className="px-6 py-3 text-slate-400">{subject.gradeLevel}</td>
                    <td className="px-6 py-3 text-slate-400">{subject.track || "All"}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
