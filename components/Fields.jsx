import { Z } from '../lib/styles';

export const FI = ({ label, value, onChange, placeholder, type = "text", style }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {label && <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#2e3a4a", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>}
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "8px 11px", background: "#0c0e15", border: "1px solid #14161f", borderRadius: 7, color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
      onFocus={e => e.target.style.borderColor = "#6366f1"}
      onBlur={e => e.target.style.borderColor = "#14161f"}
    />
  </div>
);

export const FTA = ({ label, value, onChange, placeholder, rows = 4, hint, style }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {label && <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#2e3a4a", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>}
    {hint && <div style={{ fontSize: 10, color: "#1a1e2a", marginBottom: 5, lineHeight: 1.5 }}>{hint}</div>}
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ width: "100%", padding: "9px 11px", background: "#0c0e15", border: "1px solid #14161f", borderRadius: 7, color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.8, transition: "border-color 0.15s" }}
      onFocus={e => e.target.style.borderColor = "#6366f1"}
      onBlur={e => e.target.style.borderColor = "#14161f"}
    />
  </div>
);

export const FSel = ({ label, value, onChange, options, placeholder, style }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {label && <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#2e3a4a", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>}
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 11px", background: "#0c0e15", border: "1px solid #14161f", borderRadius: 7, color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", outline: "none", appearance: "none", boxSizing: "border-box", cursor: "pointer" }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export const Pills = ({ label, values = [], options, onChange, color = "#6366f1", style }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {label && <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#2e3a4a", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {options.map(o => (
        <button
          key={o}
          style={{ padding: "4px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: `1px solid ${values.includes(o) ? color : "#1d2235"}`, background: values.includes(o) ? color + "20" : "transparent", color: values.includes(o) ? color : "#2e3a4a", transition: "all 0.15s", fontFamily: "inherit" }}
          onClick={() => onChange(values.includes(o) ? values.filter(x => x !== o) : [...values, o])}
        >{o}</button>
      ))}
    </div>
  </div>
);

export const PillSingle = ({ label, value, options, optionLabels, onChange, color = "#6366f1", style }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {label && <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#2e3a4a", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {options.map((o, i) => (
        <button
          key={o}
          style={{ padding: "4px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: `1px solid ${value === o ? color : "#1d2235"}`, background: value === o ? color + "20" : "transparent", color: value === o ? color : "#2e3a4a", transition: "all 0.15s", fontFamily: "inherit" }}
          onClick={() => onChange(value === o ? "" : o)}
        >{optionLabels ? optionLabels[i] : o}</button>
      ))}
    </div>
  </div>
);
