// Per-niche Business Impact field definitions used inside ClientQuickCheckIn.
// Each numeric field can be reported as: exact / approx / unknown / not_applicable.
// `db_field` (when present) mirrors the value into business_impact_entries so the
// dashboards continue to aggregate without changes. All values are also stored
// structured under client_checkins.real_results_data.business_impact for AI use.

export type ImpactKind = "number" | "currency" | "text" | "choice";

export type ImpactField = {
  key: string;
  label: string;
  kind: ImpactKind;
  /** Maps numeric/currency value to a column on business_impact_entries. */
  db_field?:
    | "calls" | "dms" | "bookings" | "appointments"
    | "orders" | "sales" | "viewings" | "contracts"
    | "revenue_estimate";
  placeholder?: string;
  /** For `choice` kind. */
  options?: { key: string; label: string }[];
  hint?: string;
};

export type NicheImpactConfig = {
  title: string;
  intro: string;
  fields: ImpactField[];
};

export const IMPACT_BY_NICHE: Record<string, NicheImpactConfig> = {
  real_estate: {
    title: "Impact business — Imobiliare",
    intro: "Pentru fiecare metrică poți pune un număr exact, o aproximare sau marca „nu știu”.",
    fields: [
      { key: "leads_received", label: "Lead-uri primite", kind: "number", db_field: "dms" },
      { key: "viewings_scheduled", label: "Vizionări programate", kind: "number", db_field: "viewings" },
      { key: "properties_sold", label: "Proprietăți rezervate / vândute", kind: "number", db_field: "sales" },
      {
        key: "lead_quality", label: "Calitatea lead-urilor", kind: "choice",
        options: [
          { key: "good", label: "Bune" },
          { key: "mixed", label: "Mixte" },
          { key: "weak", label: "Slabe" },
          { key: "none", label: "Niciunul" },
        ],
      },
    ],
  },
  restaurant: {
    title: "Impact business — Restaurant",
    intro: "Cum a mers luna aceasta în locație?",
    fields: [
      { key: "reservations", label: "Rezervări", kind: "number", db_field: "bookings" },
      { key: "orders", label: "Comenzi", kind: "number", db_field: "orders" },
      { key: "foot_traffic", label: "Trafic în locație (estimat)", kind: "number" },
      { key: "events_count", label: "Evenimente organizate", kind: "number" },
      { key: "customer_feedback", label: "Feedback de la clienți", kind: "text",
        placeholder: "ex: clienții au lăudat noul meniu, recenzii bune pe Google…" },
    ],
  },
  beauty: {
    title: "Impact business — Beauty / Aesthetics",
    intro: "Cum au mers programările și interesul pentru servicii?",
    fields: [
      { key: "appointments", label: "Programări", kind: "number", db_field: "appointments" },
      { key: "price_inquiries", label: "Cereri de preț", kind: "number", db_field: "dms" },
      { key: "services_requested", label: "Servicii cele mai cerute", kind: "text",
        placeholder: "ex: tratament facial, manichiură, masaj…" },
      { key: "new_clients", label: "Clienți noi", kind: "number" },
      { key: "before_after_count", label: "Rezultate before/after noi", kind: "number" },
    ],
  },
  ecommerce: {
    title: "Impact business — E-commerce",
    intro: "Vânzări și performanță produse luna aceasta.",
    fields: [
      { key: "sales", label: "Vânzări (număr comenzi)", kind: "number", db_field: "sales" },
      { key: "revenue", label: "Revenue (lei)", kind: "currency", db_field: "revenue_estimate" },
      { key: "products_sold", label: "Produse vândute (unități)", kind: "number", db_field: "orders" },
      { key: "active_campaigns", label: "Campanii / oferte active", kind: "text",
        placeholder: "ex: Black Friday -30%, livrare gratuită peste 200 lei…" },
      {
        key: "stock_issues", label: "Probleme cu stocul?", kind: "choice",
        options: [
          { key: "none", label: "Niciuna" },
          { key: "minor", label: "Minore" },
          { key: "major", label: "Majore" },
        ],
      },
    ],
  },
  fitness: {
    title: "Impact business — Fitness",
    intro: "Cum au mers trial-urile și abonamentele?",
    fields: [
      { key: "trial_requests", label: "Cereri de trial", kind: "number", db_field: "dms" },
      { key: "memberships_sold", label: "Abonamente vândute", kind: "number", db_field: "sales" },
      { key: "registrations", label: "Înscrieri totale", kind: "number", db_field: "bookings" },
      { key: "testimonials_count", label: "Testimoniale noi", kind: "number" },
      { key: "transformations_count", label: "Transformări documentate", kind: "number" },
    ],
  },
  hospitality: {
    title: "Impact business — Hotels / Hospitality",
    intro: "Cum a mers ocuparea, rezervările și interacțiunea cu oaspeții?",
    fields: [
      { key: "bookings", label: "Rezervări confirmate", kind: "number", db_field: "bookings" },
      { key: "reservation_requests", label: "Cereri de rezervare", kind: "number", db_field: "dms" },
      { key: "direct_inquiries", label: "Cereri directe (telefon/WhatsApp/website)", kind: "number", db_field: "calls" },
      { key: "booked_nights", label: "Nopți rezervate", kind: "number" },
      { key: "occupancy_rate", label: "Rată de ocupare (%)", kind: "number",
        hint: "Procent estimat 0–100" },
      { key: "revenue", label: "Revenue estimat (lei)", kind: "currency", db_field: "revenue_estimate" },
      { key: "guest_reviews_count", label: "Review-uri noi de la oaspeți", kind: "number" },
      { key: "review_score", label: "Scor mediu review-uri (1–5)", kind: "number" },
      { key: "events_booked", label: "Evenimente / nunți rezervate", kind: "number", db_field: "contracts" },
    ],
  },
  medical: {
    title: "Impact business — Medical",
    intro: "Cum au mers programările și interacțiunea cu pacienții?",
    fields: [
      { key: "appointments", label: "Programări", kind: "number", db_field: "appointments" },
      { key: "calls", label: "Apeluri primite", kind: "number", db_field: "calls" },
      { key: "messages", label: "Mesaje / întrebări", kind: "number", db_field: "dms" },
      { key: "new_patients", label: "Pacienți noi", kind: "number" },
    ],
  },
};

export function getImpactConfig(
  niche?: string | null,
  customFields?: { key: string; label: string; kind?: string }[] | null
): NicheImpactConfig {
  if (niche && IMPACT_BY_NICHE[niche]) return IMPACT_BY_NICHE[niche];
  if (niche === "custom" && Array.isArray(customFields) && customFields.length) {
    return {
      title: "Impact business",
      intro: "Câmpurile configurate de agenția ta.",
      fields: customFields.map((f) => ({
        key: f.key,
        label: f.label,
        kind: ((f.kind as ImpactKind) || "number"),
      })),
    };
  }
  return {
    title: "Impact business",
    intro: "Cum a mers business-ul luna aceasta?",
    fields: [
      { key: "leads", label: "Lead-uri", kind: "number", db_field: "dms" },
      { key: "calls", label: "Apeluri", kind: "number", db_field: "calls" },
      { key: "bookings", label: "Rezervări / programări", kind: "number", db_field: "bookings" },
      { key: "sales", label: "Vânzări", kind: "number", db_field: "sales" },
      { key: "revenue", label: "Revenue (lei)", kind: "currency", db_field: "revenue_estimate" },
    ],
  };
}

export type ImpactValueMode = "exact" | "approx" | "unknown" | "not_applicable";

export type ImpactEntry = { mode: ImpactValueMode; value: string };
