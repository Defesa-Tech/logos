migrate(
  (app) => {
    // 1. families collection
    const families = new Collection({
      name: 'families',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'address', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_families_name ON families (name)'],
    })
    app.save(families)

    const familiesId = app.findCollectionByNameOrId('families').id

    // 2. persons collection
    const persons = new Collection({
      name: 'persons',
      type: 'base',
      // Public create so public visitor landing page can submit visitors
      // List/view: authenticated users
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '',
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'whatsapp', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'birth_date', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['visitor', 'attender', 'member', 'leader', 'pastor'],
          maxSelect: 1,
        },
        {
          name: 'family',
          type: 'relation',
          collectionId: familiesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'family_role',
          type: 'select',
          values: ['head', 'spouse', 'child', 'other'],
          maxSelect: 1,
        },
        { name: 'how_met', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'checklist_welcome_class', type: 'bool' },
        { name: 'checklist_baptized', type: 'bool' },
        { name: 'checklist_small_group', type: 'bool' },
        { name: 'checklist_ministry', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_persons_status ON persons (status)',
        'CREATE INDEX idx_persons_family ON persons (family)',
        'CREATE INDEX idx_persons_user ON persons (user)',
      ],
    })
    app.save(persons)

    const personsId = app.findCollectionByNameOrId('persons').id

    // 3. invites collection
    const invites = new Collection({
      name: 'invites',
      type: 'base',
      // Anyone with token can query/view their invite or list by token for onboarding
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: '',
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'token', type: 'text', required: true },
        { name: 'email', type: 'text' },
        { name: 'whatsapp', type: 'text' },
        {
          name: 'role',
          type: 'select',
          values: ['secretary', 'pastor', 'leader', 'member'],
          maxSelect: 1,
        },
        {
          name: 'person',
          type: 'relation',
          collectionId: personsId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'used', type: 'bool' },
        { name: 'expires', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_invites_token ON invites (token)'],
    })
    app.save(invites)

    // 4. activities collection (activity feed / notifications)
    const activities = new Collection({
      name: 'activities',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '',
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'type',
          type: 'select',
          values: [
            'visitor_signup',
            'journey_change',
            'invite_created',
            'invite_accepted',
            'meeting_report',
          ],
          maxSelect: 1,
        },
        {
          name: 'person',
          type: 'relation',
          collectionId: personsId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_activities_created ON activities (created DESC)'],
    })
    app.save(activities)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('activities'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('invites'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('persons'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('families'))
    } catch (_) {}
  },
)
