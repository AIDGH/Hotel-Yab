"use client";

import type { ChangeEvent, SelectHTMLAttributes } from "react";

export function AutoSubmitSelect(
  props: SelectHTMLAttributes<HTMLSelectElement>,
) {
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

    const search = params.toString();
    window.location.assign(
      search ? `${window.location.pathname}?${search}` : window.location.pathname,
    );
  }

  return <select {...props} onChange={handleChange} />;
}