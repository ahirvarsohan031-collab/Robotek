"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { 
  UsersIcon, 
  MapPinIcon, 
  UserMinusIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import { 
  CompactWelcome,
  CompactScore,
  CompactBirthdayCard,
  StatusTile,
  QuickActionSquare,
  HighightedCalendar,
  CompactTable,
  BirthdayCelebrationModal,
  UpcomingMeetingsPanel,
  CompactPartyBirthdayCard
} from "./DashboardComponents";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher, {
    refreshInterval: 30000 
  });

  const { data: attendanceData } = useSWR(userId ? `/api/attendance?userId=${userId}` : null, fetcher);

  const firstName = (session?.user as any)?.username || session?.user?.name?.split(' ')[0] || "Guest";
  const userRole = (session?.user as any)?.role || 'User';
  const isAdmin = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'EA';

  // Calculate Monthly Averages
  let avgIn = "--:--";
  let avgOut = "--:--";

  if (attendanceData?.history) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthRecords = attendanceData.history.filter((r: any) => {
      const d = new Date(r.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const calculateAvgTime = (records: any[], type: 'inTime' | 'outTime') => {
      const times = records
        .map(r => r[type] ? new Date(r[type]) : null)
        .filter(t => t !== null) as Date[];
      
      if (times.length === 0) return null;

      const totalMinutes = times.reduce((acc, t) => acc + (t.getHours() * 60 + t.getMinutes()), 0);
      const avgMinutes = Math.round(totalMinutes / times.length);
      const h = Math.floor(avgMinutes / 60);
      const m = avgMinutes % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    avgIn = calculateAvgTime(monthRecords, 'inTime') || "--:--";
    avgOut = calculateAvgTime(monthRecords, 'outTime') || "--:--";
  }

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px] text-rose-500 font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-950/20 rounded-3xl border border-rose-100 italic">
      Synchronizing System Core...
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-10 px-4">
      
      {/* ROW 1: MISSION CONTROL HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-2 self-center">
          <CompactWelcome firstName={firstName} role={userRole} />
        </div>
        <div className="xl:col-span-2">
            {!isLoading && data && <CompactScore score={data.score.score} total={data.score.total} label="FAILURE SCORE (GAP)" isNegative={true} />}
        </div>
        <div className="xl:col-span-2">
            {!isLoading && data && <CompactScore score={data.score.onTimeRate} total={data.score.completed} label="ACCURACY GAP" isNegative={true} />}
        </div>
        <div className="xl:col-span-3">
            {!isLoading && data && <CompactBirthdayCard birthdays={data.birthdays} />}
        </div>
        <div className="xl:col-span-3">
            {!isLoading && data && <CompactPartyBirthdayCard partyBirthdays={data.partyBirthdays} />}
        </div>
      </div>

      {/* Row 2: Status, Schedule, & Calendars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Metrics & Actions */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-4 auto-rows-max">
           <StatusTile label="Present" value={data?.summary?.totalIn || 0} icon={UsersIcon} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/30" />
           <StatusTile label="Absent" value={data?.summary?.outOfOffice || 0} icon={MapPinIcon} color="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-900/30" />
           <StatusTile label="On Leave" value={data?.summary?.onLeave || 0} icon={UserMinusIcon} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/30" />
           
           <QuickActionSquare label="New Ticket" href="/helpdesk/new" icon={PlusIcon} color="bg-[#003875] dark:bg-[#FFD500] dark:text-[#003875]" />
           <QuickActionSquare label="Apply Leave" href="/attendance/leave-request" icon={CalendarIcon} color="bg-rose-500" />
           <QuickActionSquare label="Attendance" href="/attendance" icon={ClockIcon} color="bg-emerald-500" />
        </div>

        {/* Middle Column: Upcoming Meetings */}
        <div className="lg:col-span-4">
            <UpcomingMeetingsPanel meetings={data?.upcomingMeetings} teamMembers={data?.teamMembers} />
        </div>

        {/* Right Column: Personal Calendar */}
        <div className="lg:col-span-4">
            <HighightedCalendar 
              history={attendanceData?.history || []} 
              leaveDates={data?.leaveDates || []} 
              avgIn={avgIn} 
              avgOut={avgOut} 
            />
        </div>
      </div>

      {/* ROW 3: DETAILED LOGS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CompactTable 
            title="Today's Logins"
            icon={UsersIcon}
            data={data?.attendanceToday || []}
            linkHref="/attendance"
            columns={[
                { label: 'User', key: 'userName', render: (row: any) => (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#003875]/10 dark:bg-[#FFD500]/10 flex items-center justify-center text-[10px] font-black">{row.userName.charAt(0)}</div>
                        <span className="truncate max-w-[80px]">{row.userName}</span>
                    </div>
                )},
                { label: 'In', key: 'inTime', className: 'text-center', render: (row: any) => (
                    <span className="text-emerald-500">{row.inTime ? new Date(row.inTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
                )},
                { label: 'Out', key: 'outTime', className: 'text-center', render: (row: any) => (
                    <span className="text-rose-500">{row.outTime ? new Date(row.outTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
                )}
            ]}
        />

        <CompactTable 
            title="Open/Pending Tickets"
            icon={ChatBubbleLeftRightIcon}
            data={data?.openTickets || []}
            linkHref="/tickets"
            columns={[
                { label: 'Topic/ID', key: 'id', render: (row: any) => (
                    <div className="flex flex-col">
                        <span className="truncate max-w-[120px] block font-black text-gray-900 dark:text-white uppercase leading-tight">{row.title}</span>
                        <span className="text-[7px] text-gray-400 font-mono italic">{row.id}</span>
                    </div>
                )},
                { label: 'Status', key: 'status', className: 'text-right', render: (row: any) => (
                    <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-black ${
                        row.status === 'Open' ? 'bg-[#003875]/10 text-[#003875]' : 'bg-amber-500/10 text-amber-500'
                    }`}>{row.status}</span>
                )}
            ]}
        />

        <CompactTable 
            title="Team Absence Power"
            icon={UserMinusIcon}
            data={data?.recentLeaves || []}
            linkHref="/leave"
            columns={[
                { label: 'User/Reason', key: 'userName', render: (row: any) => (
                    <div className="flex flex-col">
                        <span className="truncate max-w-[100px] text-gray-900 dark:text-white font-black uppercase text-[9px]">{isAdmin ? row.userName : row.reason}</span>
                        <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">{new Date(row.startDate).toLocaleDateString()}</span>
                    </div>
                )},
                { label: 'Status', key: 'status', className: 'text-right', render: (row: any) => (
                    <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase ${
                        row.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 font-black' : 
                        row.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 font-black' : 'bg-rose-500/10 text-rose-500 font-black'
                    }`}>{row.status}</span>
                )}
            ]}
        />
      </div>

      <BirthdayCelebrationModal birthdays={data?.birthdays} partyBirthdays={data?.partyBirthdays} currentUser={firstName} />
    </div>
  );
}
