import { useState } from 'react';
import { deriveIssues } from '../lib/logic';
import { SECTIONS_DEF } from '../lib/constants';

export const HealthPanel = ({ a, onNavigate, rtl }) => {
  const [open, setOpen] = useState(false);
  const issues = deriveIssues(a);
  const errors = issues.filter(i => i.sev === "error");
  const warnings = issues.filter(i => i.sev === "warning");
  const infos = issues.filter(i => i.sev === "info");
  const total = issues.length;

  if (total === 0) return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
      background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)",
      borderRadius: 7, marginBottom: 16, flexDirection: rtl ? "row-reverse" : "row"
    }}>
      <span style={{ fontSize: 13, color: "#10b981" }}>✓</span>
      <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>No issues detected across all sections</span>
    </div>
  );

  return (
    <div style={{ marginBottom: 16, border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 13px",
        background: "rgba(239,68,68,0.06)", cursor: "pointer", flexDirection: rtl ? "row-reverse" : "row"
      }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 12, color: "#ef4444" }}>⚠</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", flex: 1, textAlign: rtl ? "right" : "left" }}>
          Assessment Health — {total} issue{total !== 1 ? "s" : ""} detected
        </span>
        {errors.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.15)", padding: "1px 6px", borderRadius: 3 }}>{errors.length} error{errors.length !== 1 ? "s" : ""}</span>}
        {warnings.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "1px 6px", borderRadius: 3 }}>{warnings.length} warning{warnings.length !== 1 ? "s" : ""}</span>}
        {infos.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: "#818cf8", background: "rgba(99,102,241,0.15)", padding: "1px 6px", borderRadius: 3 }}>{infos.length} note{infos.length !== 1 ? "s" : ""}</span>}
        <span style={{ fontSize: 10, color: "#4a5568", marginLeft: rtl ? "0" : "auto", marginRight: rtl ? "auto" : "0" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "10px 13px", background: "rgba(0,0,0,0.15)", maxHeight: 280, overflowY: "auto" }}>
          {[...errors, ...warnings, ...infos].map((iss, i) => {
            const col = iss.sev === "error" ? "#ef4444" : iss.sev === "warning" ? "#f59e0b" : "#818cf8";
            const icon = iss.sev === "error" ? "⛔" : iss.sev === "warning" ? "⚠" : "ℹ";
            const sectionLabel = SECTIONS_DEF.find(s => s.id === iss.section)?.labelKey;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 5,
                cursor: "pointer", flexDirection: rtl ? "row-reverse" : "row"
              }} onClick={() => { onNavigate(iss.section); setOpen(false); }}>
                <span style={{ fontSize: 10, color: col, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, color: col, lineHeight: 1.4, textAlign: rtl ? "right" : "left", display: "block" }}>{iss.msg}</span>
                  <span style={{ fontSize: 9, color: "#4a5568", fontStyle: "italic" }}>→ {sectionLabel || iss.section}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
