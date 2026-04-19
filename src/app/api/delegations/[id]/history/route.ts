import { NextRequest, NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';

Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });
    }

    // Fetch both revisions and remarks in parallel from DynamoDB
    const [revisionsRes, remarksRes] = await Promise.all([
      client.models.DelegationRevision.list({ filter: { delegation_id: { eq: id } } }),
      client.models.DelegationRemark.list({ filter: { delegation_id: { eq: id } } })
    ]);

    const history: any[] = [];

    // Map revisions
    if (revisionsRes.data) {
      revisionsRes.data.forEach(r => {
        history.push({
          type: 'revision',
          id: r.id,
          old_status: r.old_status,
          new_status: r.new_status,
          old_due_date: r.old_due_date,
          new_due_date: r.new_due_date,
          reason: r.reason,
          created_at: r.created_at,
          evidence_urls: r.evidence_urls
        });
      });
    }

    // Map remarks
    if (remarksRes.data) {
      remarksRes.data.forEach(rm => {
        history.push({
          type: 'remark',
          id: rm.id,
          user_id: rm.user_id,
          username: rm.username,
          remark: rm.remark,
          created_at: rm.created_at
        });
      });
    }

    // Sort by created_at descending (newest first)
    history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("API Error fetching history from AWS:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch history" }, { status: 500 });
  }
}
