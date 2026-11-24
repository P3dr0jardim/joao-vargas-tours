/** Shown instead of the panel while MONGODB_URI or ADMIN_SESSION_SECRET is missing. */
export default function NotConfigured() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl">Painel ainda não configurado</h1>
        <p className="mt-4">Para ativar o painel de administração defina no servidor:</p>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          <li>
            <code>MONGODB_URI</code>: a ligação à base de dados MongoDB;
          </li>
          <li>
            <code>ADMIN_SESSION_SECRET</code>: um texto aleatório com pelo menos 32 caracteres.
          </li>
        </ul>
        <p className="mt-4">
          Depois crie a conta com <code>npm run admin:create -- o-seu@email.pt</code>.
        </p>
      </div>
    </main>
  )
}
