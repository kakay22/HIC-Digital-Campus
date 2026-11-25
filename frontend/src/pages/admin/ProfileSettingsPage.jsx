
import { useCallback, useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  ShieldCheck,
  CalendarDays,
  Clock3,
  RefreshCw,
  CircleUserRound,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Shield,
  Pencil,
  X,
  Save,
  KeyRound,
} from "lucide-react";
import toast from "react-hot-toast";

import profileService from "../../services/profileService";

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(profile) {
  const first = profile?.first_name?.trim()?.[0] || "";
  const last = profile?.last_name?.trim()?.[0] || "";

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  return profile?.username?.trim()?.[0]?.toUpperCase() || "A";
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) {
    return "Something went wrong. Please try again.";
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data === "string") {
    return data;
  }

  return Object.entries(data)
    .map(([field, messages]) => {
      const label = field.replaceAll("_", " ");

      const message = Array.isArray(messages)
        ? messages.join(" ")
        : typeof messages === "string"
          ? messages
          : JSON.stringify(messages);

      return `${label}: ${message}`;
    })
    .join("\n");
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
      <div className="rounded-lg bg-gray-50 p-2 text-gray-500">
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-gray-900">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function AccessBadge({ enabled, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
        enabled
          ? "bg-emerald-50 text-emerald-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      <CheckCircle2 size={13} />
      {label}
    </span>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
      />
    </div>
  );
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <Icon size={19} className="text-indigo-600" />
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>

      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [error, setError] = useState("");

  const fetchProfile = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await profileService.getProfile();

      setProfile(data);

      setProfileForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
      });
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to load your administrator profile.";

      setError(message);

      if (silent) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileChange = (field, value) => {
    setProfileForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!profileForm.first_name.trim()) {
      toast.error("First name is required.");
      return;
    }

    if (!profileForm.last_name.trim()) {
      toast.error("Last name is required.");
      return;
    }

    if (!profileForm.email.trim()) {
      toast.error("Email address is required.");
      return;
    }

    setSavingProfile(true);

    try {
      const updatedProfile = await profileService.updateProfile({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim(),
      });

      setProfile(updatedProfile);

      setProfileForm({
        first_name: updatedProfile.first_name || "",
        last_name: updatedProfile.last_name || "",
        email: updatedProfile.email || "",
      });

      setEditing(false);

      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(getErrorMessage(err), {
        duration: 5000,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileForm({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      email: profile?.email || "",
    });

    setEditing(false);
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    const {
      current_password,
      new_password,
      confirm_password,
    } = passwordForm;

    if (!current_password || !new_password || !confirm_password) {
      toast.error("Please complete all password fields.");
      return;
    }

    if (new_password !== confirm_password) {
      toast.error("Your new passwords do not match.");
      return;
    }

    if (new_password.length < 8) {
      toast.error("Your new password must contain at least 8 characters.");
      return;
    }

    setChangingPassword(true);

    try {
      const response = await profileService.changePassword({
        current_password,
        new_password,
        confirm_password,
      });

      toast.success(
        response.detail || "Password changed successfully."
      );

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      toast.error(getErrorMessage(err), {
        duration: 5000,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const displayName =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ") ||
    profile?.username ||
    "Administrator";

  const accountRole = profile?.is_superuser
    ? "Super Administrator"
    : profile?.is_staff
      ? "Administrator"
      : "Standard Account";

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-gray-500">
        <LoaderCircle size={28} className="animate-spin text-indigo-600" />
        <p className="text-sm">Loading account information...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 text-center">
        <div className="rounded-2xl bg-rose-50 p-4 text-rose-600">
          <AlertCircle size={28} />
        </div>

        <h2 className="mt-4 text-lg font-bold text-gray-900">
          Unable to load profile
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">{error}</p>

        <button
          type="button"
          onClick={() => fetchProfile()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 pb-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Profile & Settings
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Manage your administrator account and security settings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchProfile(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh profile
        </button>
      </div>

      {/* Profile overview */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 sm:h-36" />

        <div className="px-5 pb-5 sm:px-7">
          <div className="-mt-11 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-indigo-100 text-2xl font-bold text-indigo-700 shadow-sm sm:h-24 sm:w-24 sm:text-3xl">
                {getInitials(profile)}
              </div>

              <div className="min-w-0 pb-1">
                <h2 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
                  {displayName}
                </h2>

                <p className="mt-0.5 break-all text-sm text-gray-500">
                  @{profile?.username || "username"}
                </p>
              </div>
            </div>

            <div className="pb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Authenticated account
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              <ShieldCheck size={14} />
              {accountRole}
            </span>

            {profile?.is_staff && (
              <AccessBadge enabled label="Staff access" />
            )}

            {profile?.is_superuser && (
              <AccessBadge enabled label="Full system access" />
            )}
          </div>
        </div>
      </section>

      {/* Account information */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <SectionHeading
            icon={CircleUserRound}
            title="Account information"
            description="Information associated with your administrator account."
          />

          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Pencil size={15} />
              Edit profile
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                value={profileForm.first_name}
                onChange={(value) =>
                  handleProfileChange("first_name", value)
                }
                placeholder="Enter first name"
              />

              <Field
                label="Last name"
                value={profileForm.last_name}
                onChange={(value) =>
                  handleProfileChange("last_name", value)
                }
                placeholder="Enter last name"
              />

              <div className="sm:col-span-2">
                <Field
                  label="Email address"
                  type="email"
                  value={profileForm.email}
                  onChange={(value) =>
                    handleProfileChange("email", value)
                  }
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingProfile}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <X size={16} />
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {savingProfile ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem
              icon={UserRound}
              label="Username"
              value={profile?.username}
            />

            <InfoItem
              icon={Mail}
              label="Email address"
              value={profile?.email}
            />

            <InfoItem
              icon={UserRound}
              label="First name"
              value={profile?.first_name}
            />

            <InfoItem
              icon={UserRound}
              label="Last name"
              value={profile?.last_name}
            />

            <InfoItem
              icon={Shield}
              label="Account role"
              value={accountRole}
            />

            <InfoItem
              icon={CalendarDays}
              label="Account created"
              value={formatDate(profile?.date_joined)}
            />
          </div>
        )}
      </section>

      {/* Security and access */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <SectionHeading
          icon={LockKeyhole}
          title="Security & access"
          description="Your current account permissions and login activity."
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <ShieldCheck size={19} />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Administrator access
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Permission to access the administration dashboard.
                </p>
              </div>
            </div>

            <AccessBadge
              enabled={Boolean(profile?.is_staff || profile?.is_superuser)}
              label={
                profile?.is_staff || profile?.is_superuser
                  ? "Enabled"
                  : "Disabled"
              }
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-4">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Clock3 size={19} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Last login
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {formatDate(profile?.last_login)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-4">
            <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
              <CalendarDays size={19} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Account registration
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {formatDate(profile?.date_joined)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Change password */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <SectionHeading
          icon={KeyRound}
          title="Change password"
          description="Keep your administrator account secure by using a strong password."
        />

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Current password"
                type="password"
                value={passwordForm.current_password}
                onChange={(value) =>
                  handlePasswordChange("current_password", value)
                }
                placeholder="Enter your current password"
              />
            </div>

            <Field
              label="New password"
              type="password"
              value={passwordForm.new_password}
              onChange={(value) =>
                handlePasswordChange("new_password", value)
              }
              placeholder="Enter new password"
            />

            <Field
              label="Confirm new password"
              type="password"
              value={passwordForm.confirm_password}
              onChange={(value) =>
                handlePasswordChange("confirm_password", value)
              }
              placeholder="Confirm new password"
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
            Your new password must satisfy the password requirements
            configured in Django. It must also be different from your
            current password.
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {changingPassword ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <LockKeyhole size={16} />
              )}

              {changingPassword ? "Changing password..." : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
