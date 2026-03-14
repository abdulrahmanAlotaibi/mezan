import { useState, useEffect, useCallback } from 'react';
import { T } from '../lib/i18n';
import {
  uid, fmtDate,
  STATUSES, STATUS_MAP, READINESS, RISK_SEVERITY, EXIT_READINESS,
  SECURITY_ITEMS_EN, SECURITY_ITEMS_AR, SECURITY_HINTS,
  VENDOR_OPTIONS, ASSESSOR_OPTIONS, SECTIONS_DEF,
  emptyAssessment, loadData, persistData,
} from '../lib/constants';
import { exportToWord } from '../lib/logic';
import { Alert } from './Alert';
import { HealthPanel } from './HealthPanel';
import { FI, FTA, FSel, Pills, PillSingle } from './Fields';

// ─── tiny style tokens ───────────────────────────────────────────────────────
const C = {
  bg: '#09090d', bg2: '#0c0e15', bg3: '#131720',
  border: '#14161f', border2: '#1d2235',
  text: '#e2e8f0', mid: '#4a5568', dim: '#23293a',
  accent: '#6366f1',
  mono: "'DM Mono','Fira Code',monospace",
  ar: "'Tajawal',Tahoma,Arial,sans-serif",
};

const s = {
  inp: { width: '100%', padding: '8px 11px', background: C.bg2, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  txa: { width: '100%', padding: '9px 11px', background: C.bg2, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.8, transition: 'border-color 0.15s' },
  sel: { width: '100%', padding: '8px 11px', background: C.bg2, border: '1px solid ' + C.border, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', appearance: 'none', boxSizing: 'border-box', cursor: 'pointer' },
  btn: (v = 'gh') => {
    const m = { primary: { bg: C.accent, br: C.accent, col: 'white' }, danger: { bg: 'rgba(239,68,68,0.08)', br: 'rgba(239,68,68,0.25)', col: '#ef4444' }, gh: { bg: C.bg3, br: C.border2, col: '#8892a0' } };
    const t = m[v] || m.gh;
    return { padding: '6px 12px', background: t.bg, border: '1px solid ' + t.br, borderRadius: 7, color: t.col, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', whiteSpace: 'nowrap' };
  },
  lbl: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#2e3a4a', textTransform: 'uppercase', display: 'block', marginBottom: 5 },
  fg: { marginBottom: 16 },
  pill: (on, col = C.accent) => ({ padding: '4px 11px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: `1px solid ${on ? col : C.border2}`, background: on ? col + '20' : 'transparent', color: on ? col : '#2e3a4a', transition: 'all 0.15s', fontFamily: 'inherit' }),
  card: { background: C.bg2, border: '1px solid ' + C.border, borderRadius: 9, padding: 13, marginBottom: 10 },
  divider: { borderTop: '1px solid ' + C.border, margin: '18px 0' },
  tag: (sid) => {
    const m = { in_progress: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' }, finalized: { color: '#10B981', bg: 'rgba(16,185,129,0.12)' }, go_to_poc: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)' } };
    const t = m[sid] || {};
    return { display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: t.color, background: t.bg };
  },
};

const focusBorder = (e) => { e.target.style.borderColor = C.accent; };
const blurBorder  = (e) => { e.target.style.borderColor = C.border; };

// ─── Field helpers (stable, no re-mounting) ──────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={s.fg}>
      {label && <label style={s.lbl}>{label}</label>}
      {children}
    </div>
  );
}

function Inp({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <Field label={label}>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={s.inp} onFocus={focusBorder} onBlur={blurBorder} />
    </Field>
  );
}

function Txa({ label, value, onChange, placeholder, rows = 4, hint }) {
  return (
    <Field label={label}>
      {hint && <div style={{ fontSize: 10, color: C.dim, marginBottom: 5, lineHeight: 1.5 }}>{hint}</div>}
      <textarea value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows} style={s.txa} onFocus={focusBorder} onBlur={blurBorder} />
    </Field>
  );
}

function Sel({ label, value, onChange, options, placeholder }) {
  return (
    <Field label={label}>
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={s.sel}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function PillsGroup({ label, values = [], options, onChange, color = C.accent }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {options.map(o => (
          <button key={o} style={s.pill(values.includes(o), color)}
            onClick={() => onChange(values.includes(o) ? values.filter(x => x !== o) : [...values, o])}>
            {o}
          </button>
        ))}
      </div>
    </Field>
  );
}

function PillOne({ label, value, options, onChange, color = C.accent }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {options.map(o => (
          <button key={o} style={s.pill(value === o, color)}
            onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </button>
        ))}
      </div>
    </Field>
  );
}

function G2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>{children}</div>;
}

// ─── Section: General ────────────────────────────────────────────────────────
function SectionGeneral({ a, upd, t }) {
  const vendorDisplay = a.vendor === '— Internal Team —' || a.vendor === 'Other (specify below)' ? a.vendorCustom : a.vendor;
  return (
    <div>
      <G2>
        <Inp label={t.solutionName} value={a.name} onChange={v => upd('name', v)} placeholder="e.g. ServiceNow ITSM" />
        <Inp label={t.assessmentDate} value={a.date} onChange={v => upd('date', v)} type="date" />
      </G2>
      <Field label={t.vendorTeam}>
        <select value={a.vendor || ''} onChange={e => upd('vendor', e.target.value)} style={s.sel}>
          <option value="">— Select vendor or team —</option>
          {VENDOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      {(a.vendor === '— Internal Team —' || a.vendor === 'Other (specify below)') && (
        <Inp label="Specify" value={a.vendorCustom} onChange={v => upd('vendorCustom', v)} placeholder="Enter vendor or team name" />
      )}
      <PillsGroup label={t.assessorsRoles} values={a.assessors || []} options={ASSESSOR_OPTIONS} onChange={v => upd('assessors', v)} />
      <Inp label={t.hldArtifacts} value={a.artifacts} onChange={v => upd('artifacts', v)} placeholder="Confluence page, SharePoint link, or Jira epic" />
      <PillsGroup label={t.assessmentScope}
        values={a.scope || []}
        options={['Architecture Review', 'Security Assessment', 'Cost Analysis', 'Integration Assessment', 'Data Assessment', 'Compliance Review', 'PoC Evaluation']}
        onChange={v => upd('scope', v)} />
      <G2>
        <Sel label={t.engagementType} value={a.engagementType} onChange={v => upd('engagementType', v)}
          options={['New Solution Evaluation', 'Replacement / Migration', 'Upgrade / Version Change', 'Integration Project', 'PoC Validation', 'Post-Implementation Review']}
          placeholder="— Select —" />
        <Field label="Status">
          <select value={a.status || 'in_progress'} onChange={e => upd('status', e.target.value)} style={s.sel}>
            {STATUSES.map(s2 => <option key={s2.id} value={s2.id}>{s2.label}</option>)}
          </select>
        </Field>
      </G2>
      {a.status === 'go_to_poc' && (
        <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 8, padding: '12px 13px', marginBottom: 18 }}>
          <div style={s.lbl}>{t.pocApproved}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={a.hldLink || ''} onChange={e => upd('hldLink', e.target.value)}
              placeholder="https://..." style={{ ...s.inp, flex: 1 }} onFocus={focusBorder} onBlur={blurBorder} />
            {a.hldLink && (
              <a href={a.hldLink} target="_blank" rel="noreferrer"
                style={{ ...s.btn(), textDecoration: 'none', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)' }}>
                {t.openHld}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Summary ────────────────────────────────────────────────────────
function SectionSummary({ a, upd, t }) {
  return (
    <div>
      <Txa label="Executive Summary" value={a.summary} onChange={v => upd('summary', v)}
        placeholder="Describe the solution, its purpose, and key architectural highlights..." rows={5} />
      <Field label="Readiness Verdict">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(READINESS).map(([k, r]) => (
            <button key={k} style={{ ...s.pill(a.readiness === k, r.color), padding: '6px 14px', fontSize: 12 }}
              onClick={() => upd('readiness', a.readiness === k ? '' : k)}>
              {r.label}
            </button>
          ))}
        </div>
      </Field>
      {a.readiness && (
        <Txa label="Justification" value={a.readinessJustification}
          onChange={v => upd('readinessJustification', v)}
          placeholder="Explain the readiness decision..." rows={3} />
      )}
    </div>
  );
}

// ─── Section: Assumptions ────────────────────────────────────────────────────
function SectionAssumptions({ a, upd, t }) {
  return (
    <div>
      <Alert type="info" title="Assumptions vs Constraints">
        Assumptions are things believed to be true at the time of assessment. Constraints are fixed limitations that cannot be changed.
      </Alert>
      <Txa label="Assumptions" value={a.assumptions} onChange={v => upd('assumptions', v)}
        placeholder="• Vendor provides 24/7 support&#10;• Cloud hosting approved by IT Security&#10;• Budget confirmed for Year 1" rows={6} />
      <Txa label="Constraints" value={a.constraints} onChange={v => upd('constraints', v)}
        placeholder="• Must integrate with existing AD/LDAP&#10;• Data must remain in KSA&#10;• Go-live before Q4" rows={4} />
    </div>
  );
}

// ─── Section: Infrastructure ─────────────────────────────────────────────────
function SectionInfrastructure({ a, upd, t }) {
  return (
    <div>
      <PillOne label={t.hostingEnv} value={a.hostingEnv}
        options={['SaaS — Deployed via Vendor', 'Cloud — Self-Managed (IaaS/PaaS)', 'Hybrid', 'On-Premises']}
        onChange={v => upd('hostingEnv', v)} />
      {a.hostingEnv === 'On-Premises' && (
        <PillOne label={t.onPremDeployment} value={a.onPremModel}
          options={['Bare Metal', 'Virtual Machines (VMware/HyperV)', 'Containers (Docker)', 'Kubernetes (K8s)', 'OpenShift']}
          onChange={v => upd('onPremModel', v)} />
      )}
      <Txa label={t.deploymentDetails} value={a.deploymentModel} onChange={v => upd('deploymentModel', v)}
        placeholder="CI/CD pipeline, deployment strategy, DR setup, environment topology..." rows={4} />
      <div style={s.divider} />
      <Txa label={t.scalabilityPerf} value={a.scalability} onChange={v => upd('scalability', v)}
        placeholder="Auto-scaling capabilities, expected concurrent users, SLA targets..." rows={3} />
      <Txa label={t.operationalOverhead} value={a.operationalOverhead} onChange={v => upd('operationalOverhead', v)}
        placeholder="Maintenance windows, patching cadence, ops team requirements..." rows={3} />
      <G2>
        <Txa label={t.technicalSupport} value={a.technicalSupport} onChange={v => upd('technicalSupport', v)}
          placeholder="Support tiers, SLA, escalation path..." rows={3} />
        <Txa label={t.trainingAdoption} value={a.training} onChange={v => upd('training', v)}
          placeholder="Training plan, onboarding approach, documentation..." rows={3} />
      </G2>
    </div>
  );
}

// ─── Section: Observability ──────────────────────────────────────────────────
function SectionObservability({ a, upd, t }) {
  return (
    <div>
      <PillsGroup label={t.monitoringCaps}
        values={a.monitoringCaps || []}
        options={['Logs', 'Metrics', 'Traces', 'Alerting', 'Dashboards', 'APM', 'Health Checks', 'Audit Trail', 'SIEM Integration']}
        onChange={v => upd('monitoringCaps', v)} />
      <Sel label={t.monitoringPlatform} value={a.monitoringTool} onChange={v => upd('monitoringTool', v)}
        options={['Datadog', 'Dynatrace', 'Splunk', 'Grafana + Prometheus', 'Azure Monitor', 'AWS CloudWatch', 'Google Cloud Ops', 'ELK Stack', 'New Relic', 'AppDynamics', 'Custom / In-house', 'None']}
        placeholder="— Select platform —" />
      <Txa label={t.observabilityNotes} value={a.observability} onChange={v => upd('observability', v)}
        placeholder="Describe monitoring setup, alerting thresholds, on-call process, log retention policy..." rows={4} />
    </div>
  );
}

// ─── Section: Integration ────────────────────────────────────────────────────
function SectionIntegration({ a, upd, t }) {
  return (
    <div>
      <PillsGroup label={t.integrationPatterns}
        values={a.integrationPatterns || []}
        options={['REST API', 'GraphQL', 'SOAP / Web Services', 'Event-Driven / Kafka', 'Webhooks', 'File Transfer (SFTP/S3)', 'Database Sync', 'iPaaS (MuleSoft/Boomi)', 'SDK / Library', 'Batch ETL']}
        onChange={v => upd('integrationPatterns', v)} />
      <PillOne label={t.integrationComplexity} value={a.integrationComplexity}
        options={['Low — Minimal', 'Medium — Moderate', 'High — Complex', 'Critical — Mission-Critical']}
        onChange={v => upd('integrationComplexity', v)}
        color={a.integrationComplexity?.includes('Critical') ? '#ef4444' : a.integrationComplexity?.includes('High') ? '#f59e0b' : C.accent} />
      <Txa label={t.integrationDetails} value={a.integration} onChange={v => upd('integration', v)}
        placeholder="Systems to integrate, data flows, transformation requirements, API versioning strategy..." rows={4} />
      <div style={s.divider} />
      <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', marginBottom: 10 }}>{t.ssoIntegration}</div>
      <PillOne label={t.ssoSupported} value={a.ssoSupported}
        options={['Yes — Fully Supported', 'Partial — With Limitations', 'Planned — Roadmap', 'No — Not Supported']}
        onChange={v => upd('ssoSupported', v)}
        color={a.ssoSupported === 'No — Not Supported' ? '#ef4444' : C.accent} />
      {a.ssoSupported && a.ssoSupported !== 'No — Not Supported' && (
        <PillOne label={t.ssoProtocol} value={a.ssoProtocol}
          options={['SAML 2.0', 'OIDC / OAuth 2.0', 'LDAP / AD', 'Kerberos', 'Custom']}
          onChange={v => upd('ssoProtocol', v)} />
      )}
      <Txa label={t.ssoNotes} value={a.ssoNotes} onChange={v => upd('ssoNotes', v)}
        placeholder="Identity provider details, attribute mapping, group sync, provisioning approach..." rows={3} />
    </div>
  );
}

// ─── Section: Data ───────────────────────────────────────────────────────────
function SectionData({ a, upd, t }) {
  return (
    <div>
      <PillsGroup label={t.regulatoryCompliance}
        values={a.complianceFrameworks || []}
        options={['SAMA', 'NCA', 'PDPL', 'GDPR', 'HIPAA', 'PCI-DSS', 'ISO 27001', 'SOC 2', 'NIST CSF', 'CIS Controls']}
        onChange={v => upd('complianceFrameworks', v)} color="#10b981" />
      <Txa label={t.complianceNotes} value={a.regulatory} onChange={v => upd('regulatory', v)}
        placeholder="Residency requirements, audit obligations, data classification..." rows={3} />
      <div style={s.divider} />
      <PillOne label={t.migrationRequired} value={a.migrationRequired}
        options={['Yes', 'No', 'TBD']} onChange={v => upd('migrationRequired', v)} />
      {a.migrationRequired === 'Yes' && (
        <Txa label={t.migrationDetails} value={a.dataMigration} onChange={v => upd('dataMigration', v)}
          placeholder="Migration scope, volumes, tooling, rollback strategy, cutover plan..." rows={4} />
      )}
    </div>
  );
}

// ─── Section: Security ───────────────────────────────────────────────────────
function SectionSecurity({ a, upd, t, rtl }) {
  const items = rtl ? SECURITY_ITEMS_AR : SECURITY_ITEMS_EN;
  const checked = SECURITY_ITEMS_EN.filter(k => a.security?.[k]).length;
  const pct = Math.round(checked / SECURITY_ITEMS_EN.length * 100);
  const pctColor = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <Alert type="verify" title={t.verifyAll}>
        {pct}% complete — {checked}/{SECURITY_ITEMS_EN.length} items checked
      </Alert>
      <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 16 }}>
        <div style={{ width: pct + '%', height: '100%', background: pctColor, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      {SECURITY_ITEMS_EN.map((key, i) => {
        const on = !!(a.security?.[key]);
        return (
          <div key={key}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 6, marginBottom: 4, cursor: 'pointer', background: on ? 'rgba(99,102,241,0.06)' : 'transparent', border: on ? '1px solid rgba(99,102,241,0.18)' : '1px solid transparent', transition: 'all 0.12s' }}
            onClick={() => upd('security', { ...(a.security || {}), [key]: !on })}>
            <div style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 2, background: on ? C.accent : 'transparent', border: on ? '1px solid ' + C.accent : '1px solid #23293a', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              {on && <span style={{ fontSize: 9, color: 'white', fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: on ? C.text : C.mid, lineHeight: 1.4 }}>{items[i]}</div>
              <div style={{ fontSize: 10, color: '#2e3a4a', marginTop: 2, lineHeight: 1.4 }}>{SECURITY_HINTS[i]}</div>
            </div>
          </div>
        );
      })}
      <div style={s.divider} />
      <Txa label={t.securityNotes} value={a.securityNotes} onChange={v => upd('securityNotes', v)}
        placeholder="Additional security observations, gaps identified, action items..." rows={4} />
    </div>
  );
}

// ─── Section: Risks ──────────────────────────────────────────────────────────
function SectionRisks({ a, upd, t }) {
  const risks = a.risks || [];

  const addRisk = () => upd('risks', [...risks, { id: uid(), title: '', severity: 'medium', category: '', description: '', mitigation: '' }]);
  const removeRisk = (id) => upd('risks', risks.filter(r => r.id !== id));
  const updateRisk = (id, field, val) => upd('risks', risks.map(r => r.id === id ? { ...r, [field]: val } : r));

  return (
    <div>
      {risks.length === 0 && (
        <Alert type="info" title={t.noRisks} compact />
      )}
      {risks.map((r, i) => (
        <div key={r.id} style={{ ...s.card, border: `1px solid ${RISK_SEVERITY[r.severity]?.color}22` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.mid, flex: 1 }}>RISK #{i + 1}</span>
            {r.severity && (
              <span style={{ fontSize: 10, fontWeight: 700, color: RISK_SEVERITY[r.severity]?.color, background: RISK_SEVERITY[r.severity]?.color + '18', padding: '2px 7px', borderRadius: 4 }}>
                {RISK_SEVERITY[r.severity]?.label}
              </span>
            )}
            <button style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid ' + C.border, borderRadius: 5, color: '#2e3a4a', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}
              onClick={() => removeRisk(r.id)}>✕</button>
          </div>
          <G2>
            <Field label={t.riskTitle}>
              <input value={r.title || ''} onChange={e => updateRisk(r.id, 'title', e.target.value)}
                placeholder="e.g. Vendor Lock-in" style={s.inp} onFocus={focusBorder} onBlur={blurBorder} />
            </Field>
            <Field label={t.category}>
              <select value={r.category || ''} onChange={e => updateRisk(r.id, 'category', e.target.value)} style={s.sel}>
                <option value="">— Category —</option>
                {['Security', 'Integration', 'Compliance', 'Operational', 'Financial', 'Vendor', 'Data', 'Performance'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </G2>
          <Field label="Severity">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(RISK_SEVERITY).map(([k, v]) => (
                <button key={k} style={s.pill(r.severity === k, v.color)} onClick={() => updateRisk(r.id, 'severity', k)}>{v.label}</button>
              ))}
            </div>
          </Field>
          <Field label={t.description}>
            <textarea value={r.description || ''} onChange={e => updateRisk(r.id, 'description', e.target.value)}
              placeholder="Describe the risk and its potential impact..." rows={2} style={s.txa} onFocus={focusBorder} onBlur={blurBorder} />
          </Field>
          <Field label={t.mitigation}>
            <textarea value={r.mitigation || ''} onChange={e => updateRisk(r.id, 'mitigation', e.target.value)}
              placeholder="Mitigation strategy and owner..." rows={2} style={s.txa} onFocus={focusBorder} onBlur={blurBorder} />
          </Field>
        </div>
      ))}
      <button style={s.btn()} onClick={addRisk}>{t.addRisk}</button>
    </div>
  );
}

// ─── Section: Exit Strategy ──────────────────────────────────────────────────
function SectionExit({ a, upd, t }) {
  return (
    <div>
      <Alert type="info" title={t.exitDesc} compact />
      <Field label={t.exitReadiness}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(EXIT_READINESS).map(([k, v]) => (
            <button key={k} style={{ ...s.pill(a.exitReadiness === k, v.color), padding: '6px 14px', fontSize: 12 }}
              onClick={() => upd('exitReadiness', a.exitReadiness === k ? '' : k)}>
              {v.label}
            </button>
          ))}
        </div>
      </Field>
      <Txa label={t.dataPortability} value={a.dataPortability} onChange={v => upd('dataPortability', v)}
        placeholder="Supported export formats, data schema access, migration tooling..." rows={3} />
      <Txa label={t.vendorLockIn} value={a.vendorLockIn} onChange={v => upd('vendorLockIn', v)}
        placeholder="Proprietary components, API lock-in, data portability limitations..." rows={3} />
      <G2>
        <Txa label={t.contractualExit} value={a.contractualExit} onChange={v => upd('contractualExit', v)}
          placeholder="Notice period, data return SLA, termination rights..." rows={3} />
        <Txa label={t.decommissionPlan} value={a.decommissionPlan} onChange={v => upd('decommissionPlan', v)}
          placeholder="Steps to decommission, data wipe, cutover to replacement..." rows={3} />
      </G2>
      <Inp label={t.exportFormatsList} value={a.exportFormatsList} onChange={v => upd('exportFormatsList', v)}
        placeholder="CSV, JSON, XML, PDF, SQL dump..." />
    </div>
  );
}

// ─── Section: PoC ────────────────────────────────────────────────────────────
function SectionPoC({ a, upd, t }) {
  return (
    <div>
      <PillOne label={t.pocRequired} value={a.pocRequired}
        options={['Yes — Mandatory', 'Yes — Recommended', 'No — Not Required', 'Already Completed']}
        onChange={v => upd('pocRequired', v)} />
      {a.pocRequired?.includes('Yes') && (
        <Txa label={t.recommendation} value={a.pocRecommendation} onChange={v => upd('pocRecommendation', v)}
          placeholder="Scope, success criteria, timeline, stakeholders, measurable outcomes..." rows={5} />
      )}
      {a.pocRequired === 'Already Completed' && (
        <Alert type="success" title="PoC Completed — include results and link to HLD" compact />
      )}
      <Txa label={t.remarksObservations} value={a.pocRemarks} onChange={v => upd('pocRemarks', v)}
        placeholder="Overall observations, open questions, follow-up actions, stakeholder feedback..." rows={4} />
    </div>
  );
}

// ─── Section router ──────────────────────────────────────────────────────────
const SECTION_COMPONENTS = {
  general:        SectionGeneral,
  summary:        SectionSummary,
  assumptions:    SectionAssumptions,
  infrastructure: SectionInfrastructure,
  observability:  SectionObservability,
  integration:    SectionIntegration,
  data:           SectionData,
  security:       SectionSecurity,
  risks:          SectionRisks,
  exit:           SectionExit,
  poc:            SectionPoC,
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TechAssess() {
  const [data, setData] = useState({ assessments: [], groups: [] });
  const [activeId, setActiveId] = useState(null);
  const [section, setSection] = useState('general');
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState('en');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rtl = lang === 'ar';
  const t = T[lang];
  const font = rtl ? C.ar : C.mono;

  useEffect(() => { setData(loadData()); }, []);

  const persist = useCallback((next) => {
    setData(next);
    persistData(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const active = data.assessments.find(a => a.id === activeId) || null;

  const upd = useCallback((field, value) => {
    if (!activeId) return;
    setData(prev => {
      const next = {
        ...prev,
        assessments: prev.assessments.map(a =>
          a.id === activeId ? { ...a, [field]: value, updatedAt: new Date().toISOString() } : a
        ),
      };
      persistData(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [activeId]);

  const newAssessment = () => {
    const a = emptyAssessment();
    const next = { ...data, assessments: [a, ...data.assessments] };
    persist(next);
    setActiveId(a.id);
    setSection('general');
  };

  const deleteAssessment = () => {
    const next = { ...data, assessments: data.assessments.filter(a => a.id !== activeId) };
    persist(next);
    setActiveId(null);
    setConfirmDelete(false);
  };

  const filtered = data.assessments.filter(a =>
    !search || (a.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const SectionComp = SECTION_COMPONENTS[section] || SectionGeneral;
  const sectionDef = SECTIONS_DEF.find(s2 => s2.id === section);

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, fontFamily: font, color: C.text, overflow: 'hidden', direction: rtl ? 'rtl' : 'ltr' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div style={{ width: 250, minWidth: 250, background: C.bg, borderRight: rtl ? 'none' : '1px solid ' + C.border, borderLeft: rtl ? '1px solid ' + C.border : 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '15px 12px 10px', borderBottom: '1px solid ' + C.border }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#6366f1,#a78bfa)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: 'white', flexShrink: 0 }}>T</div>
            {t.appName}
          </div>
          <button style={{ ...s.btn(), width: '100%', marginTop: 10, justifyContent: 'center', color: C.accent, fontWeight: 600 }} onClick={newAssessment}>
            {t.newAssessment}
          </button>
        </div>
        <div style={{ padding: '7px 12px 4px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            style={{ width: '100%', padding: '6px 9px', background: C.bg2, border: '1px solid ' + C.border, borderRadius: 6, color: C.mid, fontSize: 11, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 7px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: C.dim, textTransform: 'uppercase', padding: '7px 7px 3px' }}>
            {t.assessmentsLocal}
          </div>
          {filtered.length === 0 && (
            <div style={{ fontSize: 11, color: C.dim, padding: '8px 7px' }}>{t.noAssessments}</div>
          )}
          {filtered.map(a => {
            const on = a.id === activeId;
            const st = STATUS_MAP[a.status];
            return (
              <div key={a.id}
                style={{ padding: '7px 9px', borderRadius: 6, cursor: 'pointer', marginBottom: 1, background: on ? C.bg3 : 'transparent', border: on ? '1px solid ' + C.border2 : '1px solid transparent', transition: 'all 0.1s' }}
                onClick={() => { setActiveId(a.id); setSection('general'); }}>
                <div style={{ fontSize: 12, color: on ? C.text : C.mid, fontWeight: on ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name || '(Untitled)'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: st?.dot || C.dim, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: C.dim }}>{fmtDate(a.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '6px 12px 10px', borderTop: '1px solid ' + C.border, display: 'flex', gap: 6 }}>
          <button style={s.btn()} onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {lang === 'en' ? t.rtlToggle : t.ltrToggle}
          </button>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ height: 50, borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 9, flexShrink: 0, background: C.bg, flexDirection: rtl ? 'row-reverse' : 'row' }}>
          {active ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {active.name || '(Untitled)'}
              </span>
              <span style={s.tag(active.status)}>{STATUS_MAP[active.status]?.label}</span>
              {active.readiness && (
                <span style={{ fontSize: 10, fontWeight: 700, color: READINESS[active.readiness]?.color, background: READINESS[active.readiness]?.color + '18', padding: '2px 7px', borderRadius: 4 }}>
                  {READINESS[active.readiness]?.label}
                </span>
              )}
              {saved && <span style={{ fontSize: 10, color: '#10b981' }}>{t.saved}</span>}
              <button style={s.btn()} onClick={() => exportToWord(active, lang)}>{t.exportDoc}</button>
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: 11, color: '#ef4444' }}>{t.deleteAssessment}</span>
                  <button style={s.btn('danger')} onClick={deleteAssessment}>Yes, delete</button>
                  <button style={s.btn()} onClick={() => setConfirmDelete(false)}>Cancel</button>
                </>
              ) : (
                <button style={s.btn('danger')} onClick={() => setConfirmDelete(true)}>✕</button>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, color: C.mid }}>{t.noAssessmentOpen}</span>
          )}
        </div>

        {!active ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontSize: 28, color: C.dim }}>◈</div>
            <div style={{ fontSize: 13, color: C.mid, fontWeight: 600 }}>{t.noAssessmentOpen}</div>
            <div style={{ fontSize: 11, color: C.dim, maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>{t.createOrSelect}</div>
            <button style={{ ...s.btn('primary'), marginTop: 8, padding: '9px 18px', fontSize: 12 }} onClick={newAssessment}>{t.newAssessment}</button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: rtl ? 'row-reverse' : 'row' }}>

            {/* Section nav */}
            <div style={{ width: 188, minWidth: 188, borderRight: rtl ? 'none' : '1px solid ' + C.border, borderLeft: rtl ? '1px solid ' + C.border : 'none', display: 'flex', flexDirection: 'column', background: '#07080c', overflowY: 'auto' }}>
              <div style={{ flex: 1, padding: '12px 7px 6px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#1a1e2a', textTransform: 'uppercase', padding: '0 7px 6px' }}>{t.sections}</div>
                {SECTIONS_DEF.map(sec => {
                  const on = section === sec.id;
                  return (
                    <div key={sec.id}
                      style={{ padding: '6px 9px', borderRadius: 5, cursor: 'pointer', marginBottom: 1, background: on ? C.bg3 : 'transparent', color: on ? C.text : '#2e3a4a', fontSize: 11, display: 'flex', alignItems: 'center', gap: 7, border: on ? '1px solid ' + C.border2 : '1px solid transparent', transition: 'all 0.1s', flexDirection: rtl ? 'row-reverse' : 'row' }}
                      onClick={() => setSection(sec.id)}>
                      <span style={{ fontSize: 11, opacity: 0.7, width: 13, textAlign: 'center', flexShrink: 0 }}>{sec.icon}</span>
                      {t[sec.labelKey]}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 30px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{sectionDef?.icon}</span>
                <span>{t[sectionDef?.labelKey]}</span>
              </div>
              <HealthPanel a={active} onNavigate={setSection} rtl={rtl} />
              <SectionComp a={active} upd={upd} t={t} rtl={rtl} lang={lang} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
