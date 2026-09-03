routerAdd('POST', '/backend/v1/invites/create', (e) => {
  const info = e.requestInfo()
  const body = info.body || {}

  const personId = body.personId || ''
  const email = body.email || ''
  const whatsapp = body.whatsapp || ''
  const role = body.role || 'member'

  // Generate random safe token
  const token = $security.randomString(16).toLowerCase()

  const invitesCol = $app.findCollectionByNameOrId('invites')
  const invite = new Record(invitesCol)
  invite.set('token', token)
  invite.set('email', email)
  invite.set('whatsapp', whatsapp)
  invite.set('role', role)
  if (personId) {
    invite.set('person', personId)
  }
  invite.set('used', false)

  // Set expiry to 7 days from now
  const now = new Date()
  now.setDate(now.getDate() + 7)
  invite.set('expires', now.toISOString())

  $app.save(invite)

  // Log activity
  try {
    const actCol = $app.findCollectionByNameOrId('activities')
    const act = new Record(actCol)
    act.set('title', 'Convite gerado')
    act.set(
      'description',
      'Novo convite gerado para papel: ' + role + (email ? ' (' + email + ')' : ''),
    )
    act.set('type', 'invite_created')
    if (personId) act.set('person', personId)
    $app.save(act)
  } catch (_) {}

  return e.json(200, {
    success: true,
    token: token,
    inviteId: invite.id,
  })
})
