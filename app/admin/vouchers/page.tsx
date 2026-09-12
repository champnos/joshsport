"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Voucher } from "@/lib/types";

interface VoucherFormState {
  code: string;
  discount_percentage: string;
  active: boolean;
  expires_at: string;
  max_uses: string;
}

const emptyForm: VoucherFormState = {
  code: "",
  discount_percentage: "",
  active: true,
  expires_at: "",
  max_uses: "",
};

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminVouchersPage() {
  const [adminToken, setAdminToken] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherFormState>(emptyForm);

  const headers = useMemo(
    () => ({ "x-admin-password": adminToken, "Content-Type": "application/json" }),
    [adminToken],
  );

  const loadVouchers = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/vouchers", { headers });
      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        setIsAuthed(false);
        setAuthError("Your admin session expired. Please log in again.");
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to load vouchers.");
      }
      const data = (await response.json()) as Voucher[];
      setVouchers(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load vouchers.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, headers]);

  useEffect(() => {
    let cancelled = false;

    const verifyStoredPassword = async () => {
      const savedPassword = localStorage.getItem("adminToken") || "";
      if (!savedPassword) {
        if (!cancelled) setCheckingAuth(false);
        return;
      }

      setAdminToken(savedPassword);
      try {
        const response = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: savedPassword }),
        });

        if (cancelled) return;

        if (response.ok) {
          setIsAuthed(true);
          setAuthError("");
        } else {
          localStorage.removeItem("adminToken");
          setAdminToken("");
        }
      } finally {
        if (!cancelled) setCheckingAuth(false);
      }
    };

    void verifyStoredPassword();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    localStorage.setItem("adminToken", adminToken);
    void loadVouchers();
  }, [adminToken, isAuthed, loadVouchers]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingVoucherId(null);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminToken }),
    });

    if (response.ok) {
      setIsAuthed(true);
      setAuthError("");
      return;
    }

    setAuthError("Incorrect password.");
  };

  const handleSaveVoucher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        code: form.code,
        discount_percentage: form.discount_percentage,
        active: form.active,
        expires_at: form.expires_at || null,
        max_uses: form.max_uses || null,
      };

      const endpoint = editingVoucherId ? `/api/admin/vouchers/${editingVoucherId}` : "/api/admin/vouchers";
      const method = editingVoucherId ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        setIsAuthed(false);
        setAuthError("Your admin session expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        setError(data?.error ?? "Unable to save voucher.");
        return;
      }

      const savedVoucher = data as Voucher;
      if (editingVoucherId) {
        setVouchers((current) => current.map((voucher) => (voucher.id === editingVoucherId ? savedVoucher : voucher)));
      } else {
        setVouchers((current) => [savedVoucher, ...current]);
      }
      resetForm();
    } catch {
      setError("Unable to save voucher.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (voucher: Voucher) => {
    setEditingVoucherId(voucher.id);
    setForm({
      code: voucher.code,
      discount_percentage: String(voucher.discount_percentage),
      active: voucher.active,
      expires_at: toDateTimeLocal(voucher.expires_at),
      max_uses: voucher.max_uses === null ? "" : String(voucher.max_uses),
    });
  };

  const toggleActive = async (voucher: Voucher) => {
    try {
      const response = await fetch(`/api/admin/vouchers/${voucher.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ active: !voucher.active }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Unable to update voucher.");
        return;
      }
      setVouchers((current) => current.map((item) => (item.id === voucher.id ? (data as Voucher) : item)));
    } catch {
      setError("Unable to update voucher.");
    }
  };

  const handleDelete = async (voucherId: string) => {
    if (!window.confirm("Delete this voucher code?")) return;
    try {
      const response = await fetch(`/api/admin/vouchers/${voucherId}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Unable to delete voucher.");
        return;
      }
      setVouchers((current) => current.filter((voucher) => voucher.id !== voucherId));
      if (editingVoucherId === voucherId) resetForm();
    } catch {
      setError("Unable to delete voucher.");
    }
  };

  if (checkingAuth) {
    return <p className="text-center py-10 text-gray-500">Checking access...</p>;
  }

  if (!isAuthed) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <h1 className="text-2xl font-bold text-brand-blue mb-4">Admin Login</h1>
        <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none mb-4"
            placeholder="Enter admin password"
          />
          {authError && <p className="text-red-600 text-sm mb-3">{authError}</p>}
          <button type="submit" className="w-full bg-brand-blue text-white font-bold py-3 rounded-lg hover:opacity-90">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-blue py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">Voucher Management</h1>
          <Link href="/admin" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25">
            Back to Admin
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <form onSubmit={handleSaveVoucher} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-brand-blue">{editingVoucherId ? "Edit voucher" : "Create voucher"}</h2>
            {editingVoucherId && (
              <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-brand-blue">
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Discount %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.discount_percentage}
                onChange={(event) => setForm((prev) => ({ ...prev, discount_percentage: event.target.value }))}
                placeholder="20"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Expiry (optional)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(event) => setForm((prev) => ({ ...prev, expires_at: event.target.value }))}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-blue mb-1">Max Uses (optional)</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(event) => setForm((prev) => ({ ...prev, max_uses: event.target.value }))}
                placeholder="100"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 accent-brand-gold"
            />
            Active voucher
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving} className="bg-brand-blue text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : editingVoucherId ? "Update voucher" : "Create voucher"}
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-brand-blue">Existing vouchers</h2>
            <button onClick={() => void loadVouchers()} className="text-sm font-semibold text-brand-blue hover:text-brand-gold">
              Refresh
            </button>
          </div>

          {loading && <p className="text-sm text-gray-500">Loading vouchers…</p>}
          {!loading && vouchers.length === 0 && <p className="text-sm text-gray-500">No vouchers created yet.</p>}

          {!loading && vouchers.length > 0 && (
            <div className="space-y-3">
              {vouchers.map((voucher) => (
                <div key={voucher.id} className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-bold text-brand-blue">{voucher.code}</p>
                      <span className="text-sm font-semibold text-brand-gold">{voucher.discount_percentage}% off</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${voucher.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {voucher.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Uses: {voucher.uses_count}{voucher.max_uses !== null ? ` / ${voucher.max_uses}` : ""} ·
                      {voucher.expires_at ? ` Expires ${new Date(voucher.expires_at).toLocaleString()}` : " No expiry"}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => startEdit(voucher)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:border-brand-blue hover:text-brand-blue"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(voucher)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:border-brand-blue hover:text-brand-blue"
                    >
                      {voucher.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(voucher.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
