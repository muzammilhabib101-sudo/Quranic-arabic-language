import { practiceData } from "@/content/practice";

// Written to out/data/practice.json at build time; practice pages fetch it once.
export const dynamic = "force-static";

export function GET() {
  return Response.json(practiceData());
}
