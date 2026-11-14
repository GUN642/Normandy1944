// Storyline: acht Operationen der Normandie-Invasion in historischer Reihenfolge.
// Jede Operation ist von amerikanischer (us) und deutscher (de) Seite spielbar; die Ziele sind gespiegelt.
// Personen sind fiktiv, Einheiten, Orte, Zeiten und Abläufe folgen den historischen Ereignissen.
//
// Zieltypen (missions.js):
//   reach    – Gebiet erreichen (anchor, r)
//   regroup  – versprengte Kameraden einsammeln (n)
//   destroy  – Ziele sprengen/zerstören (targets: Ankernamen von Geschützen, Flak, Panzern …)
//   clear    – Gebiet vom Feind säubern (anchor, r, left: zulässige Restfeinde)
//   defend   – Gebiet halten (anchor, r, time in s); verloren, wenn der Feind es besetzt
//   flag     – Flagge hissen / Stellung markieren (anchor) – Taste E
//   kill     – Anzahl Feinde ausschalten (n)
//   survive  – Zeit überstehen (time)
// Kräfte (forces): Trupps mit Anker, Stärke, Rollen und Befehl:
//   hold (an Ort verteidigen), static (Stellungen: MG-Nest, Bunker, Scharfschütze), attack (auf Ziel vorrücken),
//   patrol (zwischen Ankern), follow (folgt dem Spieler – eigener Trupp). wave: Startzeit in s, tank: Panzertyp.

export const SIDES = {
  us: { name: { de: 'Amerikaner', en: 'Americans' }, color: '#7fae5a' },
  de: { name: { de: 'Deutsche', en: 'Germans' }, color: '#9aa3ad' },
};

export const OPERATIONS = [
  // ------------------------------------------------------------------ 1
  {
    id: 'drop', map: 'bocage_night', date: { de: '6. Juni 1944', en: '6 June 1944' }, time: '01:15', tod: 1.25, weather: 'night_clouds',
    title: { de: 'Nacht der Fallschirmjäger', en: 'Night of the Paratroopers' },
    place: { de: 'Bei Sainte-Marie-du-Mont, Cotentin', en: 'Near Sainte-Marie-du-Mont, Cotentin' },
    history: {
      de: 'In der Nacht zum D-Day springen 13.000 Fallschirmjäger der 82. und 101. US-Luftlandedivision über der Halbinsel Cotentin ab. Tiefe Wolken und Flakfeuer zersprengen die Formationen der C-47 – viele Männer landen kilometerweit von ihren Absetzzonen entfernt und finden sich nur mit dem „Cricket“-Knackfrosch wieder.',
      en: 'In the night before D-Day 13,000 paratroopers of the US 82nd and 101st Airborne jump over the Cotentin peninsula. Low clouds and flak scatter the C-47 formations – many men land miles from their drop zones and find each other only with the "cricket" clicker.',
    },
    us: {
      unit: { de: '506. Fallschirmjäger-Regiment, 101. Luftlandedivision', en: '506th Parachute Infantry Regiment, 101st Airborne' },
      briefing: {
        de: 'Sie springen um 01:15 Uhr aus einer C-47 über der Absetzzone C. Die Maschine ist vom Kurs abgekommen. Sammeln Sie versprengte Kameraden (Erkennung: ein Klick des Crickets, Antwort zwei Klicks), schalten Sie die 2-cm-Flakstellung am Gehöft aus und stoßen Sie zum Sammelpunkt an der Straße nach Sainte-Marie-du-Mont vor.',
        en: 'You jump from a C-47 at 01:15 over Drop Zone C. The plane is off course. Gather scattered comrades (challenge: one click of the cricket, answer: two clicks), knock out the 20 mm flak position at the farm and push on to the rally point on the road to Sainte-Marie-du-Mont.',
      },
      spawn: 'jump',
      objectives: [
        { type: 'regroup', n: 4, text: { de: 'Versprengte Fallschirmjäger sammeln', en: 'Gather scattered paratroopers' } },
        { type: 'destroy', targets: ['flak1', 'flak2'], text: { de: 'Flakstellungen am Gehöft zerstören', en: 'Destroy the flak guns at the farm' } },
        { type: 'reach', anchor: 'rally', r: 18, text: { de: 'Sammelpunkt an der Straße erreichen', en: 'Reach the rally point on the road' } },
      ],
    },
    de: {
      unit: { de: 'Grenadier-Regiment 1058, 91. Luftlande-Infanterie-Division', en: 'Grenadier Regiment 1058, 91st Air Landing Division' },
      briefing: {
        de: 'Fliegeralarm! Feindliche Transportflugzeuge überfliegen den Abschnitt, überall gehen Fallschirme nieder. Ihr Zug schützt die Flakstellung am Gehöft. Halten Sie die Stellung, bis die Verstärkung aus Sainte-Marie-du-Mont eintrifft, und bekämpfen Sie gelandete Fallschirmjäger.',
        en: 'Air raid alarm! Enemy transport planes are crossing the sector, parachutes are coming down everywhere. Your platoon guards the flak position at the farm. Hold it until reinforcements from Sainte-Marie-du-Mont arrive and engage the landed paratroopers.',
      },
      spawn: 'farm',
      objectives: [
        { type: 'defend', anchor: 'farm', r: 45, time: 420, text: { de: 'Flakstellung am Gehöft halten', en: 'Hold the flak position at the farm' } },
        { type: 'kill', n: 10, text: { de: 'Gelandete Fallschirmjäger bekämpfen', en: 'Engage the landed paratroopers' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'pt1', n: 1, order: 'lost', roles: ['rifle'] },
        { anchor: 'pt2', n: 2, order: 'lost', roles: ['rifle', 'smg'] },
        { anchor: 'pt3', n: 1, order: 'lost', roles: ['mg'] },
        { anchor: 'pt4', n: 2, order: 'lost', roles: ['rifle', 'at'] },
        { anchor: 'dzE', n: 5, order: 'attack', target: 'farm', wave: 150, roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle'] },
      ],
      de: [
        { anchor: 'farm', n: 6, order: 'hold', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'officer'] },
        { anchor: 'flak1', n: 2, order: 'static', roles: ['rifle', 'rifle'] },
        { anchor: 'flak2', n: 2, order: 'static', roles: ['rifle', 'rifle'] },
        { anchor: 'village', n: 5, order: 'patrol', route: ['village', 'cross', 'farm'], roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle'] },
        { anchor: 'village', n: 6, order: 'attack', target: 'farm', wave: 240, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'officer'] },
      ],
    },
    ambient: { flak: true, planes: 'c47', arty: 0.15, flares: true, sniper: 0 },
    events: [
      { t: 3, from: { de: 'Sprungmeister', en: 'Jumpmaster' }, side: 'us', text: { de: 'Grünes Licht! Raus, raus, raus!', en: 'Green light! Go, go, go!' } },
      { t: 4, from: { de: 'Flakleitstand', en: 'Flak command' }, side: 'de', text: { de: 'Feindliche Verbände im Anflug, Höhe dreihundert. Feuer frei!', en: 'Enemy formations inbound, altitude three hundred. Open fire!' } },
      { t: 40, from: { de: 'Leutnant Hale', en: 'Lt. Hale' }, side: 'us', text: { de: 'Hier Hale. Wir sind weit verstreut. Sammeln, dann die Flak am Gehöft ausschalten.', en: 'This is Hale. We are scattered all over. Regroup, then take out the flak at the farm.' } },
      { t: 150, from: { de: 'Leutnant Hale', en: 'Lt. Hale' }, side: 'us', text: { de: 'Ein Trupp der Easy Company kommt von Osten. Gemeinsam auf das Gehöft!', en: 'An Easy Company squad is coming from the east. Hit the farm together!' } },
      { t: 240, from: { de: 'Bataillon', en: 'Battalion' }, side: 'de', text: { de: 'Verstärkung aus Sainte-Marie-du-Mont ist unterwegs. Durchhalten!', en: 'Reinforcements from Sainte-Marie-du-Mont are on the way. Hold on!' } },
    ],
  },

  // ------------------------------------------------------------------ 2
  {
    id: 'stmere', map: 'stmere', date: { de: '6. Juni 1944', en: '6 June 1944' }, time: '04:30', tod: 4.6, weather: 'dawn_mist',
    title: { de: 'Sainte-Mère-Église', en: 'Sainte-Mère-Église' },
    place: { de: 'Sainte-Mère-Église, an der N13', en: 'Sainte-Mère-Église, on Route N13' },
    history: {
      de: 'Die 82. Luftlandedivision nimmt Sainte-Mère-Église in den frühen Morgenstunden ein – die erste befreite Stadt Frankreichs. Die Stadt sperrt die Nationalstraße 13 nach Cherbourg. Am Vormittag greifen deutsche Kräfte von Süden (Fauville) und Norden an.',
      en: 'The 82nd Airborne takes Sainte-Mère-Église in the early morning – the first town in France to be liberated. It blocks Route N13 to Cherbourg. During the morning German forces counterattack from the south (Fauville) and the north.',
    },
    us: {
      unit: { de: '3. Bataillon, 505. Fallschirmjäger-Regiment, 82. Luftlandedivision', en: '3rd Battalion, 505th PIR, 82nd Airborne' },
      briefing: {
        de: 'Ihr Bataillon dringt im Morgengrauen von Westen in die Stadt ein. Säubern Sie den Kirchplatz, hissen Sie am Rathaus die amerikanische Flagge und verteidigen Sie die Stadt gegen den Gegenangriff von Süden entlang der N13.',
        en: 'Your battalion enters the town from the west at dawn. Clear the church square, raise the American flag at the town hall and defend the town against the counterattack from the south along the N13.',
      },
      spawn: 'westEdge',
      objectives: [
        { type: 'clear', anchor: 'square', r: 60, left: 1, text: { de: 'Kirchplatz säubern', en: 'Clear the church square' } },
        { type: 'flag', anchor: 'townhall', text: { de: 'Flagge am Rathaus hissen (E)', en: 'Raise the flag at the town hall (E)' } },
        { type: 'defend', anchor: 'roadS', r: 50, time: 300, text: { de: 'Südausgang an der N13 halten', en: 'Hold the southern exit on the N13' } },
      ],
    },
    de: {
      unit: { de: 'Grenadier-Regiment 1057, 91. Luftlande-Infanterie-Division', en: 'Grenadier Regiment 1057, 91st Air Landing Division' },
      briefing: {
        de: 'Die Ortsbesatzung wurde in der Nacht überrascht. Ihr Bataillon tritt von Süden entlang der N13 zum Gegenangriff an. Nehmen Sie den Südausgang, stoßen Sie zum Kirchplatz vor und werfen Sie den Gegner aus der Stadt.',
        en: 'The town garrison was surprised in the night. Your battalion counterattacks from the south along the N13. Take the southern exit, push to the church square and drive the enemy out of town.',
      },
      spawn: 'southRoad',
      objectives: [
        { type: 'reach', anchor: 'roadS', r: 30, text: { de: 'Südausgang an der N13 erreichen', en: 'Reach the southern exit on the N13' } },
        { type: 'clear', anchor: 'square', r: 60, left: 1, text: { de: 'Kirchplatz zurückerobern', en: 'Retake the church square' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'westEdge', n: 8, order: 'attack', target: 'square', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'rifle', 'officer'] },
        { anchor: 'northRoad', n: 5, order: 'attack', target: 'church', wave: 60, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle'] },
        { anchor: 'roadS', n: 4, order: 'hold', wave: 200, roles: ['at', 'rifle', 'mg', 'rifle'] },
      ],
      de: [
        { anchor: 'square', n: 6, order: 'hold', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'officer'] },
        { anchor: 'church', n: 1, order: 'static', roles: ['sniper'], tower: true },
        { anchor: 'townhall', n: 3, order: 'hold', roles: ['rifle', 'smg', 'rifle'] },
        { anchor: 'southRoad', n: 7, order: 'attack', target: 'roadS', wave: 200, roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'officer'] },
        { anchor: 'southRoad', n: 6, order: 'attack', target: 'square', wave: 330, tank: 'stug', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle'] },
      ],
    },
    ambient: { flak: false, planes: 'c47', arty: 0.35, flares: true, sniper: 1, mortars: true },
    events: [
      { t: 5, from: { de: 'Oberstleutnant Krause*', en: 'Lt. Col. Krause*' }, side: 'us', text: { de: 'Wir nehmen die Stadt vor Sonnenaufgang. Keine Schüsse, solange es geht – Messer und Bajonett.', en: 'We take the town before sunrise. No shooting as long as possible – knives and bayonets.' } },
      { t: 6, from: { de: 'Regiment', en: 'Regiment' }, side: 'de', text: { de: 'Sainte-Mère-Église ist in Feindeshand. Bataillon greift von Süden an, Sturmgeschütze folgen.', en: 'Sainte-Mère-Église is in enemy hands. Battalion attacks from the south, assault guns will follow.' } },
      { t: 200, from: { de: 'Spähtrupp', en: 'Scouts' }, side: 'us', text: { de: 'Deutsche Infanterie kommt die N13 hoch, Sturmgeschütze dahinter!', en: 'German infantry coming up the N13, assault guns behind them!' } },
    ],
  },

  // ------------------------------------------------------------------ 3
  {
    id: 'omaha', map: 'omaha', date: { de: '6. Juni 1944', en: '6 June 1944' }, time: '06:36', tod: 6.6, weather: 'overcast_wind',
    title: { de: 'Omaha Beach – Dog Green', en: 'Omaha Beach – Dog Green' },
    place: { de: 'Omaha Beach, Abschnitt Dog Green vor Vierville-sur-Mer', en: 'Omaha Beach, Dog Green sector off Vierville-sur-Mer' },
    history: {
      de: 'Um 06:30 Uhr landet die erste Welle der 29. und 1. US-Infanteriedivision am Omaha Beach. Starker Seegang, zu kurzes Bombardement und die unentdeckte 352. Infanterie-Division machen den Strand zum blutigsten Abschnitt des D-Day. Die Kompanie A des 116. Regiments verliert in Minuten den Großteil ihrer Männer. Erst gegen Mittag gelingt der Durchbruch über die Steilhänge.',
      en: 'At 06:30 the first wave of the US 29th and 1st Infantry Divisions lands on Omaha Beach. Heavy seas, a bombardment that falls short and the undetected 352nd Infantry Division turn the beach into the bloodiest sector of D-Day. Company A of the 116th Regiment loses most of its men within minutes. Only around noon do troops break through over the bluffs.',
    },
    us: {
      unit: { de: 'Kompanie A, 116. Infanterieregiment, 29. Infanteriedivision', en: 'Company A, 116th Infantry Regiment, 29th Infantry Division' },
      briefing: {
        de: 'Ihr Landungsboot (LCVP) setzt Sie vor dem Ausgang D-1 ab. Durchqueren Sie die Strandhindernisse bis zur Kieselbank, sprengen Sie mit dem Bangalore-Torpedo eine Gasse in den Stacheldraht, ersteigen Sie den Steilhang und schalten Sie das Widerstandsnest auf der Höhe aus. Bleiben Sie nicht stehen – am Strand ist man ein Ziel.',
        en: 'Your landing craft (LCVP) puts you ashore in front of exit D-1. Cross the beach obstacles to the shingle, blow a gap in the wire with the Bangalore torpedo, climb the bluff and knock out the strongpoint on the heights. Do not stop – on the beach you are a target.',
      },
      spawn: 'boats',
      objectives: [
        { type: 'reach', anchor: 'shingle', r: 40, text: { de: 'Kieselbank erreichen', en: 'Reach the shingle' } },
        { type: 'destroy', targets: ['wire1'], text: { de: 'Stacheldraht mit Bangalore sprengen (E)', en: 'Blow the wire with the Bangalore (E)' } },
        { type: 'reach', anchor: 'bluff', r: 25, text: { de: 'Den Steilhang ersteigen', en: 'Climb the bluff' } },
        { type: 'destroy', targets: ['wn1', 'wn2'], text: { de: 'Bunker des Widerstandsnests ausschalten', en: 'Knock out the strongpoint bunkers' } },
      ],
    },
    de: {
      unit: { de: 'Grenadier-Regiment 916, 352. Infanterie-Division', en: 'Grenadier Regiment 916, 352nd Infantry Division' },
      briefing: {
        de: 'Seit Mitternacht herrscht Alarm. Im Morgengrauen liegt die Invasionsflotte vor der Küste. Ihre Gruppe besetzt die Stellungen des Widerstandsnestes oberhalb von Vierville. Halten Sie die Bunker und Gräben, solange es geht – die Verstärkung steckt im Hinterland fest.',
        en: 'The alarm has been on since midnight. At dawn the invasion fleet lies off the coast. Your squad mans the positions of the strongpoint above Vierville. Hold the bunkers and trenches as long as possible – reinforcements are stuck inland.',
      },
      spawn: 'trench',
      objectives: [
        { type: 'defend', anchor: 'bluff', r: 60, time: 480, text: { de: 'Widerstandsnest halten', en: 'Hold the strongpoint' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'boat', n: 28, order: 'attack', target: 'bluff', roles: ['rifle', 'rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'rifle', 'officer', 'rifle', 'smg', 'rifle', 'rifle', 'mg', 'rifle', 'rifle', 'smg', 'rifle', 'at', 'rifle', 'rifle', 'rifle', 'mg', 'rifle', 'smg', 'rifle', 'rifle', 'officer'], landing: true },
        { anchor: 'boat', n: 12, order: 'attack', target: 'wn2', wave: 180, landing: true, roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'rifle', 'at', 'rifle', 'smg', 'rifle', 'rifle', 'officer'] },
        { anchor: 'boat', n: 6, order: 'attack', target: 'bluff', wave: 320, landing: true, tank: 'sherman', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'rifle'] },
      ],
      de: [
        { anchor: 'wn1', n: 2, order: 'static', roles: ['mg', 'rifle'], bunker: true },
        { anchor: 'wn2', n: 2, order: 'static', roles: ['mg', 'rifle'], bunker: true },
        { anchor: 'wn3', n: 2, order: 'static', roles: ['mg', 'rifle'], bunker: true },
        { anchor: 'trench', n: 8, order: 'hold', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'rifle', 'officer', 'sniper'] },
        { anchor: 'village', n: 6, order: 'attack', target: 'bluff', wave: 300, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'at'] },
      ],
    },
    ambient: { naval: true, planes: 'p47', arty: 0.9, mortars: true, sniper: 1, surf: true },
    events: [
      { t: 2, from: { de: 'Bootsführer', en: 'Coxswain' }, side: 'us', text: { de: 'Dreißig Sekunden! Gott sei mit euch!', en: 'Thirty seconds! God be with you!' } },
      { t: 9, from: { de: 'Sergeant Novak', en: 'Sgt. Novak' }, side: 'us', text: { de: 'Klappe runter! Raus aus dem Boot, zur Kieselbank, nicht stehen bleiben!', en: 'Ramp down! Out of the boat, to the shingle, keep moving!' } },
      { t: 3, from: { de: 'Beobachter', en: 'Observer' }, side: 'de', text: { de: 'Landungsboote! Entfernung achthundert. Feuer erst auf Befehl!', en: 'Landing craft! Range eight hundred. Hold fire until ordered!' } },
      { t: 14, from: { de: 'Unteroffizier Brandt', en: 'Cpl. Brandt' }, side: 'de', text: { de: 'Feuer frei!', en: 'Open fire!' } },
      { t: 70, from: { de: 'Schlachtschiff Texas', en: 'USS Texas' }, side: 'us', text: { de: 'Feuer auf die Höhe hinter dem Strand. Schuss!', en: 'Firing on the heights behind the beach. Shot out!' } },
      { t: 320, from: { de: 'Strandmeister', en: 'Beachmaster' }, side: 'us', text: { de: 'Shermans landen bei Dog White. Panzerunterstützung kommt!', en: 'Shermans landing at Dog White. Armor support coming!' } },
    ],
  },

  // ------------------------------------------------------------------ 4
  {
    id: 'pointe', map: 'pointe', date: { de: '6. Juni 1944', en: '6 June 1944' }, time: '07:10', tod: 7.2, weather: 'overcast',
    title: { de: 'Pointe du Hoc', en: 'Pointe du Hoc' },
    place: { de: 'Pointe du Hoc, zwischen Omaha und Utah', en: 'Pointe du Hoc, between Omaha and Utah' },
    history: {
      de: 'Drei Kompanien des 2. Ranger-Bataillons erklettern um 07:10 Uhr mit Raketenseilen und Strickleitern die 30 Meter hohen Klippen. Die Kasematten sind leer: Die 155-mm-Geschütze wurden ins Hinterland verlegt. Eine Patrouille findet sie in einem Obsthain und zerstört sie mit Thermitgranaten. Danach halten die Ranger zwei Tage lang gegen Gegenangriffe aus.',
      en: 'At 07:10 three companies of the 2nd Ranger Battalion scale the 30 m cliffs with rocket-fired ropes and ladders. The casemates are empty: the 155 mm guns have been moved inland. A patrol finds them in an orchard and destroys them with thermite grenades. The Rangers then hold for two days against counterattacks.',
    },
    us: {
      unit: { de: 'Kompanie D, 2. Ranger-Bataillon', en: 'Dog Company, 2nd Ranger Battalion' },
      briefing: {
        de: 'Ihr Landungsboot erreicht den Fuß der Klippe. Ersteigen Sie die Steilwand an den Seilen (E), durchkämmen Sie die Kasematten, finden Sie die verlegten Geschütze im Hinterland und zerstören Sie sie. Halten Sie anschließend die Straße gegen den Gegenangriff.',
        en: 'Your landing craft reaches the foot of the cliff. Climb the wall on the ropes (E), sweep the casemates, find the relocated guns inland and destroy them. Then hold the road against the counterattack.',
      },
      spawn: 'cliffBase',
      objectives: [
        { type: 'reach', anchor: 'plateau', r: 40, text: { de: 'Die Klippe ersteigen (an den Seilen: E)', en: 'Scale the cliff (on the ropes: E)' } },
        { type: 'clear', anchor: 'plateau', r: 90, left: 2, text: { de: 'Kasematten durchkämmen', en: 'Sweep the casemates' } },
        { type: 'destroy', targets: ['gun1', 'gun2', 'gun3'], text: { de: 'Verlegte Geschütze im Obsthain zerstören', en: 'Destroy the relocated guns in the orchard' } },
        { type: 'defend', anchor: 'road', r: 50, time: 240, text: { de: 'Küstenstraße halten', en: 'Hold the coastal road' } },
      ],
    },
    de: {
      unit: { de: 'Grenadier-Regiment 914, 352. Infanterie-Division', en: 'Grenadier Regiment 914, 352nd Infantry Division' },
      briefing: {
        de: 'Feindliche Sturmtruppen haben die Klippen an der Pointe du Hoc erstiegen. Ihre Kompanie tritt aus Saint-Pierre-du-Mont zum Gegenangriff an. Schützen Sie die Geschütze im Obsthain und werfen Sie den Gegner zurück an die Steilküste.',
        en: 'Enemy assault troops have scaled the cliffs at Pointe du Hoc. Your company counterattacks from Saint-Pierre-du-Mont. Protect the guns in the orchard and throw the enemy back to the cliffs.',
      },
      spawn: 'orchard',
      objectives: [
        { type: 'defend', anchor: 'orchard', r: 40, time: 300, text: { de: 'Geschützstellung im Obsthain sichern', en: 'Secure the gun position in the orchard' } },
        { type: 'clear', anchor: 'road', r: 60, left: 1, text: { de: 'Küstenstraße zurückerobern', en: 'Retake the coastal road' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'cliffBase', n: 10, order: 'attack', target: 'plateau', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'rifle', 'officer', 'smg', 'rifle', 'at'], climb: true },
        { anchor: 'cliffBase', n: 6, order: 'attack', target: 'road', wave: 120, climb: true, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle'] },
      ],
      de: [
        { anchor: 'casemate', n: 5, order: 'hold', roles: ['rifle', 'mg', 'rifle', 'smg', 'rifle'] },
        { anchor: 'flakpos', n: 2, order: 'static', roles: ['mg', 'rifle'], bunker: true },
        { anchor: 'orchard', n: 3, order: 'hold', roles: ['rifle', 'rifle', 'smg'] },
        { anchor: 'inland', n: 8, order: 'attack', target: 'road', wave: 240, roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'rifle', 'officer', 'at'] },
        { anchor: 'inland', n: 8, order: 'attack', target: 'plateau', wave: 420, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle', 'smg', 'rifle'] },
      ],
    },
    ambient: { naval: true, planes: 'p47', arty: 0.6, mortars: true, sniper: 1, surf: true },
    events: [
      { t: 4, from: { de: 'Oberst Rudd*', en: 'Col. Rudd*' }, side: 'us', text: { de: 'Raketen feuern die Seile hoch. Hinauf, Rangers – Rangers vorweg!', en: 'Rockets are firing the ropes up. Up you go – Rangers lead the way!' } },
      { t: 5, from: { de: 'Kompaniechef', en: 'Company CO' }, side: 'de', text: { de: 'Der Feind ist an der Pointe gelandet. Sofort Gegenangriff, die Geschütze dürfen nicht verloren gehen!', en: 'The enemy has landed at the Pointe. Counterattack at once, we must not lose the guns!' } },
      { t: 160, from: { de: 'Feldwebel Lomb*', en: 'Sgt. Lomb*' }, side: 'us', text: { de: 'Spuren im Schlamm, Richtung Süden. Die Geschütze sind ins Hinterland gezogen worden!', en: 'Tracks in the mud, heading south. They moved the guns inland!' } },
    ],
  },

  // ------------------------------------------------------------------ 5
  {
    id: 'brecourt', map: 'brecourt', date: { de: '6. Juni 1944', en: '6 June 1944' }, time: '08:30', tod: 8.5, weather: 'clear_morning',
    title: { de: 'Brécourt Manor', en: 'Brécourt Manor' },
    place: { de: 'Gut Brécourt bei Le Grand Chemin', en: 'Brécourt Manor near Le Grand Chemin' },
    history: {
      de: 'Eine Batterie von 10,5-cm-Haubitzen beschießt vom Gut Brécourt aus den Damm von Utah Beach. Ein Leutnant der Easy Company greift mit nur einer Handvoll Männern die durch Gräben verbundenen Geschütze an – der Angriff gilt bis heute als Lehrbeispiel für den Angriff auf eine befestigte Stellung.',
      en: 'A battery of 105 mm howitzers at Brécourt Manor shells the causeway from Utah Beach. A lieutenant of Easy Company attacks the trench-linked guns with only a handful of men – the assault is still taught as a textbook example of attacking a fixed position.',
    },
    us: {
      unit: { de: 'Easy Company, 2. Bataillon, 506. Fallschirmjäger-Regiment', en: 'Easy Company, 2nd Battalion, 506th PIR' },
      briefing: {
        de: 'Vier Geschütze stehen in einem Graben entlang einer Hecke und feuern auf den Strandausgang. Unterdrücken Sie die MG-Stellungen mit Feuer, arbeiten Sie sich durch den Graben vor und sprengen Sie jedes Geschütz mit TNT (E). Beeilen Sie sich – jede Salve trifft die Männer am Strand.',
        en: 'Four guns stand in a trench along a hedgerow, firing on the beach exit. Suppress the MG positions, work your way along the trench and blow each gun with TNT (E). Hurry – every salvo hits the men on the beach.',
      },
      spawn: 'start',
      objectives: [
        { type: 'destroy', targets: ['gun1', 'gun2', 'gun3', 'gun4'], text: { de: 'Alle vier Geschütze sprengen', en: 'Blow all four guns' } },
        { type: 'reach', anchor: 'start', r: 20, text: { de: 'Zurück zur Ausgangsstellung', en: 'Fall back to the start position' } },
      ],
    },
    de: {
      unit: { de: 'Artillerie-Regiment 191, 91. Luftlande-Infanterie-Division', en: 'Artillery Regiment 191, 91st Air Landing Division' },
      briefing: {
        de: 'Ihre Batterie beschießt die Landungstruppen am Damm von Utah Beach. Sichern Sie die Geschützstellung entlang der Hecke gegen feindliche Fallschirmjäger, bis die Batterie ihren Feuerauftrag erfüllt hat.',
        en: 'Your battery is shelling the landing troops on the Utah Beach causeway. Secure the gun line along the hedgerow against enemy paratroopers until the battery has completed its fire mission.',
      },
      spawn: 'manor',
      objectives: [
        { type: 'defend', anchor: 'trench', r: 70, time: 360, text: { de: 'Geschützstellung halten', en: 'Hold the gun line' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'start', n: 6, order: 'follow', roles: ['rifle', 'smg', 'mg', 'rifle', 'smg', 'rifle'] },
        { anchor: 'start', n: 4, order: 'attack', target: 'trench', wave: 200, roles: ['rifle', 'smg', 'rifle', 'mg'] },
      ],
      de: [
        { anchor: 'mg1', n: 2, order: 'static', roles: ['mg', 'rifle'] },
        { anchor: 'mg2', n: 2, order: 'static', roles: ['mg', 'rifle'] },
        { anchor: 'trench', n: 10, order: 'hold', roles: ['rifle', 'rifle', 'smg', 'rifle', 'rifle', 'smg', 'rifle', 'officer', 'rifle', 'rifle'] },
        { anchor: 'manor', n: 6, order: 'attack', target: 'trench', wave: 150, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle'] },
      ],
    },
    ambient: { planes: 'p47', arty: 0.4, battery: true, sniper: 0 },
    events: [
      { t: 4, from: { de: 'Leutnant Winn*', en: 'Lt. Winn*' }, side: 'us', text: { de: 'MGs zuerst unterdrücken. Dann den Graben entlang, Geschütz für Geschütz.', en: 'Suppress the MGs first. Then down the trench, gun by gun.' } },
      { t: 4, from: { de: 'Batteriechef', en: 'Battery CO' }, side: 'de', text: { de: 'Feuer auf den Damm halten! Infanterie sichert nach Westen.', en: 'Keep firing on the causeway! Infantry, cover the west.' } },
    ],
  },

  // ------------------------------------------------------------------ 6
  {
    id: 'lafiere', map: 'lafiere', date: { de: '6.–9. Juni 1944', en: '6–9 June 1944' }, time: '16:00', tod: 16, weather: 'overcast',
    title: { de: 'Der Damm von La Fière', en: 'The La Fière Causeway' },
    place: { de: 'Brücke über den Merderet bei La Fière', en: 'Bridge over the Merderet at La Fière' },
    history: {
      de: 'Die Deutschen haben das Merderet-Tal geflutet; ein einziger Damm führt über die Sümpfe. Fallschirmjäger der 82. Luftlandedivision verteidigen die Brücke am Gutshof La Fière drei Tage lang gegen Infanterie und Beutepanzer – mit Panzerfäusten (Bazookas) und einer einzelnen 57-mm-Pak.',
      en: 'The Germans have flooded the Merderet valley; a single causeway crosses the marshes. Paratroopers of the 82nd Airborne defend the bridge at La Fière manor for three days against infantry and captured French tanks – with bazookas and a single 57 mm anti-tank gun.',
    },
    us: {
      unit: { de: '1. Bataillon, 505. Fallschirmjäger-Regiment', en: '1st Battalion, 505th PIR' },
      briefing: {
        de: 'Halten Sie das Ostende des Damms. Feindliche Panzer und Infanterie greifen von Cauquigny über den Damm an. Nehmen Sie eine Bazooka (Klasse Panzerabwehr) und stoppen Sie die Panzer auf dem Damm – der Gutshof darf nicht fallen.',
        en: 'Hold the eastern end of the causeway. Enemy tanks and infantry will attack across it from Cauquigny. Grab a bazooka (anti-tank class) and stop the tanks on the causeway – the manor must not fall.',
      },
      spawn: 'manor',
      objectives: [
        { type: 'defend', anchor: 'bridge', r: 45, time: 420, text: { de: 'Brücke und Gutshof halten', en: 'Hold the bridge and the manor' } },
        { type: 'destroy', targets: ['tank1', 'tank2', 'tank3'], text: { de: 'Angreifende Panzer zerstören', en: 'Destroy the attacking tanks' } },
      ],
    },
    de: {
      unit: { de: 'Panzer-Ersatz-Abteilung 100 und Grenadier-Regiment 1057', en: 'Panzer Replacement Battalion 100 and Grenadier Regiment 1057' },
      briefing: {
        de: 'Mit Beutepanzern und Infanterie greifen Sie von Cauquigny über den Damm an. Brechen Sie über die Brücke durch und nehmen Sie den Gutshof La Fière.',
        en: 'With captured tanks and infantry you attack across the causeway from Cauquigny. Break through over the bridge and take La Fière manor.',
      },
      spawn: 'cauquigny',
      objectives: [
        { type: 'reach', anchor: 'bridge', r: 25, text: { de: 'Über den Damm zur Brücke vorstoßen', en: 'Push across the causeway to the bridge' } },
        { type: 'clear', anchor: 'manor', r: 50, left: 1, text: { de: 'Gutshof La Fière nehmen', en: 'Take La Fière manor' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'manor', n: 6, order: 'hold', roles: ['rifle', 'mg', 'rifle', 'smg', 'rifle', 'officer'] },
        { anchor: 'bridgeE', n: 5, order: 'hold', roles: ['at', 'rifle', 'mg', 'at', 'rifle'] },
        { anchor: 'manor', n: 4, order: 'hold', wave: 220, roles: ['rifle', 'smg', 'rifle', 'at'] },
      ],
      de: [
        { anchor: 'cauquigny', n: 8, order: 'attack', target: 'bridge', wave: 30, tank: 'h39', tankId: 'tank1', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'rifle', 'officer', 'smg'] },
        { anchor: 'cauquigny', n: 8, order: 'attack', target: 'bridge', wave: 160, tank: 'h39', tankId: 'tank2', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle', 'at', 'rifle'] },
        { anchor: 'cauquigny', n: 8, order: 'attack', target: 'manor', wave: 300, tank: 'h39', tankId: 'tank3', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle', 'smg', 'officer'] },
        { anchor: 'westBank', n: 2, order: 'static', roles: ['sniper', 'mg'] },
      ],
    },
    ambient: { arty: 0.7, mortars: true, sniper: 1, nebelwerfer: true },
    events: [
      { t: 5, from: { de: 'Hauptmann Dolan*', en: 'Capt. Dolan*' }, side: 'us', text: { de: 'Ich höre Ketten auf der anderen Seite. Bazookas nach vorn an die Brücke!', en: 'I hear tracks on the far side. Bazookas forward to the bridge!' } },
      { t: 5, from: { de: 'Abteilung', en: 'Battalion' }, side: 'de', text: { de: 'Panzer marsch! Infanterie folgt dicht hinter den Panzern über den Damm.', en: 'Tanks, advance! Infantry follow close behind across the causeway.' } },
    ],
  },

  // ------------------------------------------------------------------ 7
  {
    id: 'carentan', map: 'carentan', date: { de: '12. Juni 1944', en: '12 June 1944' }, time: '06:00', tod: 6.1, weather: 'rain',
    title: { de: 'Carentan', en: 'Carentan' },
    place: { de: 'Carentan, Verbindung zwischen Utah und Omaha', en: 'Carentan, link between Utah and Omaha' },
    history: {
      de: 'Carentan verbindet die Brückenköpfe Utah und Omaha. Nach dem blutigen Vorstoß über den Damm („Purple Heart Lane“) nimmt die 101. Luftlandedivision am 12. Juni die Stadt. Verteidigt wird sie vom Fallschirmjäger-Regiment 6, das sich in der Nacht teilweise zurückzieht.',
      en: 'Carentan links the Utah and Omaha beachheads. After the bloody advance over the causeway ("Purple Heart Lane") the 101st Airborne takes the town on 12 June. It is defended by Fallschirmjäger Regiment 6, which partly withdraws during the night.',
    },
    us: {
      unit: { de: '2. Bataillon, 506. Fallschirmjäger-Regiment', en: '2nd Battalion, 506th PIR' },
      briefing: {
        de: 'Im Morgengrauen greift Ihr Bataillon von Nordosten an. Ein MG an der Straßengabelung beherrscht den Zugang. Schalten Sie es aus, säubern Sie die Häuser bis zum Marktplatz und nehmen Sie den Bahnhof.',
        en: 'At dawn your battalion attacks from the north-east. An MG at the road fork dominates the approach. Knock it out, clear the houses up to the market square and take the railway station.',
      },
      spawn: 'entry',
      objectives: [
        { type: 'destroy', targets: ['mgnest'], text: { de: 'MG-Nest an der Straßengabelung ausschalten', en: 'Knock out the MG nest at the road fork' } },
        { type: 'clear', anchor: 'square', r: 55, left: 1, text: { de: 'Marktplatz säubern', en: 'Clear the market square' } },
        { type: 'clear', anchor: 'station', r: 45, left: 0, text: { de: 'Bahnhof nehmen', en: 'Take the railway station' } },
      ],
    },
    de: {
      unit: { de: 'Fallschirmjäger-Regiment 6', en: 'Fallschirmjäger Regiment 6' },
      briefing: {
        de: 'Ihr Regiment verteidigt Carentan gegen die amerikanischen Fallschirmjäger. Die Munition wird knapp. Halten Sie den Marktplatz, bis die Nachhut sich über den Bahnhof abgesetzt hat.',
        en: 'Your regiment defends Carentan against the American paratroopers. Ammunition is running low. Hold the market square until the rearguard has withdrawn through the station.',
      },
      spawn: 'square',
      objectives: [
        { type: 'defend', anchor: 'square', r: 55, time: 360, text: { de: 'Marktplatz halten', en: 'Hold the market square' } },
        { type: 'reach', anchor: 'station', r: 25, text: { de: 'Über den Bahnhof absetzen', en: 'Withdraw through the station' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'entry', n: 8, order: 'attack', target: 'fork', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'officer', 'smg'] },
        { anchor: 'entry', n: 8, order: 'attack', target: 'square', wave: 90, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle', 'smg', 'rifle'] },
        { anchor: 'entry', n: 6, order: 'attack', target: 'station', wave: 260, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle'] },
      ],
      de: [
        { anchor: 'mgnest', n: 2, order: 'static', roles: ['mg', 'rifle'] },
        { anchor: 'square', n: 8, order: 'hold', roles: ['rifle', 'assault', 'rifle', 'mg', 'assault', 'rifle', 'officer', 'at'] },
        { anchor: 'church', n: 1, order: 'static', roles: ['sniper'], tower: true },
        { anchor: 'station', n: 5, order: 'hold', roles: ['rifle', 'assault', 'mg', 'rifle', 'rifle'] },
      ],
    },
    ambient: { arty: 0.6, mortars: true, sniper: 1, planes: 'p47' },
    events: [
      { t: 4, from: { de: 'Oberstleutnant Strayer*', en: 'Lt. Col. Strayer*' }, side: 'us', text: { de: 'Vorwärts in die Stadt! Haus für Haus.', en: 'Into the town! House by house.' } },
      { t: 4, from: { de: 'Regimentsgefechtsstand', en: 'Regimental CP' }, side: 'de', text: { de: 'Munition ist knapp. Jeder Schuss muss sitzen. Marktplatz halten!', en: 'Ammunition is short. Make every shot count. Hold the square!' } },
    ],
  },

  // ------------------------------------------------------------------ 8
  {
    id: 'stlo', map: 'stlo', date: { de: '11.–18. Juli 1944', en: '11–18 July 1944' }, time: '05:30', tod: 5.6, weather: 'fog',
    title: { de: 'Heckenkrieg – Höhe 192', en: 'Hedgerow Hell – Hill 192' },
    place: { de: 'Höhe 192 vor Saint-Lô', en: 'Hill 192 outside Saint-Lô' },
    history: {
      de: 'Fünf Wochen lang kämpfen sich die Amerikaner durch die Bocage – mannshohe Wallhecken, in denen jedes Feld eine Festung ist. Am 11. Juli stürmt die 2. Infanteriedivision im Nebel die Höhe 192, den wichtigsten Beobachtungspunkt vor Saint-Lô, verteidigt vom II. Fallschirmkorps. Am 18. Juli fällt die zerstörte Stadt.',
      en: 'For five weeks the Americans fight through the bocage – head-high earthen hedgerows that turn every field into a fortress. On 11 July the 2nd Infantry Division storms Hill 192 in the fog, the key observation point before Saint-Lô, defended by the II Parachute Corps. On 18 July the ruined town falls.',
    },
    us: {
      unit: { de: '38. Infanterieregiment, 2. Infanteriedivision', en: '38th Infantry Regiment, 2nd Infantry Division' },
      briefing: {
        de: 'Nach dem Feuerschlag der Artillerie greift Ihr Zug im Nebel an. Kämpfen Sie sich Hecke um Hecke den Hang hinauf, schalten Sie das Pak-Geschütz am Hohlweg aus und nehmen Sie den Gipfel der Höhe 192.',
        en: 'After the artillery barrage your platoon attacks in the fog. Fight your way up the slope hedgerow by hedgerow, knock out the anti-tank gun at the sunken lane and take the summit of Hill 192.',
      },
      spawn: 'start',
      objectives: [
        { type: 'destroy', targets: ['pak'], text: { de: 'Pak am Hohlweg ausschalten', en: 'Knock out the AT gun at the sunken lane' } },
        { type: 'reach', anchor: 'hill', r: 30, text: { de: 'Gipfel der Höhe 192 erreichen', en: 'Reach the summit of Hill 192' } },
        { type: 'defend', anchor: 'hill', r: 45, time: 240, text: { de: 'Gipfel gegen Gegenstoß halten', en: 'Hold the summit against the counterattack' } },
      ],
    },
    de: {
      unit: { de: 'Fallschirmjäger-Regiment 9, 3. Fallschirmjäger-Division', en: 'Fallschirmjäger Regiment 9, 3rd Parachute Division' },
      briefing: {
        de: 'Die Höhe 192 ist der Schlüssel zu Saint-Lô. Ihre Kompanie verteidigt die Hecken am Hang. Halten Sie die Höhe und führen Sie danach einen Gegenstoß über den Hohlweg.',
        en: 'Hill 192 is the key to Saint-Lô. Your company defends the hedgerows on the slope. Hold the hill, then lead a counterthrust over the sunken lane.',
      },
      spawn: 'hill',
      objectives: [
        { type: 'defend', anchor: 'hill', r: 60, time: 420, text: { de: 'Höhe 192 halten', en: 'Hold Hill 192' } },
        { type: 'kill', n: 15, text: { de: 'Gegenstoß: Angreifer zurückwerfen', en: 'Counterthrust: drive back the attackers' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'start', n: 8, order: 'attack', target: 'lane', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'officer', 'rifle'] },
        { anchor: 'start2', n: 8, order: 'attack', target: 'hill', wave: 60, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle', 'smg', 'rifle'] },
        { anchor: 'start', n: 6, order: 'attack', target: 'hill', wave: 220, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle'] },
      ],
      de: [
        { anchor: 'pak', n: 3, order: 'static', roles: ['rifle', 'rifle', 'mg'] },
        { anchor: 'hedge1', n: 5, order: 'hold', roles: ['rifle', 'mg', 'assault', 'rifle', 'rifle'] },
        { anchor: 'hedge2', n: 5, order: 'hold', roles: ['rifle', 'mg', 'assault', 'sniper', 'rifle'] },
        { anchor: 'hill', n: 6, order: 'hold', roles: ['rifle', 'mg', 'assault', 'rifle', 'officer', 'at'] },
        { anchor: 'ruins', n: 8, order: 'attack', target: 'hill', wave: 300, roles: ['rifle', 'assault', 'rifle', 'mg', 'rifle', 'rifle', 'assault', 'at'] },
      ],
    },
    ambient: { arty: 0.8, mortars: true, sniper: 1, nebelwerfer: true, planes: 'p47' },
    events: [
      { t: 3, from: { de: 'Feuerleitstelle', en: 'Fire direction' }, side: 'us', text: { de: 'Feuerschlag auf Höhe 192 – letzte Salve. Infanterie, vorwärts!', en: 'Barrage on Hill 192 – last salvo. Infantry, move out!' } },
      { t: 3, from: { de: 'Kompanieführer', en: 'Company leader' }, side: 'de', text: { de: 'Aus den Deckungslöchern! Sie kommen durch den Nebel.', en: 'Out of the foxholes! They are coming through the fog.' } },
    ],
  },
];

// Kampagnenreihenfolge je Seite (historisch, aus Sicht der jeweiligen Seite)
export const CAMPAIGN = {
  us: ['drop', 'stmere', 'omaha', 'pointe', 'brecourt', 'lafiere', 'carentan', 'stlo'],
  de: ['drop', 'omaha', 'pointe', 'brecourt', 'stmere', 'lafiere', 'carentan', 'stlo'],
};

// Zwischentexte der Kampagne (nach erfolgreicher Mission)
export const EPILOGUE = {
  us: {
    drop: { de: 'Bis zum Morgen sammeln sich die Fallschirmjäger in kleinen, gemischten Gruppen. Die Verwirrung im deutschen Hinterland ist groß.', en: 'By morning the paratroopers gather in small mixed groups. Confusion in the German rear is immense.' },
    stmere: { de: 'Sainte-Mère-Église hält. Die N13 nach Cherbourg ist gesperrt.', en: 'Sainte-Mère-Église holds. Route N13 to Cherbourg is blocked.' },
    omaha: { de: 'Gegen Mittag sind die Steilhänge erstiegen. Der Preis: rund 2.400 Gefallene, Verwundete und Vermisste am Omaha Beach.', en: 'By noon the bluffs are taken. The price: about 2,400 killed, wounded and missing on Omaha Beach.' },
    pointe: { de: 'Von 225 Rangern sind nach zwei Tagen noch 90 kampffähig. Die Geschütze haben nie auf die Strände gefeuert.', en: 'Of 225 Rangers only 90 are still fit to fight after two days. The guns never fired on the beaches.' },
    brecourt: { de: 'Die Batterie schweigt. Der Weg von Utah Beach ins Hinterland ist frei.', en: 'The battery is silent. The way inland from Utah Beach is open.' },
    lafiere: { de: 'Am 9. Juni stürmt die 325. Gleitschirm-Infanterie über den Damm. Der Brückenkopf am Merderet ist gesichert.', en: 'On 9 June the 325th Glider Infantry storms across the causeway. The Merderet bridgehead is secure.' },
    carentan: { de: 'Mit Carentan sind die Brückenköpfe Utah und Omaha verbunden.', en: 'With Carentan taken, the Utah and Omaha beachheads are linked.' },
    stlo: { de: 'Am 18. Juli fällt Saint-Lô. Eine Woche später beginnt mit Operation Cobra der Ausbruch aus der Normandie.', en: 'Saint-Lô falls on 18 July. A week later Operation Cobra begins the breakout from Normandy.' },
  },
  de: {
    drop: { de: 'Die Lage bleibt bis zum Morgen unklar. Überall im Hinterland wird gekämpft.', en: 'The situation stays unclear until morning. Fighting is going on all over the rear area.' },
    omaha: { de: 'Das Widerstandsnest hält stundenlang. Am Nachmittag sind die Stellungen umgangen und die Munition ist verschossen.', en: 'The strongpoint holds for hours. By afternoon the positions are outflanked and the ammunition is spent.' },
    pointe: { de: 'Die Ranger halten sich an der Steilküste. Der Gegenangriff bleibt liegen.', en: 'The Rangers cling to the cliff top. The counterattack stalls.' },
    brecourt: { de: 'Die Batterie wird dennoch überrannt – der Damm von Utah Beach liegt nicht mehr unter Feuer.', en: 'The battery is overrun all the same – the Utah causeway is no longer under fire.' },
    stmere: { de: 'Der Gegenangriff auf Sainte-Mère-Église bleibt im Feuer der Fallschirmjäger liegen.', en: 'The counterattack on Sainte-Mère-Église stalls in the paratroopers\' fire.' },
    lafiere: { de: 'Der Damm ist mit ausgebrannten Panzern blockiert. Die Brücke bleibt in Feindeshand.', en: 'The causeway is blocked by burnt-out tanks. The bridge stays in enemy hands.' },
    carentan: { de: 'Das Regiment setzt sich nach Südwesten ab. Carentan fällt am 12. Juni.', en: 'The regiment withdraws to the south-west. Carentan falls on 12 June.' },
    stlo: { de: 'Nach Wochen im Heckenkrieg ist die Front ausgeblutet. Am 25. Juli bricht sie unter Operation Cobra zusammen.', en: 'After weeks of hedgerow fighting the front is bled white. On 25 July it collapses under Operation Cobra.' },
  },
};

export const opById = (id) => OPERATIONS.find((o) => o.id === id);
