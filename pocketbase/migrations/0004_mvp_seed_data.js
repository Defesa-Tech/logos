migrate(
  (app) => {
    const departmentsCol = app.findCollectionByNameOrId('departments')
    const rolesCol = app.findCollectionByNameOrId('department_roles')
    const settingsCol = app.findCollectionByNameOrId('church_settings')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const personsCol = app.findCollectionByNameOrId('persons')
    const assignmentsCol = app.findCollectionByNameOrId('assignments')
    const cultosCol = app.findCollectionByNameOrId('cultos')
    const presencesCol = app.findCollectionByNameOrId('presences')
    const followUpsCol = app.findCollectionByNameOrId('follow_up_tasks')
    const stageHistoryCol = app.findCollectionByNameOrId('stage_history')

    // 1. Seed church_settings (R2, R4, R10 defaults)
    const defaultSettings = [
      {
        key: 'r2_form_presence',
        value: '2',
        description: 'Número da presença para envio do formulário de retorno',
      },
      {
        key: 'r4_frequentador_weeks_required',
        value: '3',
        description: 'Número de semanas distintas necessárias com presença',
      },
      {
        key: 'r4_frequentador_window_weeks',
        value: '8',
        description: 'Janela de semanas para análise de frequentador',
      },
      {
        key: 'r10_absence_attention_weeks',
        value: '8',
        description: 'Semanas consecutivas sem presença para lista de atenção',
      },
      {
        key: 'church_denomination',
        value: 'Defesa da Fé',
        description: 'Denominação da igreja sede',
      },
    ]

    for (const st of defaultSettings) {
      try {
        app.findFirstRecordByData('church_settings', 'key', st.key)
      } catch (_) {
        const r = new Record(settingsCol)
        r.set('key', st.key)
        r.set('value', st.value)
        r.set('description', st.description)
        app.save(r)
      }
    }

    // 2. Seed departments: Música, Mídia, Coral, Boas-Vindas, Secretaria, Pastoral
    const deptsData = [
      {
        code: 'secretaria',
        name: 'Secretaria',
        description: 'Gestão oficial de membresia, atuações e histórico',
      },
      {
        code: 'boas_vindas',
        name: 'Boas-Vindas',
        description: 'Recepção, registro de presença e follow-up de visitantes',
      },
      { code: 'pastoral', name: 'Pastoral', description: 'Cuidado e consulta pastoral global' },
      { code: 'musica', name: 'Música', description: 'Ministério de louvor e instrumentos' },
      { code: 'midia', name: 'Mídia', description: 'Transmissão, áudio e projeção' },
      { code: 'coral', name: 'Coral', description: 'Coral congregacional e vozes' },
    ]

    const deptMap = {}
    for (const d of deptsData) {
      let rec
      try {
        rec = app.findFirstRecordByData('departments', 'code', d.code)
      } catch (_) {
        rec = new Record(departmentsCol)
        rec.set('code', d.code)
        rec.set('name', d.name)
        rec.set('description', d.description)
        app.save(rec)
      }
      deptMap[d.code] = rec
    }

    // 3. Seed department_roles
    const rolesData = [
      {
        dept: 'secretaria',
        name: 'Secretário(a) Geral',
        level: 'lider',
        permissions: 'secretaria_full',
      },
      {
        dept: 'secretaria',
        name: 'Auxiliar de Secretaria',
        level: 'voluntario',
        permissions: 'secretaria_aux',
      },
      {
        dept: 'boas_vindas',
        name: 'Líder de Boas-Vindas',
        level: 'lider',
        permissions: 'boas_vindas_lider',
      },
      {
        dept: 'boas_vindas',
        name: 'Voluntário de Recepção',
        level: 'voluntario',
        permissions: 'boas_vindas_voluntario',
      },
      { dept: 'pastoral', name: 'Pastor Titular', level: 'lider', permissions: 'pastor_view_all' },
      {
        dept: 'pastoral',
        name: 'Pastor Auxiliar',
        level: 'voluntario',
        permissions: 'pastor_view_all',
      },
      { dept: 'musica', name: 'Líder de Música', level: 'lider', permissions: 'musica_lider' },
      { dept: 'musica', name: 'Baterista', level: 'voluntario', permissions: 'musica_voluntario' },
      { dept: 'musica', name: 'Vocalista', level: 'voluntario', permissions: 'musica_voluntario' },
      { dept: 'midia', name: 'Líder de Mídia', level: 'lider', permissions: 'midia_lider' },
      {
        dept: 'midia',
        name: 'Técnico de Áudio',
        level: 'voluntario',
        permissions: 'midia_voluntario',
      },
      { dept: 'coral', name: 'Líder do Coral', level: 'lider', permissions: 'coral_lider' },
      { dept: 'coral', name: 'Coralista', level: 'voluntario', permissions: 'coral_voluntario' },
    ]

    const roleMap = {}
    for (const r of rolesData) {
      const key = `${r.dept}_${r.name}`
      try {
        const found = app.findFirstRecordByData('department_roles', 'name', r.name)
        roleMap[key] = found
      } catch (_) {
        const rec = new Record(rolesCol)
        rec.set('department', deptMap[r.dept].id)
        rec.set('name', r.name)
        rec.set('level', r.level)
        rec.set('permissions', r.permissions)
        app.save(rec)
        roleMap[key] = rec
      }
    }

    // 4. Update existing Secretary person Clériston Lima to Member stage and assign Secretaria role
    let pSec
    try {
      pSec = app.findFirstRecordByData('persons', 'email', 'cleristonx.lima@gmail.com')
      pSec.set('stage', 'membro')
      pSec.set('phone', pSec.getString('whatsapp') || '(11) 98765-4321')
      pSec.set('provisional_number', 'MAT-0001')
      pSec.set('contact_authorized', true)
      pSec.set('ingress_form', 'profissao_de_fe')
      pSec.set('card_photo_status', 'aprovada')
      app.save(pSec)

      // Ensure assignment to Secretaria Geral
      const secRole = roleMap['secretaria_Secretário(a) Geral']
      if (secRole) {
        try {
          app.findFirstRecordByData('assignments', 'person', pSec.id)
        } catch (_) {
          const asg = new Record(assignmentsCol)
          asg.set('person', pSec.id)
          asg.set('role', secRole.id)
          asg.set('start_date', '2024-01-01 00:00:00.000Z')
          asg.set('status', 'ativa')
          asg.set('notes', 'Atuação permanente de Secretaria Geral')
          app.save(asg)
        }
      }
    } catch (_) {}

    // Update Pr. Marcos Andrade to Pastoral role & member stage
    try {
      const pPastor = app.findFirstRecordByData('persons', 'name', 'Pr. Marcos Andrade')
      pPastor.set('stage', 'membro')
      pPastor.set('phone', pPastor.getString('whatsapp') || '(11) 99123-1122')
      pPastor.set('provisional_number', 'MAT-0002')
      pPastor.set('contact_authorized', true)
      pPastor.set('card_photo_status', 'aprovada')
      app.save(pPastor)

      const pastRole = roleMap['pastoral_Pastor Titular']
      if (pastRole) {
        try {
          app.findFirstRecordByData('assignments', 'person', pPastor.id)
        } catch (_) {
          const asg = new Record(assignmentsCol)
          asg.set('person', pPastor.id)
          asg.set('role', pastRole.id)
          asg.set('start_date', '2023-01-01 00:00:00.000Z')
          asg.set('status', 'ativa')
          asg.set('notes', 'Atuação pastoral titular')
          app.save(asg)
        }
      }
    } catch (_) {}

    // 5. Seed today's Culto & recent Cultos for J1, J2, J4, J5
    let cultToday, cultPast1, cultPast2, cultPast3
    try {
      cultToday = app.findFirstRecordByData('cultos', 'name', 'Culto da Palavra (Domingo)')
    } catch (_) {
      cultToday = new Record(cultosCol)
      cultToday.set('name', 'Culto da Palavra (Domingo)')
      cultToday.set('date_time', new Date().toISOString())
      cultToday.set('is_regular', true)
      cultToday.set('status', 'aberto')
      cultToday.set('anonymous_count', 3)
      cultToday.set('notes', 'Culto matutino com celebração da Ceia do Senhor')
      app.save(cultToday)
    }

    try {
      cultPast1 = app.findFirstRecordByData('cultos', 'name', 'Culto de Celebração (Semana -1)')
    } catch (_) {
      const d1 = new Date()
      d1.setDate(d1.getDate() - 7)
      cultPast1 = new Record(cultosCol)
      cultPast1.set('name', 'Culto de Celebração (Semana -1)')
      cultPast1.set('date_time', d1.toISOString())
      cultPast1.set('is_regular', true)
      cultPast1.set('status', 'arquivado')
      cultPast1.set('anonymous_count', 2)
      app.save(cultPast1)
    }

    try {
      cultPast2 = app.findFirstRecordByData('cultos', 'name', 'Culto da Palavra (Semana -2)')
    } catch (_) {
      const d2 = new Date()
      d2.setDate(d2.getDate() - 14)
      cultPast2 = new Record(cultosCol)
      cultPast2.set('name', 'Culto da Palavra (Semana -2)')
      cultPast2.set('date_time', d2.toISOString())
      cultPast2.set('is_regular', true)
      cultPast2.set('status', 'arquivado')
      cultPast2.set('anonymous_count', 4)
      app.save(cultPast2)
    }

    try {
      cultPast3 = app.findFirstRecordByData('cultos', 'name', 'Culto de Doutrina (Semana -3)')
    } catch (_) {
      const d3 = new Date()
      d3.setDate(d3.getDate() - 21)
      cultPast3 = new Record(cultosCol)
      cultPast3.set('name', 'Culto de Doutrina (Semana -3)')
      cultPast3.set('date_time', d3.toISOString())
      cultPast3.set('is_regular', true)
      cultPast3.set('status', 'arquivado')
      cultPast3.set('anonymous_count', 1)
      app.save(cultPast3)
    }

    // 6. SEED THE 6 SPEC PERSONAS (Ana, Bruno, Carla, Davi, Eduardo, Fernanda)

    // Persona 1: Ana - Visitante de primeira vez (J1, J2, J3)
    let pAna
    try {
      pAna = app.findFirstRecordByData('persons', 'name', 'Ana Santos (Visitante 1ª vez)')
    } catch (_) {
      pAna = new Record(personsCol)
      pAna.set('name', 'Ana Santos (Visitante 1ª vez)')
      pAna.set('phone', '(11) 98111-2233')
      pAna.set('whatsapp', '(11) 98111-2233')
      pAna.set('email', 'ana.visitante@exemplo.com')
      pAna.set('stage', 'visitante')
      pAna.set('status', 'visitor')
      pAna.set('how_found', 'Convite de amigo do trabalho')
      pAna.set('how_met', 'Convite de amigo do trabalho')
      pAna.set('contact_authorized', true)
      pAna.set('contact_auth_date', new Date().toISOString())
      pAna.set('contact_auth_by', 'Voluntário Boas-Vindas')
      app.save(pAna)

      // Stage history
      const hist = new Record(stageHistoryCol)
      hist.set('person', pAna.id)
      hist.set('from_stage', 'inicio')
      hist.set('to_stage', 'visitante')
      hist.set('date', new Date().toISOString())
      hist.set('author_name', 'Voluntário Boas-Vindas')
      hist.set('reason', 'Primeira visita no culto')
      app.save(hist)

      // Presence in today's culto
      const pres = new Record(presencesCol)
      pres.set('culto', cultToday.id)
      pres.set('person', pAna.id)
      pres.set('modality', 'presencial')
      pres.set('presence_type', 'primeira_visita')
      pres.set('registered_by_name', 'Recepção Boas-Vindas')
      app.save(pres)

      // Follow-up task with 48h deadline
      const due = new Date()
      due.setHours(due.getHours() + 48)
      const task = new Record(followUpsCol)
      task.set('person', pAna.id)
      task.set('responsible_name', 'Voluntário de Recepção')
      task.set('due_date', due.toISOString())
      task.set('status', 'aberta')
      task.set('result', 'pendente')
      task.set('notes', 'Fazer contato telefônico acolhedor nas primeiras 48h pós-culto')
      app.save(task)
    }

    // Persona 2: Bruno - Visitante que retorna em 3 semanas diferentes em 8 semanas (J1, J4, J5)
    let pBruno
    try {
      pBruno = app.findFirstRecordByData('persons', 'name', 'Bruno Oliveira (Retorno R4)')
    } catch (_) {
      pBruno = new Record(personsCol)
      pBruno.set('name', 'Bruno Oliveira (Retorno R4)')
      pBruno.set('phone', '(11) 98222-3344')
      pBruno.set('whatsapp', '(11) 98222-3344')
      pBruno.set('email', 'bruno.retorno@exemplo.com')
      pBruno.set('stage', 'visitante')
      pBruno.set('status', 'visitor')
      pBruno.set('how_found', 'Instagram da Igreja')
      pBruno.set('how_met', 'Instagram da Igreja')
      pBruno.set('contact_authorized', true)
      pBruno.set('contact_auth_date', cultPast2.getString('date_time'))
      pBruno.set('contact_auth_by', 'Recepção')
      app.save(pBruno)

      // Stage history
      const hist = new Record(stageHistoryCol)
      hist.set('person', pBruno.id)
      hist.set('from_stage', 'inicio')
      hist.set('to_stage', 'visitante')
      hist.set('date', cultPast2.getString('date_time'))
      hist.set('author_name', 'Recepção')
      hist.set('reason', 'Primeira visita')
      app.save(hist)

      // 3 presences in 3 different weeks
      const p1 = new Record(presencesCol)
      p1.set('culto', cultPast2.id)
      p1.set('person', pBruno.id)
      p1.set('modality', 'presencial')
      p1.set('presence_type', 'primeira_visita')
      p1.set('registered_by_name', 'Recepção Boas-Vindas')
      app.save(p1)

      const p2 = new Record(presencesCol)
      p2.set('culto', cultPast1.id)
      p2.set('person', pBruno.id)
      p2.set('modality', 'presencial')
      p2.set('presence_type', 'retorno')
      p2.set('registered_by_name', 'Recepção Boas-Vindas')
      app.save(p2)

      const p3 = new Record(presencesCol)
      p3.set('culto', cultToday.id)
      p3.set('person', pBruno.id)
      p3.set('modality', 'presencial')
      p3.set('presence_type', 'retorno')
      p3.set('registered_by_name', 'Recepção Boas-Vindas')
      app.save(p3)

      // Completed follow-up task
      const task = new Record(followUpsCol)
      task.set('person', pBruno.id)
      task.set('responsible_name', 'Voluntário de Recepção')
      task.set('due_date', new Date().toISOString())
      task.set('status', 'concluida')
      task.set('result', 'conversou')
      task.set('completed_at', new Date().toISOString())
      task.set('notes', 'Bruno gostou muito dos cultos e está frequentando com regularidade.')
      app.save(task)
    }

    // Persona 3: Carla - Frequentadora batizada em outra igreja que pede para ser membro (J6, J7, J8)
    let pCarla
    try {
      pCarla = app.findFirstRecordByData('persons', 'name', 'Carla Mendes (Pronta p/ Membro)')
    } catch (_) {
      pCarla = new Record(personsCol)
      pCarla.set('name', 'Carla Mendes (Pronta p/ Membro)')
      pCarla.set('phone', '(11) 98333-4455')
      pCarla.set('whatsapp', '(11) 98333-4455')
      pCarla.set('email', 'carla.mendes@exemplo.com')
      pCarla.set('stage', 'frequentador')
      pCarla.set('status', 'attender')
      pCarla.set('contact_authorized', true)
      pCarla.set('address', 'Rua das Flores, 204 - Bairro Esperança')
      pCarla.set('birth_date', '1995-05-12 00:00:00.000Z')
      pCarla.set('baptism_date', '2018-09-15 00:00:00.000Z')
      pCarla.set('baptism_location', 'outra_igreja')
      pCarla.set('baptism_church_name', 'Primeira Igreja Batista de Santos')
      pCarla.set('card_photo_status', 'pendente')
      pCarla.set('card_photo_url', 'https://img.usecurling.com/ppl/medium?gender=female&seed=42')
      app.save(pCarla)

      const hist = new Record(stageHistoryCol)
      hist.set('person', pCarla.id)
      hist.set('from_stage', 'visitante')
      hist.set('to_stage', 'frequentador')
      hist.set('date', cultPast3.getString('date_time'))
      hist.set('author_name', 'Líder de Boas-Vindas')
      hist.set('reason', 'Critério R4 confirmado pelo líder')
      app.save(hist)
    }

    // Persona 4: Davi - Frequentador sem batismo (BLOQUEADO R6 para Membro)
    let pDavi
    try {
      pDavi = app.findFirstRecordByData('persons', 'name', 'Davi Souza (Bloqueado R6 sem batismo)')
    } catch (_) {
      pDavi = new Record(personsCol)
      pDavi.set('name', 'Davi Souza (Bloqueado R6 sem batismo)')
      pDavi.set('phone', '(11) 98444-5566')
      pDavi.set('whatsapp', '(11) 98444-5566')
      pDavi.set('email', 'davi.souza@exemplo.com')
      pDavi.set('stage', 'frequentador')
      pDavi.set('status', 'attender')
      pDavi.set('contact_authorized', true)
      pDavi.set('address', 'Av. Brasil, 1500')
      pDavi.set(
        'notes',
        'Interessado em se tornar membro, porém AINDA NÃO BATIZADO. Deve ser bloqueado pela regra R6.',
      )
      app.save(pDavi)

      const hist = new Record(stageHistoryCol)
      hist.set('person', pDavi.id)
      hist.set('from_stage', 'visitante')
      hist.set('to_stage', 'frequentador')
      hist.set('date', cultPast2.getString('date_time'))
      hist.set('author_name', 'Líder de Boas-Vindas')
      hist.set('reason', 'Presenças acumuladas')
      app.save(hist)
    }

    // Persona 5: Eduardo - Membro com 3 atuações acumuladas (Baterista, Técnico de Áudio, Líder do Coral) (J9)
    let pEduardo
    try {
      pEduardo = app.findFirstRecordByData(
        'persons',
        'name',
        'Eduardo Lima (3 Atuações Acumuladas)',
      )
    } catch (_) {
      pEduardo = new Record(personsCol)
      pEduardo.set('name', 'Eduardo Lima (3 Atuações Acumuladas)')
      pEduardo.set('phone', '(11) 98555-6677')
      pEduardo.set('whatsapp', '(11) 98555-6677')
      pEduardo.set('email', 'eduardo.lima@exemplo.com')
      pEduardo.set('stage', 'membro')
      pEduardo.set('status', 'member')
      pEduardo.set('contact_authorized', true)
      pEduardo.set('baptism_date', '2015-06-20 00:00:00.000Z')
      pEduardo.set('baptism_location', 'defesa_da_fe')
      pEduardo.set('ingress_date', '2015-07-01 00:00:00.000Z')
      pEduardo.set('ingress_form', 'batismo')
      pEduardo.set('provisional_number', 'MAT-0003')
      pEduardo.set('card_photo_status', 'aprovada')
      pEduardo.set('card_photo_url', 'https://img.usecurling.com/ppl/medium?gender=male&seed=15')
      app.save(pEduardo)

      // Atuação 1: Baterista na Música
      const roleBat = roleMap['musica_Baterista']
      if (roleBat) {
        const asg1 = new Record(assignmentsCol)
        asg1.set('person', pEduardo.id)
        asg1.set('role', roleBat.id)
        asg1.set('start_date', '2023-03-01 00:00:00.000Z')
        asg1.set('status', 'ativa')
        asg1.set('notes', 'Baterista da equipe principal de louvor')
        app.save(asg1)
      }

      // Atuação 2: Técnico de Áudio na Mídia
      const roleAud = roleMap['midia_Técnico de Áudio']
      if (roleAud) {
        const asg2 = new Record(assignmentsCol)
        asg2.set('person', pEduardo.id)
        asg2.set('role', roleAud.id)
        asg2.set('start_date', '2023-08-10 00:00:00.000Z')
        asg2.set('status', 'ativa')
        asg2.set('notes', 'Operação da mesa de som nos cultos de domingo')
        app.save(asg2)
      }

      // Atuação 3: Líder do Coral
      const roleCoral = roleMap['coral_Líder do Coral']
      if (roleCoral) {
        const asg3 = new Record(assignmentsCol)
        asg3.set('person', pEduardo.id)
        asg3.set('role', roleCoral.id)
        asg3.set('start_date', '2024-03-01 00:00:00.000Z')
        asg3.set('status', 'ativa')
        asg3.set('notes', 'Liderança dos ensaios e regência do coral')
        app.save(asg3)
      }
    }

    // Persona 6: Fernanda - Membro do Boas-Vindas que sai (J3, J9, J7: atuações encerradas, carteirinha inválida)
    let pFernanda
    try {
      pFernanda = app.findFirstRecordByData('persons', 'name', 'Fernanda Alves (Saída R9/J9)')
    } catch (_) {
      pFernanda = new Record(personsCol)
      pFernanda.set('name', 'Fernanda Alves (Saída R9/J9)')
      pFernanda.set('phone', '(11) 98666-7788')
      pFernanda.set('whatsapp', '(11) 98666-7788')
      pFernanda.set('email', 'fernanda.alves@exemplo.com')
      pFernanda.set('stage', 'desligado')
      pFernanda.set('status', 'visitor')
      pFernanda.set('contact_authorized', false)
      pFernanda.set('provisional_number', 'MAT-0004')
      pFernanda.set('exit_reason', 'mudanca')
      pFernanda.set('card_photo_status', 'aprovada')
      pFernanda.set(
        'notes',
        'Mudou de cidade em Junho/2024. Atuações encerradas e carteirinha invalidada perante regra R9.',
      )
      app.save(pFernanda)

      const hist = new Record(stageHistoryCol)
      hist.set('person', pFernanda.id)
      hist.set('from_stage', 'membro')
      hist.set('to_stage', 'desligado')
      hist.set('date', '2024-06-30 00:00:00.000Z')
      hist.set('author_name', 'Secretaria Clériston')
      hist.set('reason', 'Mudança de município (R9: atuações encerradas)')
      app.save(hist)

      // Atuação encerrada de Voluntária de Boas-Vindas
      const roleRecep = roleMap['boas_vindas_Voluntário de Recepção']
      if (roleRecep) {
        const asg = new Record(assignmentsCol)
        asg.set('person', pFernanda.id)
        asg.set('role', roleRecep.id)
        asg.set('start_date', '2023-02-01 00:00:00.000Z')
        asg.set('end_date', '2024-06-30 00:00:00.000Z')
        asg.set('status', 'encerrada')
        asg.set('notes', 'Encerrada automaticamente por saída da membresia (R9)')
        app.save(asg)
      }
    }
  },
  (app) => {
    // down migration
  },
)
