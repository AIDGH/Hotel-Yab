"use client";

import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { browserApi } from "@/lib/browser-api";
import {
  authErrorMessage,
  isStrongPassword,
  isRegistrationConflict,
  STRONG_PASSWORD_ERROR,
} from "@/lib/auth-errors";
import { formatIranianMobile } from "@/lib/labels";
import { PasswordInput } from "./password-input";

export type AuthUser = {
  id: string;
  mobile: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  instagramHandle: string | null;
  avatarUrl: string | null;
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
};

type OtpResponse = {
  data: {
    mobile: string;
    resendAfterSeconds: number;
    developmentCode?: string;
  };
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
    | "login"
    | "login-otp-request"
    | "login-otp"
    | "register"
    | "register-otp"
    | "profile"
  >(currentUser ? "profile" : "login");
  const [identifier, setIdentifier] = useState("");
  const [mobile, setMobile] = useState(currentUser?.mobile ?? "");
  const [code, setCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [registration, setRegistration] = useState<RegistrationDraft | null>(
    null,
  );
  const [user, setUser] = useState(currentUser);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const otpVerificationInFlight = useRef(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function loginWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (!identifier.trim()) {
      setError("شماره تماس یا نام‌کاربری را وارد کنید.");
      return;
    }
    if (!password) {
      setError("رمز عبور را وارد کنید.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<{ data: AuthUser }>(
        "/auth/login/password",
        {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        },
      );
      finishAuthentication(result.data);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function requestLoginOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const requestedMobile = String(form.get("mobile") ?? "").trim();
    if (!/^(?:(?:\+|00)?98|0)?9\d{9}$/.test(requestedMobile)) {
      setError("شماره تماس باید ۱۱ رقم و با ۰۹ شروع شود.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<OtpResponse>("/auth/login/otp/request", {
        method: "POST",
        body: JSON.stringify({ identifier: requestedMobile }),
      });
      setIdentifier(requestedMobile);
      setMobile(result.data.mobile);
      setDevelopmentCode(result.data.developmentCode ?? null);
      setCode("");
      setResendSeconds(result.data.resendAfterSeconds);
      setStage("login-otp");
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendLoginOtp() {
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<OtpResponse>("/auth/login/otp/request", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });
      setMobile(result.data.mobile);
      setDevelopmentCode(result.data.developmentCode ?? null);
      setCode("");
      setResendSeconds(result.data.resendAfterSeconds);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyLoginOtp(verificationCode: string) {
    if (otpVerificationInFlight.current) return;
    otpVerificationInFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<{ data: AuthUser }>(
        "/auth/login/otp/verify",
        {
          method: "POST",
          body: JSON.stringify({ identifier, code: verificationCode }),
        },
      );
      finishAuthentication(result.data);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      otpVerificationInFlight.current = false;
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
    };
    if (!isStrongPassword(draft.password)) {
      setError(STRONG_PASSWORD_ERROR);
      setSubmitting(false);
      return;
    }
    try {
      const result = await browserApi<OtpResponse>("/auth/register/otp/request", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setRegistration({ ...draft, mobile: result.data.mobile });
      setMobile(result.data.mobile);
      setDevelopmentCode(result.data.developmentCode ?? null);
      setCode("");
      setResendSeconds(result.data.resendAfterSeconds);
      setStage("register-otp");
    } catch (caught) {
      const message = authErrorMessage(caught);
      if (isRegistrationConflict(caught)) {
        setStage("register");
        setCode("");
        setDevelopmentCode(null);
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resendRegistrationOtp() {
    if (!registration) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<OtpResponse>(
        "/auth/register/otp/request",
        {
          method: "POST",
          body: JSON.stringify(registration),
        },
      );
      setMobile(result.data.mobile);
      setDevelopmentCode(result.data.developmentCode ?? null);
      setCode("");
      setResendSeconds(result.data.resendAfterSeconds);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function finishRegistration(verificationCode: string) {
    if (!registration) return;
    if (otpVerificationInFlight.current) return;
    otpVerificationInFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      const result = await browserApi<{ data: AuthUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...registration, code: verificationCode }),
      });
      finishAuthentication(result.data);
    } catch (caught) {
      const message = authErrorMessage(caught);
      if (isRegistrationConflict(caught)) {
        setStage("register");
        setCode("");
        setDevelopmentCode(null);
      }
      setError(message);
    } finally {
      otpVerificationInFlight.current = false;
      setSubmitting(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if ((!user?.hasPassword || password) && !isStrongPassword(password)) {
      setError(STRONG_PASSWORD_ERROR);
      setSubmitting(false);
      return;
    }
    try {
      const result = await browserApi<{ data: AuthUser }>("/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
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
    setResendSeconds(0);
    setStage(nextStage);
  }

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={`auth-modal${stage === "register" ? " auth-modal-register" : ""}`}
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
          <form className="auth-form" onSubmit={loginWithPassword} noValidate>
            <h2 id="auth-modal-title">ورود به حساب</h2>
            <p>با شماره تماس یا نام‌کاربری و رمز عبور وارد شوید.</p>
            <label>
              شماره تماس یا نام‌کاربری
              <input
                dir="ltr"
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
              <PasswordInput
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <AuthError message={error} />
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "در حال ورود…" : "ورود"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => switchStage("login-otp-request")}
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

        {stage === "login-otp-request" ? (
          <form className="auth-form" onSubmit={requestLoginOtp} noValidate>
            <h2 id="auth-modal-title">ورود با رمز یک‌بارمصرف</h2>
            <p>شماره تماس حساب خود را وارد کنید تا کد ورود دریافت کنید.</p>
            <label>
              شماره تماس
              <small>۱۱ رقم و با ۰۹ شروع شود</small>
              <input
                name="mobile"
                type="tel"
                dir="ltr"
                inputMode="tel"
                defaultValue={/^09\d{9}$/.test(identifier) ? identifier : ""}
                placeholder="09121234567"
                autoComplete="tel"
                autoFocus
                required
              />
            </label>
            <AuthError message={error} />
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "در حال ارسال…" : "دریافت کد ورود"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => switchStage("login")}
            >
              بازگشت به ورود با رمز
            </button>
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
            onVerify={verifyLoginOtp}
            onBack={() => switchStage("login-otp-request")}
            resendSeconds={resendSeconds}
            onResend={resendLoginOtp}
          />
        ) : null}

        {stage === "register" ? (
          <form
            className="auth-form auth-profile-form auth-register-form"
            onSubmit={requestRegistrationOtp}
            noValidate
          >
            <h2 id="auth-modal-title">ساخت حساب کاربری</h2>
            <p>
              شماره تماس، نام‌کاربری و رمز را وارد کنید؛ اطلاعات پروفایل را
              بعداً از «حساب من» تکمیل می‌کنید.
            </p>
            <label>
              شماره تماس
              <small>۱۱ رقم و با ۰۹ شروع شود</small>
              <input
                name="mobile"
                type="tel"
                inputMode="tel"
                defaultValue={registration?.mobile ?? ""}
                placeholder="09121234567"
                pattern="09[0-9]{9}"
                required
              />
            </label>
            <label>
              نام‌کاربری
              <small>۳ تا ۳۰؛ حداقل یک حرف لاتین، عدد، نقطه یا زیرخط</small>
              <input
                name="username"
                dir="ltr"
                autoCapitalize="none"
                defaultValue={registration?.username ?? ""}
                placeholder="username"
                pattern="(?=.*[A-Za-z])[A-Za-z0-9._]{3,30}"
                required
              />
            </label>
            <label>
              رمز عبور
              <small>
                حداقل ۸؛ شامل حرف کوچک و بزرگ لاتین، عدد و نماد مثل @
              </small>
              <PasswordInput
                name="password"
                defaultValue={registration?.password ?? ""}
                minLength={8}
                maxLength={72}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}"
                autoComplete="new-password"
                required
              />
            </label>
            <p className="auth-register-later-note">
              نام، نام خانوادگی، ایمیل، آیدی اینستاگرام و عکس پروفایل بعداً
              قابل تکمیل‌اند.
            </p>
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
            onVerify={finishRegistration}
            onBack={() => switchStage("register")}
            resendSeconds={resendSeconds}
            onResend={resendRegistrationOtp}
          />
        ) : null}

        {stage === "profile" ? (
          <form
            className="auth-form auth-profile-form"
            onSubmit={saveProfile}
            noValidate
          >
            <h2 id="auth-modal-title">تکمیل حساب قدیمی</h2>
            <p>برای ورودهای بعدی یک نام‌کاربری و رمز عبور تعیین کنید.</p>
            <label>
              نام‌کاربری
              <small>۳ تا ۳۰؛ حداقل یک حرف لاتین، عدد، نقطه یا زیرخط</small>
              <input
                name="username"
                dir="ltr"
                defaultValue={user?.username ?? ""}
                pattern="(?=.*[A-Za-z])[A-Za-z0-9._]{3,30}"
                required
              />
            </label>
            <label>
              رمز عبور
              <small>
                حداقل ۸؛ شامل حرف کوچک و بزرگ لاتین، عدد و نماد مثل @
              </small>
              <PasswordInput
                name="password"
                minLength={8}
                maxLength={72}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}"
                autoComplete="new-password"
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
  onVerify,
  onBack,
  resendSeconds,
  onResend,
}: {
  title: string;
  mobile: string;
  code: string;
  developmentCode: string | null;
  submitting: boolean;
  error: string;
  onCodeChange: (value: string) => void;
  onVerify: (code: string) => void | Promise<void>;
  onBack: () => void;
  resendSeconds: number;
  onResend: () => void | Promise<void>;
}) {
  const lastAutoSubmittedCode = useRef("");

  useEffect(() => {
    if (code.length !== 6) {
      lastAutoSubmittedCode.current = "";
      return;
    }
    if (submitting || lastAutoSubmittedCode.current === code) return;

    lastAutoSubmittedCode.current = code;
    void onVerify(code);
  }, [code, onVerify, submitting]);

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!submitting && code.length === 6) void onVerify(code);
      }}
    >
      <h2 id="auth-modal-title">{title}</h2>
      <p>
        کد شش‌رقمی ارسال‌شده به{" "}
        <bdi className="inline-mobile" dir="ltr">
          {formatIranianMobile(mobile)}
        </bdi>{" "}
        را وارد کنید.
      </p>
      {developmentCode ? (
        <div className="development-code">
          کد محیط توسعه: <strong>{developmentCode}</strong>
        </div>
      ) : null}
      <label className="otp-code-field">
        کد ورود
        <span className="otp-code-control">
          <input
            className="otp-code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) =>
              onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            aria-label="کد شش‌رقمی"
            autoFocus
            required
          />
          <span className="otp-code-slots" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span
                className={`${code[index] ? "otp-code-slot-filled" : ""}${
                  code.length < 6 && index === code.length
                    ? " otp-code-slot-active"
                    : ""
                }`}
                key={index}
              >
                {code[index] ?? "—"}
              </span>
            ))}
          </span>
        </span>
      </label>
      <AuthError message={error} />
      <button
        className="button"
        type="submit"
        disabled={submitting || code.length !== 6}
      >
        {submitting ? "در حال بررسی…" : "تأیید و ادامه"}
      </button>
      <div className="otp-secondary-actions">
        <button
          className="button-link"
          type="button"
          onClick={() => void onResend()}
          disabled={submitting || resendSeconds > 0}
        >
          {resendSeconds > 0
            ? `ارسال مجدد تا ${formatCountdown(resendSeconds)}`
            : "ارسال مجدد کد"}
        </button>
        <button className="button-link" type="button" onClick={onBack}>
          بازگشت
        </button>
      </div>
    </form>
  );
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60).toLocaleString("fa-IR");
  const remainingSeconds = (seconds % 60).toLocaleString("fa-IR", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  return `${minutes}:${remainingSeconds}`;
}

function AuthError({ message }: { message: string }) {
  return message ? (
    <p className="auth-error" role="alert">
      {message}
    </p>
  ) : null;
}
