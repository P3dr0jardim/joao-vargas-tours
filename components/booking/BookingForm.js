'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/navigation'
import { whatsappLink } from '@/config/site'
import ButtonLink from '@/components/ui/ButtonLink'
import { WhatsAppIcon } from '@/components/ui/icons'
import { Field, Stepper, controlClass } from '@/components/booking/fields'
import {
  buildPayload,
  errorMessageKeys,
  fieldVisibility,
  FIELD_ORDER,
  groupServices,
  interpretResponse,
  LIMITS,
  maxDate,
  minDate,
  newKey,
  nextRouteValues,
  parseServiceParam,
  routePrefill,
  todayInMadeira,
  validateBooking,
} from '@/components/booking/booking-helpers'

const ENDPOINT = '/api/booking-requests'

/**
 * Booking request form.
 * `services`: [{ slug, type, title, maxAdults, prefill: { pickup, dropoff } }] for the select.
 * `summaries`: { [slug]: ReactNode } server-rendered summary cards, one per service.
 */
export default function BookingForm({ services, summaries }) {
  const t = useTranslations('Booking')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialService = parseServiceParam(searchParams.get('service'), services)
  const initialPrefill = routePrefill(services.find((s) => s.slug === initialService))

  // Created once when the form mounts and reused on every retry, so the server can de-duplicate.
  const [meta] = useState(() => ({ formStartedAt: Date.now(), idempotencyKey: newKey() }))
  const [now, setNow] = useState(() => new Date())
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null)
  const [focusTick, setFocusTick] = useState(0)
  const noticeRef = useRef(null)
  const summaryRef = useRef(null)
  const prefillRef = useRef(initialPrefill)

  // Resolver validates by hand with the same codes as the API (no extra packages).
  const resolver = (values) => {
    const service = services.find((s) => s.slug === values.service)
    const codes = validateBooking(values, service, now)
    const errors = Object.fromEntries(Object.entries(codes).map(([k, type]) => [k, { type }]))
    return { values: Object.keys(errors).length ? {} : values, errors }
  }

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    control,
    formState: { errors, submitCount },
  } = useForm({
    resolver,
    shouldFocusError: false,
    defaultValues: {
      service: initialService,
      date: '',
      time: '',
      adults: 2,
      children: 0,
      infants: 0,
      pickup: initialPrefill.pickup,
      dropoff: initialPrefill.dropoff,
      flightNumber: '',
      luggage: '',
      notes: '',
      name: '',
      email: '',
      phone: '',
      consent: false,
      bot_trap_field: '',
    },
  })

  const values = useWatch({ control })
  const service = services.find((s) => s.slug === values.service)
  const visible = fieldVisibility(service)
  const capacity = service?.maxAdults ?? 8
  const overCapacity = Number(values.adults || 0) + Number(values.children || 0) > capacity

  // Fill pickup/drop-off from the chosen service, keeping anything the customer typed.
  useEffect(() => {
    const next = routePrefill(service)
    const updates = nextRouteValues(getValues(), prefillRef.current, next)
    for (const [field, value] of Object.entries(updates)) setValue(field, value)
    prefillRef.current = next
  }, [service, getValues, setValue])

  // Move focus to the error summary (role=alert, links to each field) after a failed submit.
  useEffect(() => {
    if (focusTick > 0) summaryRef.current?.focus()
  }, [focusTick])

  // Refresh min/max dates if the tab stays open past midnight in Madeira.
  useEffect(() => {
    const id = setInterval(() => {
      setNow((prev) => {
        const next = new Date()
        return todayInMadeira(next) === todayInMadeira(prev) ? prev : next
      })
    }, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (notice) noticeRef.current?.focus()
  }, [notice])

  /** Translated message for a field error (field-specific, then code, then generic). */
  const message = (field) => {
    const error = errors[field]
    if (!error) return undefined
    const key = errorMessageKeys(field, error.type).find((k) => t.has(k))
    return t(key ?? 'errors.generic', { max: field === 'adults' ? capacity : LIMITS.maxChildren })
  }

  const step = (name, next) =>
    setValue(name, next, { shouldDirty: true, shouldValidate: submitCount > 0 })

  /** Move focus into the control (works for select, date, time, stepper inputs and checkbox). */
  const focusField = (event, field) => {
    const el = document.getElementById(`field-${field}`)
    if (!el) return
    event.preventDefault()
    el.focus()
    el.scrollIntoView({ block: 'center' })
  }

  const fieldLabel = (field) => t(`fields.${field}.label`)

  async function onSubmit(data) {
    if (sending) return
    setNotice(null)
    setSending(true)
    const selected = services.find((s) => s.slug === data.service)
    const payload = buildPayload(data, selected, { ...meta, locale })

    let outcome
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => null)
      outcome = interpretResponse(res.status, body)
    } catch {
      outcome = { kind: 'network' }
    }

    if (outcome.kind === 'success') {
      // Keep the form locked (sending stays true) while navigating away.
      router.push(`/book/thank-you?ref=${encodeURIComponent(outcome.ref)}`)
      return
    }

    setSending(false)
    if (outcome.kind === 'fieldErrors') {
      const known = Object.entries(outcome.errors).filter(([field]) => FIELD_ORDER.includes(field))
      for (const [field, type] of known) setError(field, { type })
      // Errors on fields we do not show: fall back to a generic notice.
      if (known.length === 0) setNotice({ kind: 'error' })
      else setFocusTick((n) => n + 1)
      return
    }
    if (outcome.kind === 'deliveryFailed') {
      const text = t('notice.whatsappMessage', {
        service: selected?.title ?? '',
        date: data.date,
        passengers: Number(data.adults) + Number(data.children || 0),
        name: data.name.trim(),
      })
      setNotice({ kind: 'deliveryFailed', whatsappUrl: outcome.whatsappUrl || whatsappLink(text) })
      return
    }
    setNotice({ kind: outcome.kind })
  }

  const errorFields = Object.keys(errors)
  const showSummary = submitCount > 0 && errorFields.length > 0

  const textInput = (name, extra = {}) => ({
    className: controlClass(Boolean(errors[name])),
    ...extra,
  })

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
      <aside
        aria-labelledby="summary-title"
        className="rounded-3xl border border-sky-300 bg-sky-50 p-6 lg:sticky lg:top-24 lg:order-2"
      >
        <h2 id="summary-title" className="mb-4 !text-xl">
          {t('summary.title')}
        </h2>
        {service ? (
          <div aria-live="polite">{summaries[service.slug]}</div>
        ) : (
          <p>{t('summary.empty')}</p>
        )}
        <p className="mt-4 border-t border-sky-300 pt-4 text-sm">{t('requestNote')}</p>
      </aside>

      <form
        onSubmit={handleSubmit(onSubmit, () => setFocusTick((n) => n + 1))}
        noValidate
        className="space-y-10 lg:order-1"
      >
        {showSummary && (
          <div
            ref={summaryRef}
            role="alert"
            tabIndex={-1}
            className="rounded-2xl border-2 border-red-700 bg-white p-5"
          >
            <p className="font-semibold text-red-700">{t('summary.errorsTitle')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {FIELD_ORDER.filter((f) => errorFields.includes(f)).map((field) => (
                <li key={field}>
                  <a
                    href={`#field-${field}`}
                    onClick={(event) => focusField(event, field)}
                    className="font-semibold text-red-700 underline"
                  >
                    {fieldLabel(field)}
                  </a>
                  : {message(field)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {notice && (
          <div
            ref={noticeRef}
            role="alert"
            tabIndex={-1}
            className="space-y-4 rounded-2xl border-2 border-red-700 bg-white p-5"
          >
            <p>{t(`notice.${notice.kind}`)}</p>
            {(notice.kind === 'deliveryFailed' ||
              notice.kind === 'forbidden' ||
              notice.kind === 'error') && (
              <ButtonLink
                href={notice.whatsappUrl || whatsappLink()}
                variant="outline"
                aria-label={t('notice.whatsappAria')}
              >
                <WhatsAppIcon />
                {t('notice.whatsappButton')}
              </ButtonLink>
            )}
          </div>
        )}

        <fieldset className="space-y-6">
          <legend className="mb-2 font-heading text-2xl font-semibold text-blue-800">
            {t('sections.trip')}
          </legend>

          <Field name="service" label={fieldLabel('service')} error={message('service')}>
            {(aria) => (
              <select {...aria} {...register('service')} {...textInput('service')}>
                <option value="">{t('fields.service.placeholder')}</option>
                {groupServices(services).map((group) => (
                  <optgroup key={group.type} label={t(`fields.service.groups.${group.type}`)}>
                    {group.items.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              name="date"
              label={fieldLabel('date')}
              hint={t('fields.date.hint')}
              error={message('date')}
            >
              {(aria) => (
                <input
                  type="date"
                  min={minDate(now)}
                  max={maxDate(now)}
                  {...aria}
                  {...register('date')}
                  {...textInput('date')}
                />
              )}
            </Field>
            <Field
              name="time"
              label={fieldLabel('time')}
              optionalText={t('optional')}
              hint={t('fields.time.hint')}
              error={message('time')}
            >
              {(aria) => (
                <input type="time" {...aria} {...register('time')} {...textInput('time')} />
              )}
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-6">
          <legend className="mb-2 font-heading text-2xl font-semibold text-blue-800">
            {t('sections.group')}
          </legend>
          <div className="grid gap-6 sm:grid-cols-3">
            <Stepper
              name="adults"
              label={fieldLabel('adults')}
              value={values.adults}
              min={1}
              max={capacity}
              error={message('adults')}
              register={register}
              onStep={step}
              decreaseLabel={t('fields.adults.decrease')}
              increaseLabel={t('fields.adults.increase')}
            />
            <Stepper
              name="children"
              label={fieldLabel('children')}
              value={values.children}
              min={0}
              max={LIMITS.maxChildren}
              error={message('children')}
              register={register}
              onStep={step}
              decreaseLabel={t('fields.children.decrease')}
              increaseLabel={t('fields.children.increase')}
            />
            <Stepper
              name="infants"
              label={fieldLabel('infants')}
              value={values.infants}
              min={0}
              max={LIMITS.maxInfants}
              error={message('infants')}
              register={register}
              onStep={step}
              decreaseLabel={t('fields.infants.decrease')}
              increaseLabel={t('fields.infants.increase')}
            />
          </div>
          <p className="text-sm" aria-live="polite">
            {overCapacity
              ? t('capacityOver', { count: capacity })
              : t('capacityHint', { count: capacity })}
          </p>
        </fieldset>

        {visible.route && (
          <fieldset className="space-y-6">
            <legend className="mb-2 font-heading text-2xl font-semibold text-blue-800">
              {t('sections.route')}
            </legend>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                name="pickup"
                label={fieldLabel('pickup')}
                optionalText={t('optional')}
                hint={t('fields.pickup.hint')}
                error={message('pickup')}
              >
                {(aria) => (
                  <input
                    type="text"
                    autoComplete="off"
                    {...aria}
                    {...register('pickup')}
                    {...textInput('pickup')}
                  />
                )}
              </Field>
              <Field
                name="dropoff"
                label={fieldLabel('dropoff')}
                optionalText={visible.dropoffRequired ? undefined : t('optional')}
                hint={t('fields.dropoff.hint')}
                error={message('dropoff')}
              >
                {(aria) => (
                  <input
                    type="text"
                    autoComplete="off"
                    required={visible.dropoffRequired}
                    {...aria}
                    {...register('dropoff')}
                    {...textInput('dropoff')}
                  />
                )}
              </Field>
            </div>
            {visible.flight && (
              <Field
                name="flightNumber"
                label={fieldLabel('flightNumber')}
                optionalText={t('optional')}
                hint={t('fields.flightNumber.hint')}
                error={message('flightNumber')}
                className="sm:max-w-xs"
              >
                {(aria) => (
                  <input
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    {...aria}
                    {...register('flightNumber')}
                    {...textInput('flightNumber')}
                  />
                )}
              </Field>
            )}
          </fieldset>
        )}

        <fieldset className="space-y-6">
          <legend className="mb-2 font-heading text-2xl font-semibold text-blue-800">
            {t('sections.extras')}
          </legend>
          <Field
            name="luggage"
            label={fieldLabel('luggage')}
            optionalText={t('optional')}
            hint={t('fields.luggage.hint')}
            error={message('luggage')}
          >
            {(aria) => (
              <input type="text" {...aria} {...register('luggage')} {...textInput('luggage')} />
            )}
          </Field>
          <Field
            name="notes"
            label={fieldLabel('notes')}
            optionalText={t('optional')}
            hint={t('fields.notes.hint')}
            error={message('notes')}
          >
            {(aria) => (
              <textarea rows={4} {...aria} {...register('notes')} {...textInput('notes')} />
            )}
          </Field>
        </fieldset>

        <fieldset className="space-y-6">
          <legend className="mb-2 font-heading text-2xl font-semibold text-blue-800">
            {t('sections.contact')}
          </legend>
          <Field name="name" label={fieldLabel('name')} error={message('name')}>
            {(aria) => (
              <input
                type="text"
                autoComplete="name"
                {...aria}
                {...register('name')}
                {...textInput('name')}
              />
            )}
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field name="email" label={fieldLabel('email')} error={message('email')}>
              {(aria) => (
                <input
                  type="email"
                  autoComplete="email"
                  {...aria}
                  {...register('email')}
                  {...textInput('email')}
                />
              )}
            </Field>
            <Field
              name="phone"
              label={fieldLabel('phone')}
              hint={t('fields.phone.hint')}
              error={message('phone')}
            >
              {(aria) => (
                <input
                  type="tel"
                  autoComplete="tel"
                  {...aria}
                  {...register('phone')}
                  {...textInput('phone')}
                />
              )}
            </Field>
          </div>

          {/* Honeypot: invisible to people and assistive tech, bots fill it in. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="field-bot-trap">{t('honeypotLabel')}</label>
            <input
              id="field-bot-trap"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              {...register('bot_trap_field')}
            />
          </div>

          <div>
            <div className="flex items-start gap-3">
              <input
                id="field-consent"
                type="checkbox"
                className="mt-1 h-6 w-6 shrink-0 accent-blue-600"
                aria-invalid={errors.consent ? 'true' : undefined}
                aria-describedby={errors.consent ? 'field-consent-error' : undefined}
                {...register('consent')}
              />
              <label htmlFor="field-consent" className="py-1">
                {t.rich('consent', {
                  link: (chunks) => (
                    <Link href="/privacy" className="font-semibold text-blue-800 underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </label>
            </div>
            {errors.consent && (
              <p id="field-consent-error" className="mt-2 text-sm font-semibold text-red-700">
                {message('consent')}
              </p>
            )}
          </div>
        </fieldset>

        <div className="space-y-3">
          <button
            type="submit"
            aria-disabled={sending}
            onClick={(event) => {
              if (sending) event.preventDefault()
            }}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-800 aria-disabled:cursor-wait aria-disabled:opacity-70 sm:w-auto"
          >
            {sending ? t('submitting') : t('submit')}
          </button>
          <p role="status" aria-live="polite" className="sr-only">
            {sending ? t('submitting') : ''}
          </p>
          <p className="text-sm">{t('requestNote')}</p>
        </div>
      </form>
    </div>
  )
}
