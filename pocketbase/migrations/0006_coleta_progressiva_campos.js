migrate(
  (app) => {
    const personsCol = app.findCollectionByNameOrId('persons')

    // Bairro (2ª visita - "Para lembrarmos do seu aniversário e indicar programações para sua família")
    if (!personsCol.fields.getByName('neighborhood')) {
      personsCol.fields.add(
        new TextField({
          name: 'neighborhood',
          required: false,
        }),
      )
    }

    // Tem filhos e idades / informações sobre filhos (2ª visita)
    if (!personsCol.fields.getByName('has_children')) {
      personsCol.fields.add(
        new BoolField({
          name: 'has_children',
          required: false,
        }),
      )
    }

    if (!personsCol.fields.getByName('children_info')) {
      personsCol.fields.add(
        new TextField({
          name: 'children_info',
          required: false,
        }),
      )
    }

    // Como conheceu a igreja (2ª visita) - texto livre ou canal
    if (!personsCol.fields.getByName('how_met_details')) {
      personsCol.fields.add(
        new TextField({
          name: 'how_met_details',
          required: false,
        }),
      )
    }

    // Interesse em ser membro ou ser batizado (Virada para frequentador)
    if (!personsCol.fields.getByName('interest_in_membership')) {
      personsCol.fields.add(
        new BoolField({
          name: 'interest_in_membership',
          required: false,
        }),
      )
    }

    if (!personsCol.fields.getByName('interest_in_baptism')) {
      personsCol.fields.add(
        new BoolField({
          name: 'interest_in_baptism',
          required: false,
        }),
      )
    }

    // Estado civil (Ingresso como membro)
    if (!personsCol.fields.getByName('marital_status')) {
      personsCol.fields.add(
        new SelectField({
          name: 'marital_status',
          required: false,
          values: ['solteiro', 'casado', 'viuvo', 'divorciado', 'uniao_estavel'],
          maxSelect: 1,
        }),
      )
    }

    // Rastreamento de ofertas / convites apresentados e aceitos (3ª visita em diante - não repetir o que já foi feito)
    if (!personsCol.fields.getByName('app_invited')) {
      personsCol.fields.add(
        new BoolField({
          name: 'app_invited',
          required: false,
        }),
      )
    }

    if (!personsCol.fields.getByName('app_downloaded')) {
      personsCol.fields.add(
        new BoolField({
          name: 'app_downloaded',
          required: false,
        }),
      )
    }

    app.save(personsCol)
  },
  (app) => {
    // Revert is optional or can clean fields if needed
  },
)
