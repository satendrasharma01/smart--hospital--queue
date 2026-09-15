import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../utils/dateTime";

function DoctorPatientDetails() {
  const { patientId } = useParams();
  const { token } = useAuth();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [recordError, setRecordError] =
    useState("");
  const [success, setSuccess] = useState("");

  const [selectedAppointment, setSelectedAppointment] =
    useState("");

  const [form, setForm] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
    prescription: "",
    followUpDate: "",
  });

  /*
   * =====================================================
   * FETCH PATIENT DETAILS
   * =====================================================
   */

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/doctors/patients/${patientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPatient(response.data?.patient);
      setAppointments(
        response.data?.appointments || []
      );
    } catch (error) {
      console.error(
        "Fetch patient details error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load patient details."
      );
    } finally {
      setLoading(false);
    }
  }, [patientId, token]);

  /*
   * =====================================================
   * FETCH MEDICAL RECORDS
   * =====================================================
   */

  const fetchMedicalRecords = useCallback(async () => {
    try {
      setRecordsLoading(true);
      setRecordError("");

      const response = await api.get(
        `/medical-records/patient/${patientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRecords(
        response.data?.records || []
      );
    } catch (error) {
      console.error(
        "Fetch medical records error:",
        error
      );

      /*
       * If there are no records yet, don't make
       * the entire patient page look broken.
       */

      if (
        error.response?.status === 404
      ) {
        setRecords([]);
      } else {
        setRecordError(
          error.response?.data?.message ||
            "Unable to load medical records."
        );
      }
    } finally {
      setRecordsLoading(false);
    }
  }, [patientId, token]);

  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    if (!token || !patientId) {
      return;
    }

    fetchPatient();
    fetchMedicalRecords();
  }, [token, patientId, fetchPatient, fetchMedicalRecords]);

  /*
   * =====================================================
   * FORM CHANGE
   * =====================================================
   */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
   * =====================================================
   * SAVE CONSULTATION
   * =====================================================
   */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    if (!selectedAppointment) {
      setRecordError(
        "Please select an appointment."
      );

      return;
    }

    /*
     * Don't create an empty consultation.
     */

    if (
      !form.symptoms.trim() &&
      !form.diagnosis.trim() &&
      !form.notes.trim() &&
      !form.prescription.trim()
    ) {
      setRecordError(
        "Please enter at least one consultation detail."
      );

      return;
    }

    try {
      setSaving(true);
      setRecordError("");
      setSuccess("");

      const response =
        await api.post(
          "/medical-records",
          {
            patientId,
            appointmentId:
              selectedAppointment,

            symptoms:
              form.symptoms.trim(),

            diagnosis:
              form.diagnosis.trim(),

            notes:
              form.notes.trim(),

            prescription:
              form.prescription.trim(),

            followUpDate:
              form.followUpDate ||
              undefined,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const createdRecord =
        response.data?.record;

      if (createdRecord) {
        setRecords(
          (previous) => [
            createdRecord,
            ...previous,
          ]
        );
      } else {
        await fetchMedicalRecords();
      }

      setForm({
        symptoms: "",
        diagnosis: "",
        notes: "",
        prescription: "",
        followUpDate: "",
      });

      setSelectedAppointment("");

      setSuccess(
        "Consultation saved successfully."
      );
    } catch (error) {
      console.error(
        "Save consultation error:",
        error
      );

      setRecordError(
        error.response?.data?.message ||
          "Unable to save consultation."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Loading patient details...
        </p>
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
      <div className="min-h-screen bg-slate-50 px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-8 text-center">
          <p className="text-sm text-red-600">
            {error}
          </p>

          <Link
            to="/doctor/dashboard"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const user = patient?.user;

  /*
   * Only appointments which can reasonably be used
   * for consultation.
   *
   * Cancelled appointments are excluded.
   */

  const consultationAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status !==
        "cancelled"
    );

  /*
   * =====================================================
   * FORMAT DATE
   * =====================================================
   */

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /*
   * =====================================================
   * FORMAT DATE + TIME
   * =====================================================
   */

  const formatDateTime = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
          <Link
            to="/doctor/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* =================================================
            PAGE TITLE
        ================================================= */}

        <div>
          <p className="text-sm text-slate-500">
            Doctor Portal
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Patient Details
          </h1>
        </div>

        {/* =================================================
            PATIENT PROFILE
        ================================================= */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <UserRound size={28} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {user?.name ||
                  "Patient"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Patient profile
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
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
              label="Date of birth"
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
              icon={MapPin}
              label="Address"
              value={
                patient?.address ||
                "Not provided"
              }
            />

            <Info
              icon={UserRound}
              label="Blood group"
              value={
                patient?.bloodGroup ||
                "Not provided"
              }
            />
          </div>
        </section>

        {/* =================================================
            CONSULTATION
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <FileText size={19} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  New Consultation
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Record consultation details for this patient.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-6"
          >
            {/* Appointment */}

            <div>
              <label
                htmlFor="appointment"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Appointment
              </label>

              <select
                id="appointment"
                value={
                  selectedAppointment
                }
                onChange={(event) =>
                  setSelectedAppointment(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                <option value="">
                  Select appointment
                </option>

                {consultationAppointments.map(
                  (appointment) => (
                    <option
                      key={
                        appointment._id
                      }
                      value={
                        appointment._id
                      }
                    >
                      {formatDateTime(
                        appointment.appointmentDate
                      )}{" "}
                      · Token #
                      {
                        appointment.tokenNumber
                      }{" "}
                      ·{" "}
                      {
                        appointment.status
                      }
                    </option>
                  )
                )}
              </select>

              {consultationAppointments.length ===
                0 && (
                <p className="mt-2 text-xs text-slate-500">
                  No eligible appointments are available for consultation.
                </p>
              )}
            </div>

            {/* Symptoms */}

            <div className="mt-5">
              <label
                htmlFor="symptoms"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Symptoms
              </label>

              <textarea
                id="symptoms"
                name="symptoms"
                value={
                  form.symptoms
                }
                onChange={
                  handleChange
                }
                rows={4}
                maxLength={2000}
                placeholder="Describe the patient's symptoms..."
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {
                  form.symptoms
                    .length
                }
                /2000
              </p>
            </div>

            {/* Diagnosis */}

            <div className="mt-5">
              <label
                htmlFor="diagnosis"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Diagnosis
              </label>

              <textarea
                id="diagnosis"
                name="diagnosis"
                value={
                  form.diagnosis
                }
                onChange={
                  handleChange
                }
                rows={4}
                maxLength={2000}
                placeholder="Enter diagnosis..."
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {
                  form.diagnosis
                    .length
                }
                /2000
              </p>
            </div>

            {/* Doctor Notes */}

            <div className="mt-5">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Doctor Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                value={
                  form.notes
                }
                onChange={
                  handleChange
                }
                rows={5}
                maxLength={5000}
                placeholder="Add clinical notes, observations, or instructions..."
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {
                  form.notes
                    .length
                }
                /5000
              </p>
            </div>

            {/* Prescription */}

            <div className="mt-5">
              <label
                htmlFor="prescription"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Prescription
              </label>

              <textarea
                id="prescription"
                name="prescription"
                value={
                  form.prescription
                }
                onChange={
                  handleChange
                }
                rows={5}
                maxLength={5000}
                placeholder="Enter prescription or medication instructions..."
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {
                  form
                    .prescription
                    .length
                }
                /5000
              </p>
            </div>

            {/* Follow Up */}

            <div className="mt-5">
              <label
                htmlFor="followUpDate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Follow-up Date
              </label>

              <input
                id="followUpDate"
                name="followUpDate"
                type="date"
                value={
                  form.followUpDate
                }
                onChange={
                  handleChange
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 sm:max-w-sm"
              />
            </div>

            {/* Errors */}

            {recordError && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  {recordError}
                </p>
              </div>
            )}

            {/* Success */}

            {success && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">
                  {success}
                </p>
              </div>
            )}

            {/* Save */}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={
                  saving ||
                  consultationAppointments.length ===
                    0
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save Consultation"}
              </button>
            </div>
          </form>
        </section>

        {/* =================================================
            APPOINTMENT HISTORY
        ================================================= */}

        <section className="mt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Appointment History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Previous appointments with this patient.
            </p>
          </div>

          {appointments.length ===
          0 ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">
                No appointment history available.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {appointments.map(
                (appointment) => {
                  const date =
                    new Date(
                      appointment.appointmentDate
                    );

                  return (
                    <div
                      key={
                        appointment._id
                      }
                      className="border-b border-slate-100 p-5 last:border-b-0"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {formatAppointmentDate(date, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>

                          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <Clock3
                              size={14}
                            />

                            {formatAppointmentTime(date)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-600">
                            Token #
                            {
                              appointment.tokenNumber
                            }
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                            {
                              appointment.status
                            }
                          </span>
                        </div>
                      </div>

                      {appointment.reason && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <p className="text-xs text-slate-500">
                            Reason for visit
                          </p>

                          <p className="mt-1 text-sm text-slate-700">
                            {
                              appointment.reason
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =================================================
            MEDICAL RECORDS
        ================================================= */}

        <section className="mt-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Medical Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Previous consultation records for this patient.
            </p>
          </div>

          {recordError &&
            !recordsLoading && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  {recordError}
                </p>
              </div>
            )}

          {recordsLoading ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">
                Loading medical records...
              </p>
            </div>
          ) : records.length ===
            0 ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-8 text-center">
              <FileText
                size={28}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 text-sm text-slate-500">
                No medical records yet.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {records.map(
                (record) => (
                  <div
                    key={
                      record._id
                    }
                    className="rounded-xl border border-slate-200 bg-white p-6"
                  >
                    {/* Record Header */}

                    <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          Consultation
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(
                            record.createdAt
                          )}
                        </p>
                      </div>

                      {record.appointment && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Token #
                          {
                            record
                              .appointment
                              .tokenNumber
                          }
                        </span>
                      )}
                    </div>

                    {/* Symptoms */}

                    {record.symptoms && (
                      <RecordField
                        label="Symptoms"
                        value={
                          record.symptoms
                        }
                      />
                    )}

                    {/* Diagnosis */}

                    {record.diagnosis && (
                      <RecordField
                        label="Diagnosis"
                        value={
                          record.diagnosis
                        }
                      />
                    )}

                    {/* Notes */}

                    {record.notes && (
                      <RecordField
                        label="Doctor Notes"
                        value={
                          record.notes
                        }
                      />
                    )}

                    {/* Prescription */}

                    {record.prescription && (
                      <RecordField
                        label="Prescription"
                        value={
                          record.prescription
                        }
                      />
                    )}

                    {/* Follow-up */}

                    {record.followUpDate && (
                      <RecordField
                        label="Follow-up Date"
                        value={formatDate(
                          record.followUpDate
                        )}
                      />
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </main>
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium capitalize text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

/*
 * =====================================================
 * RECORD FIELD
 * =====================================================
 */

function RecordField({
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

export default DoctorPatientDetails;