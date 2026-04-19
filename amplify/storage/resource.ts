import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'robotekDrive',
  access: (allow) => ({
    'general/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write'])
    ],
    'users/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write'])
    ],
    'delegations/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write'])
    ],
  })
});
