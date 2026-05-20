export function FormInput({ label, name, type = 'text', value = '', onChange, placeholder }) {
  return (
    <div className="flex flex-col">
      <label className="fc-label truncate" title={label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="fc-input print:border-none print:bg-transparent print:p-0 print:font-medium print:text-slate-800"
      />
    </div>
  );
}

export function FormSelect({ label, name, value = '', onChange, options }) {
  return (
    <div className="flex flex-col w-full">
      <label className="fc-label truncate" title={label}>{label}</label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        className="fc-input print:appearance-none print:border-none print:bg-transparent print:p-0 print:font-medium print:text-slate-800"
      >
        <option value="">Sel...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

export function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col justify-end">
      <span className="fc-label truncate" title={label}>{label}</span>
      <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 h-[40px] flex items-center justify-center font-mono text-sm print:border-none print:bg-transparent print:p-0 print:justify-start print:font-medium print:text-slate-800">
        {value || '-'}
      </div>
    </div>
  );
}
