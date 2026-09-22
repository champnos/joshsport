import Link from "next/link";

export default function RegisterSuccessPage({
  searchParams,
}: {
  searchParams?: { email?: string };
}) {
  const email = searchParams?.email || "your email";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-brand-blue">Check your email</h1>
        <p className="text-sm text-gray-700">
          We sent a verification link to <strong>{email}</strong>. Please verify your email before logging in.
        </p>
        <p className="text-sm text-gray-700">If it does not arrive, register again to generate a new verification email.</p>
        <Link className="inline-flex rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90" href="/account">
          Back to login
        </Link>
      </div>
    </div>
  );
}
