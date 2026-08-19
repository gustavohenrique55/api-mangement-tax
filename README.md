# API Management Tax

MVP técnico para governança tributária multi-jurisdicional na América Latina e no Caribe. A organização é identificada por configuração; até a definição do nome, a demonstração usa **Empresa Confidencial**.

## Estado do MVP 0.1

- contrato OpenAPI 3.1 em `api/openapi.yaml`;
- API NestJS com saúde, contexto de identidade, jurisdições, auditoria e onze domínios tributário-logísticos;
- persistência genérica dos registros gerenciais em PostgreSQL via Prisma, com fallback em memória somente para testes;
- configuração versionada do CFO e cadastro da rede regional de escritórios tributários;
- cenário sintético idempotente para oito jurisdições e dashboard executivo separado;
- catálogo documental em três blocos gerenciais: América Central, Ilhas do Caribe e América do Sul;
- identidade sintética permitida somente no desenvolvimento local;
- autorização por função e escopo de país;
- isolamento por tenant na aplicação e políticas PostgreSQL RLS;
- eventos de auditoria append-only encadeados por HMAC;
- dados exclusivamente sintéticos.

## Expansão tributário-logística — itens 1 a 10

1. Perfil operacional por jurisdição (`/v1/operational-profiles`): atividades, modais, modelo operacional e presença.
2. Entidades legais (`/v1/legal-entities`): cadastro anonimizado, moeda funcional e situação.
3. Estabelecimentos (`/v1/establishments`): escritórios, armazéns, terminais, portos, aeroportos e depósitos.
4. Rotas logísticas (`/v1/logistics-lanes`): origem, destino, modal, entidade faturadora, Incoterm e moeda.
5. Regimes aduaneiros (`/v1/customs-regimes`): trânsito, drawback, zonas francas, admissão temporária e armazém alfandegado.
6. Regras tributárias (`/v1/tax-rules`): tributo por país e tipo de operação, com fonte e status de validação jurídica. Para tributos indiretos, modela nível federativo, subtipo (ICMS, ISS, IVA, IBS/CBS, Ingresos Brutos e outros), regime de crédito, tipo de alíquota, base de cálculo e mecanismo de arrecadação, derivando creditabilidade do insumo e consistência de alíquota/isenção.
7. Documentos (`/v1/tax-documents`): metadados fiscais, de transporte e aduaneiros, com classificação da informação.
8. Recuperação de tributos (`/v1/tax-recovery-opportunities`): crédito operacional ou extraordinário, valor, prazo, canal e risco prescricional calculado.
9. Estabelecimento permanente (`/v1/permanent-establishment-assessments`): fatores e nível de risco; a saída é sempre indicador preliminar sujeito a advogado local.
10. Integrações (`/v1/integration-connections`): ERP, TMS, WMS, aduana, contencioso e assessoria local; a API armazena somente referência ao segredo, nunca a credencial.
11. Compliance internacional (`/v1/compliance-obligations`): CbCR, documentação de preços de transferência, FATCA/CRS, economic substance, MDR/DAC6 e e-invoicing, com frequência, prazo, status e risco de prazo calculado.

Todos os dez domínios aplicam tenant, escopo de país, RBAC e evento de auditoria. O contrato está em `api/openapi.yaml`, e a migração `202608160001_logistics_tax_expansion` cria as tabelas correspondentes com RLS forçada.

## Indicadores do plano de ação

A API calcula os onze componentes do scorecard dos escritórios e o **Índice de Desempenho do Escritório (IDE)**, aplicando os pesos do plano: êxito em disputas (15%), retrabalho (10%), resposta (10%), prazos (10%), créditos recuperados (15%), contingências evitadas (10%), economia identificada (5%), custo-benefício (10%), falhas de orientação (5%), apetite de risco (5%) e monitoramento legislativo (5%). O resultado é normalizado de 0 a 100 e classificado como Excelente, Bom, Atenção ou Crítico.

O primeiro trimestre pode ser registrado como `BASELINE`: nesse estado, a API calcula o IDE, mas define `panelReviewAllowed: false`, respeitando a proibição do plano de penalizar um escritório antes da calibração. A cadência é trimestral para Tiers 1 e 2 e semestral para os demais, salvo classificação Atenção ou Crítico.

Endpoints:

- `/v1/indicators/office-scorecards`: IDE e scorecard por escritório, país e trimestre;
- `/v1/indicators/etr-measurements`: ETR corrente e diferido, efeito Pilar 2, efeito cambial, baseline e meta;
- `/v1/indicators/demands`: prioridade, tempo transcorrido e SLA provisório de 48 horas para consultas simples ou 120 horas para complexas;
- `/v1/indicators/contingencies`: exposição em EUR, aging, categoria, tier, baseline herdado e aderência ao apetite de risco;
- `/v1/indicators/executive-dashboard?period=2026-Q3`: consolidação para CFO/Board de IDE, ETR, SLA e risco.

As fórmulas são determinísticas e auditáveis, mas pesos, metas, materialidade e limiares devem ser calibrados com os dados reais após o primeiro trimestre e aprovados nas alçadas previstas. Valores de moedas distintas não são somados diretamente: a exposição consolidada usa EUR, enquanto o ETR preserva a moeda de origem e identifica EUR como moeda do reporte corporativo.

## Governança do CFO e rede de escritórios

- `POST/GET /v1/governance/cfo-configurations`: versão, baseline, moedas, materialidade, apetite, SLA e pesos por país; os pesos devem totalizar 100;
- `GET /v1/governance/cfo-configurations/latest`: configuração executiva mais recente;
- `POST/GET /v1/governance/tax-offices`: escritório anonimizado, tier, tradição jurídica, escopo, honorários, procuração, cadência e protocolo de privilege;
- `GET /v1/governance/tax-offices/summary`: cobertura, custo anual e lacunas de contrato, procuração e privilege;
- `POST /v1/demo/seed`: massa sintética idempotente de 2026-Q3 para BR, MX, CO, AR, PA, PR, KY e VE.

O dashboard visual está no subprojeto `dashboard/` e apresenta exclusivamente dados sintéticos. O pacote para discussão com o advogado tributarista está em `deliverables/` nos formatos PPTX, DOCX e PDF.

O repositório é uma base de engenharia e governança. Não determina tratamento tributário nem substitui revisão jurídica, fiscal, de privacidade ou de segurança.

## Executar localmente

Requisitos: Node.js 24, pnpm e Docker.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm start:dev
```

Verificação rápida:

```powershell
Invoke-RestMethod http://localhost:3000/v1/health
Invoke-RestMethod http://localhost:3000/v1/identity-context -Headers @{
  'x-synthetic-tenant-id' = '00000000-0000-4000-8000-000000000001'
  'x-synthetic-subject' = 'demo.admin'
  'x-synthetic-roles' = 'tax-admin'
  'x-synthetic-country-scopes' = 'BR,MX,CO'
}
```

## Limites deliberados desta etapa

Os registros gerenciais já usam PostgreSQL/Prisma quando `DATABASE_URL` está configurada e `PERSISTENCE_MODE` não é `memory`. Cada operação fixa `app.tenant_id` dentro de uma transação, e as tabelas usam RLS forçada. Os testes automatizados usam o fallback em memória; o teste `pnpm test:rls` verifica o isolamento em PostgreSQL real. As análises de recuperação e estabelecimento permanente são triagens gerenciais, não pareceres, cálculos definitivos ou aconselhamento jurídico. Autenticação OIDC corporativa, gestão de chaves, ingestão de legislação oficial versionada e observabilidade centralizada também são Gates posteriores.

## Catálogo regional anonimizado

`GET /v1/jurisdictions/country-groups` retorna o catálogo anonimizado organizado nos três blocos solicitados. O México integra o bloco gerencial América Central apenas para organização do portfólio. O bloco Ilhas do Caribe contém os 13 países soberanos da região; Cuba e Haiti são referências documentais Tier 5, enquanto os outros 11 países têm origem `REGIONAL_CATALOG` e tier nulo até confirmação. O mesmo bloco mantém separadamente 15 jurisdições não soberanas — Porto Rico, Aruba, Curaçao, Ilhas Cayman, Guadalupe, Martinica, Sint Maarten, Países Baixos Caribenhos (BES), Ilhas Virgens Britânicas, Ilhas Virgens Americanas, Ilhas Turcas e Caicos, Anguilla, Montserrat, Saint-Martin e Saint-Barthélemy — com autoridade soberana e modelo legal explícitos. A referência agregada “Guianas” foi desdobrada em Guiana e Suriname como países soberanos e Guiana Francesa como região ultraperiférica vinculada à França. Todos os itens permanecem com presença operacional `UNCONFIRMED`, e cada item traz `restrictionStatus` — Cuba e Venezuela são marcadas como `SANCTIONS_SCREENING_REQUIRED`.

O vínculo soberano não significa aplicação automática e integral da lei do país soberano. Cada território recebe `applicableLawModel: TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK` e `legalValidationStatus: REQUIRED_LOCAL_COUNSEL`, exigindo análise conjunta da legislação local, do vínculo constitucional e, quando aplicável, de normas do país soberano e da União Europeia.
