// Catalogue based on the "Taxi Tours Calheta" price board at the Calheta taxi rank.
//
// Prices, routes and stops come from that board (prices per taxi, departing from Calheta).
// Durations, texts and FAQ answers are still drafts: João must confirm them before launch, then
// remove `placeholder: true` from the record.
// Board rules shown on the site: weekend prices for transfers (`priceWeekend`) and "+20% above
// 4 people" (messages: Services.groupNote).
//
// Every service is requested by WhatsApp or phone: there is no booking form.
//
// Levada services use ids starting with "levada-": the tours page lists them in their own group.
// Slugs are identical in en and pt on purpose: localised slugs are not approved yet.
//
// TODO: real photos per service. Until then every gallery reuses /images/hero.webp.

/** Localised string helper: l('English', 'Português europeu'). */
const l = (en, pt) => ({ en, pt })

const HERO_IMAGE = {
  src: '/images/hero.webp',
  // Placeholder image: aerial view of Seixal, north coast.
  alt: l(
    'Aerial view of Seixal on the north coast of Madeira, with houses beside a rocky coastline and natural sea pools',
    'Vista aérea do Seixal, na costa norte da Madeira, com casas junto a uma costa rochosa e piscinas naturais'
  ),
}

const CALHETA = l('Calheta', 'Calheta')

const INCLUDES = {
  driver: l('Private taxi with a local driver', 'Táxi particular com motorista local'),
  fuel: l('Fuel and tolls', 'Combustível e portagens'),
  door: l('Pick-up at your accommodation in Calheta', 'Recolha no seu alojamento na Calheta'),
  viewpoints: l('Stops at every viewpoint on the route', 'Paragens em todos os miradouros da rota'),
  waiting: l('Waiting time at each stop', 'Tempo de espera em cada paragem'),
  trailhead: l('Drop-off at the start of the trail', 'Deixa no início do trilho'),
  roundTrip: l(
    'Return trip, with pick-up at the end of the walk',
    'Regresso, com recolha no fim da caminhada'
  ),
}

const EXCLUDES = {
  meals: l('Meals and drinks', 'Refeições e bebidas'),
  entrance: l(
    'Entrance fees (cable cars, gardens, distillery)',
    'Entradas (teleféricos, jardins, destilaria)'
  ),
  tips: l('Tips (optional)', 'Gorjetas (opcionais)'),
  guide: l('Walking guide', 'Guia de caminhada'),
  returnTrip: l(
    'Pick-up at the end of the walk (ask for the price)',
    'Recolha no fim da caminhada (pergunte o preço)'
  ),
}

const base = {
  published: true,
  placeholder: true,
  currency: 'EUR',
  pricingModel: 'perVehicle',
  capacity: 6, // passengers, one taxi
  updatedAt: '2026-11-24',
}

const FAQ_GROUP = {
  q: l('What if we are more than 4 people?', 'E se formos mais de 4 pessoas?'),
  a: l(
    'The taxi takes up to 6 passengers. Above 4 people the price goes up by 20%.',
    'O táxi leva até 6 passageiros. Acima de 4 pessoas, o valor tem um acréscimo de 20%.'
  ),
}

const FAQ_OUTSIDE = {
  q: l('Can you pick me up outside Calheta?', 'Podem recolher-me fora da Calheta?'),
  a: l(
    'Yes. The prices shown start in Calheta. From Ponta do Sol, Funchal or elsewhere, send João your address on WhatsApp and he tells you the price.',
    'Sim. Os preços indicados são com partida da Calheta. A partir da Ponta do Sol, do Funchal ou de outro local, envie a morada ao João por WhatsApp e ele indica o valor.'
  ),
}

// ------------------------------------------------------------------ Transfers

/** Transfer from Calheta with a weekday and a weekend price (board: "Táxi Calheta Transfers"). */
function transfer({ id, slug, place, title, seo, summary, body, duration, price, weekend, faq }) {
  return {
    ...base,
    id,
    type: 'transfer',
    slug,
    title,
    seo,
    summary,
    body,
    duration,
    priceFrom: price,
    priceWeekend: weekend,
    route: { from: CALHETA, to: place },
    stops: [],
    includes: [INCLUDES.driver, INCLUDES.door, INCLUDES.fuel],
    excludes: [EXCLUDES.tips],
    faq: [...faq, FAQ_GROUP],
    gallery: [HERO_IMAGE],
  }
}

const transfers = [
  transfer({
    id: 'transfer-calheta-airport',
    slug: 'calheta-airport-transfer',
    place: l('Madeira airport', 'Aeroporto da Madeira'),
    title: l('Calheta ↔ Madeira airport', 'Calheta ↔ Aeroporto da Madeira'),
    seo: {
      title: l(
        'Taxi from Calheta to Madeira airport',
        'Táxi da Calheta para o aeroporto da Madeira'
      ),
      description: l(
        'Private taxi between Calheta and Madeira airport: €75 on weekdays, €90 at weekends. Ask João on WhatsApp or call.',
        'Táxi privado entre a Calheta e o aeroporto da Madeira: 75 € em dias úteis, 90 € ao fim de semana. Fale com o João por WhatsApp ou telefone.'
      ),
    },
    summary: l(
      'From the airport straight to your door in Calheta, or from Calheta to your flight.',
      'Do aeroporto diretamente até à sua porta na Calheta, ou da Calheta até ao seu voo.'
    ),
    body: {
      en: [
        'João meets you at arrivals, helps with the bags and drives you along the south coast to Calheta. For the way back, he picks you up at your accommodation with time to spare before your flight.',
        'Send your flight number on WhatsApp so he can follow the arrival time. Weekday price €75, weekends €90, per taxi.',
      ],
      pt: [
        'O João espera-o nas chegadas, ajuda com as malas e leva-o pela costa sul até à Calheta. No regresso, recolhe-o no alojamento com tempo de sobra para o voo.',
        'Envie o número do voo por WhatsApp para ele acompanhar a hora de chegada. Preço em dias úteis 75 €, ao fim de semana 90 €, por táxi.',
      ],
    },
    duration: l('About 50 minutes', 'Cerca de 50 minutos'),
    price: 75,
    weekend: 90,
    faq: [
      {
        q: l('What if my flight is late?', 'E se o meu voo se atrasar?'),
        a: l(
          'Send João your flight number. He follows the arrival time and adjusts the pick-up.',
          'Envie ao João o número do voo. Ele acompanha a hora de chegada e ajusta a recolha.'
        ),
      },
    ],
  }),
  transfer({
    id: 'transfer-calheta-funchal',
    slug: 'calheta-funchal-transfer',
    place: l('Funchal centre', 'Centro do Funchal'),
    title: l('Calheta ↔ Funchal centre', 'Calheta ↔ Centro do Funchal'),
    seo: {
      title: l('Taxi from Calheta to Funchal centre', 'Táxi da Calheta para o centro do Funchal'),
      description: l(
        'Private taxi between Calheta and Funchal centre: €50 on weekdays, €60 at weekends. Ask João on WhatsApp or call.',
        'Táxi privado entre a Calheta e o centro do Funchal: 50 € em dias úteis, 60 € ao fim de semana. Fale com o João por WhatsApp ou telefone.'
      ),
    },
    summary: l(
      'A day in the capital, a dinner in town or a cruise connection, from Calheta.',
      'Um dia na capital, um jantar na cidade ou a ligação a um cruzeiro, a partir da Calheta.'
    ),
    body: {
      en: [
        'Calheta is where João lives and works, so this is the route he drives most. Use it for a day in Funchal, a dinner in town, an appointment or a cruise connection.',
        'You choose the time. For the way back, agree a time and place on WhatsApp and João will be there. Weekday price €50, weekends €60, per taxi.',
      ],
      pt: [
        'A Calheta é onde o João vive e trabalha, por isso é o percurso que mais faz. Serve para um dia no Funchal, um jantar na cidade, uma consulta ou a ligação a um cruzeiro.',
        'É o cliente que escolhe a hora. Para o regresso, combine a hora e o local por WhatsApp e o João estará lá. Preço em dias úteis 50 €, ao fim de semana 60 €, por táxi.',
      ],
    },
    duration: l('About 40 minutes', 'Cerca de 40 minutos'),
    price: 50,
    weekend: 60,
    faq: [
      {
        q: l('Can I book the way back too?', 'Posso reservar também o regresso?'),
        a: l(
          'Yes. Tell João both times on WhatsApp. Each way is charged at the price shown.',
          'Sim. Indique as duas horas ao João por WhatsApp. Cada sentido é cobrado ao preço indicado.'
        ),
      },
    ],
  }),
  transfer({
    id: 'transfer-calheta-porto-moniz',
    slug: 'calheta-porto-moniz-transfer',
    place: l('Porto Moniz', 'Porto Moniz'),
    title: l('Calheta ↔ Porto Moniz', 'Calheta ↔ Porto Moniz'),
    seo: {
      title: l('Taxi from Calheta to Porto Moniz', 'Táxi da Calheta para o Porto Moniz'),
      description: l(
        'Private taxi between Calheta and the natural pools of Porto Moniz: €55 on weekdays, €65 at weekends. Ask João on WhatsApp.',
        'Táxi privado entre a Calheta e as piscinas naturais do Porto Moniz: 55 € em dias úteis, 65 € ao fim de semana. Fale com o João por WhatsApp.'
      ),
    },
    summary: l(
      'Over the mountains to the volcanic sea pools on the north-west tip of the island.',
      'Pela serra até às piscinas naturais vulcânicas no extremo noroeste da ilha.'
    ),
    body: {
      en: [
        'The road from Calheta climbs over the plateau and drops down to Porto Moniz, famous for its natural pools carved out of volcanic rock. Spend the day swimming and having lunch by the sea.',
        'Agree the time to come back on WhatsApp and João picks you up. Weekday price €55, weekends €65, per taxi.',
      ],
      pt: [
        'A estrada da Calheta sobe ao planalto e desce até ao Porto Moniz, famoso pelas piscinas naturais escavadas na rocha vulcânica. Passe o dia a nadar e almoce junto ao mar.',
        'Combine a hora de regresso por WhatsApp e o João vai buscá-lo. Preço em dias úteis 55 €, ao fim de semana 65 €, por táxi.',
      ],
    },
    duration: l('About 40 minutes', 'Cerca de 40 minutos'),
    price: 55,
    weekend: 65,
    faq: [
      {
        q: l('Are the pools open all year?', 'As piscinas estão abertas todo o ano?'),
        a: l(
          'They depend on the sea. On rough days they can close, so check with João before you go.',
          'Dependem do mar. Em dias de mar agitado podem fechar, por isso confirme com o João antes de ir.'
        ),
      },
    ],
  }),
]

// ---------------------------------------------------------------------- Tours

const TOUR_INCLUDES = [
  INCLUDES.driver,
  INCLUDES.door,
  INCLUDES.viewpoints,
  INCLUDES.waiting,
  INCLUDES.fuel,
]
const TOUR_EXCLUDES = [EXCLUDES.meals, EXCLUDES.entrance, EXCLUDES.tips]
const ROUND_CALHETA = { from: CALHETA, to: l('Back to Calheta', 'Regresso à Calheta') }

const tours = [
  {
    ...base,
    id: 'tour-west',
    type: 'tour',
    slug: 'west-madeira-tour',
    title: l('West Tour: Porto Moniz route', 'West Tour: Rota do Porto Moniz'),
    seo: {
      title: l(
        'West Madeira taxi tour from Calheta: Porto Moniz',
        'Tour de táxi pelo oeste da Madeira a partir da Calheta'
      ),
      description: l(
        'Full-day private taxi tour from Calheta: Jardim do Mar, Paul do Mar, Ponta do Pargo, Porto Moniz, Seixal and São Vicente. €150 per taxi.',
        'Tour privado de táxi de dia inteiro a partir da Calheta: Jardim do Mar, Paul do Mar, Ponta do Pargo, Porto Moniz, Seixal e São Vicente. 150 € por táxi.'
      ),
    },
    summary: l(
      "Fishing villages, the Ponta do Pargo lighthouse and the Porto Moniz sea pools, on João's home ground.",
      'Aldeias piscatórias, o farol da Ponta do Pargo e as piscinas do Porto Moniz, no território do João.'
    ),
    body: {
      en: [
        'The west is where João lives, so this tour starts at your door in Calheta. It follows the coast through Jardim do Mar and Paul do Mar, climbs to the lighthouse at Ponta do Pargo and drops to the north coast at Porto Moniz.',
        'From there the road runs past Seixal and the Bride’s Veil waterfall to São Vicente, then crosses the island back to Ribeira Brava and Calheta. Stay longer where you like it.',
      ],
      pt: [
        'O oeste é onde o João vive, por isso este tour começa à sua porta, na Calheta. Segue a costa pelo Jardim do Mar e pelo Paul do Mar, sobe ao farol da Ponta do Pargo e desce à costa norte, no Porto Moniz.',
        'Daí, a estrada passa pelo Seixal e pelo Véu da Noiva até São Vicente, e atravessa a ilha de volta à Ribeira Brava e à Calheta. Fique mais tempo onde gostar.',
      ],
    },
    duration: l('Full day, about 7 hours', 'Dia inteiro, cerca de 7 horas'),
    priceFrom: 150,
    route: ROUND_CALHETA,
    stops: [
      l('Jardim do Mar', 'Jardim do Mar'),
      l('Paul do Mar', 'Paul do Mar'),
      l('Ponta do Pargo lighthouse', 'Farol da Ponta do Pargo'),
      l('Porto Moniz natural pools', 'Piscinas naturais do Porto Moniz'),
      l('Seixal', 'Seixal'),
      l('São Vicente', 'São Vicente'),
      l('Ribeira Brava', 'Ribeira Brava'),
    ],
    includes: TOUR_INCLUDES,
    excludes: TOUR_EXCLUDES,
    faq: [
      {
        q: l(
          'Will we have time to swim in Porto Moniz?',
          'Teremos tempo para nadar no Porto Moniz?'
        ),
        a: l(
          'Usually yes. Bring swimwear and a towel and tell João, so he plans the time.',
          'Normalmente sim. Leve fato de banho e toalha e avise o João, para ele planear o tempo.'
        ),
      },
      FAQ_GROUP,
      FAQ_OUTSIDE,
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-middle', 'tour-east', 'transfer-calheta-porto-moniz'],
  },
  {
    ...base,
    id: 'tour-middle',
    type: 'tour',
    slug: 'middle-madeira-tour',
    title: l(
      "Middle Tour: Cabo Girão and Nuns' Valley",
      'Middle Tour: Cabo Girão e Curral das Freiras'
    ),
    seo: {
      title: l(
        "Cabo Girão and Nuns' Valley taxi tour from Calheta",
        'Tour Cabo Girão e Curral das Freiras a partir da Calheta'
      ),
      description: l(
        "Private taxi tour from Calheta: Cabo Girão skywalk, Câmara de Lobos, Pico dos Barcelos and Eira do Serrado over Nuns' Valley. €120 per taxi.",
        'Tour privado de táxi a partir da Calheta: Cabo Girão, Câmara de Lobos, Pico dos Barcelos e Eira do Serrado sobre o Curral das Freiras. 120 € por táxi.'
      ),
    },
    summary: l(
      "Europe's highest sea cliff, a fishing village and the valley hidden in the mountains.",
      'A falésia mais alta da Europa, uma vila piscatória e o vale escondido na serra.'
    ),
    body: {
      en: [
        'A shorter day in the middle of the south coast. Walk out on the glass platform at Cabo Girão, 580 metres above the sea, then have a coffee by the boats in Câmara de Lobos, the village Winston Churchill liked to paint.',
        'The road then climbs to Pico dos Barcelos, with its view over Funchal, and to Eira do Serrado, high above Curral das Freiras, the valley where the nuns hid from pirates.',
      ],
      pt: [
        'Um dia mais curto no centro da costa sul. Caminhe na plataforma de vidro do Cabo Girão, a 580 metros sobre o mar, e beba um café junto aos barcos em Câmara de Lobos, a vila que Winston Churchill gostava de pintar.',
        'A estrada sobe depois ao Pico dos Barcelos, com vista sobre o Funchal, e à Eira do Serrado, bem acima do Curral das Freiras, o vale onde as freiras se escondiam dos piratas.',
      ],
    },
    duration: l('About 5 hours', 'Cerca de 5 horas'),
    priceFrom: 120,
    route: ROUND_CALHETA,
    stops: [
      l('Cabo Girão skywalk', 'Miradouro do Cabo Girão'),
      l('Câmara de Lobos', 'Câmara de Lobos'),
      l('Pico dos Barcelos', 'Pico dos Barcelos'),
      l("Eira do Serrado, over Nuns' Valley", 'Eira do Serrado, sobre o Curral das Freiras'),
    ],
    includes: TOUR_INCLUDES,
    excludes: TOUR_EXCLUDES,
    faq: [
      {
        q: l('Is it cold at Eira do Serrado?', 'Está frio na Eira do Serrado?'),
        a: l(
          'It is over 1,000 metres high and often cooler than the coast. Bring a light jacket.',
          'Fica a mais de 1000 metros de altitude e costuma estar mais fresco do que na costa. Leve um casaco leve.'
        ),
      },
      FAQ_GROUP,
      FAQ_OUTSIDE,
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-west', 'tour-east', 'transfer-calheta-funchal'],
  },
  {
    ...base,
    id: 'tour-east',
    type: 'tour',
    slug: 'east-madeira-tour',
    title: l('East Tour: Santana route', 'East Tour: Rota de Santana'),
    seo: {
      title: l(
        'East Madeira taxi tour from Calheta: Santana',
        'Tour de táxi pelo leste da Madeira a partir da Calheta'
      ),
      description: l(
        'Full-day private taxi tour from Calheta: Cristo Rei, Machico, Ponta de São Lourenço, Porto da Cruz, Santana and São Jorge. €170 per taxi.',
        'Tour privado de táxi de dia inteiro a partir da Calheta: Cristo Rei, Machico, Ponta de São Lourenço, Porto da Cruz, Santana e São Jorge. 170 € por táxi.'
      ),
    },
    summary: l(
      'Across the island to the east: Cristo Rei, the São Lourenço peninsula and the Santana houses.',
      'Atravessar a ilha até ao leste: Cristo Rei, a península de São Lourenço e as casas de Santana.'
    ),
    body: {
      en: [
        'The longest tour on the board. From Calheta, João drives east to the Christ the King statue at Garajau, the bay of Machico and the Rosto viewpoint over Ponta de São Lourenço, where the first settlers landed.',
        'The way back follows the north coast: the rum distillery at Porto da Cruz, the Guindaste viewpoint in Faial, the thatched houses of Santana, Arco de São Jorge and Ponta Delgada.',
      ],
      pt: [
        'O tour mais longo da tabela. Da Calheta, o João segue para leste até ao Cristo Rei no Garajau, à baía de Machico e ao Miradouro do Rosto, sobre a Ponta de São Lourenço, onde chegaram os primeiros povoadores.',
        'O regresso faz-se pela costa norte: a destilaria de rum do Porto da Cruz, o Miradouro do Guindaste no Faial, as casas típicas de Santana, o Arco de São Jorge e a Ponta Delgada.',
      ],
    },
    duration: l('Full day, about 9 hours', 'Dia inteiro, cerca de 9 horas'),
    priceFrom: 170,
    route: ROUND_CALHETA,
    stops: [
      l('Garajau (Christ the King)', 'Garajau (Cristo Rei)'),
      l('Machico', 'Machico'),
      l('Ponta de São Lourenço (Rosto viewpoint)', 'Ponta de São Lourenço (Miradouro do Rosto)'),
      l('Porto da Cruz (rum distillery)', 'Porto da Cruz (destilaria)'),
      l('Faial (Guindaste viewpoint)', 'Faial (Miradouro do Guindaste)'),
      l('Santana', 'Santana'),
      l('Arco de São Jorge', 'Arco de São Jorge'),
      l('Ponta Delgada', 'Ponta Delgada'),
    ],
    includes: TOUR_INCLUDES,
    excludes: TOUR_EXCLUDES,
    faq: [
      {
        q: l('Is it a long day?', 'É um dia longo?'),
        a: l(
          'Yes, the east is the farthest part of the island from Calheta. Start early and João keeps a steady pace with plenty of stops.',
          'Sim, o leste é a parte da ilha mais distante da Calheta. Comece cedo e o João mantém um ritmo tranquilo, com muitas paragens.'
        ),
      },
      FAQ_GROUP,
      FAQ_OUTSIDE,
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-west', 'tour-middle', 'levada-ponta-sao-lourenco'],
  },
  {
    ...base,
    id: 'tour-custom',
    type: 'tour',
    slug: 'custom-trip',
    title: l('Around the island or custom tour', 'Volta à ilha ou tour à medida'),
    seo: {
      title: l(
        'Custom private taxi tour in Madeira from Calheta',
        'Tour de táxi à medida na Madeira a partir da Calheta'
      ),
      description: l(
        'Tell João what you want to see in Madeira and he plans a private taxi tour from Calheta around it. Ask on WhatsApp.',
        'Diga ao João o que quer ver na Madeira e ele planeia um tour privado de táxi a partir da Calheta. Fale por WhatsApp.'
      ),
    },
    summary: l(
      'The whole island in one day, or your own list of places. João plans it with you.',
      'A ilha inteira num dia, ou a sua própria lista de sítios. O João planeia-o consigo.'
    ),
    body: {
      en: [
        'If none of the fixed tours fits, send João your idea on WhatsApp: a trip around the whole island, a particular village, Pico do Areeiro, a restaurant or a family visit.',
        'He tells you if it works, how long it takes and the price before you commit.',
      ],
      pt: [
        'Se nenhum dos tours fixos lhe servir, envie a sua ideia ao João por WhatsApp: uma volta à ilha inteira, uma aldeia em particular, o Pico do Areeiro, um restaurante ou uma visita a familiares.',
        'Ele diz-lhe se é possível, quanto tempo demora e o preço, antes de assumir qualquer compromisso.',
      ],
    },
    duration: l('To be agreed', 'A combinar'),
    priceFrom: null,
    route: {
      from: l('Calheta or your choice', 'Calheta ou à sua escolha'),
      to: l('Your choice', 'À sua escolha'),
    },
    stops: [],
    includes: [INCLUDES.driver, INCLUDES.door, INCLUDES.fuel],
    excludes: TOUR_EXCLUDES,
    faq: [
      {
        q: l('What should I send João?', 'O que devo enviar ao João?'),
        a: l(
          'The date, where you start, the places you want to see, how many people and roughly how many hours you have.',
          'A data, o ponto de partida, os sítios que quer ver, quantas pessoas são e, aproximadamente, quantas horas tem.'
        ),
      },
      FAQ_GROUP,
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-west', 'tour-east', 'tour-middle'],
  },
]

// -------------------------------------------------------------------- Levadas

/**
 * Taxi to the start of a levada walk, from Calheta (board: "Levadas").
 * `roundTrip`: ↔ on the board (taken and brought back); otherwise → (one way, drop-off only).
 */
function levada({ key, name, area, price, roundTrip, about, seoDescription, related }) {
  const tripLabel = roundTrip
    ? l('Return trip from Calheta', 'Ida e volta a partir da Calheta')
    : l('One way from Calheta', 'Só ida a partir da Calheta')
  return {
    ...base,
    id: `levada-${key}`,
    type: 'tour',
    slug: `levada-${key}`,
    title: l(`Levada walk: ${name.en}`, `Levada: ${name.pt}`),
    seo: {
      title: l(
        `Taxi from Calheta to ${name.en} levada walk`,
        `Táxi da Calheta para a levada ${name.pt}`
      ),
      description: seoDescription,
    },
    summary: about.summary,
    body: {
      en: [
        about.en,
        roundTrip
          ? `João drops you at the start of the trail, in ${area.en}, and picks you up when you finish. €${price} per taxi, there and back.`
          : `João drops you at the start of the trail, in ${area.en}. €${price} per taxi, one way. Need a pick-up at the end? Ask on WhatsApp.`,
      ],
      pt: [
        about.pt,
        roundTrip
          ? `O João deixa-o no início do trilho, em ${area.pt}, e vai buscá-lo quando terminar. ${price} € por táxi, ida e volta.`
          : `O João deixa-o no início do trilho, em ${area.pt}. ${price} € por táxi, só ida. Precisa de recolha no fim? Pergunte por WhatsApp.`,
      ],
    },
    duration: tripLabel,
    priceFrom: price,
    route: { from: CALHETA, to: area },
    stops: [],
    includes: roundTrip
      ? [INCLUDES.driver, INCLUDES.door, INCLUDES.trailhead, INCLUDES.roundTrip]
      : [INCLUDES.driver, INCLUDES.door, INCLUDES.trailhead],
    excludes: roundTrip
      ? [EXCLUDES.guide, EXCLUDES.meals, EXCLUDES.tips]
      : [EXCLUDES.returnTrip, EXCLUDES.guide, EXCLUDES.tips],
    faq: [
      {
        q: l('Does João walk with us?', 'O João caminha connosco?'),
        a: l(
          'No. João is a taxi driver. He takes you to the trail and, if agreed, collects you at the end.',
          'Não. O João é taxista. Leva-o ao trilho e, se combinado, vai buscá-lo no fim.'
        ),
      },
      {
        q: l('Is the trail open?', 'O trilho está aberto?'),
        a: l(
          'Trails close after storms or for repairs. Check the official IFCN website or ask João the day before.',
          'Os trilhos fecham depois de temporais ou para obras. Consulte o site oficial do IFCN ou pergunte ao João no dia anterior.'
        ),
      },
      FAQ_GROUP,
    ],
    gallery: [HERO_IMAGE],
    related,
  }
}

const levadas = [
  levada({
    key: '25-fontes-risco',
    name: l('25 Fontes and Risco', '25 Fontes e Risco'),
    area: l('Rabaçal', 'Rabaçal'),
    price: 55,
    roundTrip: true,
    about: {
      summary: l(
        'The most famous walk on the island, to a pool fed by 25 springs and the Risco waterfall.',
        'O percurso mais famoso da ilha, até à lagoa das 25 Fontes e à cascata do Risco.'
      ),
      en: 'From Rabaçal, two levadas lead through laurel forest to the Risco waterfall and to the lagoon of the 25 springs. It is the closest of the big walks to Calheta.',
      pt: 'A partir do Rabaçal, duas levadas atravessam a floresta laurissilva até à cascata do Risco e à lagoa das 25 Fontes. É a grande caminhada mais próxima da Calheta.',
    },
    seoDescription: l(
      'Taxi from Calheta to Rabaçal for the 25 Fontes and Risco levada walk, there and back: €55 per taxi. Ask João on WhatsApp.',
      'Táxi da Calheta ao Rabaçal para a levada das 25 Fontes e do Risco, ida e volta: 55 € por táxi. Fale com o João por WhatsApp.'
    ),
    related: ['levada-alecrim', 'levada-fanal', 'tour-west'],
  }),
  levada({
    key: 'alecrim',
    name: l('Alecrim (Rosemary levada)', 'Alecrim'),
    area: l('Rabaçal', 'Rabaçal'),
    price: 55,
    roundTrip: true,
    about: {
      summary: l(
        'A quiet levada through the forest to the Lagoa do Vento and the Lagoa do Dino.',
        'Uma levada sossegada pela floresta até à Lagoa do Vento e à Lagoa do Dino.'
      ),
      en: 'The Rosemary levada also starts at Rabaçal and is calmer than 25 Fontes. It follows the water through the forest to small lakes and waterfalls.',
      pt: 'A Levada do Alecrim também começa no Rabaçal e é mais calma do que a das 25 Fontes. Segue a água pela floresta até pequenas lagoas e cascatas.',
    },
    seoDescription: l(
      'Taxi from Calheta to Rabaçal for the Rosemary (Alecrim) levada walk, there and back: €55 per taxi. Ask João on WhatsApp.',
      'Táxi da Calheta ao Rabaçal para a Levada do Alecrim, ida e volta: 55 € por táxi. Fale com o João por WhatsApp.'
    ),
    related: ['levada-25-fontes-risco', 'levada-fanal', 'levada-moinho'],
  }),
  levada({
    key: 'fanal',
    name: l('Fanal forest', 'Fanal'),
    area: l('Fanal', 'Fanal'),
    price: 45,
    roundTrip: false,
    about: {
      summary: l(
        'Centuries-old laurel trees in the mist: the most photographed forest in Madeira.',
        'Til centenários no meio do nevoeiro: a floresta mais fotografada da Madeira.'
      ),
      en: 'Fanal is a high meadow of ancient til trees, famous for its mystical look when the fog rolls in. Walk among the trees or follow one of the trails from there.',
      pt: 'O Fanal é um prado de altitude com tis centenários, famoso pelo ar místico quando chega o nevoeiro. Passeie entre as árvores ou siga um dos trilhos a partir dali.',
    },
    seoDescription: l(
      'Taxi from Calheta to the Fanal forest: €45 per taxi, one way. Ask João on WhatsApp for the pick-up.',
      'Táxi da Calheta para a floresta do Fanal: 45 € por táxi, só ida. Fale com o João por WhatsApp para a recolha.'
    ),
    related: ['levada-25-fontes-risco', 'levada-lamaceiros', 'tour-west'],
  }),
  levada({
    key: 'moinho',
    name: l('Levada do Moinho', 'Levada do Moinho'),
    area: l('Ponta do Pargo', 'Ponta do Pargo'),
    price: 25,
    roundTrip: false,
    about: {
      summary: l(
        'A short, gentle levada in the far west, close to Calheta.',
        'Uma levada curta e tranquila no extremo oeste, perto da Calheta.'
      ),
      en: 'Levada do Moinho runs through the green hills of the west, with small tunnels and old water mills. It is the cheapest and closest walk on the board.',
      pt: 'A Levada do Moinho percorre as colinas verdes do oeste, com pequenos túneis e antigos moinhos de água. É a caminhada mais barata e mais próxima da tabela.',
    },
    seoDescription: l(
      'Taxi from Calheta to the Levada do Moinho walk in the west of Madeira: €25 per taxi, one way. Ask João on WhatsApp.',
      'Táxi da Calheta para a Levada do Moinho, no oeste da Madeira: 25 € por táxi, só ida. Fale com o João por WhatsApp.'
    ),
    related: ['levada-alecrim', 'levada-25-fontes-risco', 'tour-west'],
  }),
  levada({
    key: 'lamaceiros',
    name: l('Lamaceiros', 'Lamaceiros'),
    area: l('Lamaceiros, Porto Moniz', 'Lamaceiros, Porto Moniz'),
    price: 50,
    roundTrip: false,
    about: {
      summary: l(
        'The Ribeira da Janela levada, with tunnels and views over the north-west valleys.',
        'A Levada da Ribeira da Janela, com túneis e vistas sobre os vales do noroeste.'
      ),
      en: 'From the forest station at Lamaceiros, above Porto Moniz, the levada follows the Ribeira da Janela valley through tunnels and laurel forest.',
      pt: 'A partir do posto florestal dos Lamaceiros, acima do Porto Moniz, a levada segue o vale da Ribeira da Janela por túneis e floresta laurissilva.',
    },
    seoDescription: l(
      'Taxi from Calheta to Lamaceiros for the Ribeira da Janela levada walk: €50 per taxi, one way. Ask João on WhatsApp.',
      'Táxi da Calheta aos Lamaceiros para a levada da Ribeira da Janela: 50 € por táxi, só ida. Fale com o João por WhatsApp.'
    ),
    related: ['levada-fanal', 'transfer-calheta-porto-moniz', 'tour-west'],
  }),
  levada({
    key: 'levada-do-rei',
    name: l('Levada do Rei', 'Levada do Rei'),
    area: l('São Jorge', 'São Jorge'),
    price: 85,
    roundTrip: false,
    about: {
      summary: l(
        'An easy walk on the north coast, through laurel forest to a stream in the valley.',
        'Uma caminhada fácil na costa norte, pela laurissilva até a uma ribeira no vale.'
      ),
      en: 'Levada do Rei starts above São Jorge, on the north coast, and is one of the easiest walks into the laurel forest, ending at a clear stream.',
      pt: 'A Levada do Rei começa acima de São Jorge, na costa norte, e é uma das caminhadas mais fáceis pela laurissilva, terminando numa ribeira de água límpida.',
    },
    seoDescription: l(
      'Taxi from Calheta to the Levada do Rei walk in São Jorge: €85 per taxi, one way. Ask João on WhatsApp.',
      'Táxi da Calheta para a Levada do Rei, em São Jorge: 85 € por táxi, só ida. Fale com o João por WhatsApp.'
    ),
    related: ['levada-caldeirao-verde', 'levada-achada-teixeira', 'tour-east'],
  }),
  levada({
    key: 'caldeirao-verde',
    name: l('Caldeirão Verde', 'Caldeirão Verde'),
    area: l('Queimadas, Santana', 'Queimadas, Santana'),
    price: 105,
    roundTrip: false,
    about: {
      summary: l(
        'Tunnels, cliffs and a 100-metre waterfall falling into a green pool.',
        'Túneis, falésias e uma cascata de 100 metros a cair numa lagoa verde.'
      ),
      en: 'From the Queimadas forest park in Santana, the Caldeirão Verde levada runs along the cliffs and through tunnels to a waterfall in a deep green basin. Bring a torch.',
      pt: 'A partir do parque florestal das Queimadas, em Santana, a levada do Caldeirão Verde segue as falésias e atravessa túneis até uma cascata num caldeirão verde. Leve uma lanterna.',
    },
    seoDescription: l(
      'Taxi from Calheta to Queimadas for the Caldeirão Verde levada walk: €105 per taxi, one way. Ask João on WhatsApp.',
      'Táxi da Calheta às Queimadas para a levada do Caldeirão Verde: 105 € por táxi, só ida. Fale com o João por WhatsApp.'
    ),
    related: ['levada-levada-do-rei', 'levada-achada-teixeira', 'tour-east'],
  }),
  levada({
    key: 'pico-areeiro',
    name: l('Pico do Areeiro', 'Pico do Areeiro'),
    area: l('Pico do Areeiro', 'Pico do Areeiro'),
    price: 85,
    roundTrip: false,
    about: {
      summary: l(
        "The island's third highest peak and start of the ridge walk to Pico Ruivo.",
        'O terceiro pico mais alto da ilha e início do trilho de crista até ao Pico Ruivo.'
      ),
      en: 'Pico do Areeiro, at 1,818 metres, is the only high peak you can drive to. Watch the sunrise above the clouds or start the PR1 ridge walk to Pico Ruivo.',
      pt: 'O Pico do Areeiro, a 1818 metros, é o único pico alto onde se chega de carro. Veja o nascer do sol acima das nuvens ou comece o trilho PR1 até ao Pico Ruivo.',
    },
    seoDescription: l(
      'Taxi from Calheta to Pico do Areeiro for sunrise or the walk to Pico Ruivo: €85 per taxi, one way. Ask João on WhatsApp.',
      'Táxi da Calheta ao Pico do Areeiro para o nascer do sol ou o trilho até ao Pico Ruivo: 85 € por táxi, só ida. Fale com o João.'
    ),
    related: ['levada-achada-teixeira', 'tour-middle', 'tour-custom'],
  }),
  levada({
    key: 'achada-teixeira',
    name: l('Achada do Teixeira (Pico Ruivo)', 'Achada do Teixeira (Pico Ruivo)'),
    area: l('Achada do Teixeira, Santana', 'Achada do Teixeira, Santana'),
    price: 110,
    roundTrip: false,
    about: {
      summary: l(
        'The shortest way up to Pico Ruivo, the highest point of Madeira.',
        'O caminho mais curto até ao Pico Ruivo, o ponto mais alto da Madeira.'
      ),
      en: 'From Achada do Teixeira, above Santana, a paved path climbs to Pico Ruivo at 1,862 metres. It is also where the ridge walk from Pico do Areeiro ends.',
      pt: 'A partir da Achada do Teixeira, acima de Santana, um caminho calcetado sobe até ao Pico Ruivo, a 1862 metros. É também onde termina o trilho que vem do Pico do Areeiro.',
    },
    seoDescription: l(
      'Taxi from Calheta to Achada do Teixeira for the walk to Pico Ruivo: €110 per taxi, one way. Ask João on WhatsApp.',
      'Táxi da Calheta à Achada do Teixeira para a subida ao Pico Ruivo: 110 € por táxi, só ida. Fale com o João por WhatsApp.'
    ),
    related: ['levada-pico-areeiro', 'levada-caldeirao-verde', 'tour-east'],
  }),
  levada({
    key: 'ponta-sao-lourenco',
    name: l('Ponta de São Lourenço', 'Ponta de São Lourenço'),
    area: l('Ponta de São Lourenço, Caniçal', 'Ponta de São Lourenço, Caniçal'),
    price: 95,
    roundTrip: false,
    about: {
      summary: l(
        'A dry, windy peninsula at the eastern tip of the island, with sea on both sides.',
        'Uma península seca e ventosa no extremo leste da ilha, com mar dos dois lados.'
      ),
      en: 'The PR8 trail crosses the bare peninsula of São Lourenço, with cliffs and sea on both sides. There is little shade, so bring water, sun cream and a hat.',
      pt: 'O trilho PR8 atravessa a península nua de São Lourenço, com falésias e mar dos dois lados. Há pouca sombra, por isso leve água, protetor solar e chapéu.',
    },
    seoDescription: l(
      'Taxi from Calheta to the Ponta de São Lourenço walk at the east tip of Madeira: €95 per taxi, one way. Ask João on WhatsApp.',
      'Táxi da Calheta para o trilho da Ponta de São Lourenço, no extremo leste: 95 € por táxi, só ida. Fale com o João por WhatsApp.'
    ),
    related: ['tour-east', 'levada-caldeirao-verde', 'transfer-calheta-airport'],
  }),
]

transfers[0].related = ['transfer-calheta-funchal', 'tour-west', 'tour-middle']
transfers[1].related = ['transfer-calheta-airport', 'tour-middle', 'tour-east']
transfers[2].related = ['tour-west', 'levada-lamaceiros', 'transfer-calheta-funchal']

export const services = [...tours, ...levadas, ...transfers]
