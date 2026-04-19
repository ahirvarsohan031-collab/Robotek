'use client'

import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

export default function MigrateUsersPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  async function startUserMigration() {
    setStatus('running');
    addLog('🚀 Starting migration of USERS from Google Sheets to AWS...');

    try {
      // 1. Fetch data from existing Google Sheets API
      addLog('📡 Fetching users from Google Sheets API...');
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users from Google Sheets');
      const users: any[] = await res.json();
      addLog(`✅ Found ${users.length} users in Google Sheets.`);

      // 2. Fetch dropdown data
      addLog('📡 Fetching dropdown data...');
      const dropRes = await fetch('/api/users/dropdowns');
      const dropdowns = await dropRes.json();
      addLog(`✅ Found ${dropdowns.departments.length} departments and ${dropdowns.designations.length} designations.`);

      // 3. Migrate Users
      addLog('📤 Uploading users to DynamoDB...');
      for (const user of users) {
        addLog(`Processing [${user.id}] ${user.username}...`);
        
        // Map fields to AWS Schema
        await client.models.User.create({
          id: user.id,
          username: user.username,
          email: user.email,
          password: user.password || '',
          phone: user.phone || '',
          role_name: user.role_name || 'USER',
          late_long: user.late_long || '',
          image_url: user.image_url || '',
          dob: user.dob || '',
          office: user.office || '',
          designation: user.designation || '',
          department: user.department || '',
          last_active: user.last_active || '',
          permissions: user.permissions || [],
        });
      }
      addLog('✅ All users migrated successfully.');

      // 4. Migrate Dropdowns
      addLog('📤 Uploading dropdown options...');
      for (const dept of dropdowns.departments) {
        await client.models.Dropdown.create({ type: 'department', value: dept });
      }
      for (const desig of dropdowns.designations) {
        await client.models.Dropdown.create({ type: 'designation', value: desig });
      }
      addLog('✅ Dropdowns migrated successfully.');
      
      setStatus('success');
      addLog('🎉 MIGRATION COMPLETE!');

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      addLog(`❌ ERROR: ${err.message}`);
    }
  }

  async function startDelegationMigration() {
    setStatus('running');
    addLog('🚀 Starting migration of DELEGATIONS from Google Sheets to AWS...');

    try {
      // 1. Fetch data from existing Google Sheets API
      addLog('📡 Fetching delegations from Google Sheets API...');
      const res = await fetch('/api/delegations/legacy');
      if (!res.ok) throw new Error('Failed to fetch delegations');
      const delegations: any[] = await res.json();
      addLog(`✅ Found ${delegations.length} delegations in Google Sheets.`);

      // 2. Migrate Delegations
      addLog('📤 Uploading delegations to DynamoDB...');
      for (const task of delegations) {
        addLog(`Processing [${task.id}] ${task.title}...`);
        
        await client.models.Delegation.create({
          id: String(task.id),
          title: task.title || '',
          description: task.description || '',
          assigned_by: task.assigned_by || '',
          assigned_to: task.assigned_to || '',
          department: task.department || '',
          priority: task.priority || '',
          due_date: task.due_date || '',
          status: task.status || '',
          voice_note_url: task.voice_note_url || '',
          reference_docs: task.reference_docs || '',
          evidence_required: task.evidence_required || '',
          created_at: task.created_at || new Date().toISOString(),
          updated_at: task.updated_at || new Date().toISOString(),
        });

        // 3. Optional: Fetch and migrate history for this task
        // Note: We make an individual API call per task to get history
        try {
          const histRes = await fetch(`/api/delegations/legacy/${task.id}/history`);
          if (histRes.ok) {
            const history = await histRes.json();
            for (const h of history) {
              if (h.type === 'revision') {
                await client.models.DelegationRevision.create({
                  delegation_id: String(task.id),
                  old_status: h.old_status || '',
                  new_status: h.new_status || '',
                  old_due_date: h.old_due_date || '',
                  new_due_date: h.new_due_date || '',
                  reason: h.reason || '',
                  created_at: h.created_at || '',
                  evidence_urls: h.evidence_urls || '',
                });
              } else if (h.type === 'remark') {
                await client.models.DelegationRemark.create({
                  delegation_id: String(task.id),
                  user_id: h.user_id || '',
                  username: h.username || '',
                  remark: h.remark || '',
                  created_at: h.created_at || '',
                });
              }
            }
          }
        } catch (e: any) {
           addLog(`⚠️ Could not migrate history for ${task.id}: ${e.message}`);
        }
      }
      addLog('✅ All delegations and history migrated successfully.');
      
      setStatus('success');
      addLog('🎉 MIGRATION COMPLETE!');

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      addLog(`❌ ERROR: ${err.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-green-400 p-8 font-mono">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 border-b border-green-800 pb-2">User Data Migration Tool</h1>
        
        <div className="mb-6">
          <p className="text-gray-400 mb-4 text-sm">
            This tool will pull all users from current Google Sheets and push them to the new AWS DynamoDB tables.
          </p>
          
        <div className="mb-6 flex gap-4">
          <button
            onClick={startUserMigration}
            disabled={status === 'running'}
            className="bg-green-600 hover:bg-green-700 text-black px-6 py-2 rounded font-bold transition-colors disabled:opacity-50"
          >
            Migrate Users
          </button>
          <button
            onClick={startDelegationMigration}
            disabled={status === 'running'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold transition-colors disabled:opacity-50"
          >
            Migrate Delegations
          </button>
        </div>

        <div className="bg-black/50 p-4 rounded border border-green-800 h-96 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
          {status === 'idle' && <div className="text-gray-600">Waiting for trigger...</div>}
        </div>
        </div>
      </div>
    </div>
  );
}
