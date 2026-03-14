import { Z } from '../lib/styles';

export const makeFields = (g) => {
  const FI = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div style={g.fg}>
      {label && <label style={g.lbl}>{label}</label>}
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={g.inp}
        onFocus={e => e.target.style.borderColor = "#6366f1"}
        onBlur={e => e.target.style.borderColor = Z.border} />
    </div>
  );

  const FTA = ({ label, value, onChange, placeholder, rows = 4, hint }) => (
    <div style={g.fg}>
      {label && <label style={g.lbl}>{label}</label>}
      {hint && <div style={g.hint}>{hint}</div>}
      <textarea value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows} style={g.txa}
        onFocus={e => e.target.style.borderColor = "#6366f1"}
        onBlur={e => e.target.style.borderColor = Z.border} />
    </div>
  );

  const FSel = ({ label, value, onChange, options, placeholder }) => (
    <div style={g.fg}>
      {label && <label style={g.lbl}>{label}</label>}
      <select value={value || ""} onChange={e => onChange(e.target.value)} style={g.sel}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const Pills = ({ label, values = [], options, onChange, color = "#6366f1" }) => (
    <div style={g.fg}>
      {label && <label style={g.lbl}>{label}</label>}
      <div style={g.pills}>
        {options.map(o => (
          <button key={o} style={g.pill(values.includes(o), color)}
            onClick={() => onChange(values.includes(o) ? values.filter(x => x !== o) : [...values, o])}>{o}</button>
        ))}
      </div>
    </div>
  );

  const PillSingle = ({ label, value, options, optionLabels, onChange, color = "#6366f1" }) => (
    <div style={g.fg}>
      {label && <label style={g.lbl}>{label}</label>}
      <div style={g.pills}>
        {options.map((o, i) => (
          <button key={o} style={g.pill(value === o, color)} onClick={() => onChange(value === o ? "" : o)}>
            {optionLabels ? optionLabels[i] : o}</button>
        ))}
      </div>
    </div>
  );

  return { FI, FTA, FSel, Pills, PillSingle };
};
