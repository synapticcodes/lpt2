# Landing Page LPT2

Este repositório contém o projeto da landing page construída com Vite. Inclui a integração de rastreamento, validação de WhatsApp e formulários.

## Requisitos
- Node.js 18+
- npm

## Configuração
1. Copie `.env.example` para `.env.local` e preencha com credenciais reais (Supabase, Meta Pixel e Evolution API).
2. Instale dependências:
   ```bash
   npm install
   ```
3. Execute em desenvolvimento:
   ```bash
   npm run dev
   ```
4. Para gerar build de produção:
   ```bash
   npm run build
   ```
   O resultado ficará em `dist/`.

## Deploy
O arquivo `netlify.toml` contém as regras de build e redirects para deploy no Netlify.
