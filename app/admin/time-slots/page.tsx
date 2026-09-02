"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export default function TimeSlotsPage() {
  const router = useRouter();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ day: "", startTime: "", endTime: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  async function fetchTimeSlots() {
    try {
      const response = await fetch("/api/admin/time-slots");
      if (response.ok) {
        setTimeSlots(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch time slots:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...formData, id: editingId } : formData;

      const response = await fetch("/api/admin/time-slots", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setFormData({ day: "", startTime: "", endTime: "" });
        setEditingId(null);
        setShowForm(false);
        await fetchTimeSlots();
      }
    } catch (error) {
      console.error("Failed to save time slot:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this time slot?")) return;
    try {
      const response = await fetch(`/api/admin/time-slots?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchTimeSlots();
      }
    } catch (error) {
      console.error("Failed to delete time slot:", error);
    }
  }

  function handleEdit(slot: TimeSlot) {
    setFormData({ day: slot.day, startTime: slot.startTime, endTime: slot.endTime });
    setEditingId(slot.id);
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Time Slots Management</h1>
          <p className="text-slate-400">Manage all class time slots</p>
        </div>

        {/* Add TimeSlot Button */}
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              setFormData({ day: "", startTime: "", endTime: "" });
            }
          }}
          className="mb-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          {showForm ? "Cancel" : "Add Time Slot"}
        </button>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Day</label>
                <select
                  required
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Day</option>
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Start Time (HH:MM)</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">End Time (HH:MM)</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                {editingId ? "Update Time Slot" : "Create Time Slot"}
              </button>
            </form>
          </div>
        )}

        {/* TimeSlots Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : timeSlots.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No time slots found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Day</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Start Time</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">End Time</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="px-6 py-3 text-white">{slot.day}</td>
                    <td className="px-6 py-3 text-slate-400">{slot.startTime}</td>
                    <td className="px-6 py-3 text-slate-400">{slot.endTime}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(slot)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(slot.id)}
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
