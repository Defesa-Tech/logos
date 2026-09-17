migrate(
  (app) => {
    // 1. Extend persons collection with MVP fields
    const personsCol = app.findCollectionByNameOrId('persons')

    if (!personsCol.fields.getByName('stage')) {
      personsCol.fields.add(
        new SelectField({
          name: 'stage',
          required: false,
          values: ['visitante', 'frequentador', 'membro', 'desligado'],
          maxSelect: 1,
        }),
      )
    }

    if (!personsCol.fields.getByName('phone')) {
      personsCol.fields.add(
        new TextField({
          name: 'phone',
        }),
      )
    }

    if (!personsCol.fields.getByName('address')) {
      personsCol.fields.add(
        new TextField({
          name: 'address',
        }),
      )
    }

    if (!personsCol.fields.getByName('how_found')) {
      personsCol.fields.add(
        new TextField({
          name: 'how_found',
        }),
      )
    }

    if (!personsCol.fields.getByName('contact_authorized')) {
      personsCol.fields.add(
        new BoolField({
          name: 'contact_authorized',
        }),
      )
    }

    if (!personsCol.fields.getByName('contact_auth_date')) {
      personsCol.fields.add(
        new DateField({
          name: 'contact_auth_date',
        }),
      )
    }

    if (!personsCol.fields.getByName('contact_auth_by')) {
      personsCol.fields.add(
        new TextField({
          name: 'contact_auth_by',
        }),
      )
    }

    if (!personsCol.fields.getByName('no_contact')) {
      personsCol.fields.add(
        new BoolField({
          name: 'no_contact',
        }),
      )
    }

    if (!personsCol.fields.getByName('refuses_contact')) {
      personsCol.fields.add(
        new BoolField({
          name: 'refuses_contact',
        }),
      )
    }

    if (!personsCol.fields.getByName('baptism_date')) {
      personsCol.fields.add(
        new DateField({
          name: 'baptism_date',
        }),
      )
    }

    if (!personsCol.fields.getByName('baptism_location')) {
      personsCol.fields.add(
        new SelectField({
          name: 'baptism_location',
          values: ['defesa_da_fe', 'outra_igreja'],
          maxSelect: 1,
        }),
      )
    }

    if (!personsCol.fields.getByName('baptism_church_name')) {
      personsCol.fields.add(
        new TextField({
          name: 'baptism_church_name',
        }),
      )
    }

    if (!personsCol.fields.getByName('ingress_date')) {
      personsCol.fields.add(
        new DateField({
          name: 'ingress_date',
        }),
      )
    }

    if (!personsCol.fields.getByName('ingress_form')) {
      personsCol.fields.add(
        new SelectField({
          name: 'ingress_form',
          values: ['batismo', 'profissao_de_fe', 'transferencia', 'aclamacao', 'jurisdicao'],
          maxSelect: 1,
        }),
      )
    }

    if (!personsCol.fields.getByName('provisional_number')) {
      personsCol.fields.add(
        new TextField({
          name: 'provisional_number',
        }),
      )
    }

    if (!personsCol.fields.getByName('rol_number')) {
      personsCol.fields.add(
        new TextField({
          name: 'rol_number',
        }),
      )
    }

    if (!personsCol.fields.getByName('card_photo_status')) {
      personsCol.fields.add(
        new SelectField({
          name: 'card_photo_status',
          values: ['sem_foto', 'pendente', 'aprovada', 'nova_foto'],
          maxSelect: 1,
        }),
      )
    }

    if (!personsCol.fields.getByName('card_photo_url')) {
      personsCol.fields.add(
        new TextField({
          name: 'card_photo_url',
        }),
      )
    }

    if (!personsCol.fields.getByName('exit_reason')) {
      personsCol.fields.add(
        new SelectField({
          name: 'exit_reason',
          values: ['mudanca', 'transferencia', 'falecimento', 'pedido_proprio', 'outro'],
          maxSelect: 1,
        }),
      )
    }

    if (!personsCol.fields.getByName('anonymized')) {
      personsCol.fields.add(
        new BoolField({
          name: 'anonymized',
        }),
      )
    }

    app.save(personsCol)

    const personsId = personsCol.id

    // 2. stage_history collection
    const stageHistory = new Collection({
      name: 'stage_history',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'person',
          type: 'relation',
          collectionId: personsId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'from_stage',
          type: 'select',
          values: ['inicio', 'visitante', 'frequentador', 'membro', 'desligado'],
          maxSelect: 1,
        },
        {
          name: 'to_stage',
          type: 'select',
          required: true,
          values: ['visitante', 'frequentador', 'membro', 'desligado'],
          maxSelect: 1,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'author_name', type: 'text' },
        { name: 'reason', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_stage_history_person ON stage_history (person, created DESC)'],
    })
    app.save(stageHistory)

    // 3. departments collection
    const departments = new Collection({
      name: 'departments',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_departments_code ON departments (code)'],
    })
    app.save(departments)

    const departmentsId = app.findCollectionByNameOrId('departments').id

    // 4. department_roles collection (Funções dentro de departamento)
    const departmentRoles = new Collection({
      name: 'department_roles',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'department',
          type: 'relation',
          collectionId: departmentsId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'level',
          type: 'select',
          required: true,
          values: ['voluntario', 'lider'],
          maxSelect: 1,
        },
        { name: 'permissions', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_dep_roles_dept ON department_roles (department)'],
    })
    app.save(departmentRoles)

    const rolesId = app.findCollectionByNameOrId('department_roles').id

    // 5. assignments collection (Atuações acumuláveis)
    const assignments = new Collection({
      name: 'assignments',
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
          collectionId: personsId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'role',
          type: 'relation',
          collectionId: rolesId,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativa', 'encerrada', 'pausada'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_assignments_person ON assignments (person, status)',
        'CREATE INDEX idx_assignments_role ON assignments (role)',
      ],
    })
    app.save(assignments)

    // 6. cultos collection
    const cultos = new Collection({
      name: 'cultos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'date_time', type: 'date', required: true },
        { name: 'is_regular', type: 'bool' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberto', 'arquivado'],
          maxSelect: 1,
        },
        { name: 'anonymous_count', type: 'number' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cultos_date ON cultos (date_time DESC)'],
    })
    app.save(cultos)

    const cultosId = app.findCollectionByNameOrId('cultos').id

    // 7. presences collection
    const presences = new Collection({
      name: 'presences',
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
          collectionId: cultosId,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'person',
          type: 'relation',
          collectionId: personsId,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'modality',
          type: 'select',
          required: true,
          values: ['presencial', 'online'],
          maxSelect: 1,
        },
        {
          name: 'presence_type',
          type: 'select',
          required: true,
          values: ['primeira_visita', 'retorno', 'membro_regular'],
          maxSelect: 1,
        },
        { name: 'registered_by_name', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_presences_culto ON presences (culto)',
        'CREATE INDEX idx_presences_person ON presences (person)',
      ],
    })
    app.save(presences)

    // 8. follow_up_tasks collection
    const followUpTasks = new Collection({
      name: 'follow_up_tasks',
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
          collectionId: personsId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'responsible_person',
          type: 'relation',
          collectionId: personsId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'responsible_name', type: 'text' },
        { name: 'due_date', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberta', 'concluida', 'cancelada'],
          maxSelect: 1,
        },
        {
          name: 'result',
          type: 'select',
          values: ['pendente', 'mensagem_enviada', 'conversou', 'sem_resposta', 'nao_quer_contato'],
          maxSelect: 1,
        },
        { name: 'completed_at', type: 'date' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_followup_status ON follow_up_tasks (status, due_date)',
        'CREATE INDEX idx_followup_person ON follow_up_tasks (person)',
      ],
    })
    app.save(followUpTasks)

    // 9. church_settings collection (for R2, R4, R10 configurable rules)
    const churchSettings = new Collection({
      name: 'church_settings',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_settings_key ON church_settings (key)'],
    })
    app.save(churchSettings)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('church_settings'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('follow_up_tasks'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('presences'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('cultos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('assignments'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('department_roles'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('departments'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('stage_history'))
    } catch (_) {}
  },
)
