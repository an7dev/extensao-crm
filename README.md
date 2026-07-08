# Extensao CRM para WhatsApp Web

Esta extensao foi ajustada para abrir uma sidebar apenas em `https://web.whatsapp.com/*` e autenticar um usuario em um CRM externo.

## O que foi implementado

- Sidebar fixa no WhatsApp Web
- Formulario de login com `URL do CRM`, `endpoint`, `e-mail` e `senha`
- Persistencia de sessao usando `chrome.storage.local`
- Popup simples para mostrar o status da autenticacao

## Como usar

```bash
pnpm dev
```

Carregue a pasta `build/chrome-mv3-dev` no navegador.

Depois:

1. Abra o WhatsApp Web
2. Preencha a URL do seu CRM, por exemplo `https://crm.seudominio.com`
3. Ajuste o endpoint de login, se necessario. O padrao esta como `/api/auth/login`
4. Informe e-mail e senha

## Formato esperado da API

A extensao faz um `POST` JSON com:

```json
{
  "email": "usuario@crm.com",
  "password": "senha"
}
```

Ela tenta ler o token em um destes campos da resposta:

- `token`
- `accessToken`
- `access_token`
- `data.token`
- `data.accessToken`
- `data.access_token`

E tenta ler o usuario em:

- `user`
- `data.user`

Se o seu CRM usar outro formato, o ajuste deve ser feito em [lib/auth.ts](c:\Users\Mauricio\Desktop\extensao-crm\extensão-crm\lib\auth.ts).
