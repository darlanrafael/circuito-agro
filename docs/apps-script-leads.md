# Mandar os leads da planilha para o Dashboard

Este documento explica como acrescentar, no Apps Script que já roda na planilha do EFAGRO
Experience, um envio a mais: além de mandar cada lead novo para a Meta (como já acontece
hoje), o script passa a mandar também para o Dashboard do circuito-agro.

**Importante: você não vai criar um script do zero.** A planilha já tem um Apps Script
funcionando, que já dispara um envio para a API de conversões da Meta a cada linha nova (é
esse envio que aparece como `ok` na coluna `Meta API`). O que este documento ensina é a
acrescentar uma segunda chamada dentro desse script que já existe, sem mexer no que já
funciona.

---

## O que você precisa saber antes de mexer

- **A permissão para o script "falar com a internet" já foi concedida.** Foi ela que precisou
  ser autorizada para o envio à Meta começar a funcionar. A chamada nova usa a mesma
  permissão, então, na maioria dos casos, você não vai precisar autorizar nada de novo.
- **O endereço do Dashboard ainda não existe no ar.** Enquanto a equipe não publicar essa
  parte do sistema, o endereço que você vai colar no script não responde. Você pode colar o
  código agora mesmo assim; só o envio para o Dashboard é que não vai funcionar até lá (o
  envio para a Meta continua normal, sem nenhum risco).

---

## Passo 1: Abrir o editor do script

1. Abra a planilha do EFAGRO Experience.
2. No menu de cima, clique em **Extensões** e depois em **Apps Script**.
3. Vai abrir uma aba nova com o código que já existe. Não apague nada do que estiver lá.

---

## Passo 2: Colar a função nova

Role até o final do código e cole o trecho abaixo (sem tirar nada que já está escrito):

```javascript
// Acrescentar dentro da função que já processa a linha nova.
// A permissão de UrlFetchApp já foi autorizada quando o envio para a Meta passou a funcionar.
function enviarLeadParaDashboard(linha) {
  var url = 'https://SEU-DOMINIO-NA-VERCEL/api/leads/webhook';
  var corpo = {
    id:       linha.id,            // coluna ID da planilha
    nome:     linha.nome,
    email:    linha.email,
    whatsapp: linha.whatsapp,
    ingresso: linha.ingressoEscolhido,
    origem:   linha.origem,        // "EFAGRO Experience Novembro"
    pagina:   linha.pagina,        // URL completa, com as UTMs
    data:     linha.dataHora       // "28/09/2026 11:00:28"
  };

  try {
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(corpo),
      muteHttpExceptions: true
    });
    return resp.getResponseCode() === 200 ? 'ok' : 'erro http ' + resp.getResponseCode();
  } catch (e) {
    return 'erro: ' + e;
  }
}
```

**Onde trocar o endereço:** na linha `var url = 'https://SEU-DOMINIO-NA-VERCEL/api/leads/webhook';`,
troque `SEU-DOMINIO-NA-VERCEL` pelo endereço real do Dashboard assim que ele existir. Até lá,
pode deixar como está: o script vai tentar enviar, vai receber erro de conexão (porque o
endereço não existe ainda) e vai só escrever esse erro na coluna `Dashboard`, sem travar nada
e sem afetar o envio para a Meta.

---

## Passo 3: Ligar a função nova ao script que já roda

A função `enviarLeadParaDashboard` que você acabou de colar não faz nada sozinha, ela só passa
a existir. Falta chamá-la no lugar certo: dentro da mesma função que já roda hoje para cada
linha nova e que já manda o envio para a Meta.

1. Use **Ctrl+F** (ou Cmd+F no Mac) dentro do editor de script e procure por `Meta API`. Isso
   leva até o trecho que já grava `ok` (ou o erro) nessa coluna.
2. Logo depois desse trecho, dentro da mesma função, acrescente a chamada para a função nova
   e grave o resultado dela numa coluna ao lado, chamada `Dashboard`:

```javascript
// logo depois do trecho que já grava o resultado na coluna "Meta API":
var resultadoDashboard = enviarLeadParaDashboard(linha);
sheet.getRange(numeroDaLinha, colunaDashboard).setValue(resultadoDashboard);
```

Os nomes `linha`, `sheet`, `numeroDaLinha` e `colunaDashboard` são só um exemplo de como isso
costuma aparecer. No seu script, muito provavelmente já existem variáveis com nomes parecidos
sendo usadas ali mesmo, no trecho que grava o `ok` da Meta. Use as mesmas variáveis que
já estão sendo usadas para montar o envio da Meta: é a mesma informação da mesma linha, só
mandada para um endereço diferente.

Se não achar com certeza onde encaixar, uma alternativa segura é colar essa chamada logo
depois da linha que já chama o envio da Meta (a que usa `UrlFetchApp.fetch` para a Meta),
antes da função terminar.

---

## Passo 4: Criar a coluna `Dashboard` na planilha

Na planilha (não no script), acrescente uma coluna nova chamada `Dashboard`, logo ao lado da
coluna `Meta API`. É nela que o resultado do envio para o Dashboard vai aparecer: `ok` quando
deu certo, ou uma mensagem de erro quando não deu.

Essa coluna serve para você enxergar, olhando a planilha, se o envio para o Dashboard está
funcionando, sem precisar perguntar para ninguém. É a mesma lógica que a coluna `Meta API` já
cumpre hoje para o envio da Meta.

---

## Passo 5: Salvar e testar

1. Clique no ícone de salvar (o disquete) no topo do editor de script.
2. Preencha o formulário da landing page como se fosse um lead de teste, ou espere a próxima
   inscrição real.
3. Confira a planilha: a coluna `Dashboard` deve preencher em poucos segundos, do lado da
   `Meta API`.

Enquanto o endereço do Dashboard ainda não estiver no ar (veja o Passo 2), o que vai aparecer
na coluna `Dashboard` é uma mensagem de erro de conexão, não `ok`. Isso é esperado nessa fase
e não indica um problema no que você colou. Assim que o endereço real substituir
`SEU-DOMINIO-NA-VERCEL`, o mesmo teste deve passar a mostrar `ok`.

---

## Se aparecer um erro de permissão

Se a coluna `Dashboard` (ou a `Meta API`) mostrar uma mensagem parecida com:

```
Exception: You do not have permission to call UrlFetchApp.fetch. Required permissions: https://www.googleapis.com/auth/script.external_request
```

isso quer dizer que o script perdeu a autorização para "falar com a internet" (a mesma
permissão que o envio para a Meta usa). Já aconteceu antes, no começo, com 4 linhas da
planilha, e foi resolvido reautorizando o script. Para reautorizar:

1. No editor do Apps Script, escolha qualquer função no menu de cima e clique em **Executar**
   (o botão com o ícone de play).
2. Vai aparecer uma tela pedindo autorização. Clique em **Continuar**, escolha sua conta
   Google, e se aparecer um aviso de "app não verificado", clique em **Avançado** e depois em
   **Acessar [nome do projeto] (não seguro)**.
3. Clique em **Permitir**.

Depois disso, tanto o envio para a Meta quanto o envio para o Dashboard voltam a funcionar,
porque os dois dependem da mesma permissão.

---

## Resumo das colunas da planilha

Para referência, é assim que cada coluna da planilha vira cada campo que o Dashboard recebe:

| Coluna na planilha | Campo usado no script (`linha.___`) | Campo que o Dashboard recebe |
|---|---|---|
| `Data/Hora` | `dataHora` | `data` |
| `Nome` | `nome` | `nome` |
| `E-mail` | `email` | `email` |
| `WhatsApp` | `whatsapp` | `whatsapp` |
| `Ingresso escolhido` | `ingressoEscolhido` | `ingresso` |
| `Origem` | `origem` (sempre "EFAGRO Experience Novembro") | `origem` |
| `Página` | `pagina` (URL completa, com as UTMs) | `pagina` |
| `ID` | `id` | `id` |
| `Meta API` | (não é enviada; é onde o envio para a Meta já grava o resultado) | - |
| `Dashboard` (nova, criada no Passo 4) | (não é enviada; recebe o resultado do envio novo) | - |

Os nomes que o Dashboard espera (`id`, `nome`, `email`, `whatsapp`, `ingresso`, `origem`,
`pagina`, `data`) já estão certos no trecho de código do Passo 2. Não precisa renomear nada.
