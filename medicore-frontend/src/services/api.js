import axios from 'axios';

const TOKEN_KEY = 'medicore_token';
const USER_KEY = 'medicore_user';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request (axios interceptor)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, role) => api.post('/auth/register', { email, password, role }),
  me: () => api.get('/auth/me'),
  deactivateMe: () => api.delete('/auth/me'),
  setStatus: (userId, active) => api.patch(`/auth/users/${userId}/status`, { active }),
  listUsers: (search, page, size) =>
    api.get('/auth/users', { params: { search, page, size } }),
};

export const patientService = {
  getMyProfile: () => api.get('/patients/me'),
  createMyProfile: (data) => api.post('/patients/me', data),
  updateMyProfile: (data) => api.put('/patients/me', data),
  list: (page, size) => api.get('/patients', { params: { page, size } }),
};

export const doctorService = {
  search: (filters) => api.get('/doctors', { params: filters }),
  get: (id) => api.get(`/doctors/${id}`),
  specializations: () => api.get('/doctors/specializations'),
  getMyProfile: () => api.get('/doctors/me'),
  createMyProfile: (data) => api.post('/doctors/me', data),
  updateMyProfile: (data) => api.put('/doctors/me', data),
  setAvailability: (available) =>
    api.patch(`/doctors/me/availability?available=${available}`),
};

export const appointmentService = {
  book: (data) => api.post('/appointments', data),
  myPatient: (page, size) => api.get('/appointments/me/patient', { params: { page, size } }),
  myDoctor: (page, size) => api.get('/appointments/me/doctor', { params: { page, size } }),
  cancel: (id) => api.patch(`/appointments/${id}/cancel`),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status?status=${status}`),
  stats: () => api.get('/appointments/stats'),
};

export const notificationService = {
  myNotifications: (page, size) =>
    api.get('/notifications', { params: { page, size } }),
};

/**
 * Blood bank domain (/api/bloodbank/**).
 * The gateway allows ADMIN, DOCTOR, PATIENT and BLOOD_BANK_OFFICER here —
 * a TRANSPLANT_COORDINATOR token is refused at the edge.
 */
export const bloodBankService = {
  metadata: () => api.get('/bloodbank/metadata'),
  compatibility: (bloodGroup) => api.get(`/bloodbank/compatibility/${bloodGroup}`),

  // availability = the patient/doctor-safe projection of stock
  availability: (params) => api.get('/bloodbank/availability', { params }),

  // full lot detail — staff only
  inventory: (params) => api.get('/bloodbank/inventory', { params }),
  expiring: (days = 30) => api.get('/bloodbank/inventory/expiring', { params: { days } }),
  createLot: (data) => api.post('/bloodbank/inventory', data),
  updateLot: (id, data) => api.put(`/bloodbank/inventory/${id}`, data),
  adjustLot: (id, delta) => api.post(`/bloodbank/inventory/${id}/adjust`, { delta }),
  discardLot: (id) => api.delete(`/bloodbank/inventory/${id}`),

  raiseRequest: (data) => api.post('/bloodbank/requests', data),
  myRequests: (params) => api.get('/bloodbank/requests/mine', { params }),
  allRequests: (params) => api.get('/bloodbank/requests', { params }),
  getRequest: (id) => api.get(`/bloodbank/requests/${id}`),
  decideRequest: (id, data) => api.post(`/bloodbank/requests/${id}/decision`, data),
  cancelRequest: (id) => api.patch(`/bloodbank/requests/${id}/cancel`),

  myDonor: () => api.get('/bloodbank/donors/me'),
  registerDonor: (data) => api.post('/bloodbank/donors/me', data),
  updateDonor: (data) => api.put('/bloodbank/donors/me', data),
  donors: (params) => api.get('/bloodbank/donors', { params }),
  setDonorEligibility: (id, data) => api.patch(`/bloodbank/donors/${id}/eligibility`, data),

  stats: () => api.get('/bloodbank/stats'),
};

/**
 * Organ donation domain (/api/organs/**).
 * The gateway allows ADMIN, DOCTOR, PATIENT and TRANSPLANT_COORDINATOR —
 * a BLOOD_BANK_OFFICER token is refused at the edge.
 */
export const organService = {
  metadata: () => api.get('/organs/metadata'),
  stats: () => api.get('/organs/stats'),

  myPledge: () => api.get('/organs/pledges/me'),
  createPledge: (data) => api.post('/organs/pledges/me', data),
  updatePledge: (data) => api.put('/organs/pledges/me', data),
  revokePledge: () => api.patch('/organs/pledges/me/revoke'),

  pledges: (params) => api.get('/organs/pledges', { params }),
  getPledge: (id) => api.get(`/organs/pledges/${id}`),
  verifyPledge: (id, data) => api.patch(`/organs/pledges/${id}/verify`, data),

  myWaitlist: () => api.get('/organs/waitlist/mine'),
  addToWaitlist: (data) => api.post('/organs/waitlist', data),
  waitlist: (params) => api.get('/organs/waitlist', { params }),
  getWaitlist: (id) => api.get(`/organs/waitlist/${id}`),
  setWaitlistStatus: (id, data) => api.patch(`/organs/waitlist/${id}/status`, data),
  candidates: (id) => api.get(`/organs/waitlist/${id}/candidates`),

  myMatches: () => api.get('/organs/matches/mine'),
  matches: (params) => api.get('/organs/matches', { params }),
  proposeMatch: (data) => api.post('/organs/matches', data),
  setMatchStatus: (id, data) => api.patch(`/organs/matches/${id}/status`, data),
};

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export function extractError(error) {
  return error?.response?.data?.message || error?.message || 'Something went wrong';
}
