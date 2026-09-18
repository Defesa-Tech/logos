migrate(
  (app) => {
    const cultosCol = app.findCollectionByNameOrId('cultos')

    // 1. Add event_type select field if not present
    if (!cultosCol.fields.getByName('event_type')) {
      cultosCol.fields.add(
        new SelectField({
          name: 'event_type',
          required: false,
          values: [
            'culto_domingo',
            'culto_quarta',
            'estudo_biblico',
            'conferencia',
            'vigilia',
            'congresso',
            'outro',
          ],
          maxSelect: 1,
        }),
      )
    }

    // 2. Add description text field if not present
    if (!cultosCol.fields.getByName('description')) {
      cultosCol.fields.add(
        new TextField({
          name: 'description',
          required: false,
        }),
      )
    }

    app.save(cultosCol)

    // 3. Ensure tolerance and end_time default values are populated for any open/existing records
    app
      .db()
      .newQuery(`
    UPDATE cultos 
    SET event_type = 'culto_domingo' 
    WHERE (event_type IS NULL OR event_type = '') AND name LIKE '%Domingo%'
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE cultos 
    SET event_type = 'culto_quarta' 
    WHERE (event_type IS NULL OR event_type = '') AND (name LIKE '%Doutrina%' OR name LIKE '%Quarta%')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE cultos 
    SET event_type = 'outro' 
    WHERE event_type IS NULL OR event_type = ''
  `)
      .execute()

    // 4. Update the active sample culto to align around current time so testing/demo works seamlessly
    try {
      const activeCulto = app.findFirstRecordByData('cultos', 'status', 'aberto')
      const now = new Date()
      const start = new Date(now.getTime() - 30 * 60000) // started 30 mins ago
      const end = new Date(now.getTime() + 90 * 60000) // ends in 90 mins
      activeCulto.set('date_time', start.toISOString())
      activeCulto.set('end_time', end.toISOString())
      activeCulto.set('tolerance_minutes_before', 60)
      activeCulto.set('tolerance_minutes_after', 45)
      activeCulto.set('event_type', 'culto_domingo')
      app.save(activeCulto)
    } catch (_) {}

    // 5. Seed a conference/study event happening around the same weekend or day for demo / multi-event testing
    try {
      app.findFirstRecordByData('cultos', 'name', 'Estudo Bíblico de Sábado')
    } catch (_) {
      const studyRecord = new Record(cultosCol)
      studyRecord.set('name', 'Estudo Bíblico de Sábado')
      studyRecord.set('event_type', 'estudo_biblico')
      studyRecord.set('is_regular', true)
      studyRecord.set('status', 'aberto')
      studyRecord.set('tolerance_minutes_before', 60)
      studyRecord.set('tolerance_minutes_after', 30)
      const now = new Date()
      studyRecord.set('date_time', new Date(now.getTime() + 2 * 3600000).toISOString())
      studyRecord.set('end_time', new Date(now.getTime() + 4 * 3600000).toISOString())
      studyRecord.set('notes', 'Estudo das Epístolas Paulinas na Sala 3')
      app.save(studyRecord)
    }

    try {
      app.findFirstRecordByData('cultos', 'name', 'Conferência Bíblica Teológica')
    } catch (_) {
      const confRecord = new Record(cultosCol)
      confRecord.set('name', 'Conferência Bíblica Teológica')
      confRecord.set('event_type', 'conferencia')
      confRecord.set('is_regular', false)
      confRecord.set('status', 'aberto')
      confRecord.set('tolerance_minutes_before', 60)
      confRecord.set('tolerance_minutes_after', 60)
      const now = new Date()
      confRecord.set('date_time', new Date(now.getTime() + 24 * 3600000).toISOString())
      confRecord.set('end_time', new Date(now.getTime() + 28 * 3600000).toISOString())
      confRecord.set('notes', 'Conferência anual com preletores convidados')
      app.save(confRecord)
    }
  },
  (app) => {
    // down migration
    try {
      const cultosCol = app.findCollectionByNameOrId('cultos')
      if (cultosCol.fields.getByName('event_type')) {
        cultosCol.fields.removeByName('event_type')
      }
      if (cultosCol.fields.getByName('description')) {
        cultosCol.fields.removeByName('description')
      }
      app.save(cultosCol)
    } catch (_) {}
  },
)
