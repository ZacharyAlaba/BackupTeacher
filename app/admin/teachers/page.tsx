"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface Teacher {
  id: string;
  user: { name: string; email: string };
  createdAt: string;
}

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "",
    password: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    address: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [signupLinkCopied, setSignupLinkCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<any>(null);
  const [signupUrl, setSignupUrl] = useState("/signup");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSignupUrl(`${window.location.origin}/signup`);
    }
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      const response = await fetch("/api/admin/teachers");
      if (response.ok) {
        setTeachers(await response.json());
        setErrorMessage(null);
      } else {
        const errorBody = await response.json().catch(() => ({}));
        setErrorMessage(errorBody.error || "Failed to fetch teachers.");
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      setErrorMessage("Failed to fetch teachers. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...formData, id: editingId } : formData;
      const response = await fetch("/api/admin/teachers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        setFormData({ name: "", email: "", password: "", dateOfBirth: "", gender: "", phone: "", address: "" });
        setEditingId(null);
        setShowForm(false);
        setSuccessMessage(
          editingId
            ? "Teacher updated successfully."
            : "Teacher created successfully."
        );
        await fetchTeachers();
        window.setTimeout(() => setSuccessMessage(null), 8000);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || error.message || "Unable to save teacher."}`);
      }
    } catch (error) {
      console.error("Failed to save teacher:", error);
      alert("Failed to save teacher");
    }
  }

  function copySignupLink() {
    navigator.clipboard.writeText(signupUrl);
    setSignupLinkCopied(true);
    setTimeout(() => setSignupLinkCopied(false), 2000);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this teacher?")) return;
    try {
      const response = await fetch(`/api/admin/teachers?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchTeachers();
      }
    } catch (error) {
      console.error("Failed to delete teacher:", error);
    }
  }

  async function handleBulkImport(e: FormEvent) {
    e.preventDefault();

    if (!bulkImportFile) {
      alert("Please select a CSV file");
      return;
    }

    setBulkImporting(true);
    setBulkImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", bulkImportFile);

      const response = await fetch("/api/admin/teachers/bulk-import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setBulkImportResult(result);
        setBulkImportFile(null);
        setShowBulkImport(false);
        await fetchTeachers();
      } else {
        alert(`Error: ${result.error || "Failed to import teachers."}`);
      }
    } catch (error) {
      console.error("Failed to import teachers:", error);
      alert("Failed to import teachers");
    } finally {
      setBulkImporting(false);
    }
  }

  function handleEdit(teacher: Teacher) {
    setFormData({ name: teacher.user.name, email: teacher.user.email });
    setEditingId(teacher.id);
    setShowForm(true);
  }

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Teachers Management</h1>
            <p className="text-slate-400">View and manage all registered teachers</p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Logout
          </button>
        </div>

        {/* Info Banner - Teacher Self-Registration */}
        <div className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-3xl">👥</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">How to Add Teachers</h3>
              <p className="text-slate-300 mb-4">
                Teachers can either sign up through the signup page or be added directly from this admin panel. If you create them here, a temporary password will be generated for them.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex-1 bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-700 font-mono text-sm text-slate-300 break-all">
                  {signupUrl}
                </div>
                <button
                  onClick={copySignupLink}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold whitespace-nowrap transition"
                >
                  {signupLinkCopied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Share this link with teachers so they can create their accounts
              </p>
            </div>
          </div>
        </div>

        {/* Add / Edit Teacher Form */}
        {showForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? "Edit Teacher" : "Add Teacher"}
            </h3>
            {successMessage && (
              <div className="mb-4 rounded-lg border border-emerald-500 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {successMessage}
              </div>
            )}
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
                <label className="block text-sm text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Password {editingId ? "(leave blank to keep)" : "*"}</label>
                <input
                  type="password"
                  required={!editingId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: "", email: "", password: "", dateOfBirth: "", gender: "", phone: "", address: "" });
                    setSuccessMessage(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  {editingId ? "Update Teacher" : "Create Teacher"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Add Teacher Controls */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-2/3 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setFormData({ name: "", email: "", password: "", dateOfBirth: "", gender: "", phone: "", address: "" });
                setEditingId(null);
                setSuccessMessage(null);
                setShowForm(true);
              }}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Add Teacher
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBulkImport((current) => !current);
                setBulkImportResult(null);
                setBulkImportFile(null);
              }}
              className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              {showBulkImport ? "Cancel" : "Bulk Import"}
            </button>
          </div>
        </div>
        {showBulkImport && (
          <div className="mb-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Bulk Import Teachers</h2>
            <p className="text-slate-400 mb-6">
              Upload a CSV file with columns: name, email
            </p>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 file:bg-blue-600 file:text-white file:px-4 file:py-2 file:rounded file:border-0 file:cursor-pointer file:mr-4"
                  required
                />
              </div>

              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <p className="text-sm text-slate-300 mb-3">CSV Format Example:</p>
                <pre className="text-xs text-slate-400 overflow-x-auto">
name,email
John Doe,john@school.edu
Jane Smith,jane@school.edu
                </pre>
              </div>

              <button
                type="submit"
                disabled={bulkImporting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {bulkImporting ? "Importing..." : "Import Teachers"}
              </button>
            </form>

            {bulkImportResult && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <p className="text-green-300 text-sm font-medium">Successfully Added</p>
                    <p className="text-2xl font-bold text-green-400">{bulkImportResult.success}</p>
                  </div>
                  {bulkImportResult.failed > 0 && (
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <p className="text-red-300 text-sm font-medium">Failed</p>
                      <p className="text-2xl font-bold text-red-400">{bulkImportResult.failed}</p>
                    </div>
                  )}
                </div>

                {bulkImportResult.created?.length > 0 && (
                  <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                    <p className="text-white font-semibold mb-3">Successfully Created Teachers:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {bulkImportResult.created.map((teacher: any, idx: number) => (
                        <div key={idx} className="text-sm text-slate-300 p-2 bg-slate-800 rounded flex justify-between items-center">
                          <span>{teacher.name}</span>
                          <span className="font-mono text-green-400 font-medium">{teacher.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {bulkImportResult.errors?.length > 0 && (
                  <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                    <p className="text-red-300 font-semibold mb-3">Import Errors:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {bulkImportResult.errors.map((error: any, idx: number) => (
                        <div key={idx} className="text-sm text-red-300 p-2 bg-red-900/20 rounded">
                          <p className="font-medium">Row {error.row}: {error.name}</p>
                          <p className="text-red-400 text-xs">{error.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {successMessage && !showForm && (
          <div className="mb-6 rounded-lg border border-emerald-500 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        )}
        {/* Teachers Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {!loading && filteredTeachers.length >= 0 && (
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-900">
              <h3 className="text-lg font-bold text-white">
                Registered Teachers <span className="text-slate-400 font-normal">({filteredTeachers.length})</span>
              </h3>
            </div>
          )}
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading teachers...</div>
          ) : teachers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-white mb-2">No Teachers Yet</h3>
              <p className="text-slate-400 mb-4">
                Teachers who sign up will automatically appear here.
              </p>
              <p className="text-sm text-slate-500">
                Share the signup link above to invite teachers to register.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Created</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="px-6 py-3 text-white">{teacher.user.name}</td>
                    <td className="px-6 py-3 text-slate-400">{teacher.user.email}</td>
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(teacher.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(teacher)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
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
