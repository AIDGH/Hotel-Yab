"use client";

import type { ChangeEvent, SelectHTMLAttributes } from "react";

type AutoSubmitSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  resetFields?: string[];
};

export function AutoSubmitSelect({
  resetFields = [],
  ...props
}: AutoSubmitSelectProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    props.onChange?.(event);

    if (event.defaultPrevented) return;

    const form = event.currentTarget.form;
    if (!form) return;

    const params = new URLSearchParams();

    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string" && value) {
        params.append(key, value);
      }
    }

    if (params.get("type") === "provinces") {
      params.delete("province");
    }

    for (const field of resetFields) {
      params.delete(field);
    }

    const search = params.toString();
    window.location.assign(
      search ? `${window.location.pathname}?${search}` : window.location.pathname,
    );
  }

  return <select {...props} onChange={handleChange} />;
}
