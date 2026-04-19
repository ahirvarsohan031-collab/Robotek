import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*==============================================================================
  DATA SCHEMA DEFINITION
  This file defines your "Headers" (Attributes) and table structure.
  Amplify will automatically create a DynamoDB table for this model.
==============================================================================*/

const schema = a.schema({
  TestRobotek: a.model({
    name: a.string(),
    email: a.string(),
    number: a.string(),
    status: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  User: a.model({
    id: a.string().required(), // Employee Code
    username: a.string().required(),
    email: a.string().required(),
    password: a.string(),
    phone: a.string(),
    role_name: a.string(),
    late_long: a.string(), // Location JSON string
    image_url: a.string(),
    dob: a.string(),
    office: a.string(),
    designation: a.string(),
    department: a.string(),
    last_active: a.string(),
    permissions: a.string().array(),
  }).authorization(allow => [allow.publicApiKey()]),

  Dropdown: a.model({
    type: a.string().required(), // 'department' or 'designation'
    value: a.string().required(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── EA-MD HUB TABLES ──────────────────────────────────────────────────────

  EaMdWeeklyUpdate: a.model({
    weekOf: a.string(),
    preparedBy: a.string(),
    periodCovered: a.string(),
    category: a.string(),
    description: a.string(),
    date: a.string(),
    teamMember: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  EaMdUrgentLog: a.model({
    issueSummary: a.string(),
    urgencyLevel: a.string(),
    channelUsed: a.string(),
    requiredFromMD: a.string(),
    deadline: a.string(),
    status: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  EaMdActionLog: a.model({
    task: a.string(),
    owner: a.string(),
    priority: a.string(),
    status: a.string(),
    due: a.string(),
    notes: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  EaMdSyncMeeting: a.model({
    date: a.string(),
    time: a.string(),
    location: a.string(),
    agenda: a.string(),      // JSON string array
    decisions: a.string(),
    actionItems: a.string(), // JSON string array
    notes: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  EaMdTeamQuery: a.model({
    teamMember: a.string(),
    query: a.string(),
    category: a.string(),
    eaResolve: a.string(),
    status: a.string(),
    eaNotes: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── DELEGATION TABLES ─────────────────────────────────────────────────────

  Delegation: a.model({
    id: a.string().required(), // Override auto-gen with string ID to match numbers
    title: a.string(),
    description: a.string(),
    assigned_by: a.string(),
    assigned_to: a.string(),
    department: a.string(),
    priority: a.string(),
    due_date: a.string(),
    status: a.string(),
    voice_note_url: a.string(),
    reference_docs: a.string(),
    evidence_required: a.string(),
    created_at: a.string(),
    updated_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  DelegationRevision: a.model({
    delegation_id: a.string(),
    old_status: a.string(),
    new_status: a.string(),
    old_due_date: a.string(),
    new_due_date: a.string(),
    reason: a.string(),
    created_at: a.string(),
    evidence_urls: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  DelegationRemark: a.model({
    delegation_id: a.string(),
    user_id: a.string(),
    username: a.string(),
    remark: a.string(),
    created_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
