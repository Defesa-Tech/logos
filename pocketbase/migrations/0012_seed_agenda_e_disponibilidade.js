migrate(
  (app) => {
    // Buscar membros e cultos para semear dados de escala e bloqueio coerentes com os mocks 14, 15, 16 e 17
    const scalesCol = app.findCollectionByNameOrId('scales')
    const blockedCol = app.findCollectionByNameOrId('blocked_periods')
    const availCol = app.findCollectionByNameOrId('monthly_availabilities')
    const cultosCol = app.findCollectionByNameOrId('cultos')
    const deptsCol = app.findCollectionByNameOrId('departments')

    let targetPersonId = ''
    try {
      const p = app.findFirstRecordByData('persons', 'status', 'member')
      targetPersonId = p.id
    } catch (_) {}

    if (!targetPersonId) return

    // Buscar departamento de Música e Mídia
    let musicaId = ''
    try {
      const d = app.findFirstRecordByData('departments', 'code', 'musica')
      musicaId = d.id
    } catch (_) {}

    // 1. Semear um período bloqueado (como na tela 16 e 17: "Férias em família", 12 a 26 de dezembro de 2026)
    try {
      const existingBlocked = app.findRecordsByFilter(
        'blocked_periods',
        `person = "${targetPersonId}"`,
        '-created',
        1,
        0,
      )
      if (existingBlocked.length === 0) {
        const blk = new Record(blockedCol)
        blk.set('person', targetPersonId)
        blk.set('start_date', '2026-12-12 00:00:00.000Z')
        blk.set('end_date', '2026-12-26 23:59:59.000Z')
        blk.set('reason', 'ferias')
        blk.set('description', 'Férias em família')
        app.save(blk)
      }
    } catch (_) {}

    // 2. Semear disponibilidade para outubro 2026 (modo não posso nos dias 10, 11 e 25)
    try {
      const existingAvail = app.findRecordsByFilter(
        'monthly_availabilities',
        `person = "${targetPersonId}" && year_month = "2026-10"`,
        '-created',
        1,
        0,
      )
      if (existingAvail.length === 0) {
        const av = new Record(availCol)
        av.set('person', targetPersonId)
        av.set('year_month', '2026-10')
        av.set('mode', 'nao')
        av.set('marked_days', [10, 11, 25])
        av.set('reason_id', 'compromisso')
        av.set('details', 'Compromissos pessoais agendados')
        app.save(av)
      }
    } catch (_) {}

    // 3. Semear próxima escala em Setembro 2026 se houver cultos
    try {
      const cultos = app.findRecordsByFilter('cultos', 'status = "aberto"', '-date_time', 5, 0)
      if (cultos.length > 0) {
        const existingScales = app.findRecordsByFilter(
          'scales',
          `person = "${targetPersonId}"`,
          '-created',
          1,
          0,
        )
        if (existingScales.length === 0) {
          const sc = new Record(scalesCol)
          sc.set('culto', cultos[0].id)
          sc.set('person', targetPersonId)
          if (musicaId) sc.set('department', musicaId)
          sc.set('date_time', '2026-09-20 09:00:00.000Z')
          sc.set('function_title', 'Bateria · Culto da Manhã')
          sc.set('status', 'pendente')
          sc.set('notes', 'Templo Sede')
          app.save(sc)
        }
      }
    } catch (_) {}
  },
  (app) => {
    // No-op rollback for seed data
  },
)
