
import { Link } from "react-router-dom";
import {
  GraduationCap,
  School,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import HICLogo from "../assets/HIC_LOGO_TRANSPARENT.png";

const divisions = [
  {
    id: "college",
    title: "College",
    subtitle: "Higher Education",
    icon: GraduationCap,
    path: "/college",
  },
  {
    id: "basic-ed",
    title: "Basic Education",
    subtitle: "Elementary & Secondary",
    icon: School,
    path: "/basic-ed",
  },
];

function DivisionCard({ division }) {
  const Icon = division.icon;

  return (
    <Link
      to={division.path}
      className="group flex items-center gap-4 rounded-2xl border border-white/60 bg-white/90 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-green-300 hover:shadow-xl hover:shadow-green-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 sm:p-6"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700 transition-colors group-hover:bg-green-600 group-hover:text-white">
        <Icon size={28} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {division.title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {division.subtitle}
        </p>
      </div>

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-green-600 group-hover:text-white">
        <ArrowRight size={18} />
      </span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7faf7]">

      {/* Parallax background */}
      <div
        className="pointer-events-none absolute inset-0 -z-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: "url('/hic_admin.jpg')",
        }}
        aria-hidden="true"
      />

      {/* Background overlay */}
      <div className="pointer-events-none absolute inset-0 -z-0 bg-white/75" />

      {/* Header */}
      <header className="relative z-10">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-end px-5 sm:px-8">
          <Link
            to="/login"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/60 bg-white/70 px-3 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-green-50 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <ShieldCheck size={16} />
            <span>Admin Login</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-5 pb-16 pt-4 sm:px-8">

        <img
          src={HICLogo}
          alt="HIC Logo"
          className="h-32 w-auto object-contain drop-shadow-sm sm:h-44"
        />

        <h1 className="mt-8 max-w-3xl text-balance text-center text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
          HIC TEACHER EVALUATION
        </h1>

        <div
          className="mt-6 h-1 w-16 rounded-full bg-green-600"
          aria-hidden="true"
        />

        <p className="mt-5 text-center text-sm font-medium tracking-wide text-slate-600 sm:text-base">
          Select your education division to continue
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-5 sm:grid-cols-2 sm:gap-6">
          {divisions.map((division) => (
            <DivisionCard key={division.id} division={division} />
          ))}
        </div>

      </main>
    </div>
  );
}
