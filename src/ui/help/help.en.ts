import type { HelpContent } from './content';

// Help in English (F4.8, decision 0032): same structure as the Portuguese one, with the terms of
// the technical glossary (docs/i18n/glossario-tecnico.md). To be reviewed by a native speaker in the
// field, like the rest of the English interface.
export const helpEn: HelpContent = {
  tutorial: {
    title: 'Guided tutorial',
    intro:
      'Eight short stages through the basic path, with the Brasília case of the UFU tutorial. It opens in a new tab; each stage highlights the panel you will work on.',
    steps: [
      {
        title: 'Welcome to SOL-AR',
        text: 'You will draw the mask of an overhang for a window in Brasília: choose the location, orient the facade, type the angles and read the data on the chart. Use "Next" to move on; "Do it for me" carries out the action of the stage.',
      },
      {
        title: 'Location',
        text: 'In step 1, choose Brasília in the list of cities. The chart becomes that of Brasília, at latitude 15.9° South.',
      },
      {
        title: 'The sun-path diagram',
        text: 'The centre of the chart is the zenith and the outer circle, the horizon. The orange curves are the sun paths, with the month at sunset, and the blue lines are the solar hours. Find the June path and the 9:00 line.',
      },
      {
        title: 'Facade',
        text: 'In step 2, type 30: the facade faces 30°, between North and North-East. The protractor turns with it, and the black facade line separates the sky the window sees from the sky behind it.',
      },
      {
        title: 'Angle α',
        text: 'In step 3, type α = 55°, in the internal reference. The red region is full shade: with the sun there, the overhang shades the whole window.',
      },
      {
        title: 'Side limits γ',
        text: 'An overhang of finite length has limits on the sides. Type γ right = 50° and γ left = 60°: the red region is limited to the right and to the left as seen from inside.',
      },
      {
        title: 'Data on the chart',
        text: 'In step 1, open the historical data; in step 4, choose the temperature. The red cells are the hottest hours; those under the red hatching of the mask are protected.',
      },
      {
        title: 'Print and continue',
        text: 'In step 5, print the chart to scale (6 cm radius, as in SOL-AR 6.2) or save the project. To continue, worked example 1 in the help checks whether these angles are enough, and the exercises train mask drawing.',
      },
    ],
  },
  exercises: {
    intro:
      'Draw by hand the full-shade mask of a device given by its angles and compare it with the computed one. Each exercise opens in a new tab, without the answer on the chart.',
    howTo: [
      'Read the statement on the card, above the steps.',
      'Click "Start drawing" and mark on the chart the vertices of the full-shade region, following the protractor curves; close the polygon (you can draw more than one).',
      'Click "Check": the computed mask appears hatched over your drawing, with the agreement between the two.',
    ],
    metric:
      'The agreement is the intersection divided by the union of the two regions, measured in sky area in front of the facade (solid angle), not in chart area, which grows near the horizon. The agreement over the sun hours of the year is also shown; it weighs each part of the sky by how often the sun passes there. With 90% or more, the mask matches; from 75% to 90%, almost.',
    items: {
      brise: {
        title: '1. Infinite overhang',
        statement:
          'North facade in Florianópolis, internal reference. Draw the full shade of an infinite overhang with α = 45°.',
      },
      'brise-gama': {
        title: '2. Overhang with side limits',
        statement:
          'North facade in Florianópolis, internal reference. Draw the full shade of an overhang with α = 40°, γ right = 40° and γ left = 40°.',
      },
      aletas: {
        title: '3. Fins on both sides',
        statement:
          'West facade in Florianópolis, internal reference. Draw the full shade of two infinite fins, with β right = 30° and β left = 30°.',
      },
      grelha: {
        title: '4. Egg-crate',
        statement:
          'Facade facing 30° in Brasília, internal reference. Draw the full shade of an egg-crate: an overhang with α = 50° touching two fins with β right = 30° and β left = 30°.',
      },
    },
  },
  guide: {
    intro:
      'SOL-AR draws the sun-path diagram of a place and, over it, the shading protractor and the shading mask of a device. The basic path has five steps, one open at a time: click or tap the title of a step to open it; when closed, it shows on one line what has been chosen. The advanced ones are folded below them. Everything you choose is kept in the page address: copy the link to save or share it.',
    steps: [
      {
        title: '1. Location',
        text: 'Choose the city. To colour the chart with hourly data, open the historical data (those of SOL-AR 6.2) or load an EPW weather file; the link of each city downloads the recent file (TMYx). The file is read only in your browser.',
      },
      {
        title: '2. Facade',
        text: 'Type the facade orientation: the azimuth of the outward normal, in degrees from North, clockwise (East = 90°). The protractor turns with it.',
      },
      {
        title: '3. Shading',
        text: 'Type the angles of the device, α of the overhang, β of the fins and γ of the side limits, in the internal or external reference. The red region is full shade; the yellow one, partial shade (centre of the window shaded). You can also draw a region by hand.',
      },
      {
        title: '4. Data on the chart',
        text: 'Colour the chart with a variable of the file (temperature, humidity or radiation) to see when shade is wanted. Hover over or tap a cell to read the values.',
      },
      {
        title: '5. Print and export',
        text: 'Print to scale (chart radius in cm), export the image (SVG or PNG) or the data (CSV), compare two set-ups side by side (or two climates of the same place on the same chart) and save the project to a file.',
      },
    ],
    advanced: [
      {
        title: 'Projection and hour lines',
        text: 'Equidistant and cylindrical projections, each with its own protractor, and hour lines in standard time (analemmas), to show the difference between solar time and clock time.',
      },
      {
        title: '6. Shading device by dimensions',
        text: 'Describe the window, the glass setback and the pieces in metres: the program draws the section and the view, the curves of 0 to 100% of the window shaded and the map of shade over the year. "Size from the period" works the other way round, from the period to shade to the angles and dimensions.',
      },
      {
        title: '7. Effect over the year',
        text: 'With a weather file and the device of step 6, it classifies the hours as hot, neutral or cold and shows the beam radiation blocked in the hot hours and admitted in the cold ones. Save options to compare them.',
      },
    ],
    tabs: [
      {
        title: 'Sun-path diagram',
        text: 'The chart with the protractor, the mask, the data and the curves of the device.',
      },
      {
        title: '3D view',
        text: 'The window and the pieces of step 6 with the sun of a given day and hour; the shade on the glass is the computed one.',
      },
      {
        title: 'Wind rose',
        text: 'Frequency and speed of the wind in the file, by season, time of day and thermal condition, with the EnergyPlus height and terrain correction.',
      },
    ],
    tips: [
      'Fields accept a decimal comma or point; an invalid value turns red, with an explanation.',
      'The link keeps everything except loaded files: to keep them, use "Save project" in step 5.',
      'After the first visit, the application opens without internet (historical data, for the cities already opened) and can be installed from the browser.',
      'Keyboard: Tab moves through the fields; in the tabs and option groups, the arrow keys change the choice.',
    ],
  },
  examples: {
    intro:
      'Three examples with the Brasília case of the UFU tutorial for Analysis SOL-AR, redone with the new SOL-AR. Each one opens in a new tab, with a card that follows the steps; the set-up of this tab does not change.',
    items: {
      angulos: {
        title: '1. Reading the angles on the chart: 55° or 57.5°?',
        problem:
          'In Brasília, on a facade facing 30°, the tutorial wants the window shaded from 9:00 to 15:00 (solar time) all year and reads on the chart α = 55°, γ right = 50° and γ left = 60°, in the internal reference. Are these angles enough?',
        steps: [
          'In step 3, the angles of the tutorial draw the full shade (red region).',
          'In step 6, "Size from the period" holds the period of the tutorial: 1 January to 31 December, 9:00 to 15:00 solar time. On the chart, it is shown in green.',
          'The table gives the angles that shade the whole period, with the sun that sets each one: α = 57.5° (32.5° in the external reference), γ right = 42.2° and γ left = 58.5°.',
          'The α comes from the 9:00 sun of 21 June, which lies outside the red region: with 55°, on the mornings of May to July, until 9:30, the sun reaches part of the window.',
          'With α = 57.5°, the depth of the overhang goes from 1.28 m (that of the tutorial, with the glass set back 15 cm) to 1.42 m.',
        ],
        lesson:
          'The 2.5° difference is small on paper: on a chart with a 6 cm radius, the 9:00 point of 21 June lies 1.7 mm from the 55° curve. Reading the chart is fine for studying; to make sure the period is covered, check the angles by calculation. The γ right of 50° is more than needed (the period asks for 42.2°): the extension is longer than necessary, on the side of shade.',
      },
      recuo: {
        title: '2. From angle to dimensions, with recessed glazing',
        problem:
          'The tutorial turns the angles into a 1.28 m overhang at the lintel, with extensions of 1.70 m to the left and 1.20 m to the right, on a 2.00 × 1.00 m window with the glass 15 cm behind the outer face of the wall. Where is the α in this drawing, and what does the setback change?',
        steps: [
          'Step 6 holds the window, the setback and the overhang of the tutorial. The section shows the α, from the sill at the glass to the outer edge of the overhang: 1.28 + 0.15 = 1.43 m for a 1.00 m height gives α = 55.0°, the angle read on the chart. In the view, γ right = 50.2° and γ left = 59.5°.',
          'On the chart, the 100% curve (whole window shaded, filled) matches the edge of the red region of step 3 within 0.1°: both describe the same full shade.',
          'There is no 0% curve: with recessed glazing, the lintel and the jambs of the wall shade part of the window for any sun off the normal. The curve shrinks to a point, the normal on the horizon, where the 0% label sits.',
          'In the period of example 1, this overhang keeps the whole window shaded in 99.2% of the instants; in the others, mornings from May to July, up to 8.7% of the window gets sun.',
        ],
        lesson:
          'The α is measured from the sill at the glass, and the depth of the overhang counts from the outer face of the wall: D = H · tan α − d, with d the setback. A thick wall is also shading: with a setback, there is always some shade on the window.',
      },
      afastado: {
        title: '3. Overhang set away from the wall: α2 is measured from the lintel',
        problem:
          'In the same tutorial, the overhang is 1.00 m deep, at the height of the lintel, 28 cm away from the wall, and the angles are α1 = 55° and α2 = 20°, both measured from the sill. What happens in the gap between the overhang and the wall?',
        steps: [
          'In step 3, α1 = 55° and α2 = 20° draw the full shade as a band between the two curves: it is the mask the tutorial paints.',
          'In SOL-AR, α2 is measured from the lintel to the inner edge of the overhang (step 3, "Indices 2"). Here the inner edge is at the height of the lintel: the α2 of the drawing is 90°, and the gap lets the sun reach the glass.',
          'Step 6 holds the drawn overhang. On the chart, the 100% curve only appears next to the facade line: the whole window is shaded only with the sun above 81.5° of profile angle, when the lintel of the wall itself covers the glass.',
          'In the period of example 1, only 18% of the instants have the whole window shaded, all with the sun almost grazing the facade, and none from 12 May to 30 July; at the worst instant, 65% of the window gets sun.',
          'For full shade from 35° to 70° of profile angle, as the tutorial intended, the inner edge would have to rise 0.77 m above the lintel (α2 = 20° measured from the lintel), and the overhang would become 2.10 m deep to keep α1 = 55°.',
        ],
        lesson:
          'Measured from the sill, α2 promises a shade that the overhang set away from the wall does not give. Measure α2 from the lintel to the inner edge: sun higher than that line passes through the gap. With a gap, "Size from the period" computes the height above the lintel that closes it.',
      },
    },
    source:
      'Source of the case: Bortoli, K. C. R.; Saramago, R. C. P. Analysis SOL-AR (tutorial of the project "Desenvolvimento de tutoriais de softwares da série Analysis", FAUeD/UFU), available on the LabEEE website. The readings of the tutorial are graphical; the differences are in the validation reports of the project.',
  },
  glossary: [
    {
      title: 'Chart and angles',
      terms: [
        {
          term: 'Sun-path diagram',
          definition:
            'Drawing of the sky vault on a plane, with the paths of the sun through the year and the hour lines. In the stereographic projection (the default), the centre is the zenith and the outer circle, the horizon.',
        },
        {
          term: 'Shading protractor',
          definition:
            'Template with the curves of α, β and γ, turned to the facade orientation, to read on the chart the angles of a device or to draw its mask.',
        },
        {
          term: 'Shading mask',
          definition:
            'Region of the chart with the sun positions that the device blocks. Red: full shade, the whole window shaded. Yellow: partial shade, the centre of the window shaded.',
        },
        {
          term: 'α (horizontal device, overhang)',
          definition:
            'Angle of the overhang in the section of the window, from the sill to the outer edge of the overhang. In the internal reference, measured from the facade plane (the AVS of the Brazilian INI-C); in the external one, from the horizontal (the profile angle, or vertical shadow angle).',
        },
        {
          term: 'β (vertical fins)',
          definition:
            'Angle of a fin in plan, from the opposite edge of the window to the tip of the fin. In the internal reference, measured from the facade plane (the AHS of the INI-C); in the external one, from the normal (horizontal shadow angle).',
        },
        {
          term: 'γ (side limits)',
          definition:
            'Limit of an overhang of finite length, in the facade plane, from the bottom corner on the same side to the end of the overhang. In the internal reference, measured from the vertical; in the external one, from the horizontal. The γ of the fins limits the top of a fin.',
        },
        {
          term: 'Internal and external reference',
          definition:
            'The two ways SOL-AR measures the angles; external = 90° − internal. The internal one is the default and matches the AVS and AHS of the INI-C.',
        },
        {
          term: 'AVS (vertical shading angle)',
          definition:
            'The Brazilian INI-C (Inmetro, 2020) name for the angle of the overhang: between the vertical plane at the base of the glass and the plane through the farthest edge of the device. It is α in the internal reference, the default in the program.',
        },
        {
          term: 'AHS (horizontal shading angle)',
          definition:
            'The INI-C name for the angle of the fins: between the facade plane and the plane through the farthest edge of the fin and the opposite edge of the window. It is β in the internal reference.',
        },
        {
          term: 'Indices 1 and 2',
          definition:
            'For a device set away from the wall: index 1 goes to the outer edge; index 2, to the inner edge, with α2 measured from the lintel. Full shade lies between the two curves, because the gap lets the sun through.',
        },
        {
          term: 'Facade orientation',
          definition:
            'Azimuth of the outward normal, the direction the facade faces, in degrees from true North, clockwise (East = 90°).',
        },
        {
          term: 'Left and right',
          definition: 'Always as seen from inside, looking out through the window.',
        },
      ],
    },
    {
      title: 'Device and geometry',
      terms: [
        {
          term: 'Shading device (brise-soleil)',
          definition:
            'External element that shades the window: horizontal (overhang, canopy), vertical (fin) or split into louvers.',
        },
        { term: 'Fin', definition: 'Vertical shading device, beside the window.' },
        {
          term: 'Louvers',
          definition:
            'Narrower parallel pieces that replace an overhang or a fin while keeping the same angles.',
        },
        {
          term: 'Sill and lintel',
          definition: 'The bottom and the top of the window opening.',
        },
        {
          term: 'Glass setback',
          definition:
            'Distance from the glass to the outer face of the wall. The wall itself (lintel and jambs) shades part of the window; the pieces of step 6 are measured from the outer face.',
        },
        {
          term: 'Curves of 0 to 100%',
          definition:
            'On the chart, the sun positions at which the same share of the window is shaded; inside the 100% curve, the whole window. They come from the exact geometry of the pieces.',
        },
        {
          term: 'Sunlit fraction',
          definition:
            'Share of the window area that receives direct sun at an instant: 1 minus the shaded share. The same quantity as the EnergyPlus sunlit fraction.',
        },
        {
          term: 'Single-point mask',
          definition: 'The sun positions at which a chosen point of the window is shaded.',
        },
        {
          term: 'Period to shade',
          definition:
            'Days and hours in which the window must be fully shaded: the starting point of sizing.',
        },
      ],
    },
    {
      title: 'Time',
      terms: [
        {
          term: 'Apparent solar time',
          definition:
            'Time kept by the sun: 12:00 when it crosses the local meridian. It is the time of the hour lines of the chart, except with the standard-time option.',
        },
        {
          term: 'Standard time',
          definition:
            'Clock time in the time zone of the place, without daylight saving time: that of the weather file. It differs from solar time by the longitude and the equation of time.',
        },
        {
          term: 'Equation of time',
          definition:
            'Difference between apparent and mean solar time, from about −14 to +16 minutes through the year, due to the elliptical orbit and the tilt of the Earth axis.',
        },
        {
          term: 'Analemma',
          definition:
            'Figure-eight curve that the sun traces through the year at the same standard time; it is the hour line in standard time.',
        },
        {
          term: 'Sun path',
          definition:
            'Path of the sun in one day. The chart shows the solstices, the equinoxes and the 21st of the other months.',
        },
      ],
    },
    {
      title: 'Weather data and wind',
      terms: [
        {
          term: 'Weather file (EPW)',
          definition:
            'EnergyPlus format, with the 8760 hours of the year of temperature, humidity, radiation and wind. Each value refers to the hour that ends; radiation is the amount accumulated over the hour.',
        },
        {
          term: 'TRY, IWEC and TMYx',
          definition:
            'Reference climate years, built from typical months of several years of measurements. The historical data of SOL-AR 6.2 are TRY (Goulart, Lamberts and Firmino, 1998) or IWEC; the TMYx 2011 to 2025 files come from Climate.OneBuilding.org.',
        },
        {
          term: 'Direct normal radiation (DNI)',
          definition:
            'Radiation from the solar disc on a plane perpendicular to the rays, in Wh/m² over the hour. On the window, it is multiplied by the cosine of the angle of incidence (DNI · cos θ).',
        },
        {
          term: 'Diffuse radiation',
          definition:
            'Radiation from the sky, outside the solar disc. The chart mask does not represent it, and the indicators do not count it.',
        },
        {
          term: 'Wind rose',
          definition:
            'Frequency of the wind by the direction it comes from (8 or 16 sectors), split into speed classes.',
        },
        {
          term: 'Calm',
          definition:
            'Wind below 0.5 m/s, with no defined direction; it stays out of the sectors, in the centre of the rose.',
        },
        {
          term: 'Height and terrain correction',
          definition:
            'Conversion of the station wind (10 m, open country) to another height and terrain, with the EnergyPlus power law.',
        },
      ],
    },
    {
      title: 'Effect over the year',
      terms: [
        {
          term: 'Hot, neutral and cold hours',
          definition:
            'Classes of the hours by the outdoor air temperature: hot hours call for shade; cold ones, for sun. The default is the 20 °C threshold (Lamberts, Dutra and Pereira, 2014).',
        },
        {
          term: 'ASHRAE 55 adaptive comfort range',
          definition:
            'Comfort range that follows the mean outdoor temperature of the previous days (prevailing mean outdoor air temperature). It applies to the indoor temperature of naturally ventilated spaces; compared with the outdoor air, as here, it is an approximation.',
        },
        {
          term: 'Balance-point temperature',
          definition:
            'Outdoor temperature above which the heat gains of the building become excess; it depends on the building and has no default value.',
        },
        {
          term: 'Blocked and admitted radiation',
          definition:
            'Share of the beam radiation that would reach the glass without the device and that the device blocks in the hot hours or lets in during the cold ones. The closer to 100%, the better.',
        },
        {
          term: 'Outperformed option',
          definition:
            'An option outperforms another when it blocks at least as much in the hot hours and admits at least as much in the cold ones, and is better in one of the two.',
        },
      ],
    },
  ],
  faq: [
    {
      question: 'Why is the chart different from the SOL-AR 6.2 one?',
      answer:
        'Because of the sun position and of the time. Version 6.2 used approximate formulas (error of about 1°) and paths with 7 fixed declinations (up to 1.7° of error in April and August); here the sun comes from the NREL SPA algorithm, checked against pvlib. Also, 6.2 always converted clock time to solar time with the 45° West meridian, which shifts the data by 1 h in the cities in UTC−4 and by 2 h in Acre; here the time zone of the file of each place is used.',
    },
    {
      question: 'Are the chart hours solar or clock hours?',
      answer:
        'The hour lines are in apparent solar time, as in 6.2: 12:00 is solar noon. In "Projection and hour lines" (advanced), they can be in standard time (the analemmas). The data of the file stay in the standard time of its time zone: the radiation cell covers the hour that ends (from h − 1 to h), and the temperature cell, half an hour on each side of h.',
    },
    {
      question: 'Which reference should I use, internal or external?',
      answer:
        'The one in your course material: the result is the same, and external = 90° − internal. The internal one, the default, measures α and β from the facade plane and matches the AVS and AHS of the INI-C; the external one measures α from the horizontal, like the profile angle of the English literature.',
    },
    {
      question: 'Left and right as seen by whom?',
      answer:
        'By someone inside, looking out through the window, throughout the program. That is why, in the "outside view" drawing of step 6, the right side appears on the left.',
    },
    {
      question:
        'With an overhang and fins together, the red region came out smaller than I expected. Why?',
      answer:
        'With the angles, each piece is treated on its own, and full shade is the union of the regions of each one. When the pieces help each other (one shades the part of the window the other leaves in the sun), the real full shade is larger. In an egg-crate (overhang touching the fins, against the wall), leave γ and the γ of the fins blank. For the exact result, describe the pieces in step 6: the 100% curve comes from the geometry.',
    },
    {
      question: 'What is partial shade (yellow)?',
      answer:
        'The sun positions at which the centre of the window is shaded, with the angles measured from the centre. For long overhangs and fins without a gap, it means at least half of the window shaded; in other cases, it is an approximation. The 25, 50 and 75% curves of step 6 give the exact share.',
    },
    {
      question: 'Where do the weather data come from? Can I use my own file?',
      answer:
        'The cities in the list have the historical data of SOL-AR 6.2 (TRY or IWEC). The catalogue in step 1 has the 579 Brazilian stations with a TMYx 2011 to 2025 file (Climate.OneBuilding.org), with a map, the quality of each file and the download link. You can load any EPW or SOL-AR CSV file: it is read in your browser and sent nowhere. The source, the period and the quality warnings appear in step 1.',
    },
    {
      question: 'How do I compare the climate of the past with today, or with the future?',
      answer:
        'Open the data of the first climate (the historical data of the city or a file) and choose a variable in step 4. In step 5, "Compare" keeps this set-up as A. Then load the file of the other climate of the same place (the recent TMYx or a future file, such as those of BrazFuture) and click "Difference B − A on the same chart": each cell shows the mean of B minus that of A. The difference mixes climate change with the differences between the files (each is a typical year, with its own source and method); for radiation, the screen also says whether the radiation of one file is shifted in time relative to the other. To isolate the projected change, compare files of the same set and model, such as the 2010 and 2050 BrazFuture files of the same run.',
    },
    {
      question: 'How do I print the chart to scale?',
      answer:
        'In step 5, choose the chart radius (6 cm, as in 6.2) and what to include; in the print dialog, use 100% scale. The 5 cm ruler printed next to the chart checks the scale. To use it as a protractor on tracing paper or a transparency, print the protractor only.',
    },
    {
      question: 'How do I keep and share a study?',
      answer:
        'The page address keeps your choices: copy the link. Loaded weather files do not fit in the link; to keep them too, use "Save project" in step 5, which writes a file to open later with "Open project".',
    },
    {
      question: 'Does it work offline? Does any of my data leave the computer?',
      answer:
        'After the first visit, the application opens without internet, including the historical data of the cities already opened, and can be installed from the browser. Nothing leaves the browser: there is no server, account or tracking; the chosen language is stored only in this browser.',
    },
    {
      question: 'Have the calculations been checked?',
      answer:
        'Yes, each one against an independent reference, with the tolerance written in the specification: the sun position against pvlib, the masks against ray tracing, the sunlit fraction against EnergyPlus (hourly root mean square error of 0.006 to 0.026) and the wind against the EnergyPlus formulas. The reports are in the project repository, in docs/validacao.',
    },
    {
      question: 'Why is the wind of the rose not that of my site?',
      answer:
        'Because it is the wind measured at the weather station, usually at an airport, 10 m high, in open country. The height and terrain correction (advanced) converts the speed with the EnergyPlus power law, but it does not change the direction or account for the buildings and terrain around the site.',
    },
    {
      question: 'Why is the air temperature not enough to decide when to shade?',
      answer:
        'Because the need for shade also depends on internal gains, envelope, thermal mass and ventilation. The classification of the hours is an approximate indicator: the default, 20 °C, is the criterion of Lamberts, Dutra and Pereira (2014) for spaces without internal loads; with internal loads, use a lower limit or the balance-point temperature of your building.',
    },
  ],
  hypotheses: {
    intro:
      'What each part of the program assumes and what it leaves out. The same assumptions appear, in short, in each step.',
    groups: [
      {
        title: 'Chart and sun',
        items: [
          'Sun position from the NREL SPA algorithm, geometric (no atmospheric refraction), in the reference year 2026: typical files mix months of different years and have no year of their own.',
          'Paths on the solstices, the equinoxes and the 21st of the other months; hour lines in apparent solar time, or in standard time (analemmas) with the advanced option.',
          'Standard time from the time zone of the weather file (or of the city station), without daylight saving time.',
        ],
      },
      {
        title: 'Mask from the angles (step 3)',
        items: [
          'Exact full shade for one piece (overhang or fin, with or without limits), for fins on both sides and for an egg-crate without γ; with separate pieces, the red region is the union of the regions of each piece and can be smaller than the real full shade.',
          'Partial shade from the centre of the window: equal to 50% of the window for long overhangs and fins without a gap; an approximation in other cases.',
          'The freehand drawing is added to the computed mask.',
        ],
      },
      {
        title: 'Shading device by dimensions (step 6)',
        items: [
          'Pieces as thin opaque plates in front of the glass; the wall enters through the glass setback. No reflection on the pieces and no light through them.',
          'Shaded share of the window from the exact area of the shadow, for direct sun only: diffuse radiation is not masked.',
          'Year map and indicators with the sun every 10 minutes (6 instants per hour); sizing with the sun every 5 minutes, for full shade over the whole period.',
        ],
      },
      {
        title: 'Data on the chart (step 4)',
        items: [
          'Each value of the file refers to the hour that ends: radiation is the amount accumulated from h − 1 to h; temperature and humidity are those of instant h.',
          'A cell is the region taken by the sun on the days of the fortnight and at the instants the value represents; its colour is the mean of the hours in the cell or the frequency above a threshold.',
          'Default bands of SOL-AR 6.2 for temperature and global and direct radiation (new proposals for humidity and diffuse radiation), or from the percentiles of the file, which cannot be compared between cities.',
          'Difference between two climates: the mean of each cell in B minus that in A, only for the same place (within 0.1° and the same time zone). For radiation, the time shift between the files comes from the daily centroid of the global radiation on the 30 clearest days of each, assuming similar clouds on the clear days of the two files of the same place.',
        ],
      },
      {
        title: 'Effect over the year: classification and indicators (step 7)',
        items: [
          'The class of an hour comes only from the outdoor air temperature, an approximate indicator: internal gains, envelope, thermal mass, ventilation and the sun on the window itself are left out.',
          'Temperature of the hour: the mean of the start and the end of the hour, the middle instant, like the sun and the radiation of the hour.',
          'Default: 20 °C threshold (Lamberts, Dutra and Pereira, 2014), for spaces without internal loads, which does not adapt to the local climate. The ASHRAE 55 adaptive range applies to the indoor temperature of naturally ventilated spaces; applied to the outdoor air, it tends to underestimate the hot hours.',
          'Beam radiation only: the DNI of the file, constant within each hour, times the cosine of the angle of incidence and the sunlit fraction of the window (6 instants per hour). Diffuse and reflected radiation are left out.',
          'In the hours of sunrise and sunset, with the sun above the horizon for only part of the hour, the radiation on the window is underestimated: the DNI of the hour is spread over the whole hour.',
          'The percentages and the shares of each class refer to the hours with sun on the window, not to the 8760 hours of the year; hours without DNI in the file stay out of the sums and are counted on screen.',
          'Two percentages, no single index: beam radiation blocked in the hot hours and admitted in the cold ones. Merging them would require weighing the heat avoided against the heat lost, which depends on the building.',
        ],
      },
      {
        title: 'Wind (wind rose)',
        items: [
          'Wind measured at the weather station (usually 10 m high, in open country), not at the site.',
          'Calm below 0.5 m/s, with no direction; the percentages refer to the valid hours of the filter.',
          'Seasons by months (December to February, March to May, June to August, September to November).',
          'Height and terrain correction with the EnergyPlus power law: only the speed changes; the thermal filter uses the classification of the hours of step 7.',
        ],
      },
    ],
  },
};
