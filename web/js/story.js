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

  // ------------------------------------------------------------------ Utah Beach
  {
    id: 'utah', map: 'utah', date: { de: '6. Juni 1944', en: '6 June 1944' }, time: '06:30', tod: 6.9, weather: 'clear_morning',
    title: { de: 'Utah Beach', en: 'Utah Beach' },
    place: { de: 'Utah Beach bei La Madeleine, Abschnitt Uncle Red', en: 'Utah Beach near La Madeleine, Uncle Red sector' },
    history: {
      de: 'Die Strömung trägt die ersten Landungsboote der 4. US-Infanteriedivision rund zwei Kilometer südlich am geplanten Abschnitt vorbei – an eine Stelle, die kaum verteidigt ist. Der stellvertretende Divisionskommandeur entscheidet: „Wir fangen den Krieg genau hier an!“ Mit knapp 200 Verlusten wird Utah zum erfolgreichsten Landeabschnitt des D-Day; über die Dämme durch das geflutete Hinterland stößt die Division zu den Fallschirmjägern vor.',
      en: 'The current carries the first landing craft of the US 4th Infantry Division about two kilometres south of the planned sector – to a spot that is barely defended. The assistant division commander decides: "We\'ll start the war from right here!" With fewer than 200 casualties Utah becomes the most successful landing of D-Day; across the causeways through the flooded hinterland the division pushes on to the paratroopers.',
    },
    us: {
      unit: { de: '8. Infanterieregiment, 4. Infanteriedivision', en: '8th Infantry Regiment, 4th Infantry Division' },
      briefing: {
        de: 'Ihr Boot landet bei Tageslicht vor den Dünen von La Madeleine. Erreichen Sie die Ufermauer, schalten Sie die beiden Bunker des Widerstandsnests 5 aus und stoßen Sie über den Damm durch das geflutete Marschland bis zum Ausgang bei Pouppeville vor, wo die 101. Luftlandedivision wartet.',
        en: 'Your boat lands in daylight off the dunes of La Madeleine. Reach the seawall, knock out the two bunkers of strongpoint WN 5 and push across the causeway through the flooded marsh to the exit at Pouppeville, where the 101st Airborne is waiting.',
      },
      spawn: 'boats',
      objectives: [
        { type: 'reach', anchor: 'seawall', r: 40, text: { de: 'Ufermauer erreichen', en: 'Reach the seawall' } },
        { type: 'destroy', targets: ['wn5a', 'wn5b'], text: { de: 'Bunker des Widerstandsnests 5 ausschalten', en: 'Knock out the WN 5 bunkers' } },
        { type: 'reach', anchor: 'exit', r: 25, text: { de: 'Über den Damm zum Ausgang Pouppeville', en: 'Cross the causeway to the Pouppeville exit' } },
      ],
    },
    de: {
      unit: { de: 'Grenadier-Regiment 919, 709. Infanterie-Division', en: 'Grenadier Regiment 919, 709th Infantry Division' },
      briefing: {
        de: 'Nach dem Bombenangriff sind die Stellungen des Widerstandsnests 5 schwer beschädigt, die Hälfte der Geschütze ist ausgefallen. Halten Sie die Dünen so lange wie möglich – Verstärkung soll aus Sainte-Marie-du-Mont über den Damm kommen.',
        en: 'After the bombing the positions of strongpoint WN 5 are badly damaged, half the guns are out of action. Hold the dunes as long as possible – reinforcements are to come across the causeway from Sainte-Marie-du-Mont.',
      },
      spawn: 'dunes',
      objectives: [{ type: 'defend', anchor: 'dunes', r: 60, time: 360, text: { de: 'Dünen und Widerstandsnest 5 halten', en: 'Hold the dunes and strongpoint WN 5' } }],
    },
    forces: {
      us: [
        { anchor: 'boat', n: 20, order: 'attack', target: 'dunes', landing: true, roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'rifle', 'officer', 'rifle', 'smg', 'rifle', 'rifle', 'mg', 'rifle', 'smg', 'rifle', 'at', 'rifle', 'rifle', 'officer'] },
        { anchor: 'boat', n: 12, order: 'attack', target: 'causeway', wave: 70, landing: true, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle', 'at', 'rifle', 'smg', 'rifle', 'rifle', 'officer'] },
        { anchor: 'boat', n: 10, order: 'attack', target: 'exit', wave: 220, landing: true, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle', 'smg', 'rifle', 'at', 'rifle'] },
      ],
      de: [
        { anchor: 'wn5a', n: 2, order: 'static', roles: ['mg', 'rifle'], bunker: true },
        { anchor: 'wn5b', n: 2, order: 'static', roles: ['mg', 'rifle'], bunker: true },
        { anchor: 'dunes', n: 7, order: 'hold', roles: ['rifle', 'rifle', 'mg', 'smg', 'rifle', 'officer', 'rifle'] },
        { anchor: 'village', n: 7, order: 'attack', target: 'causeway', wave: 240, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'at', 'rifle'] },
      ],
    },
    ambient: { naval: true, planes: 'p47', arty: 0.4, mortars: true, sniper: 0, surf: true },
    events: [
      { t: 2, from: { de: 'Bootsführer', en: 'Coxswain' }, side: 'us', text: { de: 'Wir sind zu weit südlich – egal, Klappe runter!', en: 'We\'re too far south – never mind, ramp down!' } },
      { t: 12, from: { de: 'Brigadegeneral Roos*', en: 'Brig. Gen. Roos*' }, side: 'us', text: { de: 'Wir fangen den Krieg genau hier an! Alles über die Mauer!', en: 'We\'ll start the war from right here! Everybody over the wall!' } },
      { t: 3, from: { de: 'Leutnant Jah*', en: 'Lt. Jah*' }, side: 'de', text: { de: 'Landungsboote und schwimmende Panzer! Alles an die Waffen!', en: 'Landing craft and swimming tanks! Man the guns!' } },
      { t: 70, from: { de: 'Strandmeister', en: 'Beachmaster' }, side: 'us', text: { de: 'DD-Panzer sind an Land. Sie unterstützen den Vorstoß über den Damm.', en: 'DD tanks are ashore. They will support the push across the causeway.' } },
    ],
  },

  // ------------------------------------------------------------------ Operation Cobra
  {
    id: 'cobra', map: 'cobra', date: { de: '25.–26. Juli 1944', en: '25–26 July 1944' }, time: '11:00', tod: 11, weather: 'clear_morning',
    title: { de: 'Operation Cobra – Marigny', en: 'Operation Cobra – Marigny' },
    place: { de: 'Straße Saint-Lô–Périers, vor Marigny', en: 'Saint-Lô–Périers road, outside Marigny' },
    history: {
      de: 'Am Morgen des 25. Juli werfen rund 1.500 schwere Bomber einen Bombenteppich auf einen schmalen Streifen südlich der Straße Saint-Lô–Périers. Die Panzer-Lehr-Division wird schwer getroffen – ihr Kommandeur meldet, seine Front sehe „wie eine Mondlandschaft“ aus. Auch eigene Truppen werden von zu kurz fallenden Bomben getroffen. Um 11 Uhr greift die Infanterie an; am 26. Juli stoßen Panzer durch, Marigny fällt – der Ausbruch aus der Normandie beginnt.',
      en: 'On the morning of 25 July some 1,500 heavy bombers carpet-bomb a narrow strip south of the Saint-Lô–Périers road. The Panzer Lehr Division is hit hard – its commander reports his front looks "like the face of the moon". Bombs falling short also hit American troops. At 11:00 the infantry attacks; on 26 July armour breaks through and Marigny falls – the breakout from Normandy begins.',
    },
    us: {
      unit: { de: '18. Infanterieregiment, 1. Infanteriedivision', en: '18th Infantry Regiment, 1st Infantry Division' },
      briefing: {
        de: 'Der Bombenteppich ist gefallen, die Erde raucht noch. Überqueren Sie die Straße Saint-Lô–Périers, schalten Sie MG-Stellung und Pak aus, vernichten Sie die Panzer IV im Hinterland und nehmen Sie die Kreuzung von Marigny.',
        en: 'The carpet bombing is over, the ground is still smoking. Cross the Saint-Lô–Périers road, knock out the MG position and the AT gun, destroy the Panzer IVs in the rear and take the Marigny crossroads.',
      },
      spawn: 'start',
      objectives: [
        { type: 'reach', anchor: 'road', r: 30, text: { de: 'Straße Saint-Lô–Périers überqueren', en: 'Cross the Saint-Lô–Périers road' } },
        { type: 'destroy', targets: ['mgroad', 'pak1'], text: { de: 'MG-Stellung und Pak ausschalten', en: 'Knock out the MG and the AT gun' } },
        { type: 'destroy', targets: ['pz1', 'pz2'], text: { de: 'Panzer IV vernichten (Bazooka, Luftangriff)', en: 'Destroy the Panzer IVs (bazooka, air strike)' } },
        { type: 'clear', anchor: 'marigny', r: 60, left: 1, text: { de: 'Kreuzung von Marigny nehmen', en: 'Take the Marigny crossroads' } },
      ],
    },
    de: {
      unit: { de: 'Panzergrenadier-Lehr-Regiment 902, Panzer-Lehr-Division', en: 'Panzergrenadier Lehr Regiment 902, Panzer Lehr Division' },
      briefing: {
        de: 'Der Bombenteppich hat die Hauptkampflinie zerschlagen. Sammeln Sie die Reste der Kompanie hinter den Hecken, halten Sie die Linie südlich der Straße und danach Marigny, bis Verstärkung eintrifft.',
        en: 'The carpet bombing has shattered the main line of resistance. Gather what is left of the company behind the hedgerows, hold the line south of the road and then Marigny until reinforcements arrive.',
      },
      spawn: 'hedgeS',
      objectives: [
        { type: 'defend', anchor: 'hedgeS', r: 60, time: 300, text: { de: 'Heckenlinie südlich der Straße halten', en: 'Hold the hedgerow line south of the road' } },
        { type: 'defend', anchor: 'marigny', r: 60, time: 240, text: { de: 'Marigny halten', en: 'Hold Marigny' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'start', n: 8, order: 'attack', target: 'road', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'officer', 'rifle'] },
        { anchor: 'start2', n: 8, order: 'attack', target: 'hedgeS', wave: 50, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'at', 'smg', 'rifle'] },
        { anchor: 'start', n: 8, order: 'attack', target: 'marigny', wave: 220, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'rifle', 'at', 'rifle'] },
      ],
      de: [
        { anchor: 'mgroad', n: 2, order: 'static', roles: ['mg', 'rifle'] },
        { anchor: 'pak1', n: 3, order: 'static', roles: ['rifle', 'rifle', 'mg'] },
        { anchor: 'hedgeS', n: 6, order: 'hold', tank: 'pz4', tankId: 'pz1', roles: ['rifle', 'mg', 'assault', 'rifle', 'at', 'rifle'] },
        { anchor: 'marigny', n: 5, order: 'hold', roles: ['rifle', 'mg', 'rifle', 'officer', 'at'] },
        { anchor: 'deRear', n: 7, order: 'attack', target: 'hedgeS', wave: 200, tank: 'pz4', tankId: 'pz2', roles: ['rifle', 'assault', 'rifle', 'mg', 'rifle', 'at', 'rifle'] },
      ],
    },
    ambient: { planes: 'p47', arty: 0.8, mortars: true, sniper: 1, carpet: true },
    events: [
      { t: 2, from: { de: 'Bataillon', en: 'Battalion' }, side: 'us', text: { de: 'Die Bomber sind durch. Vorwärts, bevor sich der Gegner erholt!', en: 'The bombers are through. Move out before the enemy recovers!' } },
      { t: 2, from: { de: 'Kompanieführer', en: 'Company leader' }, side: 'de', text: { de: 'Wer noch lebt, an die Hecken! Die Amerikaner kommen.', en: 'Everyone still alive, to the hedgerows! The Americans are coming.' } },
      { t: 60, from: { de: 'Fliegerleitoffizier', en: 'Air liaison' }, side: 'us', text: { de: 'Thunderbolts über Marigny – fordern Sie Luftunterstützung gegen die Panzer an.', en: 'Thunderbolts over Marigny – call air support on the tanks.' } },
    ],
  },

  // ------------------------------------------------------------------ Kessel von Falaise
  {
    id: 'chambois', map: 'chambois', date: { de: '20. August 1944', en: '20 August 1944' }, time: '14:00', tod: 14, weather: 'clear_morning',
    title: { de: 'Der Kessel von Falaise – Chambois', en: 'The Falaise Pocket – Chambois' },
    place: { de: 'Chambois an der Dives', en: 'Chambois on the Dives' },
    history: {
      de: 'Mitte August sind die deutschen Armeen zwischen Falaise und Argentan eingeschlossen. Am 19. August treffen sich in Chambois amerikanische Soldaten der 90. Infanteriedivision und polnische Panzergrenadiere – der Kessel ist geschlossen. Tausende Deutsche versuchen über die Furten und Brücken der Dives auszubrechen; das Tal wird zum „Korridor des Todes“. Am 21. August endet die Schlacht um die Normandie.',
      en: 'By mid-August the German armies are trapped between Falaise and Argentan. On 19 August American soldiers of the 90th Infantry Division and Polish armoured infantry meet at Chambois – the pocket is closed. Thousands of Germans try to break out across the fords and bridges of the Dives; the valley becomes the "corridor of death". On 21 August the Battle of Normandy ends.',
    },
    us: {
      unit: { de: '359. Infanterieregiment, 90. Infanteriedivision', en: '359th Infantry Regiment, 90th Infantry Division' },
      briefing: {
        de: 'Chambois ist genommen, der Kessel geschlossen. Deutsche Kampfgruppen mit Panzern versuchen über die Dives-Brücke nach Osten durchzubrechen. Halten Sie den Ortskern, vernichten Sie die Panzer und lassen Sie niemanden durch.',
        en: 'Chambois is taken, the pocket is closed. German battle groups with tanks are trying to break out east across the Dives bridge. Hold the town centre, destroy the tanks and let no one through.',
      },
      spawn: 'usStart',
      objectives: [
        { type: 'defend', anchor: 'square', r: 55, time: 420, text: { de: 'Ortskern von Chambois halten', en: 'Hold the centre of Chambois' } },
        { type: 'destroy', targets: ['t1', 't2'], text: { de: 'Ausbrechende Panzer vernichten', en: 'Destroy the breakout tanks' } },
      ],
    },
    de: {
      unit: { de: 'Fallschirmjäger-Regiment 9, 3. Fallschirmjäger-Division', en: 'Fallschirmjäger Regiment 9, 3rd Parachute Division' },
      briefing: {
        de: 'Die Reste des Regiments sitzen im Kessel. Der einzige Weg nach Osten führt über die Dives bei Chambois. Stürmen Sie mit den letzten Panzern die Brücke und schlagen Sie sich zum Ostausgang durch.',
        en: 'What is left of the regiment is trapped in the pocket. The only way east leads across the Dives at Chambois. Storm the bridge with the last tanks and fight your way to the eastern exit.',
      },
      spawn: 'westStart',
      objectives: [
        { type: 'reach', anchor: 'bridgeE', r: 20, text: { de: 'Über die Dives-Brücke vorstoßen', en: 'Push across the Dives bridge' } },
        { type: 'reach', anchor: 'eastExit', r: 30, text: { de: 'Zum Ostausgang durchbrechen', en: 'Break through to the eastern exit' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'square', n: 8, order: 'hold', roles: ['rifle', 'rifle', 'mg', 'smg', 'rifle', 'at', 'officer', 'rifle'] },
        { anchor: 'keep', n: 1, order: 'static', roles: ['sniper'], tower: true },
        { anchor: 'bridgeE', n: 5, order: 'hold', roles: ['mg', 'rifle', 'at', 'rifle', 'smg'] },
        { anchor: 'usStart', n: 6, order: 'attack', target: 'square', wave: 160, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'at', 'rifle'] },
      ],
      de: [
        { anchor: 'westStart', n: 8, order: 'attack', target: 'bridge', wave: 20, tank: 'pz4', tankId: 't1', roles: ['rifle', 'assault', 'rifle', 'mg', 'rifle', 'at', 'rifle', 'officer'] },
        { anchor: 'westStart2', n: 8, order: 'attack', target: 'bridge', wave: 110, tank: 'stug', tankId: 't2', roles: ['rifle', 'assault', 'rifle', 'mg', 'rifle', 'at', 'assault', 'rifle'] },
        { anchor: 'ridge', n: 3, order: 'hold', roles: ['sniper', 'mg', 'rifle'] },
        { anchor: 'westStart', n: 10, order: 'attack', target: 'square', wave: 250, roles: ['rifle', 'assault', 'rifle', 'mg', 'rifle', 'at', 'assault', 'rifle', 'smg', 'rifle'] },
      ],
    },
    ambient: { planes: 'p47', arty: 0.9, mortars: true, sniper: 0 },
    events: [
      { t: 3, from: { de: 'Hauptmann Laug*', en: 'Capt. Laug*' }, side: 'us', text: { de: 'Sie kommen über die Brücke, mit Panzern. Bazookas nach vorn!', en: 'They\'re coming over the bridge, with tanks. Bazookas forward!' } },
      { t: 3, from: { de: 'Regimentsführer', en: 'Regimental commander' }, side: 'de', text: { de: 'Das ist die letzte Lücke. Durch Chambois oder in Gefangenschaft!', en: 'This is the last gap. Through Chambois or into captivity!' } },
      { t: 90, from: { de: 'Verbindungsoffizier', en: 'Liaison officer' }, side: 'us', text: { de: 'Polnische Panzer auf Höhe 262 bei Mont-Ormel halten die Straße nach Vimoutiers.', en: 'Polish armour on Hill 262 at Mont-Ormel is holding the road to Vimoutiers.' } },
    ],
  },
  // ------------------------------------------------------------------ Batterie Azeville
  {
    id: 'azeville', map: 'azeville', date: { de: '9. Juni 1944', en: '9 June 1944' }, time: '14:00', tod: 14, weather: 'clear_morning',
    title: { de: 'Die Batterie von Azeville', en: 'The Azeville Battery' },
    place: { de: 'Azeville, nordwestlich von Utah Beach', en: 'Azeville, north-west of Utah Beach' },
    history: {
      de: 'Hinter Utah Beach liegen die Batterien Crisbecq und Azeville: vier Kasematten aus Stahlbeton, verbunden durch Gräben und Gänge, umgeben von Stacheldraht und Minen. Seit dem 6. Juni beschießen sie den Strand. Zwei Angriffe des 22. Infanterieregiments scheitern. Am 9. Juni greift das 3. Bataillon erneut an – mit Sprengladungen, Bazookas und Flammenwerfern; ein einzelner Schuss des Flammenwerfers in eine offene Tür führt schließlich zur Kapitulation der Besatzung.',
      en: 'Behind Utah Beach lie the Crisbecq and Azeville batteries: four reinforced-concrete casemates linked by trenches and tunnels, ringed by barbed wire and mines. Since 6 June they have been shelling the beach. Two attacks by the 22nd Infantry Regiment fail. On 9 June the 3rd Battalion attacks again – with demolition charges, bazookas and flamethrowers; a single flamethrower burst through an open door finally makes the garrison surrender.',
    },
    us: {
      unit: { de: '3. Bataillon, 22. Infanterieregiment, 4. Infanteriedivision', en: '3rd Battalion, 22nd Infantry Regiment, 4th Infantry Division' },
      briefing: {
        de: 'Die Batterie feuert noch immer auf den Strand. Gehen Sie von Südosten durch die Hecken vor, schneiden Sie den Draht, schalten Sie die beiden MG-Nester am Graben aus und sprengen Sie alle vier Kasematten. Die Flak der Batterie schießt im Erdeinsatz – Deckung nutzen!',
        en: 'The battery is still firing on the beach. Advance from the south-east through the hedgerows, breach the wire, knock out the two MG nests at the trench and blow all four casemates. The battery\'s flak is firing at ground targets – use cover!',
      },
      spawn: 'usStart',
      objectives: [
        { type: 'reach', anchor: 'wire', r: 45, text: { de: 'An den Drahtgürtel heran', en: 'Close in on the wire belt' } },
        { type: 'destroy', targets: ['mg1', 'mg2'], text: { de: 'MG-Nester am Graben ausschalten', en: 'Knock out the MG nests at the trench' } },
        { type: 'destroy', targets: ['az1', 'az2', 'az3', 'az4'], text: { de: 'Alle vier Kasematten sprengen (E)', en: 'Blow all four casemates (E)' } },
        { type: 'clear', anchor: 'battery', r: 80, left: 1, text: { de: 'Batteriegelände säubern', en: 'Clear the battery position' } },
      ],
    },
    de: {
      unit: { de: '2. Batterie, Artillerie-Regiment 1261', en: '2nd Battery, Artillery Regiment 1261' },
      briefing: {
        de: 'Die Batterie ist seit drei Tagen eingeschlossen und feuert weiter auf den Strand. Halten Sie Graben und Kasematten gegen den Angriff aus Südosten. Ein Stoßtrupp aus dem Dorf Azeville kommt zur Unterstützung.',
        en: 'The battery has been cut off for three days and keeps firing on the beach. Hold the trench and casemates against the attack from the south-east. An assault squad from Azeville village is coming to help.',
      },
      spawn: 'battery',
      objectives: [
        { type: 'defend', anchor: 'battery', r: 90, time: 360, text: { de: 'Batterie halten', en: 'Hold the battery' } },
        { type: 'kill', n: 25, text: { de: 'Angriff zerschlagen (25 Gegner)', en: 'Break the attack (25 enemies)' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'usStart', n: 8, order: 'attack', target: 'wire', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'officer', 'rifle'] },
        { anchor: 'usStart2', n: 8, order: 'attack', target: 'wire', roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', 'at', 'rifle', 'rifle'] },
        { anchor: 'usStart', n: 8, order: 'attack', target: 'battery', wave: 110, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'at', 'rifle', 'rifle', 'officer'] },
        { anchor: 'usStart2', n: 8, order: 'attack', target: 'battery', wave: 260, roles: ['rifle', 'smg', 'assault', 'rifle', 'at', 'rifle', 'mg', 'rifle'] },
      ],
      de: [
        { anchor: 'mg1', n: 2, order: 'static', roles: ['mg', 'rifle'] },
        { anchor: 'mg2', n: 2, order: 'static', roles: ['mg', 'rifle'] },
        { anchor: 'az1', n: 2, order: 'static', roles: ['rifle', 'rifle'] },
        { anchor: 'az2', n: 2, order: 'static', roles: ['rifle', 'smg'] },
        { anchor: 'az3', n: 2, order: 'static', roles: ['rifle', 'rifle'] },
        { anchor: 'az4', n: 2, order: 'static', roles: ['smg', 'rifle'] },
        { anchor: 'battery', n: 5, order: 'hold', roles: ['rifle', 'mg', 'rifle', 'officer', 'smg'] },
        { anchor: 'village', n: 5, order: 'attack', target: 'battery', wave: 240, roles: ['rifle', 'assault', 'rifle', 'mg', 'rifle'] },
      ],
    },
    ambient: { naval: true, planes: 'p47', arty: 0.6, mortars: true, sniper: 1, battery: true },
    events: [
      { t: 3, from: { de: 'Hauptmann', en: 'Captain' }, side: 'us', text: { de: 'Zweimal sind wir schon abgeprallt. Diesmal kommen wir mit Sprengladungen bis an die Türen.', en: 'We\'ve bounced off twice. This time we take the charges right up to their doors.' } },
      { t: 3, from: { de: 'Batteriechef', en: 'Battery commander' }, side: 'de', text: { de: 'Sie kommen wieder. Alle Mann an den Graben, die Flak schießt waagerecht!', en: 'They\'re coming again. Everyone to the trench, the flak fires level!' } },
      { t: 70, from: { de: 'Feuerleitoffizier', en: 'Fire control officer' }, side: 'us', text: { de: 'USS Nevada feuert auf Azeville – Kopf runter!', en: 'USS Nevada is firing on Azeville – heads down!' } },
      { t: 200, from: { de: 'Melder', en: 'Runner' }, side: 'de', text: { de: 'Stoßtrupp aus dem Dorf ist unterwegs!', en: 'The assault squad from the village is on its way!' } },
    ],
  },

  // ------------------------------------------------------------------ Cherbourg
  {
    id: 'cherbourg', map: 'cherbourg', date: { de: '25. Juni 1944', en: '25 June 1944' }, time: '13:00', tod: 13, weather: 'overcast',
    title: { de: 'Cherbourg – Fort du Roule', en: 'Cherbourg – Fort du Roule' },
    place: { de: 'Montagne du Roule über Cherbourg', en: 'Montagne du Roule above Cherbourg' },
    history: {
      de: 'Ohne Hafen kann die Invasion nicht versorgt werden. Ende Juni stoßen drei amerikanische Divisionen auf Cherbourg vor. Über der Stadt liegt das Fort du Roule mit Kasematten im Fels. Am 25. Juni arbeiten sich Soldaten der 79. Infanteriedivision den Südhang hinauf; Korporal John D. Kelly und Leutnant Carlos Ogden schalten mit Sprengladungen und Gewehrgranaten mehrere Bunker aus (beide erhalten die Medal of Honor). Am 26. Juni kapituliert General von Schlieben, die Hafenanlagen sind jedoch gründlich zerstört.',
      en: 'Without a port the invasion cannot be supplied. In late June three American divisions push on Cherbourg. Above the city stands Fort du Roule with casemates cut into the rock. On 25 June soldiers of the 79th Infantry Division work their way up the southern slope; Corporal John D. Kelly and Lieutenant Carlos Ogden knock out several bunkers with pole charges and rifle grenades (both receive the Medal of Honor). On 26 June General von Schlieben surrenders, but the harbour has been thoroughly wrecked.',
    },
    us: {
      unit: { de: '314. Infanterieregiment, 79. Infanteriedivision', en: '314th Infantry Regiment, 79th Infantry Division' },
      briefing: {
        de: 'Das Fort beherrscht die Stadt und den Hafen. Arbeiten Sie sich den Südhang hinauf, sprengen Sie die beiden Bunker vor dem Fort, hissen Sie die Flagge auf dem Fort und kämpfen Sie sich dann durch die Straßen bis zum Platz in der Stadt.',
        en: 'The fort dominates the city and the harbour. Work your way up the southern slope, blow the two bunkers in front of the fort, raise the flag over the fort and then fight through the streets to the square in the city.',
      },
      spawn: 'usStart',
      objectives: [
        { type: 'reach', anchor: 'slope', r: 35, text: { de: 'Südhang des Roule erreichen', en: 'Reach the southern slope of the Roule' } },
        { type: 'destroy', targets: ['fort1', 'fort2'], text: { de: 'Bunker vor dem Fort sprengen (E)', en: 'Blow the bunkers in front of the fort (E)' } },
        { type: 'flag', anchor: 'fortflag', text: { de: 'Flagge auf dem Fort hissen (E)', en: 'Raise the flag over the fort (E)' } },
        { type: 'clear', anchor: 'city', r: 60, left: 1, text: { de: 'Häuserkampf bis zum Platz', en: 'Street fighting to the square' } },
      ],
    },
    de: {
      unit: { de: 'Kampfgruppe der 709. Infanteriedivision', en: 'Battle group of the 709th Infantry Division' },
      briefing: {
        de: 'Cherbourg soll „bis zur letzten Patrone“ gehalten werden. Verteidigen Sie das Fort du Roule gegen den Angriff von Süden und ziehen Sie sich danach in die Stadt zurück. Halten Sie den Platz, solange die Sprengkommandos im Hafen arbeiten.',
        en: 'Cherbourg is to be held "to the last round". Defend Fort du Roule against the attack from the south, then fall back into the city. Hold the square while the demolition teams work in the harbour.',
      },
      spawn: 'fort',
      objectives: [
        { type: 'defend', anchor: 'fort', r: 80, time: 420, text: { de: 'Fort du Roule halten', en: 'Hold Fort du Roule' } },
        { type: 'defend', anchor: 'city', r: 70, time: 300, text: { de: 'Platz in der Stadt halten', en: 'Hold the city square' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'usStart', n: 8, order: 'attack', target: 'slope', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'officer', 'rifle'] },
        { anchor: 'usStart', n: 6, order: 'attack', target: 'fort', wave: 60, roles: ['rifle', 'assault', 'smg', 'rifle', 'mg', 'rifle'] },
        { anchor: 'usStart2', n: 8, order: 'attack', target: 'fort', roles: ['rifle', 'smg', 'rifle', 'mg', 'assault', 'at', 'rifle', 'rifle'] },
        { anchor: 'usStart', n: 8, order: 'attack', target: 'fort', wave: 130, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'at', 'rifle', 'rifle', 'officer'] },
        { anchor: 'usStart2', n: 8, order: 'attack', target: 'fort', wave: 300, roles: ['rifle', 'smg', 'assault', 'rifle', 'mg', 'rifle', 'smg', 'rifle'] },
      ],
      de: [
        { anchor: 'fort1', n: 2, order: 'static', roles: ['mg', 'rifle'] },
        { anchor: 'fort2', n: 2, order: 'static', roles: ['rifle', 'mg'] },
        { anchor: 'fort', n: 4, order: 'hold', roles: ['rifle', 'mg', 'smg', 'officer'] },
        { anchor: 'city', n: 6, order: 'hold', roles: ['rifle', 'mg', 'smg', 'rifle', 'at', 'sniper'] },
        { anchor: 'deRear', n: 4, order: 'attack', target: 'fort', wave: 260, roles: ['rifle', 'assault', 'rifle', 'mg'] },
      ],
    },
    ambient: { planes: 'p47', arty: 0.8, mortars: true, sniper: 1 },
    events: [
      { t: 3, from: { de: 'Kompaniechef', en: 'Company commander' }, side: 'us', text: { de: 'Das Fort sieht auf jeden Meter herunter. Von Hecke zu Hecke, und die Sprengladungen nach vorn!', en: 'The fort looks down on every yard. Hedge by hedge, and get the charges forward!' } },
      { t: 3, from: { de: 'Festungskommandant', en: 'Fortress commander' }, side: 'de', text: { de: 'Der Befehl lautet: halten bis zur letzten Patrone. Die Pioniere sprengen im Hafen.', en: 'The order is: hold to the last round. The engineers are blowing up the harbour.' } },
      { t: 120, from: { de: 'Artillerie', en: 'Artillery' }, side: 'us', text: { de: 'Feuer auf den Kamm liegt. Jetzt hoch!', en: 'Fire is on the crest. Go up now!' } },
    ],
  },

  // ------------------------------------------------------------------ Mortain
  {
    id: 'mortain', map: 'mortain', date: { de: '7. August 1944', en: '7 August 1944' }, time: '09:00', tod: 9, weather: 'dawn_mist',
    title: { de: 'Mortain – Saint-Barthélemy', en: 'Mortain – Saint-Barthélemy' },
    place: { de: 'Saint-Barthélemy bei Mortain', en: 'Saint-Barthélemy near Mortain' },
    history: {
      de: 'In der Nacht zum 7. August beginnt das „Unternehmen Lüttich“: Panzerdivisionen sollen von Mortain nach Westen bis Avranches stoßen und die durchgebrochenen Amerikaner abschneiden. Im dichten Morgennebel rollen Panzer der 2. Panzer-Division durch Saint-Barthélemy, verteidigt vom 1. Bataillon des 117. Infanterieregiments. Auf der nahen Höhe 314 hält sich ein eingeschlossenes Bataillon sechs Tage lang. Gegen Mittag lichtet sich der Nebel – Jagdbomber greifen die Kolonnen an, der Vorstoß bleibt liegen.',
      en: 'In the night to 7 August "Operation Lüttich" begins: panzer divisions are to strike west from Mortain to Avranches and cut off the Americans who have broken through. In thick morning fog tanks of the 2nd Panzer Division roll through Saint-Barthélemy, held by the 1st Battalion, 117th Infantry Regiment. On nearby Hill 314 a surrounded battalion holds out for six days. Around noon the fog lifts – fighter-bombers attack the columns and the thrust bogs down.',
    },
    us: {
      unit: { de: '1. Bataillon, 117. Infanterieregiment, 30. Infanteriedivision', en: '1st Battalion, 117th Infantry Regiment, 30th Infantry Division' },
      briefing: {
        de: 'Panzer im Nebel, von Osten. Halten Sie Saint-Barthélemy, vernichten Sie die Panzer mit Bazookas – lassen Sie sie in den Ort, die Gassen sind eng. Wenn der Nebel aufreißt, kommen die Jagdbomber. Danach die Kreuzung halten.',
        en: 'Tanks in the fog, from the east. Hold Saint-Barthélemy and destroy the tanks with bazookas – let them into the village, the lanes are narrow. When the fog lifts the fighter-bombers will come. Then hold the crossroads.',
      },
      spawn: 'village',
      objectives: [
        { type: 'defend', anchor: 'village', r: 80, time: 300, text: { de: 'Saint-Barthélemy halten', en: 'Hold Saint-Barthélemy' } },
        { type: 'destroy', targets: ['pzA', 'pzB'], text: { de: 'Panzer vernichten (Bazooka, Luftangriff)', en: 'Destroy the tanks (bazooka, air strike)' } },
        { type: 'defend', anchor: 'crossroads', r: 60, time: 180, text: { de: 'Kreuzung halten', en: 'Hold the crossroads' } },
      ],
    },
    de: {
      unit: { de: 'Panzergrenadier-Regiment 304, 2. Panzer-Division', en: 'Panzergrenadier Regiment 304, 2nd Panzer Division' },
      briefing: {
        de: 'Der Nebel ist unser Schutz vor den Jagdbombern. Stoßen Sie mit den Panzern durch Saint-Barthélemy nach Westen vor, säubern Sie den Ort und erreichen Sie den Westausgang, bevor sich der Nebel lichtet.',
        en: 'The fog is our cover from the fighter-bombers. Push west through Saint-Barthélemy with the tanks, clear the village and reach the western exit before the fog lifts.',
      },
      spawn: 'deStart',
      objectives: [
        { type: 'reach', anchor: 'eastEntry', r: 30, text: { de: 'Ostrand des Ortes erreichen', en: 'Reach the eastern edge of the village' } },
        { type: 'clear', anchor: 'village', r: 70, left: 1, text: { de: 'Saint-Barthélemy säubern', en: 'Clear Saint-Barthélemy' } },
        { type: 'reach', anchor: 'westExit', r: 35, text: { de: 'Westausgang erreichen', en: 'Reach the western exit' } },
      ],
    },
    forces: {
      us: [
        { anchor: 'village', n: 9, order: 'hold', roles: ['rifle', 'mg', 'at', 'rifle', 'officer', 'rifle', 'at', 'smg', 'rifle'] },
        { anchor: 'crossroads', n: 4, order: 'hold', roles: ['rifle', 'at', 'mg', 'rifle'] },
        { anchor: 'eastEntry', n: 5, order: 'hold', roles: ['rifle', 'mg', 'at', 'rifle', 'rifle'] },
        { anchor: 'crossroads', n: 5, order: 'hold', roles: ['rifle', 'smg', 'rifle', 'at', 'mg'] },
        { anchor: 'usReserve', n: 8, order: 'attack', target: 'village', wave: 170, tank: 'sherman', roles: ['rifle', 'smg', 'rifle', 'mg', 'at', 'rifle', 'rifle', 'officer'] },
      ],
      de: [
        { anchor: 'deStart', n: 7, order: 'attack', target: 'eastEntry', tank: 'pz4', tankId: 'pzA', roles: ['rifle', 'assault', 'rifle', 'mg', 'rifle', 'smg', 'officer'] },
        { anchor: 'deStart2', n: 6, order: 'attack', target: 'village', wave: 150, tank: 'pz4', tankId: 'pzB', roles: ['rifle', 'assault', 'rifle', 'mg', 'rifle', 'smg', 'rifle'] },
        { anchor: 'deStart', n: 7, order: 'attack', target: 'village', wave: 280, roles: ['rifle', 'assault', 'rifle', 'mg', 'smg', 'rifle', 'rifle'] },
      ],
    },
    ambient: { planes: 'p47', arty: 0.6, mortars: true, sniper: 0 },
    events: [
      { t: 3, from: { de: 'Bataillon', en: 'Battalion' }, side: 'us', text: { de: 'Motorengeräusche im Nebel, Richtung Osten. Panzer! Bazookas an die Straße!', en: 'Engine noise in the fog, to the east. Tanks! Bazookas to the road!' } },
      { t: 3, from: { de: 'Abteilungskommandeur', en: 'Battalion commander' }, side: 'de', text: { de: 'Solange der Nebel hält, sind wir sicher vor den Jabos. Vorwärts!', en: 'As long as the fog holds we are safe from the fighter-bombers. Forward!' } },
      { t: 210, from: { de: 'Fliegerleitoffizier', en: 'Air liaison' }, side: 'us', text: { de: 'Der Nebel reißt auf! Typhoons und Thunderbolts im Anflug – Ziele markieren!', en: 'The fog is lifting! Typhoons and Thunderbolts inbound – mark the targets!' } },
      { t: 210, from: { de: 'Beobachter', en: 'Observer' }, side: 'de', text: { de: 'Jabos! Volle Deckung, Panzer in die Hecken!', en: 'Fighter-bombers! Take cover, tanks into the hedges!' } },
    ],
  },
];

// Kampagnenreihenfolge je Seite (historisch, aus Sicht der jeweiligen Seite)
export const CAMPAIGN = {
  us: ['drop', 'stmere', 'utah', 'omaha', 'pointe', 'brecourt', 'lafiere', 'azeville', 'carentan', 'cherbourg', 'stlo', 'cobra', 'mortain', 'chambois'],
  de: ['drop', 'utah', 'omaha', 'pointe', 'brecourt', 'stmere', 'lafiere', 'azeville', 'carentan', 'cherbourg', 'stlo', 'cobra', 'mortain', 'chambois'],
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
    utah: { de: 'Bis zum Abend sind 23.000 Mann an Land. Bei Pouppeville trifft die 4. Infanteriedivision auf die Fallschirmjäger der 101.', en: 'By evening 23,000 men are ashore. At Pouppeville the 4th Infantry Division links up with the 101st Airborne.' },
    cobra: { de: 'Marigny fällt, die Front bricht auf. Binnen einer Woche stoßen amerikanische Panzer bis Avranches vor – der Weg in die Bretagne und nach Osten ist frei.', en: 'Marigny falls and the front gives way. Within a week American armour reaches Avranches – the way into Brittany and east is open.' },
    azeville: { de: 'Nach dem Flammenwerferstoß ergibt sich die Besatzung – 169 Mann. Drei Tage später fällt auch Crisbecq; der Strand liegt nicht mehr unter Feuer.', en: 'After the flamethrower burst the garrison surrenders – 169 men. Three days later Crisbecq falls too; the beach is no longer under fire.' },
    cherbourg: { de: 'Am 26. Juni kapituliert die Festung. Der Hafen ist so gründlich zerstört, dass erst im August wieder Schiffe entladen werden können.', en: 'The fortress surrenders on 26 June. The harbour is so thoroughly wrecked that ships cannot unload there until August.' },
    mortain: { de: 'Das „Unternehmen Lüttich“ scheitert. Auf Höhe 314 halten 700 Mann bis zum 12. August – die deutschen Armeen laufen nun in den Kessel von Falaise.', en: '"Operation Lüttich" fails. On Hill 314 700 men hold out until 12 August – the German armies now run into the Falaise pocket.' },
    chambois: { de: 'Der Kessel ist dicht. Rund 50.000 deutsche Soldaten gehen in Gefangenschaft, Tausende sind gefallen. Am 25. August wird Paris befreit.', en: 'The pocket is sealed. Around 50,000 German soldiers are taken prisoner, thousands have died. On 25 August Paris is liberated.' },
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
    utah: { de: 'Das Widerstandsnest fällt nach wenigen Stunden. Utah Beach ist der Abschnitt mit den geringsten amerikanischen Verlusten.', en: 'The strongpoint falls within hours. Utah Beach is the sector with the lightest American losses.' },
    cobra: { de: 'Die Panzer-Lehr-Division ist nach dem Bombenteppich nur noch ein Schatten. Die Front im Westen bricht zusammen.', en: 'After the carpet bombing the Panzer Lehr Division is only a shadow. The western front collapses.' },
    azeville: { de: 'Die Batterie hält zwei Angriffe aus. Beim dritten wird sie gesprengt und ausgeräuchert; die Besatzung geht in Gefangenschaft.', en: 'The battery beats off two attacks. In the third it is blown open and burnt out; the garrison is captured.' },
    cherbourg: { de: 'Die Festung fällt am 26. Juni, doch die Sprengkommandos haben den Hafen für Wochen unbrauchbar gemacht.', en: 'The fortress falls on 26 June, but the demolition teams have made the harbour useless for weeks.' },
    mortain: { de: 'Als der Nebel fällt, zerschlagen Jagdbomber die Kolonnen. Der Angriff auf Avranches bleibt stecken – und die Front gerät in die Umklammerung bei Falaise.', en: 'When the fog lifts, fighter-bombers smash the columns. The thrust on Avranches stalls – and the front is caught in the Falaise envelopment.' },
    chambois: { de: 'Ein Teil der Truppen entkommt durch den „Korridor des Todes“. Zurück bleiben zerstörte Kolonnen, Zehntausende geraten in Gefangenschaft.', en: 'Some troops escape through the "corridor of death". Left behind are destroyed columns; tens of thousands are captured.' },
  },
};

export const opById = (id) => OPERATIONS.find((o) => o.id === id);
