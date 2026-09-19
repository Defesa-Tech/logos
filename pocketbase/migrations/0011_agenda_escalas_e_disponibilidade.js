migrate(
  (app) => {
    const personsCol = app.findCollectionByNameOrId('persons')
    const cultosCol = app.findCollectionByNameOrId('cultos')
    const deptsCol = app.findCollectionByNameOrId('departments')
    const rolesCol = app.findCollectionByNameOrId('department_roles')

    // 1. Coleção monthly_availabilities (Disponibilidade mensal por membro)
    let availCol
    try {
      availCol = app.findCollectionByNameOrId('monthly_availabilities')
    } catch (_) {
      availCol = new Collection({
        name: 'monthly_availabilities',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'person',
            type: 'relation',
            collectionId: personsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          { name: 'year_month', type: 'text', required: true }, // ex: "2026-10"
          {
            name: 'mode',
            type: 'select',
            required: true,
            values: ['nao', 'sim'], // 'nao' = não posso servir nos dias marcados; 'sim' = posso servir nos dias marcados
            maxSelect: 1,
          },
          { name: 'marked_days', type: 'json' }, // array de dias [10, 11, 25]
          { name: 'reason_id', type: 'text' }, // 'compromisso', 'trabalho', 'viagem', 'estudos', 'outro'
          { name: 'details', type: 'text' }, // justificativa opcional
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_avail_person_month ON monthly_availabilities (person, year_month)',
        ],
      })
      app.save(availCol)
    }

    // 2. Coleção blocked_periods (Bloqueios de períodos / férias / viagens)
    let blockedCol
    try {
      blockedCol = app.findCollectionByNameOrId('blocked_periods')
    } catch (_) {
      blockedCol = new Collection({
        name: 'blocked_periods',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'person',
            type: 'relation',
            collectionId: personsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          { name: 'start_date', type: 'date', required: true },
          { name: 'end_date', type: 'date', required: true },
          { name: 'reason', type: 'text', required: true }, // 'ferias', 'viagem', 'trabalho', 'estudos', 'outro'
          { name: 'description', type: 'text' }, // Ex: "Férias em família"
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_blocked_person ON blocked_periods (person)'],
      })
      app.save(blockedCol)
    }

    // 3. Coleção scales (Escalas de voluntários para cultos e eventos)
    let scalesCol
    try {
      scalesCol = app.findCollectionByNameOrId('scales')
    } catch (_) {
      scalesCol = new Collection({
        name: 'scales',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'culto',
            type: 'relation',
            collectionId: cultosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            required: true,
          },
          {
            name: 'person',
            type: 'relation',
            collectionId: personsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          {
            name: 'department',
            type: 'relation',
            collectionId: deptsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'role',
            type: 'relation',
            collectionId: rolesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'date_time', type: 'date', required: true },
          { name: 'function_title', type: 'text' }, // Ex: "Bateria · Culto da Manhã"
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pendente', 'confirmado', 'recusado', 'substituido'],
            maxSelect: 1,
          },
          { name: 'confirmed_at', type: 'date' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_scales_person_date ON scales (person, date_time)',
          'CREATE INDEX idx_scales_culto ON scales (culto)',
        ],
      })
      app.save(scalesCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('scales'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('blocked_periods'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('monthly_availabilities'))
    } catch (_) {}
  },
)
