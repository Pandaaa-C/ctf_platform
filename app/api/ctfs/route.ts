import { listCtfsPublic } from "@/lib/ctfs";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ctfs: await listCtfsPublic() });
}
