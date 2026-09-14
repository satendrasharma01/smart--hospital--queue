import {
  ArrowRight,
  Clock3,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <main>
        {/* =====================================================
            HERO SECTION
        ===================================================== */}
        <section className="border-b border-slate-200">
          <div className="mx-auto grid max-w-7xl gap-16 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-32">
            <div>
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Smarter hospital visits
              </p>

              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
                Know your place in the queue before you arrive.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
                Book your appointment, follow your doctor's queue, and
                spend less time waiting at the hospital.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Book an appointment
                  <ArrowRight size={17} />
                </Link>

                <a
                  href="#how-it-works"
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* =================================================
                LIVE QUEUE PREVIEW

                IMPORTANT:
                No fake doctor, token, waiting time or
                appointment data is displayed here.
                Real queue data is available after login.
            ================================================== */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">
                      Live queue tracking
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      Track your appointment
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      View your real appointment, token position, and
                      estimated waiting time after booking.
                    </p>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Clock3
                      size={19}
                      className="text-slate-700"
                    />
                  </div>
                </div>

                <div className="mt-7 border-y border-slate-200 py-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Stethoscope
                        size={18}
                        className="text-slate-700"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Your real queue information
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Available for booked appointments
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    to="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Sign in to view queue
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FEATURES
        ===================================================== */}
        <section
          id="features"
          className="border-b border-slate-200"
        >
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Built around patients
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Everything you need for a smoother visit.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <Feature
                icon={Clock3}
                title="Live queue"
                description="See how many patients are ahead and get a clearer estimate of your waiting time."
              />

              <Feature
                icon={Stethoscope}
                title="Find your doctor"
                description="Browse doctors by department and choose the right specialist for your appointment."
              />

              <Feature
                icon={ShieldCheck}
                title="Secure access"
                description="Separate patient, doctor, and admin access keeps hospital information protected."
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            HOW IT WORKS
        ===================================================== */}
        <section id="how-it-works">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              How it works
            </p>

            <div className="mt-10 grid gap-10 md:grid-cols-3">
              <Step
                number="01"
                title="Book"
              >
                Choose a department, doctor, and appointment date.
              </Step>

              <Step
                number="02"
                title="Track"
              >
                Check your token and see where you are in the queue.
              </Step>

              <Step
                number="03"
                title="Visit"
              >
                Arrive when your turn is approaching and meet your doctor.
              </Step>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <Icon
        size={22}
        className="text-slate-700"
      />

      <h3 className="mt-6 font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}) {
  return (
    <div>
      <span className="text-sm font-semibold text-slate-400">
        {number}
      </span>

      <h3 className="mt-3 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
        {children}
      </p>
    </div>
  );
}

export default Home;