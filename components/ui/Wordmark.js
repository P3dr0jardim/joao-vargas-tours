/** Text logo until a real logo exists. The yellow bar nods to the taxi roof sign. */
export default function Wordmark({ light = false }) {
  const main = light ? 'text-white' : 'text-blue-800'
  const sub = light ? 'text-sky-300' : 'text-blue-600'
  return (
    <span className="inline-flex items-center gap-2.5 font-heading leading-none">
      <span aria-hidden="true" className="h-7 w-1.5 rounded-full bg-sun-400" />
      <span className="flex flex-col gap-0.5">
        <span className={`text-lg font-bold tracking-tight ${main}`}>João Vargas</span>
        <span className={`text-sm font-medium tracking-wide ${sub}`}>Tours</span>
      </span>
    </span>
  )
}
