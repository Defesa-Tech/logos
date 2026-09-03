onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const status = record.getString('status')

  if (status === 'visitor') {
    try {
      const activitiesCol = $app.findCollectionByNameOrId('activities')
      const activity = new Record(activitiesCol)
      activity.set('title', 'Novo visitante registrado')
      const howMet = record.getString('how_met')
      const desc =
        'O visitante ' +
        record.getString('name') +
        ' se cadastrou no sistema' +
        (howMet ? ' (Origem: ' + howMet + ')' : '') +
        '. WhatsApp: ' +
        (record.getString('whatsapp') || 'não informado')
      activity.set('description', desc)
      activity.set('type', 'visitor_signup')
      activity.set('person', record.id)
      $app.save(activity)
    } catch (err) {
      console.log('Erro ao criar atividade de novo visitante:', err)
    }
  }

  e.next()
}, 'persons')
