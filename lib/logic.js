import {
  SECURITY_ITEMS_EN, SECURITY_ITEMS_AR, RISK_SEVERITY, EXIT_READINESS,
  STATUS_MAP, READINESS, SECTIONS_DEF,
} from './constants';

// ─── Cross-section Issue Engine ───────────────────────────────────────────────
export const deriveIssues = (a) => {
  const issues = [];
  const add = (sev, section, msg) => issues.push({ sev, section, msg });

  // General
  if (!a.name) add("error", "general", "Solution name is empty");
  if (!(a.assessors || []).length) add("error", "general", "No assessors assigned to this assessment");
  if (!(a.assessors || []).includes("Security Architect") && (a.complianceFrameworks || []).length > 0)
    add("warning", "general", "Compliance frameworks selected but no Security Architect assigned");
  if (!a.artifacts) add("info", "general", "No HLD or architecture artifacts linked");
  if (!(a.scope || []).length) add("warning", "general", "Assessment scope not defined");
  if (a.status === "go_to_poc" && !a.hldLink) add("error", "general", "Status is Go to PoC but no HLD link attached");

  // Summary
  if (!a.summary) add("error", "summary", "Executive summary is empty");
  if (!a.readiness) add("error", "summary", "Readiness verdict not set");
  if (a.readiness && !a.readinessJustification) add("warning", "summary", "Readiness verdict has no justification");
  if (a.readiness === "not_ready" && a.status === "go_to_poc") add("error", "summary", "Assessment is Not Ready but status is Go to PoC — contradiction");

  // Assumptions
  if (!a.assumptions) add("warning", "assumptions", "No assumptions documented");

  // Infrastructure
  if (!a.hostingEnv) add("error", "infrastructure", "Hosting environment not defined");
  if (a.hostingEnv === "On-Premises" && !a.onPremModel)
    add("error", "infrastructure", "On-premises selected but deployment model (VM/K8s/Container) not specified");
  if (!a.deploymentModel) add("warning", "infrastructure", "Deployment details not documented (CI/CD, DR strategy)");
  if (a.deploymentModel && !a.deploymentModel.toLowerCase().match(/dr|disaster|recovery|failover/))
    add("error", "infrastructure", "Disaster Recovery (DR) strategy not mentioned in deployment details");
  if (!a.scalability) add("warning", "infrastructure", "Scalability & Performance not assessed");
  if (!a.technicalSupport) add("warning", "infrastructure", "Technical support model not documented");

  // Compliance cross-checks
  const fw = a.complianceFrameworks || [];
  const isSaaS = a.hostingEnv === "SaaS — Deployed via Vendor";
  if (fw.includes("SAMA") && isSaaS) add("error", "data", "SAMA requires KSA data residency — SaaS hosting must be validated for in-kingdom storage");
  if (fw.includes("NCA") && isSaaS) add("error", "data", "NCA ECC requires approved hosting — confirm cloud provider meets NCA cloud controls (CCC)");
  if (fw.includes("GDPR") && isSaaS) add("warning", "data", "GDPR: confirm SaaS provider stores EU personal data within EEA or has adequacy decision");
  if (fw.length > 0 && !a.regulatory) add("error", "data", "Compliance frameworks selected but compliance notes section is empty");
  if (fw.length > 0 && !(a.assessors || []).includes("Security Architect"))
    add("warning", "security", "Compliance obligations present but no Security Architect on the assessment");

  // Observability
  if (!(a.monitoringCaps || []).length) add("warning", "observability", "No monitoring capabilities selected");
  if (!(a.monitoringCaps || []).includes("Alerting"))
    add("error", "observability", "Alerting not enabled — critical for incident detection");
  if (!(a.monitoringCaps || []).includes("Logs"))
    add("error", "observability", "Logging not enabled — required for audit trails and incident investigation");
  if (!a.monitoringTool) add("warning", "observability", "No monitoring platform selected");

  // Integration
  if (!a.ssoSupported) add("warning", "integration", "SSO integration status not evaluated");
  if (a.ssoSupported === "No — Not Supported") add("error", "integration", "SSO not supported — enterprise identity policy violation");
  if (a.ssoSupported === "Yes — Fully Supported" && !a.ssoProtocol)
    add("warning", "integration", "SSO supported but protocol (SAML/OIDC) not specified");
  if ((a.integrationPatterns || []).length > 0 && !a.integration)
    add("warning", "integration", "Integration patterns selected but integration details section is empty");
  if (a.integrationComplexity?.includes("Critical") && !(a.risks || []).some(r => r.category === "Integration"))
    add("error", "risks", "Critical integration complexity but no integration risks logged");

  // Security
  const secChecked = Object.values(a.security || {}).filter(Boolean).length;
  const secPct = Math.round(secChecked / SECURITY_ITEMS_EN.length * 100);
  if (secPct === 0) add("error", "security", "Security checklist not started (0 items checked)");
  else if (secPct < 50) add("error", "security", `Security checklist only ${secPct}% complete — ${SECURITY_ITEMS_EN.length - secChecked} items unchecked`);
  else if (secPct < 100) add("warning", "security", `Security checklist ${secPct}% complete — ${SECURITY_ITEMS_EN.length - secChecked} items still unchecked`);
  if (!a.security?.["Authentication and authorization flows defined"])
    add("error", "security", "Authentication & authorization flows not defined — critical security gap");
  if (!a.security?.["Encryption requirements specified"])
    add("error", "security", "Encryption requirements not specified — data at rest and in transit must be covered");
  if (!a.security?.["Role-Based Access Control (RBAC) implemented"])
    add("error", "security", "RBAC not implemented — access control is a baseline security requirement");

  // Risks
  const risks = a.risks || [];
  if (!risks.length && (fw.length > 0 || a.integrationComplexity?.includes("High")))
    add("warning", "risks", "No risks logged despite compliance obligations or high integration complexity");
  const noMit = risks.filter(r => r.title && !r.mitigation);
  if (noMit.length > 0) add("error", "risks", `${noMit.length} risk(s) have no mitigation strategy`);
  const critRisks = risks.filter(r => r.severity === "critical");
  if (critRisks.length > 0) add("error", "risks", `${critRisks.length} critical risk(s) require ARB sign-off before proceeding`);
  if (risks.filter(r => r.severity === "high" || r.severity === "critical").length > 2 && a.pocRequired === "No — Not Required")
    add("warning", "poc", "Multiple high/critical risks logged but PoC is marked Not Required — reconsider");

  // Exit
  if (!a.exitReadiness) add("warning", "exit", "Exit readiness not assessed — required for enterprise governance");
  if (a.exitReadiness === "low" && !a.contractualExit)
    add("error", "exit", "High lock-in risk but no contractual exit terms documented");
  if (!a.decommissionPlan) add("warning", "exit", "No decommission plan documented");

  // PoC
  if (!a.pocRequired) add("warning", "poc", "PoC decision not made");
  if (a.pocRequired?.includes("Yes") && !a.pocRecommendation)
    add("warning", "poc", "PoC required but recommendation text is empty");
  if (a.pocRecommendation && !a.pocRecommendation.toLowerCase().match(/success|criteria|measur|outcome/))
    add("warning", "poc", "PoC recommendation lacks measurable success criteria");

  // Migration cross-check
  if (a.migrationRequired === "Yes" && !a.dataMigration)
    add("error", "data", "Data migration required but migration details not documented");

  return issues;
};

// ─── Word Export ──────────────────────────────────────────────────────────────
export const exportToWord = (a, lang) => {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "'Tajawal',Tahoma" : "Calibri";
  const S = (t, v) => v ? `<h2 style="font-family:${font};font-size:14pt;color:#1e3a5f;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:24px;direction:${dir}">${t}</h2><p style="font-family:${font};font-size:11pt;white-space:pre-wrap;line-height:1.8;direction:${dir}">${v}</p>` : "";
  const secItems = SECURITY_ITEMS_EN.map((item, i) => `<tr><td style="padding:6px 8px;font-family:${font};font-size:10pt;direction:${dir}">${isAr ? SECURITY_ITEMS_AR[i] : item}</td><td style="padding:6px 8px;text-align:center;color:${a.security?.[item] ? '#10B981' : '#EF4444'};font-size:14pt">${a.security?.[item] ? '✓' : '✗'}</td></tr>`).join("");
  const risksHtml = (a.risks || []).length ? `<h2 style="font-family:${font};font-size:14pt;color:#1e3a5f;border-bottom:1px solid #ccc;margin-top:24px">${isAr ? "سجل المخاطر" : "Risk Register"}</h2><table style="width:100%;border-collapse:collapse"><tr style="background:#1e3a5f;color:white"><th style="padding:8px">${isAr ? "المخاطرة" : "Risk"}</th><th style="padding:8px">${isAr ? "الشدة" : "Sev"}</th><th style="padding:8px">${isAr ? "الوصف" : "Description"}</th><th style="padding:8px">${isAr ? "الحل" : "Mitigation"}</th></tr>${a.risks.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#f8f9fa' : 'white'}"><td style="padding:8px">${r.title}</td><td style="padding:8px;color:${RISK_SEVERITY[r.severity]?.color}">${RISK_SEVERITY[r.severity]?.label}</td><td style="padding:8px">${r.description || "—"}</td><td style="padding:8px">${r.mitigation || "—"}</td></tr>`).join("")}</table>` : "";
  const vd = a.vendor === "Other (specify below)" || a.vendor === "— Internal Team —" ? a.vendorCustom : a.vendor;
  const html = `<html><head><meta charset="UTF-8"></head><body style="font-family:${font};margin:72pt;direction:${dir}">
  <div style="border-${isAr ? "right" : "left"}:4px solid #1e3a5f;padding-${isAr ? "right" : "left"}:16px;margin-bottom:28px">
    <h1 style="font-size:22pt;color:#0f172a;margin:0">${a.name || "Untitled"}</h1>
    <p style="font-size:10pt;color:#64748b;margin:4px 0">Date: ${a.date} | Status: ${STATUS_MAP[a.status]?.label} | Readiness: ${READINESS[a.readiness]?.label || "—"}</p>
    ${a.hldLink ? `<p style="font-size:10pt;color:#64748b;margin:2px 0">HLD: <a href="${a.hldLink}">${a.hldLink}</a></p>` : ""}
  </div>
  <h2 style="font-size:14pt;color:#1e3a5f;border-bottom:1px solid #ccc;padding-bottom:4px">General Information</h2>
  <table style="font-size:10pt;width:100%">
    <tr><td style="padding:4px 8px;color:#64748b;width:160px">Vendor / Team</td><td>${vd || "—"}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">Assessors</td><td>${(a.assessors || []).join(", ") || "—"}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">Scope</td><td>${(a.scope || []).join(", ") || "—"}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">Hosting</td><td>${a.hostingEnv || "—"}${a.hostingEnv === "On-Premises" && a.onPremModel ? " → " + a.onPremModel : ""}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">SSO</td><td>${a.ssoSupported || "—"}${a.ssoProtocol ? " (" + a.ssoProtocol + ")" : ""}</td></tr>
  </table>
  ${S("Executive Summary", a.summary)} ${S("Assumptions", a.assumptions)} ${S("Constraints", a.constraints)}
  ${S("Deployment Model", a.deploymentModel)} ${S("Scalability & Performance", a.scalability)}
  ${S("Operational Overhead", a.operationalOverhead)} ${S("Technical Support", a.technicalSupport)}
  ${S("Training & Adoption", a.training)} ${S("Observability", a.observability)}
  ${S("Integration", a.integration)} ${S("SSO Notes", a.ssoNotes)}
  ${S("Regulatory & Compliance", a.regulatory)} ${S("Data Migration", a.dataMigration)}
  <h2 style="font-size:14pt;color:#1e3a5f;border-bottom:1px solid #ccc;margin-top:24px">Security Checklist</h2>
  <table style="font-size:10pt;border-collapse:collapse">${secItems}</table>
  ${a.securityNotes ? `<p style="font-size:10pt"><strong>Notes:</strong> ${a.securityNotes}</p>` : ""}
  ${risksHtml}
  <h2 style="font-size:14pt;color:#1e3a5f;border-bottom:1px solid #ccc;margin-top:24px">Exit Strategy</h2>
  <table style="font-size:10pt;width:100%">
    <tr><td style="padding:4px 8px;color:#64748b;width:180px">Exit Readiness</td><td>${EXIT_READINESS[a.exitReadiness]?.label || a.exitReadiness || "—"}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">Data Portability</td><td style="white-space:pre-wrap">${a.dataPortability || "—"}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">Vendor Lock-in</td><td style="white-space:pre-wrap">${a.vendorLockIn || "—"}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">Exit Terms</td><td style="white-space:pre-wrap">${a.contractualExit || "—"}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">Decommission Plan</td><td style="white-space:pre-wrap">${a.decommissionPlan || "—"}</td></tr>
    <tr><td style="padding:4px 8px;color:#64748b">Export Formats</td><td>${a.exportFormatsList || "—"}</td></tr>
  </table>
  ${S("PoC Recommendation", a.pocRecommendation)} ${S("Remarks", a.pocRemarks)}
  <p style="font-size:9pt;color:#94a3b8;margin-top:48px;border-top:1px solid #e2e8f0;padding-top:8px">Generated by TechAssess · ${new Date().toLocaleString()}</p>
  </body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement("a");
  a2.href = url;
  a2.download = `${(a.name || "assessment").replace(/\s+/g, "-")}.doc`;
  a2.click();
  URL.revokeObjectURL(url);
};
