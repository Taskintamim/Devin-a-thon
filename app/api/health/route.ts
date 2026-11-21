export function GET() {
  return Response.json({ ok: true, service: "campusflow-os", mode: "demo" });
}
