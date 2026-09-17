

## Plano: Detectar e Mesclar Itens Duplicados Antes de Confirmar

### Problema
Quando a IA extrai uma nota fiscal grande, é comum aparecer o mesmo insumo em linhas separadas (ex: "Queijo 200g R$10" e "Queijo 100g R$5"). Hoje, ao confirmar, vira 2 lotes separados — perde-se a visão de que é o mesmo produto e atrapalha o cálculo FIFO.

### Solução

Após a IA processar (texto ou foto) e antes de mostrar a tabela de revisão, rodar **detecção de duplicatas** no client-side. Se encontrar grupos de itens parecidos, abrir um **modal de mesclagem** onde a pessoa decide o que juntar.

**1. Algoritmo de detecção (em `ShoppingListChat.tsx`)**

Para cada par de itens da lista parseada:
- **Match por nome**: normaliza (lowercase, sem acento, sem plural simples) e calcula similaridade Levenshtein. Se ≥ 85% → candidato
- **Match por unidade compatível**: usa `getCompatibleUnits()` de `unitConversion.ts` (queijo 200g + queijo 0.1kg = compatíveis; farinha 1kg + ovo 6un = não)
- **Sanity check de preço**: converte ambos pra unidade base e calcula `cost_per_unit`. Se variar mais de 50% entre eles → marca com aviso amarelo "preços muito diferentes, confira"

Agrupa em clusters (union-find simples) e mostra só os clusters com 2+ itens.

**2. Modal de mesclagem (novo `MergeDuplicatesModal.tsx`)**

Aparece automaticamente se detectou duplicatas. Layout:

```text
┌─────────────────────────────────────────────────┐
│ Encontramos itens parecidos. Como deseja tratar?│
├─────────────────────────────────────────────────┤
│ Grupo 1: "Queijo"                               │
│ ☑ Queijo  200g  R$10,00  (R$50/kg)              │
│ ☑ Queijo  100g  R$5,00   (R$50/kg)              │
│                                                  │
│ → Resultado: Queijo  300g  R$15,00  (R$50/kg)   │
│                                                  │
│ [ Juntar marcados ]  [ Deixar separados ]       │
├─────────────────────────────────────────────────┤
│ Grupo 2: "Farinha" ⚠️ Preços diferentes         │
│ ☑ Farinha  1kg  R$5,00   (R$5/kg)               │
│ ☑ Farinha  2kg  R$16,00  (R$8/kg)               │
│ ⚠ Conferir: pode ser marca/qualidade diferente   │
│ ...                                              │
└─────────────────────────────────────────────────┘
```

- Checkbox por linha pra escolher o que entra na mesclagem
- Nome final editável (campo de texto)
- Conversão automática pra unidade base do grupo (a maior unidade entre os marcados, ex: kg ganha de g)
- Preview ao vivo do resultado: soma `quantity` (na unidade alvo) e soma `total_paid`
- Botão "Juntar marcados" aplica e fecha; "Deixar separados" mantém todos
- Botão "Pular" no topo se quiser ignorar todas as sugestões

**3. Integração no fluxo**

```text
IA extrai → detectDuplicates(items)
  ├─ 0 grupos → vai direto pra tabela de revisão (atual)
  └─ 1+ grupos → abre MergeDuplicatesModal
                    ├─ Confirma merge → substitui itens no array → tabela de revisão
                    └─ Cancela/pula → mantém lista original → tabela de revisão
```

### Arquivos

- **Novo `src/components/admin/MergeDuplicatesModal.tsx`** — modal com clusters, checkboxes, preview e merge
- **Novo `src/lib/duplicateDetection.ts`** — `normalizeName`, `levenshtein`, `findDuplicateGroups`, `mergeItems` (puro, testável)
- **Editar `src/components/admin/ShoppingListChat.tsx`** — após `setItems(parsed)`, rodar detecção; se grupos > 0, abrir modal; aplicar resultado

### Anti-bug

1. **Detecção é puramente client-side** — sem chamadas extras à IA, sem custo, sem latência
2. **Modal é opcional** — botões "Pular" e "Deixar separados" garantem que ninguém é forçado a mesclar
3. **Conversão de unidades reaproveita `unitConversion.ts`** — não duplica lógica
4. **Bloqueia merge entre unidades incompatíveis** (g + ml) — checkbox fica desabilitada com tooltip "unidades incompatíveis"
5. **Preserva itens não-duplicados intactos** — só mexe nos grupos que a pessoa confirmou
6. **Aviso visual amarelo** quando preços por unidade divergem >50% (sinal de marca/qualidade diferente)
7. **Threshold de similaridade conservador (85%)** — evita falsos positivos tipo "leite" vs "leite condensado"
8. **Nome do grupo é editável** antes de mesclar — pessoa corrige se a IA escreveu errado
9. **Não mexe no banco** — toda mesclagem é antes do `register_ingredient_purchase`. Sem migração necessária

### Validação

1. Processar "queijo 200g 10, queijo 100g 5" → modal abre → marca ambos → vira 1 item "Queijo 300g R$15"
2. Processar "farinha 1kg 5, farinha 2kg 16" → modal abre com aviso amarelo (preços divergentes) → pessoa decide
3. Processar "leite 1l 8, leite condensado 395g 6" → similaridade ~70% (não passa do threshold) → nem aparece no modal
4. Processar lista sem duplicatas → vai direto pra tabela (modal não aparece)
5. Clicar "Pular" no modal → mantém todos os itens originais
6. Tentar mesclar "queijo 200g" + "queijo 1L" → checkbox desabilitada (incompatível)

