/**
 * Session utilities for the application.
 */

export function ensureSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('robotek_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('robotek_session_id', sessionId);
  }
  return sessionId;
}
