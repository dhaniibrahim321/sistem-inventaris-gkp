export default function Card({ children, title, className = '' }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}
    >
      {title && (
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
