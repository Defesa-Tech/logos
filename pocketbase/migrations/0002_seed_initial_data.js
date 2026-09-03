migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const personsCol = app.findCollectionByNameOrId('persons')
    const familiesCol = app.findCollectionByNameOrId('families')
    const activitiesCol = app.findCollectionByNameOrId('activities')
    const invitesCol = app.findCollectionByNameOrId('invites')

    // 1. Seed initial secretary user: cleristonx.lima@gmail.com / Skip@Pass
    let secretaryUser
    try {
      secretaryUser = app.findAuthRecordByEmail('_pb_users_auth_', 'cleristonx.lima@gmail.com')
    } catch (_) {
      secretaryUser = new Record(users)
      secretaryUser.setEmail('cleristonx.lima@gmail.com')
      secretaryUser.setPassword('Skip@Pass')
      secretaryUser.setVerified(true)
      secretaryUser.set('name', 'Clériston Lima')
      app.save(secretaryUser)
    }

    // 2. Seed families
    let famSilva, famOliveira, famSantos
    try {
      famSilva = app.findFirstRecordByData('families', 'name', 'Família Silva')
    } catch (_) {
      famSilva = new Record(familiesCol)
      famSilva.set('name', 'Família Silva')
      famSilva.set('address', 'Rua das Palmeiras, 142 - Jardim Primavera')
      famSilva.set('notes', 'Família participante do Pequeno Grupo Esperança')
      app.save(famSilva)
    }

    try {
      famOliveira = app.findFirstRecordByData('families', 'name', 'Família Oliveira')
    } catch (_) {
      famOliveira = new Record(familiesCol)
      famOliveira.set('name', 'Família Oliveira')
      famOliveira.set('address', 'Av. Central, 850, Apto 402 - Centro')
      famOliveira.set('notes', 'Líderes de acolhimento e recepção')
      app.save(famOliveira)
    }

    try {
      famSantos = app.findFirstRecordByData('families', 'name', 'Família Santos')
    } catch (_) {
      famSantos = new Record(familiesCol)
      famSantos.set('name', 'Família Santos')
      famSantos.set('address', 'Rua das Acácias, 77 - Vila Nova')
      famSantos.set('notes', 'Novos visitantes do último culto de celebração')
      app.save(famSantos)
    }

    // 3. Seed persons
    // 3.1 Secretary Person (linked to user)
    let pSecretary
    try {
      pSecretary = app.findFirstRecordByData('persons', 'name', 'Clériston Lima')
    } catch (_) {
      pSecretary = new Record(personsCol)
      pSecretary.set('name', 'Clériston Lima')
      pSecretary.set('whatsapp', '(11) 98765-4321')
      pSecretary.set('email', 'cleristonx.lima@gmail.com')
      pSecretary.set('status', 'leader') // Secretary / Pastor privileges
      pSecretary.set('user', secretaryUser.id)
      pSecretary.set('family', famOliveira.id)
      pSecretary.set('family_role', 'head')
      pSecretary.set('checklist_welcome_class', true)
      pSecretary.set('checklist_baptized', true)
      pSecretary.set('checklist_small_group', true)
      pSecretary.set('checklist_ministry', true)
      app.save(pSecretary)
    }

    // 3.2 Pastor: Pr. Marcos Andrade
    let pPastor
    try {
      pPastor = app.findFirstRecordByData('persons', 'name', 'Pr. Marcos Andrade')
    } catch (_) {
      pPastor = new Record(personsCol)
      pPastor.set('name', 'Pr. Marcos Andrade')
      pPastor.set('whatsapp', '(11) 99123-1122')
      pPastor.set('email', 'pastor.marcos@logosigreja.com.br')
      pPastor.set('status', 'pastor')
      pPastor.set('family_role', 'head')
      pPastor.set('checklist_welcome_class', true)
      pPastor.set('checklist_baptized', true)
      pPastor.set('checklist_small_group', true)
      pPastor.set('checklist_ministry', true)
      app.save(pPastor)
    }

    // 3.3 Leaders & Members in Família Silva
    let pSilvaHead
    try {
      pSilvaHead = app.findFirstRecordByData('persons', 'name', 'Carlos Eduardo Silva')
    } catch (_) {
      pSilvaHead = new Record(personsCol)
      pSilvaHead.set('name', 'Carlos Eduardo Silva')
      pSilvaHead.set('whatsapp', '(11) 97100-3344')
      pSilvaHead.set('email', 'carlos.silva@email.com')
      pSilvaHead.set('status', 'leader')
      pSilvaHead.set('family', famSilva.id)
      pSilvaHead.set('family_role', 'head')
      pSilvaHead.set('checklist_welcome_class', true)
      pSilvaHead.set('checklist_baptized', true)
      pSilvaHead.set('checklist_small_group', true)
      pSilvaHead.set('checklist_ministry', true)
      app.save(pSilvaHead)
    }

    let pSilvaSpouse
    try {
      pSilvaSpouse = app.findFirstRecordByData('persons', 'name', 'Ana Carolina Silva')
    } catch (_) {
      pSilvaSpouse = new Record(personsCol)
      pSilvaSpouse.set('name', 'Ana Carolina Silva')
      pSilvaSpouse.set('whatsapp', '(11) 97100-3355')
      pSilvaSpouse.set('email', 'ana.silva@email.com')
      pSilvaSpouse.set('status', 'member')
      pSilvaSpouse.set('family', famSilva.id)
      pSilvaSpouse.set('family_role', 'spouse')
      pSilvaSpouse.set('checklist_welcome_class', true)
      pSilvaSpouse.set('checklist_baptized', true)
      pSilvaSpouse.set('checklist_small_group', true)
      app.save(pSilvaSpouse)
    }

    let pSilvaChild
    try {
      pSilvaChild = app.findFirstRecordByData('persons', 'name', 'Lucas Silva')
    } catch (_) {
      pSilvaChild = new Record(personsCol)
      pSilvaChild.set('name', 'Lucas Silva')
      pSilvaChild.set('whatsapp', '(11) 97100-3366')
      pSilvaChild.set('status', 'attender')
      pSilvaChild.set('family', famSilva.id)
      pSilvaChild.set('family_role', 'child')
      pSilvaChild.set('checklist_welcome_class', true)
      app.save(pSilvaChild)
    }

    // 3.4 Frequentador / Attenders
    let pAttender
    try {
      pAttender = app.findFirstRecordByData('persons', 'name', 'Mariana Duarte')
    } catch (_) {
      pAttender = new Record(personsCol)
      pAttender.set('name', 'Mariana Duarte')
      pAttender.set('whatsapp', '(11) 98844-5566')
      pAttender.set('email', 'mariana.duarte@email.com')
      pAttender.set('status', 'attender')
      pAttender.set('how_met', 'Convite de colega de trabalho')
      pAttender.set('checklist_welcome_class', true)
      app.save(pAttender)
    }

    // 3.5 Visitors (recent)
    let pVisitor1, pVisitor2
    try {
      pVisitor1 = app.findFirstRecordByData('persons', 'name', 'Gabriel Menezes Santos')
    } catch (_) {
      pVisitor1 = new Record(personsCol)
      pVisitor1.set('name', 'Gabriel Menezes Santos')
      pVisitor1.set('whatsapp', '(11) 99877-2211')
      pVisitor1.set('email', 'gabriel.santos@email.com')
      pVisitor1.set('status', 'visitor')
      pVisitor1.set('family', famSantos.id)
      pVisitor1.set('family_role', 'head')
      pVisitor1.set('how_met', 'QR Code do Culto de Domingo')
      app.save(pVisitor1)
    }

    try {
      pVisitor2 = app.findFirstRecordByData('persons', 'name', 'Juliana Rocha')
    } catch (_) {
      pVisitor2 = new Record(personsCol)
      pVisitor2.set('name', 'Juliana Rocha')
      pVisitor2.set('whatsapp', '(11) 96543-8899')
      pVisitor2.set('email', 'juliana.rocha@email.com')
      pVisitor2.set('status', 'visitor')
      pVisitor2.set('how_met', 'Instagram da Igreja')
      app.save(pVisitor2)
    }

    // 4. Seed sample Invites
    try {
      app.findFirstRecordByData('invites', 'token', 'convite-lider-2025')
    } catch (_) {
      const inv1 = new Record(invitesCol)
      inv1.set('token', 'convite-lider-2025')
      inv1.set('whatsapp', '(11) 97100-3344')
      inv1.set('email', 'carlos.silva@email.com')
      inv1.set('role', 'leader')
      inv1.set('person', pSilvaHead.id)
      inv1.set('used', false)
      app.save(inv1)
    }

    try {
      app.findFirstRecordByData('invites', 'token', 'convite-membro-ana')
    } catch (_) {
      const inv2 = new Record(invitesCol)
      inv2.set('token', 'convite-membro-ana')
      inv2.set('whatsapp', '(11) 97100-3355')
      inv2.set('email', 'ana.silva@email.com')
      inv2.set('role', 'member')
      inv2.set('person', pSilvaSpouse.id)
      inv2.set('used', false)
      app.save(inv2)
    }

    // 5. Seed Activities
    const activitiesList = [
      {
        title: 'Novo visitante cadastrado',
        description:
          'Gabriel Menezes Santos preencheu o formulário via QR Code no Culto de Domingo.',
        type: 'visitor_signup',
        person: pVisitor1.id,
      },
      {
        title: 'Avanço na Jornada Logos',
        description: 'Mariana Duarte concluiu a Classe de Boas-Vindas e avançou para Frequentador.',
        type: 'journey_change',
        person: pAttender.id,
      },
      {
        title: 'Novo visitante cadastrado',
        description: 'Juliana Rocha conheceu a igreja pelo Instagram e se cadastrou.',
        type: 'visitor_signup',
        person: pVisitor2.id,
      },
      {
        title: 'Membro integrado',
        description:
          'Ana Carolina Silva foi confirmada como Membra oficial e vinculada à Família Silva.',
        type: 'journey_change',
        person: pSilvaSpouse.id,
      },
    ]

    for (const act of activitiesList) {
      try {
        const aRec = new Record(activitiesCol)
        aRec.set('title', act.title)
        aRec.set('description', act.description)
        aRec.set('type', act.type)
        if (act.person) aRec.set('person', act.person)
        app.save(aRec)
      } catch (_) {}
    }
  },
  (app) => {
    // down logic
  },
)
