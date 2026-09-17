import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Stethoscope,
  WalletCards,
} from "lucide-react";
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
    let mounted = true;

    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/doctors/${doctorId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!mounted) return;

        setDoctor(response.data?.doctor || null);
      } catch (error) {
        if (!mounted) return;

        setError(
          error.response?.data?.message ||
            "Unable to load doctor profile."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (token && doctorId) {
      fetchDoctor();
    }

    return () => {
      mounted = false;
    };
  }, [token, doctorId]);

  if (loading) {
    return (
      <div className="portal-shell min-h-screen bg-slate-50">
        <PatientSidebar />

        <main className="portal-main-content min-w-0">
          <div className="flex min-h-screen items-center justify-center px-4">
            <p className="text-sm text-slate-500">
              Loading doctor profile...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-shell min-h-screen bg-slate-50">
        <PatientSidebar />

        <main className="portal-main-content min-w-0">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-red-600">
                {error}
              </p>

              <Link
                to="/patient/doctors"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Back to doctors
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!doctor) {
    return null;
  }

  const doctorName = doctor.user?.name || "Doctor";
  const department =
    doctor.department?.name || "Department";

  const doctorImage =
    doctor.user?.profileImage?.url ||
    doctor.user?.profilePicture?.url ||
    doctor.profileImage?.url ||
    doctor.profilePicture?.url ||
    null;

  const consultationFee = Number(
    doctor.consultationFee
  );

  return (
    <div className="portal-shell min-h-screen bg-slate-50">
      <PatientSidebar />

      <main className="portal-main-content min-w-0 w-full">
        {/* PAGE HEADER */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex max-w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft
                size={16}
                className="shrink-0"
              />

              <span>Back</span>
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
          {/* DOCTOR PROFILE */}
          <section className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
              {/* IMAGE */}
              <div className="shrink-0">
                {doctorImage ? (
                  <img
                    src={doctorImage}
                    alt={doctorName}
                    className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 sm:h-24 sm:w-24">
                    <Stethoscope
                      size={32}
                      className="text-slate-600"
                    />
                  </div>
                )}
              </div>

              {/* BASIC INFO */}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">
                  {department}
                </p>

                <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {doctorName}
                </h1>

                <p className="mt-2 break-words text-sm text-slate-600">
                  {doctor.specialization ||
                    "Specialization not provided"}
                </p>
              </div>
            </div>

            {/* INFO GRID */}
            <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
              <InfoItem
                label="Experience"
                value={
                  doctor.experience !== undefined &&
                  doctor.experience !== null
                    ? `${doctor.experience} years`
                    : "Not provided"
                }
              />

              <InfoItem
                label="Qualification"
                value={
                  doctor.qualification ||
                  "Not provided"
                }
              />

              <InfoItem
                label="Department"
                value={department}
              />
            </div>

            {/* FEE */}
            <div className="mt-6 flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
                <WalletCards
                  size={19}
                  className="text-slate-700"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Consultation fee
                </p>

                <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                  {Number.isFinite(consultationFee)
                    ? new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(consultationFee)
                    : "Consultation fee not configured"}
                </p>
              </div>
            </div>
          </section>

          {/* ABOUT */}
          <section className="mt-5 w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900">
              About the doctor
            </h2>

            <p className="mt-3 break-words text-sm leading-7 text-slate-600">
              {doctor.bio ||
                "No information provided by the doctor."}
            </p>
          </section>

          {/* AVAILABILITY */}
          <section className="mt-5 w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6 lg:p-8">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <CalendarDays
                  size={19}
                  className="text-slate-700"
                />
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  Availability
                </h2>

                <p className="mt-1 break-words text-sm text-slate-500">
                  Doctor availability information.
                </p>
              </div>
            </div>

            {doctor.availability?.length > 0 ? (
              <div className="mt-5 space-y-3">
                {doctor.availability.map(
                  (item, index) => (
                    <div
                      key={item._id || index}
                      className="w-full min-w-0 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-slate-900">
                            {item.dayOfWeek ||
                              item.day ||
                              "Day"}
                          </p>

                          <p className="mt-1 flex min-w-0 items-center gap-2 break-words text-sm text-slate-500">
                            <Clock3
                              size={14}
                              className="shrink-0"
                            />

                            <span>
                              {item.startTime ||
                                "--:--"}{" "}
                              -{" "}
                              {item.endTime ||
                                "--:--"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No availability schedule has
                been provided.
              </div>
            )}
          </section>

          {/* BOOK BUTTON */}
          <div className="mt-5 pb-5 sm:mt-6 sm:pb-8">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/patient/appointments/book/${doctor._id}`
                )
              }
              className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3.5 text-center text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
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
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

export default PatientDoctorDetails;