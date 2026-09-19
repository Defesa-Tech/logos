# Mapeamento das 25 Telas Extraídas — Sistema Logos

Este documento cataloga as 25 telas contidas no arquivo de projeto original (`src/assets/logos-app-de-gestao-de-igreja-6af67.html`), descompactadas e armazenadas como artefatos HTML estáticos independentes em `extracted/pages/`.

Arquivo resumo gerado automaticamente: `extracted/summary.json`.

---

## Índice das Telas Extraídas

| #   | Título da Tela                         | Arquivo HTML em `extracted/pages/`         | Visualização / Dispositivo |
| --- | -------------------------------------- | ------------------------------------------ | -------------------------- |
| 1   | **Login · Celular**                    | `01_Login_Celular.html`                    | Mobile (Celular)           |
| 2   | **Login · Desktop**                    | `02_Login_Desktop.html`                    | Desktop                    |
| 3   | **Home · Membro voluntário**           | `03_Home_Membro_voluntário.html`           | Mobile (Celular)           |
| 4   | **Home · Membro comum**                | `04_Home_Membro_comum.html`                | Mobile (Celular)           |
| 5   | **Home Desktop · Membro voluntário**   | `05_Home_Desktop_Membro_voluntário.html`   | Desktop                    |
| 6   | **Home Desktop · Membro comum**        | `06_Home_Desktop_Membro_comum.html`        | Desktop                    |
| 7   | **Meu perfil · Celular**               | `07_Meu_perfil_Celular.html`               | Mobile (Celular)           |
| 8   | **Meu perfil · Desktop**               | `08_Meu_perfil_Desktop.html`               | Desktop                    |
| 9   | **Carteirinha digital · Celular**      | `09_Carteirinha_digital_Celular.html`      | Mobile (Celular)           |
| 10  | **Perfil · Dados pessoais**            | `10_Perfil_Dados_pessoais.html`            | Mobile / Modal             |
| 11  | **Perfil · Vínculos**                  | `11_Perfil_Vínculos.html`                  | Mobile / Modal             |
| 12  | **Perfil · Talentos**                  | `12_Perfil_Talentos.html`                  | Mobile / Modal             |
| 13  | **Perfil · Minha vida na igreja**      | `13_Perfil_Minha_vida_na_igreja.html`      | Mobile / Modal             |
| 14  | **Agenda · Celular**                   | `14_Agenda_Celular.html`                   | Mobile (Celular)           |
| 15  | **Agenda · Desktop**                   | `15_Agenda_Desktop.html`                   | Desktop                    |
| 16  | **Informar disponibilidade · Celular** | `16_Informar_disponibilidade_Celular.html` | Mobile (Celular)           |
| 17  | **Bloquear período · Celular**         | `17_Bloquear_período_Celular.html`         | Mobile (Celular)           |
| 18  | **Igreja · Celular**                   | `18_Igreja_Celular.html`                   | Mobile (Celular)           |
| 19  | **Departamento · Celular**             | `19_Departamento_Celular.html`             | Mobile (Celular)           |
| 20  | **Igreja · Desktop**                   | `20_Igreja_Desktop.html`                   | Desktop                    |
| 21  | **Igreja · Quem somos**                | `21_Igreja_Quem_somos.html`                | Geral / Institucional      |
| 22  | **Página pública · Celular**           | `22_Página_pública_Celular.html`           | Mobile (Celular)           |
| 23  | **Página pública · Desktop**           | `23_Página_pública_Desktop.html`           | Desktop                    |
| 24  | **Avisos · Celular**                   | `24_Avisos_Celular.html`                   | Mobile (Celular)           |
| 25  | **Avisos · Desktop**                   | `25_Avisos_Desktop.html`                   | Desktop                    |

---

## Detalhamento por Módulo Funcional

### 1. Autenticação & Acesso

- **`01_Login_Celular.html`**: Formulário de login adaptado para tela de celular, com campos de identificação (e-mail/telefone) e senha, além de links de recuperação.
- **`02_Login_Desktop.html`**: Layout responsivo desktop para login administrativo e de membros.

### 2. Visão Geral (Home / Dashboard)

- **`03_Home_Membro_voluntário.html`**: Tela inicial mobile do membro ativo em ministérios/voluntariado (destaque para escalas, avisos e check-in).
- **`04_Home_Membro_comum.html`**: Tela inicial mobile para membros sem atribuição ministerial ativa (cultos da semana, avisos gerais e dízimos/ofertas).
- **`05_Home_Desktop_Membro_voluntário.html`**: Painel desktop completo para voluntários com atalhos de escalas e tarefas ministeriais.
- **`06_Home_Desktop_Membro_comum.html`**: Painel desktop simplificado para membros regulares.

### 3. Perfil do Membro & Carteirinha Digital

- **`07_Meu_perfil_Celular.html`**: Central mobile do perfil com atalhos para seções cadastrais e credencial.
- **`08_Meu_perfil_Desktop.html`**: Visualização desktop consolidada do membro da igreja.
- **`09_Carteirinha_digital_Celular.html`**: Carteirinha virtual de membro com foto, dados e QR code para validação presencial.
- **`10_Perfil_Dados_pessoais.html`**: Formulário de atualização cadastral (nome, data de nascimento, documentos, endereço, contato).
- **`11_Perfil_Vínculos.html`**: Gestão de vínculos familiares e eclesiásticos (cônjuge, filhos, responsáveis).
- **`12_Perfil_Talentos.html`**: Mapeamento de dons espirituais, habilidades práticas e interesses de atuação ministerial.
- **`13_Perfil_Minha_vida_na_igreja.html`**: Linha do tempo e histórico ministerial, batismo, cursos concluídos e marcos eclesiásticos.

### 4. Escalas, Agenda & Disponibilidade Ministerial

- **`14_Agenda_Celular.html`**: Calendário e eventos mobile com destaques das convocações de serviço.
- **`15_Agenda_Desktop.html`**: Calendário desktop completo com visualização mensal/semanal de eventos e cultos.
- **`16_Informar_disponibilidade_Celular.html`**: Interface rápida para voluntários confirmarem os dias e horários em que podem servir.
- **`17_Bloquear_período_Celular.html`**: Registro de indisponibilidade temporária (férias, viagens, compromissos pessoais) para evitar escalação automática.

### 5. Departamentos & Vida Institucional da Igreja

- **`18_Igreja_Celular.html`**: Visão mobile da congregação, pastores, lideranças e ministérios.
- **`19_Departamento_Celular.html`**: Página interna de um departamento específico (ex: Louvor, Recepção, Infantil) com escalas e comunicados.
- **`20_Igreja_Desktop.html`**: Visão institucional ampla em desktop para acompanhamento de departamentos e grupos.
- **`21_Igreja_Quem_somos.html`**: Página informativa sobre a missão, visão de fé, liderança pastoral e história da igreja Defesa da Fé.

### 6. Página Pública & Comunicação

- **`22_Página_pública_Celular.html`**: Portal público de visitantes para visualização em smartphone (horários de culto, localização, boas-vindas).
- **`23_Página_pública_Desktop.html`**: Landing page pública desktop voltada para visitantes, com convite e formulário de contato.
- **`24_Avisos_Celular.html`**: Mural de notícias e recados gerais em formato mobile card.
- **`25_Avisos_Desktop.html`**: Central de comunicados e mural informativo em formato desktop.
