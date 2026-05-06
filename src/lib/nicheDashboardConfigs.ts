// Per-niche dashboard configurations: 7 cards, metrics, check-in extras.
// Used by NicheDashboardSection (generic engine) and ClientQuickCheckIn (niche extras).

export type CardSource =
  | { kind: "impact_sum"; field: string }                 // sum business_impact_entries.field over last 30d
  | { kind: "analytics_sum"; field: string }              // sum analytics_entries.field
  | { kind: "analytics_latest"; field: string }           // latest analytics_entries.field
  | { kind: "checkin"; path: string[] }                   // dot-path inside client_checkins.real_results_data.<niche>
  | { kind: "ratio"; numerator: CardSource; denominator: CardSource; format?: "currency" | "percent" }
  | { kind: "constant"; value: number };

export type NicheCard = {
  key: string;
  label: string;
  icon: "users" | "home" | "calendar" | "phone" | "message" | "eye" | "trend" | "sparkle" | "cart" | "dollar" | "star" | "flame" | "heart" | "utensils" | "scissors" | "stethoscope" | "dumbbell" | "tag";
  source?: CardSource;             // optional for "list" style cards
  hint?: string;                   // shown under value when value is missing
  format?: "number" | "currency" | "percent" | "text";
  // Special card types:
  list?:
    | "top_published_posts"        // shows recent published posts
    | "campaigns_offers"           // shows recent campaigns
    | "events_or_menu"             // checkin-driven text list
    | "next_actions"               // AI next_actions
    | "approvals"                  // content awaiting approval
    | "checkin_text";              // free-text from check-in path
  list_path?: string[];            // for checkin_text/events_or_menu
};

export type CheckInExtraField =
  | { kind: "number"; key: string; label: string }
  | { kind: "text"; key: string; label: string; placeholder?: string; long?: boolean }
  | { kind: "choice"; key: string; label: string; options: { key: string; label: string }[] };

export type NicheDashboardConfig = {
  cards: NicheCard[];
  checkin_extras: CheckInExtraField[];
  checkin_section_title: string;
};

// ---------- Configs ----------

export const NICHE_CONFIGS: Record<string, NicheDashboardConfig> = {
  restaurant: {
    checkin_section_title: "Întrebări specifice — Restaurante",
    cards: [
      { key: "reservations", label: "Rezervări", icon: "calendar",
        source: { kind: "checkin", path: ["reservations"] }, hint: "Completează în check-in" },
      { key: "orders", label: "Comenzi / vizite", icon: "utensils",
        source: { kind: "impact_sum", field: "orders" } },
      { key: "messages", label: "Mesaje primite", icon: "message",
        source: { kind: "impact_sum", field: "dms" } },
      { key: "calls", label: "Apeluri", icon: "phone",
        source: { kind: "impact_sum", field: "calls" } },
      { key: "top_food", label: "Top conținut culinar", icon: "flame", list: "top_published_posts" },
      { key: "campaigns", label: "Campanii & oferte", icon: "tag", list: "campaigns_offers" },
      { key: "events", label: "Evenimente / preparate noi", icon: "sparkle",
        list: "checkin_text", list_path: ["events_or_highlights"] },
      { key: "approvals", label: "Conținut de aprobat", icon: "eye", list: "approvals" },
      { key: "next_actions", label: "Recomandări AI", icon: "trend", list: "next_actions" },
    ],
    checkin_extras: [
      { kind: "choice", key: "more_reservations", label: "Ai observat mai multe rezervări?",
        options: [{ key: "yes", label: "Da" }, { key: "no", label: "Nu" }, { key: "unknown", label: "Nu știu" }] },
      { kind: "number", key: "reservations", label: "Câte rezervări estimezi luna asta?" },
      { kind: "text", key: "promote_dish", label: "Ce preparat / ofertă vrei să promovăm?",
        placeholder: "ex: meniul de prânz, pizza specialității, brunch weekend…" },
      { kind: "text", key: "events_or_highlights", label: "Ai evenimente sau highlight-uri luna aceasta?",
        placeholder: "ex: live music sâmbătă, brunch de Crăciun, lansare meniu de toamnă…", long: true },
      { kind: "choice", key: "busier_after_posts", label: "Ai avut zile mai aglomerate după postări?",
        options: [{ key: "yes", label: "Da, clar" }, { key: "maybe", label: "Posibil" }, { key: "no", label: "Nu am observat" }] },
    ],
  },

  beauty: {
    checkin_section_title: "Întrebări specifice — Beauty / Aesthetics",
    cards: [
      { key: "appointments", label: "Programări", icon: "calendar",
        source: { kind: "impact_sum", field: "appointments" } },
      { key: "treatment_interest", label: "Interes pentru tratamente", icon: "sparkle",
        source: { kind: "checkin", path: ["treatment_interest_count"] }, hint: "Lipsă date — completează în check-in" },
      { key: "messages", label: "Mesaje", icon: "message",
        source: { kind: "impact_sum", field: "dms" } },
      { key: "calls", label: "Apeluri", icon: "phone",
        source: { kind: "impact_sum", field: "calls" } },
      { key: "before_after", label: "Performanță Before/After", icon: "scissors", list: "top_published_posts" },
      { key: "top_services", label: "Top servicii cerute", icon: "star",
        list: "checkin_text", list_path: ["top_services"] },
      { key: "approvals", label: "Conținut de aprobat", icon: "eye", list: "approvals" },
      { key: "next_actions", label: "Recomandări AI", icon: "trend", list: "next_actions" },
    ],
    checkin_extras: [
      { kind: "text", key: "promote_treatment", label: "Ce tratament vrei să promovăm luna aceasta?",
        placeholder: "ex: hidratare profundă, microneedling, peeling chimic…" },
      { kind: "choice", key: "more_appointments", label: "Ai primit mai multe programări?",
        options: [{ key: "yes", label: "Da" }, { key: "no", label: "Nu" }, { key: "unknown", label: "Nu știu" }] },
      { kind: "text", key: "top_services", label: "Ce servicii au fost cele mai cerute?",
        placeholder: "ex: tratament facial, manichiură premium, masaj…" },
      { kind: "choice", key: "new_before_after", label: "Ai rezultate before/after noi?",
        options: [{ key: "yes", label: "Da" }, { key: "no", label: "Nu" }] },
      { kind: "text", key: "client_questions", label: "Ce întrebări pun clienții cel mai des?",
        placeholder: "ex: cât durează, e dureros, când văd rezultate…", long: true },
    ],
  },

  ecommerce: {
    checkin_section_title: "Întrebări specifice — E-commerce",
    cards: [
      { key: "revenue", label: "Revenue", icon: "dollar",
        source: { kind: "analytics_sum", field: "revenue" }, format: "currency" },
      { key: "sales", label: "Vânzări (comenzi)", icon: "cart",
        source: { kind: "analytics_sum", field: "sales" } },
      { key: "roas", label: "ROAS",
        icon: "trend",
        source: { kind: "ratio",
          numerator: { kind: "analytics_sum", field: "revenue" },
          denominator: { kind: "analytics_sum", field: "ad_spend" }
        },
        hint: "Lipsă ad_spend sau revenue" },
      { key: "website_clicks", label: "Click-uri website", icon: "eye",
        source: { kind: "analytics_sum", field: "website_clicks" } },
      { key: "cost_per_purchase", label: "Cost / comandă", icon: "dollar",
        source: { kind: "analytics_latest", field: "cost_per_purchase" }, format: "currency",
        hint: "Lipsă date plătite" },
      { key: "top_products", label: "Top produse", icon: "star",
        list: "checkin_text", list_path: ["top_products"] },
      { key: "top_content_sales", label: "Top conținut cu intent de vânzare", icon: "flame", list: "top_published_posts" },
      { key: "approvals", label: "Conținut de aprobat", icon: "eye", list: "approvals" },
      { key: "next_actions", label: "Recomandări AI", icon: "trend", list: "next_actions" },
    ],
    checkin_extras: [
      { kind: "text", key: "promote_product", label: "Ce produs vrei să promovăm luna aceasta?",
        placeholder: "ex: noua colecție de toamnă, bestseller-ul…" },
      { kind: "choice", key: "social_sales", label: "Ai avut vânzări din social media?",
        options: [{ key: "yes", label: "Da" }, { key: "no", label: "Nu" }, { key: "unknown", label: "Nu știu" }] },
      { kind: "text", key: "top_products", label: "Ce produse s-au vândut cel mai bine?",
        placeholder: "ex: rochia neagră, gentuța mini, sneakers albi…" },
      { kind: "text", key: "active_offers", label: "Ai oferte / campanii active?",
        placeholder: "ex: Black Friday -30%, livrare gratuită peste 200 lei…" },
      { kind: "choice", key: "stock_issues", label: "Ai avut probleme cu stocul?",
        options: [{ key: "yes", label: "Da" }, { key: "no", label: "Nu" }] },
    ],
  },

  fitness: {
    checkin_section_title: "Întrebări specifice — Fitness / Coaches",
    cards: [
      { key: "trial_requests", label: "Lead-uri / cereri de trial", icon: "users",
        source: { kind: "checkin", path: ["trial_requests"] }, hint: "Completează în check-in" },
      { key: "memberships", label: "Abonamente / programe vândute", icon: "dumbbell",
        source: { kind: "checkin", path: ["memberships_sold"] } },
      { key: "messages", label: "Mesaje", icon: "message",
        source: { kind: "impact_sum", field: "dms" } },
      { key: "calls", label: "Apeluri", icon: "phone",
        source: { kind: "impact_sum", field: "calls" } },
      { key: "transformations", label: "Conținut transformări", icon: "flame", list: "top_published_posts" },
      { key: "community", label: "Engagement comunitate", icon: "heart",
        source: { kind: "analytics_latest", field: "engagement_rate" }, format: "percent" },
      { key: "approvals", label: "Conținut de aprobat", icon: "eye", list: "approvals" },
      { key: "next_actions", label: "Recomandări AI", icon: "trend", list: "next_actions" },
    ],
    checkin_extras: [
      { kind: "number", key: "trial_requests", label: "Câte cereri pentru trial ai primit?" },
      { kind: "number", key: "memberships_sold", label: "Câte abonamente / programe vândute?" },
      { kind: "text", key: "promote_program", label: "Ce program vrei să promovăm?",
        placeholder: "ex: 1-on-1 coaching, program 8 săptămâni, abonament lunar…" },
      { kind: "text", key: "new_transformations", label: "Ai testimoniale sau transformări noi?",
        placeholder: "ex: 2 transformări -10kg, testimonial video Andrei…", long: true },
      { kind: "text", key: "lead_questions", label: "Ce întrebări pun potențialii clienți?",
        placeholder: "ex: cât costă, cât de des merg, e pentru începători…", long: true },
      { kind: "text", key: "monthly_offer", label: "Ce ofertă vrei să împingem luna aceasta?",
        placeholder: "ex: -20% la prima lună, 1 luna gratis…" },
    ],
  },

  medical: {
    checkin_section_title: "Întrebări specifice — Medical / Clinică",
    cards: [
      { key: "appointments", label: "Programări", icon: "calendar",
        source: { kind: "impact_sum", field: "appointments" } },
      { key: "service_interest", label: "Interes servicii", icon: "stethoscope",
        source: { kind: "checkin", path: ["service_interest_count"] }, hint: "Completează în check-in" },
      { key: "patient_questions", label: "Întrebări pacienți", icon: "message",
        list: "checkin_text", list_path: ["new_patient_questions"] },
      { key: "messages", label: "Mesaje", icon: "message",
        source: { kind: "impact_sum", field: "dms" } },
      { key: "calls", label: "Apeluri", icon: "phone",
        source: { kind: "impact_sum", field: "calls" } },
      { key: "educational", label: "Performanță conținut educativ", icon: "flame", list: "top_published_posts" },
      { key: "reviews", label: "Recenzii / semne de încredere", icon: "star",
        list: "checkin_text", list_path: ["new_reviews"] },
      { key: "approvals", label: "Conținut de aprobat", icon: "eye", list: "approvals" },
      { key: "next_actions", label: "Recomandări AI", icon: "trend", list: "next_actions" },
    ],
    checkin_extras: [
      { kind: "text", key: "promote_service", label: "Ce serviciu / tratament vrei să promovăm?",
        placeholder: "ex: implant dentar, control cardiologic, ecografie…" },
      { kind: "text", key: "new_patient_questions", label: "Ai primit întrebări noi de la pacienți?",
        placeholder: "ex: cât costă, e dureros, ce asigurare acoperă…", long: true },
      { kind: "choice", key: "more_appointments", label: "Ai avut mai multe programări?",
        options: [{ key: "yes", label: "Da" }, { key: "no", label: "Nu" }, { key: "unknown", label: "Nu știu" }] },
      { kind: "text", key: "top_services", label: "Ce servicii au fost cele mai cerute?",
        placeholder: "ex: consultații, ecografii, tratamente specifice…" },
      { kind: "text", key: "sensitive_topics", label: "Există informații medicale sensibile de evitat?",
        placeholder: "ex: nu menționăm prețuri, nu garantăm rezultate…", long: true },
    ],
  },
};

export function getNicheConfig(niche?: string | null): NicheDashboardConfig | null {
  if (!niche) return null;
  return NICHE_CONFIGS[niche] || null;
}
