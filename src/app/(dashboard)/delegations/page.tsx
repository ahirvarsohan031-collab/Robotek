"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Delegation } from "@/types/delegation";
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
  MicrophoneIcon,
  StopCircleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FireIcon,
  BoltIcon,
  ArrowDownCircleIcon,
  TagIcon,
  SparklesIcon as SparklesIconOutline,
  DocumentTextIcon,
  UserIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon
} from "@heroicons/react/24/outline";
import PremiumDatePicker from "@/components/PremiumDatePicker";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";
import { User } from "@/types/user";

export default function DelegationsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'USER';

  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState<Delegation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState<'All' | 'Delayed' | 'Today' | 'Tomorrow' | 'Next3'>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<'All' | 'ToMe' | 'ByMe'>('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Delegation; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  // File uploads
  const [voiceNoteFile, setVoiceNoteFile] = useState<File | null>(null);
  const [refDocFile, setRefDocFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Delegation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [formData, setFormData] = useState<Partial<Delegation>>({
    id: "",
    title: "",
    description: "",
    assigned_by: "",
    assigned_to: "",
    department: "",
    priority: "Normal",
    due_date: "",
    status: "Pending",
    voice_note_url: "",
    reference_docs: "",
    evidence_required: "No",
  });

  // Searchable Dropdown States 
  const [assignedBySearch, setAssignedBySearch] = useState("");
  const [assignedToSearch, setAssignedToSearch] = useState("");
  const [assignedByOpen, setAssignedByOpen] = useState(false);
  const [assignedToOpen, setAssignedToOpen] = useState(false);

  const predefinedDepartments = [
    "Sales", "Marketing", "Engineering", "Operations", 
    "HR", "Finance", "Customer Support", "Management"
  ];
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentOpen, setDepartmentOpen] = useState(false);

  // Media Recorder States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  // Action Status States
  const [actionStatus, setActionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Confirmation states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Audio states
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Revision & Remarks States
  const [updatingStatus, setUpdatingStatus] = useState<string>("");
  const [remarkText, setRemarkText] = useState("");
  const [revisedDueDate, setRevisedDueDate] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setIsPlaying(false);
      setAudioProgress(0);
      setAudioCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Reset revision states
      setUpdatingStatus("");
      setRemarkText("");
      setRevisedDueDate("");
      setRevisionReason("");
      setEvidenceFile(null);
      
      // Fetch history for selected task
      fetchTaskHistory(selectedTask.id);
    }
  }, [selectedTask]);

  const fetchTaskHistory = async (id: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/delegations/${id}/history`);
      if (res.ok) {
        const data = await res.json();
        setTaskHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch task history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTask || !updatingStatus) return;

    setIsSubmittingUpdate(true);
    setActionStatus('loading');
    setActionMessage("Updating status...");
    setIsStatusModalOpen(true);

    try {
      const formData = new FormData();
      formData.append("status", updatingStatus);
      formData.append("reason", revisionReason);
      
      // Ensure ISO format for due date
      let isoDate = revisedDueDate;
      if (revisedDueDate) {
        const d = new Date(revisedDueDate);
        if (!isNaN(d.getTime())) {
          isoDate = d.toISOString();
        }
      }
      formData.append("revised_due_date", isoDate);

      if (evidenceFile) {
        formData.append("evidence", evidenceFile);
      }

      const res = await fetch(`/api/delegations/${selectedTask.id}/status`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setActionStatus('success');
        setActionMessage("Status updated successfully");
        
        // Update local state immediately for both sidebar and main list
        if (data.delegation) {
          setSelectedTask(prev => prev?.id === data.delegation.id ? data.delegation : prev);
          setDelegations(prev => prev.map(d => String(d.id) === String(data.delegation.id) ? data.delegation : d));
        } else {
          fetchDelegations(); // Fallback to full fetch
        }
        
        fetchTaskHistory(selectedTask.id); // Refresh history timeline
        
        // Reset sub-states
        setUpdatingStatus("");
        setRevisionReason("");
        setRevisedDueDate("");
        setEvidenceFile(null);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update status");
      }
    } catch (error) {
      setActionStatus('error');
      setActionMessage("Error updating status");
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleAddRemark = async () => {
    if (!selectedTask || !remarkText.trim()) return;

    setIsSubmittingUpdate(true);
    setActionStatus('loading');
    setActionMessage("Adding remark...");
    setIsStatusModalOpen(true);

    try {
      const res = await fetch(`/api/delegations/${selectedTask.id}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarkText }),
      });

      if (res.ok) {
        setActionStatus('success');
        setActionMessage("Remark added successfully");
        setRemarkText("");
        fetchTaskHistory(selectedTask.id); // Refresh history
      } else {
        throw new Error("Failed to add remark");
      }
    } catch (error) {
      setActionStatus('error');
      setActionMessage("Error adding remark");
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchDelegations();
    fetchUsers();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsersList(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchDelegations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/delegations");
      const data = await res.json();
      setDelegations(data);
    } catch (error) {
      console.error("Failed to fetch delegations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setActionStatus('loading');
    setActionMessage(editingDelegation ? "Updating delegation..." : "Creating new delegation...");
    setIsStatusModalOpen(true);

    const method = editingDelegation ? "PUT" : "POST";
    const url = editingDelegation ? `/api/delegations/${editingDelegation.id}` : "/api/delegations";

    const payload = new FormData();
    
    // Add create/update dates
    const dataToSave = { ...formData };
    
    const now = new Date().toISOString();

    if (!editingDelegation) {
      dataToSave.created_at = now;
    }
    dataToSave.updated_at = now;

    // Convert due_date to ISO string before saving to Google Sheets
    if (dataToSave.due_date && dataToSave.due_date.includes('T')) {
      const d = new Date(dataToSave.due_date);
      if (!isNaN(d.getTime())) {
        dataToSave.due_date = d.toISOString();
      }
    }

    payload.append("delegationData", JSON.stringify(dataToSave));
    if (voiceNoteFile) {
      payload.append("voice_note", voiceNoteFile);
    }
    if (refDocFile) {
      payload.append("reference_doc", refDocFile);
    }

    try {
      const res = await fetch(url, {
        method,
        body: payload,
      });

      if (res.ok) {
        setIsStatusModalOpen(false);
        setIsModalOpen(false);
        resetForm();
        fetchDelegations();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save delegation");
      }
    } catch (error: any) {
      setIsStatusModalOpen(false);
      alert(`Error: ${error.message || "Something went wrong while saving. Please try again."}`);
    }
  };

  const resetForm = () => {
    setEditingDelegation(null);
    setVoiceNoteFile(null);
    setAudioChunks([]);
    setIsRecording(false);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setRefDocFile(null);
    setAssignedBySearch("");
    setAssignedToSearch("");
    
    // Set sequential ID for new delegation
    const nextId = delegations.length > 0 
      ? Math.max(...delegations.map(d => parseInt(String(d.id)) || 0)) + 1 
      : 1;

    setFormData({
      id: nextId.toString(),
      title: "",
      description: "",
      assigned_by: "",
      assigned_to: "",
      department: "",
      priority: "Medium",
      due_date: "",
      status: "Pending",
      voice_note_url: "",
      reference_docs: "",
      evidence_required: "No",
    });
  }

  const handleEdit = (delegation: Delegation) => {
    setEditingDelegation(delegation);
    setFormData({
      ...delegation,
      due_date: formatDatePickerValue(delegation.due_date || "")
    });
    setVoiceNoteFile(null);
    setRefDocFile(null);
    setIsModalOpen(true);
  };

  const formatDatePickerValue = (dateStr: string) => {
    if (!dateStr) return "";
    
    // Try to parse the date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Fallback for non-standard formats like DD/MM/YYYY
      const parts = dateStr.split(" ");
      const datePart = parts[0];
      const timePart = parts[1] || "";
      const datePieces = datePart.split("/");
      if (datePieces.length === 3) {
        const [day, month, year] = datePieces;
        const dateFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        if (timePart) {
          const timePieces = timePart.split(":");
          const hh = timePieces[0]?.padStart(2, '0') || "00";
          const mm = timePieces[1]?.padStart(2, '0') || "00";
          return `${dateFormatted}T${hh}:${mm}`;
        }
        return dateFormatted;
      }
      return dateStr;
    }

    // For valid Date objects (including ISO strings from sheets), 
    // we must format it as LOCAL time for the datetime-local input
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const hh = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([audioBlob], `voicenote_${Date.now()}.webm`, { type: 'audio/webm' });
        setVoiceNoteFile(file);
        setAudioChunks(chunks);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      setAudioChunks([]);
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateDisplay = (dateStr: string | undefined) => {
    if (!dateStr) return "—";
    // Already in dd/mm/yyyy HH:mm:ss format - return as is
    if (/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;
    // Try parsing as ISO (e.g. 2026-03-18T02:38:00.558Z)
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const dd = date.getDate().toString().padStart(2, '0');
      const mm = (date.getMonth() + 1).toString().padStart(2, '0');
      const yyyy = date.getFullYear();
      const HH = date.getHours().toString().padStart(2, '0');
      const min = date.getMinutes().toString().padStart(2, '0');
      const ss = date.getSeconds().toString().padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${HH}:${min}:${ss}`;
    }
    return dateStr;
  };

  const handleExport = () => {
    const headers = [
      "ID", "Title", "Description", "Assigned By", "Assigned To", "Department",
      "Priority", "Due Date", "Status", "Evidence", "Created", "Updated"
    ];
    const rows = sortedDelegations.map(d => [
      d.id,
      d.title,
      d.description,
      d.assigned_by,
      d.assigned_to,
      d.department,
      d.priority,
      d.due_date,
      d.status,
      d.evidence_required,
      formatDateDisplay(d.created_at),
      formatDateDisplay(d.updated_at)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `delegations_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id);
    setIsConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!pendingDeleteId) return;

    setActionStatus('loading');
    setActionMessage("Removing delegation from system...");
    setIsStatusModalOpen(true);

    try {
      const res = await fetch(`/api/delegations/${pendingDeleteId}`, { method: "DELETE" });
      if (res.ok) {
        setIsStatusModalOpen(false);
        fetchDelegations();
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      setIsStatusModalOpen(false);
      alert("Failed to delete delegation. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const getDisplayStatus = (del: Delegation) => {
    const s = del.status;
    if (s && s !== 'Pending') {
      // Map sheet status to standardized labels if needed
      if (s === 'Need Clarity') return 'Need Clarity';
      if (s === 'Completed') return 'Completed';
      if (s === 'Need Revision') return 'Need Revision';
      if (s === 'Approved') return 'Approved';
      if (s === 'Hold') return 'Hold';
      if (s === 'Re-Open') return 'Re-Open';
      return s; 
    }

    if (!del.due_date) return s || 'Pending';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Try parsing the date
    let due = new Date(del.due_date);
    
    // Handle formats like DD/MM/YYYY if standard parsing fails
    if (isNaN(due.getTime()) && del.due_date.includes('/')) {
        const parts = del.due_date.split(' ')[0].split('/');
        if (parts.length === 3) {
            due = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
    }

    if (isNaN(due.getTime())) return del.status || 'Pending';
    due.setHours(0, 0, 0, 0);

    if (due < now) return 'Overdue';
    if (due > now) return 'Planned';
    return 'Pending';
  };

  const filteredDelegations = delegations.filter((d) => {
    // Search match
    const matchesSearch = Object.values(d).some((val) =>
      val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Status match
    const matchesStatus = activeStatusFilter === "All" || getDisplayStatus(d) === activeStatusFilter;
    
    // Assignment match
    const currentUser = (session?.user as any)?.username || "";
    let matchesAssignment = true;
    if (assignmentFilter === 'ToMe') {
      matchesAssignment = d.assigned_to === currentUser;
    } else if (assignmentFilter === 'ByMe') {
      matchesAssignment = d.assigned_by === currentUser;
    }

    // Date match
    let matchesDate = true;
    if (dateFilter !== 'All') {
      const displayStatus = getDisplayStatus(d);
      if (!d.due_date || displayStatus === 'Completed' || displayStatus === 'Approved') {
        matchesDate = false;
      } else {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let due = new Date(d.due_date);
        if (isNaN(due.getTime()) && d.due_date.includes('/')) {
          const parts = d.due_date.split(' ')[0].split('/');
          if (parts.length === 3) due = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        if (!isNaN(due.getTime())) {
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dateFilter === 'Delayed') matchesDate = diffDays < 0;
          if (dateFilter === 'Today') matchesDate = diffDays === 0;
          if (dateFilter === 'Tomorrow') matchesDate = diffDays === 1;
          if (dateFilter === 'Next3') matchesDate = diffDays > 0 && diffDays <= 3;
        } else {
          matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesAssignment && matchesDate;
  });

  const getDateFilterCount = (filter: string) => {
    return delegations.filter(d => {
      const displayStatus = getDisplayStatus(d);
      if (!d.due_date || displayStatus === 'Completed' || displayStatus === 'Approved') return false;
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let due = new Date(d.due_date);
      if (isNaN(due.getTime()) && d.due_date.includes('/')) {
        const parts = d.due_date.split(' ')[0].split('/');
        if (parts.length === 3) due = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      if (isNaN(due.getTime())) return false;
      
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filter === 'Delayed') return diffDays < 0;
      if (filter === 'Today') return diffDays === 0;
      if (filter === 'Tomorrow') return diffDays === 1;
      if (filter === 'Next3') return diffDays > 0 && diffDays <= 3;
      return false;
    }).length;
  };

  const handleSort = (key: keyof Delegation) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDelegations = [...filteredDelegations].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aValue = a[key] || "";
    let bValue = b[key] || "";
    
    // Numeric sort for ID
    if (key === 'id') {
      const aNum = parseInt(String(aValue));
      const bNum = parseInt(String(bValue));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof Delegation }) => {
    if (sortConfig?.key !== column) return <div className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronUpIcon className="w-3 h-3 ml-1 text-[#FFD500]" /> : 
      <ChevronDownIcon className="w-3 h-3 ml-1 text-[#FFD500]" />;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setAudioCurrentTime(current);
      if (duration) {
        setAudioProgress((current / duration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setAudioProgress(newProgress);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
    }
  };

  const formatAudioTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority?.toLowerCase();
    let config = {
      label: priority || "Normal",
      icon: BoltIcon,
      color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
    };

    if (p === 'high') {
      config = { label: 'High', icon: FireIcon, color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" };
    } else if (p === 'low') {
      config = { label: 'Low', icon: ArrowDownCircleIcon, color: "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" };
    } else if (p === 'medium') {
      config = { label: 'Medium', icon: BoltIcon, color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" };
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md border ${config.color}`}>
        <config.icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    let config = {
      label: status,
      icon: ClockIcon,
      color: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
    };

    if (s === 'completed') {
      config = { label: 'Completed', icon: CheckCircleIcon, color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" };
    } else if (s === 'need clarity') {
      config = { label: 'Need Clarity', icon: QuestionMarkCircleIcon, color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" };
    } else if (s === 'need revision') {
      config = { label: 'Need Revision', icon: ArrowPathIcon, color: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800" };
    } else if (s === 'approved') {
      config = { label: 'Approved', icon: ShieldCheckIcon, color: "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" };
    } else if (s === 'hold') {
      config = { label: 'Hold', icon: PauseIcon, color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" };
    } else if (s === 're-open') {
      config = { label: 'Re-Open', icon: BoltIcon, color: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800" };
    } else if (s === 'overdue') {
      config = { label: 'Overdue', icon: ExclamationTriangleIcon, color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" };
    } else if (s === 'planned') {
      config = { label: 'Planned', icon: CalendarDaysIcon, color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" };
    } else if (s === 'pending') {
      config = { label: 'Pending', icon: ClockIcon, color: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" };
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md border ${config.color}`}>
        <config.icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getDepartmentBadge = (dept: string) => {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest rounded-md">
        <TagIcon className="w-3 h-3" />
        {dept || "General"}
      </span>
    );
  };

  const getEvidenceBadge = (evidence: string) => {
    const isYes = evidence?.toLowerCase() === 'yes';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md border ${
        isYes 
          ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
          : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
      }`}>
        {isYes ? <ShieldCheckIcon className="w-3 h-3" /> : <XMarkIcon className="w-3 h-3" />}
        {isYes ? "Evidence Required: Yes" : "Evidence Required: No"}
      </span>
    );
  };


  const totalPages = Math.ceil(sortedDelegations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDelegations = sortedDelegations.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Delegations</h1>
          <p className="text-gray-500 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider">Task Assignment System</p>
        </div>
        
        <div className="flex items-center rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] overflow-hidden shadow-sm transition-all active:translate-y-[2px] active:border-b-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-white dark:bg-navy-800 text-[#003875] dark:text-[#FFD500] px-5 py-2 font-black transition-colors hover:bg-gray-50 dark:hover:bg-navy-700 uppercase tracking-widest text-[10px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center bg-white dark:bg-navy-800 hover:bg-gray-50 dark:hover:bg-navy-700 text-[#003875] dark:text-[#FFD500] px-5 py-2 transition-colors border-l-2 border-[#003875] dark:border-[#FFD500]"
            title="New Delegation"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        style={{ borderColor: 'var(--panel-border)' }}
        className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-500"
      >
        {/* Status Filtration Tiles */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 dark:bg-navy-900/30 border-b border-gray-100 dark:border-navy-700/50">
          {[
            { label: 'All', icon: <TagIcon className="w-3 h-3" />, color: 'bg-white text-gray-700 border-gray-200 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600' },
            { label: 'Pending', icon: <ClockIcon className="w-3 h-3" />, color: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
            { label: 'Planned', icon: <CalendarDaysIcon className="w-3 h-3" />, color: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
            { label: 'Need Clarity', icon: <QuestionMarkCircleIcon className="w-3 h-3" />, color: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' },
            { label: 'Need Revision', icon: <ArrowPathIcon className="w-3 h-3" />, color: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' },
            { label: 'Completed', icon: <CheckCircleIcon className="w-3 h-3" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
            { label: 'Approved', icon: <ShieldCheckIcon className="w-3 h-3" />, color: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
            { label: 'Hold', icon: <PauseIcon className="w-3 h-3" />, color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
            { label: 'Re-Open', icon: <BoltIcon className="w-3 h-3" />, color: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800' },
            { label: 'Overdue', icon: <ExclamationTriangleIcon className="w-3 h-3" />, color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
          ].map(tile => {
            const count = tile.label === 'All' ? delegations.length : delegations.filter(d => getDisplayStatus(d) === tile.label).length;
            const isActive = activeStatusFilter === tile.label;
            return (
              <button
                key={tile.label}
                onClick={() => {
                  if (tile.label === 'All') {
                    setDateFilter('All');
                    setAssignmentFilter('All');
                    setSearchTerm('');
                  }
                  setActiveStatusFilter(tile.label);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                  isActive 
                    ? `${tile.color} shadow-md scale-105 ring-1 ring-black/5 dark:ring-white/10 opacity-100` 
                    : `${tile.color} opacity-60 hover:opacity-100 hover:scale-[1.02] grayscale-[50%] hover:grayscale-0`
                }`}
              >
                {tile.icon}
                {tile.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${
                  isActive 
                    ? 'bg-white/50 dark:bg-black/20' 
                    : 'bg-black/5 dark:bg-white/10'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div 
          style={{ 
            backgroundColor: 'var(--panel-card)',
            borderBottom: '1px solid var(--panel-border)'
          }}
          className="p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
        >
          <div className="flex flex-wrap items-center gap-3 flex-1 w-full max-w-full overflow-hidden">
            <div className="relative group flex-1 min-w-[150px] max-w-[220px]">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
              <input
                type="text"
                placeholder="Search delegations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 bg-gray-50 dark:bg-navy-900 border border-gray-100 dark:border-navy-700/50 rounded-lg focus:border-[#FFD500] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm"
              />
            </div>

            {/* Assignment Filters */}
            <div className="flex items-center bg-gray-100 dark:bg-navy-900 rounded-full p-1 border border-gray-200 dark:border-navy-700 flex-shrink-0">
              <button 
                onClick={() => { setAssignmentFilter(assignmentFilter === 'ToMe' ? 'All' : 'ToMe'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all h-[26px] flex items-center gap-1.5 ${assignmentFilter === 'ToMe' ? 'bg-[#003875] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                To Me
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${assignmentFilter === 'ToMe' ? 'bg-white/20' : 'bg-gray-200 dark:bg-navy-800'}`}>
                  {delegations.filter(d => d.assigned_to === ((session?.user as any)?.username || "")).length}
                </span>
              </button>
              <button 
                onClick={() => { setAssignmentFilter(assignmentFilter === 'ByMe' ? 'All' : 'ByMe'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all h-[26px] flex items-center gap-1.5 ${assignmentFilter === 'ByMe' ? 'bg-[#003875] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                By Me
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${assignmentFilter === 'ByMe' ? 'bg-white/20' : 'bg-gray-200 dark:bg-navy-800'}`}>
                  {delegations.filter(d => d.assigned_by === ((session?.user as any)?.username || "")).length}
                </span>
              </button>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
              {[
                { id: 'Delayed', label: 'Delayed', color: 'text-red-600 dark:text-red-400', active: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 ring-1 ring-red-500/20' },
                { id: 'Today', label: 'Today', color: 'text-amber-600 dark:text-amber-400', active: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 ring-1 ring-amber-500/20' },
                { id: 'Tomorrow', label: 'Tomorrow', color: 'text-blue-600 dark:text-blue-400', active: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20' },
                { id: 'Next3', label: 'Next 3 Days', color: 'text-emerald-600 dark:text-emerald-400', active: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-500/20' }
              ].map(f => {
                const count = getDateFilterCount(f.id);
                const isActive = dateFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setDateFilter(isActive ? 'All' : f.id as any); setCurrentPage(1); }}
                    className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all h-[28px] flex items-center gap-1.5 ${
                      isActive 
                        ? `${f.active} ${f.color} shadow-sm scale-105` 
                        : `bg-white dark:bg-navy-800 border-gray-200 dark:border-navy-700 hover:bg-gray-50 dark:hover:bg-navy-700/50 text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100`
                    }`}
                  >
                    {f.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                      isActive 
                        ? 'bg-black/10 dark:bg-white/10' 
                        : 'bg-gray-100 dark:bg-navy-900'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>

          <div className="flex items-center gap-4 hidden md:flex">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Page <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> of {totalPages || 1}
              </p>
              <div className="flex gap-0.5 ml-2">
                <button 
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"
                >
                  First
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"
                >
                  Last
                </button>
              </div>
            </div>
            <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/10" />
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Show</label>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none p-0 text-[10px] font-bold outline-none dark:text-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View (Always Visible) */}
        <div 
          style={{ backgroundColor: 'var(--panel-card)' }}
          className="overflow-x-auto transition-colors duration-500 min-h-[400px]"
        >
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-[#003875] dark:bg-navy-950 text-white dark:text-slate-200 whitespace-nowrap">
                <th onClick={() => handleSort('id')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">ID <SortIcon column="id" /></div>
                </th>
                <th onClick={() => handleSort('title')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors min-w-[200px]">
                  <div className="flex items-center">Title &amp; Desc <SortIcon column="title" /></div>
                </th>
                <th onClick={() => handleSort('assigned_to')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Personnel <SortIcon column="assigned_to" /></div>
                </th>
                <th onClick={() => handleSort('department')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Dept <SortIcon column="department" /></div>
                </th>
                <th onClick={() => handleSort('priority')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Priority <SortIcon column="priority" /></div>
                </th>
                <th onClick={() => handleSort('status')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Status <SortIcon column="status" /></div>
                </th>
                <th onClick={() => handleSort('due_date')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center">Due Date <SortIcon column="due_date" /></div>
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-gray-100 border-t-[#FFD500] rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Syncing...</p>
                  </td>
                </tr>
              ) : paginatedDelegations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No delegations found</p>
                  </td>
                </tr>
              ) : (
                paginatedDelegations.map((del) => (
                  <tr key={del.id} className="hover:bg-orange-50/10 border-b-2 border-gray-200 dark:border-white/10 last:border-0 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-gray-400 font-bold">#{del.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-black text-xs text-gray-900 dark:text-white leading-tight">{del.title}</p>
                      <p className="font-bold text-[10px] text-gray-500 dark:text-gray-400 leading-tight line-clamp-1 mt-0.5">{del.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-800 dark:text-gray-200">{del.assigned_to || "—"}</span>
                        <span className="text-[10px] text-gray-400 font-bold">By: {del.assigned_by || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getDepartmentBadge(del.department)}
                    </td>
                    <td className="px-4 py-3">
                      {getPriorityBadge(del.priority)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(getDisplayStatus(del))}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-gray-600 dark:text-slate-300">{formatDateDisplay(del.due_date) || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedTask(del)}
                          className="p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-black rounded-lg transition-all"
                          title="Follow Up"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(del)}
                          className="p-1.5 bg-[#003875]/10 text-[#003875] dark:bg-[#FFD500]/10 dark:text-[#FFD500] hover:bg-[#003875] hover:text-white dark:hover:bg-[#FFD500] dark:hover:text-black rounded-lg transition-all"
                          title="Edit Delegation"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(del.id)}
                          className="p-1.5 bg-[#CE2029]/10 text-[#CE2029] hover:bg-[#CE2029] hover:text-white rounded-lg transition-all"
                          title="Delete Delegation"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Follow Up Right Sidebar Drawer */}
        {selectedTask && (
          <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
              onClick={() => setSelectedTask(null)}
            />
            
            {/* Sidebar Content */}
            <div className="absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-navy-900 shadow-[-20px_0_50px_-12px_rgba(0,0,0,0.3)] flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-gray-100 dark:border-white/5">
              {/* Header */}
              <div className="py-3 px-6 flex items-center justify-between bg-[#CE2029] sticky top-0 z-20 shadow-lg shadow-red-900/10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white/10 rounded-xl text-white backdrop-blur-md border border-white/20">
                    <ArrowPathIcon className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-xl font-black text-white tracking-tight">Follow Up</h2>
                      <span className="text-[10px] font-mono text-white bg-white/10 px-2 py-0.5 rounded border border-white/20 uppercase tracking-widest font-black">#{selectedTask.id}</span>
                    </div>
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest truncate max-w-[400px]">
                      {selectedTask.title}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/70 hover:text-white group"
                >
                  <XMarkIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto px-6 pt-1 pb-6 space-y-3 custom-scrollbar">
                {/* Description and Badges */}
                <section className="space-y-4">
                  <div className="p-4 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30">
                    <p className="text-gray-700 dark:text-slate-300 font-bold text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedTask.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(getDisplayStatus(selectedTask))}
                    {getPriorityBadge(selectedTask.priority)}
                    {getEvidenceBadge(selectedTask.evidence_required)}
                    {getDepartmentBadge(selectedTask.department)}
                  </div>
                </section>

                {/* Compact Details Grid */}
                <div className="bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30 overflow-hidden divide-y divide-red-100/30 dark:divide-red-900/20">
                  {/* Row 1: Stakeholders */}
                  <div className="grid grid-cols-2">
                    <div className="p-3 border-r border-gray-100 dark:border-white/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-900 dark:bg-[#FFD500] flex items-center justify-center text-white dark:text-black text-[10px] font-black">
                        {selectedTask.assigned_to?.substring(0, 2).toUpperCase() || "TO"}
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Assigned To</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[120px]">{selectedTask.assigned_to}</p>
                      </div>
                    </div>
                    <div className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 text-[10px] font-black">
                        {selectedTask.assigned_by?.substring(0, 2).toUpperCase() || "BY"}
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Assigned By</p>
                        <p className="text-xs font-bold text-gray-600 dark:text-slate-400 truncate max-w-[120px]">{selectedTask.assigned_by}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Dept & Due Date */}
                  <div className="grid grid-cols-2">
                    <div className="p-3 border-r border-gray-100 dark:border-white/5 flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                        <TagIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Department</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white">{selectedTask.department}</p>
                      </div>
                    </div>
                    <div className="p-3 flex items-center gap-3">
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                        <CalendarDaysIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Due Date</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white">{formatDateDisplay(selectedTask.due_date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Timestamps */}
                  <div className="grid grid-cols-2">
                    <div className="p-3 border-r border-gray-100 dark:border-white/5 flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                        <ClockIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Registered</p>
                        <p className="text-[10px] font-bold text-gray-600 dark:text-slate-400">{formatDateDisplay(selectedTask.created_at)}</p>
                      </div>
                    </div>
                    {selectedTask.updated_at && (
                      <div className="p-3 flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">
                          <ArrowPathIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Updated</p>
                          <p className="text-[10px] font-bold text-gray-600 dark:text-slate-400">{formatDateDisplay(selectedTask.updated_at)}</p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
                {/* Media Section: Unified Voice and Documents */}
                <div className="grid grid-cols-5 gap-3">
                  {/* Voice Briefing - 80% */}
                  <div className="col-span-4">
                    {selectedTask.voice_note_url ? (
                      <div className="p-4 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30 overflow-hidden relative group transition-all duration-300 h-full">
                        <h4 className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
                            <MicrophoneIcon className="w-4 h-4" /> Voice Briefing
                            {isPlaying && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
                        </h4>
                        
                        <audio 
                          ref={audioRef}
                          src={`/api/audio/${selectedTask.voice_note_url}`} 
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={handleLoadedMetadata}
                          onEnded={() => setIsPlaying(false)}
                          onError={(e) => console.error("Audio playback error:", e)}
                          className="hidden"
                        />

                        <div className="relative z-10 flex flex-col gap-3">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={togglePlay}
                              className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95 group-hover:rotate-[360deg] duration-500"
                            >
                              {isPlaying ? (
                                <PauseIcon className="w-5 h-5 fill-current" />
                              ) : (
                                <PlayIcon className="w-5 h-5 fill-current ml-1" />
                              )}
                            </button>
                            <div className="flex-1">
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={audioProgress}
                                onChange={handleAudioSeek}
                                className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500"
                              />
                              <div className="flex justify-between mt-1.5">
                                <span className="text-[9px] font-mono text-gray-500 dark:text-gray-400 font-bold">{formatAudioTime(audioCurrentTime)}</span>
                                <span className="text-[9px] font-mono text-gray-400 font-bold">{formatAudioTime(audioDuration)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute bottom-0 right-0 left-0 flex items-end justify-center gap-[2px] h-12 opacity-[0.05] pointer-events-none px-4">
                          {[...Array(25)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-[2px] bg-red-500 rounded-t-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
                              style={{ 
                                height: isPlaying ? `${Math.random() * 90 + 10}%` : `${(i % 6) * 8 + 10}%`,
                                animationDelay: `${i * 0.05}s`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-50/10 dark:bg-red-950/5 rounded-2xl border border-dashed border-red-100 dark:border-red-900/20 text-center flex flex-col items-center justify-center h-full">
                        <MicrophoneIcon className="w-6 h-6 text-gray-300 mb-2" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">No Voice note</p>
                      </div>
                    )}
                  </div>

                  {/* Reference Document - 20% */}
                  <div className="col-span-1">
                    {selectedTask.reference_docs ? (
                      <a 
                        href={`https://drive.google.com/file/d/${selectedTask.reference_docs}/view?usp=sharing`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-4 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30 transition-all group shadow-sm h-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="View Reference Document"
                      >
                        <div className="p-2.5 bg-white dark:bg-white/10 rounded-xl shadow-inner group-hover:scale-110 transition-transform mb-2">
                          <PaperClipIcon className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-tighter text-red-600 dark:text-red-400 text-center">Open Doc</p>
                      </a>
                    ) : (
                      <div className="p-4 bg-red-50/10 dark:bg-red-950/5 rounded-2xl border border-dashed border-red-100 dark:border-red-900/20 text-center flex flex-col items-center justify-center h-full">
                        <PaperClipIcon className="w-6 h-6 text-gray-300 mb-2" />
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">No Doc</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Status Update & Remarks Section */}
                <div className="space-y-6 border-t border-gray-100 dark:border-white/5 pt-6 pb-2">
                  <div className="w-full">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-1">
                      <BoltIcon className="w-4 h-4 text-amber-500" /> Quick Status Update
                    </h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Need Clarity', icon: <TagIcon className="w-3 h-3" />, color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' },
                        { label: 'Completed', icon: <CheckCircleIcon className="w-3 h-3" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' },
                        { label: 'Need Revision', icon: <ArrowPathIcon className="w-3 h-3" />, color: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30' },
                        { label: 'Approved', icon: <ShieldCheckIcon className="w-3 h-3" />, color: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30', requiresAdmin: true },
                        { label: 'Hold', icon: <PauseIcon className="w-3 h-3" />, color: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30', requiresAdmin: true },
                        { label: 'Re-Open', icon: <BoltIcon className="w-3 h-3" />, color: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/30', requiresAdmin: true },
                      ]
                      .filter(item => userRole === 'ADMIN' || !item.requiresAdmin)
                      .map((item) => (
                        <button
                          key={item.label}
                          onClick={() => setUpdatingStatus(item.label === updatingStatus ? "" : item.label)}
                          className={`flex items-center gap-1.5 px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight border transition-all ${
                            updatingStatus === item.label
                              ? 'bg-[#CE2029] text-white border-[#CE2029] shadow-lg shadow-red-500/30 scale-[1.02]'
                              : `${item.color} hover:scale-[1.02]`
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional: Revised Due Date */}
                  {['Need Revision', 'Hold', 'Re-Open'].includes(updatingStatus) && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1.5 block">Revised Due Date & Time</label>
                      <div className="relative group/date">
                        <input
                          type="datetime-local"
                          value={revisedDueDate}
                          onChange={(e) => setRevisedDueDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 appearance-none cursor-pointer transition-all hover:bg-red-50 dark:hover:bg-red-900/20 font-bold"
                        />
                        <CalendarDaysIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none group-hover/date:scale-110 transition-transform" />
                      </div>
                      <p className="text-[7px] text-gray-400 mt-1 font-bold italic tracking-tighter">* Set the new target completion time</p>
                    </div>
                  )}

                  {/* Conditional: Evidence Upload */}
                  {updatingStatus === 'Completed' && selectedTask.evidence_required === 'Yes' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1.5 block">Upload Evidence (Required)</label>
                      <div className="relative group/file">
                        <input
                          type="file"
                          onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="evidence-upload"
                        />
                        <label
                          htmlFor="evidence-upload"
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-red-50/30 dark:bg-red-900/10 border border-dashed border-red-200 dark:border-red-900/30 rounded-xl text-xs text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 transition-colors"
                        >
                          <span className="truncate">{evidenceFile?.name || "Select performance proof..."}</span>
                          <PaperClipIcon className="w-4 h-4" />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Optional Reason for status change */}
                  {updatingStatus && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1.5 block">Reason for Status Change</label>
                      <textarea
                        value={revisionReason}
                        onChange={(e) => setRevisionReason(e.target.value)}
                        placeholder="Explain why this status change is happening..."
                        className="w-full px-4 py-2 bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 min-h-[80px] resize-none"
                      />
                    </div>
                  )}

                  {/* Remarks Input - Only show if NO status is being updated */}
                  {!updatingStatus && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <h4 className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4" /> New Remark
                      </h4>
                      <textarea
                        value={remarkText}
                        onChange={(e) => setRemarkText(e.target.value)}
                        placeholder="Type a internal contextual remark..."
                        className="w-full px-4 py-2 bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 min-h-[80px] resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* History Timeline Tracking */}
                <div className="pt-8 border-t border-gray-100 dark:border-white/5 pb-10 w-full">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 px-1">
                    <ClockIcon className="w-4 h-4 text-blue-500" /> Activity History
                  </h4>
                  
                  {isLoadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                      <ArrowPathIcon className="w-6 h-6 animate-spin mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Fetching history...</p>
                    </div>
                  ) : taskHistory.length > 0 ? (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-white/5">
                      {taskHistory.map((item, index) => (
                        <div key={item.id} className="relative">
                          <div className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-navy-900 z-10 ${
                            item.type === 'remark' ? 'bg-blue-500' : 'bg-amber-500'
                          }`}></div>
                          
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {item.type === 'remark' ? item.username : `Status -> ${item.new_status}`}
                              </span>
                              <span className="text-[8px] font-bold text-gray-400">{formatDateDisplay(item.created_at)}</span>
                            </div>
                            
                            {item.type === 'remark' ? (
                              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed font-medium bg-blue-50/30 dark:bg-blue-900/5 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 italic">
                                "{item.remark}"
                              </p>
                            ) : (
                              <div className="text-[10px] text-gray-500 dark:text-slate-500 bg-amber-50/30 dark:bg-amber-900/5 p-3 rounded-xl border border-amber-100/30 dark:border-amber-900/20">
                                {item.reason && <p className="font-bold text-gray-700 dark:text-slate-300 mb-1">Reason: {item.reason}</p>}
                                <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-80">
                                  <span>From: <b className="text-[#CE2029]">{item.old_status}</b></span>
                                  {item.old_due_date !== item.new_due_date && (
                                    <span>Due Date: <b className="text-emerald-600">{formatDateDisplay(item.new_due_date)}</b></span>
                                  )}
                                </div>
                                {item.evidence_urls && (
                                  <a 
                                    href={`https://drive.google.com/file/d/${item.evidence_urls}/view`} 
                                    target="_blank" 
                                    className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-black text-amber-600 uppercase tracking-widest hover:underline"
                                  >
                                    <PaperClipIcon className="w-3 h-3" /> View Evidence Attachment
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 opacity-30 select-none">
                      <SparklesIconOutline className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No history yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Footer Actions */}
              <div className="p-5 px-6 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-navy-900 flex gap-4 mt-auto sticky bottom-0 z-30 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
                <button
                  onClick={handleUpdateStatus}
                  disabled={!updatingStatus || isSubmittingUpdate}
                  className="w-[70%] px-4 py-3.5 bg-[#CE2029] hover:bg-red-700 disabled:bg-gray-300 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 no-underline border-none"
                  style={{ backgroundColor: '#CE2029' }}
                >
                  {isSubmittingUpdate && updatingStatus ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5" />
                  )}
                  Update Status
                </button>
                <button
                  onClick={handleAddRemark}
                  disabled={!remarkText.trim() || isSubmittingUpdate}
                  className="w-[30%] px-4 py-3.5 bg-[#FFD500] hover:bg-yellow-500 disabled:bg-gray-300 text-navy-900 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 no-underline border-none"
                  style={{ backgroundColor: '#FFD500' }}
                >
                  {isSubmittingUpdate && remarkText.trim() ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <DocumentTextIcon className="w-5 h-5" />
                  )}
                  Remark
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-[#FFFBF0] dark:bg-navy-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-orange-100/50 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-4 border-b border-orange-100/50 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                    {editingDelegation ? "Edit Delegation" : "Create Delegation"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-gray-400 dark:text-slate-400 font-bold text-[8px] uppercase tracking-widest">Task Configuration</p>
                    {editingDelegation && (
                      <span className="px-2 py-0.5 bg-orange-50 dark:bg-zinc-800 text-[8px] font-black text-gray-500 rounded border border-orange-100 dark:border-zinc-700">
                        ID: {editingDelegation?.id}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <XMarkIcon className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-6 max-h-[80vh] overflow-y-auto bg-white dark:bg-navy-800/50">
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#FFD500] uppercase tracking-widest block">Task Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-black text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                      required
                      placeholder="Brief title for this delegation..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Description / Task Details</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-2 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm min-h-[80px]"
                      required
                      placeholder="Enter full task description..."
                    />
                  </div>
                </div>

                {/* Row 1: Assigned By + Assigned To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assigned By Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Assigned By</label>
                    <div 
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-sm cursor-pointer"
                      onClick={() => {
                        setAssignedByOpen(!assignedByOpen)
                        setAssignedToOpen(false)
                        setDepartmentOpen(false)
                      }}
                    >
                      <div className="px-3 py-1.5 font-bold text-xs text-gray-800 dark:text-zinc-100 flex justify-between items-center group-hover:border-[#FFD500] transition-colors">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formData.assigned_by || "Select User..."}</span>
                        </div>
                        <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                    {assignedByOpen && (
                      <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 border-b border-orange-50 dark:border-zinc-800">
                          <input 
                            type="text" placeholder="Search users..." value={assignedBySearch}
                            onChange={(e) => setAssignedBySearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-gray-50 dark:bg-zinc-950 px-2 py-1 rounded border border-gray-100 dark:border-zinc-800 outline-none text-[10px] font-bold text-gray-700 dark:text-gray-300"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {usersList.filter(u => u.username.toLowerCase().includes(assignedBySearch.toLowerCase())).map(u => (
                            <div key={`by-${u.id}`}
                              className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-[#003875]/5 dark:hover:bg-[#FFD500]/10 cursor-pointer"
                              onClick={() => { setFormData({ ...formData, assigned_by: u.username }); setAssignedByOpen(false); setAssignedBySearch(""); }}
                            >{u.username}</div>
                          ))}
                          {usersList.filter(u => u.username.toLowerCase().includes(assignedBySearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-[10px] text-gray-400 text-center">No users found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned To Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Assigned To</label>
                    <div 
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-sm cursor-pointer"
                      onClick={() => {
                        setAssignedToOpen(!assignedToOpen)
                        setAssignedByOpen(false)
                        setDepartmentOpen(false)
                      }}
                    >
                      <div className="px-3 py-1.5 font-bold text-xs text-gray-800 dark:text-zinc-100 flex justify-between items-center group-hover:border-[#FFD500] transition-colors">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formData.assigned_to || "Select User..."}</span>
                        </div>
                        <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                    {assignedToOpen && (
                      <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 border-b border-orange-50 dark:border-zinc-800">
                          <input 
                            type="text" placeholder="Search users..." value={assignedToSearch}
                            onChange={(e) => setAssignedToSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-gray-50 dark:bg-zinc-950 px-2 py-1 rounded border border-gray-100 dark:border-zinc-800 outline-none text-[10px] font-bold text-gray-700 dark:text-gray-300"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {usersList.filter(u => u.username.toLowerCase().includes(assignedToSearch.toLowerCase())).map(u => (
                            <div key={`to-${u.id}`}
                              className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-[#003875]/5 dark:hover:bg-[#FFD500]/10 cursor-pointer"
                              onClick={() => { setFormData({ ...formData, assigned_to: u.username }); setAssignedToOpen(false); setAssignedToSearch(""); }}
                            >{u.username}</div>
                          ))}
                          {usersList.filter(u => u.username.toLowerCase().includes(assignedToSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-[10px] text-gray-400 text-center">No users found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Priority + Evidence Required */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Priority</label>
                    <div className="flex bg-gray-100 dark:bg-zinc-900/50 p-1 rounded-xl">
                      {(['Low', 'Medium', 'High'] as const).map((pri) => (
                        <button key={pri} type="button"
                          onClick={() => setFormData({ ...formData, priority: pri })}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                            formData.priority === pri 
                              ? pri === 'Low' ? 'bg-green-500 text-white shadow-md'
                              : pri === 'Medium' ? 'bg-yellow-500 text-white shadow-md'
                              : 'bg-red-500 text-white shadow-md'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >{pri}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Evidence Required?</label>
                    <div className="flex bg-gray-100 dark:bg-zinc-900/50 p-1 rounded-xl">
                      {(['No', 'Yes'] as const).map((val) => (
                        <button key={val} type="button"
                          onClick={() => setFormData({ ...formData, evidence_required: val })}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                            formData.evidence_required === val
                              ? val === 'Yes' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-400 text-white shadow-md'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >{val === 'Yes' ? '✓ Yes' : '✗ No'}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 3: Department + Due Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Department Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Department</label>
                    <div 
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-sm cursor-pointer"
                      onClick={() => { setDepartmentOpen(!departmentOpen); setAssignedByOpen(false); setAssignedToOpen(false); }}
                    >
                      <div className="px-3 py-1.5 font-bold text-xs text-gray-800 dark:text-zinc-100 flex justify-between items-center group-hover:border-[#FFD500] transition-colors">
                        <div className="flex items-center gap-2">
                          <TagIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formData.department || "Select Department..."}</span>
                        </div>
                        <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                    {departmentOpen && (
                      <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 border-b border-orange-50 dark:border-zinc-800">
                          <input type="text" placeholder="Search departments..." value={departmentSearch}
                            onChange={(e) => setDepartmentSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-gray-50 dark:bg-zinc-950 px-2 py-1 rounded border border-gray-100 dark:border-zinc-800 outline-none text-[10px] font-bold text-gray-700 dark:text-gray-300"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {predefinedDepartments.filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase())).map(d => (
                            <div key={`dept-${d}`}
                              className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-[#003875]/5 dark:hover:bg-[#FFD500]/10 cursor-pointer"
                              onClick={() => { setFormData({ ...formData, department: d }); setDepartmentOpen(false); setDepartmentSearch(""); }}
                            >{d}</div>
                          ))}
                          {predefinedDepartments.filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer flex items-center gap-2"
                              onClick={() => { setFormData({ ...formData, department: departmentSearch }); setDepartmentOpen(false); setDepartmentSearch(""); }}
                            ><PlusIcon className="w-3 h-3" /> Add "{departmentSearch}"</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Due Date & Time */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Due Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm cursor-pointer"
                    />
                  </div>
                </div>


                {/* Attachments */}
                <div className="space-y-4 pt-4 border-t border-orange-50 dark:border-zinc-800/50">
                  <p className="text-[10px] font-black text-[#FFD500] uppercase tracking-[0.2em]">Attachments</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Voice Note Upload / Record */}
                    <div className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
                      isRecording 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/10' 
                        : 'border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50'
                    }`}>
                      {/* Recording Waveform Animation */}
                      {isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none gap-1">
                          {[...Array(20)].map((_, i) => (
                            <div 
                              key={i} 
                              className="w-1 bg-red-500 rounded-full animate-bounce"
                              style={{ 
                                height: `${Math.random() * 60 + 20}px`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${0.5 + Math.random() * 0.5}s`
                              }}
                            />
                          ))}
                        </div>
                      )}

                      <div className="relative z-10 flex flex-col items-center text-center w-full">
                        {isRecording ? (
                          <>
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="p-4 bg-red-500 rounded-full text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all hover:scale-105 active:scale-95 animate-pulse"
                            >
                              <StopCircleIcon className="w-8 h-8" />
                            </button>
                            <p className="mt-3 font-black text-red-600 dark:text-red-400 font-mono text-lg tracking-widest">
                              {formatDuration(recordingDuration)}
                            </p>
                            <p className="text-[10px] font-bold text-red-500/70 uppercase tracking-widest mt-1 animate-pulse">Recording Live...</p>
                          </>
                        ) : (
                          <div className="flex w-full items-center gap-4">
                            <button
                              type="button"
                              onClick={startRecording}
                              className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all shadow-sm flex-shrink-0 group"
                              title="Start Recording"
                            >
                              <MicrophoneIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            </button>
                            
                            <div className="flex-1 text-left border-l-2 border-gray-200 dark:border-zinc-700 pl-4 h-full flex flex-col justify-center">
                              <p className="text-sm font-black text-gray-800 dark:text-zinc-200">
                                {voiceNoteFile ? "Voice Note Ready" : "Record Live"}
                              </p>
                              <p className="text-[10px] font-bold text-gray-500 mt-0.5 max-w-[150px] truncate">
                                {voiceNoteFile ? voiceNoteFile.name : (formData.voice_note_url ? "Existing Clip Linked" : "Click mic to start recording")}
                              </p>
                            </div>
                            
                            <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-800 px-3 py-1.5 rounded border border-gray-200 dark:border-zinc-700 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors tooltip justify-center flex-shrink-0" title="Upload File instead">
                              <PaperClipIcon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Upload</span>
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setVoiceNoteFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reference Document Upload */}
                    <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-sm group-hover:scale-105 transition-transform">
                          <PaperClipIcon className="w-5 h-5 text-gray-400 dark:text-zinc-400 group-hover:text-[#003875] dark:group-hover:text-[#FFD500] transition-colors" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-800 dark:text-zinc-200">Reference Doc</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                            {refDocFile ? refDocFile.name : (formData.reference_docs ? "[Existing File Linked]" : "Click to upload document")}
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setRefDocFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>

                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-orange-100/50 dark:border-zinc-800 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl font-black text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#CE2029] hover:bg-[#8E161D] text-white px-4 py-2 rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest text-[10px]"
                  >
                    {editingDelegation ? "Save Changes" : "Create Delegation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Action Status Modal */}
        <ActionStatusModal 
          isOpen={isStatusModalOpen}
          status={actionStatus}
          message={actionMessage}
        />

        {/* Confirmation Modal */}
        <ConfirmModal 
          isOpen={isConfirmOpen}
          title="Delete Delegation?"
          message="This action cannot be undone. Delegation will be permanently removed from the system."
          confirmLabel="Delete"
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={performDelete}
        />
    </div>
  </div>
  );
}
