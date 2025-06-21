import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User as UserIcon } from 'lucide-react';

type User = {
  _id: string;
  name: string;
  role: string;
  lastActive?: string; // ISO string from backend
  status?: 'online' | 'away' | 'offline';
};

const roleOptions = [
  'Admin',
  'Manager',
  'User',
  'Guest',
  'editor',
  'super-admin'
];

const statusColor = (status?: string) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'away': return 'bg-yellow-400';
    case 'offline': return 'bg-gray-400';
    default: return 'bg-gray-300';
  }
};

// Format lastActive as "5 min ago", "2 hours ago", etc.
function formatLastActive(lastActive?: string) {
  if (!lastActive) return 'Unknown';
  const last = new Date(lastActive);
  const now = new Date();
  const diff = Math.floor((now.getTime() - last.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<{ [userId: string]: string }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null); // <-- Add this

  useEffect(() => {
    axios.get('/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        setUsers(res.data);
        // Initialize selectedRoles with current roles
        const initialRoles: { [userId: string]: string } = {};
        res.data.forEach((u: User) => { initialRoles[u._id] = u.role; });
        setSelectedRoles(initialRoles);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectChange = (userId: string, newRole: string) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleRoleChange = (userId: string) => {
    const newRole = selectedRoles[userId];
    axios.put(`/api/users/${userId}/role`, { role: newRole }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      setUsers(users.map(u => u._id === userId ? res.data : u));
      setSuccessMsg('Role has been changed successfully!'); // <-- Show message
      setTimeout(() => setSuccessMsg(null), 3000); // <-- Hide after 3s
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
      {successMsg && (
        <div className="mb-4 px-4 py-2 bg-green-100 text-green-800 rounded">
          {successMsg}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {users.map(user => (
          <div key={user._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-500 capitalize">{user.role}</div>
              </div>
              <span className={`ml-auto w-3 h-3 rounded-full ${statusColor(user.status)}`} />
            </div>
            <div className="flex-1" />
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-sm text-gray-700">Change Role:</span>
              <select
                value={selectedRoles[user._id] || user.role}
                onChange={e => handleSelectChange(user._id, e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded"
              >
                {roleOptions.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <button
                className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                onClick={() => handleRoleChange(user._id)}
                disabled={selectedRoles[user._id] === user.role}
              >
                Change Role
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Last active: {formatLastActive(user.lastActive)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;