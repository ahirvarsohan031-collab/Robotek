import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.ts';
import { data } from './data/resource.ts';
import { storage } from './storage/resource.ts';

/**
 * @see https://docs.amplify.aws/gen2/build-a-backend/
 */
defineBackend({
  auth,
  data,
  storage,
});
