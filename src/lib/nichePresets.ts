// Niche presets — KPI fields, business impact fields, monthly questions
// Used by Add Client Wizard to pre-fill metric structure per niche.

export type KpiField = {
  key: string;
  label: string;
  unit?: string;
  type?: "number" | "currency" | "percent" | "text";
  // Custom KPI extras (used by Custom Niche editor)
  kpi_type?: "number" | "percentage" | "currency" | "text" | "boolean";
  field_type?: "number" | "percentage" | "currency" | "text" | "boolean";
  reporting_frequency?: "daily" | "weekly" | "monthly";
  visible_to_client?: boolean;
};
export type Question = { key: string; label: string };

export type NichePreset = {
  niche_key: string;
  label: string;
  kpi_fields: KpiField[];
  business_impact_fields: KpiField[];
  monthly_questions: Question[];
};

const common = {
  bi: [
    { key: "calls", label: "Calls received", type: "number" as const },
    { key: "messages", label: "Direct messages", type: "number" as const },
    { key: "revenue_estimate", label: "Estimated revenue", type: "currency" as const },
  ],
  q: [
    { key: "real_life_impact", label: "What real-life impact did marketing have this month?" },
    { key: "objections", label: "Most common client objections this month?" },
    { key: "promote_next_month", label: "What should we promote next month?" },
  ],
};

export const NICHE_PRESETS: Record<string, NichePreset> = {
  real_estate: {
    niche_key: "real_estate", label: "Real Estate",
    kpi_fields: [
      { key: "viewings", label: "Property viewings", type: "number" },
      { key: "leads", label: "Qualified leads", type: "number" },
      { key: "listings", label: "Active listings", type: "number" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "viewings", label: "Viewings booked", type: "number" },
      { key: "contracts", label: "Contracts signed", type: "number" },
    ],
    monthly_questions: common.q,
  },
  restaurant: {
    niche_key: "restaurant", label: "Restaurants",
    kpi_fields: [
      { key: "reservations", label: "Reservations", type: "number" },
      { key: "covers", label: "Covers served", type: "number" },
      { key: "avg_ticket", label: "Average ticket", type: "currency" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "bookings", label: "Bookings", type: "number" },
      { key: "orders", label: "Orders", type: "number" },
    ],
    monthly_questions: common.q,
  },
  beauty: {
    niche_key: "beauty", label: "Beauty / Aesthetics",
    kpi_fields: [
      { key: "appointments", label: "Appointments", type: "number" },
      { key: "new_clients", label: "New clients", type: "number" },
      { key: "rebookings", label: "Rebookings", type: "number" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "appointments", label: "Appointments", type: "number" },
      { key: "sales", label: "Product sales", type: "number" },
    ],
    monthly_questions: common.q,
  },
  ecommerce: {
    niche_key: "ecommerce", label: "E-commerce",
    kpi_fields: [
      { key: "sales", label: "Sales (orders)", type: "number" },
      { key: "revenue", label: "Revenue", type: "currency" },
      { key: "roas", label: "ROAS", type: "number" },
      { key: "aov", label: "Average order value", type: "currency" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "orders", label: "Orders", type: "number" },
      { key: "sales", label: "Sales", type: "number" },
    ],
    monthly_questions: common.q,
  },
  fitness: {
    niche_key: "fitness", label: "Fitness / Coaches",
    kpi_fields: [
      { key: "trial_signups", label: "Trial sign-ups", type: "number" },
      { key: "memberships", label: "New memberships", type: "number" },
      { key: "leads", label: "Leads", type: "number" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "bookings", label: "Bookings", type: "number" },
    ],
    monthly_questions: common.q,
  },
  medical: {
    niche_key: "medical", label: "Medical / Clinics",
    kpi_fields: [
      { key: "appointments", label: "Appointments", type: "number" },
      { key: "new_patients", label: "New patients", type: "number" },
      { key: "treatments_requested", label: "Treatments requested", type: "number" },
      { key: "price_inquiries", label: "Price inquiries", type: "number" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "appointments", label: "Appointments", type: "number" },
    ],
    monthly_questions: common.q,
  },
  dental: {
    niche_key: "dental", label: "Dental",
    kpi_fields: [
      { key: "appointments", label: "Appointments", type: "number" },
      { key: "new_patients", label: "New patients", type: "number" },
      { key: "treatments_requested", label: "Treatments requested", type: "number" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "appointments", label: "Appointments", type: "number" },
    ],
    monthly_questions: common.q,
  },
  education: {
    niche_key: "education", label: "Education",
    kpi_fields: [
      { key: "enrollments", label: "Enrollments", type: "number" },
      { key: "info_requests", label: "Info requests", type: "number" },
      { key: "trial_classes", label: "Trial classes", type: "number" },
    ],
    business_impact_fields: common.bi,
    monthly_questions: common.q,
  },
  auto: {
    niche_key: "auto", label: "Automotive",
    kpi_fields: [
      { key: "test_drives", label: "Test drives", type: "number" },
      { key: "leads", label: "Leads", type: "number" },
      { key: "service_bookings", label: "Service bookings", type: "number" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "sales", label: "Vehicle sales", type: "number" },
    ],
    monthly_questions: common.q,
  },
  legal: {
    niche_key: "legal", label: "Legal",
    kpi_fields: [
      { key: "consultations", label: "Consultations booked", type: "number" },
      { key: "qualified_leads", label: "Qualified leads", type: "number" },
      { key: "cases_opened", label: "Cases opened", type: "number" },
    ],
    business_impact_fields: common.bi,
    monthly_questions: common.q,
  },
  finance: {
    niche_key: "finance", label: "Finance",
    kpi_fields: [
      { key: "consultations", label: "Consultations", type: "number" },
      { key: "applications", label: "Applications", type: "number" },
      { key: "qualified_leads", label: "Qualified leads", type: "number" },
    ],
    business_impact_fields: common.bi,
    monthly_questions: common.q,
  },
  hospitality: {
    niche_key: "hospitality", label: "Hotels / Hospitality / Tourism",
    kpi_fields: [
      { key: "bookings", label: "Bookings", type: "number" },
      { key: "reservation_requests", label: "Reservation requests", type: "number" },
      { key: "direct_inquiries", label: "Direct booking inquiries", type: "number" },
      { key: "occupancy_rate", label: "Occupancy rate", type: "percent" },
      { key: "booked_nights", label: "Booked nights", type: "number" },
      { key: "room_inquiries", label: "Room inquiries", type: "number" },
      { key: "package_inquiries", label: "Package inquiries", type: "number" },
      { key: "booking_engine_clicks", label: "Booking engine clicks", type: "number" },
      { key: "website_clicks", label: "Website clicks", type: "number" },
      { key: "whatsapp_inquiries", label: "WhatsApp inquiries", type: "number" },
      { key: "guest_reviews", label: "Guest reviews", type: "number" },
      { key: "review_score", label: "Review score (avg)", type: "number" },
      { key: "revenue", label: "Revenue (manual)", type: "currency" },
      { key: "cost_per_booking", label: "Cost per booking", type: "currency" },
      { key: "roas", label: "ROAS", type: "number" },
    ],
    business_impact_fields: [
      ...common.bi,
      { key: "bookings", label: "Bookings", type: "number" },
      { key: "reservation_requests", label: "Reservation requests", type: "number" },
      { key: "contracts", label: "Events / weddings booked", type: "number" },
    ],
    monthly_questions: [
      { key: "reservation_requests_received", label: "Ai primit cereri de rezervare luna aceasta?" },
      { key: "promote_priority", label: "Ce vrei să promovăm prioritar (camere, pachete, spa, restaurant, evenimente, nunți, oferte sezoniere)?" },
      { key: "low_availability_periods", label: "Ai perioade cu disponibilitate mare pe care vrei să le umplem?" },
      { key: "target_guest_type", label: "Ce tip de oaspeți vrei să atragem?" },
      { key: "important_reviews", label: "Ai primit feedback sau review-uri importante?" },
      { key: "best_package", label: "Ce pachet, cameră sau experiență a mers cel mai bine?" },
      { key: "important_note", label: "Există ceva important ce trebuie să știe agenția?" },
    ],
  },
  custom: {
    niche_key: "custom", label: "Custom",
    kpi_fields: [],
    business_impact_fields: [
      { key: "calls", label: "Calls", type: "number" },
      { key: "messages", label: "Messages", type: "number" },
    ],
    monthly_questions: common.q,
  },
};

export const NICHE_PRESET_OPTIONS = [
  { value: "real_estate", label: "Real Estate" },
  { value: "restaurant", label: "Restaurants" },
  { value: "beauty", label: "Beauty / Aesthetics" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "fitness", label: "Fitness / Coaches" },
  { value: "medical", label: "Medical / Clinics" },
  { value: "education", label: "Education" },
  { value: "auto", label: "Automotive" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "hospitality", label: "Hotels / Hospitality / Tourism" },
  { value: "custom", label: "Custom" },
];

export function getNichePreset(key: string): NichePreset {
  return NICHE_PRESETS[key] ?? NICHE_PRESETS.custom;
}
