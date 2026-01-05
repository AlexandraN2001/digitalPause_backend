export function isWithinTimeWindow(nowHHMM, startHHMM, endHHMM) {
  // Formato "HH:MM"
  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const now = toMin(nowHHMM);
  const start = toMin(startHHMM);
  const end = toMin(endHHMM);

  // Ventana normal (ej 12:00-14:00)
  if (start <= end) return now >= start && now <= end;

  // Ventana que cruza medianoche (ej 22:00-06:00)
  return now >= start || now <= end;
}
