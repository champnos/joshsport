import Link from "next/link";

function getStatusMessage(status: string) {
  if (status === "success") {
    return {
      title: "Email verified",
      message: "Your email is verified and you can now log in.",
    };
  }

  if (status === "expired") {
    return {
      title: "Verification link expired",
      message: "Please register again to receive a fresh verification email.",
    };
  }

  if (status === "invalid") {
    return {
      title: "Invalid verification link",
      message: "This link is not valid. Please register again to get a new verification email.",
    };
  }

  return {
    title: "Verification error",
    message: "We could not verify your email right now. Please try again.",
  };
}

export default function VerifiedPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const status = searchParams?.status || "error";
  const content = getStatusMessage(status);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-brand-blue">{content.title}</h1>
        <p className="text-sm text-gray-700">{content.message}</p>
        <Link className="inline-flex rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90" href="/account">
          Go to login
        </Link>
      </div>
    </div>
  );
}
