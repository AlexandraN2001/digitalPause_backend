export function requireAuth(req, res, next) {
  const userId = req.header("x-user-id");
  const role = req.header("x-role");

  if (!userId || !role) {
    return res.status(401).json({ error: "Faltan headers x-user-id y x-role" });
  }
  if (!["PARENT", "CHILD"].includes(role)) {
    return res.status(401).json({ error: "x-role inválido (PARENT|CHILD)" });
  }

  req.user = { id: userId, role };
  next();
}
