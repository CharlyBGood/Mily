export function MilyLogo({ className = "w-32 h-auto max-w-full object-contain" }: { className?: string }) {
  return (
    <img
      src="https://res.cloudinary.com/dr8pwzxzn/image/upload/v1752506646/MiliFinalFinalFinalFinal_pkdza3.svg"
      alt="Mily Logo"
      className={className}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    />
  )
}

export default MilyLogo
