export function ExplanationBlock({ title, text, accent }) {
  return (
    <div className="rounded-lg bg-slate-800/70 p-3">
      <h4 className={`mb-1 text-sm font-bold ${accent}`}>{title}</h4>
      <p className="text-sm leading-relaxed text-slate-200">{text}</p>
    </div>
  );
}
