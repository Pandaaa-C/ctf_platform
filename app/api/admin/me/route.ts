import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdmin();
  return Response.json({
    admin: admin ? { username: admin.username, role: admin.role } : null,
  });
}
