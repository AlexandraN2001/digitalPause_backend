import express from "express";
import { requireAuth } from "./middleware/auth.js";

import rf16Routes from "./rf16/routes.js";
import rf17Routes from "./rf17/routes.js";

const app = express();
app.use(express.json());

app.get("/", (_, res) =>
  res.json({
    ok: true,
    message: "API RF16/RF17 funcionando",
    try: [
      "GET /health",
      "POST /api/rf16/rules",
      "GET /api/rf16/rules?child_id=...",
      "POST /api/rf17/evaluate"
    ]
  })
);

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/rf16", requireAuth, rf16Routes);
app.use("/api/rf17", requireAuth, rf17Routes);

app.listen(3000, () => console.log("API running on http://localhost:3000"));
