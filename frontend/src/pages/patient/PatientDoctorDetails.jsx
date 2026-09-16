import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, Stethoscope, WalletCards } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PatientSidebar from "../../components/PatientSidebar";

function PatientDoctorDetails() {
  const { doctorId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/doctors/${doctorId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setDoctor(response.data.doctor);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load doctor profile."
        );
      } finally {
        setLoading(false);
      }
    };

    if (token && doctorId) {
      fetchDoctor();
    }
  }, [token, doctorId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Loading doctor profile...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 sm:px-6">
        <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>

          <Link
            to="/patient/doctors"
            className="mt-4 inline-block text-sm font-medium text-slate-900"
          >
            Back to doctors
          </Link>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return null;
  }

  const doctorName = doctor.user?.name || "Doctor";
  const department = doctor.department?.name || "Department";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PatientSidebar />

      <main className="min-w-0 flex-1">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {doctor.user?.profileImage?.url ? (
                <img
                  src={doctor.user.profileImage.url}
                  alt={doctorName}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                  <Stethoscope size={34} className="text-slate-700" />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-sm text-slate-500">
                  {department}
                </p>

                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                  {doctorName}
                </h1>

                <p className="mt-2 text-sm text-slate-600">
                  {doctor.specialization || "Specialization not provided"}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
              <InfoItem
                label="Experience"
                value={
                  doctor.experience !== undefined
                    ? `${doctor.experience} years`
                    : "Not provided"
                }
              />

              <InfoItem
                label="Qualification"
                value={doctor.qualification || "Not provided"}
              />

              <InfoItem
                label="Department"
                value={department}
              />
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <WalletCards size={20} className="text-slate-700" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Consultation fee
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {Number.isFinite(Number(doctor.consultationFee))
                    ? new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(Number(doctor.consultationFee))
                    : "Consultation fee not configured"}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                About the doctor
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {doctor.bio || "No information provided by the doctor."}
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <CalendarDays size={20} className="text-slate-700" />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Availability
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Doctor availability information.
                </p>
              </div>
            </div>

            {doctor.availability?.length > 0 ? (
              <div className="mt-6 space-y-3">
                {doctor.availability.map((item, index) => (
                  <div
                    key={item._id || index}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.dayOfWeek || item.day}
                      </p>

                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <Clock3 size={14} />
                        {item.startTime} - {item.endTime}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
                No availability schedule has been provided.
              </div>
            )}
          </section>

          <div className="mt-6">
            <button
              type="button"
              onClick={() =>
                navigate(`/patient/appointments/book/${doctor._id}`)
              }
              className="w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Book an appointment
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

export default PatientDoctorDetails;