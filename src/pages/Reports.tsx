import React, { useState } from "react";

type FileReport = {
  name: string;
  uploadedAt: string;
  ownerName?: string;
};

type UserReport = {
  name: string;
  email: string;
  createdAt: string;
};

const Reports = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fileReport, setFileReport] = useState<FileReport[]>([]);
  const [userReport, setUserReport] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch files
      const filesRes = await fetch(`/api/reports/files?start=${startDate}&end=${endDate}`);
      const files = await filesRes.json();
      setFileReport(files);

      // Fetch users
      const usersRes = await fetch(`/api/reports/users?start=${startDate}&end=${endDate}`);
      const users = await usersRes.json();
      setUserReport(users);
    } catch (err) {
      setFileReport([]);
      setUserReport([]);
    }
    setLoading(false);
  };

  const downloadCSV = (data: any[], filename: string) => {
    const csv =
      data.length === 0
        ? ""
        : [
            Object.keys(data[0]).join(","),
            ...data.map((row) => Object.values(row).join(",")),
          ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-700">Custom Reports</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center">
        <div>
          <label className="block text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          onClick={fetchReports}
          className="bg-blue-600 text-white px-4 py-2 rounded mt-6 md:mt-0 self-end"
          disabled={!startDate || !endDate || loading}
        >
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

      {/* Uploaded Files Report */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Uploaded Files</h3>
          <button
            onClick={() => downloadCSV(fileReport, "uploaded_files_report.csv")}
            className="bg-green-600 text-white px-3 py-1 rounded"
            disabled={fileReport.length === 0}
          >
            Download
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border px-2 py-1">File Name</th>
                <th className="border px-2 py-1">Uploaded At</th>
                <th className="border px-2 py-1">Owner</th>
              </tr>
            </thead>
            <tbody>
              {fileReport.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-2 text-gray-500">No files found.</td>
                </tr>
              ) : (
                fileReport.map((f, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{f.name}</td>
                    <td className="border px-2 py-1">{new Date(f.uploadedAt).toLocaleString()}</td>
                    <td className="border px-2 py-1">{f.ownerName || "Unknown"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Created Report */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Users Created</h3>
          <button
            onClick={() => downloadCSV(userReport, "users_created_report.csv")}
            className="bg-green-600 text-white px-3 py-1 rounded"
            disabled={userReport.length === 0}
          >
            Download
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border px-2 py-1">Name</th>
                <th className="border px-2 py-1">Email</th>
                <th className="border px-2 py-1">Created At</th>
              </tr>
            </thead>
            <tbody>
              {userReport.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-2 text-gray-500">No users found.</td>
                </tr>
              ) : (
                userReport.map((u, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{u.name}</td>
                    <td className="border px-2 py-1">{u.email}</td>
                    <td className="border px-2 py-1">{new Date(u.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;