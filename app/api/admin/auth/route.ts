import { NextRequest } from "next/server";

import {
  createAdminAuthResponse,
  isAuthorizedAdminRequest,
  isValidAdminPassword,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (isAuthorizedAdminRequest(request)) {
    return Response.json({ success: true });
  }

  return unauthorizedAdminResponse();
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (typeof password === "string" && isValidAdminPassword(password)) {
      return createAdminAuthResponse();
    }
    return Response.json({ success: false }, { status: 401 });
  } catch {
    return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
}
