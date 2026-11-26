'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  dangerButton,
  inputClass,
  labelClass,
  outlineButton,
  primaryButton,
  smallButton,
} from '@/components/admin/styles'
import { slugify } from '@/lib/admin/slugify'

const emptyLoc = () => ({ en: '', pt: '' })

const EMPTY = {
  id: '',
  type: 'tour',
  slug: '',
  published: false,
  placeholder: false,
  order: 100,
  title: emptyLoc(),
  seo: { title: emptyLoc(), description: emptyLoc() },
  summary: emptyLoc(),
  body: { en: [], pt: [] },
  duration: emptyLoc(),
  priceFrom: null,
  priceWeekend: null,
  currency: 'EUR',
  pricingModel: 'perVehicle',
  capacity: 6,
  route: { from: emptyLoc(), to: emptyLoc() },
  stops: [],
  includes: [],
  excludes: [],
  faq: [],
  gallery: [{ src: '/images/hero.webp', alt: emptyLoc() }],
  related: [],
}

const ERROR_TEXT = {
  required: 'Campo obrigatório.',
  too_long: 'Texto demasiado longo.',
  too_many: 'Demasiados itens.',
  taken: 'Já existe um serviço com este valor.',
  invalid: 'Valor inválido.',
}

/** Copy of `obj` with the value at a dotted path replaced. */
function setPath(obj, path, value) {
  const keys = path.split('.')
  const next = structuredClone(obj)
  let node = next
  for (const key of keys.slice(0, -1)) node = node[key]
  node[keys.at(-1)] = value
  return next
}

/** Merge a stored service with the defaults, so older records always have every field. */
function withDefaults(initial) {
  if (!initial) return structuredClone(EMPTY)
  const merged = { ...structuredClone(EMPTY), ...structuredClone(initial) }
  for (const key of ['seo', 'route']) merged[key] = { ...EMPTY[key], ...merged[key] }
  for (const [group, fields] of Object.entries({
    seo: ['title', 'description'],
    route: ['from', 'to'],
  })) {
    for (const f of fields) merged[group][f] = { ...emptyLoc(), ...merged[group][f] }
  }
  return merged
}

const paragraphsToText = (list) => (list ?? []).join('\n\n')
const textToParagraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

function Card({ title, description, children }) {
  return (
    <fieldset className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 aria-hidden="true" className="text-xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm">{description}</p>}
      </div>
      {children}
    </fieldset>
  )
}

function FieldError({ error }) {
  if (!error) return null
  return (
    <p className="mt-1 text-sm font-semibold text-red-700">
      {ERROR_TEXT[error] ?? ERROR_TEXT.invalid}
    </p>
  )
}

/** Portuguese and English inputs side by side for one { pt, en } value. */
function LocInput({ label, path, value, onChange, errors, multiline = false, hint }) {
  const Control = multiline ? 'textarea' : 'input'
  return (
    <div>
      <p className={labelClass}>{label}</p>
      {hint && <p className="mb-2 text-sm">{hint}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {['pt', 'en'].map((lang) => (
          <div key={lang}>
            <label
              htmlFor={`${path}.${lang}`}
              className="mb-1 block text-xs font-semibold uppercase text-blue-600"
            >
              {lang === 'pt' ? 'Português' : 'English'}
            </label>
            <Control
              id={`${path}.${lang}`}
              value={value?.[lang] ?? ''}
              onChange={(e) => onChange(`${path}.${lang}`, e.target.value)}
              rows={multiline ? 4 : undefined}
              className={inputClass}
            />
            <FieldError error={errors[`${path}.${lang}`]} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Editable list of { pt, en } rows (stops, includes, excludes). */
function LocList({ label, path, items, onChange, errors }) {
  const update = (next) => onChange(path, next)
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            {['pt', 'en'].map((lang) => (
              <input
                key={lang}
                aria-label={`${label} ${i + 1} (${lang === 'pt' ? 'português' : 'inglês'})`}
                placeholder={lang === 'pt' ? 'Português' : 'English'}
                value={item[lang]}
                onChange={(e) =>
                  update(items.map((it, j) => (j === i ? { ...it, [lang]: e.target.value } : it)))
                }
                className={inputClass}
              />
            ))}
            <button
              type="button"
              className={smallButton}
              onClick={() => update(items.filter((_, j) => j !== i))}
              aria-label={`Remover ${label.toLowerCase()} ${i + 1}`}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
      <FieldError error={errors[path]} />
      <button
        type="button"
        className={`${smallButton} mt-3`}
        onClick={() => update([...items, emptyLoc()])}
      >
        + Adicionar
      </button>
    </div>
  )
}

export default function ServiceEditor({ initial, others = [] }) {
  const router = useRouter()
  const isNew = !initial?._id
  const [service, setService] = useState(() => withDefaults(initial))
  const [bodyText, setBodyText] = useState(() => ({
    pt: paragraphsToText(initial?.body?.pt),
    en: paragraphsToText(initial?.body?.en),
  }))
  // While creating, id and slug follow the English title until edited by hand.
  const [autoKeys, setAutoKeys] = useState(isNew)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ kind: 'idle', message: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const change = (path, value) => {
    setService((prev) => {
      let next = setPath(prev, path, value)
      if (autoKeys && (path === 'title.en' || path === 'type')) {
        const slug = slugify(next.title.en)
        next = { ...next, slug, id: slug ? `${next.type}-${slug}` : '' }
      }
      return next
    })
  }

  const changeKey = (path, value) => {
    setAutoKeys(false)
    change(path, value)
  }

  async function save(event) {
    event.preventDefault()
    setStatus({ kind: 'saving', message: '' })
    setErrors({})
    const payload = {
      ...service,
      body: { pt: textToParagraphs(bodyText.pt), en: textToParagraphs(bodyText.en) },
      priceFrom:
        service.priceFrom === '' || service.priceFrom == null ? null : Number(service.priceFrom),
      priceWeekend:
        service.priceWeekend === '' || service.priceWeekend == null
          ? null
          : Number(service.priceWeekend),
      capacity: Number(service.capacity),
      order: Number(service.order),
    }
    delete payload._id
    delete payload.updatedAt

    const res = await fetch(isNew ? '/api/admin/services' : `/api/admin/services/${initial._id}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null)
    const body = await res?.json().catch(() => ({}))

    if (res?.ok) {
      if (isNew) {
        router.replace(`/admin/services/${body.service._id}`)
        router.refresh()
        return
      }
      setStatus({ kind: 'saved', message: 'Alterações guardadas. O site já está atualizado.' })
      router.refresh()
      return
    }
    if (res?.status === 401) {
      router.replace('/admin/login')
      return
    }
    setErrors(body?.errors ?? {})
    setStatus({
      kind: 'error',
      message: body?.errors
        ? 'Há campos por corrigir. Veja as mensagens a vermelho.'
        : 'Não foi possível guardar. Tente de novo.',
    })
  }

  async function remove() {
    setStatus({ kind: 'saving', message: '' })
    const res = await fetch(`/api/admin/services/${initial._id}`, { method: 'DELETE' }).catch(
      () => null
    )
    if (res?.ok) {
      router.replace('/admin')
      router.refresh()
      return
    }
    setStatus({ kind: 'error', message: 'Não foi possível eliminar. Tente de novo.' })
  }

  const errorCount = Object.keys(errors).length
  const s = service

  return (
    <form onSubmit={save} className="space-y-8" noValidate>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-blue-800 underline">
            ← Voltar aos serviços
          </Link>
          <h1 className="mt-2 text-3xl">
            {isNew ? 'Novo serviço' : s.title.pt || s.title.en || 'Editar serviço'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {!isNew && s.published && (
            <a
              href={`/pt/${s.type === 'tour' ? 'tours' : 'transfers'}/${initial.slug}`}
              target="_blank"
              rel="noopener"
              className={outlineButton}
            >
              Ver no site
            </a>
          )}
          <button type="submit" disabled={status.kind === 'saving'} className={primaryButton}>
            {status.kind === 'saving' ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>

      {status.message && (
        <p
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-lg px-4 py-3 font-semibold ${
            status.kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-sky-100 text-blue-800'
          }`}
        >
          {status.message}
          {errorCount > 0 && ` (${errorCount})`}
        </p>
      )}

      <Card title="Informação básica">
        <div>
          <p className={labelClass}>Tipo</p>
          <div className="flex gap-6">
            {[
              ['tour', 'Tour'],
              ['transfer', 'Transfer'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  checked={s.type === value}
                  onChange={() => change('type', value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <LocInput label="Nome" path="title" value={s.title} onChange={change} errors={errors} />
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="slug" className={labelClass}>
              Endereço (slug)
            </label>
            <input
              id="slug"
              value={s.slug}
              onChange={(e) => changeKey('slug', e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-sm">
              /{s.type === 'tour' ? 'tours' : 'transfers'}/{s.slug || '…'}
            </p>
            <FieldError error={errors.slug} />
          </div>
          <div>
            <label htmlFor="id" className={labelClass}>
              Código interno
            </label>
            <input
              id="id"
              value={s.id}
              onChange={(e) => changeKey('id', e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-sm">Usado nos “serviços relacionados”. Evite mudar.</p>
            <FieldError error={errors.id} />
          </div>
          <div>
            <label htmlFor="order" className={labelClass}>
              Ordem na lista
            </label>
            <input
              id="order"
              type="number"
              min="0"
              value={s.order}
              onChange={(e) => change('order', e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-sm">Números mais baixos aparecem primeiro.</p>
            <FieldError error={errors.order} />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={s.published}
              onChange={(e) => change('published', e.target.checked)}
            />
            Publicado no site
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.placeholder}
              onChange={(e) => change('placeholder', e.target.checked)}
            />
            Conteúdo provisório (o preço aparece com a nota “preço indicativo”)
          </label>
        </div>
      </Card>

      <Card title="Preço, duração e capacidade">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="priceFrom" className={labelClass}>
              Preço ida e volta (€)
            </label>
            <input
              id="priceFrom"
              type="number"
              min="0"
              value={s.priceFrom ?? ''}
              onChange={(e) => change('priceFrom', e.target.value)}
              className={inputClass}
            />
            <FieldError error={errors.priceFrom} />
          </div>
          <div>
            <label htmlFor="priceWeekend" className={labelClass}>
              Preço ao fim de semana (€, opcional)
            </label>
            <input
              id="priceWeekend"
              type="number"
              min="0"
              value={s.priceWeekend ?? ''}
              onChange={(e) => change('priceWeekend', e.target.value)}
              className={inputClass}
            />
            <FieldError error={errors.priceWeekend} />
          </div>
          <div>
            <label htmlFor="pricingModel" className={labelClass}>
              Preço por
            </label>
            <select
              id="pricingModel"
              value={s.pricingModel}
              onChange={(e) => change('pricingModel', e.target.value)}
              className={inputClass}
            >
              <option value="perVehicle">Viatura</option>
              <option value="perPerson">Pessoa</option>
            </select>
          </div>
          <div>
            <label htmlFor="capacity" className={labelClass}>
              Máximo de passageiros
            </label>
            <input
              id="capacity"
              type="number"
              min="1"
              value={s.capacity}
              onChange={(e) => change('capacity', e.target.value)}
              className={inputClass}
            />
            <FieldError error={errors.capacity} />
          </div>
        </div>
        <LocInput
          label="Duração"
          path="duration"
          value={s.duration}
          onChange={change}
          errors={errors}
        />
      </Card>

      <Card title="Textos">
        <LocInput
          label="Resumo (aparece nos cartões)"
          path="summary"
          value={s.summary}
          onChange={change}
          errors={errors}
          multiline
        />
        <div>
          <p className={labelClass}>Descrição</p>
          <p className="mb-2 text-sm">Separe os parágrafos com uma linha em branco.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {['pt', 'en'].map((lang) => (
              <div key={lang}>
                <label
                  htmlFor={`body.${lang}`}
                  className="mb-1 block text-xs font-semibold uppercase text-blue-600"
                >
                  {lang === 'pt' ? 'Português' : 'English'}
                </label>
                <textarea
                  id={`body.${lang}`}
                  rows={10}
                  value={bodyText[lang]}
                  onChange={(e) => setBodyText((prev) => ({ ...prev, [lang]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Percurso" description="O percurso aparece na página do serviço.">
        <div className="grid gap-5 lg:grid-cols-2">
          <LocInput
            label="Partida"
            path="route.from"
            value={s.route.from}
            onChange={change}
            errors={errors}
          />
          <LocInput
            label="Chegada"
            path="route.to"
            value={s.route.to}
            onChange={change}
            errors={errors}
          />
        </div>
        <LocList label="Paragens" path="stops" items={s.stops} onChange={change} errors={errors} />
      </Card>

      <Card title="Incluído e não incluído">
        <LocList
          label="Incluído"
          path="includes"
          items={s.includes}
          onChange={change}
          errors={errors}
        />
        <LocList
          label="Não incluído"
          path="excludes"
          items={s.excludes}
          onChange={change}
          errors={errors}
        />
      </Card>

      <Card title="Perguntas frequentes">
        {s.faq.map((item, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-sky-100 p-4">
            <LocInput
              label={`Pergunta ${i + 1}`}
              path={`faq.${i}.q`}
              value={item.q}
              onChange={change}
              errors={errors}
            />
            <LocInput
              label="Resposta"
              path={`faq.${i}.a`}
              value={item.a}
              onChange={change}
              errors={errors}
              multiline
            />
            <button
              type="button"
              className={smallButton}
              onClick={() =>
                change(
                  'faq',
                  s.faq.filter((_, j) => j !== i)
                )
              }
            >
              Remover pergunta
            </button>
          </div>
        ))}
        <button
          type="button"
          className={smallButton}
          onClick={() => change('faq', [...s.faq, { q: emptyLoc(), a: emptyLoc() }])}
        >
          + Adicionar pergunta
        </button>
      </Card>

      <Card
        title="Imagens"
        description="Caminho de uma imagem do site (ex.: /images/hero.webp) ou endereço https. A primeira é a imagem principal."
      >
        {s.gallery.map((img, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-sky-100 p-4">
            <div>
              <label htmlFor={`gallery.${i}.src`} className={labelClass}>
                Imagem {i + 1}
              </label>
              <input
                id={`gallery.${i}.src`}
                value={img.src}
                onChange={(e) => change(`gallery.${i}.src`, e.target.value)}
                className={inputClass}
              />
              <FieldError error={errors[`gallery.${i}.src`]} />
            </div>
            <LocInput
              label="Descrição da imagem (para leitores de ecrã)"
              path={`gallery.${i}.alt`}
              value={img.alt}
              onChange={change}
              errors={errors}
            />
            <button
              type="button"
              className={smallButton}
              onClick={() =>
                change(
                  'gallery',
                  s.gallery.filter((_, j) => j !== i)
                )
              }
            >
              Remover imagem
            </button>
          </div>
        ))}
        <button
          type="button"
          className={smallButton}
          onClick={() => change('gallery', [...s.gallery, { src: '', alt: emptyLoc() }])}
        >
          + Adicionar imagem
        </button>
      </Card>

      {others.length > 0 && (
        <Card title="Serviços relacionados" description="Aparecem no fim da página deste serviço.">
          <div className="grid gap-2 md:grid-cols-2">
            {others.map((o) => (
              <label key={o.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.related.includes(o.id)}
                  onChange={(e) =>
                    change(
                      'related',
                      e.target.checked
                        ? [...s.related, o.id]
                        : s.related.filter((id) => id !== o.id)
                    )
                  }
                />
                {o.title}{' '}
                <span className="text-sm text-blue-600">
                  ({o.type === 'tour' ? 'tour' : 'transfer'})
                </span>
              </label>
            ))}
          </div>
        </Card>
      )}

      <Card title="Pesquisa Google (SEO)" description="Se ficar vazio, usa o nome e o resumo.">
        <LocInput
          label="Título"
          path="seo.title"
          value={s.seo.title}
          onChange={change}
          errors={errors}
        />
        <LocInput
          label="Descrição"
          path="seo.description"
          value={s.seo.description}
          onChange={change}
          errors={errors}
          multiline
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="submit" disabled={status.kind === 'saving'} className={primaryButton}>
          {status.kind === 'saving' ? 'A guardar…' : 'Guardar'}
        </button>
        {!isNew &&
          (confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-red-800">
                Eliminar definitivamente este serviço?
              </span>
              <button type="button" onClick={remove} className={dangerButton}>
                Sim, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={outlineButton}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className={dangerButton}>
              Eliminar serviço
            </button>
          ))}
      </div>
    </form>
  )
}
