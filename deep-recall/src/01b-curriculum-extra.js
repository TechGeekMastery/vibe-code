/* ------------------------------------------------------------------ languages, practical skills, prerequisites, ladder */
SUBJECTS.push(
 {id:'de', name:'German', mono:'De', color:'#8FA3BA', blurb:'Standard German from first sounds to B1: grammar that clicks, vocabulary on a spaced schedule, and conversation practice.',
  lang:{code:'de-DE', name:'German', base:'English', baseCode:'en-US', note:'Standard German (Hochdeutsch). Explanations in English; contrast with English wherever it clarifies.'}, units:[
  {t:'A1 · First steps', n:['Sounds and spelling of German','Nouns, gender, and articles','Present tense, sein and haben','Verb-second word order','Numbers, time, and dates','The accusative case','Modal verbs','Separable verbs','Negation: nicht and kein','Possessive articles']},
  {t:'A2 · Building sentences', n:['The dative case','Two-way prepositions','The perfect tense','Reflexive verbs','Comparatives and superlatives','Subordinate clauses: weil, dass, wenn','Adjective endings I','The imperative']},
  {t:'B1 · Independence', n:['The genitive case','The simple past (Präteritum)','Relative clauses','Adjective endings II','The passive voice','Konjunktiv II','Infinitive clauses with zu','The future and werden']}]},
 {id:'ca', name:'Catalan', mono:'Ca', color:'#D46A7E', blurb:'Català central enseñado desde el castellano peninsular: cada punto se explica por contraste con el español.',
  lang:{code:'ca-ES', name:'Catalan', base:'Spanish (Spain)', baseCode:'es-ES', note:'Central Catalan (Barcelona standard) for a native-level speaker of Peninsular Spanish. ALL explanations, instructions, and feedback are written in Peninsular Spanish (vosotros, Spain vocabulary). Teach by systematic contrast with Castilian: point out where Catalan matches Spanish, where it differs, and the typical errors a Spanish speaker makes (castellanismos, calques, false friends, pronoun use, vowel reduction).'}, units:[
  {t:'A1 · Primeros pasos', n:['Pronunciación: vocal neutra y vocales abiertas y cerradas','Artículos: el, la, l’, els, les y el artículo personal en/na','Ser, estar y haver-hi','Presente de indicativo: -ar, -re e -ir incoativos','El pasado perifrástico: vaig anar','Números, horas y fechas','Posesivos: el meu, la meva','La negación y el uso de pas','Falsos amigos frecuentes con el castellano']},
  {t:'A2 · Construir frases', n:['Pronombres débiles I: complemento directo e indirecto','Los pronombres en y hi','Combinaciones de pronombres débiles','Pretérito perfecto y participios','Futuro y condicional','El imperativo','Preposiciones: a, en, amb, per y per a','Tenir, haver de y la obligación','Ser y estar: dónde difieren del castellano']},
  {t:'B1 · Autonomía', n:['El subjuntivo','Oraciones de relativo: que, qui, on, el qual','Pronombres débiles II: casos avanzados','El estilo indirecto','Variedades: central, valenciano y balear','Castellanismos y calcos que conviene evitar']}]},
 {id:'elx', name:'Electronics & Circuits', mono:'El', color:'#D9954A', program:true, skills:true, blurb:'Build and debug real circuits: calculations, components, and hands-on projects with checkpoints.', kit:'A starter kit with a breadboard, jumper wires, assorted resistors, LEDs, capacitors, a few transistors, a 9 V battery clip, and a basic digital multimeter.', units:[
  {t:'Foundations', n:['Voltage, current, resistance, and Ohm’s law','Series and parallel circuits','Using a multimeter safely','Power, heat, and component ratings','Breadboards and reading schematics']},
  {t:'Components', n:['Resistors and voltage dividers','Capacitors and RC timing','Diodes and LEDs','Transistors as switches','Relays, motors, and inductive loads']},
  {t:'Building & Debugging', n:['Soldering and wiring','Power supplies and voltage regulators','Troubleshooting a dead circuit','555 timer circuits','Operational amplifiers']},
  {t:'Digital & Signals', n:['Logic gates and truth tables','Flip-flops, counters, and shift registers','Analog-to-digital and digital-to-analog conversion','RC filters: low-pass and high-pass','Oscilloscopes and measuring signals','PCB design basics']}]},
 {id:'rob', name:'Robotics & Microcontrollers', mono:'Ro', color:'#5BA8BF', program:true, skills:true, blurb:'Program microcontrollers, wire sensors and motors, and build robots that sense and react.', kit:'An Arduino Uno (or compatible) kit with a breadboard, jumper wires, LEDs, pushbuttons, a potentiometer, an ultrasonic distance sensor, a servo, and a small motor driver with two DC motors.', units:[
  {t:'Microcontroller basics', n:['Arduino basics: pins, sketches, and the loop','Digital input and debouncing','Analog input and sensors','PWM, LEDs, and servos']},
  {t:'Motion and sensing', n:['DC motors and motor drivers','Distance sensors, IMUs, and encoders','Serial communication: UART, I2C, SPI','Power for robots: batteries and regulation']},
  {t:'Control and projects', n:['State machines','Feedback control and PID','Line-following robot','Obstacle-avoiding robot']},
  {t:'Advanced Robotics', n:['Kinematics of robot arms','Sensor fusion and filtering','Localization and mapping basics','Computer vision on small computers','ROS basics']}]},
 {id:'mak', name:'Making & Repair', mono:'Mk', color:'#B8977A', program:true, skills:true, blurb:'Tools, materials, assembly, and repair: the practical skills to build and fix things yourself.', kit:'A basic home toolkit: tape measure, screwdriver set, adjustable wrench, pliers, utility knife, level, a cordless drill/driver, and safety glasses.', units:[
  {t:'Tools and technique', n:['Hand tools and precise measuring','Fasteners: screws, bolts, and wall anchors','Reading assembly instructions and exploded diagrams','Workshop safety']},
  {t:'Repair', n:['Drills and drivers','Soldering and cable repair','Household electrical safety: what not to touch','Diagnosing and repairing small appliances']},
  {t:'Building', n:['3D printing basics','Woodworking joints','Adhesives and materials','Plumbing basics: leaks and traps']},
  {t:'Around the House', n:['Drywall repair','Bicycle maintenance','Car basics: fluids, tires, and brakes','Sewing and textile repair']}]}
);

/* subject-level prerequisite links, for tracing a gap back to its root cause */
const PREREQS = {
  viro:['bio', 'chm'], bio:['chm'], neuro:['bio', 'chm'], phy:['mth'], chm:['mth'], sts:['mth'],
  econ:['sts', 'mth', 'epi'], epi:['sts'], cs:['mth', 'py'], cyber:['cert', 'cs', 'py'], astro:['phy', 'mth'], ai:['mth', 'sts', 'py', 'cs'], py:['cs'], cert:['cs', 'cyber'],
  geo:['hist', 'econ'], phil:['epi'], rel:['hist', 'phil'], elx:['phy', 'mth'], rob:['elx', 'cs', 'phy'], mak:['elx']
};

/* the self-direction ladder: guidance fades as measured meta-skills rise */
const RUNGS = [
  {n:1, key:'guided', title:'Guided', desc:'The app teaches; you practice.'},
  {n:2, key:'dump', title:'Retrieve first', desc:'Brain-dump what you know before and after lessons.'},
  {n:3, key:'summary', title:'Learn from sources', desc:'Read real sources, then summarize from memory.'},
  {n:4, key:'qwrite', title:'Write the questions', desc:'Author your own tests of understanding.'},
  {n:5, key:'selfgrade', title:'Grade yourself', desc:'Judge your answers before Claude does.'},
  {n:6, key:'plan', title:'Plan it yourself', desc:'Design your own curriculum; Claude critiques it.'}
];
