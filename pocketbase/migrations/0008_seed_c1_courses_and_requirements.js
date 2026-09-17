migrate(
  (app) => {
    // 1. Criar curso padrão C1
    const coursesCol = app.findCollectionByNameOrId('courses')
    let c1Course
    try {
      c1Course = app.findFirstRecordByData('courses', 'code', 'c1')
    } catch (_) {
      c1Course = new Record(coursesCol)
      c1Course.set('name', 'C1 — Curso de Fundamentos & Serviço')
      c1Course.set('code', 'c1')
      c1Course.set(
        'description',
        'Curso padrão preparatório para membresia e voluntariado na Igreja Defesa da Fé.',
      )
      c1Course.set('is_active', true)
      app.save(c1Course)
    }

    // 2. Criar turmas do C1 (uma aberta e uma concluída)
    const classesCol = app.findCollectionByNameOrId('course_classes')
    let openClass
    try {
      openClass = app.findFirstRecordByData('course_classes', 'name', 'Turma C1 — Março/Abril 2026')
    } catch (_) {
      openClass = new Record(classesCol)
      openClass.set('course', c1Course.id)
      openClass.set('name', 'Turma C1 — Março/Abril 2026')
      openClass.set('start_date', '2026-03-01 00:00:00.000Z')
      openClass.set('end_date', '2026-04-15 00:00:00.000Z')
      openClass.set('capacity', 35)
      openClass.set('status', 'aberta')
      openClass.set('schedule_info', 'Domingos, às 08h30 (antes do Culto da Palavra)')
      openClass.set('location', 'Sala de Treinamento 01 / Anexo Logos')
      app.save(openClass)
    }

    let pastClass
    try {
      pastClass = app.findFirstRecordByData('course_classes', 'name', 'Turma C1 — 2025/2')
    } catch (_) {
      pastClass = new Record(classesCol)
      pastClass.set('course', c1Course.id)
      pastClass.set('name', 'Turma C1 — 2025/2')
      pastClass.set('start_date', '2025-08-01 00:00:00.000Z')
      pastClass.set('end_date', '2025-10-30 00:00:00.000Z')
      pastClass.set('capacity', 40)
      pastClass.set('status', 'concluida')
      pastClass.set('schedule_info', 'Turma oficial de líderes e voluntários pioneiros')
      pastClass.set('location', 'Auditório Principal')
      app.save(pastClass)
    }

    // 3. Criar Requisito padrão de Nível Igreja: C1 Concluído (definido pela secretaria)
    const churchReqsCol = app.findCollectionByNameOrId('church_requirements')
    let c1ChurchReq
    try {
      c1ChurchReq = app.findFirstRecordByData('church_requirements', 'code', 'c1_concluido')
    } catch (_) {
      c1ChurchReq = new Record(churchReqsCol)
      c1ChurchReq.set('title', 'C1 Concluído')
      c1ChurchReq.set('code', 'c1_concluido')
      c1ChurchReq.set(
        'description',
        'Requisito padrão da Igreja Defesa da Fé: conclusão do C1 obrigatória para qualquer função.',
      )
      c1ChurchReq.set('is_active', true)
      c1ChurchReq.set('is_default', true)
      c1ChurchReq.set('course_linked', c1Course.id)
      app.save(c1ChurchReq)
    }

    // 4. Adicionar Requisitos de Nível Departamento de exemplo na unidade de Música
    const departmentsCol = app.findCollectionByNameOrId('departments')
    try {
      const musicaDept = app.findFirstRecordByData('departments', 'code', 'musica')
      musicaDept.set('requirements', [
        {
          id: 'dept_req_entrevista_musica',
          title: 'Entrevista com o Líder da Música',
          description: 'Avaliação pastoral e alinhamento de chamado com a liderança ministerial',
        },
      ])
      app.save(musicaDept)
    } catch (_) {}

    // 5. Inscrições e Conclusões para Voluntários atuais (Eduardo Lima, Clériston, etc.)
    // IMPORTANTE: Conforme especificado pelo usuário, voluntários atuais na migração do rol
    // precisam entrar com C1 concluído para que suas atuações continuem ativas e válidas.
    const enrollmentsCol = app.findCollectionByNameOrId('course_enrollments')
    const personsCol = app.findCollectionByNameOrId('persons')

    const seedC1Completed = (emailOrPhone, reason) => {
      try {
        let p
        try {
          p = app.findFirstRecordByData('persons', 'email', emailOrPhone)
        } catch (_) {
          p = app.findFirstRecordByData('persons', 'phone', emailOrPhone)
        }
        if (!p) return

        // Verifica se já tem inscrição
        try {
          app.findFirstRecordByData('course_enrollments', 'person', p.id)
        } catch (_) {
          const enr = new Record(enrollmentsCol)
          enr.set('course_class', pastClass.id)
          enr.set('course', c1Course.id)
          enr.set('person', p.id)
          enr.set('status', 'concluido')
          enr.set('enrollment_date', '2025-08-01 00:00:00.000Z')
          enr.set('completion_date', '2025-10-30 00:00:00.000Z')
          enr.set('completed_by', 'Secretaria Oficial')
          enr.set('notes', reason || 'Conclusão registrada via migração do rol')
          app.save(enr)
        }
      } catch (_) {}
    }

    // Clériston Lima (Admin / Secretaria)
    seedC1Completed('cleristonx.lima@gmail.com', 'Membro pioneiro / Secretaria')
    // Pr. Marcos Andrade
    seedC1Completed('pastor.marcos@logosigreja.com.br', 'Pastor Titular')
    // Eduardo Lima (3 atuações acumuladas)
    seedC1Completed('eduardo.lima@exemplo.com', 'Membro com 3 atuações ativas')
    // Carlos Eduardo Silva
    seedC1Completed('carlos.silva@email.com', 'Líder de Pequeno Grupo')
    // Ana Carolina Silva
    seedC1Completed('ana.silva@email.com', 'Membro do rol')

    // 6. Criar Perfil de Serviço na jornada para Eduardo Lima e um frequentador (ex: Mariana Duarte)
    const volunteerProfilesCol = app.findCollectionByNameOrId('volunteer_profiles')
    try {
      const eduardo = app.findFirstRecordByData('persons', 'email', 'eduardo.lima@exemplo.com')
      if (eduardo) {
        try {
          app.findFirstRecordByData('volunteer_profiles', 'person', eduardo.id)
        } catch (_) {
          const prof = new Record(volunteerProfilesCol)
          prof.set('person', eduardo.id)
          prof.set('skills', ['Bateria', 'Mesa de Som', 'Canto Coral'])
          prof.set('interested_departments', ['Música', 'Mídia', 'Coral'])
          prof.set('availability', 'Domingos de manhã e noites de quarta')
          prof.set('notes', 'Disponibilidade ampla para apoio aos cultos')
          prof.set('notify_when_c1_opens', false)
          app.save(prof)
        }
      }
    } catch (_) {}

    try {
      const mariana = app.findFirstRecordByData('persons', 'email', 'mariana.duarte@email.com')
      if (mariana) {
        try {
          app.findFirstRecordByData('volunteer_profiles', 'person', mariana.id)
        } catch (_) {
          const prof = new Record(volunteerProfilesCol)
          prof.set('person', mariana.id)
          prof.set('skills', ['Recepção', 'Acolhimento', 'Comunicação'])
          prof.set('interested_departments', ['Boas-Vindas'])
          prof.set('availability', 'Domingos de manhã')
          prof.set('notes', 'Frequentadora interessada em servir no Boas-Vindas')
          prof.set('notify_when_c1_opens', true)
          app.save(prof)

          // Inscrever Mariana na turma aberta do C1 (membros e frequentadores podem se inscrever)
          const enr = new Record(enrollmentsCol)
          enr.set('course_class', openClass.id)
          enr.set('course', c1Course.id)
          enr.set('person', mariana.id)
          enr.set('status', 'inscrito')
          enr.set('enrollment_date', '2026-03-05 00:00:00.000Z')
          enr.set('notes', 'Inscrição self-service pela jornada Quero servir')
          app.save(enr)
        }
      }
    } catch (_) {}

    // 7. Criar uma Dispensa de Exemplo pela Secretaria (com justificativa) para demonstrar a regra:
    // "se houver exceção, como alguém vindo de outra igreja com formação equivalente, só a secretaria registra dispensa"
    const waiversCol = app.findCollectionByNameOrId('requirement_waivers')
    try {
      const gabriel = app.findFirstRecordByData('persons', 'email', 'gabriel.santos@email.com')
      if (gabriel) {
        try {
          app.findFirstRecordByData('requirement_waivers', 'person', gabriel.id)
        } catch (_) {
          const waiver = new Record(waiversCol)
          waiver.set('person', gabriel.id)
          waiver.set('requirement_type', 'igreja')
          waiver.set('requirement_id', c1ChurchReq.id)
          waiver.set('requirement_title', 'C1 Concluído')
          waiver.set(
            'reason',
            'Transferência da Igreja Batista Esperança com formação teológica e discipulado equivalente concluído comprovado.',
          )
          waiver.set('granted_by', 'Secretaria Clériston')
          waiver.set('granted_at', '2026-02-15 00:00:00.000Z')
          app.save(waiver)
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Revert seeds if needed
  },
)
