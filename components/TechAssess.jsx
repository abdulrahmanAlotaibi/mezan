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

const MOBILE_BREAKPOINT = 768;

function useWindowSize() {
  const [size, setSize] = useState([1024, 768]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setSize([window.innerWidth, window.innerHeight]);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const DARK = {
  bg:      '#09090d', bg2: '#0c0e15', bg3: '#131720',
  border:  '#1a1a1a', border2: '#2a2a2a',
  text:    '#e2e8f0', mid: '#4a5568',  dim: '#2a2a2a',
  accent:  '#ffffff', accentFg: '#000000',
  navBg:   '#07080c', navText: '#3a3a3a', navOn: '#e2e8f0',
  sbBg:    '#09090d',
  inputBg: '#0c0e15', inputText: '#e2e8f0',
  tbBg:    '#09090d',
  lbl:     '#3a3a3a',
  cardBg:  '#0c0e15',
  pillOff: 'transparent', pillOffText: '#3a3a3a', pillOffBorder: '#2a2a2a',
  chkOff:  '#2a2a2a',
  hlBg:    'rgba(0,0,0,0.15)',
};
const LIGHT = {
  bg:      '#ffffff', bg2: '#f8fafc', bg3: '#f1f5f9',
  border:  '#e2e8f0', border2: '#cbd5e1',
  text:    '#0a0a0a', mid: '#64748b',  dim: '#94a3b8',
  accent:  '#000000', accentFg: '#ffffff',
  navBg:   '#f8fafc', navText: '#94a3b8', navOn: '#0a0a0a',
  sbBg:    '#f1f5f9',
  inputBg: '#ffffff', inputText: '#0a0a0a',
  tbBg:    '#ffffff',
  lbl:     '#64748b',
  cardBg:  '#f8fafc',
  pillOff: '#f1f5f9', pillOffText: '#64748b', pillOffBorder: '#e2e8f0',
  chkOff:  '#e2e8f0',
  hlBg:    'rgba(0,0,0,0.03)',
};

// ─── Style factory (called inside components, recalculates with theme) ─────────
function makeS(C) {
  return {
    inp:  { width:'100%', padding:'8px 11px', background:C.inputBg, border:'1px solid '+C.border, borderRadius:7, color:C.inputText, fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' },
    txa:  { width:'100%', padding:'9px 11px', background:C.inputBg, border:'1px solid '+C.border, borderRadius:7, color:C.inputText, fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box', resize:'vertical', lineHeight:1.8, transition:'border-color 0.15s' },
    sel:  { width:'100%', padding:'8px 11px', background:C.inputBg, border:'1px solid '+C.border, borderRadius:7, color:C.inputText, fontSize:12, fontFamily:'inherit', outline:'none', appearance:'none', boxSizing:'border-box', cursor:'pointer' },
    lbl:  { fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:C.lbl, textTransform:'uppercase', display:'block', marginBottom:5 },
    fg:   { marginBottom:16 },
    card: { background:C.cardBg, border:'1px solid '+C.border, borderRadius:9, padding:13, marginBottom:10 },
    div:  { borderTop:'1px solid '+C.border, margin:'18px 0' },
    pill: (on, col) => {
      const c = col || C.accent;
      return {
        padding:'4px 11px', borderRadius:20, fontSize:11, cursor:'pointer',
        border:`1px solid ${on ? c : C.border2}`,
        background: on ? c : C.pillOff,
        color: on ? (col ? '#ffffff' : C.accentFg) : C.pillOffText,
        transition:'all 0.15s', fontFamily:'inherit',
      };
    },
    btn: (v='gh') => {
      const m = {
        primary: { bg:C.accent, br:C.accent, col:C.accentFg },
        danger:  { bg:'rgba(239,68,68,0.08)', br:'rgba(239,68,68,0.25)', col:'#ef4444' },
        gh:      { bg:C.bg3, br:C.border2, col:C.mid },
      };
      const t = m[v] || m.gh;
      return { padding:'6px 12px', background:t.bg, border:'1px solid '+t.br, borderRadius:7, color:t.col, fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:500, display:'flex', alignItems:'center', gap:5, transition:'all 0.15s', whiteSpace:'nowrap' };
    },
    tag: (sid) => {
      const m = { in_progress:{color:'#F59E0B',bg:'rgba(245,158,11,0.12)'}, finalized:{color:'#10B981',bg:'rgba(16,185,129,0.12)'}, go_to_poc:{color:'#6366F1',bg:'rgba(99,102,241,0.12)'} };
      const t = m[sid]||{};
      return { display:'inline-flex', alignItems:'center', padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:600, color:t.color, background:t.bg };
    },
  };
}

// ─── Field primitives ─────────────────────────────────────────────────────────
function Field({ label, children, s }) {
  return (
    <div style={s.fg}>
      {label && <label style={s.lbl}>{label}</label>}
      {children}
    </div>
  );
}

function Inp({ label, value, onChange, placeholder, type = 'text', s, C }) {
  return (
    <Field label={label} s={s}>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={s.inp}
        onFocus={e => e.target.style.borderColor = C.accent}
        onBlur={e => e.target.style.borderColor = C.border} />
    </Field>
  );
}

function Txa({ label, value, onChange, placeholder, rows = 4, s, C }) {
  return (
    <Field label={label} s={s}>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows} style={s.txa}
        onFocus={e => e.target.style.borderColor = C.accent}
        onBlur={e => e.target.style.borderColor = C.border} />
    </Field>
  );
}

function Sel({ label, value, onChange, options, placeholder, s }) {
  return (
    <Field label={label} s={s}>
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={s.sel}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function PillsGroup({ label, values = [], options, onChange, color, s, C: CC }) {
  const resolvedColor = color || (CC?.accent ?? '#000000');
  return (
    <Field label={label} s={s}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {options.map(o => (
          <button key={o} style={s.pill(values.includes(o), resolvedColor)}
            onClick={() => onChange(values.includes(o) ? values.filter(x => x !== o) : [...values, o])}>
            {o}
          </button>
        ))}
      </div>
    </Field>
  );
}

function PillOne({ label, value, options, onChange, color, s, C: CC }) {
  const resolvedColor = color || (CC?.accent ?? '#000000');
  return (
    <Field label={label} s={s}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {options.map(o => (
          <button key={o} style={s.pill(value === o, resolvedColor)}
            onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </button>
        ))}
      </div>
    </Field>
  );
}

function G2({ children }) {
  return <div className="tech-assess-g2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>{children}</div>;
}

// ─── Sections ─────────────────────────────────────────────────────────────────
function SectionGeneral({ a, upd, t, s, C }) {
  return (
    <div>
      <G2>
        <Inp label={t.solutionName} value={a.name} onChange={v => upd('name', v)} placeholder="e.g. ServiceNow ITSM" s={s} C={C} />
        <Inp label={t.assessmentDate} value={a.date} onChange={v => upd('date', v)} type="date" s={s} C={C} />
      </G2>
      <Field label={t.vendorTeam} s={s}>
        <select value={a.vendor || ''} onChange={e => upd('vendor', e.target.value)} style={s.sel}>
          <option value="">— Select vendor or team —</option>
          {VENDOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      {(a.vendor === '— Internal Team —' || a.vendor === 'Other (specify below)') && (
        <Inp label="Specify" value={a.vendorCustom} onChange={v => upd('vendorCustom', v)} placeholder="Enter vendor or team name" s={s} C={C} />
      )}
      <PillsGroup label={t.assessorsRoles} values={a.assessors || []} options={ASSESSOR_OPTIONS} onChange={v => upd('assessors', v)} s={s} C={C} />
      <Inp label={t.hldArtifacts} value={a.artifacts} onChange={v => upd('artifacts', v)} placeholder="Confluence page, SharePoint link, or Jira epic" s={s} C={C} />
      <PillsGroup label={t.assessmentScope} values={a.scope || []}
        options={['Architecture Review','Security Assessment','Cost Analysis','Integration Assessment','Data Assessment','Compliance Review','PoC Evaluation']}
        onChange={v => upd('scope', v)} s={s} C={C} />
      <G2>
        <Sel label={t.engagementType} value={a.engagementType} onChange={v => upd('engagementType', v)}
          options={['New Solution Evaluation','Replacement / Migration','Upgrade / Version Change','Integration Project','PoC Validation','Post-Implementation Review']}
          placeholder="— Select —" s={s} />
        <Field label="Status" s={s}>
          <select value={a.status || 'in_progress'} onChange={e => upd('status', e.target.value)} style={s.sel}>
            {STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
          </select>
        </Field>
      </G2>
      {a.status === 'go_to_poc' && (
        <div style={{ background:C.bg3, border:'1px solid '+C.border2, borderRadius:8, padding:'12px 13px', marginBottom:18 }}>
          <div style={s.lbl}>{t.pocApproved}</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input value={a.hldLink || ''} onChange={e => upd('hldLink', e.target.value)}
              placeholder="https://..." style={{ ...s.inp, flex:1 }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border} />
            {a.hldLink && (
              <a href={a.hldLink} target="_blank" rel="noreferrer"
                style={{ ...s.btn(), textDecoration:'none' }}>
                {t.openHld}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionSummary({ a, upd, t, s, C }) {
  return (
    <div>
      <Txa label="Executive Summary" value={a.summary} onChange={v => upd('summary', v)}
        placeholder="Describe the solution, its purpose, and key architectural highlights..." rows={5} s={s} C={C} />
      <Field label="Readiness Verdict" s={s}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {Object.entries(READINESS).map(([k, r]) => (
            <button key={k} style={{ ...s.pill(a.readiness === k, r.color), padding:'6px 14px', fontSize:12 }}
              onClick={() => upd('readiness', a.readiness === k ? '' : k)}>
              {r.label}
            </button>
          ))}
        </div>
      </Field>
      {a.readiness && (
        <Txa label="Justification" value={a.readinessJustification}
          onChange={v => upd('readinessJustification', v)}
          placeholder="Explain the readiness decision..." rows={3} s={s} C={C} />
      )}
    </div>
  );
}

function SectionAssumptions({ a, upd, t, s, C }) {
  return (
    <div>
      <Alert type="info" title="Assumptions vs Constraints">
        Assumptions are things believed to be true at the time of assessment. Constraints are fixed limitations that cannot be changed.
      </Alert>
      <Txa label="Assumptions" value={a.assumptions} onChange={v => upd('assumptions', v)}
        placeholder="• Vendor provides 24/7 support&#10;• Cloud hosting approved by IT Security&#10;• Budget confirmed for Year 1" rows={6} s={s} C={C} />
      <Txa label="Constraints" value={a.constraints} onChange={v => upd('constraints', v)}
        placeholder="• Must integrate with existing AD/LDAP&#10;• Data must remain in KSA&#10;• Go-live before Q4" rows={4} s={s} C={C} />
    </div>
  );
}

function SectionInfrastructure({ a, upd, t, s, C }) {
  return (
    <div>
      <PillOne label={t.hostingEnv} value={a.hostingEnv}
        options={['SaaS — Deployed via Vendor','Cloud — Self-Managed (IaaS/PaaS)','Hybrid','On-Premises']}
        onChange={v => upd('hostingEnv', v)} s={s} C={C} />
      {a.hostingEnv === 'On-Premises' && (
        <PillOne label={t.onPremDeployment} value={a.onPremModel}
          options={['Bare Metal','Virtual Machines (VMware/HyperV)','Containers (Docker)','Kubernetes (K8s)','OpenShift']}
          onChange={v => upd('onPremModel', v)} s={s} C={C} />
      )}
      <Txa label={t.deploymentDetails} value={a.deploymentModel} onChange={v => upd('deploymentModel', v)}
        placeholder="CI/CD pipeline, deployment strategy, DR setup, environment topology..." rows={4} s={s} C={C} />
      <div style={s.div} />
      <Txa label={t.scalabilityPerf} value={a.scalability} onChange={v => upd('scalability', v)}
        placeholder="Auto-scaling capabilities, expected concurrent users, SLA targets..." rows={3} s={s} C={C} />
      <Txa label={t.operationalOverhead} value={a.operationalOverhead} onChange={v => upd('operationalOverhead', v)}
        placeholder="Maintenance windows, patching cadence, ops team requirements..." rows={3} s={s} C={C} />
      <G2>
        <Txa label={t.technicalSupport} value={a.technicalSupport} onChange={v => upd('technicalSupport', v)}
          placeholder="Support tiers, SLA, escalation path..." rows={3} s={s} C={C} />
        <Txa label={t.trainingAdoption} value={a.training} onChange={v => upd('training', v)}
          placeholder="Training plan, onboarding approach, documentation..." rows={3} s={s} C={C} />
      </G2>
    </div>
  );
}

function SectionObservability({ a, upd, t, s, C }) {
  return (
    <div>
      <PillsGroup label={t.monitoringCaps} values={a.monitoringCaps || []}
        options={['Logs','Metrics','Traces','Alerting','Dashboards','APM','Health Checks','Audit Trail','SIEM Integration']}
        onChange={v => upd('monitoringCaps', v)} s={s} C={C} />
      <Sel label={t.monitoringPlatform} value={a.monitoringTool} onChange={v => upd('monitoringTool', v)}
        options={['Datadog','Dynatrace','Splunk','Grafana + Prometheus','Azure Monitor','AWS CloudWatch','Google Cloud Ops','ELK Stack','New Relic','AppDynamics','Custom / In-house','None']}
        placeholder="— Select platform —" s={s} />
      <Txa label={t.observabilityNotes} value={a.observability} onChange={v => upd('observability', v)}
        placeholder="Describe monitoring setup, alerting thresholds, on-call process, log retention policy..." rows={4} s={s} C={C} />
    </div>
  );
}

function SectionIntegration({ a, upd, t, s, C }) {
  return (
    <div>
      <PillsGroup label={t.integrationPatterns} values={a.integrationPatterns || []}
        options={['REST API','GraphQL','SOAP / Web Services','Event-Driven / Kafka','Webhooks','File Transfer (SFTP/S3)','Database Sync','iPaaS (MuleSoft/Boomi)','SDK / Library','Batch ETL']}
        onChange={v => upd('integrationPatterns', v)} s={s} C={C} />
      <PillOne label={t.integrationComplexity} value={a.integrationComplexity}
        options={['Low — Minimal','Medium — Moderate','High — Complex','Critical — Mission-Critical']}
        onChange={v => upd('integrationComplexity', v)}
        color={a.integrationComplexity?.includes('Critical') ? '#ef4444' : a.integrationComplexity?.includes('High') ? '#f59e0b' : C.accent}
        s={s} C={C} />
      <Txa label={t.integrationDetails} value={a.integration} onChange={v => upd('integration', v)}
        placeholder="Systems to integrate, data flows, transformation requirements, API versioning strategy..." rows={4} s={s} C={C} />
      <div style={s.div} />
      <div style={{ fontSize:11, fontWeight:700, color:C.mid, marginBottom:10 }}>{t.ssoIntegration}</div>
      <PillOne label={t.ssoSupported} value={a.ssoSupported}
        options={['Yes — Fully Supported','Partial — With Limitations','Planned — Roadmap','No — Not Supported']}
        onChange={v => upd('ssoSupported', v)}
        color={a.ssoSupported === 'No — Not Supported' ? '#ef4444' : C.accent} s={s} C={C} />
      {a.ssoSupported && a.ssoSupported !== 'No — Not Supported' && (
        <PillOne label={t.ssoProtocol} value={a.ssoProtocol}
          options={['SAML 2.0','OIDC / OAuth 2.0','LDAP / AD','Kerberos','Custom']}
          onChange={v => upd('ssoProtocol', v)} s={s} />
      )}
      <Txa label={t.ssoNotes} value={a.ssoNotes} onChange={v => upd('ssoNotes', v)}
        placeholder="Identity provider details, attribute mapping, group sync, provisioning approach..." rows={3} s={s} C={C} />
    </div>
  );
}

function SectionData({ a, upd, t, s, C }) {
  return (
    <div>
      <PillsGroup label={t.regulatoryCompliance} values={a.complianceFrameworks || []}
        options={['SAMA','NCA','PDPL','GDPR','HIPAA','PCI-DSS','ISO 27001','SOC 2','NIST CSF','CIS Controls']}
        onChange={v => upd('complianceFrameworks', v)} color="#10b981" s={s} C={C} />
      <Txa label={t.complianceNotes} value={a.regulatory} onChange={v => upd('regulatory', v)}
        placeholder="Residency requirements, audit obligations, data classification..." rows={3} s={s} C={C} />
      <div style={s.div} />
      <PillOne label={t.migrationRequired} value={a.migrationRequired}
        options={['Yes','No','TBD']} onChange={v => upd('migrationRequired', v)} s={s} C={C} />
      {a.migrationRequired === 'Yes' && (
        <Txa label={t.migrationDetails} value={a.dataMigration} onChange={v => upd('dataMigration', v)}
          placeholder="Migration scope, volumes, tooling, rollback strategy, cutover plan..." rows={4} s={s} C={C} />
      )}
    </div>
  );
}

function SectionSecurity({ a, upd, t, s, C }) {
  const checked = SECURITY_ITEMS_EN.filter(k => a.security?.[k]).length;
  const pct = Math.round(checked / SECURITY_ITEMS_EN.length * 100);
  const pctColor = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <Alert type="verify" title={t.verifyAll}>
        {pct}% complete — {checked}/{SECURITY_ITEMS_EN.length} items checked
      </Alert>
      <div style={{ height:4, background:C.border, borderRadius:2, marginBottom:16 }}>
        <div style={{ width:pct+'%', height:'100%', background:pctColor, borderRadius:2, transition:'width 0.3s' }} />
      </div>
      {SECURITY_ITEMS_EN.map((key, i) => {
        const on = !!(a.security?.[key]);
        return (
          <div key={key}
            style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', borderRadius:6, marginBottom:4, cursor:'pointer', background:on ? C.accent+'12' : 'transparent', border:on ? '1px solid '+C.accent+'40' : '1px solid transparent', transition:'all 0.12s' }}
            onClick={() => upd('security', { ...(a.security || {}), [key]: !on })}>
            <div style={{ width:15, height:15, borderRadius:4, flexShrink:0, marginTop:2, background:on ? C.accent : 'transparent', border:on ? '1px solid '+C.accent : '1px solid '+C.chkOff, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
              {on && <span style={{ fontSize:9, color:'white', fontWeight:700 }}>✓</span>}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, color:on ? C.text : C.mid, lineHeight:1.4 }}>{SECURITY_ITEMS_EN[i]}</div>
              <div style={{ fontSize:10, color:C.dim, marginTop:2, lineHeight:1.4 }}>{SECURITY_HINTS[i]}</div>
            </div>
          </div>
        );
      })}
      <div style={s.div} />
      <Txa label={t.securityNotes} value={a.securityNotes} onChange={v => upd('securityNotes', v)}
        placeholder="Additional security observations, gaps identified, action items..." rows={4} s={s} C={C} />
    </div>
  );
}

function SectionRisks({ a, upd, t, s, C }) {
  const risks = a.risks || [];
  const addRisk = () => upd('risks', [...risks, { id:uid(), title:'', severity:'medium', category:'', description:'', mitigation:'' }]);
  const removeRisk = (id) => upd('risks', risks.filter(r => r.id !== id));
  const updateRisk = (id, field, val) => upd('risks', risks.map(r => r.id === id ? { ...r, [field]:val } : r));
  return (
    <div>
      {risks.length === 0 && <Alert type="info" title={t.noRisks} compact />}
      {risks.map((r, i) => (
        <div key={r.id} style={{ ...s.card, border:`1px solid ${RISK_SEVERITY[r.severity]?.color || C.border}22` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:700, color:C.mid, flex:1 }}>RISK #{i+1}</span>
            {r.severity && (
              <span style={{ fontSize:10, fontWeight:700, color:RISK_SEVERITY[r.severity]?.color, background:RISK_SEVERITY[r.severity]?.color+'18', padding:'2px 7px', borderRadius:4 }}>
                {RISK_SEVERITY[r.severity]?.label}
              </span>
            )}
            <button style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'1px solid '+C.border, borderRadius:5, color:C.mid, cursor:'pointer', fontSize:10, fontFamily:'inherit' }}
              onClick={() => removeRisk(r.id)}>✕</button>
          </div>
          <G2>
            <Field label={t.riskTitle} s={s}>
              <input value={r.title||''} onChange={e => updateRisk(r.id,'title',e.target.value)}
                placeholder="e.g. Vendor Lock-in" style={s.inp}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border} />
            </Field>
            <Field label={t.category} s={s}>
              <select value={r.category||''} onChange={e => updateRisk(r.id,'category',e.target.value)} style={s.sel}>
                <option value="">— Category —</option>
                {['Security','Integration','Compliance','Operational','Financial','Vendor','Data','Performance'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </G2>
          <Field label="Severity" s={s}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {Object.entries(RISK_SEVERITY).map(([k,v]) => (
                <button key={k} style={s.pill(r.severity===k, v.color)} onClick={() => updateRisk(r.id,'severity',k)}>{v.label}</button>
              ))}
            </div>
          </Field>
          <Field label={t.description} s={s}>
            <textarea value={r.description||''} onChange={e => updateRisk(r.id,'description',e.target.value)}
              placeholder="Describe the risk and its potential impact..." rows={2} style={s.txa}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border} />
          </Field>
          <Field label={t.mitigation} s={s}>
            <textarea value={r.mitigation||''} onChange={e => updateRisk(r.id,'mitigation',e.target.value)}
              placeholder="Mitigation strategy and owner..." rows={2} style={s.txa}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border} />
          </Field>
        </div>
      ))}
      <button style={s.btn()} onClick={addRisk}>{t.addRisk}</button>
    </div>
  );
}

function SectionExit({ a, upd, t, s, C }) {
  return (
    <div>
      <Alert type="info" title={t.exitDesc} compact />
      <Field label={t.exitReadiness} s={s}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {Object.entries(EXIT_READINESS).map(([k,v]) => (
            <button key={k} style={{ ...s.pill(a.exitReadiness===k, v.color), padding:'6px 14px', fontSize:12 }}
              onClick={() => upd('exitReadiness', a.exitReadiness===k ? '' : k)}>
              {v.label}
            </button>
          ))}
        </div>
      </Field>
      <Txa label={t.dataPortability} value={a.dataPortability} onChange={v => upd('dataPortability', v)}
        placeholder="Supported export formats, data schema access, migration tooling..." rows={3} s={s} C={C} />
      <Txa label={t.vendorLockIn} value={a.vendorLockIn} onChange={v => upd('vendorLockIn', v)}
        placeholder="Proprietary components, API lock-in, data portability limitations..." rows={3} s={s} C={C} />
      <G2>
        <Txa label={t.contractualExit} value={a.contractualExit} onChange={v => upd('contractualExit', v)}
          placeholder="Notice period, data return SLA, termination rights..." rows={3} s={s} C={C} />
        <Txa label={t.decommissionPlan} value={a.decommissionPlan} onChange={v => upd('decommissionPlan', v)}
          placeholder="Steps to decommission, data wipe, cutover to replacement..." rows={3} s={s} C={C} />
      </G2>
      <Inp label={t.exportFormatsList} value={a.exportFormatsList} onChange={v => upd('exportFormatsList', v)}
        placeholder="CSV, JSON, XML, PDF, SQL dump..." s={s} C={C} />
    </div>
  );
}

function SectionPoC({ a, upd, t, s, C }) {
  return (
    <div>
      <PillOne label={t.pocRequired} value={a.pocRequired}
        options={['Yes — Mandatory','Yes — Recommended','No — Not Required','Already Completed']}
        onChange={v => upd('pocRequired', v)} s={s} />
      {a.pocRequired?.includes('Yes') && (
        <Txa label={t.recommendation} value={a.pocRecommendation} onChange={v => upd('pocRecommendation', v)}
          placeholder="Scope, success criteria, timeline, stakeholders, measurable outcomes..." rows={5} s={s} C={C} />
      )}
      {a.pocRequired === 'Already Completed' && (
        <Alert type="success" title="PoC Completed — include results and link to HLD" compact />
      )}
      <Txa label={t.remarksObservations} value={a.pocRemarks} onChange={v => upd('pocRemarks', v)}
        placeholder="Overall observations, open questions, follow-up actions, stakeholder feedback..." rows={4} s={s} C={C} />
    </div>
  );
}

const SECTION_COMPONENTS = {
  general: SectionGeneral, summary: SectionSummary, assumptions: SectionAssumptions,
  infrastructure: SectionInfrastructure, observability: SectionObservability,
  integration: SectionIntegration, data: SectionData, security: SectionSecurity,
  risks: SectionRisks, exit: SectionExit, poc: SectionPoC,
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TechAssess() {
  const [data, setData]       = useState({ assessments:[], groups:[] });
  const [activeId, setActiveId] = useState(null);
  const [section, setSection]   = useState('general');
  const [search, setSearch]     = useState('');
  const [lang, setLang]         = useState('en');
  const [theme, setTheme]       = useState('dark');
  const [saved, setSaved]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [winW] = useWindowSize();
  const isMobile = winW <= MOBILE_BREAKPOINT;

  const rtl = lang === 'ar';
  const t   = T[lang];
  const C   = theme === 'light' ? LIGHT : DARK;
  const s   = makeS(C);
  const font = rtl ? "'Tajawal',Tahoma,Arial,sans-serif" : "'DM Mono','Fira Code',monospace";

  useEffect(() => {
    setData(loadData());
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ta_theme') : null;
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  const toggleTheme = () => setTheme(prev => {
    const next = prev === 'dark' ? 'light' : 'dark';
    if (typeof localStorage !== 'undefined') localStorage.setItem('ta_theme', next);
    return next;
  });

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
      const next = { ...prev, assessments: prev.assessments.map(a =>
        a.id === activeId ? { ...a, [field]:value, updatedAt:new Date().toISOString() } : a
      )};
      persistData(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [activeId]);

  const newAssessment = () => {
    const a = emptyAssessment();
    const next = { ...data, assessments:[a, ...data.assessments] };
    persist(next);
    setActiveId(a.id);
    setSection('general');
  };

  const deleteAssessment = () => {
    const next = { ...data, assessments: data.assessments.filter(a => a.id !== activeId) };
    persist(next);
    setActiveId(null);
    setConfirmDel(false);
  };

  const filtered = data.assessments.filter(a =>
    !search || (a.name||'').toLowerCase().includes(search.toLowerCase())
  );

  const SectionComp = SECTION_COMPONENTS[section] || SectionGeneral;
  const secDef = SECTIONS_DEF.find(d => d.id === section);

  // Common input style inline
  const searchStyle = {
    width:'100%', padding:'6px 9px', background:C.inputBg,
    border:'1px solid '+C.border, borderRadius:6, color:C.mid,
    fontSize:11, fontFamily:font, outline:'none', boxSizing:'border-box',
  };

  return (
    <div className="tech-assess-root" style={{
      display:'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight:'100vh',
      height: isMobile ? 'auto' : '100vh',
      background:C.bg,
      fontFamily:font,
      color:C.text,
      overflow: isMobile ? 'auto' : 'hidden',
      direction:rtl?'rtl':'ltr',
    }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div
        className="tech-assess-sidebar"
        style={{
          ...(isMobile ? {
            position:'fixed',
            top:0, left: rtl ? 'auto' : 0, right: rtl ? 0 : 'auto',
            width: 260, maxWidth: '85vw',
            height: '100vh',
            zIndex: 1000,
            transform: sidebarOpen ? 'translateX(0)' : (rtl ? 'translateX(100%)' : 'translateX(-100%)'),
            transition: 'transform 0.2s ease',
            boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.3)' : 'none',
          } : {}),
          width: isMobile ? 260 : 252,
          minWidth: isMobile ? undefined : 252,
          background: C.sbBg,
          borderRight: rtl ? 'none' : '1px solid ' + C.border,
          borderLeft: rtl ? '1px solid ' + C.border : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        {/* Logo */}
        <div style={{ padding:'15px 13px 10px', borderBottom:'1px solid '+C.border }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexDirection:rtl?'row-reverse':'row' }}>
            <img src="/logo.svg" alt="Mezan" style={{ width:36, height:36, borderRadius:7, flexShrink:0, display:'block' }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, letterSpacing:'0.01em' }}>Mezan AI</div>
              <div style={{ fontSize:9, color:C.dim, letterSpacing:'0.08em' }}>TECH ASSESSMENT</div>
            </div>
          </div>
          <button style={{ ...s.btn('primary'), width:'100%', justifyContent:'center', fontSize:12 }} onClick={newAssessment}>
            {t.newAssessment}
          </button>
        </div>

        {/* Search */}
        <div style={{ padding:'8px 12px 4px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} style={searchStyle} />
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:'auto', padding:'4px 7px' }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.15em', color:C.dim, textTransform:'uppercase', padding:'7px 7px 3px', textAlign:rtl?'right':'left' }}>
            {t.assessmentsLocal}
          </div>
          {filtered.length === 0 && (
            <div style={{ fontSize:11, color:C.dim, padding:'8px 7px' }}>{t.noAssessments}</div>
          )}
          {filtered.map(a => {
            const on = a.id === activeId;
            const st = STATUS_MAP[a.status];
            return (
              <div key={a.id}
                style={{ padding:'7px 9px', borderRadius:6, cursor:'pointer', marginBottom:1, background:on?C.bg3:'transparent', border:on?'1px solid '+C.border2:'1px solid transparent', transition:'all 0.1s' }}
                onClick={() => { setActiveId(a.id); setSection('general'); if (isMobile) setSidebarOpen(false); }}>
                <div style={{ fontSize:12, color:on?C.text:C.mid, fontWeight:on?600:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:rtl?'right':'left' }}>
                  {a.name || '(Untitled)'}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2, flexDirection:rtl?'row-reverse':'row' }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:st?.dot||C.dim, flexShrink:0 }} />
                  <span style={{ fontSize:9, color:C.dim }}>{fmtDate(a.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer controls */}
        <div style={{ padding:'8px 12px 10px', borderTop:'1px solid '+C.border, display:'flex', gap:6, flexDirection:rtl?'row-reverse':'row' }}>
          {/* Theme toggle */}
          <button style={{ ...s.btn(), flex:1, justifyContent:'center', gap:6 }} onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
          {/* Language toggle */}
          <button style={{ ...s.btn(), flex:1, justifyContent:'center' }} onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {lang === 'en' ? 'ع AR' : 'En'}
          </button>
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:999,
          }}
          onClick={() => setSidebarOpen(false)}
          onKeyDown={e => e.key === 'Enter' && setSidebarOpen(false)}
        />
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div style={{
        flex:1,
        minWidth: isMobile ? 0 : undefined,
        display:'flex',
        flexDirection:'column',
        overflow:'hidden',
      }}>

        {/* Mobile: menu button */}
        {isMobile && (
          <div style={{ borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', padding:'10px 14px', gap:10, background:C.tbBg, flexDirection:rtl?'row-reverse':'row' }}>
            <button style={{ ...s.btn(), padding:'8px 12px', fontSize:18 }} onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
            <span style={{ fontSize:14, fontWeight:600, color:C.text }}>Mezan AI</span>
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          minHeight:50,
          borderBottom:'1px solid '+C.border,
          display:'flex',
          alignItems:'center',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          padding: isMobile ? '10px 14px' : '0 18px',
          gap:9,
          flexShrink:0,
          background:C.tbBg,
          flexDirection:rtl?'row-reverse':'row',
        }}>
          {active ? (
            <>
              <span style={{ fontSize:13, fontWeight:600, color:C.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {active.name || '(Untitled)'}
              </span>
              <span style={s.tag(active.status)}>{STATUS_MAP[active.status]?.label}</span>
              {active.readiness && (
                <span style={{ fontSize:10, fontWeight:700, color:READINESS[active.readiness]?.color, background:READINESS[active.readiness]?.color+'18', padding:'2px 7px', borderRadius:4 }}>
                  {READINESS[active.readiness]?.label}
                </span>
              )}
              {saved && <span style={{ fontSize:10, color:'#10b981' }}>{t.saved}</span>}
              <button style={s.btn()} onClick={() => exportToWord(active, lang)}>{t.exportDoc}</button>
              {confirmDel ? (
                <>
                  <span style={{ fontSize:11, color:'#ef4444' }}>{t.deleteAssessment}</span>
                  <button style={s.btn('danger')} onClick={deleteAssessment}>Yes, delete</button>
                  <button style={s.btn()} onClick={() => setConfirmDel(false)}>Cancel</button>
                </>
              ) : (
                <button style={s.btn('danger')} onClick={() => setConfirmDel(true)}>✕</button>
              )}
            </>
          ) : (
            <span style={{ fontSize:12, color:C.mid }}>{t.noAssessmentOpen}</span>
          )}
        </div>

        {!active ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, background:C.bg }}>
            <img src="/logo.svg" alt="Mezan" style={{ width:52, height:52, borderRadius:13, display:'block' }} />
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Mezan AI</div>
            <div style={{ fontSize:12, color:C.mid, fontWeight:500 }}>{t.noAssessmentOpen}</div>
            <div style={{ fontSize:11, color:C.dim, maxWidth:320, textAlign:'center', lineHeight:1.6 }}>{t.createOrSelect}</div>
            <button style={{ ...s.btn('primary'), marginTop:8, padding:'9px 20px', fontSize:12 }} onClick={newAssessment}>{t.newAssessment}</button>
          </div>
        ) : (
          <div style={{
            flex:1,
            display:'flex',
            flexDirection: isMobile ? 'column' : (rtl?'row-reverse':'row'),
            overflow:'hidden',
            minHeight:0,
          }}>

            {/* Section nav */}
            <div style={{
              ...(isMobile ? {
                flexShrink:0,
                borderBottom:'1px solid '+C.border,
                background:C.navBg,
                overflowX:'auto',
                overflowY:'hidden',
                padding:'8px 12px',
                display:'flex',
                gap:6,
                flexDirection: rtl ? 'row-reverse' : 'row',
                WebkitOverflowScrolling: 'touch',
              } : {
                width:192, minWidth:192,
                borderRight:rtl?'none':'1px solid '+C.border,
                borderLeft:rtl?'1px solid '+C.border:'none',
                display:'flex', flexDirection:'column', background:C.navBg, overflowY:'auto',
              }),
            }}>
              <div style={ isMobile ? { display:'flex', gap:6, flex:1, minWidth:0 } : { flex:1, padding:'12px 7px 6px' } }>
                {!isMobile && <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.15em', color:C.dim, textTransform:'uppercase', padding:'0 7px 6px', textAlign:rtl?'right':'left' }}>{t.sections}</div>}
                {SECTIONS_DEF.map(sec => {
                  const on = section === sec.id;
                  return (
                    <div key={sec.id}
                      style={{
                        ...(isMobile ? { flexShrink:0, whiteSpace: 'nowrap' } : {}),
                        padding: isMobile ? '6px 12px' : '6px 9px',
                        borderRadius:5,
                        cursor:'pointer',
                        marginBottom: isMobile ? 0 : 1,
                        background:on?C.bg3:'transparent',
                        color:on?C.navOn:C.navText,
                        fontSize:11,
                        display:'flex',
                        alignItems:'center',
                        gap:7,
                        border:on?'1px solid '+C.border2:'1px solid transparent',
                        transition:'all 0.1s',
                        flexDirection:rtl?'row-reverse':'row',
                      }}
                      onClick={() => setSection(sec.id)}>
                      <span style={{ fontSize:11, opacity:0.7, width:13, textAlign:'center', flexShrink:0 }}>{sec.icon}</span>
                      {t[sec.labelKey]}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '16px 14px' : '22px 30px', background:C.bg, minHeight:0 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                <span>{secDef?.icon}</span>
                <span>{t[secDef?.labelKey]}</span>
              </div>
              <HealthPanel a={active} onNavigate={setSection} rtl={rtl} theme={theme} C={C} />
              <SectionComp a={active} upd={upd} t={t} s={s} C={C} rtl={rtl} lang={lang} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
