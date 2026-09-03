routerAdd('POST', '/backend/v1/invites/claim', (e) => {
  const info = e.requestInfo()
  const body = info.body || {}
  const token = body.token || ''
  const password = body.password || ''
  const name = body.name || ''
  const email = body.email || ''

  if (!token || !password) {
    return e.json(400, { error: 'Token e senha são obrigatórios' })
  }

  if (password.length < 8) {
    return e.json(400, { error: 'A senha deve ter no mínimo 8 caracteres' })
  }

  let invite
  try {
    invite = $app.findFirstRecordByData('invites', 'token', token)
  } catch (_) {
    return e.json(404, { error: 'Convite não encontrado ou inválido' })
  }

  if (invite.getBool('used')) {
    return e.json(400, { error: 'Este convite já foi utilizado' })
  }

  const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
  const userEmail =
    email || invite.getString('email') || invite.getString('token') + '@logosigreja.local'
  const userName = name || 'Membro Logos'

  let user
  try {
    user = $app.findAuthRecordByEmail('_pb_users_auth_', userEmail)
    // User already exists, update password
    user.setPassword(password)
    $app.save(user)
  } catch (_) {
    user = new Record(usersCol)
    user.setEmail(userEmail)
    user.setPassword(password)
    user.setVerified(true)
    user.set('name', userName)
    $app.save(user)
  }

  // Link to person if present
  const personId = invite.getString('person')
  if (personId) {
    try {
      const personsCol = $app.findCollectionByNameOrId('persons')
      const person = $app.findFirstRecordByData('persons', 'id', personId)
      person.set('user', user.id)
      if (email) person.set('email', email)
      if (invite.getString('role')) {
        const invRole = invite.getString('role')
        if (invRole === 'pastor' || invRole === 'leader' || invRole === 'member') {
          person.set('status', invRole)
        }
      }
      $app.save(person)
    } catch (err) {
      console.log('Erro ao vincular pessoa:', err)
    }
  }

  // Mark invite as used
  invite.set('used', true)
  $app.save(invite)

  // Log activity
  try {
    const actCol = $app.findCollectionByNameOrId('activities')
    const act = new Record(actCol)
    act.set('title', 'Convite aceito')
    act.set('description', userName + ' aceitou o convite e ativou seu acesso.')
    act.set('type', 'invite_accepted')
    if (personId) act.set('person', personId)
    $app.save(act)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Conta ativada com sucesso!',
    email: userEmail,
  })
})
