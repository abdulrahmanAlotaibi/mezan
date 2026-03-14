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
  const font = isAr ? "'Tajawal',Tahoma,Arial,sans-serif" : "Calibri,Arial,sans-serif";
  const vd = a.vendor === "Other (specify below)" || a.vendor === "— Internal Team —" ? a.vendorCustom : a.vendor;

  // ── Color palette ────────────────────────────────────────────────────────
  const navy   = "#1e3a5f";
  const indigo = "#6366f1";
  const mid    = "#64748b";
  const bdr    = "#e2e8f0";
  const light  = "#f8fafc";

  // ── Helpers ───────────────────────────────────────────────────────────────
  const secH = (num, title) => `
    <div style="margin-top:28px;margin-bottom:10px;border-bottom:2.5px solid ${navy};padding-bottom:6px;display:flex;align-items:baseline;gap:10px">
      <span style="font-size:10pt;font-weight:700;color:${indigo};font-family:${font}">${num}</span>
      <span style="font-size:13pt;color:${navy};font-family:${font};font-weight:700;direction:${dir}">${title}</span>
    </div>`;

  const row = (label, value, i = 0) => `
    <tr style="background:${i % 2 === 0 ? light : "white"}">
      <td style="padding:7px 10px;color:${mid};font-size:10pt;font-family:${font};width:190px;border:1px solid ${bdr};font-weight:600;vertical-align:top">${label}</td>
      <td style="padding:7px 10px;font-size:10pt;font-family:${font};border:1px solid ${bdr};white-space:pre-wrap;direction:${dir};vertical-align:top">${value || "—"}</td>
    </tr>`;

  const txt = (v) => v
    ? `<p style="font-size:10.5pt;font-family:${font};line-height:1.9;color:#1e293b;white-space:pre-wrap;margin:0 0 8px 0;direction:${dir};text-align:${isAr ? "right" : "left"}">${v}</p>`
    : `<p style="font-size:10pt;color:${mid};font-style:italic;font-family:${font};margin:0 0 8px 0">Not provided</p>`;

  const pill = (label, bg, col, border) =>
    `<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 10px;background:${bg};color:${col};border:1px solid ${border};border-radius:12px;font-size:9pt;font-family:${font};font-weight:600">${label}</span>`;

  // ── Security checklist ────────────────────────────────────────────────────
  const secChecked = Object.values(a.security || {}).filter(Boolean).length;
  const secPct = Math.round(secChecked / SECURITY_ITEMS_EN.length * 100);
  const pctColor = secPct === 100 ? "#10b981" : secPct >= 50 ? "#f59e0b" : "#ef4444";

  const secRows = SECURITY_ITEMS_EN.map((item, i) => {
    const on = !!(a.security?.[item]);
    const label = isAr ? SECURITY_ITEMS_AR[i] : item;
    return `
      <tr style="background:${i % 2 === 0 ? light : "white"}">
        <td style="padding:7px 10px;font-size:10pt;font-family:${font};border:1px solid ${bdr};direction:${dir};vertical-align:top">
          <div style="font-weight:${on ? "600" : "400"};color:${on ? "#0f172a" : "#475569"}">${label}</div>
          <div style="font-size:8.5pt;color:#94a3b8;margin-top:2px;line-height:1.4">${SECURITY_HINTS[i]}</div>
        </td>
        <td style="padding:7px 10px;text-align:center;border:1px solid ${bdr};width:70px;vertical-align:middle">
          <span style="font-size:15pt;color:${on ? "#10b981" : "#ef4444"}">${on ? "✓" : "✗"}</span>
        </td>
      </tr>`;
  }).join("");

  // ── Risk register ─────────────────────────────────────────────────────────
  const risks = a.risks || [];
  const risksHtml = risks.length ? `
    ${secH("9.", isAr ? "سجل المخاطر" : "Risk Register")}
    <table style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead>
        <tr style="background:${navy}">
          <th style="padding:8px 10px;text-align:${isAr?"right":"left"};font-size:9.5pt;font-family:${font};color:white;border:1px solid ${navy};width:22%">${isAr?"المخاطرة":"Risk"}</th>
          <th style="padding:8px 10px;text-align:center;font-size:9.5pt;font-family:${font};color:white;border:1px solid ${navy};width:10%">${isAr?"الفئة":"Category"}</th>
          <th style="padding:8px 10px;text-align:center;font-size:9.5pt;font-family:${font};color:white;border:1px solid ${navy};width:10%">${isAr?"الشدة":"Severity"}</th>
          <th style="padding:8px 10px;text-align:${isAr?"right":"left"};font-size:9.5pt;font-family:${font};color:white;border:1px solid ${navy};width:29%">${isAr?"الوصف":"Description"}</th>
          <th style="padding:8px 10px;text-align:${isAr?"right":"left"};font-size:9.5pt;font-family:${font};color:white;border:1px solid ${navy};width:29%">${isAr?"الحل":"Mitigation"}</th>
        </tr>
      </thead>
      <tbody>
        ${risks.map((r, i) => {
          const sev = RISK_SEVERITY[r.severity];
          return `
          <tr style="background:${i % 2 === 0 ? light : "white"}">
            <td style="padding:7px 10px;font-size:10pt;font-family:${font};border:1px solid ${bdr};font-weight:600;vertical-align:top">${r.title || "—"}</td>
            <td style="padding:7px 10px;font-size:9pt;font-family:${font};border:1px solid ${bdr};text-align:center;color:${mid};vertical-align:top">${r.category || "—"}</td>
            <td style="padding:7px 10px;font-size:9pt;font-family:${font};border:1px solid ${bdr};text-align:center;vertical-align:top">
              <span style="font-weight:700;color:${sev?.color||mid};background:${(sev?.color||mid)+"18"};padding:2px 7px;border-radius:4px">${sev?.label||r.severity||"—"}</span>
            </td>
            <td style="padding:7px 10px;font-size:10pt;font-family:${font};border:1px solid ${bdr};white-space:pre-wrap;vertical-align:top">${r.description || "—"}</td>
            <td style="padding:7px 10px;font-size:10pt;font-family:${font};border:1px solid ${bdr};white-space:pre-wrap;vertical-align:top">${r.mitigation || "—"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>` : "";

  // ── Readiness ─────────────────────────────────────────────────────────────
  const rdColor = READINESS[a.readiness]?.color || mid;
  const rdLabel = READINESS[a.readiness]?.label || "—";

  // ── Full document ─────────────────────────────────────────────────────────
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta name=ProgId content=Word.Document>
  <style>
    @page { size:A4; margin:2.5cm 2.8cm; }
    body { font-family:${font}; color:#1e293b; margin:0; }
    table { border-collapse:collapse; width:100%; }
    p { margin:0 0 10px 0; }
    h1,h2,h3 { margin:0; }
  </style>
</head>
<body style="font-family:${font};color:#1e293b;direction:${dir}">

<!-- ══════════════ COVER PAGE ══════════════ -->
<div style="min-height:900px;display:flex;flex-direction:column;padding:32px 0 24px;border-bottom:3px solid ${navy}">

  <!-- Brand -->
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:52px">
    <div style="width:40px;height:40px;background:linear-gradient(135deg,${indigo},#a78bfa);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;font-family:${font}">M</div>
    <div>
      <div style="font-size:15pt;font-weight:700;color:${navy};font-family:${font}">Mezan AI</div>
      <div style="font-size:9pt;color:${mid};font-family:${font}">Technology Assessment Platform</div>
    </div>
  </div>

  <!-- Title -->
  <div style="border-${isAr?"right":"left"}:5px solid ${indigo};padding-${isAr?"right":"left"}:20px;margin-bottom:48px">
    <div style="font-size:9pt;font-weight:700;color:${indigo};letter-spacing:0.15em;text-transform:uppercase;font-family:${font};margin-bottom:10px">Technology Assessment Report</div>
    <h1 style="font-size:26pt;color:#0f172a;margin:0 0 10px;font-family:${font};font-weight:700;line-height:1.15">${a.name || "Untitled Assessment"}</h1>
    ${vd ? `<div style="font-size:13pt;color:${mid};font-family:${font}">${vd}</div>` : ""}
  </div>

  <!-- Meta table -->
  <table style="border-collapse:collapse;margin-bottom:18px">
    <tr>
      <td style="padding:10px 14px;background:${navy};color:white;font-size:9pt;font-family:${font};font-weight:600;width:22%;border:1px solid ${navy}">Assessment Date</td>
      <td style="padding:10px 14px;background:${light};font-size:10pt;font-family:${font};border:1px solid ${bdr};width:28%">${a.date || "—"}</td>
      <td style="padding:10px 14px;background:${navy};color:white;font-size:9pt;font-family:${font};font-weight:600;width:22%;border:1px solid ${navy}">Status</td>
      <td style="padding:10px 14px;background:${light};font-size:10pt;font-family:${font};border:1px solid ${bdr};width:28%">${STATUS_MAP[a.status]?.label || "—"}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;background:${navy};color:white;font-size:9pt;font-family:${font};font-weight:600;border:1px solid ${navy}">Assessors</td>
      <td style="padding:10px 14px;background:white;font-size:10pt;font-family:${font};border:1px solid ${bdr}">${(a.assessors || []).join(", ") || "—"}</td>
      <td style="padding:10px 14px;background:${navy};color:white;font-size:9pt;font-family:${font};font-weight:600;border:1px solid ${navy}">Readiness</td>
      <td style="padding:10px 14px;background:white;font-size:10pt;font-family:${font};border:1px solid ${bdr}">
        <span style="font-weight:700;color:${rdColor}">${rdLabel}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 14px;background:${navy};color:white;font-size:9pt;font-family:${font};font-weight:600;border:1px solid ${navy}">Engagement Type</td>
      <td style="padding:10px 14px;background:${light};font-size:10pt;font-family:${font};border:1px solid ${bdr}">${a.engagementType || "—"}</td>
      <td style="padding:10px 14px;background:${navy};color:white;font-size:9pt;font-family:${font};font-weight:600;border:1px solid ${navy}">Security Checklist</td>
      <td style="padding:10px 14px;background:${light};font-size:10pt;font-family:${font};border:1px solid ${bdr}">
        <span style="color:${pctColor};font-weight:700">${secPct}%</span> complete (${secChecked}/${SECURITY_ITEMS_EN.length})
      </td>
    </tr>
    ${a.hldLink ? `<tr>
      <td style="padding:10px 14px;background:${navy};color:white;font-size:9pt;font-family:${font};font-weight:600;border:1px solid ${navy}">HLD Document</td>
      <td colspan="3" style="padding:10px 14px;background:white;font-size:10pt;font-family:${font};border:1px solid ${bdr}"><a href="${a.hldLink}" style="color:${indigo}">${a.hldLink}</a></td>
    </tr>` : ""}
  </table>

  ${(a.scope || []).length ? `
  <div style="margin-bottom:24px">
    <div style="font-size:9pt;font-weight:700;color:${mid};letter-spacing:0.1em;text-transform:uppercase;font-family:${font};margin-bottom:8px">Assessment Scope</div>
    <div>${(a.scope || []).map(sc => pill(sc, indigo+"18", indigo, indigo+"33")).join("")}</div>
  </div>` : ""}

  <div style="margin-top:auto;border-top:1px solid ${bdr};padding-top:12px;display:flex;justify-content:space-between">
    <span style="font-size:8.5pt;color:${mid};font-family:${font}">CONFIDENTIAL — For internal use only</span>
    <span style="font-size:8.5pt;color:${mid};font-family:${font}">Generated by Mezan AI · ${new Date().toLocaleString()}</span>
  </div>
</div>

<!-- PAGE BREAK -->
<div style="page-break-before:always"></div>

<!-- ══════════════ 1. EXECUTIVE SUMMARY ══════════════ -->
${secH("1.", isAr ? "الملخص التنفيذي" : "Executive Summary & Readiness")}
${a.readiness ? `
<div style="background:${rdColor}10;border:1px solid ${rdColor}35;border-${isAr?"right":"left"}:4px solid ${rdColor};border-radius:7px;padding:14px 16px;margin-bottom:16px">
  <div style="font-size:9pt;font-weight:700;color:${rdColor};letter-spacing:0.1em;text-transform:uppercase;font-family:${font};margin-bottom:5px">Readiness Verdict</div>
  <div style="font-size:15pt;font-weight:700;color:${rdColor};font-family:${font};margin-bottom:${a.readinessJustification?"6px":"0"}">${rdLabel}</div>
  ${a.readinessJustification ? `<div style="font-size:10pt;color:#475569;font-family:${font};line-height:1.6">${a.readinessJustification}</div>` : ""}
</div>` : ""}
${txt(a.summary)}

<!-- ══════════════ 2. GENERAL INFORMATION ══════════════ -->
${secH("2.", isAr ? "المعلومات العامة" : "General Information")}
<table>
  ${row("Vendor / Team", vd, 0)}
  ${row("Assessors", (a.assessors || []).join(", "), 1)}
  ${row("Engagement Type", a.engagementType, 0)}
  ${row("Hosting Environment", a.hostingEnv + (a.hostingEnv === "On-Premises" && a.onPremModel ? " → " + a.onPremModel : ""), 1)}
  ${row("SSO", (a.ssoSupported || "—") + (a.ssoProtocol ? " (" + a.ssoProtocol + ")" : ""), 0)}
  ${row("HLD / Artifacts", a.artifacts, 1)}
</table>

<!-- ══════════════ 3. ASSUMPTIONS & CONSTRAINTS ══════════════ -->
${secH("3.", isAr ? "الافتراضات والقيود" : "Assumptions & Constraints")}
<p style="font-size:9.5pt;font-weight:700;color:${navy};font-family:${font};margin:0 0 6px 0">Assumptions</p>
${txt(a.assumptions)}
<p style="font-size:9.5pt;font-weight:700;color:${navy};font-family:${font};margin:14px 0 6px 0">Constraints</p>
${txt(a.constraints)}

<!-- ══════════════ 4. INFRASTRUCTURE ══════════════ -->
${secH("4.", isAr ? "البنية التحتية" : "Infrastructure")}
<table>
  ${row("Hosting Environment", a.hostingEnv, 0)}
  ${a.onPremModel ? row("On-Premises Model", a.onPremModel, 1) : ""}
  ${row("Scalability & Performance", a.scalability, a.onPremModel ? 0 : 1)}
  ${row("Operational Overhead", a.operationalOverhead, a.onPremModel ? 1 : 0)}
  ${row("Technical Support", a.technicalSupport, a.onPremModel ? 0 : 1)}
  ${row("Training & Adoption", a.training, a.onPremModel ? 1 : 0)}
</table>
${a.deploymentModel ? `<p style="font-size:9.5pt;font-weight:700;color:${navy};font-family:${font};margin:14px 0 6px 0">Deployment Notes</p>${txt(a.deploymentModel)}` : ""}

<!-- ══════════════ 5. OBSERVABILITY ══════════════ -->
${secH("5.", isAr ? "المراقبة والرصد" : "Observability & Monitoring")}
${(a.monitoringCaps || []).length ? `
<div style="margin-bottom:12px">
  <div style="font-size:9pt;font-weight:700;color:${mid};font-family:${font};margin-bottom:6px">Capabilities</div>
  <div>${(a.monitoringCaps || []).map(c => pill(c, "#e0f2fe", "#0369a1", "#bae6fd")).join("")}</div>
</div>` : ""}
<table>
  ${row("Monitoring Platform", a.monitoringTool, 0)}
</table>
${a.observability ? `<p style="font-size:9.5pt;font-weight:700;color:${navy};font-family:${font};margin:12px 0 6px 0">Notes</p>${txt(a.observability)}` : ""}

<!-- ══════════════ 6. INTEGRATION ══════════════ -->
${secH("6.", isAr ? "التكامل" : "Integration")}
${(a.integrationPatterns || []).length ? `
<div style="margin-bottom:12px">
  <div style="font-size:9pt;font-weight:700;color:${mid};font-family:${font};margin-bottom:6px">Integration Patterns</div>
  <div>${(a.integrationPatterns || []).map(p => pill(p, "#f3f4f6", "#374151", "#d1d5db")).join("")}</div>
</div>` : ""}
<table>
  ${row("Complexity", a.integrationComplexity, 0)}
  ${row("SSO Supported", a.ssoSupported, 1)}
  ${a.ssoProtocol ? row("SSO Protocol", a.ssoProtocol, 0) : ""}
</table>
${txt(a.integration)}
${a.ssoNotes ? `<p style="font-size:9.5pt;font-weight:700;color:${navy};font-family:${font};margin:12px 0 6px 0">SSO Notes</p>${txt(a.ssoNotes)}` : ""}

<!-- ══════════════ 7. DATA & COMPLIANCE ══════════════ -->
${secH("7.", isAr ? "البيانات والامتثال" : "Data & Compliance")}
${(a.complianceFrameworks || []).length ? `
<div style="margin-bottom:12px">
  <div style="font-size:9pt;font-weight:700;color:${mid};font-family:${font};margin-bottom:6px">Applicable Frameworks</div>
  <div>${(a.complianceFrameworks || []).map(f => pill(f, "#dcfce7", "#15803d", "#86efac")).join("")}</div>
</div>` : ""}
${txt(a.regulatory)}
${a.migrationRequired ? `
<table style="margin-bottom:12px">
  ${row("Migration Required", a.migrationRequired, 0)}
</table>
${a.migrationRequired === "Yes" ? txt(a.dataMigration) : ""}` : ""}

<!-- ══════════════ 8. SECURITY CHECKLIST ══════════════ -->
${secH("8.", isAr ? "قائمة مراجعة الأمان" : "Security Checklist")}
<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
  <div style="flex:1;height:9px;background:#e2e8f0;border-radius:5px;overflow:hidden">
    <div style="width:${secPct}%;height:100%;background:${pctColor};border-radius:5px"></div>
  </div>
  <span style="font-size:10pt;font-weight:700;color:${pctColor};font-family:${font};white-space:nowrap">${secPct}% · ${secChecked}/${SECURITY_ITEMS_EN.length}</span>
</div>
<table>
  <thead>
    <tr style="background:${navy}">
      <th style="padding:8px 10px;text-align:${isAr?"right":"left"};font-size:9.5pt;font-family:${font};color:white;border:1px solid ${navy}">Security Control</th>
      <th style="padding:8px 10px;text-align:center;font-size:9.5pt;font-family:${font};color:white;border:1px solid ${navy};width:80px">Status</th>
    </tr>
  </thead>
  <tbody>${secRows}</tbody>
</table>
${a.securityNotes ? `<p style="font-size:9.5pt;font-weight:700;color:${navy};font-family:${font};margin:12px 0 6px 0">Security Notes</p>${txt(a.securityNotes)}` : ""}

<!-- ══════════════ 9. RISK REGISTER ══════════════ -->
${risksHtml}

<!-- ══════════════ 10. EXIT STRATEGY ══════════════ -->
${secH("10.", isAr ? "استراتيجية الخروج" : "Exit Strategy & Exportability")}
<table>
  ${row("Exit Readiness", EXIT_READINESS[a.exitReadiness]?.label || a.exitReadiness, 0)}
  ${row("Data Portability", a.dataPortability, 1)}
  ${row("Vendor Lock-in Risk", a.vendorLockIn, 0)}
  ${row("Contractual Exit Terms", a.contractualExit, 1)}
  ${row("Decommission / Migration-Out Plan", a.decommissionPlan, 0)}
  ${row("Export Formats Available", a.exportFormatsList, 1)}
</table>

<!-- ══════════════ 11. PoC RECOMMENDATION ══════════════ -->
${secH("11.", isAr ? "توصية PoC" : "PoC Recommendation")}
<table style="margin-bottom:12px">
  ${row("PoC Required", a.pocRequired, 0)}
</table>
${a.pocRecommendation ? `<p style="font-size:9.5pt;font-weight:700;color:${navy};font-family:${font};margin:0 0 6px 0">Recommendation</p>${txt(a.pocRecommendation)}` : ""}
${a.pocRemarks ? `<p style="font-size:9.5pt;font-weight:700;color:${navy};font-family:${font};margin:14px 0 6px 0">Remarks & Observations</p>${txt(a.pocRemarks)}` : ""}

<!-- DOCUMENT FOOTER -->
<div style="margin-top:48px;border-top:2px solid ${navy};padding-top:14px;display:flex;justify-content:space-between;align-items:center">
  <div style="display:flex;align-items:center;gap:8px">
    <div style="width:22px;height:22px;background:linear-gradient(135deg,${indigo},#a78bfa);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:white;font-family:${font}">M</div>
    <span style="font-size:9.5pt;color:${mid};font-family:${font};font-weight:600">Mezan AI</span>
  </div>
  <span style="font-size:8.5pt;color:${mid};font-family:${font}">Generated ${new Date().toLocaleString()} · CONFIDENTIAL</span>
</div>

</body></html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement("a");
  a2.href = url;
  a2.download = `MezanAI-${(a.name || "assessment").replace(/\s+/g, "-")}-${a.date || new Date().toISOString().split("T")[0]}.doc`;
  a2.click();
  URL.revokeObjectURL(url);
};
