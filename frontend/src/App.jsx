import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import MfaSettings from "./pages/auth/MfaSettings";

import ProtectedRoute from "./components/ProtectedRoute";

import ProfileSetup from "./pages/patient/ProfileSetup";
import PatientDashboard from "./pages/patient/PatientDashboard";
import CompleteProfile from "./pages/patient/CompleteProfile";
import PatientDoctors from "./pages/patient/PatientDoctors";
import PatientDoctorDetails from "./pages/patient/PatientDoctorDetails";
import BookAppointment from "./pages/patient/BookAppointment";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientQueue from "./pages/patient/PatientQueue";

import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorPatientDetails from "./pages/doctor/DoctorPatientDetails";
import DoctorAvailability from "./pages/doctor/DoctorAvailability";
import DoctorQueue from "./pages/doctor/DoctorQueue";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorProfile from "./pages/doctor/DoctorProfile";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminDepartments from "./pages/admin/AdminDepartments";

import PatientProfile from "./pages/patient/PatientProfile";

function App() {
  return (
    <BrowserRouter>
      <DocumentTitle />
      <Routes>
        {/* ================================
            PUBLIC ROUTES
        ================================= */}

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="/mfa-settings"
          element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><MfaSettings /></ProtectedRoute>}
        />

        {/* ================================
            DOCTOR ROUTES
        ================================= */}

        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute role="doctor">
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/profile"
          element={
            <ProtectedRoute role="doctor">
              <DoctorProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/queue"
          element={
            <ProtectedRoute role="doctor">
              <DoctorQueue />
            </ProtectedRoute>
          }
        />

        {/* Doctor Patients list MUST come
            before /doctor/patients/:patientId */}

        <Route
          path="/doctor/patients"
          element={
            <ProtectedRoute role="doctor">
              <DoctorPatients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/patients/:patientId"
          element={
            <ProtectedRoute role="doctor">
              <DoctorPatientDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/availability"
          element={
            <ProtectedRoute role="doctor">
              <DoctorAvailability />
            </ProtectedRoute>
          }
        />

        {/* ================================
            PATIENT PROTECTED ROUTES
        ================================= */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["patient"]} />
          }
        >
          <Route
            path="/patient/dashboard"
            element={<PatientDashboard />}
          />

          <Route
            path="/patient/doctors"
            element={<PatientDoctors />}
          />

          <Route
            path="/patient/appointments"
            element={<PatientAppointments />}
          />

          <Route
            path="/patient/queue"
            element={<PatientQueue />}
          />

          <Route
            path="/patient/doctors/:doctorId"
            element={<PatientDoctorDetails />}
          />

          <Route
            path="/patient/appointments/book/:doctorId"
            element={<BookAppointment />}
          />

          <Route
            path="/patient/profile-setup"
            element={<ProfileSetup />}
          />

          <Route
            path="/patient/profile/complete"
            element={<CompleteProfile />}
          />
        </Route>

        {/* ================================
            ADMIN ROUTES
        ================================= */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/doctors"
          element={
            <ProtectedRoute role="admin">
              <AdminDoctors />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/patients"
          element={
            <ProtectedRoute role="admin">
              <AdminPatients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/appointments"
          element={
            <ProtectedRoute role="admin">
              <AdminAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute role="admin">
              <AdminDepartments />
            </ProtectedRoute>
          }
        />

        {/* ================================
            PATIENT PROFILE
        ================================= */}

        <Route
          path="/patient/profile"
          element={
            <ProtectedRoute role="patient">
              <PatientProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function DocumentTitle() {
  const { pathname } = useLocation();

  let title = "Smart Hospital Queue System";

  if (pathname === "/login") {
    title = "Sign In | Smart Hospital Queue";
  } else if (pathname === "/register") {
    title = "Create Account | Smart Hospital Queue";
  } else if (pathname === "/forgot-password") {
    title = "Forgot Password | Smart Hospital Queue";
  } else if (pathname === "/reset-password") {
    title = "Reset Password | Smart Hospital Queue";
  } else if (pathname === "/patient/dashboard") {
    title = "Patient Dashboard | Smart Hospital Queue";
  } else if (pathname === "/patient/doctors") {
    title = "Find a Doctor | Smart Hospital Queue";
  } else if (pathname.startsWith("/patient/doctors/")) {
    title = "Doctor Details | Smart Hospital Queue";
  } else if (pathname.startsWith("/patient/appointments/book/")) {
    title = "Book Appointment | Smart Hospital Queue";
  } else if (pathname === "/patient/appointments") {
    title = "My Appointments | Smart Hospital Queue";
  } else if (pathname === "/patient/queue") {
    title = "Queue Status | Smart Hospital Queue";
  } else if (
    pathname === "/patient/profile" ||
    pathname === "/patient/profile-setup" ||
    pathname === "/patient/profile/complete"
  ) {
    title = "Patient Profile | Smart Hospital Queue";
  } else if (pathname === "/doctor/dashboard") {
    title = "Doctor Dashboard | Smart Hospital Queue";
  } else if (pathname === "/doctor/queue") {
    title = "Today's Queue | Smart Hospital Queue";
  } else if (pathname === "/doctor/patients") {
    title = "My Patients | Smart Hospital Queue";
  } else if (pathname.startsWith("/doctor/patients/")) {
    title = "Patient Details | Smart Hospital Queue";
  } else if (pathname === "/doctor/availability") {
    title = "Doctor Availability | Smart Hospital Queue";
  } else if (pathname === "/doctor/profile") {
    title = "Doctor Profile | Smart Hospital Queue";
  } else if (pathname === "/admin/dashboard") {
    title = "Admin Dashboard | Smart Hospital Queue";
  } else if (pathname === "/admin/doctors") {
    title = "Manage Doctors | Smart Hospital Queue";
  } else if (pathname === "/admin/patients") {
    title = "Manage Patients | Smart Hospital Queue";
  } else if (pathname === "/admin/appointments") {
    title = "Manage Appointments | Smart Hospital Queue";
  }

  document.title = title;
  return null;
}

export default App;