import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import PatientDashboard from './pages/patient/PatientDashboard.jsx';
import FindDoctors from './pages/patient/FindDoctors.jsx';
import MyAppointments from './pages/patient/MyAppointments.jsx';
import PatientProfile from './pages/patient/PatientProfile.jsx';
import PatientBloodBank from './pages/patient/PatientBloodBank.jsx';
import PatientOrganDonation from './pages/patient/PatientOrganDonation.jsx';
import Notifications from './pages/shared/Notifications.jsx';
import DoctorDashboard from './pages/doctor/DoctorDashboard.jsx';
import DoctorAppointments from './pages/doctor/DoctorAppointments.jsx';
import DoctorProfile from './pages/doctor/DoctorProfile.jsx';
import DoctorBloodBank from './pages/doctor/DoctorBloodBank.jsx';
import DoctorOrganDonation from './pages/doctor/DoctorOrganDonation.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminBloodBank from './pages/admin/AdminBloodBank.jsx';
import AdminOrganDonation from './pages/admin/AdminOrganDonation.jsx';
import BloodBankDashboard from './pages/bloodbank/BloodBankDashboard.jsx';
import BloodBankInventory from './pages/bloodbank/BloodBankInventory.jsx';
import BloodBankRequests from './pages/bloodbank/BloodBankRequests.jsx';
import BloodBankDonors from './pages/bloodbank/BloodBankDonors.jsx';
import TransplantDashboard from './pages/transplant/TransplantDashboard.jsx';
import TransplantPledges from './pages/transplant/TransplantPledges.jsx';
import TransplantWaitlist from './pages/transplant/TransplantWaitlist.jsx';
import TransplantMatches from './pages/transplant/TransplantMatches.jsx';

const wrap = (roles, element) => (
  <ProtectedRoute roles={roles}>
    <Layout>{element}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
