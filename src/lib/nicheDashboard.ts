// Niche-specific dashboard microcopy & UX hints.
// Used by ClientDashboard to adapt headings, labels, recommendations and visibility per niche.

export type NicheDashboardCopy = {
  hero_eyebrow: string;            // small uppercase label above hero title
  hero_fallback_summary: string;   // shown when AI summary missing
  kpi_section_title: string;
  impact_section_title: string;
  impact_section_help: string;
  insights_title: string;
  approvals_label: string;         // CTA copy in approvals card
  next_actions_title: string;
  what_works_title: string;
  needs_improvement_title: string;
  show_content_snapshot: boolean;  // hide for niches where post counts mean little
  show_goals: boolean;
  show_latest_report: boolean;
  primary_kpi_keys: string[];      // fallback KPI keys when no AI personalization
};

const base: NicheDashboardCopy = {
  hero_eyebrow: "Luna aceasta",
  hero_fallback_summary: "Iată un rezumat rapid al direcției și rezultatelor lunii.",
  kpi_section_title: "Rezultate cheie",
  impact_section_title: "Impact real în business",
  impact_section_help: "Spune-ne ce s-a întâmplat efectiv ca să raportăm corect.",
  insights_title: "Ce trebuie să știi",
  approvals_label: "Ai conținut de aprobat",
  next_actions_title: "Ce facem mai departe",
  what_works_title: "Ce merge bine",
  needs_improvement_title: "Ce trebuie îmbunătățit",
  show_content_snapshot: true,
  show_goals: true,
  show_latest_report: true,
  primary_kpi_keys: [],
};

export const NICHE_DASHBOARD_COPY: Record<string, Partial<NicheDashboardCopy>> = {
  real_estate: {
    hero_eyebrow: "Luna aceasta în vânzări imobiliare",
    impact_section_title: "Vizionări, oferte & contracte",
    impact_section_help: "Câte vizionări, oferte și contracte ai avut din promovare?",
    primary_kpi_keys: ["viewings", "leads", "contracts"],
  },
  restaurant: {
    hero_eyebrow: "Luna aceasta în restaurant",
    impact_section_title: "Rezervări & clienți noi",
    impact_section_help: "Câte rezervări și comenzi au venit din social media?",
    primary_kpi_keys: ["reservations", "covers", "bookings"],
    show_latest_report: false,
  },
  beauty: {
    hero_eyebrow: "Luna aceasta în salon",
    impact_section_title: "Programări & clienți noi",
    impact_section_help: "Câte programări noi ai primit din promovare?",
    primary_kpi_keys: ["appointments", "new_clients", "rebookings"],
  },
  ecommerce: {
    hero_eyebrow: "Luna aceasta în magazin",
    impact_section_title: "Vânzări & comenzi",
    impact_section_help: "Cum au mers vânzările și ROAS-ul lunii?",
    primary_kpi_keys: ["sales", "revenue", "roas"],
  },
  fitness: {
    hero_eyebrow: "Luna aceasta în fitness",
    impact_section_title: "Trial-uri & abonamente",
    impact_section_help: "Câte trial-uri și abonamente noi ai semnat?",
    primary_kpi_keys: ["trial_signups", "memberships", "leads"],
  },
  medical: {
    hero_eyebrow: "Luna aceasta în clinică",
    impact_section_title: "Programări & pacienți noi",
    impact_section_help: "Câte programări și pacienți noi din promovare?",
    primary_kpi_keys: ["appointments", "new_patients", "treatments_requested"],
    show_latest_report: false,
  },
  dental: {
    hero_eyebrow: "Luna aceasta în cabinet",
    impact_section_title: "Programări & tratamente cerute",
    impact_section_help: "Câte programări și tratamente solicitate ai primit?",
    primary_kpi_keys: ["appointments", "new_patients", "treatments_requested"],
    show_latest_report: false,
  },
  education: {
    hero_eyebrow: "Luna aceasta în educație",
    impact_section_title: "Înscrieri & cereri info",
    impact_section_help: "Câte înscrieri și cereri de informații ai primit?",
    primary_kpi_keys: ["enrollments", "info_requests", "trial_classes"],
  },
  auto: {
    hero_eyebrow: "Luna aceasta în showroom",
    impact_section_title: "Test drive-uri & vânzări",
    impact_section_help: "Câte test drive-uri și vânzări ai realizat?",
    primary_kpi_keys: ["test_drives", "leads", "service_bookings"],
  },
  legal: {
    hero_eyebrow: "Luna aceasta în cabinet",
    impact_section_title: "Consultații & cazuri",
    impact_section_help: "Câte consultații și cazuri noi ai deschis?",
    primary_kpi_keys: ["consultations", "qualified_leads", "cases_opened"],
    show_content_snapshot: false,
  },
  finance: {
    hero_eyebrow: "Luna aceasta",
    impact_section_title: "Consultații & aplicații",
    impact_section_help: "Câte consultații și aplicații ai procesat?",
    primary_kpi_keys: ["consultations", "applications", "qualified_leads"],
    show_content_snapshot: false,
  },
  hospitality: {
    hero_eyebrow: "Luna aceasta la hotel",
    impact_section_title: "Rezervări & oaspeți",
    impact_section_help: "Câte rezervări, cereri și nopți rezervate ai avut din promovare?",
    primary_kpi_keys: ["bookings", "reservation_requests", "occupancy_rate"],
  },
  hotel: {
    hero_eyebrow: "Luna aceasta în hotel",
    impact_section_title: "Rezervări & ocupare",
    impact_section_help: "Câte rezervări noi din canale promovate?",
    primary_kpi_keys: ["bookings", "revenue"],
  },
  lounge: {
    hero_eyebrow: "Luna aceasta în lounge",
    impact_section_title: "Rezervări & evenimente",
    impact_section_help: "Câte rezervări și evenimente private ai avut?",
    primary_kpi_keys: ["bookings", "revenue"],
  },
  local_store: {
    hero_eyebrow: "Luna aceasta în magazin",
    impact_section_title: "Vizite & vânzări în magazin",
    impact_section_help: "Câți clienți noi au venit în magazin din promovare?",
    primary_kpi_keys: ["calls", "messages", "sales"],
  },
  custom: {},
};

export function getNicheDashboardCopy(niche?: string | null): NicheDashboardCopy {
  const overrides = (niche && NICHE_DASHBOARD_COPY[niche]) || {};
  return { ...base, ...overrides };
}
