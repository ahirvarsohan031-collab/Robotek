'use client';

import React, { useState, useEffect } from 'react';
import { ensureSessionId } from '@/utils/session';
import { useToast } from '@/components/ToastProvider';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import { getIstDateString } from '@/lib/dateUtils';
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
    ArrowRightCircleIcon
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
    return <ClockIcon className="w-4 h-4 text-yellow-500 text-amber-500" />;
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

    // Leave State
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });

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

    const handleAction = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
        setIsPageLoading(true);
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    action,
                    userId: user.id,
                    userName: user.username,
                    latitude: liveLocation?.lat,
                    longitude: liveLocation?.lng
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
        setIsPageLoading(true);
        try {
            const res = await fetch('/api/leave', {
                method: 'POST',
                body: JSON.stringify({ userId: user.id, userName: user.username, ...leaveForm })
            });
            if (!res.ok) throw new Error('Failed');

            setLeaveForm({ startDate: '', endDate: '', reason: '' });
            await fetchLeaves(user.id, user.role);
            success('Leave request submitted!');
        } catch (e) {
            error('Failed to submit leave');
        } finally {
            setIsPageLoading(false);
        }
    };

    const handleStatusUpdate = async (status: 'Approved' | 'Rejected') => {
        if (!selectedLeave) return;
        setIsPageLoading(true);
        try {
            const res = await fetch('/api/leave', {
                method: 'POST',
                body: JSON.stringify({ action: 'UPDATE_STATUS', leaveId: selectedLeave.id, status })
            });
            if (!res.ok) throw new Error('Failed');

            await fetchLeaves(user.id, user.role);
            setSelectedLeave(null);
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
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatTimeIST = (dateStr: string) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} className="h-24 md:h-32 bg-gray-50/20 dark:bg-slate-900/10" />);

        const todayStr = getIstDateString();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const record = history.find(h => h.date === dateStr);
            const isToday = dateStr === todayStr;
            const leave = leaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate && l.status === 'Approved');
            const isSunday = new Date(year, month, d).getDay() === 0;

            let color = 'bg-white/50 dark:bg-slate-800/30';
            if (isSunday) color = 'bg-gray-100 dark:bg-slate-900/50 opacity-40';
            else if (leave) color = 'bg-amber-400/80 text-white shadow-amber-200';
            else if (record?.inTime) {
                color = record.outTime ? 'bg-green-500/90 text-white shadow-green-200' : 'bg-[#FFD500] text-[#003875] shadow-amber-300';
            } else if (dateStr < todayStr) color = 'bg-red-500/80 text-white opacity-90';
            else if (isToday) color = 'border-2 border-[#003875] dark:border-[#FFD500] text-[#003875] dark:text-[#FFD500]';

            // Active check-in blinking animation
            const isActiveCheckIn = record?.inTime && !record?.outTime;

            days.push(
                <div key={d} className="flex flex-col items-center pt-2 h-24 md:h-32 group border border-white/5 transition-all">
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
        <div className="space-y-6">
            {/* Page Header with Integrated Pill Tabs */}
            <div className="flex flex-col lg:flex-row items-center gap-4 px-1">
                <div className="text-center lg:text-left shrink-0 min-w-0">
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate uppercase">Attendance & Leave</h1>
                    <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">Operational Personnel Tracking</p>
                </div>

                <div className="flex-1 w-full flex justify-center lg:justify-end">
                    <div className="rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all p-1 overflow-x-auto no-scrollbar max-w-full flex items-center gap-1.5">
                        {[
                            { id: 'ATTENDANCE', label: 'Dashboard', icon: CalendarBtnIcon },
                            { id: 'LEAVE', label: 'Leaves', icon: ArrowRightCircleIcon },
                            { id: 'ATTENDANCE_MASTER', label: 'Master List', icon: UserBtnIcon },
                            { id: 'REPORT', label: 'Analytics', icon: ClockIcon }
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
                    <div className="lg:col-span-3 bg-white/80 dark:bg-[#1E293B]/50 rounded-[32px] shadow-xl border border-white/40 dark:border-white/5 overflow-hidden backdrop-blur-xl">
                        <div className="p-6 flex justify-between items-center border-b border-white/10">
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronLeftIcon className="w-5 h-5" /></button>
                            <h2 className="text-xl font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-tighter">
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
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl p-8 border border-white/40 dark:border-white/5 text-center relative group overflow-hidden">
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
                                        onClick={() => handleAction('CHECK_IN')}
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
                                    onClick={() => handleAction('CHECK_OUT')} 
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
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl p-8 border border-white/40 dark:border-white/5 flex-grow">
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

                                     {/* Sync Button */}
                                     <button onClick={refreshLocationManual} className="w-full py-3 bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2 transition-all shadow-sm">
                                         <ArrowPathIcon className="w-4 h-4" />
                                         Refresh Location Sync
                                     </button>
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
                     <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-xl border border-white/10 h-fit">
                        <h3 className="text-xl font-black text-[#003875] dark:text-[#FFD500] mb-8 uppercase tracking-tighter">Submit Leave Request</h3>
                        <form onSubmit={handleLeaveSubmit} className="space-y-6">
                            <CustomDateTimePicker label="From Date" dateOnly value={leaveForm.startDate} onChange={v => setLeaveForm({...leaveForm, startDate: v})} required />
                            <CustomDateTimePicker label="To Date" dateOnly value={leaveForm.endDate} onChange={v => setLeaveForm({...leaveForm, endDate: v})} required />
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#003875]/60 dark:text-[#FFD500]/60 pl-1">Detailed Reason</label>
                                <textarea 
                                    className="w-full h-32 p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border-2 border-[#003875]/5 dark:border-white/5 focus:border-[#003875] dark:focus:border-[#FFD500] outline-none text-sm font-medium transition-all"
                                    value={leaveForm.reason}
                                    onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full py-4 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-[#003875]/20 hover:-translate-y-1 transition-all">Submit for Review</button>
                        </form>
                     </div>

                     {/* Leave History */}
                     <div className="lg:col-span-2 space-y-4">
                        {leaves.map(lv => (
                            <div key={lv.id} onClick={() => { setSelectedLeave(lv); fetchRemarks(lv.id); }} className="p-6 bg-white dark:bg-slate-800 rounded-[28px] border border-white/10 hover:border-[#003875]/30 cursor-pointer group transition-all shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-[#003875]/5 rounded-xl flex items-center justify-center font-black text-[#003875] dark:text-[#FFD500]">
                                             {lv.userName.charAt(0)}
                                         </div>
                                         <div>
                                             <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{lv.userName}</div>
                                             <div className="text-[10px] font-bold text-gray-500 uppercase">{formatDateIST(lv.startDate)} - {formatDateIST(lv.endDate)}</div>
                                         </div>
                                     </div>
                                     <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${lv.status === 'Approved' ? 'bg-green-500 text-white' : lv.status === 'Rejected' ? 'bg-red-500 text-white' : 'bg-amber-400 text-white'}`}>
                                         {lv.status}
                                     </div>
                                </div>
                                <p className="text-xs text-gray-500 italic line-clamp-1 opacity-70">"{lv.reason}"</p>
                            </div>
                        ))}
                     </div>
                </div>
            )}

            {/* MASTER LIST (Admin Only implementation would go here) */}
            {activeTab === 'ATTENDANCE_MASTER' && (
                <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-xl border border-white/10 overflow-x-auto min-h-[600px]">
                    <h3 className="text-2xl font-black text-[#003875] dark:text-[#FFD500] mb-8 uppercase tracking-tighter">Attendance Intelligence Matrix</h3>
                    {!masterData ? (
                        <div className="text-gray-400 text-sm animate-pulse">Syncing Global Data...</div>
                    ) : (
                        <table className="w-full text-left border-separate border-spacing-y-4">
                            <thead>
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Professional</th>
                                    <th className="px-6 py-4 text-center">Status Index</th>
                                    <th className="px-6 py-4 text-center">Hours Aggregate</th>
                                    <th className="px-6 py-4 text-right">Performance Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {masterData.users.filter(u => user.role === 'Admin' || u.id === user.id).map(u => {
                                     // Quick summary logic
                                     const monthAtt = masterData?.attendance.filter(a => String(a.userId) === String(u.id));
                                     const pCount = monthAtt.length;
                                     
                                     return (
                                         <tr key={u.id} className="bg-gray-50 dark:bg-slate-900/50 rounded-[20px] group hover:bg-[#003875]/5 transition-all">
                                             <td className="px-6 py-4 rounded-l-[20px]">
                                                 <div className="flex items-center gap-3">
                                                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-white/10 flex items-center justify-center font-black overflow-hidden shadow-sm">
                                                          {u.image_url ? <img src={u.image_url} alt="" className="w-full h-full object-cover" /> : <UserBtnIcon className="w-5 h-5 text-gray-400" />}
                                                      </div>
                                                      <div className="text-sm font-black text-gray-900 dark:text-white uppercase">{u.full_name || u.username}</div>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4 text-center">
                                                 <span className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-[10px] font-black">{pCount} Present</span>
                                             </td>
                                             <td className="px-6 py-4 text-center text-sm font-bold opacity-60">N/A</td>
                                             <td className="px-6 py-4 text-right rounded-r-[20px]">
                                                 <button onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)} className="p-2 text-[#003875] dark:text-[#FFD500]">
                                                     <ArrowRightCircleIcon className={`w-6 h-6 transition-transform ${expandedUserId === u.id ? 'rotate-90' : ''}`} />
                                                 </button>
                                             </td>
                                         </tr>
                                     );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Leave Detail Modal */}
            {selectedLeave && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                     <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10 animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#003875]/5">
                             <h4 className="font-black uppercase tracking-widest text-[#003875] dark:text-[#FFD500]">Lifecycle Detail: {selectedLeave.id}</h4>
                             <button onClick={() => setSelectedLeave(null)} className="text-gray-400 hover:text-black dark:hover:text-white text-2xl font-black">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-6">
                                <div className="p-6 bg-[#003875] rounded-[24px] text-white shadow-xl">
                                    <div className="text-[10px] font-black uppercase opacity-60 mb-2">Request Origin</div>
                                    <div className="text-2xl font-black tracking-tighter mb-4">{selectedLeave.userName}</div>
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
                                <div className="p-6 bg-gray-50 dark:bg-slate-900 rounded-[24px] border border-white/5">
                                    <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Internal Reason</div>
                                    <p className="text-sm font-medium italic">"{selectedLeave.reason}"</p>
                                </div>
                                {user.role === 'Admin' && selectedLeave.status === 'Pending' && (
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => handleStatusUpdate('Approved')} className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/20">Authorize</button>
                                        <button onClick={() => handleStatusUpdate('Rejected')} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">Decline</button>
                                    </div>
                                )}
                             </div>

                             <div className="flex flex-col h-full space-y-4">
                                <div className="flex-1 bg-gray-50 dark:bg-slate-900 rounded-[24px] p-6 border border-white/5 overflow-y-auto space-y-4 max-h-[400px]">
                                    <div className="text-[10px] font-black uppercase text-gray-400 mb-2">Discussion Trail</div>
                                    {remarks.map(r => (
                                        <div key={r.id} className={`p-4 rounded-2xl text-xs ${r.userName === user.username ? 'bg-[#003875] text-white ml-8 shadow-md' : 'bg-white dark:bg-slate-800 mr-8'} border border-white/5`}>
                                            <div className="font-black mb-1 flex justify-between items-center opacity-60">
                                                <span>{r.userName}</span>
                                                <span className="text-[8px]">{formatTimeIST(r.createdAt)}</span>
                                            </div>
                                            {r.comment}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 p-2 bg-white dark:bg-slate-800 rounded-[20px] border border-white/10 shadow-sm">
                                    <input 
                                        className="flex-1 px-4 py-2 bg-transparent outline-none text-xs font-bold"
                                        placeholder="Add comment..."
                                        value={newRemark}
                                        onChange={e => setNewRemark(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddRemark()}
                                    />
                                    <button onClick={handleAddRemark} className="p-3 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black rounded-xl active:scale-95 transition-transform">
                                        <CommentBtnIcon className="w-4 h-4" />
                                    </button>
                                </div>
                             </div>
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
}
