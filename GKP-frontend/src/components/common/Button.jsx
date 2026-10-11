const variants = {
  primary:
    'bg-[#5B528D] text-white hover:bg-[#4a4275] focus:ring-[#5B528D]',
  secondary:
    'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  outline:
    'border border-rose-600 text-rose-600 hover:bg-rose-50 focus:ring-rose-500',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
