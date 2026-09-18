migrate(
  (app) => {
    // 1. Atualizar a coleção presences: tornar o campo 'culto' opcional (required: false)
    const presencesCol = app.findCollectionByNameOrId('presences')
    const cultoField = presencesCol.fields.getByName('culto')
    if (cultoField) {
      cultoField.required = false
    }

    // Adicionar campo opcional is_orphan (bool) para indexação / filtragem rápida
    if (!presencesCol.fields.getByName('is_orphan')) {
      presencesCol.fields.add(
        new BoolField({
          name: 'is_orphan',
          required: false,
        }),
      )
    }

    app.save(presencesCol)

    // 2. Atualizar a coleção cultos com suporte a recorrência
    const cultosCol = app.findCollectionByNameOrId('cultos')

    // is_recurrent: booleano indicando se o evento tem recorrência semanal
    if (!cultosCol.fields.getByName('is_recurrent')) {
      cultosCol.fields.add(
        new BoolField({
          name: 'is_recurrent',
          required: false,
        }),
      )
    }

    // recurrence_days: json com array de dias da semana (ex: [0] para domingo, [3] para quarta, [6] para sábado)
    // 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
    if (!cultosCol.fields.getByName('recurrence_days')) {
      cultosCol.fields.add(
        new JSONField({
          name: 'recurrence_days',
          required: false,
        }),
      )
    }

    // recurrence_start_time: text formato "HH:mm" (ex: "18:00", "19:30")
    if (!cultosCol.fields.getByName('recurrence_start_time')) {
      cultosCol.fields.add(
        new TextField({
          name: 'recurrence_start_time',
          required: false,
        }),
      )
    }

    // recurrence_end_time: text formato "HH:mm" (ex: "20:00", "21:00")
    if (!cultosCol.fields.getByName('recurrence_end_time')) {
      cultosCol.fields.add(
        new TextField({
          name: 'recurrence_end_time',
          required: false,
        }),
      )
    }

    app.save(cultosCol)

    // 3. Seed eventos recorrentes padrão da Igreja Defesa da Fé:
    // Domingo 18h00 às 20h00 (culto_domingo, tol_before=60, tol_after=45)
    // Quarta 19h30 às 21h00 (culto_quarta, tol_before=60, tol_after=45)
    // Sábado 16h00 às 18h00 (estudo_biblico, tol_before=60, tol_after=45)
    try {
      app.findFirstRecordByData('cultos', 'name', 'Culto de Domingo (Recorrente)')
    } catch (_) {
      const recDomingo = new Record(cultosCol)
      recDomingo.set('name', 'Culto de Domingo (Recorrente)')
      recDomingo.set('event_type', 'culto_domingo')
      recDomingo.set('status', 'aberto')
      recDomingo.set('is_regular', true)
      recDomingo.set('is_recurrent', true)
      recDomingo.set('recurrence_days', [0])
      recDomingo.set('recurrence_start_time', '18:00')
      recDomingo.set('recurrence_end_time', '20:00')
      recDomingo.set('tolerance_minutes_before', 60)
      recDomingo.set('tolerance_minutes_after', 45)
      // Set date_time to next or past sunday as baseline
      const now = new Date()
      recDomingo.set('date_time', now.toISOString())
      recDomingo.set(
        'notes',
        'Culto da Palavra todo Domingo às 18h com recorrência automática semanal.',
      )
      app.save(recDomingo)
    }

    try {
      app.findFirstRecordByData('cultos', 'name', 'Culto de Quarta (Recorrente)')
    } catch (_) {
      const recQuarta = new Record(cultosCol)
      recQuarta.set('name', 'Culto de Quarta (Recorrente)')
      recQuarta.set('event_type', 'culto_quarta')
      recQuarta.set('status', 'aberto')
      recQuarta.set('is_regular', true)
      recQuarta.set('is_recurrent', true)
      recQuarta.set('recurrence_days', [3])
      recQuarta.set('recurrence_start_time', '19:30')
      recQuarta.set('recurrence_end_time', '21:00')
      recQuarta.set('tolerance_minutes_before', 60)
      recQuarta.set('tolerance_minutes_after', 45)
      const now = new Date()
      recQuarta.set('date_time', now.toISOString())
      recQuarta.set(
        'notes',
        'Culto de Doutrina toda Quarta às 19h30 com recorrência automática semanal.',
      )
      app.save(recQuarta)
    }

    try {
      app.findFirstRecordByData('cultos', 'name', 'Estudo Bíblico de Sábado (Recorrente)')
    } catch (_) {
      const recSabado = new Record(cultosCol)
      recSabado.set('name', 'Estudo Bíblico de Sábado (Recorrente)')
      recSabado.set('event_type', 'estudo_biblico')
      recSabado.set('status', 'aberto')
      recSabado.set('is_regular', true)
      recSabado.set('is_recurrent', true)
      recSabado.set('recurrence_days', [6])
      recSabado.set('recurrence_start_time', '16:00')
      recSabado.set('recurrence_end_time', '18:00')
      recSabado.set('tolerance_minutes_before', 60)
      recSabado.set('tolerance_minutes_after', 45)
      const now = new Date()
      recSabado.set('date_time', now.toISOString())
      recSabado.set(
        'notes',
        'Estudo Bíblico todo Sábado às 16h com recorrência automática semanal.',
      )
      app.save(recSabado)
    }
  },
  (app) => {
    try {
      const presencesCol = app.findCollectionByNameOrId('presences')
      if (presencesCol.fields.getByName('is_orphan')) {
        presencesCol.fields.removeByName('is_orphan')
      }
      app.save(presencesCol)

      const cultosCol = app.findCollectionByNameOrId('cultos')
      if (cultosCol.fields.getByName('is_recurrent')) {
        cultosCol.fields.removeByName('is_recurrent')
      }
      if (cultosCol.fields.getByName('recurrence_days')) {
        cultosCol.fields.removeByName('recurrence_days')
      }
      if (cultosCol.fields.getByName('recurrence_start_time')) {
        cultosCol.fields.removeByName('recurrence_start_time')
      }
      if (cultosCol.fields.getByName('recurrence_end_time')) {
        cultosCol.fields.removeByName('recurrence_end_time')
      }
      app.save(cultosCol)
    } catch (_) {}
  },
)
