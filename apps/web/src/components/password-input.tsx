"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-input">
      <input {...props} dir={props.dir ?? "ltr"} type={visible ? "text" : "password"} />
      <button
        className="password-input-toggle"
        type="button"
        aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2.8 12s3.2-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.2 5.2-9.2 5.2S2.8 12 2.8 12Z" />
          <circle cx="12" cy="12" r="2.5" />
          {visible ? <path className="password-eye-slash" d="M4.2 4.2 19.8 19.8" /> : null}
        </svg>
      </button>
    </span>
  );
}
