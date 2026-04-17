import { NextRequest, NextResponse } from "next/server";
import { getScotData, appendScotData, getCallData, updateCallData, getFollowUpData, addCallRecord } from "@/lib/scot-sheets";
import { getO2Ds } from "@/lib/o2d-sheets";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab') || 'feeder';
  const skipO2D = searchParams.get('skipO2D') === 'true';

  if (tab === 'calls' || tab === 'lost') {
    const allCalls = await getCallData();
    const allFollowUps = await getFollowUpData();

    // skipO2D=true skips the heavy O2D fetch (used by dashboard tab which fetches O2D separately)
    const allO2Ds = skipO2D ? [] : await getO2Ds();

    // Group follow-ups by partyName and find the latest one for each
    const latestFollowUps = allFollowUps.reduce((acc, curr) => {
      const existing = acc[curr.partyName];
      if (!existing || new Date(curr.createdAt) > new Date(existing.createdAt)) {
        acc[curr.partyName] = curr;
      }
      return acc;
    }, {} as Record<string, any>);

    // Merge latest follow-up info into each call record
    const mergedData = allCalls.map(call => {
      const latest = latestFollowUps[call.partyName];
      const partyO2Ds = allO2Ds.filter(o => o.party_name?.trim().toLowerCase() === call.partyName?.trim().toLowerCase());
      
      let dynamicMetrics: any = {};
      if (partyO2Ds.length > 0) {
        // Group by unique order_no to avoid counting multiple items per order as separate orders
        const uniqueOrderNos = [...new Set(partyO2Ds.map(o => (o.order_no || '').trim()).filter(Boolean))];
        const uniqueCount = uniqueOrderNos.length;

        // For average order size: total amount across all rows / unique orders
        const totalAmt = partyO2Ds.reduce((sum, o) => {
          const amt = parseFloat(String(o.est_amount || "0").replace(/[^0-9.]/g, ''));
          return sum + (isNaN(amt) ? 0 : amt);
        }, 0);

        // Build per-month unique order sets for historical average
        const monthOrderSets: Record<string, Set<string>> = {};
        partyO2Ds.forEach(o => {
          const orderNo = (o.order_no || '').trim();
          if (!orderNo) return;
          const d = new Date(o.created_at);
          if (isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (!monthOrderSets[key]) monthOrderSets[key] = new Set();
          monthOrderSets[key].add(orderNo);
        });
        const monthlyUniqueCounts = Object.values(monthOrderSets).map(s => s.size);
        const calcMonthly = monthlyUniqueCounts.length > 0
          ? monthlyUniqueCounts.reduce((a, b) => a + b, 0) / monthlyUniqueCounts.length
          : 0;

        // Frequency: average days between consecutive unique orders (by first occurrence date)
        const orderFirstDates = uniqueOrderNos
          .map(no => {
            const rows = partyO2Ds.filter(o => (o.order_no || '').trim() === no);
            const dates = rows.map(o => new Date(o.created_at)).filter(d => !isNaN(d.getTime()));
            return dates.length ? dates.reduce((a, b) => a < b ? a : b) : null;
          })
          .filter(Boolean) as Date[];
        orderFirstDates.sort((a, b) => a.getTime() - b.getTime());

        const gaps = orderFirstDates.map((d, i) =>
          i > 0 ? (d.getTime() - orderFirstDates[i-1].getTime()) / (1000 * 60 * 60 * 24) : null
        ).filter(g => g !== null) as number[];

        const lastOrderDate = orderFirstDates.length > 0
          ? orderFirstDates[orderFirstDates.length - 1].toISOString().split('T')[0]
          : "";

        const calcOrderSize = uniqueCount > 0 ? totalAmt / uniqueCount : 0;
        const calcFreq = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

        dynamicMetrics = {
          averageOrderSize: calcOrderSize > 0 ? calcOrderSize.toFixed(2) : call.averageOrderSize,
          usuallyNoOfOrderMonthly: calcMonthly > 0 ? Math.round(calcMonthly).toString() : call.usuallyNoOfOrderMonthly,
          frequencyOfCallingAfterOrderPlaced: calcFreq > 0 ? calcFreq.toFixed(0) : call.frequencyOfCallingAfterOrderPlaced,
          lastOrderDate: lastOrderDate,
          
          isAvgDynamic: calcOrderSize > 0,
          isMonthlyDynamic: calcMonthly > 0,
          isFreqDynamic: calcFreq > 0,
          isDynamic: true
        };
      }

      return {
        ...call,
        ...dynamicMetrics,
        latestStatus: latest?.status || "Pending",
        latestNextDate: latest?.nextFollowUpDate || "",
        followUpHistoryCount: allFollowUps.filter(f => f.partyName === call.partyName).length
      };
    });

    if (tab === 'calls') {
      return NextResponse.json(mergedData.filter(c => (c as any).latestStatus !== 'Order Lost'));
    }
    
    if (tab === 'lost') {
      return NextResponse.json(mergedData.filter(c => (c as any).latestStatus === 'Order Lost'));
    }

    return NextResponse.json(mergedData);
  }

  const data = await getScotData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Check if this is a single party add request
    if (body.type === 'party') {
      const success = await addCallRecord(body.data);
      if (success) {
        return NextResponse.json({ message: "Party added successfully" });
      } else {
        return NextResponse.json({ error: "Failed to add party" }, { status: 500 });
      }
    }

    // Default to bulk records import
    const { records } = body;
    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const success = await appendScotData(records);
    if (success) {
      return NextResponse.json({ message: "Data imported successfully" });
    } else {
      return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Scot POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const partyName = searchParams.get('partyName');
    const tab = searchParams.get('tab');

    if (!partyName || tab !== 'calls') {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    const data = await req.json();
    const success = await updateCallData(partyName, data);

    if (success) {
      return NextResponse.json({ message: "Record updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Scot PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
