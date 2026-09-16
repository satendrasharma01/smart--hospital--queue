import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Camera,
  CheckCircle2,
  Mail,
  Save,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import DoctorSidebar from "../../components/DoctorSidebar";

function DoctorProfile() {
  const { token } = useAuth();

  const [doctor, setDoctor] =
    useState(null);

  const [form, setForm] = useState({
    name: "",
    specialization: "",
    qualification: "",
    bio: "",
    experience: "",
    consultationFee: "",
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [removingImage, setRemovingImage] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * =====================================================
   * FETCH PROFILE
   * =====================================================
   */

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/doctors/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const data =
        response.data?.doctor;

      setDoctor(data);

      setForm({
        name:
          data?.user?.name || "",

        specialization:
          data?.specialization || "",

        qualification:
          data?.qualification || "",

        bio:
          data?.bio || "",

        experience:
          data?.experience ?? "",

        consultationFee:
          data?.consultationFee ?? "",
      });
    } catch (error) {
      console.error(
        "Fetch doctor profile error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load profile."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  /*
   * =====================================================
   * CHANGE FORM
   * =====================================================
   */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
   * =====================================================
   * UPLOAD IMAGE
   * =====================================================
   */

  const handleImageUpload = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image."
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Image must be smaller than 5 MB."
      );

      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData =
        new FormData();

      formData.append(
        "profileImage",
        file
      );

      const response =
        await api.post(
          "/doctors/profile/image",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const updatedDoctor =
        response.data?.doctor;

      if (updatedDoctor) {
        setDoctor(
          updatedDoctor
        );
      }

      setSuccess(
        "Profile picture updated successfully."
      );
    } catch (error) {
      console.error(
        "Upload profile image error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to upload profile picture."
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  };

  /*
   * =====================================================
   * REMOVE IMAGE
   * =====================================================
   */

  const handleRemoveImage =
    async () => {
      try {
        setRemovingImage(true);
        setError("");
        setSuccess("");

        await api.delete(
          "/doctors/profile/image",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setDoctor((current) => ({
          ...current,

          user: {
            ...current.user,

            profileImage: {
              url: "",
              publicId: "",
            },
          },
        }));

        setSuccess(
          "Profile picture removed successfully."
        );
      } catch (error) {
        console.error(
          "Remove profile image error:",
          error
        );

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
   * UPDATE PROFILE
   * =====================================================
   */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response =
        await api.patch(
          "/doctors/profile",
          {
            name: form.name.trim(),

            specialization:
              form.specialization.trim(),

            qualification:
              form.qualification.trim(),

            bio: form.bio.trim(),

            experience:
              Number(form.experience),

            consultationFee:
              Number(
                form.consultationFee
              ),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (
        response.data?.doctor
      ) {
        setDoctor(
          response.data.doctor
        );
      }

      setSuccess(
        "Profile updated successfully."
      );
    } catch (error) {
      console.error(
        "Update doctor profile error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to update profile."
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
      <div className="flex min-h-screen bg-slate-50">
        <DoctorSidebar />

        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-500">
            Loading profile...
          </p>
        </main>
      </div>
    );
  }

  const imageUrl =
    doctor?.user?.profileImage
      ?.url || "";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DoctorSidebar />

      <div className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-4 sm:px-6 py-6">
            <p className="text-sm text-slate-500">
              Doctor Portal
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              My Profile
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage your professional information
              and profile picture.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 sm:px-4 sm:px-6 py-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                size={17}
                className="text-emerald-600"
              />

              <p className="text-sm text-emerald-700">
                {success}
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* PROFILE IMAGE */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col items-center text-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={
                      doctor?.user
                        ?.name ||
                      "Doctor"
                    }
                    className="h-36 w-36 rounded-full border-4 border-slate-100 object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <UserRound
                      size={52}
                    />
                  </div>
                )}

                <h2 className="mt-5 text-lg font-semibold text-slate-900">
                  {doctor?.user
                    ?.name ||
                    "Doctor"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {doctor?.specialization ||
                    "Specialist"}
                </p>

                <div className="mt-6 flex w-full gap-2">
                  <label
                    htmlFor="doctorProfileImage"
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Camera
                      size={16}
                    />

                    {uploading
                      ? "Uploading..."
                      : imageUrl
                      ? "Change"
                      : "Upload"}
                  </label>

                  <input
                    id="doctorProfileImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleImageUpload
                    }
                    disabled={
                      uploading
                    }
                    className="hidden"
                  />

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={
                        handleRemoveImage
                      }
                      disabled={
                        removingImage
                      }
                      className="flex items-center justify-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Remove picture"
                    >
                      <Trash2
                        size={17}
                      />
                    </button>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  JPG, PNG or WebP · Maximum 5 MB
                </p>
              </div>
            </section>

            {/* PROFILE DETAILS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <Stethoscope
                    size={18}
                  />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Professional Information
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Keep your information up to date.
                  </p>
                </div>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="mt-7 space-y-5"
              >
                <div className="grid gap-5 md:grid-cols-1 sm:grid-cols-2">
                  <Field
                    label="Full name"
                    name="name"
                    value={
                      form.name
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Email
                    </label>

                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <Mail
                        size={16}
                      />

                      {doctor?.user
                        ?.email ||
                        "No email"}
                    </div>
                  </div>

                  <Field
                    label="Specialization"
                    name="specialization"
                    value={
                      form.specialization
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <Field
                    label="Qualification"
                    name="qualification"
                    value={
                      form.qualification
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <Field
                    label="Experience (years)"
                    name="experience"
                    type="number"
                    min="0"
                    max="80"
                    value={
                      form.experience
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <Field
                    label="Consultation fee"
                    name="consultationFee"
                    type="number"
                    min="0"
                    value={
                      form.consultationFee
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="bio"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    About the doctor
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    maxLength={2000}
                    rows={5}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    placeholder="Share professional information patients should know."
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {form.bio.length}/2000
                  </p>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-6">
                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Save
                      size={17}
                    />

                    {saving
                      ? "Saving..."
                      : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  min,
  max,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        required
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
    </div>
  );
}

export default DoctorProfile;