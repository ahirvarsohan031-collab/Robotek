import { NextRequest, NextResponse } from "next/server";
import { getAttendanceRecords, addAttendanceRecord, updateAttendanceRecord } from "@/lib/sheets/attendance-sheets";
import { getUsers } from "@/lib/google-sheets";
import { parseLatLong, getShortestDistance } from "@/lib/locationUtils";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

        const records = await getAttendanceRecords();
        const userRecords = records.filter(r => String(r.userId) === String(userId));

        // Normalize date: handle both DD/MM/YYYY and YYYY-MM-DD from Google Sheets
        const normalizeDate = (dateStr: string): string => {
            if (!dateStr) return '';
            // DD/MM/YYYY → YYYY-MM-DD
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const [dd, mm, yyyy] = dateStr.split('/');
                return `${yyyy}-${mm}-${dd}`;
            }
            // Already YYYY-MM-DD (possibly with time)
            return dateStr.split('T')[0];
        };

        // Get today in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        const todayStr = istNow.toISOString().split('T')[0]; // YYYY-MM-DD in IST

        // Normalize history dates for frontend
        const normalizedHistory = userRecords.map(r => ({
            ...r,
            date: normalizeDate(r.date)
        }));

        // Find today's record using normalized date
        const todayRecord = normalizedHistory.find(r => r.date === todayStr);

        let currentStatus: 'IDLE' | 'CHECKED_IN' | 'COMPLETED' = 'IDLE';
        let lastCheckIn = null;

        if (todayRecord) {
            if (todayRecord.outTime) {
                currentStatus = 'COMPLETED';
            } else if (todayRecord.inTime) {
                currentStatus = 'CHECKED_IN';
                lastCheckIn = todayRecord.inTime;
            }
        }

        return NextResponse.json({
            history: normalizedHistory,
            currentStatus,
            lastCheckIn
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { action, userId, userName, latitude, longitude } = await req.json();

        if (!userId || !action) return NextResponse.json({ error: "Missing data" }, { status: 400 });

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toISOString();

        if (action === 'CHECK_IN') {
            // Validate location if coordinates provided
            const allUsers = await getUsers();
            const user = allUsers.find(u => String(u.id) === String(userId));
            
            if (user && user.late_long) {
                const registeredPoints = parseLatLong(user.late_long);
                if (registeredPoints && latitude && longitude) {
                    const { distance } = getShortestDistance(latitude, longitude, registeredPoints);
                    // threshold logic can be applied here if strictly enforced server-side
                }
            }

            const newRecord = {
                id: `ATT-${Date.now()}`,
                userId: String(userId),
                userName,
                date: dateStr,
                inTime: timeStr,
                outTime: "",
                status: "IN"
            };

            await addAttendanceRecord(newRecord);
            return NextResponse.json({ success: true });

        } else if (action === 'CHECK_OUT') {
            const records = await getAttendanceRecords();
            const todayRecord = records.find(r => String(r.userId) === String(userId) && r.date === dateStr && r.status === 'IN');

            if (!todayRecord) return NextResponse.json({ error: "Active check-in not found" }, { status: 404 });

            await updateAttendanceRecord(todayRecord.id, timeStr, "COMPLETED");
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
    }
}
