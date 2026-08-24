"use client";

import type { InputHTMLAttributes } from "react";

type AutoSubmitInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue"
> & {
  defaultValue?: string;
};

export function AutoSubmitInput({
  defaultValue = "",
  ...props
}: AutoSubmitInputProps) {
  // Search submits only through the containing form to avoid navigation races.
  return <input {...props} defaultValue={defaultValue} />;
}
