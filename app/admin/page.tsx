"use client";

import { useEffect, useMemo, useState } from "react";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Booking, Treatment } from "@/lib/types";
import { formatCurrency, getTreatmentPrice } from "@/lib/utils";

const defaultTreatmentForm = {
  name: "",
  description: "",
  durations: "30,60",
  pricingModel: "per30min",
  price: "30",
  price90: "",
  price120: "",
  active: true,
};

function getStatusVariant(status: Booking["status"]) {
  if (status === "confirmed") return "default";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState("treatments");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [formData, setFormData] = useState(defaultTreatmentForm);
  const [pageError, setPageError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const upcomingBookings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return bookings.filter((booking) => booking.date >= today).sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  }, [bookings]);

  const loadData = async () => {
    const [treatmentsResponse, bookingsResponse] = await Promise.all([fetch("/api/treatments"), fetch("/api/bookings")]);

    if (!treatmentsResponse.ok || !bookingsResponse.ok) {
      throw new Error("Unable to load admin data.");
    }

    const treatmentsData = await treatmentsResponse.json();
    const bookingsData = await bookingsResponse.json();

    setTreatments(treatmentsData);
    setBookings(bookingsData);
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/auth");
        if (!response.ok) {
          setIsAuthed(false);
          return;
        }

        setIsAuthed(true);
        await loadData();
      } catch {
        setPageError("Unable to load admin data.");
      } finally {
        setLoading(false);
      }
    };

    void checkSession();
  }, []);

  const handleLogin = async () => {
    setLoginSubmitting(true);
    setAuthError("");
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Invalid password.");
      }

      setIsAuthed(true);
      setLoading(true);
      await loadData();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoginSubmitting(false);
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingTreatment(null);
    setFormData(defaultTreatmentForm);
    setDialogOpen(true);
  };

  const openEditDialog = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setFormData({
      name: treatment.name,
      description: treatment.description,
      durations: treatment.durations.join(","),
      pricingModel: treatment.pricingModel,
      price: treatment.price.toString(),
      price90: treatment.price90?.toString() ?? "",
      price120: treatment.price120?.toString() ?? "",
      active: treatment.active,
    });
    setDialogOpen(true);
  };

  const saveTreatment = async () => {
    setPageError("");
    const payload = {
      name: formData.name,
      description: formData.description,
      durations: formData.durations
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0),
      pricingModel: formData.pricingModel as Treatment["pricingModel"],
      price: Number(formData.price),
      price90: formData.price90 ? Number(formData.price90) : undefined,
      price120: formData.price120 ? Number(formData.price120) : undefined,
      active: formData.active,
    };

    const response = await fetch(editingTreatment ? `/api/treatments/${editingTreatment.id}` : "/api/treatments", {
      method: editingTreatment ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      setPageError(data.error || "Unable to save treatment.");
      return;
    }

    await loadData();
    setDialogOpen(false);
  };

  const deleteTreatment = async () => {
    if (!deleteId) return;

    const response = await fetch(`/api/treatments/${deleteId}`, { method: "DELETE" });
    if (!response.ok) {
      setPageError("Unable to delete treatment.");
      return;
    }
    await loadData();
    setDeleteId(null);
  };

  const updateBookingStatus = async (bookingId: string, status: Booking["status"]) => {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setPageError("Unable to update booking status.");
      return;
    }
    await loadData();
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-16 text-sm text-gray-400 sm:px-6 lg:px-8">
        Checking admin session...
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Admin sign in</CardTitle>
            <CardDescription>Enter the admin password to manage treatments and bookings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2"
              />
            </div>
            {authError ? <p className="text-sm text-red-300">{authError}</p> : null}
            <Button className="w-full" onClick={handleLogin} disabled={loginSubmitting || !password}>
              {loginSubmitting ? "Checking..." : "Enter admin panel"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">Admin</p>
        <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Manage treatments and bookings.</h1>
      </div>

      {pageError ? <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{pageError}</div> : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-10">
        <TabsList>
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="treatments">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Treatment catalogue</CardTitle>
                <CardDescription>Create, edit or remove services from the website.</CardDescription>
              </div>
              <Button onClick={openAddDialog}>Add treatment</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-300">
                  <thead className="border-b border-gray-800 text-xs uppercase tracking-[0.2em] text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Durations</th>
                      <th className="px-4 py-3">Pricing</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.map((treatment) => (
                      <tr key={treatment.id} className="border-b border-gray-900">
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-white">{treatment.name}</p>
                          <p className="mt-1 max-w-md text-xs text-gray-500">{treatment.description}</p>
                        </td>
                        <td className="px-4 py-4 align-top">{treatment.durations.join(", ")} mins</td>
                        <td className="px-4 py-4 align-top">
                          {treatment.durations.map((duration) => (
                            <div key={duration}>{duration}m · {formatCurrency(getTreatmentPrice(treatment, duration))}</div>
                          ))}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge variant={treatment.active ? "default" : "secondary"}>{treatment.active ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => openEditDialog(treatment)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeleteId(treatment.id)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming bookings</CardTitle>
              <CardDescription>Review requests and keep statuses up to date.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-300">
                  <thead className="border-b border-gray-800 text-xs uppercase tracking-[0.2em] text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Session</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-900">
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-white">{booking.clientName}</p>
                          <p className="mt-1 text-xs text-gray-500">{booking.notes || "No notes provided."}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p>{booking.treatmentName}</p>
                          <p className="mt-1 text-xs text-gray-500">{booking.date} at {booking.startTime} · {booking.durationMins} mins</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p>{booking.clientEmail}</p>
                          <p className="mt-1 text-xs text-gray-500">{booking.clientPhone}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateBookingStatus(booking.id, "confirmed")}>Confirm</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateBookingStatus(booking.id, "cancelled")}>Cancel</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {upcomingBookings.length === 0 ? <p className="px-4 py-8 text-sm text-gray-500">No upcoming bookings yet.</p> : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTreatment ? "Edit treatment" : "Add treatment"}</DialogTitle>
            <DialogDescription>Update service details, durations and pricing.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="treatment-name">Name</Label>
              <Input id="treatment-name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="treatment-description">Description</Label>
              <Textarea id="treatment-description" value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-[120px]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="treatment-durations">Durations</Label>
                <Input id="treatment-durations" value={formData.durations} onChange={(event) => setFormData((current) => ({ ...current, durations: event.target.value }))} className="mt-2" placeholder="30,60,90" />
              </div>
              <div>
                <Label htmlFor="treatment-pricing-model">Pricing model</Label>
                <Select id="treatment-pricing-model" value={formData.pricingModel} onChange={(event) => setFormData((current) => ({ ...current, pricingModel: event.target.value }))} className="mt-2">
                  <option value="per30min">Per 30 minutes</option>
                  <option value="fixed">Fixed</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="treatment-price">Base price</Label>
                <Input id="treatment-price" type="number" value={formData.price} onChange={(event) => setFormData((current) => ({ ...current, price: event.target.value }))} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="treatment-price90">90 minute price</Label>
                <Input id="treatment-price90" type="number" value={formData.price90} onChange={(event) => setFormData((current) => ({ ...current, price90: event.target.value }))} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="treatment-price120">120 minute price</Label>
                <Input id="treatment-price120" type="number" value={formData.price120} onChange={(event) => setFormData((current) => ({ ...current, price120: event.target.value }))} className="mt-2" />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-3 text-sm text-gray-300">
                  <input type="checkbox" checked={formData.active} onChange={(event) => setFormData((current) => ({ ...current, active: event.target.checked }))} />
                  Active treatment
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTreatment}>Save treatment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete treatment?</AlertDialogTitle>
            <AlertDialogDescription>This action removes the treatment from the website and admin list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Keep treatment</Button>
            <Button variant="destructive" onClick={deleteTreatment}>Delete</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
