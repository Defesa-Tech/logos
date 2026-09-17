migrate(
  (app) => {
    // 1. Coleção courses (Módulo mínimo de cursos)
    let coursesCol
    try {
      coursesCol = app.findCollectionByNameOrId('courses')
    } catch (_) {
      coursesCol = new Collection({
        name: 'courses',
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
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_courses_code ON courses (code)'],
      })
      app.save(coursesCol)
    }

    // 2. Coleção course_classes (Turmas do curso)
    let classesCol
    try {
      classesCol = app.findCollectionByNameOrId('course_classes')
    } catch (_) {
      classesCol = new Collection({
        name: 'course_classes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'course',
            type: 'relation',
            collectionId: coursesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'start_date', type: 'date', required: true },
          { name: 'end_date', type: 'date', required: true },
          { name: 'capacity', type: 'number' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['aberta', 'fechada', 'concluida'],
            maxSelect: 1,
          },
          { name: 'schedule_info', type: 'text' },
          { name: 'location', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_classes_course ON course_classes (course)'],
      })
      app.save(classesCol)
    }

    // 3. Coleção course_enrollments (Inscrições de pessoas nas turmas)
    const personsCol = app.findCollectionByNameOrId('persons')
    let enrollmentsCol
    try {
      enrollmentsCol = app.findCollectionByNameOrId('course_enrollments')
    } catch (_) {
      enrollmentsCol = new Collection({
        name: 'course_enrollments',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'course_class',
            type: 'relation',
            collectionId: classesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          {
            name: 'course',
            type: 'relation',
            collectionId: coursesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
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
            name: 'status',
            type: 'select',
            required: true,
            values: ['inscrito', 'concluido', 'desistente'],
            maxSelect: 1,
          },
          { name: 'enrollment_date', type: 'date' },
          { name: 'completion_date', type: 'date' },
          { name: 'completed_by', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_enroll_class ON course_enrollments (course_class)',
          'CREATE INDEX idx_enroll_person ON course_enrollments (person)',
        ],
      })
      app.save(enrollmentsCol)
    }

    // 4. Coleção church_requirements (Requisitos de nível Igreja - gerenciáveis pela secretaria)
    let churchReqsCol
    try {
      churchReqsCol = app.findCollectionByNameOrId('church_requirements')
    } catch (_) {
      churchReqsCol = new Collection({
        name: 'church_requirements',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'code', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'is_active', type: 'bool' },
          { name: 'is_default', type: 'bool' },
          {
            name: 'course_linked',
            type: 'relation',
            collectionId: coursesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_church_reqs_code ON church_requirements (code)'],
      })
      app.save(churchReqsCol)
    }

    // 5. Coleção requirement_waivers (Dispensas concedidas com justificativa exclusiva da secretaria)
    let waiversCol
    try {
      waiversCol = app.findCollectionByNameOrId('requirement_waivers')
    } catch (_) {
      waiversCol = new Collection({
        name: 'requirement_waivers',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
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
          { name: 'requirement_type', type: 'text', required: true },
          { name: 'requirement_id', type: 'text', required: true },
          { name: 'requirement_title', type: 'text', required: true },
          { name: 'reason', type: 'text', required: true },
          { name: 'granted_by', type: 'text', required: true },
          { name: 'granted_at', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_waivers_person ON requirement_waivers (person)'],
      })
      app.save(waiversCol)
    }

    // 6. Coleção volunteer_profiles (Perfil de serviço na jornada "Quero servir")
    let volunteerProfilesCol
    try {
      volunteerProfilesCol = app.findCollectionByNameOrId('volunteer_profiles')
    } catch (_) {
      volunteerProfilesCol = new Collection({
        name: 'volunteer_profiles',
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
          { name: 'skills', type: 'json' },
          { name: 'interested_departments', type: 'json' },
          { name: 'availability', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'notify_when_c1_opens', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_volunteer_prof_person ON volunteer_profiles (person)'],
      })
      app.save(volunteerProfilesCol)
    }

    // 7. Estender departments com campo requirements (Nível Departamento)
    const departmentsCol = app.findCollectionByNameOrId('departments')
    if (!departmentsCol.fields.getByName('requirements')) {
      departmentsCol.fields.add(
        new JSONField({
          name: 'requirements',
          required: false,
        }),
      )
      app.save(departmentsCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('volunteer_profiles'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('requirement_waivers'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('church_requirements'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('course_enrollments'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('course_classes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('courses'))
    } catch (_) {}
  },
)
