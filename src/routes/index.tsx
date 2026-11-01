import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "EGREED Hospitality Enterprise — Staff Workspace" },
    { name: "description", content: "Manage hotel stays, rooms, restaurant orders and hospitality operations with EGREED." },
    { property: "og:title", content: "EGREED Hospitality Enterprise — Staff Workspace" },
    { property: "og:description", content: "Your unified hospitality operations workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
