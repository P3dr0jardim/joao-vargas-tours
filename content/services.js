// PLACEHOLDER VALUES - replace with João's real data
//
// Every record below is a draft. Prices, durations, capacities, routes, stops, inclusions and
// FAQ answers are INVENTED so the site can be built and reviewed. João must confirm or replace
// each one before launch, then remove `placeholder: true` from the record.
// Prices are shown on the site together with the note "Indicative price, confirmed by João
// after your request" (messages: Services.priceNote).
//
// Data model: docs/seo-content-plan.md, section "Data model additions" (later MongoDB).
// Slugs are identical in en and pt on purpose: localised slugs are not approved yet.
//
// TODO: larger vehicle (more than 6 passengers). Not offered until João confirms it exists.
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

const INCLUDES = {
  driver: l('Private vehicle with a local driver', 'Viatura particular com motorista local'),
  fuel: l('Fuel', 'Combustível'),
  door: l('Pick-up and drop-off at your address', 'Recolha e entrega na sua morada'),
  arrivals: l('Meeting you at the arrivals hall', 'Receção na zona de chegadas'),
  viewpoints: l(
    'Short stops at viewpoints along the way',
    'Paragens curtas em miradouros pelo caminho'
  ),
  waiting: l(
    'Waiting time while you enjoy the stop',
    'Tempo de espera enquanto desfruta da paragem'
  ),
  planning: l('Help planning the route with you', 'Ajuda a planear o percurso consigo'),
}

const EXCLUDES = {
  meals: l('Meals and drinks', 'Refeições e bebidas'),
  entrance: l('Entrance fees', 'Bilhetes de entrada'),
  tips: l('Tips (optional)', 'Gorjetas (opcionais)'),
  lodging: l('Accommodation', 'Alojamento'),
  gear: l(
    'Walking boots, rain jacket, water and a torch',
    'Botas de caminhada, impermeável, água e lanterna'
  ),
}

const base = {
  published: true,
  placeholder: true,
  currency: 'EUR',
  pricingModel: 'perVehicle',
  capacity: 6, // passengers, one vehicle
  updatedAt: '2026-11-15',
}

export const services = [
  // ---------------------------------------------------------------- Transfers
  {
    ...base,
    id: 'transfer-funchal-airport',
    type: 'transfer',
    slug: 'funchal-airport-transfer',
    title: l('Funchal airport transfer', 'Transfer do aeroporto do Funchal'),
    seo: {
      title: l(
        'Funchal airport transfer with a local driver',
        'Transfer do aeroporto do Funchal com motorista local'
      ),
      description: l(
        'Private transfer from Funchal airport to your hotel or home in Madeira. A local driver waits at arrivals. Send a request and João confirms.',
        'Transfer privado do aeroporto do Funchal para o seu hotel ou alojamento na Madeira. Um motorista local espera-o nas chegadas. Envie um pedido e o João confirma.'
      ),
    },
    summary: l(
      'A private ride from the airport to your door, with a driver who knows the island roads.',
      'Uma viagem privada do aeroporto até à porta do seu alojamento, com um motorista que conhece as estradas da ilha.'
    ),
    body: {
      en: [
        'After a flight you want a simple start. João meets you at arrivals, helps with the bags and drives you straight to your hotel, apartment or guesthouse anywhere on the island.',
        'Tell him your flight number and where you are staying when you send the request. If you want a quick stop on the way, for a pharmacy or a supermarket, just ask.',
      ],
      pt: [
        'Depois de um voo, o melhor é começar sem complicações. O João espera-o nas chegadas, ajuda com as malas e leva-o diretamente ao hotel, apartamento ou alojamento, em qualquer ponto da ilha.',
        'Indique o número do voo e onde vai ficar quando enviar o pedido. Se quiser fazer uma paragem rápida pelo caminho, numa farmácia ou num supermercado, é só pedir.',
      ],
    },
    duration: l(
      'From 20 minutes, depending on the destination',
      'A partir de 20 minutos, consoante o destino'
    ),
    priceFrom: 50,
    route: {
      from: l('Funchal airport', 'Aeroporto do Funchal'),
      to: l('Your accommodation', 'O seu alojamento'),
    },
    stops: [],
    includes: [INCLUDES.driver, INCLUDES.arrivals, INCLUDES.door, INCLUDES.fuel],
    excludes: [EXCLUDES.tips],
    faq: [
      {
        q: l('What if my flight is late?', 'E se o meu voo se atrasar?'),
        a: l(
          'Give João your flight number in the request. He can follow the arrival time and adjust the pick-up.',
          'Indique o número do voo no pedido. O João pode acompanhar a hora de chegada e ajustar a recolha.'
        ),
      },
      {
        q: l(
          'Can I travel to somewhere other than Calheta?',
          'Posso ir para outro sítio que não a Calheta?'
        ),
        a: l(
          'Yes. The transfer goes to any address on the island. The price depends on the distance and is confirmed after your request.',
          'Sim. O transfer vai para qualquer morada da ilha. O preço depende da distância e é confirmado após o seu pedido.'
        ),
      },
      {
        q: l('How many people and bags fit?', 'Quantas pessoas e malas cabem?'),
        a: l(
          'Up to 6 passengers with normal luggage. If you carry something large, such as a surfboard, mention it in the request.',
          'Até 6 passageiros com bagagem normal. Se levar algo volumoso, como uma prancha de surf, refira-o no pedido.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['transfer-calheta-funchal', 'transfer-sunrise', 'tour-west'],
  },
  {
    ...base,
    id: 'transfer-calheta-funchal',
    type: 'transfer',
    slug: 'calheta-funchal-transfer',
    title: l('Calheta to Funchal transfer', 'Transfer Calheta - Funchal'),
    seo: {
      title: l('Calheta to Funchal private transfer', 'Transfer privado Calheta - Funchal'),
      description: l(
        'Private taxi transfer between Calheta and Funchal, one way or return, with a local driver. Send a request and João confirms the price.',
        'Transfer privado de táxi entre a Calheta e o Funchal, só de ida ou de ida e volta, com motorista local. Envie um pedido e o João confirma o preço.'
      ),
    },
    summary: l(
      'One way or return between the west coast and the capital, at the time that suits you.',
      'Só de ida ou de ida e volta entre a costa oeste e a capital, à hora que lhe der mais jeito.'
    ),
    body: {
      en: [
        'Calheta is where João lives and works, so this is the route he drives most. Use it for a day in Funchal, a dinner in town, a medical appointment or a ferry or cruise connection.',
        'You choose the pick-up time. For a return trip, agree a time and place for the way back and João will be there.',
      ],
      pt: [
        'A Calheta é onde o João vive e trabalha, por isso é o percurso que mais faz. Serve para um dia no Funchal, um jantar na cidade, uma consulta ou a ligação a um ferry ou a um cruzeiro.',
        'É o cliente que escolhe a hora de recolha. Numa viagem de ida e volta, combine a hora e o local do regresso e o João estará lá.',
      ],
    },
    duration: l('About 40 minutes each way', 'Cerca de 40 minutos em cada sentido'),
    priceFrom: 60,
    route: { from: l('Calheta', 'Calheta'), to: l('Funchal', 'Funchal') },
    stops: [],
    includes: [INCLUDES.driver, INCLUDES.door, INCLUDES.fuel],
    excludes: [EXCLUDES.tips],
    faq: [
      {
        q: l('Can I book the return trip too?', 'Posso reservar também a viagem de regresso?'),
        a: l(
          'Yes. Mention both trips in your request, with the time and place for the way back.',
          'Sim. Indique as duas viagens no pedido, com a hora e o local para o regresso.'
        ),
      },
      {
        q: l('Can you pick me up outside Calheta?', 'Podem recolher-me fora da Calheta?'),
        a: l(
          'Nearby villages on the west coast are usually fine. Tell João the address and he confirms the price.',
          'As localidades vizinhas da costa oeste costumam ser possíveis. Indique a morada ao João e ele confirma o preço.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['transfer-funchal-airport', 'transfer-sunset', 'tour-west'],
  },
  {
    ...base,
    id: 'transfer-sunrise',
    type: 'transfer',
    slug: 'sunrise-transfer',
    title: l(
      'Sunrise transfer to a high viewpoint',
      'Transfer ao nascer do sol para um miradouro alto'
    ),
    seo: {
      title: l(
        'Sunrise transfer to a mountain viewpoint in Madeira',
        'Transfer ao nascer do sol para um miradouro na Madeira'
      ),
      description: l(
        'Private early-morning transfer to a high viewpoint in Madeira, with a local driver who waits and brings you back. Send a request to João.',
        'Transfer privado de madrugada para um miradouro de altitude na Madeira, com um motorista local que espera e o traz de volta. Envie um pedido ao João.'
      ),
    },
    summary: l(
      'A very early start, a seat at a high viewpoint before the light comes, and a ride back.',
      'Um arranque muito cedo, um lugar num miradouro de altitude antes de a luz chegar e boleia de volta.'
    ),
    body: {
      en: [
        'Mountain roads are slow in the dark and the viewpoints fill up with cars. With a driver you can stay warm, arrive at the right time and enjoy the view without watching the road.',
        'The pick-up time depends on the sunrise on your date, so João works it out with you. Bring a warm jacket: it is much colder up there than on the coast.',
      ],
      pt: [
        'As estradas de montanha são lentas no escuro e os miradouros enchem-se de carros. Com motorista, fica aquecido, chega à hora certa e aprecia a vista sem pensar na estrada.',
        'A hora de recolha depende do nascer do sol na sua data, por isso o João combina-a consigo. Leve um casaco quente: lá em cima faz muito mais frio do que na costa.',
      ],
    },
    duration: l('About 4 hours', 'Cerca de 4 horas'),
    priceFrom: 90,
    route: {
      from: l('Your accommodation', 'O seu alojamento'),
      to: l('A high viewpoint in the mountains', 'Um miradouro de altitude na serra'),
    },
    stops: [],
    includes: [INCLUDES.driver, INCLUDES.door, INCLUDES.waiting, INCLUDES.fuel],
    excludes: [EXCLUDES.meals, EXCLUDES.tips],
    faq: [
      {
        q: l('Which viewpoint do we go to?', 'Para que miradouro vamos?'),
        a: l(
          'João suggests one based on the weather and your starting point. Mountain viewpoints are often in cloud, so he checks the forecast with you.',
          'O João sugere um, consoante o tempo e o seu ponto de partida. Os miradouros da serra estão muitas vezes cobertos de nuvens, por isso ele vê a previsão consigo.'
        ),
      },
      {
        q: l('What if the sky is cloudy?', 'E se o céu estiver nublado?'),
        a: l(
          'Tell João the day before or on the morning itself. You can postpone to another date if one is free.',
          'Avise o João no dia anterior ou na própria manhã. Pode adiar para outra data, se houver disponibilidade.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['transfer-sunset', 'tour-central', 'transfer-funchal-airport'],
  },
  {
    ...base,
    id: 'transfer-sunset',
    type: 'transfer',
    slug: 'sunset-transfer',
    title: l('Sunset transfer', 'Transfer ao pôr do sol'),
    seo: {
      title: l(
        'Sunset transfer on the west coast of Madeira',
        'Transfer ao pôr do sol na costa oeste da Madeira'
      ),
      description: l(
        'Private evening transfer to a west coast viewpoint to watch the sunset in Madeira, with a local driver who waits. Send a request to João.',
        'Transfer privado ao fim do dia para um miradouro da costa oeste da Madeira, para ver o pôr do sol, com um motorista local que espera. Envie um pedido ao João.'
      ),
    },
    summary: l(
      'Watch the sun go down from a good spot on the west coast, then ride home.',
      'Veja o sol a pôr-se num bom local da costa oeste e regresse de boleia.'
    ),
    body: {
      en: [
        'The west coast faces the open Atlantic, which makes it a natural place for an evening view. João picks you up in time to get to the viewpoint before the light changes.',
        'He waits while you take photos or have a drink nearby, then drives you back to your accommodation or to a restaurant.',
      ],
      pt: [
        'A costa oeste está virada para o Atlântico aberto, o que a torna um sítio natural para ver o fim do dia. O João recolhe-o a tempo de chegar ao miradouro antes de a luz mudar.',
        'Ele espera enquanto tira fotografias ou toma uma bebida por perto e depois leva-o ao alojamento ou a um restaurante.',
      ],
    },
    duration: l('About 3 hours', 'Cerca de 3 horas'),
    priceFrom: 70,
    route: {
      from: l('Your accommodation', 'O seu alojamento'),
      to: l('A west coast viewpoint', 'Um miradouro da costa oeste'),
    },
    stops: [],
    includes: [INCLUDES.driver, INCLUDES.door, INCLUDES.waiting, INCLUDES.fuel],
    excludes: [EXCLUDES.meals, EXCLUDES.tips],
    faq: [
      {
        q: l('Can we finish at a restaurant?', 'Podemos terminar num restaurante?'),
        a: l(
          'Yes. Say so in the request and João drops you at the restaurant instead of your accommodation.',
          'Sim. Diga-o no pedido e o João deixa-o no restaurante, em vez de no alojamento.'
        ),
      },
      {
        q: l('How long does João wait?', 'Quanto tempo espera o João?'),
        a: l(
          'The waiting time is agreed when he confirms your request, so there are no surprises.',
          'O tempo de espera é combinado quando ele confirma o pedido, para não haver surpresas.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['transfer-sunrise', 'transfer-calheta-funchal', 'tour-west'],
  },

  // -------------------------------------------------------------------- Tours
  {
    ...base,
    id: 'tour-levada-walks',
    type: 'tour',
    slug: 'levada-walks-transfer',
    title: l(
      'Levada walks: drop-off and pick-up',
      'Passeios pelas levadas: levantamento e recolha'
    ),
    seo: {
      title: l(
        'Levada walk transfers in Madeira: drop-off and pick-up',
        'Transfer para passeios pelas levadas da Madeira: ida e recolha'
      ),
      description: l(
        'A local driver takes you to the start of a levada walk in Madeira and collects you at the end. Walk one way, no need to retrace your steps.',
        'Um motorista local leva-o ao início de um passeio pelas levadas da Madeira e recolhe-o no fim. Caminhe num só sentido, sem ter de voltar para trás.'
      ),
    },
    summary: l(
      'Walk a levada in one direction. João drops you at the start and collects you at the end.',
      'Percorra uma levada num só sentido. O João deixa-o no início e vai buscá-lo ao fim.'
    ),
    body: {
      en: [
        'Many levada paths are easier and more enjoyable when you walk them one way instead of there and back. The catch is getting your own transport from the end to the start. João solves that.',
        "He drops you at the start, goes to the end point and is there when you arrive. He can suggest walks that match your fitness and the day's weather, and tell you which ones are closed or crowded.",
      ],
      pt: [
        'Muitos caminhos de levada são mais fáceis e agradáveis quando se fazem num só sentido, em vez de ida e volta. A dificuldade é ter transporte entre o fim e o início. O João resolve isso.',
        'Deixa-o no início, segue para o ponto final e está lá quando chegar. Pode sugerir passeios adequados à sua condição física e ao tempo do dia e dizer-lhe quais estão fechados ou muito concorridos.',
      ],
    },
    duration: l('Half day, depending on the walk', 'Meio dia, consoante o percurso'),
    priceFrom: 80,
    route: {
      from: l('Your accommodation', 'O seu alojamento'),
      to: l('Start of the levada, collected at the end', 'Início da levada, com recolha no fim'),
    },
    stops: [
      l('Pick-up at your accommodation', 'Recolha no seu alojamento'),
      l('Drop-off at the start of the levada', 'Deixa no início da levada'),
      l('You walk; João drives to the end point', 'Você caminha; o João segue para o ponto final'),
      l('Pick-up at the end and drive back', 'Recolha no fim e regresso'),
    ],
    includes: [INCLUDES.driver, INCLUDES.door, INCLUDES.planning, INCLUDES.fuel],
    excludes: [EXCLUDES.gear, EXCLUDES.meals, EXCLUDES.tips],
    faq: [
      {
        q: l('Which levada should I choose?', 'Que levada devo escolher?'),
        a: l(
          'Tell João how long you want to walk and how comfortable you are on narrow paths. He suggests options for that day.',
          'Diga ao João quanto tempo quer caminhar e se se sente à vontade em caminhos estreitos. Ele sugere opções para esse dia.'
        ),
      },
      {
        q: l('Are you my walking guide?', 'O João é o meu guia de caminhada?'),
        a: l(
          'No. João is a local driver. He takes you to and from the walk, but he does not walk with you.',
          'Não. O João é motorista local. Leva-o e vai buscá-lo ao passeio, mas não o acompanha na caminhada.'
        ),
      },
      {
        q: l('What should I bring?', 'O que devo levar?'),
        a: l(
          'Sturdy shoes, a rain jacket, water and a torch for tunnels. João can tell you more once the walk is chosen.',
          'Calçado resistente, impermeável, água e uma lanterna para os túneis. O João pode dizer-lhe mais depois de escolhido o percurso.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-central', 'tour-north', 'tour-custom'],
  },
  {
    ...base,
    id: 'tour-west',
    type: 'tour',
    slug: 'west-madeira-tour',
    title: l('West Madeira private tour', 'Tour privado pelo oeste da Madeira'),
    seo: {
      title: l(
        'West Madeira private tour from Calheta',
        'Tour privado pelo oeste da Madeira a partir da Calheta'
      ),
      description: l(
        'Full-day private tour of west Madeira with a local driver from Calheta: coast, cliffs and villages at your own pace. Send a request to João.',
        'Tour privado de dia inteiro pelo oeste da Madeira com um motorista local da Calheta: costa, falésias e aldeias ao seu ritmo. Envie um pedido ao João.'
      ),
    },
    summary: l(
      "A relaxed day through the villages, cliffs and viewpoints of the west, on João's home ground.",
      'Um dia tranquilo pelas aldeias, falésias e miradouros do oeste, no território do João.'
    ),
    body: {
      en: [
        'The west is where João lives, so this is the tour where he can show you the places he goes himself, not only the ones on the postcards. The route follows the coast and climbs into the hills when the weather is clear.',
        'The stops below are a suggestion. If you like a spot, stay longer. If you prefer a quiet lunch to one more viewpoint, say so and the day changes.',
      ],
      pt: [
        'O oeste é onde o João vive, por isso este é o tour em que pode mostrar os sítios que ele próprio frequenta, e não apenas os dos postais. O percurso segue a costa e sobe à serra quando o tempo está limpo.',
        'As paragens abaixo são uma sugestão. Se gostar de um sítio, fique mais tempo. Se preferir um almoço sossegado a mais um miradouro, diga-o e o dia muda.',
      ],
    },
    duration: l('About 8 hours', 'Cerca de 8 horas'),
    priceFrom: 200,
    route: {
      from: l('Calheta or your accommodation', 'Calheta ou o seu alojamento'),
      to: l('Same place', 'O mesmo local'),
    },
    stops: [
      l('Calheta', 'Calheta'),
      l('Paul do Mar', 'Paul do Mar'),
      l('Ponta do Pargo lighthouse', 'Farol da Ponta do Pargo'),
      l('Paul da Serra plateau', 'Planalto do Paul da Serra'),
      l('Ponta do Sol', 'Ponta do Sol'),
      l('Cabo Girão viewpoint', 'Miradouro do Cabo Girão'),
    ],
    includes: [
      INCLUDES.driver,
      INCLUDES.door,
      INCLUDES.viewpoints,
      INCLUDES.planning,
      INCLUDES.fuel,
    ],
    excludes: [EXCLUDES.meals, EXCLUDES.entrance, EXCLUDES.tips],
    faq: [
      {
        q: l('Can I start from Funchal?', 'Posso começar no Funchal?'),
        a: l(
          'Yes, but the drive to the west adds time. Tell João where you are staying and he adjusts the stops.',
          'Sim, mas a viagem até ao oeste acrescenta tempo. Diga ao João onde está alojado e ele ajusta as paragens.'
        ),
      },
      {
        q: l('Can we change the stops?', 'Podemos mudar as paragens?'),
        a: l(
          'Yes. The route is a starting point. Send your wishes with the request and João builds the day around them.',
          'Sim. O percurso é um ponto de partida. Envie os seus desejos com o pedido e o João constrói o dia à volta deles.'
        ),
      },
      {
        q: l('Where do we have lunch?', 'Onde almoçamos?'),
        a: l(
          'João suggests a local place on the route. Lunch is not included, so you pay for what you order.',
          'O João sugere um local na rota. O almoço não está incluído, pelo que paga o que pedir.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-north', 'tour-central', 'transfer-calheta-funchal'],
  },
  {
    ...base,
    id: 'tour-north',
    type: 'tour',
    slug: 'north-madeira-tour',
    title: l('North Madeira private tour', 'Tour privado pelo norte da Madeira'),
    seo: {
      title: l(
        'North Madeira private tour: Porto Moniz and Seixal',
        'Tour privado pelo norte da Madeira: Porto Moniz e Seixal'
      ),
      description: l(
        'Full-day private tour of the north coast of Madeira with a local driver: sea pools, waterfalls and green valleys. Send a request to João.',
        'Tour privado de dia inteiro pela costa norte da Madeira com um motorista local: piscinas naturais, cascatas e vales verdes. Envie um pedido ao João.'
      ),
    },
    summary: l(
      'The wild north coast: sea pools, waterfalls, forest and small villages.',
      'A costa norte, mais selvagem: piscinas naturais, cascatas, floresta e pequenas aldeias.'
    ),
    body: {
      en: [
        'The north is greener and wetter than the south, and the roads wind along the cliffs. It is a long day to drive on your own, and an easy one when someone else is at the wheel.',
        'Stops are planned around the weather: if one area is in cloud, João can swap the order and keep the best views for the clear part of the day.',
      ],
      pt: [
        'O norte é mais verde e mais húmido do que o sul, e as estradas serpenteiam junto às falésias. É um dia longo para conduzir sozinho e um dia fácil quando é outra pessoa ao volante.',
        'As paragens são planeadas em função do tempo: se uma zona estiver coberta de nuvens, o João pode trocar a ordem e guardar as melhores vistas para a parte limpa do dia.',
      ],
    },
    duration: l('About 8 hours', 'Cerca de 8 horas'),
    priceFrom: 220,
    route: {
      from: l('Calheta or your accommodation', 'Calheta ou o seu alojamento'),
      to: l('Same place', 'O mesmo local'),
    },
    stops: [
      l('Porto Moniz natural pools', 'Piscinas naturais do Porto Moniz'),
      l('Seixal', 'Seixal'),
      l('São Vicente', 'São Vicente'),
      l('Encumeada pass', 'Passo da Encumeada'),
      l('Ribeira da Janela', 'Ribeira da Janela'),
    ],
    includes: [
      INCLUDES.driver,
      INCLUDES.door,
      INCLUDES.viewpoints,
      INCLUDES.planning,
      INCLUDES.fuel,
    ],
    excludes: [EXCLUDES.meals, EXCLUDES.entrance, EXCLUDES.tips],
    faq: [
      {
        q: l('Will we have time to swim?', 'Teremos tempo para nadar?'),
        a: l(
          'Usually yes, if the sea is calm and you bring swimwear and a towel. Tell João in advance so he plans the time.',
          'Normalmente sim, se o mar estiver calmo e levar fato de banho e toalha. Avise o João com antecedência para ele planear o tempo.'
        ),
      },
      {
        q: l('What if it rains in the north?', 'E se chover no norte?'),
        a: l(
          'The weather changes quickly between coasts. João checks the forecast the day before and can swap to another route.',
          'O tempo muda depressa de costa para costa. O João vê a previsão no dia anterior e pode trocar por outro percurso.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-west', 'tour-east', 'tour-two-day'],
  },
  {
    ...base,
    id: 'tour-east',
    type: 'tour',
    slug: 'east-madeira-tour',
    title: l('East Madeira private tour', 'Tour privado pelo leste da Madeira'),
    seo: {
      title: l(
        'East Madeira private tour with a local driver',
        'Tour privado pelo leste da Madeira com motorista local'
      ),
      description: l(
        'Full-day private tour of east Madeira with a local driver: peninsula trails, traditional villages and sea views. Send a request to João.',
        'Tour privado de dia inteiro pelo leste da Madeira com um motorista local: trilhos na península, aldeias tradicionais e vistas de mar. Envie um pedido ao João.'
      ),
    },
    summary: l(
      'Drier, rockier and quieter: the east end of the island, from the peninsula to the old villages.',
      'Mais seco, mais rochoso e mais sossegado: o extremo leste da ilha, da península às aldeias antigas.'
    ),
    body: {
      en: [
        'The east has a different landscape from the rest of Madeira: lower, drier and more open. It is a good choice if you have already seen the west or want a day with less climbing.',
        'The day includes time for a short walk on the peninsula if you want it, and a stop in a village for lunch.',
      ],
      pt: [
        'O leste tem uma paisagem diferente do resto da Madeira: mais baixa, mais seca e mais aberta. É uma boa escolha se já conhece o oeste ou se quer um dia com menos subidas.',
        'O dia inclui tempo para uma caminhada curta na península, se quiser, e uma paragem numa aldeia para almoçar.',
      ],
    },
    duration: l('About 8 hours', 'Cerca de 8 horas'),
    priceFrom: 240,
    route: {
      from: l('Calheta or your accommodation', 'Calheta ou o seu alojamento'),
      to: l('Same place', 'O mesmo local'),
    },
    stops: [
      l('Machico', 'Machico'),
      l('Ponta de São Lourenço', 'Ponta de São Lourenço'),
      l('Santana', 'Santana'),
      l('Porto da Cruz', 'Porto da Cruz'),
      l('Camacha', 'Camacha'),
    ],
    includes: [
      INCLUDES.driver,
      INCLUDES.door,
      INCLUDES.viewpoints,
      INCLUDES.planning,
      INCLUDES.fuel,
    ],
    excludes: [EXCLUDES.meals, EXCLUDES.entrance, EXCLUDES.tips],
    faq: [
      {
        q: l(
          'Is this tour a long drive from Calheta?',
          'Este tour implica uma viagem longa desde a Calheta?'
        ),
        a: l(
          'Yes, the east is the farthest part of the island from Calheta. If you stay in Funchal, the day is shorter on the road.',
          'Sim, o leste é a parte da ilha mais distante da Calheta. Se estiver alojado no Funchal, o dia tem menos tempo de estrada.'
        ),
      },
      {
        q: l('How hard is the peninsula walk?', 'Quão difícil é a caminhada na península?'),
        a: l(
          'It is optional and mostly exposed to sun and wind. Wear sturdy shoes and bring water. João can tell you how long to allow.',
          'É opcional e fica muito exposta ao sol e ao vento. Use calçado resistente e leve água. O João diz-lhe quanto tempo reservar.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-north', 'tour-central', 'tour-two-day'],
  },
  {
    ...base,
    id: 'tour-central',
    type: 'tour',
    slug: 'central-madeira-tour',
    title: l('Central Madeira private tour', 'Tour privado pelo centro da Madeira'),
    seo: {
      title: l(
        'Central Madeira private tour: mountains and valleys',
        'Tour privado pelo centro da Madeira: montanhas e vales'
      ),
      description: l(
        'Private tour of the mountains and valleys of central Madeira with a local driver, at your own pace. Send a request to João.',
        'Tour privado pelas montanhas e vales do centro da Madeira com um motorista local, ao seu ritmo. Envie um pedido ao João.'
      ),
    },
    summary: l(
      'High viewpoints, deep valleys and mountain villages in the middle of the island.',
      'Miradouros de altitude, vales profundos e aldeias de montanha no meio da ilha.'
    ),
    body: {
      en: [
        'The centre of Madeira is where the island is at its most dramatic: steep peaks, forest and valleys that you only reach by winding roads. Many of those roads are narrow, so having a local at the wheel is a relief.',
        'Weather matters most here. João watches the clouds and will suggest the best order for the day, or a different area if the peaks are hidden.',
      ],
      pt: [
        'O centro da Madeira é onde a ilha é mais dramática: picos escarpados, floresta e vales que só se alcançam por estradas sinuosas. Muitas dessas estradas são estreitas, por isso é um alívio ter um local ao volante.',
        'Aqui o tempo é o que mais conta. O João acompanha as nuvens e sugere a melhor ordem para o dia, ou outra zona se os picos estiverem escondidos.',
      ],
    },
    duration: l('About 7 hours', 'Cerca de 7 horas'),
    priceFrom: 220,
    route: {
      from: l('Calheta or your accommodation', 'Calheta ou o seu alojamento'),
      to: l('Same place', 'O mesmo local'),
    },
    stops: [
      l('Encumeada pass', 'Passo da Encumeada'),
      l('Curral das Freiras viewpoint', 'Miradouro do Curral das Freiras'),
      l('Câmara de Lobos', 'Câmara de Lobos'),
      l('A mountain viewpoint chosen on the day', 'Um miradouro de montanha escolhido no dia'),
    ],
    includes: [
      INCLUDES.driver,
      INCLUDES.door,
      INCLUDES.viewpoints,
      INCLUDES.planning,
      INCLUDES.fuel,
    ],
    excludes: [EXCLUDES.meals, EXCLUDES.entrance, EXCLUDES.tips],
    faq: [
      {
        q: l('Is it cold in the mountains?', 'Está frio na serra?'),
        a: l(
          'Often, even in summer. Bring a warm layer and a rain jacket.',
          'Muitas vezes, mesmo no verão. Leve uma camada quente e um impermeável.'
        ),
      },
      {
        q: l(
          'Can we combine this with a levada walk?',
          'Podemos combinar este tour com uma caminhada pela levada?'
        ),
        a: l(
          'Possibly. Ask in your request and João will say whether it fits in the day.',
          'Possivelmente. Pergunte no pedido e o João diz se cabe no dia.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-levada-walks', 'transfer-sunrise', 'tour-west'],
  },
  {
    ...base,
    id: 'tour-two-day',
    type: 'tour',
    slug: 'two-day-island-tour',
    title: l('Two-day island tour', 'Tour de dois dias pela ilha'),
    seo: {
      title: l(
        'Two-day private island tour of Madeira',
        'Tour privado de dois dias pela ilha da Madeira'
      ),
      description: l(
        'Two days with the same local driver to see more of Madeira: coast, mountains and villages, with an overnight stop. Send a request to João.',
        'Dois dias com o mesmo motorista local para ver mais da Madeira: costa, montanhas e aldeias, com uma noite fora. Envie um pedido ao João.'
      ),
    },
    summary: l(
      'Two unhurried days to cross the island with one driver and one plan.',
      'Dois dias sem pressa para atravessar a ilha com um só motorista e um só plano.'
    ),
    body: {
      en: [
        'One day is not enough to see more than one coast without rushing. With two days you can cover more ground, sleep somewhere new and keep the driving time reasonable.',
        'João plans the two days with you: which regions, where to sleep and how long to spend at each stop. Accommodation is booked and paid by you.',
      ],
      pt: [
        'Um dia não chega para ver mais do que uma costa sem pressa. Com dois dias, percorre mais terreno, dorme num sítio novo e mantém um tempo de condução razoável.',
        'O João planeia os dois dias consigo: que regiões, onde dormir e quanto tempo ficar em cada paragem. O alojamento é reservado e pago por si.',
      ],
    },
    duration: l('2 days', '2 dias'),
    priceFrom: 450,
    route: {
      from: l('Calheta or your accommodation', 'Calheta ou o seu alojamento'),
      to: l(
        'Your accommodation on night one, then back',
        'O seu alojamento na primeira noite e o regresso'
      ),
    },
    stops: [
      l('Day 1: west coast and north coast', 'Dia 1: costa oeste e costa norte'),
      l('Overnight stay chosen with you', 'Pernoita escolhida consigo'),
      l('Day 2: east and central areas', 'Dia 2: zona leste e zona central'),
    ],
    includes: [
      INCLUDES.driver,
      INCLUDES.door,
      INCLUDES.viewpoints,
      INCLUDES.planning,
      INCLUDES.fuel,
    ],
    excludes: [EXCLUDES.lodging, EXCLUDES.meals, EXCLUDES.entrance, EXCLUDES.tips],
    faq: [
      {
        q: l("Who pays for João's overnight stay?", 'Quem paga a pernoita do João?'),
        a: l(
          'This is agreed before you confirm. João states in his reply what the price covers.',
          'Isto é combinado antes de confirmar. O João indica na resposta o que está incluído no preço.'
        ),
      },
      {
        q: l('Can the two days be separate?', 'Os dois dias podem ser separados?'),
        a: l(
          'Yes, if João has both dates free. Mention the dates you prefer in the request.',
          'Sim, se o João tiver as duas datas livres. Indique as datas preferidas no pedido.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-north', 'tour-east', 'tour-custom'],
  },
  {
    ...base,
    id: 'tour-custom',
    type: 'tour',
    slug: 'custom-trip',
    title: l('Custom trip on request', 'Viagem à medida'),
    seo: {
      title: l(
        'Custom private trip in Madeira on request',
        'Viagem privada à medida na Madeira, a pedido'
      ),
      description: l(
        'Tell João what you want to see in Madeira and he plans a private trip around it, with a local driver. Send a request.',
        'Diga ao João o que quer ver na Madeira e ele planeia uma viagem privada à sua volta, com motorista local. Envie um pedido.'
      ),
    },
    summary: l(
      'Your places, your timing. Tell João what you want and he plans around it.',
      'Os seus sítios, o seu horário. Diga ao João o que quer e ele planeia em função disso.'
    ),
    body: {
      en: [
        'If none of the fixed tours fits, describe what you have in mind: a particular village, a photo spot, a family visit, a restaurant or a mix of everything. João tells you if it works and how long it takes.',
        'The price depends on the distance and the time, and he confirms it before you commit.',
      ],
      pt: [
        'Se nenhum dos tours fixos lhe servir, descreva o que tem em mente: uma aldeia em particular, um local para fotografias, uma visita a familiares, um restaurante ou uma mistura de tudo. O João diz-lhe se é possível e quanto tempo demora.',
        'O preço depende da distância e do tempo, e ele confirma-o antes de assumir qualquer compromisso.',
      ],
    },
    duration: l('To be agreed', 'A combinar'),
    priceFrom: 150,
    route: { from: l('Your choice', 'À sua escolha'), to: l('Your choice', 'À sua escolha') },
    stops: [],
    includes: [INCLUDES.driver, INCLUDES.door, INCLUDES.planning, INCLUDES.fuel],
    excludes: [EXCLUDES.meals, EXCLUDES.entrance, EXCLUDES.tips],
    faq: [
      {
        q: l('What should I put in the request?', 'O que devo indicar no pedido?'),
        a: l(
          'The date, where you start, the places you want to see and roughly how many hours you have.',
          'A data, o ponto de partida, os sítios que quer ver e, aproximadamente, quantas horas tem.'
        ),
      },
      {
        q: l('Can I add stops on the day?', 'Posso acrescentar paragens no próprio dia?'),
        a: l(
          'Small changes are usually fine. Larger ones may change the time and the price, so João will tell you.',
          'Pequenas alterações costumam ser possíveis. As maiores podem mudar o tempo e o preço, e o João avisa.'
        ),
      },
    ],
    gallery: [HERO_IMAGE],
    related: ['tour-west', 'tour-levada-walks', 'transfer-funchal-airport'],
  },
]
