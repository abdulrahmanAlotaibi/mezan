export const uid = () => Math.random().toString(36).slice(2, 10);
export const now = () => new Date().toISOString();
export const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const STATUSES = [
  { id: "in_progress", label: "In Progress", labelAr: "قيد التنفيذ", color: "#F59E0B", dot: "#F59E0B", bg: "rgba(245,158,11,0.12)", desc: "Assessment ongoing", descAr: "التقييم جارٍ" },
  { id: "finalized", label: "Finalized", labelAr: "مكتمل", color: "#10B981", dot: "#10B981", bg: "rgba(16,185,129,0.12)", desc: "Assessment complete", descAr: "اكتمل التقييم" },
  { id: "go_to_poc", label: "Go to PoC", labelAr: "الانتقال لـ PoC", color: "#6366F1", dot: "#6366F1", bg: "rgba(99,102,241,0.12)", desc: "Approved for PoC", descAr: "موافقة على PoC" },
];

export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

export const READINESS = {
  ready: { label: "Ready", labelAr: "جاهز", color: "#10B981" },
  ready_with_conditions: { label: "Ready with Conditions", labelAr: "جاهز بشروط", color: "#F59E0B" },
  not_ready: { label: "Not Ready", labelAr: "غير جاهز", color: "#EF4444" },
};

export const RISK_SEVERITY = {
  low: { label: "Low", labelAr: "منخفض", color: "#10B981" },
  medium: { label: "Medium", labelAr: "متوسط", color: "#F59E0B" },
  high: { label: "High", labelAr: "عالٍ", color: "#EF4444" },
  critical: { label: "Critical", labelAr: "حرج", color: "#7C3AED" },
};

export const EXIT_READINESS = {
  high: { label: "High Portability", labelAr: "قابلية نقل عالية", color: "#10B981" },
  medium: { label: "Medium Portability", labelAr: "قابلية نقل متوسطة", color: "#F59E0B" },
  low: { label: "Low — Vendor Lock-in", labelAr: "منخفض — ارتباط بالمورد", color: "#EF4444" },
};

export const SECURITY_ITEMS_EN = [
  "All external interfaces identified and protected",
  "Authentication and authorization flows defined",
  "Encryption requirements specified",
  "Logging and auditing requirements defined",
  "Compliance requirements mapped",
  "Disaster recovery security considerations addressed",
  "Third-party component security assessed",
  "Security controls assigned to system components",
  "Role-Based Access Control (RBAC) implemented",
  "Data flow defined with security controls",
  "Identity and Access Management (IAM) flow documented",
  "Penetration testing scope identified",
  "Secret and key management strategy defined",
];

export const SECURITY_ITEMS_AR = [
  "تحديد وحماية جميع الواجهات الخارجية",
  "تحديد تدفقات المصادقة والتفويض",
  "تحديد متطلبات التشفير",
  "تحديد متطلبات التسجيل والتدقيق",
  "رسم خريطة متطلبات الامتثال",
  "معالجة اعتبارات أمان التعافي من الكوارث",
  "تقييم أمان المكونات الخارجية",
  "تعيين ضوابط الأمان لمكونات النظام",
  "تطبيق التحكم في الوصول القائم على الأدوار (RBAC)",
  "تحديد تدفق البيانات مع ضوابط الأمان",
  "توثيق تدفق إدارة الهوية والوصول (IAM)",
  "تحديد نطاق اختبار الاختراق",
  "تحديد استراتيجية إدارة الأسرار والمفاتيح",
];

export const SECURITY_HINTS = [
  "Map all APIs, web services, file transfers, and admin portals. Each interface is an attack surface.",
  "Define the full auth flow: login, token refresh, logout, session timeout, and MFA requirements.",
  "Specify TLS versions, cipher suites, encryption at rest (AES-256), and key rotation policy.",
  "Confirm log format (CEF/JSON), retention period, tamper-protection, and SIEM integration.",
  "Cross-check selected compliance frameworks (GDPR/PCI/HIPAA) against implemented controls.",
  "Verify RPO/RTO targets, backup strategy, failover testing schedule, and geo-redundancy.",
  "Run SCA (software composition analysis) on all third-party libraries and open-source components.",
  "Assign and document each control: firewall rules, WAF, IDS/IPS, DLP per component.",
  "Define roles, permissions matrix, privilege escalation policy, and periodic access review process.",
  "Create a data flow diagram (DFD) showing all data in motion and at rest with applied controls.",
  "Document IAM provider, federation mechanism, group-to-role mapping, and provisioning/deprovisioning.",
  "Define pentest scope: black/grey/white box, frequency, remediaton SLA, and responsible disclosure.",
  "Confirm vault solution (HashiCorp Vault, AWS SM, Azure KV), rotation policy, and access auditing.",
];

export const VENDOR_OPTIONS = [
  "— Internal Team —", "Microsoft", "AWS", "Google Cloud", "Salesforce", "SAP", "Oracle",
  "ServiceNow", "Workday", "Snowflake", "Databricks", "HashiCorp", "Red Hat", "VMware",
  "Palo Alto Networks", "CrowdStrike", "Splunk", "Dynatrace", "Datadog", "MuleSoft", "Boomi",
  "Other (specify below)",
];

export const ASSESSOR_OPTIONS = [
  "Enterprise Architect", "Solution Architect", "Security Architect",
  "Cloud Architect", "Data Architect", "Lead Developer", "DevOps Lead", "CTO", "Head of Architecture",
];

export const SECTIONS_DEF = [
  { id: "general", labelKey: "generalInfo", icon: "◈" },
  { id: "summary", labelKey: "summaryReadiness", icon: "◎" },
  { id: "assumptions", labelKey: "assumptions", icon: "△" },
  { id: "infrastructure", labelKey: "infrastructure", icon: "⬡" },
  { id: "observability", labelKey: "observability", icon: "◉" },
  { id: "integration", labelKey: "integration", icon: "⇌" },
  { id: "data", labelKey: "data", icon: "▣" },
  { id: "security", labelKey: "security", icon: "⊛" },
  { id: "risks", labelKey: "riskRegister", icon: "⚑" },
  { id: "exit", labelKey: "exitStrategy", icon: "↪" },
  { id: "poc", labelKey: "pocRecommendation", icon: "◆" },
];

export const emptyAssessment = () => ({
  id: uid(), name: "", date: new Date().toISOString().split("T")[0],
  vendor: "", vendorCustom: "", assessors: [], groupId: "",
  artifacts: "", scope: [], engagementType: "", status: "in_progress",
  hldLink: "", createdAt: now(), updatedAt: now(),
  summary: "", readiness: "", readinessJustification: "", assumptions: "", constraints: "",
  hostingEnv: "", onPremModel: "", infraModel: "", deploymentModel: "",
  scalability: "", operationalOverhead: "", technicalSupport: "", training: "",
  monitoringCaps: [], monitoringTool: "", observability: "",
  integrationPatterns: [], integrationComplexity: "", integration: "",
  ssoSupported: "", ssoProtocol: "", ssoNotes: "",
  complianceFrameworks: [], regulatory: "", migrationRequired: "", dataMigration: "",
  security: {}, securityNotes: "", risks: [],
  exitReadiness: "", dataPortability: "", vendorLockIn: "", contractualExit: "",
  decommissionPlan: "", exportFormatsList: "",
  pocRequired: "", pocRecommendation: "", pocRemarks: "",
});

export const loadData = () => {
  try {
    const r = localStorage.getItem("ta_v4");
    return r ? JSON.parse(r) : { assessments: [], groups: [] };
  } catch {
    return { assessments: [], groups: [] };
  }
};

export const persistData = (d) => localStorage.setItem("ta_v4", JSON.stringify(d));
