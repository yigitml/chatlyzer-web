"use client";

import { useEffect, useState } from "react";

type PolarMode = "sandbox" | "production";

export default function AdminPolarPage() {
  const [mode, setMode] = useState<PolarMode | null>(null);
  const [nextMode, setNextMode] = useState<PolarMode>("sandbox");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMode() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/polar-mode");
      if (!response.ok) {
        throw new Error(
          response.status === 403 ? "Forbidden" : "Failed to load Polar mode",
        );
      }

      const payload = await response.json();
      const loadedMode = payload.data?.mode as PolarMode;
      setMode(loadedMode);
      setNextMode(loadedMode);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load Polar mode",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveMode() {
    setSaving(true);
    setError(null);

    try {
      if (
        nextMode === "production" &&
        mode !== "production" &&
        confirmation !== "GO LIVE"
      ) {
        throw new Error('Type "GO LIVE" to switch to production.');
      }

      const response = await fetch("/api/admin/polar-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });

      if (!response.ok) {
        throw new Error("Failed to update Polar mode");
      }

      const payload = await response.json();
      const updatedMode = payload.data?.mode as PolarMode;
      setMode(updatedMode);
      setNextMode(updatedMode);
      setConfirmation("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update Polar mode",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMode();
  }, []);

  if (loading) {
    return <main className="p-8">Loading Polar mode...</main>;
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Polar Environment</h1>
        <p className="text-sm text-muted-foreground">
          Toggle whether new checkouts use Polar sandbox or production.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {mode === "sandbox" && (
        <div className="rounded-md border border-yellow-500 bg-yellow-50 p-4 text-sm text-yellow-800">
          Polar is currently in SANDBOX mode. Real payments are disabled.
        </div>
      )}

      {mode === "production" && (
        <div className="rounded-md border border-green-500 bg-green-50 p-4 text-sm text-green-800">
          Polar is currently in PRODUCTION mode. Real payments are enabled.
        </div>
      )}

      <div className="space-y-3">
        <p>
          Current mode: <strong>{mode}</strong>
        </p>

        <label className="block space-y-2">
          <span>Next mode</span>
          <select
            value={nextMode}
            onChange={(event) => setNextMode(event.target.value as PolarMode)}
            className="w-full rounded-md border p-2"
          >
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
        </label>

        {nextMode === "production" && mode !== "production" && (
          <label className="block space-y-2">
            <span>Type GO LIVE to confirm production mode</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-md border p-2"
              placeholder="GO LIVE"
            />
          </label>
        )}

        <button
          onClick={saveMode}
          disabled={saving || nextMode === mode}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving ..." : "Save"}
        </button>
      </div>
    </main>
  );
}
