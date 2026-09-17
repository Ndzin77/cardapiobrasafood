# Correções da loja + adicionais com quantidade

Quatro frentes, entregues numa execução só. Tudo com foco em clareza para o cliente leigo: microanimações curtas, feedback imediato, cores de significado (verde = pode seguir, vermelho = bloqueado) e um caminho de saída sempre visível.

## 1. Travamento em alguns aparelhos

O que já foi confirmado no código:

- A lista de produtos escuta cada movimento de rolagem e, a cada evento, mede a posição de todas as seções da página. Em celular mais fraco isso trava a rolagem.
- O topo da loja tem dois círculos grandes e desfocados em animação contínua (custo alto de GPU em aparelho simples).
- Existem vários cronômetros de 1 em 1 segundo rodando ao mesmo tempo (carrinho, aviso de pagamento pendente, checkout), mesmo quando a tela nem está visível.

Correções:

- Medir a rolagem no máximo uma vez por quadro, e trocar a medição de todas as seções por observação nativa do navegador.
- Desligar as animações pesadas de fundo em telas pequenas e quando o aparelho pede menos movimento.
- Pausar os cronômetros quando a aba/painel não está visível.
- Respeitar "reduzir movimento" do sistema em todas as animações da loja.

Depois disso vou medir a loja em modo de aparelho lento pelo navegador e comparar antes/depois, com registro das travadas de quadro.

## 2. Localização fora da área de entrega (frete por bairro)

Hoje, quando o GPS traz um bairro que a loja não atende, aparece só uma faixa vermelha pequena e o botão continua bloqueado — o cliente leigo não entende o que fazer.

Novo comportamento:

- Assim que a localização for capturada e o bairro não estiver nas zonas atendidas, abre um aviso em destaque (modal) com: o bairro detectado, a explicação em uma frase e as saídas possíveis.
- Dentro do aviso, a lista dos bairros realmente atendidos, com busca, cada um mostrando sua taxa. Ao tocar num bairro, o formulário é preenchido e o aviso fecha com confirmação verde.
- Se a loja permitir retirada, botão "Retirar na loja" ali mesmo.
- Botão "Falar no WhatsApp" para o caso de o cliente achar que o endereço está certo.
- O mesmo aviso vale quando o CEP não bate com o bairro escolhido.

## 3. Modal de personalização "encolhendo"

Diagnóstico ainda não confirmado. O que já vi: o painel de personalização tem altura variável (até 85% da tela) e o conteúdo muda conforme a escolha, então ao marcar um item lá no fim a altura recalcula e a rolagem pula.

Primeiro passo da execução: reproduzir em tela de celular no navegador, marcando a última opção de um grupo com mais de 3 escolhas, e registrar o que muda de altura. Correções previstas:

- Altura estável do painel (não recalcula ao escolher).
- Preservar a posição de rolagem ao marcar/desmarcar.
- Cabeçalho da imagem encolhe ao rolar, em vez de sumir/voltar.
- Rodapé de total sempre fixo, com atualização animada do preço.

## 4. Adicionais no admin e na loja

Admin (editor de opções do produto):

- Reaproveitar um grupo de adicionais já criado em outro produto: botão "Importar grupo existente", com lista dos grupos usados na loja e cópia com um toque.
- Por escolha: permitir quantidade repetida, com mínimo e máximo por escolha.
- Continuam existindo mínimo e máximo do grupo (já existem), agora com limite total contando as repetições.
- Aviso claro quando a configuração é impossível (ex.: mínimo maior que máximo).

Loja (tela de personalizar):

- Escolhas com repetição ganham controle − / quantidade / +, em vez de só marcar.
- Contador do grupo no cabeçalho ("3 de 5 escolhidos") com barra de progresso que fica verde ao atingir o mínimo.
- Bloqueio visual suave ao bater o máximo (o + fica inativo e um aviso curto explica), sem travar a tela.
- Preço do item soma preço × quantidade de cada adicional; o resumo enviado no pedido/WhatsApp mostra "2x Nutella".

## Detalhes técnicos

- `MobileProductGrid`: trocar o listener de scroll por `IntersectionObserver` por seção + `requestAnimationFrame` como fallback.
- `StoreHeader`/`StoreFooter`: halos `blur-3xl` só a partir de `sm` e desligados com `prefers-reduced-motion`.
- Intervalos em `DynamicCartSheet`, `PendingCheckoutBanner`, `CheckoutModal`: pausar via `document.visibilityState`.
- `CheckoutModal`: novo componente `ZoneNotCoveredModal`, alimentado por `findMatchingZone` / `getZoneNeighborhoods` / `validateCepNeighborhoodConsistency` (já existentes em `src/lib/deliveryZones.ts`); dispara após GPS e após alteração de CEP/bairro.
- `ProductCustomizeModal`: altura fixa `h-[85vh]`, `overflow-anchor: none` na lista, estado de seleção passa de `string[]` para `Record<string, number>` (nome → quantidade).
- `ProductOptionsEditor` + `sanitizeProductOptions`: novos campos por escolha `allow_multiple`, `max_qty`, `min_qty`; leitura tolerante para produtos antigos (sem migração de banco — `products.options` é JSON).
- Carrinho/WhatsApp: `structuredOptions` passa a carregar `qty` por escolha; formatação atualizada em `whatsappTemplates`.
- Nenhuma mudança de esquema no banco é necessária.
