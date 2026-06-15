"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface Section {
  id: string;
  name: string;
  gradeLevel: string;
  track: string;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  gradeLevel: string;
  sectionId: string;
  section: Section;
  createdAt: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    name: "",
    email: "",
    gradeLevel: "",
    sectionId: "",
    password: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    address: "",
    guardianName: "",
    guardianPhone: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchStudents();
    fetchSections();
  }, []);

  async function fetchStudents() {
    try {
      const response = await fetch("/api/admin/students");
      if (response.ok) {
        setStudents(await response.json());
        setErrorMessage(null);
      } else {
        const errorBody = await response.json().catch(() => ({}));
        setErrorMessage(errorBody.error || "Failed to fetch students.");
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setErrorMessage("Failed to fetch students. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSections() {
    try {
      const response = await fetch("/api/admin/sections");
      if (response.ok) {
        setSections(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.gradeLevel || !formData.sectionId) {
      alert("Please fill in all fields");
      return;
    }

    if (!editingId && !formData.password) {
      alert("Password is required for new students");
      return;
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...formData, id: editingId } : formData;

      const response = await fetch("/api/admin/students", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setFormData({
          studentId: "",
          name: "",
          email: "",
          gradeLevel: "",
          sectionId: "",
          password: "",
        });
        setEditingId(null);
        setShowForm(false);
        await fetchStudents();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to save student:", error);
      alert("Failed to save student");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this student?")) return;
    try {
      const response = await fetch(`/api/admin/students?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchStudents();
      } else {
        alert("Failed to delete student");
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert("Failed to delete student");
    }
  }

  function handleEdit(student: Student) {
    setFormData({
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      gradeLevel: student.gradeLevel,
      sectionId: student.sectionId,
      password: "",
    });
    setEditingId(student.id);
    setShowForm(true);
  }

  async function handleBulkImport(e: React.FormEvent) {
    e.preventDefault();

    if (!bulkImportFile) {
      alert("Please select a CSV file");
      return;
    }

    setBulkImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", bulkImportFile);

      const response = await fetch("/api/admin/students/bulk-import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setBulkImportResult(result);
        setBulkImportFile(null);
        setTimeout(() => {
          fetchStudents();
        }, 1000);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to import students:", error);
      alert("Failed to import students");
    } finally {
      setBulkImporting(false);
    }
  }

  const filteredStudents = students.filter((student) =>
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

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
            <h1 className="text-4xl font-bold text-white mb-2">Student Management</h1>
            <p className="text-slate-400">Manage students and enroll them in sections</p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Sign Out
          </button>
        </div>

        {/* Search and Add Button */}
        <div className="flex gap-4 mb-8">
          <input
            type="text"
            placeholder="Search by Student ID, Name, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              setFormData({
                studentId: "",
                name: "",
                email: "",
                gradeLevel: "",
                sectionId: "",
                password: "",
                dateOfBirth: "",
                gender: "",
                phone: "",
                address: "",
                guardianName: "",
                guardianPhone: "",
              });
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            {showForm ? "Cancel" : "Add Student"}
          </button>
          <button
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            {showBulkImport ? "Cancel" : "Bulk Import"}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">{editingId ? "Edit Student" : "Add New Student"}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Student ID {editingId ? "*" : "(Auto-generated)"}</label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="Leave blank to auto-generate (e.g., 2026-11-001)"
                  disabled={true}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  required={editingId !== null}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Student name"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@school.edu"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Grade Level *</label>
                <select
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select grade level</option>
                  <option value="G11">Grade 11</option>
                  <option value="G12">Grade 12</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Section *</label>
                <select
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select section</option>
                  {sections
                    .filter((s) => s.gradeLevel === formData.gradeLevel)
                    .map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password {editingId ? "(leave blank to keep)" : "*"}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  required={!editingId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contact number"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Home address"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Guardian Name</label>
                <input
                  type="text"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  placeholder="Parent/Guardian name"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Guardian Phone</label>
                <input
                  type="tel"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  placeholder="Guardian contact number"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              {editingId ? "Update Student" : "Add Student"}
            </button>
          </form>
        )}

        {/* Bulk Import Section */}
        {showBulkImport && (
          <div className="mb-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Bulk Import Students</h2>
            <p className="text-slate-400 mb-6">
              Upload a CSV file with columns: name, email, grade, section
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
                  name,email,grade,section{"\n"}
                  John Doe,john@school.edu,11,ABM-ARISTOTLE{"\n"}
                  Jane Smith,jane@school.edu,12,HUMSS-AURELIUS
                </pre>
              </div>

              <button
                type="submit"
                disabled={bulkImporting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {bulkImporting ? "Importing..." : "Import Students"}
              </button>
            </form>

            {/* Import Results */}
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

                {/* Successfully Created Students */}
                {bulkImportResult.created.length > 0 && (
                  <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                    <p className="text-white font-semibold mb-3">Successfully Created Students:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {bulkImportResult.created.map((student: any, idx: number) => (
                        <div key={idx} className="text-sm text-slate-300 p-2 bg-slate-800 rounded flex justify-between items-center">
                          <span>{student.name}</span>
                          <span className="font-mono text-green-400 font-medium">{student.studentId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {bulkImportResult.errors.length > 0 && (
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

        {/* Students Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700 border-b border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Student ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Grade</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Section</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No students found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4 text-sm text-white font-medium">{student.studentId}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{student.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{student.gradeLevel}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{student.section.name}</td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-sm">Total Students</p>
            <p className="text-3xl font-bold text-white mt-2">{students.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
