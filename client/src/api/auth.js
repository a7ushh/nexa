import { api } from './client.js';

export const STAGE = Object.freeze({
  SIGNED_OUT: 'signed_out',
  NEEDS_PROFILE: 'needs_profile',
  NEEDS_PIN: 'needs_pin',
  PENDING_APPROVAL: 'pending_approval',
  AUTHENTICATED: 'authenticated',
});

export const getConfig = () => api.get('/auth/config');
export const getSession = () => api.get('/auth/me');
export const submitProfile = (payload) => api.post('/auth/profile', payload);
export const submitPin = (pin) => api.post('/auth/pin', { pin });
export const logout = () => api.post('/auth/logout');

/** Full-page redirect: the OAuth consent screen cannot be loaded over fetch. */
export const startGoogleSignIn = () => {
  window.location.href = '/api/auth/google';
};
