"use client";

import { useState } from "react";
import { browserApi } from "@/lib/browser-api";

export function AdminDeleteAction({
  endpoint,
  itemLabel,
  onDeleted,
}: {
  endpoint: string;
  itemLabel: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      await browserApi(endpoint, { method: "DELETE" });
      onDeleted();
    } catch {
      setError(`حذف ${itemLabel} انجام نشد.`);
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="admin-delete-action">
      {confirming ? (
        <div className="admin-delete-confirm">
          <span>حذف شود؟</span>
          <button type="button" onClick={() => void remove()} disabled={deleting}>
            {deleting ? "در حال حذف…" : "بله، حذف"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>
            انصراف
          </button>
        </div>
      ) : (
        <button
          className="admin-delete-trigger"
          type="button"
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
        >
          حذف توسط ادمین
        </button>
      )}
      {error ? <small className="admin-delete-error" role="alert">{error}</small> : null}
    </div>
  );
}
