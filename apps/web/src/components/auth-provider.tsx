"use client";

import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { browserApi } from "@/lib/browser-api";

export type AuthUser = {
  id: string;
  mobile: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  instagramHandle: string | null;
  role: string;
  hasPassword: boolean;
  profileComplete: boolean;
  notablePerson: { slug: string; displayName: string } | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  openAuth: () => void;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
};

type RegistrationDraft = {
  mobile: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  instagramHandle: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    browserApi<{ data: AuthUser }>("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await browserApi("/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        openAuth: () => setAuthOpen(true),
        logout,
        updateUser: setUser,
      }}
    >
      {children}
      {authOpen ? (
        <AuthModal
          currentUser={user}
          onAuthenticated={setUser}
          onClose={() => setAuthOpen(false)}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

function AuthModal({
  currentUser,
  onAuthenticated,
  onClose,
}: {
  currentUser: AuthUser | null;
  onAuthenticated: (user: AuthUser) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<
    "login" | "login-otp" | "register" | "register-otp" | "profile"
  >(currentUser ? "profile" : "login");
  const [identifier, setIdentifier] = useState("");
  const [mobile, setMobile] = useState(currentUser?.mobile ?? "");
  const [code, setCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null);
  const [registration, setRegistration] = useState<RegistrationDraft | null>(
    null,
  );
  const [user, setUser] = useState(currentUser);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loginWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await browserApi<{ data: AuthUser }>(
        "/auth/login/password",
        {
          method: "POST",
          body: JSON.stringify({ identifier, password: form.get("password") }),
        },
      );
      finishAuthentication(result.data);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function requestLoginOtp() {
    if (!identifier.trim()) {
      setError("شماره تماس یا نام‌کاربری را وارد کنید.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<{
        data: { mobile: string; developmentCode?: string };
      }>("/auth/login/otp/request", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });
      setMobile(result.data.mobile);
      setDevelopmentCode(result.data.developmentCode ?? null);
      setStage("login-otp");
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyLoginOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<{ data: AuthUser }>(
        "/auth/login/otp/verify",
        {
          method: "POST",
          body: JSON.stringify({ identifier, code }),
        },
      );
      finishAuthentication(result.data);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function requestRegistrationOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const draft = {
      mobile: String(form.get("mobile") ?? ""),
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      instagramHandle: String(form.get("instagramHandle") ?? ""),
    };
    try {
      const result = await browserApi<{
        data: { mobile: string; developmentCode?: string };
      }>("/auth/register/otp/request", {
        method: "POST",
        body: JSON.stringify({ mobile: draft.mobile }),
      });
      setRegistration({ ...draft, mobile: result.data.mobile });
      setMobile(result.data.mobile);
      setDevelopmentCode(result.data.developmentCode ?? null);
      setStage("register-otp");
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function finishRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registration) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<{ data: AuthUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...registration, code }),
      });
      finishAuthentication(result.data);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    try {
      const result = await browserApi<{ data: AuthUser }>("/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          username: form.get("username"),
          ...(password ? { password } : {}),
          email: form.get("email"),
          instagramHandle: form.get("instagramHandle"),
        }),
      });
      onAuthenticated(result.data);
      onClose();
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  function finishAuthentication(authenticatedUser: AuthUser) {
    setUser(authenticatedUser);
    onAuthenticated(authenticatedUser);
    if (authenticatedUser.profileComplete) onClose();
    else setStage("profile");
  }

  function switchStage(nextStage: typeof stage) {
    setError("");
    setCode("");
    setDevelopmentCode(null);
    setStage(nextStage);
  }

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="auth-modal-close"
          type="button"
          onClick={onClose}
          aria-label="بستن"
        >
          ×
        </button>
        <span className="section-eyebrow">حساب هتل‌یاب</span>

        {stage === "login" ? (
          <form className="auth-form" onSubmit={loginWithPassword}>
            <h2 id="auth-modal-title">ورود به حساب</h2>
            <p>با شماره تماس یا نام‌کاربری و رمز عبور وارد شوید.</p>
            <label>
              شماره تماس یا نام‌کاربری
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="09121234567 یا username"
                autoCapitalize="none"
                autoFocus
                required
              />
            </label>
            <label>
              رمز عبور
              <input name="password" type="password" minLength={8} required />
            </label>
            <AuthError message={error} />
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "در حال ورود…" : "ورود"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void requestLoginOtp()}
              disabled={submitting}
            >
              ورود با رمز یک‌بارمصرف
            </button>
            <p className="auth-switch">
              حساب کاربری ندارید؟{" "}
              <button type="button" onClick={() => switchStage("register")}>
                ثبت‌نام
              </button>
            </p>
          </form>
        ) : null}

        {stage === "login-otp" ? (
          <OtpForm
            title="ورود با کد یک‌بارمصرف"
            mobile={mobile}
            code={code}
            developmentCode={developmentCode}
            submitting={submitting}
            error={error}
            onCodeChange={setCode}
            onSubmit={verifyLoginOtp}
            onBack={() => switchStage("login")}
          />
        ) : null}

        {stage === "register" ? (
          <form
            className="auth-form auth-profile-form"
            onSubmit={requestRegistrationOtp}
          >
            <h2 id="auth-modal-title">ساخت حساب کاربری</h2>
            <p>
              ابتدا اطلاعات را وارد کنید؛ سپس شماره تماس با کد شش‌رقمی تأیید
              می‌شود.
            </p>
            <div className="auth-form-row">
              <label>
                نام
                <input name="firstName" required minLength={2} />
              </label>
              <label>
                نام خانوادگی
                <input name="lastName" required minLength={2} />
              </label>
            </div>
            <label>
              شماره تماس
              <input
                name="mobile"
                type="tel"
                inputMode="tel"
                placeholder="09121234567"
                required
              />
            </label>
            <label>
              نام‌کاربری
              <input
                name="username"
                dir="ltr"
                autoCapitalize="none"
                placeholder="username"
                pattern="(?=.*[A-Za-z])[A-Za-z0-9._]{3,30}"
                required
              />
            </label>
            <label>
              رمز عبور <small>حداقل ۸ کاراکتر</small>
              <input
                name="password"
                type="password"
                minLength={8}
                maxLength={72}
                required
              />
            </label>
            <label>
              ایمیل <small>اختیاری</small>
              <input name="email" type="email" />
            </label>
            <label>
              آیدی اینستاگرام <small>اختیاری و یکتا</small>
              <input
                name="instagramHandle"
                dir="ltr"
                placeholder="instagram.username"
              />
            </label>
            <AuthError message={error} />
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "در حال ارسال…" : "ادامه و تأیید شماره"}
            </button>
            <p className="auth-switch">
              قبلاً حساب ساخته‌اید؟{" "}
              <button type="button" onClick={() => switchStage("login")}>
                ورود
              </button>
            </p>
          </form>
        ) : null}

        {stage === "register-otp" ? (
          <OtpForm
            title="تأیید شماره و ساخت حساب"
            mobile={mobile}
            code={code}
            developmentCode={developmentCode}
            submitting={submitting}
            error={error}
            onCodeChange={setCode}
            onSubmit={finishRegistration}
            onBack={() => switchStage("register")}
          />
        ) : null}

        {stage === "profile" ? (
          <form className="auth-form auth-profile-form" onSubmit={saveProfile}>
            <h2 id="auth-modal-title">تکمیل حساب قدیمی</h2>
            <p>برای ورودهای بعدی یک نام‌کاربری و رمز عبور تعیین کنید.</p>
            <div className="auth-form-row">
              <label>
                نام
                <input
                  name="firstName"
                  defaultValue={user?.firstName ?? ""}
                  required
                  minLength={2}
                />
              </label>
              <label>
                نام خانوادگی
                <input
                  name="lastName"
                  defaultValue={user?.lastName ?? ""}
                  required
                  minLength={2}
                />
              </label>
            </div>
            <label>
              نام‌کاربری
              <input
                name="username"
                dir="ltr"
                defaultValue={user?.username ?? ""}
                pattern="(?=.*[A-Za-z])[A-Za-z0-9._]{3,30}"
                required
              />
            </label>
            <label>
              رمز عبور <small>حداقل ۸ کاراکتر</small>
              <input
                name="password"
                type="password"
                minLength={8}
                maxLength={72}
                required={!user?.hasPassword}
              />
            </label>
            <label>
              ایمیل <small>اختیاری</small>
              <input
                name="email"
                type="email"
                defaultValue={user?.email ?? ""}
              />
            </label>
            <label>
              آیدی اینستاگرام <small>اختیاری و یکتا</small>
              <input
                name="instagramHandle"
                dir="ltr"
                defaultValue={user?.instagramHandle ?? ""}
              />
            </label>
            <AuthError message={error} />
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "در حال ذخیره…" : "ذخیره و ادامه"}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function OtpForm({
  title,
  mobile,
  code,
  developmentCode,
  submitting,
  error,
  onCodeChange,
  onSubmit,
  onBack,
}: {
  title: string;
  mobile: string;
  code: string;
  developmentCode: string | null;
  submitting: boolean;
  error: string;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h2 id="auth-modal-title">{title}</h2>
      <p>
        کد شش‌رقمی ارسال‌شده به{" "}
        <bdi className="inline-mobile" dir="ltr">
          {mobile}
        </bdi>{" "}
        را وارد کنید.
      </p>
      {developmentCode ? (
        <div className="development-code">
          کد محیط توسعه: <strong>{developmentCode}</strong>
        </div>
      ) : null}
      <label>
        کد ورود
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="123456"
          autoFocus
          required
        />
      </label>
      <AuthError message={error} />
      <button className="button" type="submit" disabled={submitting}>
        {submitting ? "در حال بررسی…" : "تأیید و ادامه"}
      </button>
      <button className="button-link" type="button" onClick={onBack}>
        بازگشت
      </button>
    </form>
  );
}

function AuthError({ message }: { message: string }) {
  return message ? (
    <p className="auth-error" role="alert">
      {message}
    </p>
  ) : null;
}

function authErrorMessage(caught: unknown) {
  const message = caught instanceof Error ? caught.message : "خطایی رخ داد.";
  if (message.includes("wait")) return "برای دریافت کد جدید کمی صبر کنید.";
  if (message.includes("verification code"))
    return "کد واردشده نادرست یا منقضی شده است.";
  if (message.includes("credentials"))
    return "شماره یا نام‌کاربری و رمز عبور درست نیست.";
  if (message.includes("account was not found"))
    return "حسابی با این مشخصات پیدا نشد.";
  if (message.includes("mobile"))
    return "این شماره تماس قبلاً استفاده شده است.";
  if (message.includes("username") && message.includes("Instagram"))
    return "این آیدی اینستاگرام قبلاً استفاده شده است.";
  if (message.includes("username"))
    return "این نام‌کاربری قبلاً استفاده شده است.";
  if (message.includes("email")) return "این ایمیل قبلاً استفاده شده است.";
  if (message.includes("Instagram"))
    return "این آیدی اینستاگرام قبلاً استفاده شده است.";
  return "درخواست انجام نشد. اطلاعات را بررسی و دوباره تلاش کنید.";
}
