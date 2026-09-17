import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  FileText,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PatientSidebar from "../../components/PatientSidebar";

function PatientProfile() {
  const { token } = useAuth();

  const [patient, setPatient] = useState(null);

  const [medicalRecords, setMedicalRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [medicalLoading, setMedicalLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [medicalError, setMedicalError] =
    useState("");

  const [uploading, setUploading] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [success, setSuccess] = useState("");
  const [clearingHistory, setClearingHistory] = useState(false);

  /*
   * =====================================================
   * FETCH PATIENT PROFILE
   * =====================================================
   */

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/patients/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPatient(
        response.data?.patient ||
          response.data?.profile ||
          null
      );
    } catch (error) {
      console.error(
        "Fetch patient profile error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load patient profile."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  /*
   * =====================================================
   * FETCH MEDICAL HISTORY
   * =====================================================
   */

  const fetchMedicalHistory = useCallback(async () => {
    try {
      setMedicalLoading(true);
      setMedicalError("");

      const response = await api.get(
        "/medical-records/my",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMedicalRecords(
        response.data?.records || []
      );
    } catch (error) {
      console.error(
        "Fetch medical history error:",
        error
      );

      setMedicalError(
        error.response?.data?.message ||
          "Unable to load medical history."
      );
    } finally {
      setMedicalLoading(false);
    }
  }, [token]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await api.patch(
        "/patients/profile/picture",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.patient) {
        setPatient(response.data.patient);
      }

      setSuccess("Profile picture updated successfully.");
    } catch (error) {
      console.error("Upload patient profile picture error:", error);
      setError(
        error.response?.data?.message ||
          "Unable to upload profile picture."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveImage = async () => {
    if (!window.confirm("Remove your profile picture?")) return;

    try {
      setRemovingImage(true);
      setError("");
      setSuccess("");

      await api.delete("/patients/profile/picture", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPatient((current) => ({
        ...current,
        profilePicture: null,
      }));

      setSuccess("Profile picture removed successfully.");
    } catch (error) {
      console.error("Remove patient profile picture error:", error);
      setError(
        error.response?.data?.message ||
          "Unable to remove profile picture."
      );
    } finally {
      setRemovingImage(false);
    }
  };

  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchProfile();
    fetchMedicalHistory();
  }, [token, fetchProfile, fetchMedicalHistory]);

  /*
   * =====================================================
   * DATE FORMATTER
   * =====================================================
   */

  const formatDate = (value) => {
    if (!value) {
      return "Not provided";
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Not provided";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /*
   * =====================================================
   * DATE + TIME FORMATTER
   * =====================================================
   */

  const formatDateTime = (value) => {
    if (!value) {
      return "Not provided";
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Not provided";
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="portal-shell min-h-screen bg-slate-50">
        <PatientSidebar />
        <main className="flex min-h-[calc(100vh-4rem)] min-w-0 items-center justify-center px-4 sm:px-6">
          <p className="text-sm text-slate-500">
          Loading your profile...
          </p>
        </main>
      </div>
    );
  }

  /*
   * =====================================================
   * ERROR
   * =====================================================
   */

  if (error) {
    return (
      <div className="portal-shell min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
        <PatientSidebar />
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-white p-5 text-center sm:p-8">
          <p className="text-sm text-red-600">
            {error}
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * PATIENT DATA
   * =====================================================
   */

  const user = patient?.user;

  const patientName =
    user?.name || "Patient";

  /*
   * =====================================================
   * PROFILE PICTURE
   * =====================================================
   */

  const profilePicture =
    patient?.profilePicture || null;

  return (
    <div className="portal-shell min-h-screen bg-slate-50">
      {/* =================================================
          HEADER
      ================================================= */}

      <PatientSidebar />

      <div className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
          <p className="text-sm text-slate-500">
            Patient Portal
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your personal information and
            view your medical history.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* =================================================
            PROFILE CARD
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Profile Picture */}

            <div className="flex shrink-0 flex-col items-center gap-3">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-slate-100 bg-slate-100 shadow-sm sm:h-32 sm:w-32">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={patientName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={42} className="text-slate-400" />
                )}
              </div>

              <div className="flex w-full max-w-56 gap-2">
                <label
                  htmlFor="patientProfilePicture"
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Camera size={15} />
                  {uploading ? "Uploading..." : profilePicture ? "Change" : "Upload"}
                </label>
                <input
                  id="patientProfilePicture"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {profilePicture && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={removingImage}
                    aria-label="Remove profile picture"
                    title="Remove profile picture"
                    className="rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p className="text-center text-[11px] text-slate-400">
                JPG, PNG or WebP · Max 5 MB
              </p>
            </div>

            {/* Name */}

            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                {patientName}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Patient profile
              </p>

              {user?.email && (
                <p className="mt-2 text-sm text-slate-600">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Personal Information
            </h3>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Info
                icon={Mail}
                label="Email"
                value={
                  user?.email ||
                  "Not provided"
                }
              />

              <Info
                icon={Phone}
                label="Phone"
                value={
                  patient?.phone ||
                  "Not provided"
                }
              />

              <Info
                icon={CalendarDays}
                label="Date of Birth"
                value={
                  patient?.dateOfBirth
                    ? formatDate(
                        patient.dateOfBirth
                      )
                    : "Not provided"
                }
              />

              <Info
                icon={UserRound}
                label="Gender"
                value={
                  patient?.gender ||
                  "Not provided"
                }
              />

              <Info
                icon={HeartPulse}
                label="Blood Group"
                value={
                  patient?.bloodGroup ||
                  "Not provided"
                }
              />

              <Info
                icon={MapPin}
                label="Address"
                value={
                  patient?.address ||
                  "Not provided"
                }
              />
            </div>
          </div>
        </section>

        {/* =================================================
            MEDICAL HISTORY
        ================================================= */}

        <section className="mt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Medical History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your previous consultations and medical records.
              </p>
            </div>
          </div>

          {/* Medical Error */}

          {medicalError && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {medicalError}
              </p>
            </div>
          )}

          {/* Loading */}

          {medicalLoading ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-center sm:p-8">
              <p className="text-sm text-slate-500">
                Loading medical history...
              </p>
            </div>
          ) : medicalRecords.length ===
            0 ? (
            /* Empty */

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
              <FileText
                size={32}
                className="mx-auto text-slate-400"
              />

              <h3 className="mt-4 font-medium text-slate-900">
                No medical records yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your consultation history will appear here after a doctor records a consultation.
              </p>
            </div>
          ) : (
            /* Records */

            <div className="mt-5 space-y-5">
              {medicalRecords.map(
                (record) => {
                  const doctorName =
                    record.doctor
                      ?.user
                      ?.name ||
                    "Doctor";

                  return (
                    <article
                      key={
                        record._id
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      {/* Record Header */}

                      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Dr.{" "}
                            {doctorName}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Consultation on{" "}
                            {formatDate(
                              record.createdAt
                            )}
                          </p>
                        </div>

                        {record.appointment && (
                          <div className="rounded-lg bg-slate-50 px-4 py-2">
                            <p className="text-xs text-slate-500">
                              Appointment
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-800">
                              Token #
                              {
                                record
                                  .appointment
                                  .tokenNumber
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(
                                record
                                  .appointment
                                  .appointmentDate
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Symptoms */}

                      {record.symptoms && (
                        <MedicalField
                          label="Symptoms"
                          value={
                            record.symptoms
                          }
                        />
                      )}

                      {/* Diagnosis */}

                      {record.diagnosis && (
                        <MedicalField
                          label="Diagnosis"
                          value={
                            record.diagnosis
                          }
                        />
                      )}

                      {/* Doctor Notes */}

                      {record.notes && (
                        <MedicalField
                          label="Doctor Notes"
                          value={
                            record.notes
                          }
                        />
                      )}

                      {/* Prescription */}

                      {record.prescription && (
                        <MedicalField
                          label="Prescription"
                          value={
                            record.prescription
                          }
                        />
                      )}

                      {/* Follow-up */}

                      {record.followUpDate && (
                        <MedicalField
                          label="Follow-up Date"
                          value={formatDate(
                            record.followUpDate
                          )}
                        />
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  </div>
  );
}

/*
 * =====================================================
 * INFO COMPONENT
 * =====================================================
 */

function Info({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon
          size={18}
          className="text-slate-600"
        />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

/*
 * =====================================================
 * MEDICAL FIELD
 * =====================================================
 */

function MedicalField({
  label,
  value,
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

export default PatientProfile;