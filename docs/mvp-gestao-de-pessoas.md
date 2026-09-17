# Documento de Especificação de Produto (MVP) — Logos Gestão de Igreja

Denominação: **Defesa da Fé** | Plataforma: **Logos Web Mobile-First (React + Vite + TypeScript + Tailwind + PocketBase)**

---

## 1. Visão Geral & Decisões Fundamentais

O sistema **Logos** foi concebido para atender às necessidades práticas e eclesiásticas da denominação Defesa da Fé. O objetivo central é fornecer um fluxo pastoral e administrativo integrado — desde a primeira vez que um visitante pisa na igreja até o pleno discipulado, membresia e liderança departamental —, eliminando burocracias desnecessárias e garantindo acolhimento caloroso e respeito à privacidade (LGPD).

### DECISÕES OFICIAIS (20)

- **D1 (MVP)**: O papel dentro de um departamento se chama **função** (ex.: Baterista, Técnico de Áudio, Coordenador de Ensaios).
- **D2 (MVP)**: Cada departamento tem quantas funções precisar, definidas pela própria igreja diretamente no sistema, sem depender de desenvolvimento de software.
- **D3 (MVP)**: A Secretaria cria departamentos e funções; o líder cria funções no departamento que lidera.
- **D4 (MVP)**: Subdepartamentos são opcionais e apenas a Secretaria pode criá-los.
- **D5 (Versão posterior)**: **Supervisão** é o nome oficial da camada que agrupa departamentos sob uma mesma pessoa. _(Fora do MVP; registrado para roadmap futuro)_.
- **D6 (Versão posterior)**: Cada departamento pertencerá a no máximo uma supervisão. _(Fora do MVP)_.
- **D7 (Versão posterior)**: O supervisor apenas consulta dados das áreas supervisionadas; não altera nada diretamente. _(Fora do MVP)_.
- **D8 (MVP)**: O aplicativo é **único** e a tela inicial se monta organicamente em **blocos conforme as atuações ativas da pessoa** (ex.: uma pessoa que é membro, técnica de áudio na Mídia e líder do Coral visualiza os três blocos no mesmo app simultaneamente, sem trocar de perfil ou sair da conta).
- **D9 (MVP)**: O visitante pode se registrar sozinho pelo **QR Code fixo**, em uma página web leve, sem precisar baixar o app ou fazer login prévio.
- **D10 (MVP)**: O visitante também pode ser registrado por um voluntário da equipe de **Boas-Vindas**, com busca rápida prévia por telefone para evitar duplicidades.
- **D11 (MVP)**: O QR Code é **fixo** (impresso nos bancos/tótens), e a presença é associada automaticamente ao culto pela **agenda da igreja** e sua respectiva janela de horário.
- **D12 (MVP)**: O número de **telefone** identifica a pessoa e une registros vindos do QR Code de autoatendimento e do balcão de Boas-Vindas.
- **D13 (MVP — Revisada: Princípio CX de Coleta Progressiva e Vínculo Proporcional)**: A distribuição de convites e coleta de dados respeita rigorosamente o momento do visitante: "pedir compromisso na proporção do vínculo". Na **1ª visita**, a tela de confirmação exibe APENAS os horários dos cultos da semana e a preferência de contato — SEM link do app e SEM convite ao formulário completo (evitando sobrecarga para quem está sentada no banco antes do culto). O **link do app** é oferecido no **follow-up pós-1ª visita via WhatsApp** pelo voluntário do Boas-Vindas em mensagem pessoal. Na **2ª visita**, a tela de confirmação traz o formulário "Conte mais sobre você" como **AÇÃO PRINCIPAL** e o link do app como ação secundária. Da **3ª visita em diante**, a página oferece apenas o que ainda não foi atendido ou preenchido, sem repetir convites já concluídos.
- **D14 (MVP)**: O convite ao formulário "Conte mais sobre você" é a ação principal na 2ª visita e segue disponível em visitas subsequentes caso ainda não tenha sido preenchido, nunca repetindo perguntas ou dados já informados.
- **D15 (MVP)**: O líder do departamento e a secretaria têm permissão para colocar e retirar pessoas das funções.
- **D16 (MVP)**: Cada unidade departamental nasce, por padrão, com duas vagas de liderança: **líder** e **vice-líder**.
- **D17 (MVP)**: Lideranças adicionais além de líder e vice-líder (ex.: segundo vice, coordenador geral) só a Secretaria pode adicionar.
- **D18 (MVP)**: Requisitos por função são definidos pelo líder do departamento ou pela Secretaria.
- **D19 (MVP)**: Regras de sobreposição entre funções são configuráveis pelo líder e pela Secretaria.
- **D20 (MVP)**: Toda a estrutura (unidades, funções, requisitos, sobreposições) é **configurável**, sem regras fixas engessadas no código-fonte.

---

## 2. Estrutura Organizacional

A arquitetura eclesiástica adota uma árvore hierárquica flexível de até quatro camadas:

1. **Supervisão** _(Versão posterior / roadmap)_: Agrupamento pastoral de departamentos afins.
2. **Departamento** _(Obrigatório no MVP)_: Criado exclusivamente pela Secretaria; pode possuir funções diretamente, subdepartamentos, ou ambos.
3. **Subdepartamento** _(Opcional no MVP)_: Criado apenas pela Secretaria; localiza-se exatamente um nível abaixo de um departamento.
4. **Função** _(Obrigatória no MVP)_: Ocupação prática (ex.: Vocalista, Operador de Câmera, Recepcionista). Pode estar vinculada diretamente ao departamento (ex.: Coordenador de Ensaios da Música) ou a um subdepartamento (ex.: Bateria no subdepartamento Banda). O nome da função é único dentro da mesma unidade e pode ter requisitos obrigatórios configurados.

### Modelagem Unificada de "Unidade"

Departamentos e subdepartamentos compartilham a entidade unificada **Unidade** (`departments` / `unit`), possuindo:

- `name`: Nome da unidade (ex.: "Música", "Banda", "Mídia", "Boas-Vindas").
- `unit_type`: Tipo estrutural (`departamento` | `subdepartamento` | `supervisao` [futuro]).
- `parent_unit`: Unidade-pai à qual está subordinada (para subdepartamentos aponta para o departamento pai; departamentos raiz possuem valor nulo).
- `status`: Situação operacional (`ativo` | `arquivado`).
- `order_index`: Ordenação preferencial na listagem.

### Reestruturações Organizacionais

Uma unidade pode ser reestruturada ao longo do tempo (ex.: um departamento autônomo pode se tornar subdepartamento de outro, ou migrar de subordinação). As reestruturações preservam integralmente as funções cadastradas, as atuações ativas/passadas e o histórico cronológico com datas, permitindo responder quem liderava ou supervisionava cada área em qualquer momento histórico.

### Arquivamento em Vez de Exclusão

Unidades e funções com qualquer histórico de atuações **não podem ser excluídas fisicamente**, apenas **arquivadas**. O arquivamento de uma unidade ou função exige pré-requisito obrigatório: **não possuir atuações ativas vigentes**.

---

## 3. Liderança e Níveis de Atuação

- **Nível de Atuação**: "Líder" **não é uma função** isolada (como Baterista ou Sonoplasta), mas sim o **nível da atuação** da pessoa na unidade (`voluntario` | `lider` | `vice_lider` | `lideranca_adicional`). Dessa forma, a mesma pessoa pode ser voluntária na Mídia e líder no Coral.
- **Vagas Padrão**: Cada departamento e subdepartamento nasce com duas vagas de liderança pré-configuradas: **Líder** e **Vice-Líder**.
- **Equivalência Operacional**: O Vice-Líder possui as mesmas permissões operacionais do Líder na respectiva unidade.
- **Lideranças Adicionais**: Vagas suplementares de liderança (ex.: Segundo Vice, Coordenador de Apoio) só podem ser instituídas pela Secretaria.

---

## 4. Requisitos por Função

Para exercer determinadas funções na igreja, requisitos técnicos ou espirituais podem ser exigidos (exemplos: _"Curso de Voluntariado Concluído"_, _"Treinamento Operacional na Mesa Digital Soundcraft"_, _"Entrevista com Liderança Pastoral Realizada"_).

- **Quem define**: O líder do respectivo departamento ou a Secretaria.
- **Checklist de Atribuição**: Ao alocar uma pessoa em uma função que possua requisitos, o sistema exibe o checklist obrigatório.
- **Rastreabilidade**: O sistema registra formalmente qual usuário conferiu/aprovou cada requisito e o timestamp exato (`checklist_completed: [{ requirement_id, requirement_title, confirmed_by, confirmed_at }]`).

---

## 5. Regras de Sobreposição entre Funções

As regras de sobreposição determinam quais funções uma mesma pessoa pode ou não exercer simultaneamente no corpo da igreja:

- **Dinâmicas e Configuráveis**: Nenhuma regra é engessada no código-fonte.
- **Exemplos Práticos**:
  - _Vocalista_ + _Violonista_ (ambos na Música) &rarr; **Permitido**.
  - _Voluntário da Música_ + _Voluntário do Boas-Vindas_ servindo nos mesmos cultos &rarr; **Bloqueado**.
- **Permissões de Configuração**:
  - **Líder do Departamento**: Configura regras entre funções do próprio departamento e restrições que envolvam a sua unidade.
  - **Secretaria**: Configura regras para qualquer combinação de unidades e funções da igreja.
- **Aplicação no MVP**: No MVP, a validação de sobreposição atua no momento da **atribuição de funções a pessoas**. Se houver choque com regra bloqueante, a atribuição é impedida na interface com uma explicação clara do motivo (ex.: _"Atribuição bloqueada: Regra de sobreposição 'Música x Boas-Vindas' não permite acumular as funções Voluntário de Recepção e Baterista"_). _(A alocação de sobreposição em escalas de cultos específicos fica reservada para a versão posterior de Escalas)_.

---

## 6. Matriz de Permissões sobre a Estrutura Organizacional

| Papel                                | Departamentos e Subdepartamentos           | Funções e Requisitos                                                                                                                                 | Pessoas nas Funções                                       | Liderança                                         | Regras de Sobreposição                           | Visibilidade                                            |
| ------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| **Secretaria**                       | Cria, edita, arquiva e reorganiza unidades | Cria em qualquer unidade; define requisitos, níveis de liderança e permissões                                                                        | Atribui e encerra atuações em qualquer unidade            | Nomeia Líder e Vice; cria lideranças adicionais   | Configura qualquer combinação global             | Toda a estrutura da igreja                              |
| **Líder ou Vice de Departamento**    | Nenhuma ação estrutural                    | Cria, edita e arquiva no departamento e subdepartamentos vinculados (apenas nível voluntário, sem conceder permissões de sistema); define requisitos | Atribui e encerra no departamento e seus subdepartamentos | Nenhuma ação (nomeações exclusivas da Secretaria) | Configura regras que envolvam o seu departamento | O departamento e todos os subdepartamentos subordinados |
| **Líder ou Vice de Subdepartamento** | Nenhuma ação                               | Igual ao líder de departamento, restrito estritamente ao seu subdepartamento                                                                         | Atribui e encerra no seu subdepartamento                  | Nenhuma ação                                      | Regras do próprio subdepartamento                | Exclusivamente o próprio subdepartamento                |
| **Supervisor** _(Versão posterior)_  | Consulta apenas                            | Consulta apenas                                                                                                                                      | Consulta apenas                                           | Consulta apenas                                   | Consulta apenas                                  | Departamentos supervisionados                           |
| **Pastor**                           | Consulta apenas                            | Consulta apenas                                                                                                                                      | Consulta apenas                                           | Consulta apenas                                   | Consulta apenas                                  | Toda a estrutura globalmente, sem editar                |

> **Nota de Segurança Arquitetural**: Por que o líder departamental **não define permissões de sistema** para as funções? Algumas funções operacionais concedem acesso a dados protegidos ou sensíveis (como a função de Boas-Vindas, que consulta telefones e históricos de visitantes). Caso o líder departamental pudesse criar funções atribuindo permissões sistêmicas de acesso, bastaria criar uma função qualquer para liberar dados a quem quisesse sem supervisão da Secretaria e Pastoral.

---

## 7. Telas e Experiência por Persona

Em atendimento à decisão **D8**, o Logos é um aplicativo único e mobile-first no padrão Nubank, cuja tela inicial se monta em **blocos modulares baseados nas atuações ativas da pessoa autenticada**:

### 1. Visitante (Página Web Pública, sem login, via QR Code no celular)

- Formulário curto e ultraleve (Nome, WhatsApp, e-mail opcional, autorização de contato explícita desmarcada).
- Confirmação acolhedora calibrada por momento da pessoa:
  - **1ª visita**: APENAS horários dos cultos da semana e confirmação da preferência de contato. Sem link do app e sem formulário longo. Foco total em acolhimento sem sobrecarga.
  - **2ª visita**: Formulário progressivo "Conte mais sobre você" como ação principal; link do app como ação secundária.
  - **3ª visita em diante**: Somente o que ainda falta preencher/atender (sem repetir convites concluídos).

### 2. Frequentador (Link web sem login, celular)

- Acesso à própria ficha cadastral para complementação e atualização voluntária.
- Convite claro para o próximo passo na caminhada bíblica (_"Quero ser batizado"_, _"Quero me tornar membro"_), gerando notificação imediata à Secretaria.

### 3. Membro (Login, celular / computador)

- **Carteirinha Digital** oficial em destaque com foto, status regular, matrícula e QR de validação.
- Programação dos cultos e eventos da semana da Defesa da Fé.
- "Meus Dados" com aviso proativo de pendências cadastrais (foto de carteirinha pendente, endereço desatualizado).
- Painel "Minha Família" com membros do mesmo núcleo.

### 4. Voluntário (Login, celular)

- Bloco **"Onde eu sirvo"**: Unidades departamentais, funções atribuídas, data de início e contato com seus respectivos líderes.
- _(Nota de contexto: Sem o módulo de escalas na versão atual, o voluntário comum consulta onde atua e suas funções ativas; o valor principal do MVP para voluntários está na equipe de Boas-Vindas)_.

### 5. Voluntário do Boas-Vindas (Login, celular, otimizado para operação com uma mão)

- **Modo Culto**: Culto da agenda em andamento aberto diretamente na tela.
- **Busca Rápida por Telefone**: Localização imediata do visitante para confirmação de presença com 1 toque.
- **Cadastro Rápido**: Para novos visitantes quando o telefone não existe.
- Indicador em tempo real de visitantes de primeira vez vs. retornos.
- Minhas tarefas de acolhimento (follow-up de 48h), ordenadas pelas vencidas primeiro.

### 6. Líder Departamental (Login, celular)

- **Minha Equipe**: Integrantes organizados por função e subdepartamento.
- **Gestão de Pessoas**: Colocar e retirar pessoas das funções, visualizando o checklist de requisitos e registrando aprovação.
- **Validação de Sobreposição**: Notificação impeditiva clara se o voluntário já possuir função conflitante.
- Gestão de funções e requisitos da respectiva unidade.

### 7. Líder do Boas-Vindas (Login, celular)

- Todas as capacidades do líder de departamento.
- Sugestões de frequentador para confirmação (critério R4 de frequência consistente).
- Gestão de tarefas atrasadas da equipe de recepção, com opção de redistribuição.

### 8. Secretaria (Login, preferencialmente computador / desktop)

- **Culto em Tempo Real**: Lista dinâmica de presenças do culto de hoje com distinção de origem (QR Code vs. Boas-Vindas).
- **Pendências Oficiais**: Fotos de carteirinha para homologação, divergências de cadastros do QR Code para conciliação, pedidos de batismo e ingresso na membresia.
- **Gestão de Estrutura**: Controle total de unidades, funções, requisitos e regras de sobreposição.
- Indicadores globais de adesão, retorno e conversão.

### 9. Pastor Titular / Pastoral (Login, celular / tablet)

- Indicadores executivos resumidos de frequência e saúde congregacional.
- Lista de Atenção Pastoral: Membros e frequentadores ausentes há semanas consecutivas (R10).
- Consulta pastoral unificada e lista do culto em tempo real.

---

## 8. Fluxo do Visitante via QR Code (QR Fixo — D11)

### Objetivo

Permitir que qualquer pessoa registre sua presença no culto em menos de 10 segundos, com zero atrito e sem se sentir "fichada" ou constrangida.

### Diagrama do Fluxo

```
[Escaneia QR Code fixo no banco]
           │
           ▼
[Aparelho reconhecido no localStorage?]
 ├─ SIM  ──► Exibe "Olá de novo, [Primeiro Nome]!"
 │            └─► Botão "Confirmar minha presença hoje"
 │            └─► Link "Não é você? Clique aqui para novo cadastro"
 │
 └─ NÃO  ──► Formulário curto (Nome + WhatsApp + E-mail opcional)
              │
              ▼
    [Telefone já cadastrado no banco?]
     ├─ NÃO ──► Cria novo registro de visitante
     └─ SIM ──► Utiliza cadastro existente
                 ├─ (Verifica divergências de nome/e-mail para Secretaria)
                 └─ (Verifica se nome indica possível familiar)
              │
              ▼
    [Culto da agenda em andamento dentro da tolerância?]
     ├─ SIM ──► Registra presença com origem `qr_code`
     └─ NÃO ──► Apenas salva/atualiza dados cadastrais (sem presença)
              │
              ▼
    [Tela de Confirmação Acolhedora Conforme Momento - D13]
     ├─ 1ª Visita:
     │    ├─ Agradecimento nominal acolhedor
     │    ├─ APENAS Horários dos cultos da semana
     │    ├─ Preferência de contato registrada
     │    └─ (SEM link de app e SEM formulário longo)
     │
     ├─ Follow-up pós-1ª visita (via WhatsApp pelo Boas-Vindas):
     │    └─ Mensagem pessoal com link do app web da igreja
     │
     ├─ 2ª Visita:
     │    ├─ Ação principal: Formulário "Conte mais sobre você" (Data nasc., Bairro, Como conheceu, Filhos)
     │    └─ Ação secundária: Link do app da igreja
     │
     └─ 3ª Visita em diante:
          └─ Apenas o que ainda falta (sem repetir convites concluídos)
```

### Tabela de Coleta Progressiva de Dados

| Momento                      | Canal                  | O que pedir / oferecer                                                                                                                                                 | Microcopy de propósito                                                       |
| ---------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **1ª visita**                | Página do QR Code      | Nome, telefone/WhatsApp, autorização de contato; e-mail opcional. Na confirmação: APENAS horários dos cultos e preferência de contato.                                 | "Para te dar as boas-vindas"                                                 |
| **Follow-up pós-1ª visita**  | WhatsApp (Boas-Vindas) | Nada de formulário na conversa; o voluntário anota o que surgir espontaneamente (ex.: quem convidou, família) e envia modelo pessoal com link do app.                  | Acolhimento, sem sensação de ficha                                           |
| **2ª visita**                | Página do QR Code      | Formulário "Conte mais sobre você" como ação principal; link do app como secundária. Pede: Data de nascimento, bairro, como conheceu a igreja, se tem filhos e idades. | "Para lembrarmos do seu aniversário e indicar programações para sua família" |
| **Virada para frequentador** | App / Link web         | Endereço residencial, núcleo familiar, se já é batizado e interesse em membresia ou batismo.                                                                           | Aproximar do caminho da membresia                                            |
| **Ingresso como membro**     | Secretaria Oficial     | Foto, data e local do batismo, estado civil, forma de ingresso e documentos do rol.                                                                                    | Registro oficial e carteirinha                                               |

### Regras de Interface da Coleta Progressiva (Obrigatórias)

1. **Máximo de 5 campos por etapa**: se precisar de mais, dividir em telas/passos curtos com indicador de progresso claro.
2. **Tudo opcional antes da membresia**, exceto nome e telefone (identificador único R3). Um formulário parcialmente preenchido vale mais que um abandonado.
3. **Microcopy de propósito ao lado de campos sensíveis**, explicitando por que a igreja solicita aquela informação.
4. **NUNCA pedir de novo o que já foi informado**: formulários devem ser pré-preenchidos com os dados que o sistema já possui (ex.: se o Boas-Vindas anotou filhos, o formulário já exibe pré-carregado).

### Regras de Negócio e Casos de Borda

1. **Primeira visita, telefone novo**: Cria cadastro de visitante e associa presença ao culto da agenda em andamento. Tela de confirmação exibe **estritamente horários da semana e preferência de contato**, sem link de app e sem formulário longo.
2. **Retorno pelo mesmo aparelho**: Aparelho identificado via token/armazenamento local. Exibe saudação calorosa e botão de confirmação com 1 clique. O link _"Não é você?"_ limpa a identificação local e abre o formulário vazio.
3. **Presença já registrada no mesmo culto**: O sistema identifica que a pessoa já está presente no culto atual e exibe confirmação informativa, não duplicando o registro.
4. **Segunda visita (D13 revisada)**: Exibe a confirmação de presença com destaque principal para o formulário "Conte mais sobre você" (aniversário, bairro, filhos, como conheceu) e link secundário do app.
5. **Terceira visita em diante**: Mostra apenas o que ainda não foi atendido ou preenchido. Se já preencheu o formulário completo, mostra apenas acolhimento e horários/app.
6. **Preenchimento repetido com telefone já existente**: Localiza o registro anterior pelo número e vincula a presença; nunca cria duplicata de pessoa com o mesmo telefone.
7. **Mesmo telefone com e-mail novo ou variação no nome**: Não sobrescreve os dados existentes bruscamente; registra um apontamento de **divergência cadastral** (`divergences`) para análise e conciliação pela Secretaria.
8. **Mesmo telefone com nome manifestamente diferente**: Se for submetido um nome diferente da pessoa titular do telefone, cria um novo cadastro de visitante marcado com a tag `"possivel_familiar"` e vincula a divergência para a Secretaria revisar a árvore familiar.
9. **Boas-Vindas registrou e visitante também escaneou**: O telefone une os registros. A presença permanece estritamente **única** no culto em questão.
10. **QR escaneado fora do horário de culto**: Salva/atualiza o cadastro do visitante, mas não gera presença artificial; informa que o cadastro foi acolhido.

### Privacidade e Tratamento de Dados Sensíveis

- **Confirmação Idêntica e Neutra**: Quando a pessoa digita um telefone no formulário avulso, a tela de confirmação é neutra e não revela dados pré-existentes. Nunca exibe _"Que bom ver você de volta!"_ com base exclusivamente no número digitado na hora, pois permitiria a terceiros descobrir se alguém frequenta a comunidade apenas digitando seu número. O _"Olá de novo"_ é restrito ao reconhecimento de token do **próprio aparelho físico** do usuário.
- **Origem da Presença**: O sistema armazena o campo `origin` (`qr_code` | `boas_vindas`) em cada presença registrada, permitindo aferir a eficácia de cada canal.
- **Risco Aceito (Documentado)**: Existe o risco residual de alguém escanear a foto do QR Code em sua residência durante a transmissão de um culto; o impacto pastoral desse cenário é mínimo e não justifica a complexidade de QR Codes dinâmicos por culto no MVP.

---

## 9. Roadmap Pós-MVP (Versões Posteriores)

Itens mapeados nas discussões de produto que **não integram o MVP atual**:

- **D5/D6/D7 (Camada de Supervisão)**: Entidade `supervisao` que agrupa múltiplos departamentos, com perfil de supervisor exclusivamente consultivo.
- **Módulo de Escalas Departamentais**: Geração de escalas mensais por culto, confirmação de presença de voluntários, substituições e trocas com validação de choques de horário.
- **Aprovação de Candidatos a Voluntário**: Fluxo formal de inscrição de membros em vagas ministeriais abertas, com triagem e aprovação pastoral.
