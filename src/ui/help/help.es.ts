import type { HelpContent } from './content';

// Ayuda en español (F4.8, decisión 0032): misma estructura que la portuguesa, con los términos del
// glosario técnico (docs/i18n/glossario-tecnico.md). Pendiente de revisión por un hablante nativo
// del área, como el resto de la interfaz en español.
export const helpEs: HelpContent = {
  guide: {
    intro:
      'SOL-AR dibuja la carta solar de un lugar y, sobre ella, el transportador de ángulos y la máscara de sombra de una protección. El camino básico tiene cinco pasos; los avanzados quedan plegados debajo de ellos. Todo lo que usted elige queda en la dirección de la página: copie el enlace para guardar o compartir.',
    steps: [
      {
        title: '1. Ubicación',
        text: 'Elija la ciudad. Para colorear la carta con datos horarios, abra los datos históricos (los del SOL-AR 6.2) o cargue un archivo climático EPW; el enlace de cada ciudad descarga el archivo reciente (TMYx). El archivo se lee solo en su navegador.',
      },
      {
        title: '2. Fachada',
        text: 'Escriba la orientación de la fachada: el acimut de la normal exterior, en grados desde el Norte, en sentido horario (Este = 90°). El transportador gira con ella.',
      },
      {
        title: '3. Protección',
        text: 'Escriba los ángulos de la protección, α de la protección horizontal, β de las aletas y γ de los límites laterales, en la referencia interna o externa. La región roja es la sombra total; la amarilla, la parcial (centro de la ventana a la sombra). También se puede dibujar una región a mano.',
      },
      {
        title: '4. Datos sobre la carta',
        text: 'Pinte la carta con una variable del archivo (temperatura, humedad o radiación) para ver cuándo conviene la sombra. Pase el cursor o toque una celda para leer los valores.',
      },
      {
        title: '5. Imprimir y exportar',
        text: 'Imprima a escala (radio de la carta en cm), exporte la imagen (SVG o PNG) o los datos (CSV), compare dos configuraciones lado a lado y guarde el proyecto en un archivo.',
      },
    ],
    advanced: [
      {
        title: 'Proyección y líneas horarias',
        text: 'Proyecciones equidistante y cilíndrica, cada una con su transportador, y líneas horarias en hora oficial (analemas), para ver la diferencia entre la hora solar y la hora oficial.',
      },
      {
        title: '6. Protección por las dimensiones',
        text: 'Describa la ventana, el retranqueo del vidrio y las piezas en metros: el programa dibuja el corte y la vista, las curvas de 0 a 100% de la ventana a la sombra y el mapa de la sombra a lo largo del año. "Dimensionar por el período" hace el camino inverso, del período a sombrear a los ángulos y las dimensiones.',
      },
      {
        title: '7. Efecto en el año',
        text: 'Con un archivo climático y la protección del paso 6, clasifica las horas en cálidas, neutras y frías y muestra la radiación directa bloqueada en las horas cálidas y admitida en las frías. Guarde alternativas para compararlas.',
      },
    ],
    tabs: [
      {
        title: 'Carta solar',
        text: 'La carta con el transportador, la máscara, los datos y las curvas de la protección.',
      },
      {
        title: 'Vista 3D',
        text: 'La ventana y las piezas del paso 6 con el sol de un día y una hora; la sombra en el vidrio es la del cálculo.',
      },
      {
        title: 'Rosa de los vientos',
        text: 'Frecuencia y velocidad del viento del archivo, por estación del año, período del día y condición térmica, con la corrección de altura y terreno de EnergyPlus.',
      },
    ],
    tips: [
      'Los campos aceptan coma o punto decimal; un valor inválido queda en rojo, con la explicación.',
      'El enlace guarda todo, menos los archivos cargados: para guardarlos, use "Guardar proyecto" en el paso 5.',
      'Después de la primera visita, la aplicación abre sin internet (los datos históricos, de las ciudades ya abiertas) y puede instalarse desde el navegador.',
      'Teclado: Tab recorre los campos; en las pestañas y en los grupos de opciones, las flechas cambian la elección.',
    ],
  },
  examples: {
    intro:
      'Tres ejemplos con el caso de Brasilia del tutorial de Analysis SOL-AR de la UFU, rehechos con el nuevo SOL-AR. Cada uno se abre en una pestaña nueva, con una tarjeta que acompaña el paso a paso; la configuración de esta pestaña no cambia.',
    items: {
      angulos: {
        title: '1. Leer los ángulos en la carta: ¿55° o 57,5°?',
        problem:
          'En Brasilia, en una fachada a 30°, el tutorial quiere la ventana a la sombra de 9 h a 15 h (hora solar) todo el año y lee en la carta α = 55°, γ derecha = 50° y γ izquierda = 60°, en la referencia interna. ¿Bastan esos ángulos?',
        steps: [
          'En el paso 3, los ángulos del tutorial dibujan la sombra total (región roja).',
          'En el paso 6, "Dimensionar por el período" trae el período del tutorial: del 1/1 al 31/12, de 9 h a 15 h en hora solar. En la carta aparece en verde.',
          'La tabla da los ángulos que sombrean todo el período, con el sol que determina cada uno: α = 57,5° (32,5° en la referencia externa), γ derecha = 42,2° y γ izquierda = 58,5°.',
          'El α viene del sol de las 9 h del 21/6, que queda fuera de la región roja: con 55°, en las mañanas de mayo a julio, hasta las 9:30, el sol llega a una parte de la ventana.',
          'Con α = 57,5°, la profundidad de la protección pasa de 1,28 m (la del tutorial, con el vidrio retranqueado 15 cm) a 1,42 m.',
        ],
        lesson:
          'Los 2,5° de diferencia son poco en el papel: en una carta de 6 cm de radio, el punto de las 9 h del 21/6 queda a 1,7 mm de la curva de 55°. La lectura en la carta sirve para estudiar; para garantizar el período, verifique los ángulos con el cálculo. El γ derecha de 50° sobra (el período pide 42,2°): la prolongación queda más larga que lo necesario, a favor de la sombra.',
      },
      recuo: {
        title: '2. Del ángulo a las dimensiones, con el vidrio retranqueado',
        problem:
          'El tutorial convierte los ángulos en una protección horizontal de 1,28 m en el dintel, con prolongaciones de 1,70 m a la izquierda y 1,20 m a la derecha, en una ventana de 2,00 × 1,00 m con el vidrio 15 cm detrás de la cara exterior del muro. ¿Dónde está el α en ese dibujo, y qué cambia el retranqueo?',
        steps: [
          'En el paso 6 están la ventana, el retranqueo y la protección del tutorial. El corte muestra el α, del alféizar junto al vidrio hasta el borde exterior de la protección: 1,28 + 0,15 = 1,43 m para 1,00 m de altura dan α = 55,0°, el ángulo leído en la carta. En la vista, γ derecha = 50,2° y γ izquierda = 59,5°.',
          'En la carta, la curva de 100% (ventana entera a la sombra, con relleno) coincide con el borde de la región roja del paso 3, con menos de 0,1° de diferencia: las dos describen la misma sombra total.',
          'No hay curva de 0%: con el vidrio retranqueado, el dintel y las jambas del muro sombrean una parte de la ventana con cualquier sol fuera de la normal. La curva se reduce a un punto, la normal en el horizonte, donde queda el rótulo 0%.',
          'En el período del ejemplo 1, esta protección deja la ventana entera a la sombra en el 99,2% de los instantes; en los demás, mañanas de mayo a julio, hasta el 8,7% de la ventana recibe sol.',
        ],
        lesson:
          'El α se mide desde el alféizar junto al vidrio, y la profundidad de la protección se cuenta desde la cara exterior del muro: D = H · tan α − d, con d el retranqueo. El muro grueso también protege: con retranqueo, siempre hay algo de sombra en la ventana.',
      },
      afastado: {
        title: '3. Protección separada de la pared: α2 se mide desde el dintel',
        problem:
          'En el mismo tutorial, la protección tiene 1,00 m de profundidad, a la altura del dintel, separada 28 cm de la pared, y los ángulos son α1 = 55° y α2 = 20°, los dos medidos desde el alféizar. ¿Qué pasa en la ranura entre la protección y la pared?',
        steps: [
          'En el paso 3, α1 = 55° y α2 = 20° dibujan la sombra total como una franja entre las dos curvas: es la máscara que pinta el tutorial.',
          'En SOL-AR, α2 se mide desde el dintel hasta el borde interior de la protección (paso 3, "Índices 2"). Aquí el borde interior está a la altura del dintel: el α2 del dibujo es 90°, y la ranura deja que el sol llegue al vidrio.',
          'En el paso 6 está la protección dibujada. En la carta, la curva de 100% solo aparece junto a la línea de la fachada: la ventana entera queda a la sombra solo con el sol a más de 81,5° de perfil, cuando el dintel del propio muro cubre el vidrio.',
          'En el período del ejemplo 1, solo el 18% de los instantes tienen la ventana entera a la sombra, todos con el sol casi rasante a la fachada, y ninguno del 12/5 al 30/7; en el peor instante, el 65% de la ventana recibe sol.',
          'Para que la sombra total vaya de 35° a 70° de perfil, como quería el tutorial, el borde interior tendría que subir 0,77 m sobre el dintel (α2 = 20° medido desde el dintel), y la protección pasaría a 2,10 m de profundidad para mantener α1 = 55°.',
        ],
        lesson:
          'Medido desde el alféizar, el α2 promete una sombra que la protección separada no da. Mida α2 desde el dintel hasta el borde interior: el sol más alto que esa línea pasa por la ranura. Con separación, "Dimensionar por el período" calcula la altura sobre el dintel que cierra la ranura.',
      },
    },
    source:
      'Fuente del caso: Bortoli, K. C. R.; Saramago, R. C. P. Analysis SOL-AR (tutorial del proyecto "Desenvolvimento de tutoriais de softwares da série Analysis", FAUeD/UFU), disponible en el sitio del LabEEE. Las lecturas del tutorial son gráficas; las diferencias están en los informes de validación del proyecto.',
  },
  glossary: [
    {
      title: 'Carta y ángulos',
      terms: [
        {
          term: 'Carta solar',
          definition:
            'Dibujo de la bóveda celeste en un plano, con las trayectorias del sol a lo largo del año y las líneas de las horas. En la proyección estereográfica (la predeterminada), el centro es el cenit y el círculo exterior, el horizonte.',
        },
        {
          term: 'Transportador',
          definition:
            'Plantilla con las curvas de α, β y γ, girada hasta la orientación de la fachada, para leer sobre la carta los ángulos de una protección o dibujar su máscara.',
        },
        {
          term: 'Máscara de sombra',
          definition:
            'Región de la carta con las posiciones del sol que la protección bloquea. Roja: sombra total, la ventana entera a la sombra. Amarilla: sombra parcial, el centro de la ventana a la sombra.',
        },
        {
          term: 'α (protección horizontal)',
          definition:
            'Ángulo de la protección horizontal en el corte de la ventana, del alféizar al borde exterior de la protección. En la referencia interna, medido desde el plano de la fachada (es el AVS de la INI-C brasileña); en la externa, desde la horizontal (es el ángulo de perfil, o ángulo de sombra vertical).',
        },
        {
          term: 'β (aletas verticales)',
          definition:
            'Ángulo de una aleta en planta, del borde opuesto de la ventana a la punta de la aleta. En la referencia interna, medido desde el plano de la fachada (es el AHS de la INI-C); en la externa, desde la normal (ángulo de sombra horizontal).',
        },
        {
          term: 'γ (límites laterales)',
          definition:
            'Límite de una protección de longitud finita, en el plano de la fachada, de la esquina inferior del mismo lado a la punta de la protección. En la referencia interna, medido desde la vertical; en la externa, desde la horizontal. El γ de las aletas limita la parte superior de una aleta.',
        },
        {
          term: 'Referencia interna y externa',
          definition:
            'Las dos formas de SOL-AR de medir los ángulos; externo = 90° − interno. La interna es la predeterminada y coincide con el AVS y el AHS de la INI-C.',
        },
        {
          term: 'Índices 1 y 2',
          definition:
            'Para la protección separada de la pared: el índice 1 llega al borde exterior; el 2, al interior, con el α2 medido desde el dintel. La sombra total queda entre las dos curvas, porque la ranura deja pasar el sol.',
        },
        {
          term: 'Orientación de la fachada',
          definition:
            'Acimut de la normal exterior, la dirección hacia donde mira la fachada, en grados desde el Norte geográfico, en sentido horario (Este = 90°).',
        },
        {
          term: 'Izquierda y derecha',
          definition: 'Siempre de quien está dentro, mirando hacia afuera por la ventana.',
        },
      ],
    },
    {
      title: 'Protección y geometría',
      terms: [
        {
          term: 'Protección solar (parasol, quiebrasol)',
          definition:
            'Elemento exterior que da sombra a la ventana: horizontal (alero, marquesina), vertical (aleta) o dividido en lamas.',
        },
        { term: 'Aleta', definition: 'Protección vertical, al lado de la ventana.' },
        {
          term: 'Lamas',
          definition:
            'Piezas paralelas más estrechas que sustituyen una protección horizontal o una aleta, con los mismos ángulos.',
        },
        {
          term: 'Alféizar y dintel',
          definition: 'La base y la parte superior del vano de la ventana.',
        },
        {
          term: 'Retranqueo del vidrio',
          definition:
            'Distancia del vidrio a la cara exterior del muro. El propio muro (dintel y jambas) sombrea parte de la ventana; las piezas del paso 6 se miden desde la cara exterior.',
        },
        {
          term: 'Curvas de 0 a 100%',
          definition:
            'En la carta, las posiciones del sol en que la misma parte de la ventana queda a la sombra; dentro de la curva de 100%, la ventana entera. Salen de la geometría exacta de las piezas.',
        },
        {
          term: 'Fracción soleada',
          definition:
            'Parte del área de la ventana que recibe sol directo en un instante: 1 menos la parte a la sombra. En EnergyPlus, sunlit fraction.',
        },
        {
          term: 'Máscara de un punto',
          definition:
            'Las posiciones del sol en que un punto elegido de la ventana queda a la sombra.',
        },
        {
          term: 'Período a sombrear',
          definition:
            'Días y horas en que la ventana debe quedar entera a la sombra: el punto de partida del dimensionamiento.',
        },
      ],
    },
    {
      title: 'Tiempo',
      terms: [
        {
          term: 'Hora solar verdadera',
          definition:
            'Hora que marca el sol: las 12 h cuando cruza el meridiano del lugar. Es la de las líneas horarias de la carta, salvo en la opción de hora oficial.',
        },
        {
          term: 'Hora oficial',
          definition:
            'Hora del reloj en el huso del lugar, sin horario de verano: la del archivo climático. Difiere de la solar por la longitud y por la ecuación del tiempo.',
        },
        {
          term: 'Ecuación del tiempo',
          definition:
            'Diferencia entre la hora solar verdadera y la media, de unos −14 a +16 minutos a lo largo del año, por la órbita elíptica y la inclinación del eje de la Tierra.',
        },
        {
          term: 'Analema',
          definition:
            'Curva en forma de ocho que recorre el sol a lo largo del año a una misma hora oficial; es la línea horaria en hora oficial.',
        },
        {
          term: 'Trayectoria solar',
          definition:
            'Camino del sol en un día. La carta muestra los solsticios, los equinoccios y el día 21 de los demás meses.',
        },
      ],
    },
    {
      title: 'Datos climáticos y viento',
      terms: [
        {
          term: 'Archivo climático (EPW)',
          definition:
            'Formato de EnergyPlus, con las 8760 horas del año de temperatura, humedad, radiación y viento. Cada valor se refiere a la hora que termina; la radiación es la acumulada en la hora.',
        },
        {
          term: 'TRY, IWEC y TMYx',
          definition:
            'Años climáticos de referencia, armados con meses típicos de varios años de medición. Los datos históricos del SOL-AR 6.2 son TRY (Goulart, Lamberts y Firmino, 1998) o IWEC; los TMYx 2011 a 2025 son de Climate.OneBuilding.org.',
        },
        {
          term: 'Radiación directa normal (DNI)',
          definition:
            'Radiación del disco solar sobre un plano perpendicular a los rayos, en Wh/m² en la hora. En la ventana llega multiplicada por el coseno del ángulo de incidencia (DNI · cos θ).',
        },
        {
          term: 'Radiación difusa',
          definition:
            'Radiación del cielo, fuera del disco solar. La máscara de la carta no la representa, y los indicadores no la cuentan.',
        },
        {
          term: 'Rosa de los vientos',
          definition:
            'Frecuencia del viento según la dirección de donde viene (8 o 16 sectores), dividida en clases de velocidad.',
        },
        {
          term: 'Calma',
          definition:
            'Viento por debajo de 0,5 m/s, sin dirección definida; queda fuera de los sectores, en el centro de la rosa.',
        },
        {
          term: 'Corrección de altura y terreno',
          definition:
            'Conversión del viento de la estación (10 m, campo abierto) a otra altura y otro terreno, con la ley potencial de EnergyPlus.',
        },
      ],
    },
    {
      title: 'Efecto en el año',
      terms: [
        {
          term: 'Horas cálidas, neutras y frías',
          definition:
            'Clases de las horas según la temperatura del aire exterior: las cálidas piden sombra; las frías, sol. La opción predeterminada es el umbral de 20 °C (Lamberts, Dutra y Pereira, 2014).',
        },
        {
          term: 'Rango de confort adaptativo de ASHRAE 55',
          definition:
            'Rango de confort que acompaña la media de las temperaturas exteriores de los días anteriores (t_pma). Vale para la temperatura interior de ambientes con ventilación natural; comparado con el aire exterior, como aquí, es una aproximación.',
        },
        {
          term: 'Temperatura de equilibrio',
          definition:
            'Temperatura exterior por encima de la cual las ganancias de calor del edificio pasan a ser exceso; depende del edificio y no tiene valor predeterminado.',
        },
        {
          term: 'Radiación bloqueada y admitida',
          definition:
            'Parte de la radiación directa que llegaría al vidrio sin la protección y que esta bloquea en las horas cálidas o deja entrar en las frías. Cuanto más cerca del 100%, mejor.',
        },
        {
          term: 'Alternativa superada',
          definition:
            'Una alternativa supera a otra cuando bloquea al menos lo mismo en las horas cálidas y admite al menos lo mismo en las frías, y es mejor en una de las dos.',
        },
      ],
    },
  ],
  faq: [
    {
      question: '¿Por qué la carta es distinta de la del SOL-AR 6.2?',
      answer:
        'Por la posición del sol y por la hora. El 6.2 usaba fórmulas aproximadas (error de cerca de 1°) y trayectorias con 7 declinaciones fijas (hasta 1,7° de error en abril y agosto); aquí el sol sale del algoritmo SPA del NREL, verificado contra pvlib. Además, el 6.2 convertía la hora oficial en solar siempre con el meridiano de 45° Oeste, lo que desplaza los datos 1 h en las ciudades en UTC−4 y 2 h en Acre; aquí vale el huso del archivo de cada lugar.',
    },
    {
      question: '¿Las horas de la carta son solares u oficiales?',
      answer:
        'Las líneas horarias son de hora solar verdadera, como en el 6.2: las 12 h son el mediodía solar. En "Proyección y líneas horarias" (avanzado) pueden ser de hora oficial (los analemas). Los datos del archivo quedan en la hora oficial de su huso: la celda de la radiación cubre la hora que termina (de h − 1 a h), y la de la temperatura, media hora a cada lado de h.',
    },
    {
      question: '¿Qué referencia usar, interna o externa?',
      answer:
        'La de su material de clase: el resultado es el mismo, y externo = 90° − interno. La interna, predeterminada, mide α y β desde el plano de la fachada y coincide con el AVS y el AHS de la INI-C; la externa mide α desde la horizontal, como el ángulo de perfil de la literatura en inglés.',
    },
    {
      question: '¿Izquierda y derecha de quién?',
      answer:
        'De quien está dentro, mirando hacia afuera por la ventana, en todo el programa. Por eso, en el dibujo "vista desde afuera" del paso 6, el lado derecho aparece a la izquierda.',
    },
    {
      question:
        'Con protección horizontal y aletas juntas, la región roja quedó menor de lo que esperaba. ¿Por qué?',
      answer:
        'Con los ángulos, cada pieza se trata sola, y la sombra total es la unión de las regiones de cada una. Cuando las piezas se ayudan (una sombrea la parte de la ventana que la otra deja al sol), la sombra total real es mayor. En una celosía (protección horizontal apoyada en las aletas, junto a la pared), deje γ y γ de las aletas en blanco. Para el resultado exacto, describa las piezas en el paso 6: la curva de 100% sale de la geometría.',
    },
    {
      question: '¿Qué es la sombra parcial (amarilla)?',
      answer:
        'Las posiciones del sol en que el centro de la ventana queda a la sombra, con los ángulos medidos desde el centro. En protecciones y aletas largas y sin ranura, equivale a por lo menos la mitad de la ventana a la sombra; en los demás casos, es una aproximación. Las curvas de 25, 50 y 75% del paso 6 dan la parte exacta.',
    },
    {
      question: '¿De dónde vienen los datos climáticos? ¿Puedo usar mi archivo?',
      answer:
        'Las ciudades de la lista tienen los datos históricos del SOL-AR 6.2 (TRY o IWEC) y el enlace al archivo reciente TMYx 2011 a 2025, de Climate.OneBuilding.org. Puede cargar cualquier EPW o CSV del SOL-AR: el archivo se lee en su navegador y no se envía a ningún lugar. El origen, el período y los avisos de calidad aparecen en el paso 1.',
    },
    {
      question: '¿Cómo imprimir la carta a escala?',
      answer:
        'En el paso 5, elija el radio de la carta (6 cm, como en el 6.2) y qué incluir; en el diálogo de impresión, use escala del 100%. La regla de 5 cm impresa junto a la carta verifica la escala. Para usarla como transportador en papel vegetal o transparencia, imprima solo el transportador.',
    },
    {
      question: '¿Cómo guardar y compartir un estudio?',
      answer:
        'La dirección de la página guarda las elecciones: copie el enlace. Los archivos climáticos cargados no caben en el enlace; para guardarlos junto, use "Guardar proyecto" en el paso 5, que graba un archivo para abrir después con "Abrir proyecto".',
    },
    {
      question: '¿Funciona sin internet? ¿Algún dato mío sale de la computadora?',
      answer:
        'Después de la primera visita, la aplicación abre sin internet, incluso los datos históricos de las ciudades ya abiertas, y puede instalarse desde el navegador. Nada sale del navegador: no hay servidor, cuenta ni rastreo; el idioma elegido queda guardado solo en este navegador.',
    },
    {
      question: '¿Los cálculos fueron verificados?',
      answer:
        'Sí, cada uno contra una referencia independiente, con la tolerancia escrita en la especificación: la posición del sol contra pvlib, las máscaras contra trazado de rayos, la fracción soleada contra EnergyPlus (error cuadrático medio de 0,006 a 0,026, hora a hora) y el viento contra las fórmulas de EnergyPlus. Los informes están en el repositorio del proyecto, en docs/validacao.',
    },
    {
      question: '¿Por qué el viento de la rosa no es el de mi terreno?',
      answer:
        'Porque es el medido en la estación meteorológica, en general en un aeropuerto, a 10 m de altura, en campo abierto. La corrección de altura y terreno (avanzado) convierte la velocidad con la ley potencial de EnergyPlus, pero no cambia la dirección ni considera los edificios y el relieve del entorno.',
    },
    {
      question: '¿Por qué la temperatura del aire no basta para decidir cuándo sombrear?',
      answer:
        'Porque la necesidad de sombra depende también de las ganancias internas, de la envolvente, de la masa térmica y de la ventilación. La clasificación de las horas es un indicador aproximado: la opción predeterminada, 20 °C, es el criterio de Lamberts, Dutra y Pereira (2014) para ambientes sin carga interna; con carga interna, use un límite menor o la temperatura de equilibrio de su edificio.',
    },
  ],
  hypotheses: {
    intro:
      'Lo que supone cada parte del programa y lo que deja afuera. Las mismas hipótesis aparecen, resumidas, en cada paso.',
    groups: [
      {
        title: 'Carta y sol',
        items: [
          'Posición del sol con el algoritmo SPA del NREL, geométrica (sin refracción atmosférica), en el año de referencia 2026: los archivos típicos juntan meses de años distintos y no tienen año propio.',
          'Trayectorias en los solsticios, en los equinoccios y el día 21 de los demás meses; líneas horarias en hora solar verdadera, o en hora oficial (analemas) en la opción avanzada.',
          'Hora oficial según el huso del archivo climático (o de la estación de la ciudad), sin horario de verano.',
        ],
      },
      {
        title: 'Máscara por los ángulos (paso 3)',
        items: [
          'Sombra total exacta para una pieza (protección horizontal o aleta, con o sin límites), para aletas a los dos lados y para la celosía sin γ; con piezas sueltas, la región roja es la unión de las regiones de cada pieza y puede ser menor que la sombra total real.',
          'Sombra parcial según el centro de la ventana: igual al 50% de la ventana en protecciones y aletas largas y sin ranura; aproximación en los demás casos.',
          'El dibujo a mano alzada se suma a la máscara calculada.',
        ],
      },
      {
        title: 'Protección por las dimensiones (paso 6)',
        items: [
          'Piezas como placas delgadas y opacas delante del vidrio; el muro entra por el retranqueo del vidrio. Sin reflexión en las piezas ni paso de luz a través de ellas.',
          'Parte de la ventana a la sombra por el área exacta de la sombra, solo para el sol directo: la radiación difusa no se enmascara.',
          'Mapa del año e indicadores con el sol cada 10 minutos (6 instantes por hora); dimensionamiento con el sol cada 5 minutos, para sombra total en todo el período.',
        ],
      },
      {
        title: 'Datos sobre la carta (paso 4)',
        items: [
          'Cada valor del archivo se refiere a la hora que termina: la radiación es la acumulada de h − 1 a h; la temperatura y la humedad son las del instante h.',
          'La celda es la región que ocupa el sol en los días de la quincena y en los instantes que el valor representa; el color es la media de las horas de la celda o la frecuencia por encima de un umbral.',
          'Rangos predeterminados del SOL-AR 6.2 en la temperatura y en la radiación global y directa (propuestas nuevas en la humedad y en la difusa), o por los percentiles del archivo, que no se comparan entre ciudades.',
        ],
      },
      {
        title: 'Efecto en el año: clasificación e indicadores (paso 7)',
        items: [
          'La clase de la hora sale solo de la temperatura del aire exterior, un indicador aproximado: no entran las ganancias internas, la envolvente, la masa térmica, la ventilación ni el propio sol en la ventana.',
          'Temperatura de la hora: la media del inicio y del fin de la hora, el instante del medio, como el sol y la radiación de la hora.',
          'Predeterminado: umbral de 20 °C (Lamberts, Dutra y Pereira, 2014), para ambientes sin carga interna, que no se adapta al clima del lugar. El rango adaptativo de ASHRAE 55 vale para la temperatura interior de ambientes con ventilación natural; aplicado al aire exterior, tiende a subestimar las horas cálidas.',
          'Solo la radiación directa: la DNI del archivo, constante en cada hora, por el coseno del ángulo de incidencia y la fracción soleada de la ventana (6 instantes por hora). La difusa y la reflejada no entran.',
          'En las horas de la salida y la puesta del sol, con el sol sobre el horizonte solo en parte de la hora, la radiación en la ventana queda subestimada: la DNI de la hora se distribuye en la hora entera.',
          'Los porcentajes y las partes de cada clase son de las horas con sol en la ventana, no de las 8760 horas del año; las horas sin DNI en el archivo quedan fuera de las sumas y se cuentan en pantalla.',
          'Dos porcentajes, sin índice único: radiación bloqueada en las horas cálidas y admitida en las frías. Juntarlos exigiría pesar el calor evitado contra el perdido, lo que depende del edificio.',
        ],
      },
      {
        title: 'Viento (rosa de los vientos)',
        items: [
          'Viento medido en la estación meteorológica (en general a 10 m, en campo abierto), y no en el terreno.',
          'Calma por debajo de 0,5 m/s, sin dirección; los porcentajes son de las horas válidas del filtro.',
          'Estaciones del año por los meses (diciembre a febrero, marzo a mayo, junio a agosto, septiembre a noviembre).',
          'Corrección de altura y terreno con la ley potencial de EnergyPlus: cambia solo la velocidad; el filtro térmico usa la clasificación de las horas del paso 7.',
        ],
      },
    ],
  },
};
