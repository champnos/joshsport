"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BookingsDashboard from "@/components/admin/BookingsDashboard";
import { Treatment, TreatmentDuration } from "@/lib/types";
import { DEFAULT_TERMS_AND_CONDITIONS, type TermsAndConditions } from "@/lib/terms-and-conditions";

interface TreatmentFormState {
  id?: string;
  name: string;
  description: string;
  durations: TreatmentDuration[];
  active: boolean;
  image_url?: string;
}

const emptyForm: TreatmentFormState = {
  name: "",
  description: "",
  durations: [{ mins: 30, price: 25 }],
  active: true,
};

const emptyTermsSection = {
  title: "",
  bullets: [""],
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "treatments" | "settings">("bookings");
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [treatmentError, setTreatmentError] = useState("");
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
  const [form, setForm] = useState<TreatmentFormState>(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [aboutImages, setAboutImages] = useState<string[]>([]);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [deletingHero, setDeletingHero] = useState(false);
  const [heroError, setHeroError] = useState("");
  const [uploadingAbout, setUploadingAbout] = useState(false);
  const [deletingAbout, setDeletingAbout] = useState(false);
  const [aboutError, setAboutError] = useState("");
  const [savingImageOrder, setSavingImageOrder] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState<TermsAndConditions>(DEFAULT_TERMS_AND_CONDITIONS);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [termsSuccess, setTermsSuccess] = useState("");

  // Social settings
  const [socials, setSocials] = useState({
    instagram: "",
    facebook: "",
    tiktok: "",
    email: "",
  });
  const [savingSocials, setSavingSocials] = useState(false);
  const [socialsError, setSocialsError] = useState("");

  const headers = useMemo(
    () => ({ "x-admin-password": password, "Content-Type": "application/json" }),
    [password],
  );

  const loadTreatments = useCallback(async () => {
    setLoadingTreatments(true);
    try {
      const res = await fetch("/api/treatments");
      if (!res.ok) {
        throw new Error("Failed to load treatments.");
      }
      setTreatments(await res.json());
    } catch {
      setTreatments([]);
    } finally {
      setLoadingTreatments(false);
    }
  }, []);

  const loadHeroImage = useCallback(async () => {
    try {
      const res = await fetch("/api/hero-image", { headers });
      if (res.ok) {
        const data = await res.json();
        const images = Array.isArray(data.images)
          ? data.images.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
          : data.image_url ? [data.image_url] : [];
        setHeroImages(images);
      }
    } catch {
      setHeroImages([]);
    }
  }, [headers]);

  const loadAboutImage = useCallback(async () => {
    try {
      const res = await fetch("/api/about-image", { headers });
      if (res.ok) {
        const data = await res.json();
        const images = Array.isArray(data.images)
          ? data.images.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
          : data.image_url ? [data.image_url] : [];
        setAboutImages(images);
      }
    } catch {
      setAboutImages([]);
    }
  }, [headers]);

  const loadSocials = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/social", { headers });
      if (res.ok) {
        const data = await res.json();
        setSocials(data);
      }
    } catch {
      console.error("Failed to load socials");
    }
  }, [headers]);

  const loadTerms = useCallback(async () => {
    setLoadingTerms(true);
    setTermsError("");
    try {
      const res = await fetch("/api/admin/terms", { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setTermsError(data?.error ?? "Failed to load terms and conditions.");
        return;
      }

      setTermsAndConditions(await res.json());
    } catch {
      setTermsError("Failed to load terms and conditions.");
    } finally {
      setLoadingTerms(false);
    }
  }, [headers]);

  useEffect(() => {
    let cancelled = false;

    const verifyStoredPassword = async () => {
      const savedPassword = localStorage.getItem("adminToken") || "";
      if (!savedPassword) {
        if (!cancelled) setCheckingAuth(false);
        return;
      }

      setPassword(savedPassword);

      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: savedPassword }),
        });

        if (cancelled) return;

        if (res.ok) {
          setIsAuthed(true);
          setAuthError("");
        } else {
          localStorage.removeItem("adminToken");
          setPassword("");
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
    if (isAuthed) {
      localStorage.setItem("adminToken", password);
      void loadTreatments();
      void loadHeroImage();
      void loadAboutImage();
      void loadSocials();
      void loadTerms();
    }
  }, [isAuthed, loadTreatments, loadHeroImage, loadAboutImage, loadSocials, loadTerms, password]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingTreatmentId(null);
    setTreatmentError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setIsAuthed(true);
      setAuthError("");
      setCheckingAuth(false);
    } else {
      setAuthError("Incorrect password.");
    }
  };

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("adminToken");
    setPassword("");
    setIsAuthed(false);
    setAuthError("Your admin session expired. Please log in again.");
  }, []);

  const toggleTreatmentActive = async (treatment: Treatment) => {
    const res = await fetch(`/api/treatments/${treatment.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ active: !treatment.active }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Treatment;
      setTreatments((prev) => prev.map((item) => (item.id === treatment.id ? updated : item)));
    }
  };

  const startEdit = (treatment: Treatment) => {
    setEditingTreatmentId(treatment.id);
    setTreatmentError("");
    setForm({
      id: treatment.id,
      name: treatment.name,
      description: treatment.description,
      durations: treatment.durations.length > 0 ? treatment.durations : [{ mins: 30, price: 25 }],
      active: treatment.active,
      image_url: treatment.image_url,
    });
    setActiveTab("treatments");
  };

  const updateDuration = (index: number, field: keyof TreatmentDuration, value: number) => {
    setForm((prev) => ({
      ...prev,
      durations: prev.durations.map((duration, durationIndex) => (
        durationIndex === index ? { ...duration, [field]: value } : duration
      )),
    }));
  };

  const addDuration = () => {
    setForm((prev) => ({
      ...prev,
      durations: [...prev.durations, { mins: 30, price: 25 }],
    }));
  };

  const removeDuration = (index: number) => {
    setForm((prev) => ({
      ...prev,
      durations: prev.durations.filter((_, durationIndex) => durationIndex !== index),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingTreatmentId || !e.target.files?.[0]) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);

      const res = await fetch(`/api/treatments/${editingTreatmentId}/image`, {
        method: "POST",
        headers: { "x-admin-password": password },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setTreatmentError(data?.error ?? "Failed to upload image.");
        return;
      }

      setForm((prev) => ({ ...prev, image_url: data.image_url }));
    } catch {
      setTreatmentError("Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!editingTreatmentId || !form.image_url) return;

    setDeletingImage(true);
    try {
      const res = await fetch(`/api/treatments/${editingTreatmentId}/image`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setTreatmentError(data?.error ?? "Failed to delete image.");
        return;
      }

      setForm((prev) => ({ ...prev, image_url: undefined }));
    } catch {
      setTreatmentError("Failed to delete image.");
    } finally {
      setDeletingImage(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    if (!e.target.files?.[0]) return;

    setUploadingHero(true);
    setHeroError("");
    try {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      if (Number.isInteger(index)) formData.append("index", String(index));

      const res = await fetch("/api/hero-image", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setHeroError(data?.error ?? "Failed to upload image.");
        return;
      }

      setHeroImages(Array.isArray(data.images) ? data.images : []);
    } catch {
      setHeroError("Failed to upload hero image.");
    } finally {
      setUploadingHero(false);
      e.target.value = "";
    }
  };

  const handleDeleteHeroImage = async (index: number) => {
    setDeletingHero(true);
    setHeroError("");
    try {
      const res = await fetch(`/api/hero-image?index=${index}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setHeroError(data?.error ?? "Failed to delete image.");
        return;
      }

      const data = await res.json().catch(() => null);
      setHeroImages(Array.isArray(data?.images) ? data.images : []);
    } catch {
      setHeroError("Failed to delete hero image.");
    } finally {
      setDeletingHero(false);
    }
  };

  const moveHeroImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= heroImages.length) return;
    setHeroImages((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const handleAboutImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    if (!e.target.files?.[0]) return;

    setUploadingAbout(true);
    setAboutError("");
    try {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      if (Number.isInteger(index)) formData.append("index", String(index));

      const res = await fetch("/api/about-image", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setAboutError(data?.error ?? "Failed to upload image.");
        return;
      }

      setAboutImages(Array.isArray(data.images) ? data.images : []);
    } catch {
      setAboutError("Failed to upload about image.");
    } finally {
      setUploadingAbout(false);
      e.target.value = "";
    }
  };

  const handleDeleteAboutImage = async (index: number) => {
    setDeletingAbout(true);
    setAboutError("");
    try {
      const res = await fetch(`/api/about-image?index=${index}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAboutError(data?.error ?? "Failed to delete image.");
        return;
      }

      const data = await res.json().catch(() => null);
      setAboutImages(Array.isArray(data?.images) ? data.images : []);
    } catch {
      setAboutError("Failed to delete about image.");
    } finally {
      setDeletingAbout(false);
    }
  };

  const moveAboutImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= aboutImages.length) return;
    setAboutImages((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const handleSaveSocials = async () => {
    setSavingSocials(true);
    setSocialsError("");
    try {
      const res = await fetch("/api/admin/settings/social", {
        method: "POST",
        headers,
        body: JSON.stringify(socials),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSocialsError(data?.error ?? "Failed to save socials.");
        return;
      }

      alert("Social links updated successfully!");
    } catch {
      setSocialsError("Failed to save social links.");
    } finally {
      setSavingSocials(false);
    }
  };

  const saveHeroImageOrder = async () => {
    setSavingImageOrder(true);
    setHeroError("");
    try {
      const res = await fetch("/api/hero-image", {
        method: "PUT",
        headers,
        body: JSON.stringify({ images: heroImages }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setHeroError(data?.error ?? "Failed to save hero image order.");
      }
    } catch {
      setHeroError("Failed to save hero image order.");
    } finally {
      setSavingImageOrder(false);
    }
  };

  const saveAboutImageOrder = async () => {
    setSavingImageOrder(true);
    setAboutError("");
    try {
      const res = await fetch("/api/about-image", {
        method: "PUT",
        headers,
        body: JSON.stringify({ images: aboutImages }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAboutError(data?.error ?? "Failed to save about image order.");
      }
    } catch {
      setAboutError("Failed to save about image order.");
    } finally {
      setSavingImageOrder(false);
    }
  };

  const updateTermsSection = (index: number, field: "title", value: string) => {
    setTermsSuccess("");
    setTermsAndConditions((prev) => ({
      ...prev,
      sections: prev.sections.map((section, sectionIndex) => (
        sectionIndex === index ? { ...section, [field]: value } : section
      )),
    }));
  };

  const updateTermsBullet = (sectionIndex: number, bulletIndex: number, value: string) => {
    setTermsSuccess("");
    setTermsAndConditions((prev) => ({
      ...prev,
      sections: prev.sections.map((section, currentSectionIndex) => (
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              bullets: section.bullets.map((bullet, currentBulletIndex) => (
                currentBulletIndex === bulletIndex ? value : bullet
              )),
            }
          : section
      )),
    }));
  };

  const addTermsSection = () => {
    setTermsSuccess("");
    setTermsAndConditions((prev) => ({
      ...prev,
      sections: [...prev.sections, { ...emptyTermsSection, bullets: [...emptyTermsSection.bullets] }],
    }));
  };

  const removeTermsSection = (index: number) => {
    setTermsSuccess("");
    setTermsAndConditions((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, sectionIndex) => sectionIndex !== index),
    }));
  };

  const moveTermsSection = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= termsAndConditions.sections.length) return;

    setTermsSuccess("");
    setTermsAndConditions((prev) => {
      const sections = [...prev.sections];
      const [section] = sections.splice(index, 1);
      sections.splice(nextIndex, 0, section);
      return { ...prev, sections };
    });
  };

  const addTermsBullet = (sectionIndex: number) => {
    setTermsSuccess("");
    setTermsAndConditions((prev) => ({
      ...prev,
      sections: prev.sections.map((section, currentSectionIndex) => (
        currentSectionIndex === sectionIndex
          ? { ...section, bullets: [...section.bullets, ""] }
          : section
      )),
    }));
  };

  const removeTermsBullet = (sectionIndex: number, bulletIndex: number) => {
    setTermsSuccess("");
    setTermsAndConditions((prev) => ({
      ...prev,
      sections: prev.sections.map((section, currentSectionIndex) => (
        currentSectionIndex === sectionIndex
          ? { ...section, bullets: section.bullets.filter((_, currentBulletIndex) => currentBulletIndex !== bulletIndex) }
          : section
      )),
    }));
  };

  const moveTermsBullet = (sectionIndex: number, bulletIndex: number, direction: -1 | 1) => {
    const nextIndex = bulletIndex + direction;
    const bullets = termsAndConditions.sections[sectionIndex]?.bullets ?? [];
    if (nextIndex < 0 || nextIndex >= bullets.length) return;

    setTermsSuccess("");
    setTermsAndConditions((prev) => ({
      ...prev,
      sections: prev.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        const nextBullets = [...section.bullets];
        const [bullet] = nextBullets.splice(bulletIndex, 1);
        nextBullets.splice(nextIndex, 0, bullet);
        return { ...section, bullets: nextBullets };
      }),
    }));
  };

  const saveTerms = async () => {
    setSavingTerms(true);
    setTermsError("");
    setTermsSuccess("");

    try {
      const res = await fetch("/api/admin/terms", {
        method: "PUT",
        headers,
        body: JSON.stringify(termsAndConditions),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setTermsError(data?.error ?? "Failed to save terms and conditions.");
        return;
      }

      setTermsAndConditions(data);
      setTermsSuccess("Terms & Conditions updated successfully!");
    } catch {
      setTermsError("Failed to save terms and conditions.");
    } finally {
      setSavingTerms(false);
    }
  };

  const saveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    setTreatmentError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      active: form.active,
      durations: form.durations.filter((duration) => duration.mins > 0 && duration.price > 0),
    };

    if (!payload.name || payload.durations.length === 0) {
      setTreatmentError("Add a name and at least one valid duration.");
      return;
    }

    setSavingTreatment(true);
    try {
      const res = await fetch(editingTreatmentId ? `/api/treatments/${editingTreatmentId}` : "/api/treatments", {
        method: editingTreatmentId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setTreatmentError(data?.error ?? "Unable to save treatment.");
        return;
      }

      const savedTreatment = data as Treatment;
      setTreatments((prev) => (
        editingTreatmentId
          ? prev.map((item) => (item.id === savedTreatment.id ? savedTreatment : item))
          : [...prev, savedTreatment]
      ));
      resetForm();
    } catch {
      setTreatmentError("Unable to save treatment.");
    } finally {
      setSavingTreatment(false);
    }
  };

  const deleteTreatment = async (id: string) => {
    const res = await fetch(`/api/treatments/${id}`, {
      method: "DELETE",
      headers,
    });

    if (res.ok) {
      setTreatments((prev) => prev.filter((treatment) => treatment.id !== id));
      if (editingTreatmentId === id) resetForm();
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-brand-blue flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <p className="text-sm font-semibold text-brand-blue">Checking admin access…</p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-brand-blue flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <h1 className="text-2xl font-bold text-brand-blue mb-6">Admin Login</h1>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-white">MMT Admin Panel</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-4 mb-8 flex-wrap">
          {(["bookings", "treatments", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-semibold text-sm capitalize transition-colors ${activeTab === tab ? "bg-brand-blue text-white" : "bg-white text-gray-600 border border-gray-200"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "bookings" && (
          <BookingsDashboard
            adminToken={password}
            onUnauthorized={handleUnauthorized}
          />
        )}

        {activeTab === "treatments" && (
          <>
            {loadingTreatments && <p className="text-gray-500 text-sm">Loading treatments…</p>}
            {!loadingTreatments && (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
                <form onSubmit={saveTreatment} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 h-fit">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-brand-blue">{editingTreatmentId ? "Edit treatment" : "Add treatment"}</h2>
                    {editingTreatmentId && (
                      <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-brand-blue">
                        Cancel
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-blue mb-1">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-blue mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    />
                  </div>

                  {editingTreatmentId && (
                    <div>
                      <label className="block text-sm font-semibold text-brand-blue mb-2">Treatment Image</label>
                      {form.image_url && (
                        <div className="mb-3 rounded-lg overflow-hidden w-full h-32 bg-gray-200">
                          <img src={form.image_url} alt={form.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="w-full text-sm mb-2"
                      />
                      {uploadingImage && <p className="text-xs text-gray-500 mb-2">Uploading...</p>}
                      {form.image_url && (
                        <button
                          type="button"
                          onClick={handleDeleteImage}
                          disabled={deletingImage}
                          className="w-full text-xs px-3 py-1.5 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingImage ? "Deleting..." : "Delete image"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <label className="block text-sm font-semibold text-brand-blue">Durations & prices</label>
                      <button type="button" onClick={addDuration} className="text-sm font-semibold text-brand-blue hover:text-brand-gold">
                        + Add row
                      </button>
                    </div>
                    {form.durations.map((duration, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={duration.mins}
                          onChange={(e) => updateDuration(index, "mins", Number(e.target.value) || 0)}
                          className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                          placeholder="Minutes"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={duration.price}
                          onChange={(e) => updateDuration(index, "price", Number(e.target.value) || 0)}
                          className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                          placeholder="Price"
                        />
                        <button
                          type="button"
                          onClick={() => removeDuration(index)}
                          disabled={form.durations.length === 1}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 accent-brand-gold"
                    />
                    Active treatment
                  </label>

                  {treatmentError && <p className="text-sm text-red-600">{treatmentError}</p>}

                  <button type="submit" disabled={savingTreatment} className="w-full bg-brand-blue text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50">
                    {savingTreatment ? "Saving…" : editingTreatmentId ? "Update treatment" : "Create treatment"}
                  </button>
                </form>

                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-brand-blue">{treatments.length} Treatment(s)</h2>
                  {treatments.map((treatment) => (
                    <div key={treatment.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                      {treatment.image_url && (
                        <div className="w-full h-40 bg-gray-200 overflow-hidden">
                          <img src={treatment.image_url} alt={treatment.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-6 flex flex-col gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-brand-blue">{treatment.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${treatment.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {treatment.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{treatment.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {treatment.durations.map((duration) => (
                              <span key={`${treatment.id}-${duration.mins}`} className="text-xs bg-brand-blue/5 text-brand-blue rounded-full px-2 py-1">
                                {duration.mins}m · £{duration.price}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => startEdit(treatment)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:border-brand-blue hover:text-brand-blue"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleTreatmentActive(treatment)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:border-brand-blue hover:text-brand-blue"
                          >
                            {treatment.active ? "Mark inactive" : "Mark active"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteTreatment(treatment.id)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Social Links Section */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-blue mb-6">Social Links & Contact</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">📧 Contact Email</label>
                  <input
                    type="email"
                    value={socials.email}
                    onChange={(e) => setSocials((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    placeholder="contact@maggsymassagetherapy.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">📸 Instagram</label>
                  <input
                    type="text"
                    value={socials.instagram}
                    onChange={(e) => setSocials((prev) => ({ ...prev, instagram: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    placeholder="https://instagram.com/maggsymt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">👥 Facebook</label>
                  <input
                    type="text"
                    value={socials.facebook}
                    onChange={(e) => setSocials((prev) => ({ ...prev, facebook: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">🎵 TikTok</label>
                  <input
                    type="text"
                    value={socials.tiktok}
                    onChange={(e) => setSocials((prev) => ({ ...prev, tiktok: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    placeholder="https://tiktok.com/..."
                  />
                </div>
              </div>

              {socialsError && <p className="text-sm text-red-600 mb-4">{socialsError}</p>}

              <button
                onClick={handleSaveSocials}
                disabled={savingSocials}
                className="w-full bg-brand-gold text-brand-blue font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-70"
              >
                {savingSocials ? "Saving..." : "Save Social Links"}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-blue">Terms &amp; Conditions</h2>
                  <p className="mt-1 text-sm text-gray-500">Edit the public /terms page and booking acceptance modal content.</p>
                </div>
                <button
                  type="button"
                  onClick={addTermsSection}
                  className="text-sm font-semibold text-brand-blue hover:text-brand-gold"
                >
                  + Add section
                </button>
              </div>

              {loadingTerms && <p className="text-sm text-gray-500 mb-4">Loading terms and conditions…</p>}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">Title</label>
                  <input
                    type="text"
                    value={termsAndConditions.title}
                    onChange={(e) => {
                      setTermsSuccess("");
                      setTermsAndConditions((prev) => ({ ...prev, title: e.target.value }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">Intro</label>
                  <textarea
                    value={termsAndConditions.intro}
                    onChange={(e) => {
                      setTermsSuccess("");
                      setTermsAndConditions((prev) => ({ ...prev, intro: e.target.value }));
                    }}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-4">
                  {termsAndConditions.sections.map((section, sectionIndex) => (
                    <div key={`${sectionIndex}-${section.title}`} className="rounded-lg border border-gray-200 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-sm font-semibold text-brand-blue">Section {sectionIndex + 1}</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => moveTermsSection(sectionIndex, -1)}
                            disabled={sectionIndex === 0}
                            className="text-xs px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-40"
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTermsSection(sectionIndex, 1)}
                            disabled={sectionIndex === termsAndConditions.sections.length - 1}
                            className="text-xs px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-40"
                          >
                            Move down
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTermsSection(sectionIndex)}
                            className="text-xs px-3 py-2 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-brand-blue mb-2">Section Title</label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateTermsSection(sectionIndex, "title", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-sm font-medium text-brand-blue">Bullets</label>
                          <button
                            type="button"
                            onClick={() => addTermsBullet(sectionIndex)}
                            className="text-sm font-semibold text-brand-blue hover:text-brand-gold"
                          >
                            + Add bullet
                          </button>
                        </div>

                        {section.bullets.map((bullet, bulletIndex) => (
                          <div key={`${sectionIndex}-${bulletIndex}`} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <textarea
                              value={bullet}
                              onChange={(e) => updateTermsBullet(sectionIndex, bulletIndex, e.target.value)}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                            />
                            <div className="flex flex-wrap gap-2 sm:flex-col">
                              <button
                                type="button"
                                onClick={() => moveTermsBullet(sectionIndex, bulletIndex, -1)}
                                disabled={bulletIndex === 0}
                                className="text-xs px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-40"
                              >
                                Move up
                              </button>
                              <button
                                type="button"
                                onClick={() => moveTermsBullet(sectionIndex, bulletIndex, 1)}
                                disabled={bulletIndex === section.bullets.length - 1}
                                className="text-xs px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-40"
                              >
                                Move down
                              </button>
                              <button
                                type="button"
                                onClick={() => removeTermsBullet(sectionIndex, bulletIndex)}
                                className="text-xs px-3 py-2 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {termsError && <p className="text-sm text-red-600 mb-4">{termsError}</p>}
              {termsSuccess && <p className="text-sm text-green-600 mb-4">{termsSuccess}</p>}

              <button
                type="button"
                onClick={saveTerms}
                disabled={savingTerms || loadingTerms}
                className="w-full bg-brand-gold text-brand-blue font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-70"
              >
                {savingTerms ? "Saving..." : "Save changes"}
              </button>
            </div>

            {/* Hero Image Settings */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-blue mb-6">Hero Slideshow (Blue Section)</h2>
              {heroError && <p className="text-sm text-red-600 mb-4">{heroError}</p>}

              <div className="space-y-4 mb-6">
                {heroImages.map((image, index) => (
                  <div key={`${image}-${index}`} className="rounded-lg border border-gray-200 p-3 space-y-3">
                    <div className="rounded-lg overflow-hidden w-full h-48 bg-gray-200">
                      <img src={image} alt={`Hero ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moveHeroImage(index, -1)}
                        disabled={index === 0}
                        className="text-xs px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-40"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveHeroImage(index, 1)}
                        disabled={index === heroImages.length - 1}
                        className="text-xs px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-40"
                      >
                        Move down
                      </button>
                      <label className="text-xs px-3 py-2 rounded-lg border border-gray-200 cursor-pointer">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => void handleHeroImageUpload(event, index)}
                          disabled={uploadingHero}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleDeleteHeroImage(index)}
                        disabled={deletingHero}
                        className="text-xs px-3 py-2 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {heroImages.length === 0 && (
                  <p className="text-sm text-gray-500">No hero images yet. Upload at least two to create the slideshow.</p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-brand-blue">Add Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleHeroImageUpload(event)}
                  disabled={uploadingHero}
                  className="w-full text-sm"
                />
                {uploadingHero && <p className="text-xs text-gray-500">Uploading...</p>}
                <button
                  type="button"
                  onClick={() => void saveHeroImageOrder()}
                  disabled={savingImageOrder}
                  className="w-full text-xs px-3 py-2 rounded-lg font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingImageOrder ? "Saving order..." : "Save order"}
                </button>
              </div>
            </div>

            {/* About Image Settings */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-blue mb-6">About Slideshow (About Section)</h2>
              {aboutError && <p className="text-sm text-red-600 mb-4">{aboutError}</p>}

              <div className="space-y-4 mb-6">
                {aboutImages.map((image, index) => (
                  <div key={`${image}-${index}`} className="rounded-lg border border-gray-200 p-3 space-y-3">
                    <div className="rounded-lg overflow-hidden w-full h-48 bg-gray-200">
                      <img src={image} alt={`About ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moveAboutImage(index, -1)}
                        disabled={index === 0}
                        className="text-xs px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-40"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAboutImage(index, 1)}
                        disabled={index === aboutImages.length - 1}
                        className="text-xs px-3 py-2 rounded-lg border border-gray-200 disabled:opacity-40"
                      >
                        Move down
                      </button>
                      <label className="text-xs px-3 py-2 rounded-lg border border-gray-200 cursor-pointer">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => void handleAboutImageUpload(event, index)}
                          disabled={uploadingAbout}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAboutImage(index)}
                        disabled={deletingAbout}
                        className="text-xs px-3 py-2 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {aboutImages.length === 0 && (
                  <p className="text-sm text-gray-500">No about images yet. Upload at least two to create the slideshow.</p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-brand-blue">Add Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleAboutImageUpload(event)}
                  disabled={uploadingAbout}
                  className="w-full text-sm"
                />
                {uploadingAbout && <p className="text-xs text-gray-500">Uploading...</p>}
                <button
                  type="button"
                  onClick={() => void saveAboutImageOrder()}
                  disabled={savingImageOrder}
                  className="w-full text-xs px-3 py-2 rounded-lg font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingImageOrder ? "Saving order..." : "Save order"}
                </button>
              </div>
            </div>

            {/* Booking & Availability Settings Link */}
            <Link href="/admin/settings" className="block bg-gradient-to-r from-brand-blue to-blue-700 rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="text-white">
                <h3 className="text-2xl font-bold mb-2">⚙️ Booking & Availability Settings</h3>
                <p className="text-blue-100">Configure working hours, booking window, and buffer time between appointments</p>
              </div>
            </Link>

            <Link href="/admin/vouchers" className="block bg-gradient-to-r from-brand-gold to-amber-500 rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="text-brand-blue">
                <h3 className="text-2xl font-bold mb-2">🎟️ Voucher Codes</h3>
                <p className="text-brand-blue/80">Create and manage discount vouchers for checkout</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
