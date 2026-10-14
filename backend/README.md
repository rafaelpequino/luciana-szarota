# Envio de leads (Google Apps Script)

1. Acesse sheets.google.com com o Gmail que será o remetente e crie uma planilha em branco ("Leads do simulador").
2. Menu **Extensões > Apps Script**. Apague o conteúdo e cole todo o [lead-email.gs](./lead-email.gs).
3. Clique em **Implantar > Nova implantação > Tipo: App da Web**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
4. Autorize as permissões (Gmail e Planilhas) quando o Google pedir.
5. Copie a **URL do app da Web** e cole em `LEAD_ENDPOINT` no início da função `sendLead` em `simulador/simulador.js`.
6. Se alterar o script depois, use **Implantar > Gerenciar implantações > Editar > Nova versão**.
