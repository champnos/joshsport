"use client";

import { FormEvent, useState } from "react";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

export default function ContactPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!values.name.trim()) nextErrors.name = "Full name is required.";
    if (!values.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }
    if (!values.message.trim()) nextErrors.message = "Message is required.";

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setSubmitError("");

    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setSubmitError(data?.error || "Unable to send message.");
        return;
      }

      setSubmitted(true);
      setValues(initialValues);
    } catch {
      setSubmitError("Unable to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClasses =
    "w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-brand-blue focus:outline-none";

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-gray-950 px-4 pb-20 pt-36 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">Get in Touch</h1>
          <p className="mt-4 text-lg text-white/80">Have a question or want to know more? Drop Josh a message.</p>
        </div>
      </section>

      <section className="-mt-12 px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
          {submitted ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-2xl text-white">
                ✓
              </div>
              <p className="mt-4 font-medium text-green-800">Thanks! Josh will be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-brand-blue">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={fieldClasses}
                  value={values.name}
                  onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-brand-blue">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={fieldClasses}
                  value={values.email}
                  onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-brand-blue">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={fieldClasses}
                  value={values.phone}
                  onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-medium text-brand-blue">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  className={fieldClasses}
                  value={values.message}
                  onChange={(event) => setValues((prev) => ({ ...prev, message: event.target.value }))}
                />
                {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}

              <button
                type="submit"
                className="w-full bg-brand-gold text-brand-blue font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-70"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>

        <div className="mx-auto mt-12 grid max-w-7xl gap-6 text-center md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-brand-blue">📧 Email</h2>
            <a href="mailto:hello@maggsymassagetherapy.com" className="mt-2 inline-block text-gray-700 hover:text-brand-blue">
              hello@maggsymassagetherapy.com
            </a>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-brand-blue">📍 Location</h2>
            <p className="mt-2 text-gray-700">Bristol &amp; Bath</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-brand-blue">📱 Instagram</h2>
            <a
              href="https://instagram.com/maggsymt"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-gray-700 hover:text-brand-blue"
            >
              @maggsymt
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
