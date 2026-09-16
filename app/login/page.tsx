export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const next = typeof p.next === 'string' ? p.next : '/dashboard';
  const error = typeof p.error === 'string' ? p.error : '';
  return <main className="authWrap">
    <form className="authCard" action="/api/auth/login" method="post">
      <span className="pill">UTMeuFy</span>
      <h1>Acessar dashboard</h1>
      <p className="muted">Painel privado da sua operação.</p>
      {error ? <div className="alert">Senha inválida ou configuração incompleta.</div> : null}
      <input type="hidden" name="next" value={next} />
      <label>Senha</label>
      <input className="input" type="password" name="password" autoComplete="current-password" required />
      <button className="button" type="submit">Entrar</button>
    </form>
  </main>;
}
