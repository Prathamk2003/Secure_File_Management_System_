import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Users, 
  Activity, 
  Bell, 
  BarChart3, 
  Upload, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  X,
  Menu,
  Home,
  LucideIcon,
  Info,
  Minimize,
  Maximize,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import Reports from '../pages/Reports';
import SettingsPage from '../pages/SettingsPage';
import * as XLSX from "xlsx";
import { useTheme } from '../context/ThemeContext';

interface AppFile {
  id: number;
  name: string;
  type: string;
  size: string;
  modified: string;
  owner: string;
  status: 'secure' | 'shared' | 'restricted';
  downloads: number;
  category: string;
  encrypted: boolean;
  title?: string;
  description?: string;
  originalName?: string;
  ownerName?: string; // <-- Add this line
}

interface AuditLog {
  _id: string; // <-- change from id: number
  action: string;
  file: string;
  user: string;
  timestamp: string;
  ip: string;
  status: 'success' | 'failed';
}

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  change?: string;
  color: string;
}

interface ExcelSheet {
  [key: string]: any[][];
}

interface ExcelData {
  type: 'excel';
  sheets: ExcelSheet;
  sheetNames: string[];
}

interface AppUser {
  _id: string;
  name: string;
  // add other fields if needed
}

function SecureFileManager() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const navigate = useNavigate();
  const { logout, notifications, userId, unreadNotificationCount } = useAuth();
  const [loggedInUserName, setLoggedInUserName] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewModalContent, setViewModalContent] = useState<string | ExcelData | null>(null);
  const [viewModalFileType, setViewModalFileType] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalContent, setEditModalContent] = useState<string | ExcelData | null>(null);
  const [editingFile, setEditingFile] = useState<AppFile | null>(null);
  const [showMfaSetupModal, setShowMfaSetupModal] = useState(false);
  const [mfaQrCodeUrl, setMfaQrCodeUrl] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFileInfoModal, setShowFileInfoModal] = useState(false);
  const [fileInfoContent, setFileInfoContent] = useState<{ title: string, description: string } | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<AppFile | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Mock data
  const [files, setFiles] = useState<AppFile[]>([]);
  const [selectedFileType, setSelectedFileType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [users, setUsers] = useState<AppUser[]>([]);

  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState({
    totalFiles: 0,
    activeUsers: 0,
    fileAccess: 0,
    securityScore: 100
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [fileHistory, setFileHistory] = useState<any[]>([]);
  const [historyFile, setHistoryFile] = useState<AppFile | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);

  const { isDarkMode } = useTheme();

  const handleInfoClick = (file: AppFile) => {
    setFileInfoContent({ title: file.title || file.name, description: file.description || 'No description provided' });
    setShowFileInfoModal(true);
  };

  const fetchFiles = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/files');
      if (response.ok) {
        const data: AppFile[] = await response.json();
        setFiles(data);
      }
    } catch (error) {
      // Handle error
    }
  };

  useEffect(() => {
    fetchFiles();

    // Fetch dashboard stats
    fetch('http://localhost:5000/api/dashboard-stats')
      .then(res => res.json())
      .then(setDashboardStats);

    // Fetch audit logs
    fetch('http://localhost:5000/api/audit-logs')
      .then(res => res.json())
      .then(setAuditLogs);

    // Fetch users (all users, for management purposes)
    fetch('http://localhost:5000/api/users')
      .then(res => res.json())
      .then(setUsers);

    // Fetch logged-in user's name
    const fetchLoggedInUserName = async () => {
      if (userId) {
        try {
          const response = await fetch(`/api/users/${userId}`);
          if (response.ok) {
            const data = await response.json();
            setLoggedInUserName(data.name); // Assuming the backend returns { name: "User Name" }
          } else {
            console.error('Failed to fetch logged-in user name');
          }
        } catch (error) {
          console.error('Error fetching logged-in user name:', error);
        }
      }
    };
    fetchLoggedInUserName();

    // Fetch security alerts
    fetch('http://localhost:5000/api/security-alerts')
      .then(res => res.json())
      .then(setSecurityAlerts);

    const handlePopState = () => {
      // Always redirect to dashboard on back
      navigate('/dashboard', { replace: true });
      setActiveTab('dashboard');
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  const handleFileSelect = (fileId: number) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const filteredFiles = files
    .filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.modified).getTime();
      const dateB = new Date(b.modified).getTime();
      return dateA - dateB;
    })
    .filter(file => {
      const typeMatch = selectedFileType === '' || file.type.toLowerCase() === selectedFileType.toLowerCase();
      const statusMatch = selectedStatus === '' || file.status.toLowerCase() === selectedStatus.toLowerCase();
      return typeMatch && statusMatch;
    })
    .slice((currentPage - 1) * selectedRange, currentPage * selectedRange);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) {
        // Toggle direction
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedFiles = React.useMemo(() => {
    let sortableFiles = [...filteredFiles];
    if (sortConfig) {
      sortableFiles.sort((a, b) => {
        if (sortConfig.key === 'size') {
          // Parse size as float
          const sizeA = parseFloat(a.size);
          const sizeB = parseFloat(b.size);
          return sortConfig.direction === 'asc' ? sizeA - sizeB : sizeB - sizeA;
        }
        if (sortConfig.key === 'modified') {
          const dateA = new Date(a.modified).getTime();
          const dateB = new Date(b.modified).getTime();
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
    }
    return sortableFiles;
  }, [filteredFiles, sortConfig]);

  const getStatusColor = (status: 'secure' | 'shared' | 'restricted'): string => {
    switch (status) {
      case 'secure': return 'text-green-500 bg-green-50';
      case 'shared': return 'text-blue-500 bg-blue-50';
      case 'restricted': return 'text-red-500 bg-red-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, change, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FileText}
          title="Total Files"
          value={dashboardStats.totalFiles.toLocaleString()}
          change=""
          color="bg-blue-500"
        />
        <StatCard
          icon={Users}
          title="Active Users"
          value={dashboardStats.activeUsers.toLocaleString()}
          change=""
          color="bg-green-500"
        />
        <StatCard
          icon={Shield}
          title="Security Score"
          value={dashboardStats.securityScore + '%'}
          change=""
          color="bg-purple-500"
        />
        <StatCard
          icon={Activity}
          title="File Access"
          value={dashboardStats.fileAccess.toLocaleString()}
          change=""
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <p className="text-xs text-gray-500">{log.user} • {new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Alerts</h3>
          <div className="space-y-4">
            {securityAlerts.length === 0 && (
              <div className="text-gray-500 text-sm">No security alerts.</div>
            )}
            {securityAlerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-3 p-3 rounded-lg border
                  ${alert.type === 'failed_login' ? 'bg-red-50 border-red-200' : ''}
                  ${alert.type === 'file_access_outside_hours' ? 'bg-yellow-50 border-yellow-200' : ''}
                  ${alert.type === 'backup_completed' ? 'bg-green-50 border-green-200' : ''}
                `}
              >
                {alert.type === 'failed_login' && <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />}
                {alert.type === 'file_access_outside_hours' && <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />}
                {alert.type === 'backup_completed' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                <div>
                  <p className={`text-sm font-medium ${
                    alert.type === 'failed_login' ? 'text-red-900' :
                    alert.type === 'file_access_outside_hours' ? 'text-yellow-900' :
                    'text-green-900'
                  }`}>
                    {alert.title}
                  </p>
                  <p className={`text-xs ${
                    alert.type === 'failed_login' ? 'text-red-700' :
                    alert.type === 'file_access_outside_hours' ? 'text-yellow-700' :
                    'text-green-700'
                  }`}>
                    {alert.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFiles = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">File Management</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Files</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedRange}
              onChange={(e) => {
                setSelectedRange(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>Last 10 files</option>
              <option value={25}>Last 25 files</option>
              <option value={50}>Last 50 files</option>
              <option value={100}>Last 100 files</option>
              <option value={Infinity}>All files</option>
            </select>
            <button 
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => setShowFilterModal(true)}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                <th
                  className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer select-none"
                  onDoubleClick={() => handleSort('size')}
                  title="Double click to sort by Size"
                >
                  Size
                  {sortConfig?.key === 'size' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th
                  className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer select-none"
                  onDoubleClick={() => handleSort('modified')}
                  title="Double click to sort by Modified"
                >
                  Modified
                  {sortConfig?.key === 'modified' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Owner</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file) => (
                <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input 
                      type="checkbox" 
                      className="rounded"
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => handleFileSelect(file.id)}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-gray-900">{file.title || extractFileName(file.name)}</p>
                        <p className="text-sm text-gray-500">{file.originalName ? extractFileName(file.originalName) : extractFileName(file.name)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{file.type}</td>
                  <td className="py-3 px-4 text-gray-700">{file.size}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {file.modified ? new Date(file.modified).toLocaleString() : 'Unknown'}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{file.ownerName || file.owner}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.status)}`}>
                      {file.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        className="p-1 text-gray-400 hover:text-blue-600"
                        onClick={async () => {
                          const viewUrl = `http://localhost:5000/api/view/${encodeURIComponent(file.name)}`;
                          try {
                            const response = await fetch(viewUrl);
                            if (response.ok) {
                              const fileType = file.type.toLowerCase();
                              if (fileType === 'txt' || fileType === 'json' || fileType === 'xml' || fileType === 'html' || fileType === 'csv') {
                                const content = await response.text();
                                setViewModalContent(content);
                                setViewModalFileType('text');
                              } else if (fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg' || fileType === 'gif') {
                                setViewModalContent(viewUrl);
                                setViewModalFileType('image');
                              } else if (fileType === 'pdf') {
                                window.open(viewUrl, '_blank');
                                return;
                              } else if (fileType === 'xlsx' || fileType === 'xls') {
                                const contentType = response.headers.get('Content-Type');
                                if (contentType && contentType.includes('application/json')) {
                                  const content = await response.json();
                                  setViewModalContent(content);
                                  setViewModalFileType('excel');
                                } else {
                                  alert('File could not be viewed as Excel. The file may be corrupted or not a valid Excel file.');
                                  return;
                                }
                              } else if (fileType === 'csv') {
                                const contentType = response.headers.get('Content-Type');
                                if (contentType && contentType.includes('application/json')) {
                                  const content = await response.json();
                                  setViewModalContent(content);
                                  setViewModalFileType('csv');
                                } else {
                                  alert('File could not be viewed as CSV. The file may be corrupted or not a valid CSV file.');
                                  return;
                                }
                              } else if (fileType === 'pptx') {
                                const contentType = response.headers.get('Content-Type');
                                if (contentType && contentType.includes('application/json')) {
                                  const content = await response.json();
                                  setViewModalContent(content);
                                  setViewModalFileType('pptx');
                                } else {
                                  alert('File could not be viewed as PPTX. The file may be corrupted or not a valid PPTX file.');
                                  return;
                                }
                              } else if (fileType === 'docx') {
                                const contentType = response.headers.get('Content-Type');
                                if (contentType && contentType.includes('application/json')) {
                                  const content = await response.json();
                                  setViewModalContent(content);
                                  setViewModalFileType('docx');
                                } else {
                                  alert('File could not be viewed as DOCX. The file may be corrupted or not a valid DOCX file.');
                                  return;
                                }
                              } else if (fileType === 'zip') {
                                const contentType = response.headers.get('Content-Type');
                                if (contentType && contentType.includes('application/json')) {
                                  const content = await response.json();
                                  setViewModalContent(content);
                                  setViewModalFileType('zip');
                                } else {
                                  alert('File could not be viewed as ZIP. The file may be corrupted or not a valid ZIP file.');
                                  return;
                                }
                              } else {
                                alert(`Viewing ${file.type} files is not supported yet.`);
                                return;
                              }
                              setShowViewModal(true);
                            } else {
                              alert(`Failed to load file content: ${response.status}`);
                              console.error(`Failed to load file content for ${file.name}:`, response.status);
                            }
                          } catch (error) {
                            console.error(`Error viewing file ${file.name}:`, error);
                            alert(`An error occurred while viewing ${file.name}.`);
                          }
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-1 text-gray-400 hover:text-green-600"
                        onClick={() => {
                          const downloadUrl = `http://localhost:5000/api/files/${encodeURIComponent(file.name)}`;
                          const link = document.createElement('a');
                          link.href = downloadUrl;
                          link.setAttribute('download', file.name);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-1 text-gray-400 hover:text-orange-600"
                        onClick={async () => {
                          const fileType = file.type.toLowerCase();
                          const viewUrl = `http://localhost:5000/api/view/${encodeURIComponent(file.name)}`;

                          if (fileType === 'xlsx' || fileType === 'xls') {
                            try {
                              const response = await fetch(viewUrl);
                              if (response.ok) {
                                const content = await response.json();
                                setEditingFile(file);
                                setEditModalContent(content);
                                setShowEditModal(true);
                              } else {
                                alert(`Failed to load file content for editing: ${response.status}`);
                                console.error(`Failed to load file content for editing ${file.name}:`, response.status);
                              }
                            } catch (error) {
                              console.error(`Error fetching file content for editing ${file.name}:`, error);
                              alert(`An error occurred while preparing ${file.name} for editing.`);
                            }
                            return;
                          }

                          const textFileTypes = ['txt', 'json', 'xml', 'html', 'csv', 'docx'];
                          if (!textFileTypes.includes(fileType)) {
                            alert(`Editing ${file.type} files is not supported yet.`);
                            return;
                          }

                          try {
                            const response = await fetch(viewUrl);
                            if (response.ok) {
                              const content = await response.text();
                              setEditingFile(file);
                              setEditModalContent(content);
                              setShowEditModal(true);
                            } else {
                              alert(`Failed to load file content for editing: ${response.status}`);
                              console.error(`Failed to load file content for editing ${file.name}:`, response.status);
                            }
                          } catch (error) {
                            console.error(`Error fetching file content for editing ${file.name}:`, error);
                            alert(`An error occurred while preparing ${file.name} for editing.`);
                          }
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-1 text-gray-400 hover:text-red-600"
                        onClick={async () => {
                          setFileToDelete(file);
                          setShowDeleteConfirmModal(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-blue-600"
                        onClick={() => handleInfoClick(file)}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-purple-600" onClick={() => handleShowHistory(file)}>
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* File count message */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredFiles.length} out of {files.length} files
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex justify-end items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-gray-700">
            Page {currentPage} of {Math.ceil(files.length / selectedRange)}
          </span>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage * selectedRange >= files.length}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  // Helper to extract file name (removes leading numbers and dash/underscore)
  function extractFileName(file: string) {
    // Remove leading numbers and dash/underscore, then remove everything before the last dash/underscore
    // Example: "1749108730294-Batch 2022.zip" => "Batch 2022.zip"
    return file.replace(/^[^_-]+[-_]/, '');
  }

  // Helper to get user name (replace with actual logic if needed)
  function getUserName(userId: string) {
    const user = users.find(u => u._id === userId);
    return user ? user.name : userId;
  }

  const handleExportExcel = () => {
    // Prepare data for Excel (matching visible table)
    const data = auditLogs.map(row => ({
      Timestamp: new Date(row.timestamp).toLocaleString(), // formatted timestamp
      Action: row.action, // you can't bold in Excel easily, but keep the text
      User: getUserName(row.user),
      File: extractFileName(row.file),
      Status: row.status,
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Optionally, set column widths for better readability
    const wscols = [
      { wch: 22 }, // Timestamp
      { wch: 18 }, // Action
      { wch: 28 }, // User
      { wch: 32 }, // File
      { wch: 12 }, // Status
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Trail");

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, "Audit_Trail_Report.xlsx");
  };

  const renderAudit = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <button 
          onClick={() => setShowExportConfirm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Export Report
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Timestamp</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Action</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">File</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{log.action}</td>
                  <td className="py-3 px-4 text-gray-700">{getUserName(log.user)}</td>
                  <td className="py-3 px-4 text-gray-700">{extractFileName(log.file)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      log.status === 'success' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const UploadModal: React.FC<{ onUploadSuccess: () => void }> = ({ onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileTitle, setFileTitle] = useState('');
    const [fileDescription, setFileDescription] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setUploadError(null);
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        setSelectedFile(file);
      }
    };

    const handleUpload = async () => {
      if (!selectedFile) {
        setUploadError('Please select a file to upload.');
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', fileTitle);
      formData.append('description', fileDescription);
      if (selectedFile) {
        formData.append('originalName', selectedFile.name);
      }
      if (userId) {
        formData.append('userId', userId);
      }

      try {
        const response = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setSuccessMessage('File uploaded successfully!');
          setShowSuccessModal(true);
          setShowUploadModal(false);
          setSelectedFile(null);
          onUploadSuccess();
        } else {
          const errorText = await response.text();
          setUploadError(`File upload failed: ${errorText}`);
          console.error('File upload failed:', response.status, errorText);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadError('An error occurred during file upload.');
      }
    };

    if (!showUploadModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Upload File</h3>
            <button onClick={() => setShowUploadModal(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="fileTitle" className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                id="fileTitle"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="fileDescription" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="fileDescription"
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop files here</p>
            <p className="text-sm text-gray-500">or click to browse</p>
            <input 
              type="file" 
              onChange={handleFileChange} 
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Supported file types information */}
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Supported file types:</p>
            <p className="text-sm text-gray-600">
              PDF (.pdf), Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Text (.txt), JPG/JPEG (.jpg, .jpeg), PNG (.png), ZIP (.zip), DWG (.dwg), Scanned docs, Patents.
            </p>
          </div>

          {uploadError && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {uploadError}
            </div>
          )}

          <div className="mt-4 flex justify-end space-x-3">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ViewModal: React.FC = () => {
    const [activeSheet, setActiveSheet] = useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
      if (viewModalFileType === 'excel' && viewModalContent && typeof viewModalContent === 'object') {
        const excelContent = viewModalContent as ExcelData;
        setActiveSheet(excelContent.sheetNames[0]);
      }
      // eslint-disable-next-line
    }, []);

    if (!showViewModal) return null;

    const renderContent = () => {
      if (viewModalFileType === 'text' && typeof viewModalContent === 'string') {
        return <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">{viewModalContent}</pre>;
      }
      if (viewModalFileType === 'image' && typeof viewModalContent === 'string') {
        return <img src={viewModalContent} alt="File content" className="max-w-full max-h-full mx-auto" />;
      }
      if (viewModalFileType === 'excel' && activeSheet) {
        const excelData = viewModalContent as ExcelData;
        const sheetData = excelData.sheets[activeSheet] || [];

        return (
          <div className="space-y-4">
            <div className="flex space-x-2">
              {excelData.sheetNames.map((sheetName: string) => (
                <button
                  key={sheetName}
                  onClick={() => setActiveSheet(sheetName)}
                  className={`px-3 py-1 rounded ${
                    activeSheet === sheetName
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {sheetName}
                </button>
              ))}
            </div>
            <div className="overflow-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <tbody>
                  {sheetData.map((row: any[], rowIndex: number) => (
                    <tr key={rowIndex}>
                      {row.map((cell: any, cellIndex: number) => (
                        <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      if (viewModalFileType === 'csv' && viewModalContent && typeof viewModalContent === 'object' && 'data' in viewModalContent) {
        const csvData = viewModalContent.data as string[][];
        return (
          <div className="overflow-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <tbody>
                {csvData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-gray-300 px-4 py-2">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      if (viewModalFileType === 'pptx' && viewModalContent && typeof viewModalContent === 'object' && 'slides' in viewModalContent) {
        const slides = viewModalContent.slides as any[];
        return (
          <div className="space-y-6">
            {slides.map((slide, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-white shadow">
                <h4 className="font-semibold mb-2">Slide {idx + 1}</h4>
                <div className="text-gray-800 whitespace-pre-line">
                  {slide.text ? slide.text : JSON.stringify(slide)}
                </div>
              </div>
            ))}
          </div>
        );
      }
      if (viewModalFileType === 'docx' && viewModalContent && typeof viewModalContent === 'object' && 'text' in viewModalContent) {
        return (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">{(viewModalContent.text as string)}</pre>
        );
      }
      if (viewModalFileType === 'zip' && viewModalContent && typeof viewModalContent === 'object' && 'files' in viewModalContent) {
        const zipFiles = viewModalContent.files as { name: string, isDirectory: boolean }[];
        return (
          <div className="space-y-2">
            <p className="font-semibold">Contents:</p>
            <ul className="list-disc list-inside ml-4">
              {zipFiles.map((file, index) => (
                <li key={index} className="text-sm text-gray-800">
                  {file.name}{file.isDirectory ? '/' : ''}
                </li>
              ))}
            </ul>
          </div>
        );
      }
      return <p className="text-gray-500 text-center">Loading file content...</p>;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`bg-white rounded-lg p-6 w-full overflow-hidden flex flex-col ${isFullScreen ? 'max-w-full max-h-full rounded-none p-4' : 'max-w-4xl max-h-[90vh]'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">View File</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
              <button onClick={() => setShowViewModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
            {renderContent()}
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setShowViewModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EditModal: React.FC = () => {
    const [content, setContent] = useState<string | null>(null);
    const [activeSheet, setActiveSheet] = useState<string | null>(null);
    const [editedData, setEditedData] = useState<ExcelData | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
      if (editingFile?.type.toLowerCase() === 'xlsx' && editModalContent && typeof editModalContent === 'object' && 'sheetNames' in editModalContent) {
        setActiveSheet(editModalContent.sheetNames[0]);
        setEditedData(editModalContent);
      } else if (editingFile?.type.toLowerCase() === 'docx' && editModalContent && typeof editModalContent === 'object' && 'text' in editModalContent) {
        setContent(editModalContent.text as string);
      } else if (typeof editModalContent === 'string') {
        setContent(editModalContent);
      }
      // eslint-disable-next-line
    }, []);

    const handleCellChange = (rowIndex: number, cellIndex: number, value: string) => {
      if (!editedData || !activeSheet) return;

      const newData = { ...editedData };
      if (!newData.sheets[activeSheet]) {
        newData.sheets[activeSheet] = [];
      }
      if (!newData.sheets[activeSheet][rowIndex]) {
        newData.sheets[activeSheet][rowIndex] = [];
      }
      newData.sheets[activeSheet][rowIndex][cellIndex] = value;
      setEditedData(newData);
    };

    const handleSave = async () => {
      if (!editingFile) return;

      const fileType = editingFile.type.toLowerCase();
      const saveUrl = `http://localhost:5000/api/files/${encodeURIComponent(editingFile.name)}`;

      try {
        let response;
        if (fileType === 'xlsx' && editedData && activeSheet) {
          response = await fetch(saveUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sheetName: activeSheet,
              data: editedData.sheets[activeSheet]
            }),
          });
        } else if (content !== null) {
          if (fileType === 'docx') {
            response = await fetch(saveUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'text/plain',
              },
              body: content,
            });
          } else {
            response = await fetch(saveUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'text/plain',
              },
              body: content,
            });
          }
        } else {
          throw new Error('No content to save');
        }

        if (response.ok) {
          alert(`${editingFile.name} saved successfully.`);
          setShowEditModal(false);
          setEditingFile(null);
          setEditModalContent(null);
          fetchFiles();
        } else {
          const errorText = await response.text();
          alert(`Failed to save ${editingFile.name}: ${errorText}`);
          console.error(`Failed to save ${editingFile.name}:`, response.status, errorText);
        }
      } catch (error) {
        console.error(`Error saving file ${editingFile.name}:`, error);
        alert(`An error occurred while saving ${editingFile.name}.`);
      }
    };

    if (!showEditModal || !editingFile) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`bg-white rounded-lg p-6 w-full overflow-hidden flex flex-col ${isFullScreen ? 'max-w-full max-h-full rounded-none p-4' : 'max-w-4xl max-h-[90vh]'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Edit {editingFile.name}</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
              <button onClick={() => setShowEditModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
            {editingFile.type.toLowerCase() === 'xlsx' && editedData && (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  {editedData.sheetNames.map((sheetName: string) => (
                    <button
                      key={sheetName}
                      onClick={() => setActiveSheet(sheetName)}
                      className={`px-3 py-1 rounded ${
                        activeSheet === sheetName
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {sheetName}
                    </button>
                  ))}
                </div>
                {activeSheet && (
                  <div className="overflow-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <tbody>
                        {editedData.sheets[activeSheet].map((row: any[], rowIndex: number) => (
                          <tr key={rowIndex}>
                            {row.map((cell: any, cellIndex: number) => (
                              <td key={cellIndex} className="border border-gray-300 p-0">
                                <input
                                  type="text"
                                  value={cell || ''}
                                  onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
                                  className="w-full px-4 py-2 border-0 focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {editingFile.type.toLowerCase() === 'docx' && typeof content === 'string' && (
              <textarea 
                className="w-full h-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
              ></textarea>
            )}
            {editingFile && !['xlsx', 'docx'].includes(editingFile.type.toLowerCase()) && (typeof content === 'string' || content === null) && (
              <textarea 
                className="w-full h-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={content || ''}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
              ></textarea>
            )}
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button 
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  const MfaSetupModal = () => {
    const handleGenerateMfa = async () => {
      if (!userId) {
        alert('User not authenticated. Please log in.');
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/mfa/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: userId }),
        });

        if (response.ok) {
          const data = await response.json();
          setMfaQrCodeUrl(data.qrCodeUrl);
          setMfaSecret(data.secret);
        } else {
          const errorText = await response.text();
          alert(`Failed to generate MFA secret: ${errorText}`);
          console.error('Failed to generate MFA secret:', response.status, errorText);
        }
      } catch (error) {
        console.error('Error generating MFA secret:', error);
        alert('An error occurred during MFA setup.');
      }
    };

    if (!showMfaSetupModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Setup Multi-Factor Authentication</h3>
            <button onClick={() => setShowMfaSetupModal(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4 text-center">
            {mfaQrCodeUrl ? (
              <div className="flex flex-col items-center">
                <p className="text-gray-700 mb-2">Scan this QR code with your authenticator app:</p>
                <img src={mfaQrCodeUrl} alt="MFA QR Code" className="w-48 h-48 border p-2 rounded" />
                <p className="text-gray-700 mt-4">Or manually enter the code:</p>
                <p className="font-mono text-lg text-gray-900 break-all">{mfaSecret}</p>
                <p className="text-sm text-gray-600 mt-2">After scanning, enter a code from the app during login.</p>
              </div>
            ) : (
              <>
                <p className="text-gray-700">Click the button below to generate your MFA secret and QR code.</p>
                <button 
                  onClick={handleGenerateMfa}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Generate MFA QR Code
                </button>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setShowMfaSetupModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FilterModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const handleApplyFilters = () => {
      // Filtering is already handled by the filteredFiles logic
      onClose();
    };

    const handleClearFilters = () => {
      setSelectedFileType('');
      setSelectedStatus('');
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filter Files</h3>
            <button onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="fileTypeFilter" className="block text-sm font-medium text-gray-700">File Type</label>
              <select
                id="fileTypeFilter"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="pdf">PDF</option>
                <option value="doc">Word (.doc)</option>
                <option value="docx">Word (.docx)</option>
                <option value="xls">Excel (.xls)</option>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="ppt">PowerPoint (.ppt)</option>
                <option value="pptx">PowerPoint (.pptx)</option>
                <option value="txt">Text</option>
                <option value="csv">CSV (.csv)</option>
                <option value="jpg">JPG</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="zip">ZIP</option>
                <option value="dwg">DWG</option>
              </select>
            </div>
            <div>
              <label htmlFor="fileStatusFilter" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="fileStatusFilter"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="secure">Secure</option>
                <option value="shared">Shared</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Clear Filters
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FileInfoModal: React.FC<{ onClose: () => void, fileInfo: { title: string, description: string } | null }> = ({ onClose, fileInfo }) => {
    if (!fileInfo) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">File Info</h3>
            <button onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="fileInfoTitle" className="block text-sm font-medium text-gray-700">Title</label>
              <input
                id="fileInfoTitle"
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={fileInfo.title}
                readOnly
              />
            </div>
            <div>
              <label htmlFor="fileInfoDescription" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="fileInfoDescription"
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={fileInfo.description}
                readOnly
              ></textarea>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteConfirmModal: React.FC<{ onClose: () => void, fileToDelete: AppFile | null, fetchFiles: () => void }> = ({ onClose, fileToDelete, fetchFiles }) => {
    const handleDelete = async () => {
      if (!fileToDelete) return;

      try {
        const response = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(fileToDelete.name)}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSuccessMessage(`${fileToDelete.name} deleted successfully.`);
          setShowSuccessModal(true);
          fetchFiles();
          onClose();
        } else {
          const errorText = await response.text();
          alert(`Failed to delete ${fileToDelete.name}: ${errorText}`);
          console.error(`Failed to delete ${fileToDelete.name}:`, response.status, errorText);
        }
      } catch (error) {
        console.error(`Error deleting file ${fileToDelete.name}:`, error);
        alert(`An error occurred while deleting ${fileToDelete.name}.`);
      }
    };

    if (!fileToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Confirm Deletion</h3>
            <button onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700">Are you sure you want to delete <span className="font-medium">{fileToDelete.name}</span>?</p>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              No, Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SuccessMessageModal: React.FC<{ message: string, onClose: () => void }> = ({ message, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Success</h3>
          <p className="text-gray-700 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </div>
    );
  };

  const handleShowHistory = async (file: AppFile) => {
    const res = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(file.name)}/versions`);
    const versions = await res.json();
    setFileHistory(versions);
    setHistoryFile(file);
    setShowHistoryModal(true);
  };

  // Add state for export confirmation modal
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  // Export confirmation modal
  const ExportConfirmModal: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
        <h3 className="text-lg font-semibold text-blue-700 mb-4">Export Audit Report</h3>
        <p className="text-gray-700 mb-6">Do you want to download the audit trail report as <b>Excel</b>?</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );

  const handleRefresh = () => {
    switch (activeTab) {
      case 'dashboard':
        fetch('http://localhost:5000/api/dashboard-stats')
          .then(res => res.json())
          .then(setDashboardStats);
        fetch('http://localhost:5000/api/audit-logs')
          .then(res => res.json())
          .then(setAuditLogs);
        fetch('http://localhost:5000/api/security-alerts')
          .then(res => res.json())
          .then(setSecurityAlerts);
        break;
      case 'files':
        fetchFiles();
        break;
      case 'users':
        fetch('http://localhost:5000/api/users')
          .then(res => res.json())
          .then(setUsers);
        break;
      case 'audit':
        fetch('http://localhost:5000/api/audit-logs')
          .then(res => res.json())
          .then(setAuditLogs);
        break;
      case 'reports':
        // If you have a fetchReports function, call it here
        break;
      case 'settings':
        // If you have a fetchSettings function, call it here
        break;
      default:
        break;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg transition-all duration-300 flex flex-col`}>
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>SecureVault</h1>}
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'files', label: 'Files', icon: FileText },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'audit', label: 'Audit Trail', icon: Activity },
              { id: 'reports', label: 'Reports', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? `${isDarkMode ? 'bg-blue-900 text-blue-200 border-r-2 border-blue-500' : 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'}`
                    : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50'}`
                }`}
              >
                <item.icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Add Refresh Button */}
              <button
                onClick={handleRefresh}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                title="Refresh"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} capitalize`}>
                {activeTab === 'dashboard' ? `Welcome ${loggedInUserName}` : activeTab}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              {/* Real-time notifications */}
              <div className="relative">
                <Bell
                  className={`w-6 h-6 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} cursor-pointer`}
                  onClick={() => navigate('/notifications')}
                />
                {unreadNotificationCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">{unreadNotificationCount}</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <div 
                  className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  <User className="w-5 h-5 text-white" />
                </div>
                {showUserDropdown && (
                  <div className={`absolute right-0 mt-2 w-48 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-md shadow-lg py-1 z-50`}>
                    <button 
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      Logout
                    </button>
                    <button 
                      onClick={() => setShowMfaSetupModal(true)}
                      className={`w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      Setup MFA
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 p-6 overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'files' && renderFiles()}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'audit' && renderAudit()}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      <UploadModal onUploadSuccess={fetchFiles} />
      <ViewModal />
      <EditModal />
      <MfaSetupModal />
      {showFilterModal && <FilterModal onClose={() => setShowFilterModal(false)} />}
      {showFileInfoModal && <FileInfoModal onClose={() => setShowFileInfoModal(false)} fileInfo={fileInfoContent} />}
      {showDeleteConfirmModal && <DeleteConfirmModal onClose={() => setShowDeleteConfirmModal(false)} fileToDelete={fileToDelete} fetchFiles={fetchFiles} />}
      {showSuccessModal && <SuccessMessageModal message={successMessage} onClose={() => setShowSuccessModal(false)} />}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">File History: {historyFile?.name}</h3>
              <button onClick={() => setShowHistoryModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <ul className="space-y-2">
              {fileHistory.map(v => (
                <li key={v.version} className="flex justify-between items-center">
                  <span>{new Date(Number(v.version)).toLocaleString()}</span>
                  <button
                    className="px-2 py-1 bg-blue-600 text-white rounded"
                    onClick={async () => {
                      await fetch(`http://localhost:5000/api/files/${encodeURIComponent(historyFile!.name)}/restore`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ version: v.version }),
                      });
                      setShowHistoryModal(false);
                      fetchFiles();
                    }}
                  >Restore</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {showExportConfirm && (
        <ExportConfirmModal
          onConfirm={() => {
            setShowExportConfirm(false);
            handleExportExcel(); // <-- Use Excel export here
          }}
          onCancel={() => setShowExportConfirm(false)}
        />
      )}
    </div>
  );
}

export default SecureFileManager;



