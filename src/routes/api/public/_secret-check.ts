import { createFileRoute } from "@tanstack/react-router";
import { verifyMasterSecretPrefix } from "@/lib/secret-check.functions";

export const Route = createFileRoute("/api/public/_secret-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { prefix?: string };
        const res = await verifyMasterSecretPrefix({ data: { prefix: body.prefix ?? "" } });
        return new Response(JSON.stringify(res), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
