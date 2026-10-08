import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Landing page stays in the entry bundle (fast first paint); every app
// screen is code-split so visitors don't download all 28 pages up front.
import Home from './pages/Home.jsx';
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Unauthorized = lazy(() => import('./pages/Unauthorized.jsx'));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard.jsx'));
const FindDoctors = lazy(() => import('./pages/patient/FindDoctors.jsx'));
const MyAppointments = lazy(() => import('./pages/patient/MyAppointments.jsx'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile.jsx'));
const PatientBloodBank = lazy(() => import('./pages/patient/PatientBloodBank.jsx'));
const PatientOrganDonation = lazy(() => import('./pages/patient/PatientOrganDonation.jsx'));
const Notifications = lazy(() => import('./pages/shared/Notifications.jsx'));
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard.jsx'));
const DoctorAppointments = lazy(() => import('./pages/doctor/DoctorAppointments.jsx'));
const DoctorProfile = lazy(() => import('./pages/doctor/DoctorProfile.jsx'));
const DoctorBloodBank = lazy(() => import('./pages/doctor/DoctorBloodBank.jsx'));
const DoctorOrganDonation = lazy(() => import('./pages/doctor/DoctorOrganDonation.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminBloodBank = lazy(() => import('./pages/admin/AdminBloodBank.jsx'));
const AdminOrganDonation = lazy(() => import('./pages/admin/AdminOrganDonation.jsx'));
const BloodBankDashboard = lazy(() => import('./pages/bloodbank/BloodBankDashboard.jsx'));
const BloodBankInventory = lazy(() => import('./pages/bloodbank/BloodBankInventory.jsx'));
const BloodBankRequests = lazy(() => import('./pages/bloodbank/BloodBankRequests.jsx'));
const BloodBankDonors = lazy(() => import('./pages/bloodbank/BloodBankDonors.jsx'));
const TransplantDashboard = lazy(() => import('./pages/transplant/TransplantDashboard.jsx'));
const TransplantPledges = lazy(() => import('./pages/transplant/TransplantPledges.jsx'));
const TransplantWaitlist = lazy(() => import('./pages/transplant/TransplantWaitlist.jsx'));
const TransplantMatches = lazy(() => import('./pages/transplant/TransplantMatches.jsx'));

const PageFallback = () => (
  <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontFamily: 'inherit' }}>
    Loading…
  </div>
);

const wrap = (roles, element) => (
  <ProtectedRoute roles={roles}>
    <Layout>{element}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Public homepage. Signed-in visitors are redirected from inside Home
            to their own role dashboard, so the pre-existing behaviour holds. */}
        <Route path="/" element={<Home />} />

        {/* ---------------- PATIENT ---------------- */}
        <Route path="/patient" element={wrap(['PATIENT'], <PatientDashboard />)} />
        <Route path="/patient/doctors" element={wrap(['PATIENT'], <FindDoctors />)} />
        <Route path="/patient/appointments" element={wrap(['PATIENT'], <MyAppointments />)} />
        <Route path="/patient/profile" element={wrap(['PATIENT'], <PatientProfile />)} />
        <Route path="/patient/blood-bank" element={wrap(['PATIENT'], <PatientBloodBank />)} />
        <Route path="/patient/organ-donation" element={wrap(['PATIENT'], <PatientOrganDonation />)} />
        <Route path="/patient/notifications" element={wrap(['PATIENT'], <Notifications />)} />

        {/* ---------------- DOCTOR ---------------- */}
        <Route path="/doctor" element={wrap(['DOCTOR'], <DoctorDashboard />)} />
        <Route path="/doctor/appointments" element={wrap(['DOCTOR'], <DoctorAppointments />)} />
        <Route path="/doctor/profile" element={wrap(['DOCTOR'], <DoctorProfile />)} />
        <Route path="/doctor/blood-bank" element={wrap(['DOCTOR'], <DoctorBloodBank />)} />
        <Route path="/doctor/organ-donation" element={wrap(['DOCTOR'], <DoctorOrganDonation />)} />
        {/* previously the doctor bell linked here without the route existing */}
        <Route path="/doctor/notifications" element={wrap(['DOCTOR'], <Notifications />)} />

        {/* ---------------- ADMIN ---------------- */}
        <Route path="/admin" element={wrap(['ADMIN'], <AdminDashboard />)} />
        <Route path="/admin/users" element={wrap(['ADMIN'], <AdminUsers />)} />
        <Route path="/admin/blood-bank" element={wrap(['ADMIN'], <AdminBloodBank />)} />
        <Route path="/admin/organ-donation" element={wrap(['ADMIN'], <AdminOrganDonation />)} />
        <Route path="/admin/notifications" element={wrap(['ADMIN'], <Notifications />)} />

        {/* ---------------- BLOOD BANK OFFICER ---------------- */}
        <Route path="/bloodbank" element={wrap(['BLOOD_BANK_OFFICER'], <BloodBankDashboard />)} />
        <Route path="/bloodbank/inventory" element={wrap(['BLOOD_BANK_OFFICER'], <BloodBankInventory />)} />
        <Route path="/bloodbank/requests" element={wrap(['BLOOD_BANK_OFFICER'], <BloodBankRequests />)} />
        <Route path="/bloodbank/donors" element={wrap(['BLOOD_BANK_OFFICER'], <BloodBankDonors />)} />
        <Route path="/bloodbank/notifications" element={wrap(['BLOOD_BANK_OFFICER'], <Notifications />)} />

        {/* ---------------- TRANSPLANT COORDINATOR ---------------- */}
        <Route path="/transplant" element={wrap(['TRANSPLANT_COORDINATOR'], <TransplantDashboard />)} />
        <Route path="/transplant/pledges" element={wrap(['TRANSPLANT_COORDINATOR'], <TransplantPledges />)} />
        <Route path="/transplant/waitlist" element={wrap(['TRANSPLANT_COORDINATOR'], <TransplantWaitlist />)} />
        <Route path="/transplant/matches" element={wrap(['TRANSPLANT_COORDINATOR'], <TransplantMatches />)} />
        <Route path="/transplant/notifications" element={wrap(['TRANSPLANT_COORDINATOR'], <Notifications />)} />

        <Route path="*" element={<Unauthorized />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
