import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Adopt Me Manager · Pet Trading Dashboard" },
      {
        name: "description",
        content:
          "Track Adopt Me purchases, trades, inventory stock, sales and profit in one dark-mode dashboard.",
      },
      { property: "og:title", content: "Adopt Me Manager · Pet Trading Dashboard" },
      {
        property: "og:description",
        content: "Buy, trade, stock and sell Adopt Me pets with full profit tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
