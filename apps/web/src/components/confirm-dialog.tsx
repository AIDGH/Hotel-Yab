"use client";

import { useEffect } from "react";
import { SiteIcon } from "./site-icon";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  busy = false,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <span className={`confirm-dialog-icon${danger ? " is-danger" : ""}`}>
          <SiteIcon name={danger ? "alert" : "check"} />
        </span>
        <div>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p id="confirm-dialog-description">{description}</p>
        </div>
        <footer>
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`button${danger ? " button-danger" : ""}`}
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "در حال انجام…" : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
