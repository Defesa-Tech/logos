migrate(
  (app) => {
    // 1. Extend departments (Unidade unificada: departamento, subdepartamento)
    const departmentsCol = app.findCollectionByNameOrId('departments')

    if (!departmentsCol.fields.getByName('unit_type')) {
      departmentsCol.fields.add(
        new SelectField({
          name: 'unit_type',
          required: false,
          values: ['departamento', 'subdepartamento', 'supervisao'],
          maxSelect: 1,
        }),
      )
    }

    if (!departmentsCol.fields.getByName('parent_unit')) {
      departmentsCol.fields.add(
        new RelationField({
          name: 'parent_unit',
          collectionId: departmentsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    if (!departmentsCol.fields.getByName('status')) {
      departmentsCol.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['ativo', 'arquivado'],
          maxSelect: 1,
        }),
      )
    }

    if (!departmentsCol.fields.getByName('order_index')) {
      departmentsCol.fields.add(
        new NumberField({
          name: 'order_index',
          required: false,
        }),
      )
    }

    app.save(departmentsCol)

    // Set default unit_type = 'departamento' and status = 'ativo' for existing departments
    app
      .db()
      .newQuery(
        "UPDATE departments SET unit_type = 'departamento' WHERE unit_type IS NULL OR unit_type = ''",
      )
      .execute()
    app
      .db()
      .newQuery("UPDATE departments SET status = 'ativo' WHERE status IS NULL OR status = ''")
      .execute()

    // 2. Extend department_roles (Funções com requisitos e status)
    const rolesCol = app.findCollectionByNameOrId('department_roles')

    if (!rolesCol.fields.getByName('requirements')) {
      // JSON array of requirement objects: [{ id: string, title: string, description?: string }]
      rolesCol.fields.add(
        new JSONField({
          name: 'requirements',
          required: false,
        }),
      )
    }

    if (!rolesCol.fields.getByName('status')) {
      rolesCol.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['ativo', 'arquivado'],
          maxSelect: 1,
        }),
      )
    }

    if (!rolesCol.fields.getByName('description')) {
      rolesCol.fields.add(
        new TextField({
          name: 'description',
          required: false,
        }),
      )
    }

    app.save(rolesCol)
    app
      .db()
      .newQuery("UPDATE department_roles SET status = 'ativo' WHERE status IS NULL OR status = ''")
      .execute()

    // 3. Extend assignments (Atuações com checklist de requisitos completados e nível)
    const assignmentsCol = app.findCollectionByNameOrId('assignments')

    if (!assignmentsCol.fields.getByName('leadership_level')) {
      assignmentsCol.fields.add(
        new SelectField({
          name: 'leadership_level',
          required: false,
          values: ['voluntario', 'lider', 'vice_lider', 'lideranca_adicional'],
          maxSelect: 1,
        }),
      )
    }

    if (!assignmentsCol.fields.getByName('requirements_checklist')) {
      // JSON array of completed items: [{ requirement_id: string, title: string, confirmed_by: string, confirmed_at: string }]
      assignmentsCol.fields.add(
        new JSONField({
          name: 'requirements_checklist',
          required: false,
        }),
      )
    }

    if (!assignmentsCol.fields.getByName('department')) {
      assignmentsCol.fields.add(
        new RelationField({
          name: 'department',
          collectionId: departmentsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    app.save(assignmentsCol)

    // 4. Create overlap_rules collection (Regras de sobreposição configuráveis entre funções/unidades)
    let overlapRulesCol
    try {
      overlapRulesCol = app.findCollectionByNameOrId('overlap_rules')
    } catch (_) {
      overlapRulesCol = new Collection({
        name: 'overlap_rules',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          {
            name: 'role_a',
            type: 'relation',
            collectionId: rolesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'department_a',
            type: 'relation',
            collectionId: departmentsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'role_b',
            type: 'relation',
            collectionId: rolesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'department_b',
            type: 'relation',
            collectionId: departmentsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'rule_type',
            type: 'select',
            required: true,
            values: ['bloqueado', 'permitido', 'aviso'],
            maxSelect: 1,
          },
          { name: 'reason', type: 'text', required: true },
          { name: 'created_by_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_overlap_role_a ON overlap_rules (role_a)',
          'CREATE INDEX idx_overlap_role_b ON overlap_rules (role_b)',
        ],
      })
      app.save(overlapRulesCol)
    }

    // 5. Extend cultos (agenda com início, término e tolerância configurável em minutos)
    const cultosCol = app.findCollectionByNameOrId('cultos')

    if (!cultosCol.fields.getByName('end_time')) {
      cultosCol.fields.add(
        new DateField({
          name: 'end_time',
          required: false,
        }),
      )
    }

    if (!cultosCol.fields.getByName('tolerance_minutes_before')) {
      cultosCol.fields.add(
        new NumberField({
          name: 'tolerance_minutes_before',
          required: false,
        }),
      )
    }

    if (!cultosCol.fields.getByName('tolerance_minutes_after')) {
      cultosCol.fields.add(
        new NumberField({
          name: 'tolerance_minutes_after',
          required: false,
        }),
      )
    }

    app.save(cultosCol)

    // 6. Extend presences (origem: qr_code vs boas_vindas; device_id para reconhecimento de aparelho)
    const presencesCol = app.findCollectionByNameOrId('presences')

    if (!presencesCol.fields.getByName('origin')) {
      presencesCol.fields.add(
        new SelectField({
          name: 'origin',
          required: false,
          values: ['qr_code', 'boas_vindas', 'autoatendimento', 'secretaria'],
          maxSelect: 1,
        }),
      )
    }

    if (!presencesCol.fields.getByName('device_token')) {
      presencesCol.fields.add(
        new TextField({
          name: 'device_token',
          required: false,
        }),
      )
    }

    app.save(presencesCol)
    app
      .db()
      .newQuery("UPDATE presences SET origin = 'boas_vindas' WHERE origin IS NULL OR origin = ''")
      .execute()

    // 7. Extend persons (marcação de 'possivel_familiar', device_token, contagem de visitas, formulário completo preenchido)
    const personsCol = app.findCollectionByNameOrId('persons')

    if (!personsCol.fields.getByName('is_possible_relative')) {
      personsCol.fields.add(
        new BoolField({
          name: 'is_possible_relative',
          required: false,
        }),
      )
    }

    if (!personsCol.fields.getByName('relative_phone_owner')) {
      personsCol.fields.add(
        new TextField({
          name: 'relative_phone_owner',
          required: false,
        }),
      )
    }

    if (!personsCol.fields.getByName('device_token')) {
      personsCol.fields.add(
        new TextField({
          name: 'device_token',
          required: false,
        }),
      )
    }

    if (!personsCol.fields.getByName('full_form_completed')) {
      personsCol.fields.add(
        new BoolField({
          name: 'full_form_completed',
          required: false,
        }),
      )
    }

    if (!personsCol.fields.getByName('full_form_date')) {
      personsCol.fields.add(
        new DateField({
          name: 'full_form_date',
          required: false,
        }),
      )
    }

    if (!personsCol.fields.getByName('contact_preference')) {
      personsCol.fields.add(
        new SelectField({
          name: 'contact_preference',
          required: false,
          values: ['whatsapp', 'ligacao', 'nenhum'],
          maxSelect: 1,
        }),
      )
    }

    app.save(personsCol)

    // 8. Create registration_divergences collection (divergências de cadastro para a secretaria revisar)
    let divergencesCol
    try {
      divergencesCol = app.findCollectionByNameOrId('registration_divergences')
    } catch (_) {
      divergencesCol = new Collection({
        name: 'registration_divergences',
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
            collectionId: personsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
            required: true,
          },
          { name: 'phone', type: 'text', required: true },
          { name: 'field_name', type: 'text', required: true },
          { name: 'current_value', type: 'text' },
          { name: 'submitted_value', type: 'text', required: true },
          {
            name: 'divergence_type',
            type: 'select',
            required: true,
            values: ['email_diferente', 'nome_variacao', 'nome_possivel_familiar', 'outro'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pendente', 'aprovada', 'rejeitada', 'resolvida'],
            maxSelect: 1,
          },
          { name: 'notes', type: 'text' },
          { name: 'resolved_by', type: 'text' },
          { name: 'resolved_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_divergences_person ON registration_divergences (person)',
          'CREATE INDEX idx_divergences_status ON registration_divergences (status)',
        ],
      })
      app.save(divergencesCol)
    }

    // 9. Seed Subdepartamentos & Funções com requisitos & Regras de sobreposição de exemplo
    try {
      // Subdepartamento Banda under Música
      const musicaDept = app.findFirstRecordByData('departments', 'code', 'musica')
      let subBanda
      try {
        subBanda = app.findFirstRecordByData('departments', 'code', 'musica_banda')
      } catch (_) {
        subBanda = new Record(departmentsCol)
        subBanda.set('name', 'Banda & Instrumentos')
        subBanda.set('code', 'musica_banda')
        subBanda.set('unit_type', 'subdepartamento')
        subBanda.set('parent_unit', musicaDept.id)
        subBanda.set('status', 'ativo')
        subBanda.set(
          'description',
          'Subdepartamento de músicos instrumentistas da equipe de louvor',
        )
        app.save(subBanda)
      }

      // Add requirements to Baterista
      try {
        const batRole = app.findFirstRecordByData('department_roles', 'name', 'Baterista')
        batRole.set('requirements', [
          { id: 'req_ensaios', title: 'Participação mínima em 2 ensaios do mês' },
          { id: 'req_voluntariado', title: 'Curso de Voluntariado Logos concluído' },
        ])
        batRole.set('status', 'ativo')
        app.save(batRole)
      } catch (_) {}

      // Add requirements to Técnico de Áudio
      try {
        const audRole = app.findFirstRecordByData('department_roles', 'name', 'Técnico de Áudio')
        audRole.set('requirements', [
          { id: 'req_mesa', title: 'Treinamento operacional na mesa digital de som' },
          { id: 'req_pontualidade', title: 'Compromisso de chegada 45 min antes do culto' },
        ])
        audRole.set('status', 'ativo')
        app.save(audRole)
      } catch (_) {}

      // Add sample Overlap Rule: Voluntário da Música x Voluntário do Boas-Vindas = Bloqueado
      try {
        const boasVindasDept = app.findFirstRecordByData('departments', 'code', 'boas_vindas')
        const roleRecepcao = app.findFirstRecordByData(
          'department_roles',
          'name',
          'Voluntário de Recepção',
        )
        const roleBaterista = app.findFirstRecordByData('department_roles', 'name', 'Baterista')

        try {
          app.findFirstRecordByData('overlap_rules', 'name', 'Música x Boas-Vindas')
        } catch (_) {
          const rule = new Record(overlapRulesCol)
          rule.set('name', 'Música x Boas-Vindas')
          rule.set(
            'description',
            'Voluntários escalados no louvor não podem servir simultaneamente na recepção',
          )
          rule.set('role_a', roleBaterista ? roleBaterista.id : null)
          rule.set('department_a', musicaDept.id)
          rule.set('role_b', roleRecepcao ? roleRecepcao.id : null)
          rule.set('department_b', boasVindasDept.id)
          rule.set('rule_type', 'bloqueado')
          rule.set(
            'reason',
            'Voluntário da Música servindo também no Boas-Vindas = Bloqueado (conflito de horários no culto)',
          )
          rule.set('created_by_name', 'Secretaria Clériston')
          app.save(rule)
        }
      } catch (_) {}

      // Update cultToday with start/end time and tolerance
      try {
        const cultToday = app.findFirstRecordByData('cultos', 'name', 'Culto da Palavra (Domingo)')
        const now = new Date()
        const start = new Date(now.getTime() - 30 * 60000)
        const end = new Date(now.getTime() + 90 * 60000)
        cultToday.set('date_time', start.toISOString())
        cultToday.set('end_time', end.toISOString())
        cultToday.set('tolerance_minutes_before', 60)
        cultToday.set('tolerance_minutes_after', 30)
        app.save(cultToday)
      } catch (_) {}
    } catch (_) {}
  },
  (app) => {
    // down migration
    try {
      app.delete(app.findCollectionByNameOrId('registration_divergences'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('overlap_rules'))
    } catch (_) {}
  },
)
