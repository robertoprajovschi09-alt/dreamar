// Central RO label maps for the client portal.

export const GOAL_STATUS_RO: Record<string, string> = {
  in_progress: "În desfășurare",
  not_started: "Neînceput",
  done: "Finalizat",
  completed: "Finalizat",
  at_risk: "În risc",
  behind: "În urmă",
};

export const HEALTH_STATUS_RO: Record<string, string> = {
  excellent: "Excelent",
  healthy: "Sănătos",
  at_risk: "În risc",
  critical: "Critic",
};

export const METRIC_RO: Record<string, string> = {
  roas: "ROAS",
  revenue: "Venit",
  revenue_estimate: "Venit",
  sales: "Vânzări",
  orders: "Comenzi",
  leads: "Lead-uri",
  qualified_leads: "Lead-uri calificate",
  calls: "Apeluri",
  dms: "Mesaje",
  messages: "Mesaje",
  bookings: "Rezervări",
  reservations: "Rezervări",
  appointments: "Programări",
  viewings: "Vizionări",
  contracts: "Contracte",
  reach: "Acoperire",
  views: "Vizualizări",
  impressions: "Afișări",
  followers: "Urmăritori",
  engagement: "Interacțiune",
  consultations: "Consultații",
  applications: "Aplicații",
  cases_opened: "Cazuri deschise",
};

export const GOAL_TITLE_RO: Record<string, string> = {
  roas: "ROAS mai mare",
  revenue: "Venituri mai mari",
  revenue_estimate: "Venituri mai mari",
  sales: "Mai multe vânzări",
  orders: "Mai multe comenzi",
  leads: "Mai multe lead-uri",
  qualified_leads: "Mai multe lead-uri calificate",
  bookings: "Mai multe rezervări",
  reservations: "Mai multe rezervări",
  appointments: "Mai multe programări",
  viewings: "Mai multe vizionări",
  calls: "Mai multe apeluri",
  dms: "Mai multe mesaje",
  messages: "Mai multe mesaje",
  engagement: "Mai multă interacțiune",
  reach: "Acoperire mai mare",
  followers: "Mai mulți urmăritori",
  average_order_value: "Bon mediu mai mare",
  aov: "Bon mediu mai mare",
  avg_ticket: "Bon mediu mai mare",
  bon_mediu: "Bon mediu mai mare",
  customers_served: "Mai mulți clienți serviți",
  clients_served: "Mai mulți clienți serviți",
  covers: "Mai mulți clienți serviți",
};

export const NICHE_RO: Record<string, string> = {
  real_estate: "Imobiliare",
  restaurant: "Restaurant",
  beauty: "Beauty",
  ecommerce: "eCommerce",
  fitness: "Fitness",
  medical: "Medical",
  hospitality: "Hoteluri",
  hotel: "Hotel",
  lounge: "Lounge",
  local_store: "Magazin local",
  finance: "Finanțe",
  custom: "Personalizat",
};

export const MONTHS_RO = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

export const MONTHS_RO_SHORT = [
  "ian", "feb", "mar", "apr", "mai", "iun",
  "iul", "aug", "sep", "oct", "noi", "dec",
];

export const WEEKDAYS_RO_SHORT = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
export const WEEKDAYS_RO_LONG = [
  "duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă",
];

export function fmtMonthYearRO(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return `${MONTHS_RO[date.getMonth()]} ${date.getFullYear()}`;
}

export function fmtDateRO(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDayShortRO(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  // index 0 = Sunday in JS; map to RO short (Lun..Dum where Dum is Sunday)
  const jsDay = date.getDay(); // 0..6 (Sun..Sat)
  const idx = (jsDay + 6) % 7;  // 0..6 (Lun..Dum)
  return `${WEEKDAYS_RO_SHORT[idx]}, ${date.getDate()} ${MONTHS_RO_SHORT[date.getMonth()]}`;
}

export function metricLabel(metricKey?: string | null): string {
  if (!metricKey) return "—";
  const key = metricKey.toString().toLowerCase().trim();
  return METRIC_RO[key] || metricKey;
}

export function goalTitleFor(metricKey?: string | null, fallbackLabel?: string): string {
  if (!metricKey) return fallbackLabel || "Obiectiv nou";
  const key = metricKey.toString().toLowerCase().trim();
  if (GOAL_TITLE_RO[key]) return GOAL_TITLE_RO[key];
  const ro = METRIC_RO[key];
  if (ro) return `Mai multe ${ro.toLowerCase()}`;
  return `Mai multe ${(fallbackLabel || metricKey).toLowerCase()}`;
}

export function goalStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return GOAL_STATUS_RO[status] || status;
}

export function healthStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return HEALTH_STATUS_RO[status] || status.replace(/_/g, " ");
}

export function nicheLabelRO(niche?: string | null): string {
  if (!niche) return "";
  return NICHE_RO[niche] || niche;
}
