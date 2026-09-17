import { useEffect, useState } from "react";
import { Search, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PatientSidebar from "../../components/PatientSidebar";

function PatientDoctors() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load actual departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get("/departments");

        setDepartments(response.data.departments || []);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load departments."
        );
      }
    };

    fetchDepartments();
  }, []);

  // Load actual doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        if (selectedDepartment) {
          params.append("department", selectedDepartment);
        }

        if (search.trim()) {
          params.append("search", search.trim());
        }

        const query = params.toString();

        const response = await api.get(
          `/doctors${query ? `?${query}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setDoctors(response.data.doctors || []);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load doctors."
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDoctors();
    }
  }, [token, selectedDepartment, search]);

  return (
    <div className="portal-shell min-h-screen bg-slate-50">
      <PatientSidebar />

      <main className="min-w-0 flex-1">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
            <p className="text-sm text-slate-500">
              Patient Portal
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Find a Doctor
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Find the right specialist for your appointment.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Search */}
          <div className="relative max-w-xl">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by doctor name..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Departments */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Departments
              </h2>

              {selectedDepartment && (
                <button
                  type="button"
                  onClick={() => setSelectedDepartment("")}
                  className="text-sm font-medium text-slate-500 hover:text-slate-900"
                >
                  Clear filter
                </button>
              )}
            </div>

            {departments.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                No departments available.
              </div>
            ) : (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {departments.map((department) => (
                  <button
                    key={department._id}
                    type="button"
                    onClick={() =>
                      setSelectedDepartment(department._id)
                    }
                    className={`whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                      selectedDepartment === department._id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {department.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Doctors */}
          <section className="mt-10">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Doctors
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {doctors.length} doctor
                  {doctors.length !== 1 ? "s" : ""} available
                </p>
              </div>
            </div>

            {loading ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">
                  Loading doctors...
                </p>
              </div>
            ) : error ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-white p-6 text-sm text-red-600">
                {error}
              </div>
            ) : doctors.length === 0 ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <Stethoscope
                  size={28}
                  className="mx-auto text-slate-400"
                />

                <h3 className="mt-4 font-medium text-slate-900">
                  No doctors found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try another department or search term.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {doctors.map((doctor) => (
                  <DoctorCard
                    key={doctor._id}
                    doctor={doctor}
                    onView={() =>
                      navigate(`/patient/doctors/${doctor._id}`)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function DoctorCard({ doctor, onView }) {
  const doctorName = doctor.user?.name || "Doctor";

  const department =
    doctor.department?.name || "Department";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm">
      {doctor.user?.profileImage?.url ? (
        <img
          src={doctor.user.profileImage.url}
          alt={doctorName}
          className="h-14 w-14 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
          <Stethoscope size={21} className="text-slate-700" />
        </div>
      )}

      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        {doctorName}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {doctor.specialization || "Specialist"}
      </p>

      <p className="mt-3 text-sm text-slate-600">
        {department}
      </p>

      {doctor.experience !== undefined && (
        <p className="mt-1 text-sm text-slate-500">
          {doctor.experience} years experience
        </p>
      )}

      <button
        type="button"
        onClick={onView}
        className="mt-6 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        View profile
      </button>
    </article>
  );
}

export default PatientDoctors;