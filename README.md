# Vampiros

Aplicacao TanStack Start com Supabase.

## Rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Para testar sem Supabase, deixe o `.env` assim:

```bash
VITE_LOCAL_MODE=true
```

Nesse modo, login, personagens e fotos ficam no `localStorage` do navegador.

Quando criar seu proprio projeto Supabase, use `.env.example` como referencia, coloque `VITE_LOCAL_MODE=false` e preencha as variaveis do Supabase.

3. Inicie o servidor local:

```bash
npm run dev
```

## Build de producao

```bash
npm run build
npm run start
```

## Vercel

Use `npm install` como install command e `npm run build` como build command. Cadastre no projeto da Vercel as variaveis:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`, caso use rotas server-side administrativas
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
