'use client';

import React, { useState, useEffect } from 'react';
import { ensureSessionId } from '@/utils/session';
import { useToast } from '@/components/ToastProvider';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import SearchableSelect from '@/components/SearchableSelect';
import ConfirmModal from '@/components/ConfirmModal';
import { getIstDateString, formatDateMMM } from '@/lib/dateUtils';
import { calculateDistance, calculateBearing, getCompassDirection, parseLatLong, getShortestDistance } from '@/lib/locationUtils';
import { 
    CalendarIcon as CalendarBtnIcon, 
    UserIcon as UserBtnIcon, 
    ChatBubbleLeftRightIcon as CommentBtnIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    MapPinIcon,
    ArrowPathIcon,
    ArrowRightCircleIcon,
    PencilSquareIcon,
    TrashIcon
} from '@heroicons/react/24/outline';

interface Leave {
    id: string;
    userId: string;
    userName: string;
    userImage?: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    responsibility1?: string;
    responsibility2?: string;
    responsibility3?: string;
    acceptedBy?: string;
    updatedAt?: string;
}

interface Remark {
    id: string;
    leaveId: string;
    userName: string;
    comment: string;
    createdAt: string;
}

// Icons (Using local SVG / Lucide pattern from project)
const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'Approved') return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    if (status === 'Rejected') return <XCircleIcon className="w-4 h-4 text-red-500" />;
    return <ClockIcon className="w-4 h-4 text-amber-500" />;
};

export default function AttendancePage() {
    const { success, error } = useToast();
    const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'LEAVE' | 'ATTENDANCE_MASTER' | 'REPORT'>('ATTENDANCE');
    const [reportSearch, setReportSearch] = useState('');
    const [reportView, setReportView] = useState<'STATUS' | 'TIME'>('STATUS');
    const [user, setUser] = useState<any>(null);
    const SHIFT_START_TIME = "09:30";
    const [isPageLoading, setIsPageLoading] = useState(false);

    // Attendance State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [history, setHistory] = useState<any[]>([]);
    const [currentStatus, setCurrentStatus] = useState<'IDLE' | 'CHECKED_IN' | 'COMPLETED'>('IDLE');
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const [checkInTime, setCheckInTime] = useState<Date | null>(null);
    const [showCameraMode, setShowCameraMode] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    // Leave State
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [leaveForm, setLeaveForm] = useState({ 
        startDate: '', 
        endDate: '', 
        reason: '',
        responsibility1: '',
        responsibility2: '',
        responsibility3: ''
    });
    const [editingLeave, setEditingLeave] = useState<Leave | null>(null);

    // Admin State
    const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
    const [remarks, setRemarks] = useState<Remark[]>([]);
    const [newRemark, setNewRemark] = useState('');
    const [loadingRemarks, setLoadingRemarks] = useState(false);
    const [masterData, setMasterData] = useState<{ users: any[], attendance: any[], leaves: any[] } | null>(null);
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

    // Real-time Location State
    const [liveLocation, setLiveLocation] = useState<{ lat: number, lng: number, accuracy?: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isApple, setIsApple] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [submitTarget, setSubmitTarget] = useState<'IN' | 'OUT' | null>(null);
    const [masterSearch, setMasterSearch] = useState('');
    const [reportViewMode, setReportViewMode] = useState<'STATUS' | 'TIME'>('STATUS');

    useEffect(() => {
        const ua = navigator.userAgent;
        setIsApple(/iPad|iPhone|iPod|Macintosh/.test(ua));
        setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));
    }, []);

    // Derived Location Metrics
    const registeredPoints = parseLatLong(user?.late_long);
    const distanceInfo = liveLocation && registeredPoints
        ? getShortestDistance(liveLocation.lat, liveLocation.lng, registeredPoints)
        : null;

    const distance = distanceInfo?.distance || null;
    const closestPoint = distanceInfo?.point || null;

    // Dynamic Range: 10m for mobile, 20m for desktop
    const rangeThreshold = isMobile ? 10 : 20;
    const isInRange = distance !== null && distance <= rangeThreshold;

    const bearing = liveLocation && closestPoint
        ? calculateBearing(liveLocation.lat, liveLocation.lng, closestPoint.lat, closestPoint.long)
        : null;

    const refreshLocationManual = () => {
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLiveLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
                success("Location updated successfully");
            },
            (err) => {
                const msg = err.code === 1 ? "Permission denied" : "Lookup failed";
                error(`Location refresh failed: ${msg}`);
                setLocationError(err.message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    useEffect(() => {
        const init = async () => {
            try {
                const authRes = await fetch('/api/auth/session');
                const session = await authRes.json();
                
                if (session?.user) {
                    const sessionUser = session.user;
                    
                    // Fetch full user list to get late_long and other fields not in session
                    let fullUser = sessionUser;
                    try {
                        const usersRes = await fetch('/api/users');
                        if (usersRes.ok) {
                            const allUsers = await usersRes.json();
                            const matched = allUsers.find((u: any) => 
                                String(u.id) === String(sessionUser.id) || 
                                u.username === sessionUser.username
                            );
                            if (matched) {
                                fullUser = { ...sessionUser, ...matched, role: sessionUser.role };
                            }
                        }
                    } catch (e) {
                        console.warn('Could not fetch full user profile:', e);
                    }

                    setUser(fullUser);
                    await Promise.all([
                        fetchAttendance(fullUser.id),
                        fetchLeaves(fullUser.id, fullUser.role),
                        fetchMasterData()
                    ]);
                }
            } catch (e) {
                console.error(e);
            }
        };
        init();
    }, []);

    // Real-time location watcher
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setLiveLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
                setLocationError(null);
            },
            (err) => {
                console.warn('Location watch error:', err.message);
                let msg = err.message;
                if (err.code === 1) msg = "Location access denied. Please enable 'Location Services' in Settings.";
                if (err.code === 3) msg = "Location lookup timed out.";
                setLocationError(msg);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Timer Logic 
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (currentStatus === 'CHECKED_IN' && checkInTime) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - checkInTime.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [currentStatus, checkInTime]);

    useEffect(() => {
        if (showCameraMode) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    error("Camera access denied or failed");
                    setShowCameraMode(null);
                });
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
    }, [showCameraMode]);

    const capturePhotoAndSubmit = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8);
                
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                
                handleAction(showCameraMode!, photoData);
                setShowCameraMode(null);
            }
        }
    };

    const fetchAttendance = async (userId: string) => {
        const res = await fetch(`/api/attendance?userId=${userId}`);
        const data = await res.json();
        if (data.history) setHistory(data.history);
        if (data.currentStatus) {
            setCurrentStatus(data.currentStatus);
            if (data.lastCheckIn) setCheckInTime(new Date(data.lastCheckIn));
        }
    };

    const fetchLeaves = async (userId: string, role: string) => {
        const res = await fetch(`/api/leave?userId=${userId}&role=${role}`);
        const data = await res.json();
        if (data.leaves) setLeaves(data.leaves);
    };

    const fetchRemarks = async (leaveId: string) => {
        setLoadingRemarks(true);
        const res = await fetch(`/api/leave?type=remarks&leaveId=${leaveId}`);
        const data = await res.json();
        if (data.remarks) setRemarks(data.remarks);
        setLoadingRemarks(false);
    };

    const fetchMasterData = async () => {
        try {
            const res = await fetch('/api/attendance/master');
            const data = await res.json();
            if (data.users) setMasterData(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAction = async (action: 'CHECK_IN' | 'CHECK_OUT', photoData?: string) => {
        setIsPageLoading(true);
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    action,
                    userId: user.id,
                    userName: user.username,
                    latitude: liveLocation?.lat,
                    longitude: liveLocation?.lng,
                    photo: photoData
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Action failed');
            }

            await fetchAttendance(user.id);
            success(action === 'CHECK_IN' ? 'Checked in successfully!' : 'Checked out successfully!');
        } catch (e: any) {
            error(e.message || 'Failed to update attendance');
        } finally {
            setIsPageLoading(false);
        }
    };

    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Unique person check
        const selected = [leaveForm.responsibility1, leaveForm.responsibility2, leaveForm.responsibility3].filter(Boolean);
        if (new Set(selected).size !== selected.length) {
            error("Please select different persons for each responsibility slot");
            return;
        }

        setIsPageLoading(true);
        try {
            const method = editingLeave ? 'PUT' : 'POST';
            const body = editingLeave 
                ? { leaveId: editingLeave.id, ...leaveForm }
                : { userId: user.id, userName: user.username, ...leaveForm };

            const res = await fetch('/api/leave', {
                method,
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('Failed');

            setLeaveForm({ startDate: '', endDate: '', reason: '', responsibility1: '', responsibility2: '', responsibility3: '' });
            setEditingLeave(null);
            await fetchLeaves(user.id, user.role);
            success(editingLeave ? 'Leave updated!' : 'Leave request submitted!');
        } catch (e) {
            error('Failed to process leave');
        } finally {
            setIsPageLoading(false);
        }
    };

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleLeaveDelete = async (leaveId: string) => {
        setPendingDeleteId(leaveId);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        setIsPageLoading(true);
        try {
            const res = await fetch(`/api/leave?leaveId=${pendingDeleteId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            await fetchLeaves(user.id, user.role);
            success('Leave deleted successfully');
        } catch (e) {
            error('Failed to delete leave');
        } finally {
            setIsPageLoading(false);
            setPendingDeleteId(null);
            setIsConfirmOpen(false);
        }
    };

    const handleAcceptResponsibility = async (leaveId: string) => {
        setIsPageLoading(true);
        try {
            const res = await fetch('/api/leave', {
                method: 'POST',
                body: JSON.stringify({ action: 'ACCEPT_RESPONSIBILITY', leaveId, acceptedBy: user.username })
            });
            if (!res.ok) throw new Error('Failed');
            await fetchLeaves(user.id, user.role);
            success('You have accepted responsibility for this leave');
        } catch (e) {
            error('Failed to accept responsibility');
        } finally {
            setIsPageLoading(false);
        }
    };

    const handleStatusUpdate = async (status: 'Approved' | 'Rejected', leaveId?: string) => {
        const targetId = leaveId || selectedLeave?.id;
        if (!targetId) return;
        setIsPageLoading(true);
        try {
            const res = await fetch('/api/leave', {
                method: 'POST',
                body: JSON.stringify({ action: 'UPDATE_STATUS', leaveId: targetId, status })
            });
            if (!res.ok) throw new Error('Failed');

            await fetchLeaves(user.id, user.role);
            if (selectedLeave) setSelectedLeave(null);
            success(`Leave request ${status}`);
        } catch (e) {
            error('Failed to update status');
        } finally {
            setIsPageLoading(false);
        }
    };

    const handleAddRemark = async () => {
        if (!newRemark.trim() || !selectedLeave) return;
        setIsPageLoading(true);
        try {
            const res = await fetch('/api/leave', {
                method: 'POST',
                body: JSON.stringify({ action: 'ADD_REMARK', leaveId: selectedLeave.id, userName: user.username, comment: newRemark })
            });
            if (!res.ok) throw new Error('Failed');

            setNewRemark('');
            await fetchRemarks(selectedLeave.id);
            success('Comment added!');
        } catch (e) {
            error('Failed to add comment');
        } finally {
            setIsPageLoading(false);
        }
    };

    const formatDateIST = (dateStr: string) => {
        if (!dateStr) return "-";
        
        // Handle DD/MM/YYYY
        let parsedStr = dateStr;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [dd, mm, yyyy] = dateStr.split('/');
            parsedStr = `${yyyy}-${mm}-${dd}`;
        }
        
        const d = new Date(parsedStr);
        if (isNaN(d.getTime())) return "Invalid Date";
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatTimeIST = (dateStr: string) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    const normalizeDateSheet = (dStr: string): string => {
        if (!dStr) return '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dStr)) {
            const [dd, mm, yyyy] = dStr.split('/');
            return `${yyyy}-${mm}-${dd}`;
        }
        return dStr.split('T')[0];
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} className="h-16 md:h-20 bg-gray-50/20 dark:bg-slate-900/10" />);

        const todayStr = getIstDateString();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const record = history.find(h => normalizeDateSheet(h.date) === dateStr);
            const isToday = dateStr === todayStr;
            const leave = leaves.find(l => {
                const start = normalizeDateSheet(l.startDate);
                const end = normalizeDateSheet(l.endDate);
                return dateStr >= start && dateStr <= end && l.status === 'Approved';
            });
            const isSunday = new Date(year, month, d).getDay() === 0;

            let color = 'bg-white/50 dark:bg-slate-800/30';
            if (isSunday) color = 'bg-gray-100 dark:bg-slate-900/50 opacity-40';
            else if (leave) color = 'bg-purple-500/80 text-white shadow-purple-500/30 border-2 border-purple-400';
            else if (record?.inTime) {
                let isHalfDay = false;
                if (record.outTime) {
                    const hours = (new Date(record.outTime).getTime() - new Date(record.inTime).getTime()) / (1000 * 60 * 60);
                    if (hours <= 4) isHalfDay = true;
                }
                if (isHalfDay) {
                    color = 'bg-orange-500/90 text-white shadow-orange-200';
                } else {
                    color = record.outTime ? 'bg-green-500/90 text-white shadow-green-200' : 'bg-[#FFD500] text-[#003875] shadow-amber-300';
                }
            } else if (dateStr < todayStr) color = 'bg-red-500/80 text-white opacity-90';
            else if (isToday) color = 'border-2 border-[#003875] dark:border-[#FFD500] text-[#003875] dark:text-[#FFD500]';

            // Active check-in blinking animation
            const isActiveCheckIn = record?.inTime && !record?.outTime;

            days.push(
                <div key={d} className="flex flex-col items-center pt-2 h-16 md:h-20 group border border-white/5 transition-all">
                    <div className="relative">
                        {isActiveCheckIn && (
                            <>
                                <div className="absolute inset-0 w-8 h-8 md:w-12 md:h-12 rounded-full bg-[#FFD500] animate-ping opacity-30" />
                                <div className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] md:inset-[-6px] md:w-[calc(100%+12px)] md:h-[calc(100%+12px)] rounded-full border-2 border-[#FFD500] animate-pulse opacity-50" />
                            </>
                        )}
                        <div className={`relative z-10 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-sm transition-all transform group-hover:scale-110 ${color}`}>
                            {d}
                        </div>
                    </div>
                </div>
            );
        }
        return days;
    };

    if (!user) return <div className="p-8 text-center text-gray-400 font-bold">Initializing Attendance...</div>;

    return (
        <div className="space-y-6 relative">
            {isPageLoading && (
                <div className="fixed inset-0 z-[999] bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-[#003875]/20 border-t-[#003875] dark:border-[#FFD500]/20 dark:border-t-[#FFD500] rounded-full animate-spin mb-4"></div>
                    <div className="text-[#003875] dark:text-[#FFD500] font-black tracking-widest text-sm uppercase animate-pulse">Processing...</div>
                </div>
            )}
            {/* Page Header with Integrated Pill Tabs */}
            <div className="flex flex-col lg:flex-row items-center gap-4 px-1">
                <div className="text-center lg:text-left shrink-0 min-w-0 font-serif">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate uppercase">Attendance & Leave</h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Operational Personnel Tracking</p>
                </div>

                <div className="flex-1 w-full flex justify-center lg:justify-end">
                    <div 
                        style={{ backgroundColor: 'var(--panel-card)' }}
                        className="rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] shadow-sm transition-all p-1 overflow-x-auto no-scrollbar max-w-full flex items-center gap-1.5"
                    >
                        {[
                            { id: 'ATTENDANCE', label: 'Dashboard', icon: CalendarBtnIcon },
                            { id: 'LEAVE', label: 'Leaves', icon: ArrowRightCircleIcon },
                            { id: 'ATTENDANCE_MASTER', label: 'Attendance Master', icon: UserBtnIcon },
                            { id: 'REPORT', label: 'Attendance Report', icon: ClockIcon }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center gap-2 px-6 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                                    ${activeTab === tab.id 
                                        ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-sm' 
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}
                                `}
                            >
                                <tab.icon className="w-4 h-4 stroke-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {activeTab === 'ATTENDANCE' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Calendar Section */}
                    <div 
                        style={{ backgroundColor: 'var(--panel-card)' }}
                        className="lg:col-span-3 rounded-[32px] shadow-xl border border-white/40 dark:border-white/5 overflow-hidden backdrop-blur-xl"
                    >
                        <div className="p-6 flex justify-between items-center border-b border-white/10">
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronLeftIcon className="w-5 h-5" /></button>
                            <h2 className="text-lg font-bold text-[#003875] dark:text-[#FFD500] uppercase tracking-tighter">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronRightIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-7 py-4 text-center text-[10px] font-black text-gray-400 border-b border-gray-50/5">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d}>{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 border-separate">
                            {renderCalendar()}
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="flex flex-col gap-6">
                        <div 
                            style={{ backgroundColor: 'var(--panel-card)' }}
                            className="rounded-[32px] shadow-2xl p-8 border border-white/40 dark:border-white/5 text-center relative group overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 ${currentStatus === 'CHECKED_IN' ? 'bg-[#FFD500] animate-pulse' : 'bg-[#003875] dark:bg-[#FFD500] opacity-30'}`}></div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2 opacity-70">
                                {currentStatus === 'CHECKED_IN' ? 'Active Shift' : 'Global Work System'}
                            </h3>
                            {currentStatus === 'CHECKED_IN' && checkInTime && (
                                <div className="text-[9px] font-bold text-[#003875]/50 dark:text-[#FFD500]/50 mb-2 uppercase tracking-widest">
                                    Since {checkInTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                            <div className={`text-5xl font-black mb-8 tracking-tighter font-mono ${currentStatus === 'CHECKED_IN' ? 'text-[#FFD500]' : 'text-[#003875] dark:text-white'}`}>{elapsedTime}</div>
                            
                            {currentStatus === 'IDLE' ? (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowCameraMode('CHECK_IN')}
                                        disabled={!isInRange || isPageLoading}
                                        className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all ${isInRange ? 'bg-[#003875] hover:bg-[#002a58] text-white shadow-xl shadow-[#003875]/20 hover:-translate-y-1' : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'}`}
                                    >
                                        {isPageLoading ? 'Processing...' : 'Check In System'}
                                    </button>
                                    {!isInRange && (
                                        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                            {isMobile ? 'Mobile' : 'Desktop'}: Reach {rangeThreshold}m zone to unlock
                                        </div>
                                    )}
                                </div>
                            ) : currentStatus === 'CHECKED_IN' ? (
                                <button 
                                    onClick={() => setShowCameraMode('CHECK_OUT')} 
                                    disabled={!isInRange || isPageLoading}
                                    className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1 text-white ${isInRange ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50 shadow-none'}`}
                                >
                                    {isPageLoading ? 'Processing...' : '⏹ Check Out & End Shift'}
                                </button>
                            ) : (
                                <div className="p-6 bg-green-500/10 rounded-3xl border border-green-500/20 text-green-600 font-black text-sm uppercase tracking-widest">Shift Completed ✅</div>
                            )}
                        </div>

                        {/* Location Intelligence Section */}
                        <div 
                            style={{ backgroundColor: 'var(--panel-card)' }}
                            className="rounded-[32px] shadow-2xl p-8 border border-white/40 dark:border-white/5 flex-grow"
                        >
                             <h3 className="text-xs font-black mb-6 flex items-center gap-2 text-gray-800 dark:text-white uppercase border-b border-gray-100 dark:border-white/5 pb-4">
                                <MapPinIcon className="w-4 h-4 text-[#003875] dark:text-[#FFD500]" /> Location Intelligence
                             </h3>

                             {!user.late_long ? (
                                 <div className="text-center py-6 opacity-40 italic text-xs font-bold text-gray-500">No HQ Registered</div>
                             ) : (
                                 <div className="space-y-5">
                                     {/* Registered Bases */}
                                     {registeredPoints && registeredPoints.length > 0 && (
                                         <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-white/5 space-y-3 max-h-48 overflow-y-auto no-scrollbar shadow-inner">
                                             <div className="sticky top-0 bg-gray-50 dark:bg-slate-900/50 pb-1 z-10 text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                                 <span>Registered Bases ({registeredPoints.length})</span>
                                                 {liveLocation && <span>Distance</span>}
                                             </div>
                                             {registeredPoints.map((pt, idx) => {
                                                 const ptDist = liveLocation ? calculateDistance(liveLocation.lat, liveLocation.lng, pt.lat, pt.long) : null;
                                                 const isNearest = closestPoint && pt.lat === closestPoint.lat && pt.long === closestPoint.long;
                                                 
                                                 return (
                                                     <div key={idx} className={`flex items-center justify-between p-2 rounded-xl border transition-all ${isNearest ? 'border-[#003875]/20 bg-[#003875]/5 dark:border-[#FFD500]/20 dark:bg-[#FFD500]/10 shadow-sm' : 'border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
                                                         <div className="flex items-center gap-2">
                                                             <MapPinIcon className={`w-4 h-4 shrink-0 ${isNearest ? 'text-[#003875] dark:text-[#FFD500]' : 'text-gray-400'}`} />
                                                             <div>
                                                                 <div className={`text-[10px] font-bold uppercase tracking-wider ${isNearest ? 'text-[#003875] dark:text-[#FFD500]' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                     {pt.name || `Location ${idx + 1}`}
                                                                     {isNearest && <span className="ml-1 text-[8px] bg-[#003875] text-white dark:bg-[#FFD500] dark:text-[#003875] px-1 py-0.5 rounded uppercase font-black">Closest</span>}
                                                                 </div>
                                                                 <div className="text-[8px] font-mono font-bold text-gray-500 opacity-70">
                                                                     {pt.lat.toFixed(5)}, {pt.long.toFixed(5)}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                         
                                                         {ptDist !== null && (
                                                             <div className={`text-xs font-black tracking-tighter ${ptDist <= rangeThreshold ? 'text-green-500' : 'text-gray-400'}`}>
                                                                 {Math.round(ptDist)}m
                                                             </div>
                                                         )}
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     )}

                                     {/* Current Actual */}
                                     {liveLocation && (
                                         <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-white/5 text-center shadow-inner">
                                             <div className="inline-flex items-center gap-2 mb-2 bg-green-500/10 px-3 py-1 rounded-full text-green-600 border border-green-500/20">
                                                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                 <span className="text-[8px] font-black uppercase tracking-widest">Live GPS Active</span>
                                             </div>
                                             <div className="flex justify-center gap-6">
                                                 <div className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300">
                                                     <span className="text-gray-400 mr-1">LAT</span> {liveLocation.lat.toFixed(6)}
                                                 </div>
                                                 <div className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300">
                                                     <span className="text-gray-400 mr-1">LNG</span> {liveLocation.lng.toFixed(6)}
                                                 </div>
                                             </div>
                                         </div>
                                     )}

                                     {/* Big Distance Display */}
                                     <div className="text-center py-4 border-t border-b border-gray-100 dark:border-white/5 my-2">
                                         <div className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Nearest Location Gap</div>
                                         <div className={`text-6xl font-black tracking-tighter ${isInRange ? 'text-green-500' : 'text-red-500'} drop-shadow-sm`}>
                                             {distance !== null ? `${Math.round(distance)}m` : '...'}
                                         </div>
                                         {isInRange && (
                                             <div className="text-[10px] font-black uppercase tracking-[0.25em] mt-3 py-1.5 px-4 rounded-full inline-block bg-green-500/10 text-green-600 border border-green-500/20">
                                                 In Range ✓
                                             </div>
                                         )}
                                     </div>

                                     {/* Action Buttons */}
                                     <div className="flex flex-col gap-2 mt-2">
                                         <button onClick={refreshLocationManual} className="w-full py-3 bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2 transition-all shadow-sm">
                                             <ArrowPathIcon className="w-4 h-4" />
                                             Refresh Location Sync
                                         </button>
                                         
                                         {liveLocation && closestPoint && !isInRange && (
                                            <a 
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${closestPoint.lat},${closestPoint.long}`} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="w-full py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-2xl border border-blue-200 dark:border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 transition-all shadow-sm"
                                            >
                                                <MapPinIcon className="w-4 h-4" />
                                                Find the nearest location gap on Google map
                                            </a>
                                         )}
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Other tabs follow similar premium patterns... (LEAVE, MASTER) */}
            {activeTab === 'LEAVE' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     {/* Leave Form */}
                     <div 
                        style={{ backgroundColor: 'var(--panel-card)' }}
                        className="rounded-[32px] p-8 shadow-xl border border-white/10 h-fit"
                     >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-tighter">
                                {editingLeave ? 'Edit Leave Request' : 'Submit Leave Request'}
                            </h3>
                            {editingLeave && (
                                <button 
                                    onClick={() => { setEditingLeave(null); setLeaveForm({ startDate: '', endDate: '', reason: '', responsibility1: '', responsibility2: '', responsibility3: '' }); }}
                                    className="text-[10px] font-black uppercase text-red-500 hover:underline"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleLeaveSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <CustomDateTimePicker label="From Date" dateOnly value={leaveForm.startDate} onChange={v => setLeaveForm({...leaveForm, startDate: v})} required />
                                <CustomDateTimePicker label="To Date" dateOnly value={leaveForm.endDate} onChange={v => setLeaveForm({...leaveForm, endDate: v})} required />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Responsibility Selection</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[1, 2, 3].map(num => (
                                        <div key={num} className={num === 3 ? "sm:col-span-2" : ""}>
                                            <SearchableSelect
                                                options={masterData?.users
                                                    .filter(u => String(u.id) !== String(user.id))
                                                    .map(u => ({ id: u.id, label: u.full_name || u.username })) || []}
                                                value={(leaveForm as any)[`responsibility${num}`]}
                                                onChange={v => setLeaveForm({...leaveForm, [`responsibility${num}`]: v})}
                                                placeholder={num === 1 ? 'Primary Resp.' : num === 2 ? 'Secondary Resp.' : 'Tertiary Resp.'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Reason</label>
                                <textarea 
                                    className="w-full h-24 p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-white/5 focus:border-[#FFD500] outline-none text-xs font-medium transition-all"
                                    value={leaveForm.reason}
                                    onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                                    required
                                    placeholder="Enter detailed reason here..."
                                />
                            </div>
                            <button type="submit" className="w-full py-4 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-[#003875]/10 hover:-translate-y-1 transition-all">
                                {editingLeave ? 'Update Leave Request' : 'Submit Application'}
                            </button>
                        </form>
                     </div>

                     {/* Leave History */}
                     <div className="lg:col-span-2 space-y-4">
                         {leaves.map(lv => {
                            const isRequester = String(lv.userId) === String(user.id);
                            const isListedColleague = [lv.responsibility1, lv.responsibility2, lv.responsibility3].some(id => String(id) === String(user.id));
                            const hasAccepted = lv.acceptedBy && lv.acceptedBy.trim() !== "";
                            const amIAcceptor = lv.acceptedBy === user.username;

                            return (
                                <div 
                                    key={lv.id} 
                                    style={{ backgroundColor: 'var(--panel-card)' }}
                                    className="p-4 rounded-[20px] border border-white/10 hover:border-[#FFD500]/30 group transition-all shadow-sm relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                         <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedLeave(lv); fetchRemarks(lv.id); }}>
                                             <div className="w-9 h-9 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-gray-500 text-xs">
                                                 {lv.userName.charAt(0)}
                                             </div>
                                             <div>
                                                 <div className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">{lv.userName}</div>
                                                 <div className="text-[9px] font-bold text-gray-400 uppercase">{formatDateMMM(lv.startDate)} - {formatDateMMM(lv.endDate)}</div>
                                             </div>
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                                lv.status === 'Approved' ? 'bg-green-500 text-white' : 
                                                lv.status === 'Rejected' ? 'bg-red-500 text-white' : 
                                                'bg-[#FFD500] text-black shadow-[#FFD500]/20'
                                            }`}>
                                                {lv.status}
                                            </div>

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedLeave(lv); fetchRemarks(lv.id); }}
                                                className="p-1.5 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-600 rounded-lg transition-all relative flex items-center justify-center border border-purple-100 dark:border-purple-500/20 shadow-sm"
                                                title="View Discussion"
                                            >
                                                <CommentBtnIcon className="w-3.5 h-3.5" />
                                                <span className="ml-1 text-[8px] font-black">{remarks.filter(r => r.leaveId === lv.id).length || 0}</span>
                                            </button>

                                            {isRequester && lv.status === 'Pending' && (
                                                <div className="flex items-center gap-1.5">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingLeave(lv);
                                                            setLeaveForm({
                                                                startDate: lv.startDate,
                                                                endDate: lv.endDate,
                                                                reason: lv.reason,
                                                                responsibility1: lv.responsibility1 || '',
                                                                responsibility2: lv.responsibility2 || '',
                                                                responsibility3: lv.responsibility3 || ''
                                                            });
                                                        }}
                                                        className="p-1.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 text-blue-500 rounded-lg transition-all border border-blue-100 dark:border-blue-500/20"
                                                        title="Edit Leave"
                                                    >
                                                        <PencilSquareIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleLeaveDelete(lv.id); }}
                                                        className="p-1.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 text-red-500 rounded-lg transition-all border border-red-100 dark:border-red-500/20"
                                                        title="Delete Leave"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                         </div>
                                    </div>
                                    
                                    <div className="mb-3 pl-1">
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 italic opacity-80 line-clamp-1">"{lv.reason}"</p>
                                    </div>

                                    {/* Responsibility Section */}
                                    <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center gap-2">
                                        {[lv.responsibility1, lv.responsibility2, lv.responsibility3].filter(Boolean).map((rid, idx) => {
                                            const rUser = masterData?.users.find(u => String(u.id) === String(rid));
                                            const colors = ['bg-purple-50 text-purple-600 border-purple-100', 'bg-blue-50 text-blue-600 border-blue-100', 'bg-orange-50 text-orange-600 border-orange-100'];
                                            return (
                                                <div key={idx} className={`px-3 py-1 border rounded-full text-[8px] font-black uppercase ${colors[idx % colors.length]}`}>
                                                    RESPONSIBILITY: {rUser?.full_name || rUser?.username || 'USER'}
                                                </div>
                                            );
                                        })}
                                        
                                        <div className="flex-1"></div>

                                         {/* Admin Quick Actions */}
                                         {user.role === 'Admin' && lv.status === 'Pending' && (
                                             <div className="flex items-center gap-2 mr-2">
                                                 <button 
                                                     onClick={(e) => { e.stopPropagation(); handleStatusUpdate('Approved', lv.id); }}
                                                     className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-green-500/10 transition-all active:scale-95"
                                                 >
                                                     Authorize
                                                 </button>
                                                 <button 
                                                     onClick={(e) => { e.stopPropagation(); handleStatusUpdate('Rejected', lv.id); }}
                                                     className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-red-500/10 transition-all active:scale-95"
                                                 >
                                                     Decline
                                                 </button>
                                             </div>
                                         )}

                                         {isListedColleague && !hasAccepted && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAcceptResponsibility(lv.id); }}
                                                className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-green-500/10 transition-all active:scale-95"
                                            >
                                                I'll take responsibility
                                            </button>
                                        )}
                                        {hasAccepted && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-full">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                                <span className="text-[8px] font-black uppercase text-blue-600">Handled by {lv.acceptedBy}</span>
                                            </div>
                                        )}
                                    </div>


                                    {/* Glass Decor */}
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#FFD500]/5 rounded-full blur-xl group-hover:bg-[#FFD500]/10 transition-colors"></div>
                                </div>
                            );
                        })}
                     </div>
                </div>
            )}

            {/* MASTER LIST */}
            {activeTab === 'ATTENDANCE_MASTER' && (
                <div 
                    style={{ backgroundColor: 'var(--panel-card)' }}
                    className="rounded-[32px] p-4 md:p-8 shadow-xl border border-white/10 overflow-x-auto min-h-[600px]"
                >
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-gray-100 dark:border-white/5">
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronLeftIcon className="w-5 h-5 text-gray-500" /></button>
                            <span className="text-sm font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest w-32 text-center">
                                {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                            </span>
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronRightIcon className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <input 
                            type="text" 
                            placeholder="SEARCH EMPLOYEE..." 
                            value={masterSearch}
                            onChange={(e) => setMasterSearch(e.target.value)}
                            className="w-full md:w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-full px-4 py-2.5 text-xs font-black placeholder-gray-400 focus:outline-none focus:border-[#FFD500] transition-colors shadow-sm"
                        />
                    </div>
                    {!masterData ? (
                        <div className="text-gray-400 text-sm animate-pulse font-black text-center py-20">SYNCING DATA...</div>
                    ) : (
                        <table className="w-full text-left border-separate border-spacing-y-4 min-w-[1000px] font-serif">
                            <thead>
                                <tr className="text-sm font-medium text-gray-500 uppercase tracking-widest text-center">
                                    <th className="px-6 py-2 text-left">Employee Details</th>
                                    <th className="px-4 py-2">Presents</th>
                                    <th className="px-4 py-2">Absents</th>
                                    <th className="px-4 py-2">Leaves</th>
                                    <th className="px-4 py-2">Half Day</th>
                                    <th className="px-4 py-2">Total Hours</th>
                                    <th className="px-4 py-2">System Score</th>
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {masterData.users
                                    .filter(u => user?.role?.toLowerCase() === 'admin' || String(u.id) === String(user.id))
                                    .filter(u => (u.full_name || u.username)?.toLowerCase().includes(masterSearch.toLowerCase()) || String(u.id).toLowerCase().includes(masterSearch.toLowerCase()))
                                    .map(u => {
                                     const monthAtt = masterData?.attendance.filter(a => String(a.userId) === String(u.id)) || [];
                                     const uLeaves = masterData?.leaves?.filter((l:any) => String(l.userId) === String(u.id) && l.status === 'Approved') || [];
                                     
                                     // Quick summary logic for current month
                                     const year = currentDate.getFullYear();
                                     const month = currentDate.getMonth();
                                     const daysInMonth = new Date(year, month + 1, 0).getDate();
                                     const todayStr = getIstDateString();
                                     
                                     let presents = 0;
                                     let absents = 0;
                                     let leavesCount = 0;
                                     let halfDays = 0;
                                     let totalHours = 0;
                                     let totalWorkingDays = 0;

                                     // Generate day cells
                                     const dayCells = [];
                                     for (let d = 1; d <= daysInMonth; d++) {
                                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const isSunday = new Date(year, month, d).getDay() === 0;
                                        
                                        if (!isSunday) totalWorkingDays++;

                                        const record = monthAtt.find(h => normalizeDateSheet(h.date) === dateStr);
                                        const leave = uLeaves.find((l:any) => {
                                            const start = normalizeDateSheet(l.startDate);
                                            const end = normalizeDateSheet(l.endDate);
                                            return dateStr >= start && dateStr <= end;
                                        });

                                        let statusChar = '-';
                                        let statusColor = 'text-gray-300';
                                        let dotColor = null;
                                        let dotText = '';

                                        if (isSunday) {
                                            statusChar = 'SUN';
                                            statusColor = 'text-gray-300 font-bold';
                                        } else if (leave) {
                                            leavesCount++;
                                            statusChar = 'L';
                                            statusColor = 'text-[#FFD500] font-black';
                                        } else if (record?.inTime) {
                                            let hours = 0;
                                            if (record.outTime) {
                                                hours = (new Date(record.outTime).getTime() - new Date(record.inTime).getTime()) / (1000 * 60 * 60);
                                                totalHours += hours;
                                            }
                                            
                                            // Half day occurs if checked out AND total logged time <= 4 hours
                                            if (record.outTime && hours <= 4) {
                                                halfDays++;
                                                statusChar = 'HD';
                                                statusColor = 'text-orange-500 font-black';
                                                dotColor = 'bg-orange-500';
                                                dotText = '0.5';
                                            } else {
                                                presents++;
                                                statusChar = 'P';
                                                statusColor = 'text-green-500 font-black';
                                                dotColor = 'bg-green-500';
                                                dotText = '1';
                                            }
                                        } else if (dateStr < todayStr) {
                                            absents++;
                                            statusChar = 'A';
                                            statusColor = 'text-red-500 font-black';
                                            dotColor = 'bg-red-500';
                                            dotText = '-1';
                                        }

                                        dayCells.push({ d, statusChar, statusColor, dotColor, dotText });
                                     }

                                     const monthlyScore = (presents * 1) + (halfDays * 0.5) - (absents * 1);
                                     const cumulativePercent = totalWorkingDays > 0 ? ((monthlyScore / totalWorkingDays) * 100).toFixed(0) : 0;
                                     const isExpanded = expandedUserId === u.id;

                                     return (
                                        <React.Fragment key={u.id}>
                                            <tr className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm relative z-10 hover:shadow-md transition-shadow">
                                                <td className="px-6 py-4 rounded-l-[24px]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-[#FFD500] flex items-center justify-center font-black text-white shadow-sm overflow-hidden shrink-0">
                                                            {u.image_url ? <img src={u.image_url} alt="" className="w-full h-full object-cover" /> : <UserBtnIcon className="w-5 h-5 text-white" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-[#003875] dark:text-white uppercase tracking-tighter">{u.full_name || u.username}</div>
                                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {String(u.id).substring(0, 6)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="bg-green-100 text-green-600 dark:bg-green-500/20 px-4 py-2 rounded-full text-sm font-black">{presents}</span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="bg-red-100 text-red-600 dark:bg-red-500/20 px-4 py-2 rounded-full text-sm font-black">{absents}</span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 px-4 py-2 rounded-full text-sm font-black">{leavesCount}</span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="bg-orange-100 text-orange-600 dark:bg-orange-500/20 px-4 py-2 rounded-full text-sm font-black">{halfDays}</span>
                                                </td>
                                                <td className="px-4 py-4 text-center text-sm font-black text-[#FFD500]">
                                                    {totalHours.toFixed(1)}h
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="bg-red-50 text-red-500 dark:bg-red-500/10 px-4 py-2 rounded-full text-sm font-black">{cumulativePercent}%</span>
                                                </td>
                                                <td className="px-4 py-4 text-center rounded-r-[24px]">
                                                    <button 
                                                        onClick={() => setExpandedUserId(isExpanded ? null : u.id)} 
                                                        className="w-8 h-8 rounded-[12px] bg-[#FFD500] hover:bg-[#e6c000] text-white dark:text-black flex items-center justify-center font-black text-xl transition-all mx-auto shadow-sm shadow-[#FFD500]/50 active:scale-95"
                                                    >
                                                        {isExpanded ? '-' : '+'}
                                                    </button>
                                                </td>
                                            </tr>
                                            
                                            {isExpanded && (
                                                <tr className="animate-in fade-in slide-in-from-top-4 duration-200">
                                                    <td colSpan={8} className="px-2 md:px-8 pb-8 pt-4">
                                                        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 md:p-8 border border-gray-100 dark:border-white/5 shadow-2xl">
                                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                                                <h4 className="text-[#FFD500] font-black flex items-center gap-3 uppercase tracking-tighter text-lg">
                                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                                    </svg>
                                                                    Performance Analysis
                                                                </h4>
                                                                <div className="flex gap-8 text-right bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-2xl w-full md:w-auto overflow-hidden">
                                                                    <div className="flex-1 md:flex-none">
                                                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Monthly Points</div>
                                                                        <div className="text-xl font-black text-[#003875] dark:text-white">{monthlyScore.toFixed(1)}</div>
                                                                    </div>
                                                                    <div className="w-[1px] bg-gray-200 dark:bg-white/10 shrink-0"></div>
                                                                    <div className="flex-1 md:flex-none">
                                                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Cumulative Score</div>
                                                                        <div className="text-xl font-black text-[#FFD500]">{cumulativePercent}%</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-3">
                                                                {dayCells.map((c, idx) => (
                                                                    <div key={idx} className="relative bg-gray-50/50 dark:bg-slate-900 border border-gray-100 dark:border-white/5 rounded-[20px] p-3 flex flex-col items-center justify-center min-h-[72px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow group">
                                                                        {c.dotColor && <div className={`absolute -top-2 -right-2 w-auto min-w-[22px] h-5 px-1.5 rounded-full ${c.dotColor} border-[3px] border-white dark:border-slate-800 text-[10px] text-white flex items-center justify-center font-black shadow-sm z-10 scale-105`}>{c.dotText}</div>}
                                                                        <div className="text-[11px] font-black text-gray-800 dark:text-gray-200 mb-2 opacity-80">{c.d}</div>
                                                                        <div className={`text-[11px] font-black uppercase tracking-wider ${c.statusColor}`}>{c.statusChar}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                     );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* REPORT LIST */}
            {activeTab === 'REPORT' && (
                <div className="bg-[#FCF9F0] dark:bg-slate-800 rounded-[32px] shadow-xl border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
                    {/* Header Top */}
                    <div className="p-6 md:p-8 border-b border-gray-100 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-[#FFD500] uppercase tracking-tighter flex items-center gap-3">
                                <ClockIcon className="w-8 h-8" /> Attendance Comprehensive Report
                            </h3>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Matrix View &bull; Performance Analytics</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <input 
                                type="text" 
                                placeholder="Search by name..." 
                                value={masterSearch}
                                onChange={(e) => setMasterSearch(e.target.value)}
                                className="w-full md:w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-full px-4 py-2.5 text-xs font-black placeholder-gray-400 focus:outline-none focus:border-[#FFD500] shadow-sm"
                            />
                            
                            {/* Toggle Mode */}
                            <div className="flex items-center bg-white dark:bg-slate-900 rounded-full p-1 border border-gray-200 dark:border-white/10 shadow-sm">
                                <button onClick={() => setReportViewMode('STATUS')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${reportViewMode === 'STATUS' ? 'bg-[#FFD500] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Status</button>
                                <button onClick={() => setReportViewMode('TIME')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${reportViewMode === 'TIME' ? 'bg-[#FFD500] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Time</button>
                            </div>

                            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-white/5">
                                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronLeftIcon className="w-4 h-4 text-[#FFD500]" /></button>
                                <span className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tighter w-32 text-center">
                                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronRightIcon className="w-4 h-4 text-[#FFD500]" /></button>
                            </div>
                        </div>
                    </div>

                    {!masterData ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm animate-pulse font-black">SYNCING DATA...</div>
                    ) : (
                        <div 
                           style={{ backgroundColor: 'var(--panel-card)', borderColor: 'var(--panel-border)' }}
                           className="flex-1 overflow-auto custom-scrollbar relative"
                         >
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead>
                                    <tr>
                                        <th 
                                          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--panel-border)' }}
                                          className="sticky top-0 left-0 z-50 p-4 min-w-[200px] border-b border-r text-xs font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest flex flex-col justify-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                                        >USER DETAILS / DAYS</th>
                                        {(() => {
                                            const year = currentDate.getFullYear();
                                            const month = currentDate.getMonth();
                                            const days = new Date(year, month + 1, 0).getDate();
                                            return Array.from({length: days}, (_, i) => i + 1).map(d => (
                                                <th 
                                                  key={d} 
                                                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--panel-border)' }}
                                                  className="sticky top-0 z-40 p-3 border-b border-r text-center text-xs font-black text-gray-800 dark:text-white"
                                                >{d}</th>
                                            ));
                                        })()}
                                    </tr>
                                </thead>
                                <tbody>
                                    {masterData.users
                                        .filter(u => user?.role?.toLowerCase() === 'admin' || String(u.id) === String(user.id))
                                        .filter(u => (u.full_name || u.username)?.toLowerCase().includes(masterSearch.toLowerCase()) || String(u.id).toLowerCase().includes(masterSearch.toLowerCase()))
                                        .map(u => {
                                            const monthAtt = masterData?.attendance.filter(a => String(a.userId) === String(u.id)) || [];
                                            const uLeaves = masterData?.leaves?.filter((l:any) => String(l.userId) === String(u.id) && l.status === 'Approved') || [];
                                            
                                            const year = currentDate.getFullYear();
                                            const month = currentDate.getMonth();
                                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                                            const todayStr = getIstDateString();
                                            
                                            let presents = 0, absents = 0, leavesCount = 0, halfDays = 0, totalWorkingDays = 0;

                                            const dayCells = [];
                                            for (let d = 1; d <= daysInMonth; d++) {
                                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                                const isSunday = new Date(year, month, d).getDay() === 0;
                                                
                                                if (!isSunday) totalWorkingDays++;

                                                const record = monthAtt.find(h => normalizeDateSheet(h.date) === dateStr);
                                                const leave = uLeaves.find((l:any) => {
                                                    const start = normalizeDateSheet(l.startDate);
                                                    const end = normalizeDateSheet(l.endDate);
                                                    return dateStr >= start && dateStr <= end;
                                                });

                                                let statusChar = '-';
                                                let statusColor = 'text-gray-300';
                                                let dotText = '';
                                                let rawIn = record?.inTime;
                                                let rawOut = record?.outTime;

                                                if (isSunday) {
                                                    statusChar = 'SUN';
                                                    statusColor = 'text-gray-800 dark:text-gray-200 font-bold';
                                                } else if (leave) {
                                                    leavesCount++;
                                                    statusChar = 'L';
                                                    statusColor = 'text-[#FFD500] font-black';
                                                } else if (rawIn) {
                                                    let hours = 0;
                                                    if (rawOut) hours = (new Date(rawOut).getTime() - new Date(rawIn).getTime()) / 3600000;
                                                    if (rawOut && hours <= 4) {
                                                        halfDays++;
                                                        statusChar = 'HD';
                                                        statusColor = 'text-orange-500 font-black';
                                                        dotText = '+0.5';
                                                    } else {
                                                        presents++;
                                                        statusChar = 'P';
                                                        statusColor = 'text-green-500 font-black';
                                                        dotText = '+1';
                                                    }
                                                } else if (dateStr < todayStr) {
                                                    absents++;
                                                    statusChar = 'A';
                                                    statusColor = 'text-red-500 font-black';
                                                    dotText = '-1';
                                                }

                                                dayCells.push({ d, statusChar, statusColor, dotText, rawIn, rawOut });
                                            }

                                            const monthlyScore = (presents * 1) + (halfDays * 0.5) - (absents * 1);
                                            const cumP = totalWorkingDays > 0 ? ((monthlyScore / totalWorkingDays) * 100).toFixed(0) : "0";

                                            return (
                                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td 
                                                      style={{ backgroundColor: 'white', borderColor: 'var(--panel-border)' }}
                                                      className="sticky left-0 z-30 p-4 border-b border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div 
                                                              style={{ borderColor: 'var(--panel-border)' }}
                                                              className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border flex items-center justify-center font-black overflow-hidden shrink-0"
                                                            >
                                                                {u.image_url ? <img src={u.image_url} alt="" className="w-full h-full object-cover" /> : <UserBtnIcon className="w-5 h-5 text-[#FFD500]" />}
                                                            </div>
                                                            <div>
                                                                <div className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-tighter truncate w-32">{u.full_name || u.username}</div>
                                                                <div className="text-[10px] font-bold text-[#FFD500] uppercase mt-0.5">{cumP}%</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {dayCells.map((c, idx) => (
                                                        <td 
                                                          key={idx} 
                                                          style={{ borderColor: 'var(--panel-border)' }}
                                                          className="p-2 border-b border-r text-center min-w-[60px] align-middle"
                                                        >
                                                            {reportViewMode === 'STATUS' ? (
                                                                <div className="flex flex-col items-center justify-center gap-1">
                                                                    <div className={`text-xs font-black uppercase tracking-tighter ${c.statusColor}`}>{c.statusChar}</div>
                                                                    {c.dotText && (
                                                                         <div className={`text-[9px] font-black ${c.statusChar === 'P' ? 'text-green-500' : c.statusChar === 'HD' ? 'text-orange-500' : 'text-red-500'}`}>
                                                                            {c.dotText}
                                                                         </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                                    {c.statusChar === 'SUN' || c.statusChar === 'L' || c.statusChar === 'A' || c.statusChar === '-' ? (
                                                                        <div className={`text-xs font-black uppercase tracking-tighter ${c.statusColor}`}>{c.statusChar}</div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400">{c.rawIn ? formatTimeIST(c.rawIn) : '-'}</div>
                                                                            <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400">{c.rawOut ? formatTimeIST(c.rawOut) : '-'}</div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Leave Detail Modal */}
            {selectedLeave && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                     <div className="bg-[#FCF9F0] dark:bg-slate-800 rounded-[28px] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10 animate-in zoom-in duration-200">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#003875]/5">
                             <h4 className="font-black text-sm uppercase tracking-widest text-[#003875] dark:text-[#FFD500]">Lifecycle Detail: {selectedLeave.id}</h4>
                             <button onClick={() => setSelectedLeave(null)} className="text-gray-400 hover:text-black dark:hover:text-white text-xl font-black flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div className="space-y-4">
                                <div className="p-5 bg-[#003875] rounded-[20px] text-white shadow-xl">
                                    <div className="text-[9px] font-black uppercase opacity-60 mb-1">Request Origin</div>
                                    <div className="text-xl font-black tracking-tighter mb-3">{selectedLeave.userName}</div>
                                    <div className="flex gap-4">
                                        <div>
                                            <div className="text-[8px] font-black uppercase opacity-60">From</div>
                                            <div className="text-xs font-bold">{formatDateIST(selectedLeave.startDate)}</div>
                                        </div>
                                        <div className="w-0.5 h-6 bg-white/20"></div>
                                        <div>
                                            <div className="text-[8px] font-black uppercase opacity-60">To</div>
                                            <div className="text-xs font-bold">{formatDateIST(selectedLeave.endDate)}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 bg-gray-50 dark:bg-slate-900 rounded-[20px] border border-white/5">
                                    <div className="text-[9px] font-black uppercase text-gray-400 mb-1">Internal Reason</div>
                                    <p className="text-xs font-medium italic">"{selectedLeave.reason}"</p>
                                </div>
                             </div>

                             <div className="flex flex-col h-full space-y-3">
                                <div className="flex-1 bg-gray-50 dark:bg-slate-900 rounded-[20px] p-5 border border-white/5 overflow-y-auto space-y-3 max-h-[300px]">
                                    <div className="text-[9px] font-black uppercase text-gray-400 mb-2">Discussion Trail</div>
                                    {remarks.map(r => (
                                        <div key={r.id} className={`p-3 rounded-2xl text-[10px] ${r.userName === user.username ? 'bg-[#003875] text-white ml-6 shadow-md' : 'bg-white dark:bg-slate-800 mr-6'} border border-white/5`}>
                                            <div className="font-black mb-1 flex justify-between items-center opacity-60">
                                                <span>{r.userName}</span>
                                                <span className="text-[7px]">{formatTimeIST(r.createdAt)}</span>
                                            </div>
                                            {r.comment}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-[16px] border border-white/10 shadow-sm shrink-0">
                                    <input 
                                        className="flex-1 px-3 py-1.5 bg-transparent outline-none text-[10px] font-bold"
                                        placeholder="Add comment..."
                                        value={newRemark}
                                        onChange={e => setNewRemark(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddRemark()}
                                    />
                                    <button onClick={handleAddRemark} className="p-2.5 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black rounded-xl active:scale-95 transition-transform">
                                        <CommentBtnIcon className="w-4 h-4" />
                                    </button>
                                </div>
                             </div>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-900/50 flex gap-4 shrink-0">
                            {user?.role?.toLowerCase() === 'admin' && selectedLeave.status === 'Pending' ? (
                                <>
                                    <button onClick={() => handleStatusUpdate('Approved')} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all">Authorize</button>
                                    <button onClick={() => handleStatusUpdate('Rejected')} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all">Decline</button>
                                </>
                            ) : (
                                <div className={`flex-1 py-3 text-center rounded-xl font-black text-[10px] uppercase tracking-widest ${selectedLeave.status === 'Approved' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : selectedLeave.status === 'Rejected' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-amber-400/10 text-amber-500 border border-amber-400/20'}`}>
                                    Status: {selectedLeave.status}
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            )}
            {/* Camera Modal */}
            {showCameraMode && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] w-full max-w-sm flex flex-col items-center relative shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-lg font-black uppercase text-[#003875] dark:text-[#FFD500] mb-4">
                            Selfie Verification Required
                        </h3>
                        <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-6 shadow-inner border border-gray-100 dark:border-white/10">
                            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" playsInline muted autoPlay />
                            <div className="absolute inset-x-8 inset-y-16 border-2 border-white/30 rounded-[100px] border-dashed animate-pulse pointer-events-none" />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={() => setShowCameraMode(null)} 
                                className="flex-1 py-4 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition hover:bg-gray-300 dark:hover:bg-slate-600"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={capturePhotoAndSubmit} 
                                className="flex-[2] py-4 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg hover:-translate-y-1"
                            >
                                📸 Capture
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Leave Request"
                message="Are you sure you want to delete this leave request? This action will also remove all associated remarks and cannot be undone."
                confirmLabel="Delete Request"
                type="danger"
            />
        </div>
    );
}
