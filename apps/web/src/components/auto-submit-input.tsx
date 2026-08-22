"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

type AutoSubmitInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue"
> & {
  defaultValue?: string;
  minimumLength?: number;
  delay?: number;
};

export function AutoSubmitInput({
  defaultValue = "",
  minimumLength = 2,
  delay = 380,
  ...props
}: AutoSubmitInputProps) {
  const [value, setValue] = useState(defaultValue);
  const initialValue = useRef(defaultValue.trim());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const normalized = value.trim();
    if (normalized === initialValue.current) return;
    if (normalized.length > 0 && normalized.length < minimumLength) return;

    const timeout = window.setTimeout(() => {
      inputRef.current?.form?.requestSubmit();
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [delay, minimumLength, value]);

  return (
    <input
      ref={inputRef}
      {...props}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        props.onChange?.(event);
      }}
    />
  );
}
