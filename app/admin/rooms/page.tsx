"use client";

import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface SectionOption {
  id: string;
  name: string;
  gradeLevel: string;
  track: string;
}

interface RoomItem {
  id: string;
  name: string;
  sectionId: string;
  section: SectionOption;
}

const roomNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function getGradeOrder(gradeLevel: string) {
  const normalizedGrade = gradeLevel.toUpperCase();
  if (normalizedGrade === "G11") return 0;
  if (normalizedGrade === "G12") return 1;
  return 2;
}

export default function RoomsPage() {
  const router = useRouter();
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", sectionId: "" });
  const [error, setError] = useState("");
  const sortedRooms = [...rooms].sort((first, second) =>
    getGradeOrder(first.section.gradeLevel) - getGradeOrder(second.section.gradeLevel) ||
    roomNameCollator.compare(first.name, second.name) ||
    roomNameCollator.compare(first.section.name, second.section.name)
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sectionsResponse, roomsResponse] = await Promise.all([
        fetch("/api/admin/sections", { cache: "no-store" }),
        fetch("/api/admin/rooms", { cache: "no-store" }),
      ]);

      if (!sectionsResponse.ok || !roomsResponse.ok) {
        throw new Error("Failed to load rooms or sections.");
      }

      const [loadedSections, loadedRooms] = await Promise.all([
        sectionsResponse.json(),
        roomsResponse.json(),
      ]);
      setSections(loadedSections);
      setRooms(loadedRooms);
    } catch (loadError) {
      console.error("Failed to load rooms:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function startAddRoom() {
    setError("");
    setEditingId(null);
    setFormData({ name: "", sectionId: sections[0]?.id || "" });
    setShowForm(true);
  }

  function startEditRoom(room: RoomItem) {
    setError("");
    setEditingId(room.id);
    setFormData({ name: room.name, sectionId: room.sectionId });
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/admin/rooms", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: editingId }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to save room.");
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", sectionId: "" });
      await loadData();
    } catch (saveError) {
      console.error("Failed to save room:", saveError);
      setError("Failed to save room.");
    }
  }

  async function handleDelete(room: RoomItem) {
    if (!confirm(`Delete ${room.name} from ${room.section.name}? Existing assignments using it will become unassigned.`)) return;

    try {
      const response = await fetch(`/api/admin/rooms?id=${encodeURIComponent(room.id)}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        setError(result.error || "Failed to delete room.");
        return;
      }
      await loadData();
    } catch (deleteError) {
      console.error("Failed to delete room:", deleteError);
      setError("Failed to delete room.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white">Rooms</h1>
        <p className="mt-1 text-sm text-slate-400">Manage rooms available to each section.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{rooms.length} rooms across {sections.length} sections</p>
        <button
          type="button"
          onClick={startAddRoom}
          disabled={sections.length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Room
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-500/30 bg-rose-900/20 p-3 text-sm text-rose-200">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 grid gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <div>
            <label htmlFor="room-name" className="mb-1 block text-sm text-slate-300">Room name</label>
            <input
              id="room-name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. SHS-201"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-400">G11: SHS-101–SHS-116 · G12: SHS-201–SHS-214</p>
          </div>
          <div>
            <label htmlFor="room-section" className="mb-1 block text-sm text-slate-300">Section</label>
            <select
              id="room-section"
              value={formData.sectionId}
              onChange={(event) => setFormData((current) => ({ ...current, sectionId: event.target.value }))}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white outline-none focus:border-indigo-500"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>{section.name} · {section.gradeLevel}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            {editingId ? "Save Room" : "Add Room"}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
        {loading ? (
          <p className="p-8 text-center text-slate-400">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p className="p-8 text-center text-slate-400">No rooms yet. Add a room and assign it to a section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-sm text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 font-semibold">Grade</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedRooms.map((room, index) => (
                  <Fragment key={room.id}>
                    {(index === 0 || room.section.gradeLevel !== sortedRooms[index - 1].section.gradeLevel) && (
                      <tr className="bg-slate-900/70 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                        <td colSpan={4} className="px-4 py-2">{room.section.gradeLevel} rooms</td>
                      </tr>
                    )}
                    <tr className="text-sm text-slate-200 transition-colors hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-medium">{room.name}</td>
                      <td className="px-4 py-3">{room.section.name}</td>
                      <td className="px-4 py-3 text-slate-400">{room.section.gradeLevel}</td>
                      <td className="space-x-2 px-4 py-3 text-right">
                        <button type="button" onClick={() => startEditRoom(room)} className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500">Edit</button>
                        <button type="button" onClick={() => handleDelete(room)} className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500">Delete</button>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}