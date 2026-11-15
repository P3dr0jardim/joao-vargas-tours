const tones = {
  white: 'bg-white',
  sky: 'bg-sky-50',
  skyStrong: 'bg-sky-100',
}

/** Page section with consistent spacing and a max content width. */
export default function Section({ id, labelledBy, tone = 'white', className = '', children }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${tones[tone]} py-16 md:py-24`}>
      <div className={`mx-auto max-w-content px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
    </section>
  )
}
