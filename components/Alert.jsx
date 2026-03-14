import { ALERT } from '../lib/styles';

export const Alert = ({ type = "info", title, items, children, compact = false, rtl = false }) => {
  const s = ALERT[type] || ALERT.info;
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 7,
      padding: compact ? "7px 11px" : "10px 13px", marginBottom: 10,
      borderLeft: rtl ? "none" : `3px solid ${s.color}`,
      borderRight: rtl ? `3px solid ${s.color}` : "none"
    }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: s.color, marginBottom: items || children ? 5 : 0,
          display: "flex", alignItems: "center", gap: 6, flexDirection: rtl ? "row-reverse" : "row"
        }}>
          <span>{s.icon}</span> <span>{title}</span>
        </div>
      )}
      {items && items.map((item, i) => (
        <div key={i} style={{
          fontSize: 11, color: s.color, opacity: 0.9, lineHeight: 1.5,
          display: "flex", gap: 6, marginBottom: i < items.length - 1 ? 3 : 0,
          flexDirection: rtl ? "row-reverse" : "row", textAlign: rtl ? "right" : "left"
        }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>·</span><span>{item}</span>
        </div>
      ))}
      {children && <div style={{ fontSize: 11, color: s.color, opacity: 0.9, lineHeight: 1.6, textAlign: rtl ? "right" : "left" }}>{children}</div>}
    </div>
  );
};
