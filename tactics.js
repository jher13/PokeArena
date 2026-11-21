(() => {
 const content=byId('tactics-content');
 const odds=[[100,0,0,0,0],[75,25,0,0,0],[55,35,10,0,0],[40,35,20,5,0],[28,34,25,11,2],[15,25,30,22,8],[10,18,28,30,14],[6,12,22,35,25],[3,7,15,35,40]];
 // Each shop card represents a family. Paths contain its two-star and three-star forms.
 const evolutionFamilies={
  "Bulbasaur":[["Ivysaur","Venusaur"]],
  "Charmander":[["Charmeleon","Charizard"]],
  "Squirtle":[["Wartortle","Blastoise"]],
  "Caterpie":[["Metapod","Butterfree"]],
  "Weedle":[["Kakuna","Beedrill"]],
  "Pidgey":[["Pidgeotto","Pidgeot"]],
  "Pichu":[["Pikachu","Raichu"]],
  "Nidoran♀":[["Nidorina","Nidoqueen"]],
  "Nidoran♂":[["Nidorino","Nidoking"]],
  "Cleffa":[["Clefairy","Clefable"]],
  "Igglybuff":[["Jigglypuff","Wigglytuff"]],
  "Oddish":[["Gloom","Vileplume"],["Gloom","Bellossom"]],
  "Poliwag":[["Poliwhirl","Poliwrath"],["Poliwhirl","Politoed"]],
  "Abra":[["Kadabra","Alakazam"]],
  "Machop":[["Machoke","Machamp"]],
  "Bellsprout":[["Weepinbell","Victreebel"]],
  "Geodude":[["Graveler","Golem"]],
  "Gastly":[["Haunter","Gengar"]],
  "Dratini":[["Dragonair","Dragonite"]],
  "Chikorita":[["Bayleef","Meganium"]],
  "Cyndaquil":[["Quilava","Typhlosion"]],
  "Totodile":[["Croconaw","Feraligatr"]],
  "Zubat":[["Golbat","Crobat"]],
  "Mareep":[["Flaaffy","Ampharos"]],
  "Azurill":[["Marill","Azumarill"]],
  "Hoppip":[["Skiploom","Jumpluff"]],
  "Horsea":[["Seadra","Kingdra"]],
  "Happiny":[["Chansey","Blissey"]],
  "Larvitar":[["Pupitar","Tyranitar"]],
  "Treecko":[["Grovyle","Sceptile"]],
  "Torchic":[["Combusken","Blaziken"]],
  "Mudkip":[["Marshtomp","Swampert"]],
  "Wurmple":[["Silcoon","Beautifly"],["Cascoon","Dustox"]],
  "Lotad":[["Lombre","Ludicolo"]],
  "Seedot":[["Nuzleaf","Shiftry"]],
  "Ralts":[["Kirlia","Gardevoir"],["Kirlia","Gallade"]],
  "Slakoth":[["Vigoroth","Slaking"]],
  "Whismur":[["Loudred","Exploud"]],
  "Aron":[["Lairon","Aggron"]],
  "Trapinch":[["Vibrava","Flygon"]],
  "Spheal":[["Sealeo","Walrein"]],
  "Bagon":[["Shelgon","Salamence"]],
  "Beldum":[["Metang","Metagross"]],
  "Turtwig":[["Grotle","Torterra"]],
  "Chimchar":[["Monferno","Infernape"]],
  "Piplup":[["Prinplup","Empoleon"]],
  "Starly":[["Staravia","Staraptor"]],
  "Shinx":[["Luxio","Luxray"]],
  "Budew":[["Roselia","Roserade"]],
  "Gible":[["Gabite","Garchomp"]],
  "Magnemite":[["Magneton","Magnezone"]],
  "Rhyhorn":[["Rhydon","Rhyperior"]],
  "Elekid":[["Electabuzz","Electivire"]],
  "Magby":[["Magmar","Magmortar"]],
  "Togepi":[["Togetic","Togekiss"]],
  "Swinub":[["Piloswine","Mamoswine"]],
  "Porygon":[["Porygon2","Porygon-Z"]],
  "Duskull":[["Dusclops","Dusknoir"]],
  "Snivy":[["Servine","Serperior"]],
  "Tepig":[["Pignite","Emboar"]],
  "Oshawott":[["Dewott","Samurott"]],
  "Lillipup":[["Herdier","Stoutland"]],
  "Roggenrola":[["Boldore","Gigalith"]],
  "Timburr":[["Gurdurr","Conkeldurr"]],
  "Tympole":[["Palpitoad","Seismitoad"]],
  "Sewaddle":[["Swadloon","Leavanny"]],
  "Venipede":[["Whirlipede","Scolipede"]],
  "Sandile":[["Krokorok","Krookodile"]],
  "Gothita":[["Gothorita","Gothitelle"]],
  "Solosis":[["Duosion","Reuniclus"]],
  "Vanillite":[["Vanillish","Vanilluxe"]],
  "Klink":[["Klang","Klinklang"]],
  "Tynamo":[["Eelektrik","Eelektross"]],
  "Litwick":[["Lampent","Chandelure"]],
  "Axew":[["Fraxure","Haxorus"]],
  "Deino":[["Zweilous","Hydreigon"]],
  "Chespin":[["Quilladin","Chesnaught"]],
  "Fennekin":[["Braixen","Delphox"]],
  "Froakie":[["Frogadier","Greninja"]],
  "Fletchling":[["Fletchinder","Talonflame"]],
  "Scatterbug":[["Spewpa","Vivillon"]],
  "Flabébé":[["Floette","Florges"]],
  "Honedge":[["Doublade","Aegislash"]],
  "Goomy":[["Sliggoo","Goodra"]],
  "Rowlet":[["Dartrix","Decidueye"]],
  "Litten":[["Torracat","Incineroar"]],
  "Popplio":[["Brionne","Primarina"]],
  "Grubbin":[["Charjabug","Vikavolt"]],
  "Bounsweet":[["Steenee","Tsareena"]],
  "Jangmo-o":[["Hakamo-o","Kommo-o"]],
  "Cosmog":[["Cosmoem","Solgaleo"],["Cosmoem","Lunala"]],
  "Grookey":[["Thwackey","Rillaboom"]],
  "Scorbunny":[["Raboot","Cinderace"]],
  "Sobble":[["Drizzile","Inteleon"]],
  "Rookidee":[["Corvisquire","Corviknight"]],
  "Blipbug":[["Dottler","Orbeetle"]],
  "Hatenna":[["Hattrem","Hatterene"]],
  "Impidimp":[["Morgrem","Grimmsnarl"]],
  "Zigzagoon":[["Linoone","Obstagoon"]],
  "Dreepy":[["Drakloak","Dragapult"]],
  "Teddiursa":[["Ursaring","Ursaluna"]],
  "Sprigatito":[["Floragato","Meowscarada"]],
  "Fuecoco":[["Crocalor","Skeledirge"]],
  "Quaxly":[["Quaxwell","Quaquaval"]],
  "Pawmi":[["Pawmo","Pawmot"]],
  "Smoliv":[["Dolliv","Arboliva"]],
  "Nacli":[["Naclstack","Garganacl"]],
  "Tinkatink":[["Tinkatuff","Tinkaton"]],
  "Mankey":[["Primeape","Annihilape"]],
  "Eevee":[["Vaporeon","Vaporeon"],["Jolteon","Jolteon"],["Flareon","Flareon"],["Espeon","Espeon"],["Umbreon","Umbreon"],["Leafeon","Leafeon"],["Glaceon","Glaceon"],["Sylveon","Sylveon"]],
 };
 const roster=[
  ["Bulbasaur","Charmander","Squirtle","Pichu","Zubat","Geodude","Abra","Gastly","Machop","Oddish","Pidgey","Caterpie","Poliwag","Wurmple","Ralts","Eevee","Weedle","Scatterbug","Azurill","Igglybuff","Hoppip","Lotad","Seedot","Cleffa","Starly","Venipede","Bellsprout"],
  ["Whismur","Gothita","Solosis","Pawmi","Rookidee","Fletchling","Lillipup","Sewaddle","Honedge","Grubbin","Nacli","Nidoran♀","Nidoran♂","Timburr","Blipbug","Tinkatink","Tympole","Mareep","Bounsweet","Hatenna","Impidimp","Smoliv","Budew","Roggenrola","Tynamo","Sandile","Zigzagoon","Trapinch"],
  ["Klink","Litwick","Shinx","Chikorita","Duskull","Turtwig","Snivy","Tepig","Oshawott","Totodile","Swinub","Treecko","Torchic","Aron","Spheal","Piplup","Chespin","Froakie","Rowlet","Litten","Popplio","Grookey","Scorbunny","Sobble","Sprigatito","Fuecoco","Quaxly","Cyndaquil","Chimchar"],
  ["Fennekin","Mankey","Magnemite","Rhyhorn","Porygon","Mudkip","Vanillite","Horsea","Elekid","Magby","Happiny","Axew","Togepi","Teddiursa","Flabébé","Dratini","Larvitar","Bagon","Beldum","Gible","Deino","Goomy","Jangmo-o","Dreepy","Slakoth"],
  ["Cosmog","Regice","Regirock","Registeel","Articuno","Zapdos","Moltres","Mewtwo","Lugia","Ho-Oh","Rayquaza","Raikou","Entei","Suicune","Kyogre","Groudon"],
 ];
 const familyByForm=new Map(Object.entries(evolutionFamilies).flatMap(([root,paths])=>
  [root,...paths.flat()].map(name=>[name,root])));
 const familyOf=unit=>unit.family ?? familyByForm.get(unit.name) ?? unit.name;
 const familyCopies=unit=>unit.poolCopies ?? 3**(unit.star-1);
 const branchPaths=unit=>evolutionFamilies[familyOf(unit)] ?? [];
 const signatures={
  'Bulbasaur':['Seed Burst','Grass',true],
  'Charmander':['Tailflame','Fire',true],
  'Squirtle':['Water Shell Barrier','Water',true],
  'Pikachu':['Volt Dash','Electric',false],
  'Caterpie':['Silk Snap','Bug',false],
  'Rattata':['Fang Rush','Normal',false],
  'Pidgey':['Wing Gust','Flying',true],
  'Zubat':['Night Bite','Dark',false],
  'Geodude':['Stone Knuckle','Rock',false],
  'Sandshrew':['Sand Drill','Ground',false],
  'Oddish':['Moonlit Petals','Grass',true],
  'Abra':['Blink Pulse','Psychic',true],
  'Machop':['Breaker Punch','Fighting',false],
  'Gastly':['Haunt Mist','Ghost',true],
  'Eevee':['Adaptable Tackle','Normal',false],
  'Ivysaur':['Bud Barrage','Grass',false],
  'Charmeleon':['Scorch Claw','Fire',false],
  'Wartortle':['Shellguard Current','Water',true],
  'Raichu':['Thunder Tail','Electric',false],
  'Pidgeotto':['Crosswind Dive','Flying',false],
  'Golbat':['Venom Swoop','Poison',false],
  'Graveler':['Rolling Quake','Ground',false],
  'Machoke':['Seismic Clinch','Fighting',false],
  'Kadabra':['Spoon Shock','Psychic',true],
  'Haunter':['Phantom Grasp','Ghost',true],
  'Vulpix':['Six-Tail Ember','Fire',true],
  'Psyduck':['Headache Wave','Psychic',true],
  'Magnemite':['Polarity Zap','Electric',true],
  'Growlithe':['Ember Pounce','Fire',false],
  'Ninetales':['Foxfire Curse','Fire',true],
  'Golduck':['Gem Torrent','Water',true],
  'Magneton':['Tri-Coil Surge','Electric',true],
  'Arcanine':['Blazing Rush','Fire',false],
  'Clefable':['Lunar Chorus','Fairy',true],
  'Scyther':['Twin Scythe','Bug',false],
  'Pinsir':['Pincer Crush','Bug',false],
  'Rhydon':['Horn Tremor','Ground',false],
  'Hypno':['Pendulum Pulse','Psychic',true],
  'Lapras':['Glacial Aria','Ice',true],
  'Jolteon':['Lightning Quills','Electric',true],
  'Vaporeon':['Melting Tide','Water',true],
  'Flareon':['Furnace Flare','Fire',false],
  'Leafeon':['Verdant Blade','Grass',false],
  'Glaceon':['Diamond Frost','Ice',true],
  'Venusaur':['Canopy Cannon','Grass',true],
  'Charizard':['Inferno Wing','Fire',true],
  'Blastoise':['Hydro Bulwark','Water',true],
  'Alakazam':['Mind Singularity','Psychic',true],
  'Machamp':['Four-Fist Barrage','Fighting',false],
  'Golem':['Granite Avalanche','Rock',false],
  'Gengar':['Shadow Ambush','Ghost',true],
  'Snorlax':['Slumber Slam','Normal',false],
  'Dragonite':['Dragon Tempest','Dragon',true],
  'Tyranitar':['Sandstorm Tyrant','Rock',false],
  'Gardevoir':['Gravity Rift','Psychic',true],
  'Metagross':['Meteor Cross','Steel',false],
  'Espeon':['Sun Gem Ray','Psychic',true],
  'Umbreon':['Eclipse Fang','Dark',false],
  'Sylveon':['Ribbon Resonance','Fairy',true],
  'Regice':['Absolute Zero','Ice',true],
  'Regirock':['Continental Crash','Rock',false],
  'Registeel':['Iron Core Impact','Steel',false],
  'Articuno':['Polar Gale','Ice',true],
  'Zapdos':['Stormwing Bolt','Electric',true],
  'Moltres':['Solar Phoenix','Fire',true],
  'Mewtwo':['Psystrike','Psychic',true],
  'Lugia':['Silverwind Aegis','Flying',true],
  'Ho-Oh':['Sacred Fire','Fire',false],
  'Rayquaza':['Dragon Ascent','Flying',false],
  'Raikou':['Storm Crown','Electric',true],
  'Entei':['Volcanic Roar','Fire',false],
  'Suicune':['Northern Current','Water',true],
  'Kyogre':['Origin Pulse','Water',true],
  'Groudon':['Precipice Blades','Ground',false],
  'Rhyhorn':['Ridge Charge','Ground',false],
  'Boldore':['Crystal Volley','Rock',false],
 };
 const expandedSignatures={
  "Metapod":["Shell Brace","brace thorn"],
  "Butterfree":["Dream Dust","spread snare rush"],
  "Weedle":["Barbed Puncture","wound rush"],
  "Kakuna":["Venom Husk","shield wound"],
  "Beedrill":["Twin Stinger","execute wound"],
  "Pidgeot":["Skyline Cyclone","gale spread"],
  "Pichu":["Static Sneeze","spark recoil"],
  "Nidoran♀":["Bristle Guard","shield weaken"],
  "Nidorina":["Brood Defense","cover veil"],
  "Nidoqueen":["Royal Rampart","fortify thorn"],
  "Nidoran♂":["Horn Jab","sunder rush wound"],
  "Nidorino":["Venom Tusk","sunder wound"],
  "Nidoking":["Royal Quake","quake spread"],
  "Cleffa":["Stardust Wish","heal spark"],
  "Clefairy":["Moonbeam Waltz","heal veil tide"],
  "Igglybuff":["Hushed Hum","snare veil"],
  "Jigglypuff":["Drowsy Refrain","snare spread rally"],
  "Wigglytuff":["Grand Lullaby","quake weaken"],
  "Gloom":["Noxious Pollen","spread weaken bloom"],
  "Vileplume":["Petal Miasma","spread wound bloom"],
  "Bellossom":["Sun Petal Dance","heal cleanse tide"],
  "Poliwag":["Spiral Hypnosis","snare sap gale"],
  "Poliwhirl":["Eddy Lock","snare gale"],
  "Poliwrath":["Riptide Throw","gale sunder"],
  "Politoed":["Raincall Chorus","heal tide spark"],
  "Bellsprout":["Vine Hook","snare leech"],
  "Weepinbell":["Pitcher Acid","shred leech"],
  "Victreebel":["Snap Trap","execute snare bloom"],
  "Dratini":["Coiling Tail","snare rush gale"],
  "Dragonair":["Orb of Calm","heal veil spark"],
  "Chikorita":["Soothing Leaf","heal"],
  "Bayleef":["Spiceleaf Rally","heal rally tide"],
  "Meganium":["Spring Bloom","heal tide cleanse veil"],
  "Cyndaquil":["Backfire Burst","burn blink"],
  "Quilava":["Cinder Roll","burn rush rally"],
  "Typhlosion":["Caldera Eruption","burn spread"],
  "Totodile":["Snapjaw","sunder leech"],
  "Croconaw":["Serrated Bite","wound sunder gale"],
  "Feraligatr":["Undertow Jaws","execute gale volley"],
  "Crobat":["Four-Wing Ambush","execute blink wound"],
  "Mareep":["Fleece Static","spark weaken"],
  "Flaaffy":["Wool Coil","spark snare rush"],
  "Ampharos":["Beacon Discharge","spread spark rush"],
  "Azurill":["Tail Bounce","shield blink"],
  "Marill":["Buoyant Bubble","shield gale"],
  "Azumarill":["Bubble Breaker","shield sunder gale"],
  "Hoppip":["Cotton Drift","blink veil"],
  "Skiploom":["Sunlift Spores","heal bloom"],
  "Jumpluff":["Floatseed Squall","gale spread cleanse"],
  "Horsea":["Ink Jet","weaken blink gale"],
  "Seadra":["Spine Spray","wound volley"],
  "Kingdra":["Deepwater Vortex","gale shred"],
  "Happiny":["Pocket Stone Gift","cover spark"],
  "Chansey":["Soft-Boiled Share","heal cleanse veil"],
  "Blissey":["Blissful Egg Basket","heal tide veil spark"],
  "Larvitar":["Ore Crunch","sunder thorn"],
  "Pupitar":["Pressurized Shell","shield quake thorn"],
  "Treecko":["Branch Skitter","rush blink"],
  "Grovyle":["Canopy Slash","execute rally"],
  "Sceptile":["Forest Blade Rush","execute rush"],
  "Torchic":["Chick Ember","burn spark"],
  "Combusken":["Double Kick Flare","burn sunder rally"],
  "Blaziken":["Blazing Heel","burn execute"],
  "Mudkip":["Mudfin Push","gale weaken"],
  "Marshtomp":["Marsh Stomp","quake sunder gale"],
  "Swampert":["Delta Breaker","shield quake sunder"],
  "Wurmple":["Silk Trail","snare blink"],
  "Silcoon":["Silken Cocoon","shield veil"],
  "Beautifly":["Sunwing Nectar","leech bloom"],
  "Cascoon":["Bristled Cocoon","shield thorn wound"],
  "Dustox":["Moonmoth Powder","spread weaken wound"],
  "Lotad":["Lilypad Canopy","cover cleanse"],
  "Lombre":["Pondside Prank","sap rush"],
  "Ludicolo":["Rain Rhythm","heal tide spark bloom"],
  "Seedot":["Acorn Drop","quake blink"],
  "Nuzleaf":["Leaf Whistle","snare weaken"],
  "Shiftry":["Tengu Fanstorm","gale spread shred"],
  "Ralts":["Empathic Pulse","heal spark bloom"],
  "Kirlia":["Mirror Pirouette","blink spark"],
  "Gallade":["Twin Elbow Blades","execute sunder"],
  "Slakoth":["Lazy Yawn","snare bloom"],
  "Vigoroth":["Restless Rake","rush rally"],
  "Slaking":["Lazy King's Slam","quake execute"],
  "Whismur":["Startled Squeak","gale snare rally"],
  "Loudred":["Speaker Stomp","quake spread rally"],
  "Exploud":["Overdrive Roar","gale spread weaken"],
  "Aron":["Iron Ore Headbutt","thorn sunder shield"],
  "Lairon":["Ironback Brace","shield thorn rally"],
  "Aggron":["Mountain Bastion","fortify thorn tide"],
  "Trapinch":["Sand Pit","snare sunder quake"],
  "Vibrava":["Wing Resonance","spread sap"],
  "Flygon":["Desert Mirage","gale blink"],
  "Spheal":["Snowball Roll","shield frost gale"],
  "Sealeo":["Ice Juggle","volley frost"],
  "Walrein":["Tusk Glacier","shield frost gale weaken"],
  "Bagon":["Cliffbound Headbutt","rush sunder gale"],
  "Shelgon":["Dreaming Carapace","shield bloom gale"],
  "Salamence":["First Flight Assault","gale execute rally"],
  "Beldum":["Magnetic Ram","rush thorn shield"],
  "Metang":["Twin-Core Grip","snare thorn"],
  "Turtwig":["Sapling Guard","shield bloom leech"],
  "Grotle":["Grove Shelter","cover thorn"],
  "Torterra":["Continental Bulwark","fortify bloom"],
  "Chimchar":["Ember Feint","burn blink rally"],
  "Monferno":["Flare Knuckle","burn rally weaken"],
  "Infernape":["Crownflame Combo","burn rush rally spread"],
  "Piplup":["Proud Bubble","volley shield"],
  "Prinplup":["Crested Wing Strike","sunder gale volley"],
  "Empoleon":["Trident Tide","volley thorn gale"],
  "Starly":["Flock Peck","rush volley rally"],
  "Staravia":["Aerial Feint","gale rush"],
  "Staraptor":["Brave Dive","execute recoil"],
  "Shinx":["Flash Pounce","spark rush volley"],
  "Luxio":["Spark Fang","snare sunder spark"],
  "Luxray":["X-Ray Pursuit","execute shred spark"],
  "Budew":["Dewdrop Remedy","heal cleanse spark"],
  "Roselia":["Rose Thorn Hex","wound shred"],
  "Roserade":["Bouquet Masquerade","spread wound shred"],
  "Gible":["Sandfin Bite","rush wound gale"],
  "Gabite":["Cavern Rake","sunder rush rally"],
  "Garchomp":["Sandjet Dive","gale execute sunder"],
  "Magnezone":["Tri-Magnet Lock","snare shred spark"],
  "Rhyperior":["Rock Wrecker","sunder quake spread"],
  "Elekid":["Dynamo Spin","spark rush sap"],
  "Electabuzz":["Thunder Knuckle","snare rally"],
  "Electivire":["Livewire Twin Tail","volley spark execute"],
  "Magby":["Cinder Sneeze","burn"],
  "Magmar":["Kiln Breath","burn weaken rush"],
  "Magmortar":["Twin Furnace Cannon","burn volley"],
  "Togepi":["Shell of Good Luck","cover spark veil"],
  "Togetic":["Joy Dust","heal tide bloom"],
  "Togekiss":["Blessing of Peace","fortify cleanse"],
  "Swinub":["Snow Snout","frost rush"],
  "Piloswine":["Permafrost Tusk","frost sunder"],
  "Mamoswine":["Mammoth Avalanche","frost quake spread"],
  "Porygon":["Polygon Probe","sap shred rally"],
  "Porygon2":["Round-Trip Restore","bloom cleanse"],
  "Porygon-Z":["Glitch Protocol","spread spark sap"],
  "Duskull":["One-Eyed Hex","sap weaken leech"],
  "Dusclops":["Hollow Draw","leech snare sap"],
  "Dusknoir":["Spirit Gate","sap leech spread"],
  "Snivy":["Vine Rebuke","rush shred"],
  "Servine":["Serpent Feint","blink snare bloom"],
  "Serperior":["Royal Coil","snare sap shred"],
  "Tepig":["Coal Snort","burn rush spread"],
  "Pignite":["Furnace Shoulder","burn sunder rush"],
  "Emboar":["Infernal Suplex","burn gale execute"],
  "Oshawott":["Scalchop Parry","shield rush"],
  "Dewott":["Dual Scalchop","volley sunder"],
  "Samurott":["Shellblade Draw","execute sunder rush"],
  "Lillipup":["Scrappy Sniff","rush rally thorn"],
  "Herdier":["Loyal Stand","shield veil rally"],
  "Stoutland":["Rescue Trail","heal cleanse rally"],
  "Roggenrola":["Cavern Echo","quake thorn"],
  "Gigalith":["Crystal Solar Burst","spread shred thorn"],
  "Timburr":["Timber Swing","gale sunder rally"],
  "Gurdurr":["Girder Brace","shield rally sunder"],
  "Conkeldurr":["Concrete Pillar Crash","quake sunder rally"],
  "Tympole":["Ripple Hum","snare spark gale"],
  "Palpitoad":["Mudwave Bass","quake weaken gale"],
  "Seismitoad":["Faultline Chorus","quake spread frost gale"],
  "Sewaddle":["Leaf-Stitch Mend","heal bloom veil"],
  "Swadloon":["Leaf Quilt","cover veil cleanse"],
  "Leavanny":["Silken Tailor","fortify cleanse thorn"],
  "Venipede":["Toxic Roll","wound rush snare"],
  "Whirlipede":["Venom Wheel","shield wound snare"],
  "Scolipede":["Centipede Stampede","wound volley rush"],
  "Sandile":["Dune Snap","execute blink quake"],
  "Krokorok":["Sand Sentinel","sunder veil"],
  "Krookodile":["Crocodile Lockdown","execute snare sunder"],
  "Gothita":["Starry Stare","sap snare veil"],
  "Gothorita":["Starlight Marionette","sap gale"],
  "Gothitelle":["Fate Threads","snare sap spread"],
  "Solosis":["Cell Membrane","shield bloom sap"],
  "Duosion":["Split Thought","volley sap shred"],
  "Reuniclus":["Psychic Gel Crush","spread shred bloom"],
  "Vanillite":["Snowcone Puff","frost"],
  "Vanillish":["Soft-Serve Squall","frost gale weaken"],
  "Vanilluxe":["Double Blizzard","frost volley spread"],
  "Klink":["Gear Mesh","rally thorn"],
  "Klang":["Double Gear Grind","volley sunder thorn"],
  "Klinklang":["Overclocked Gearwheel","rally spark sunder"],
  "Tynamo":["Shoal Spark","spark rush veil"],
  "Eelektrik":["Coil Current","snare leech spark"],
  "Eelektross":["Lamprey Discharge","volley leech spark"],
  "Litwick":["Wick Siphon","leech burn"],
  "Lampent":["Lantern Toll","sap burn leech"],
  "Chandelure":["Soulfire Chandelier","burn leech spread"],
  "Axew":["Growing Tusk","sunder rush spread"],
  "Fraxure":["Tusk Shear","sunder wound rally"],
  "Haxorus":["Axe-Tusk Cleave","execute sunder spread"],
  "Deino":["Blind Chomp","execute rush sap"],
  "Zweilous":["Duelling Jaws","volley wound sap"],
  "Hydreigon":["Triple Maw Barrage","volley spread weaken"],
  "Chespin":["Chestnut Guard","shield thorn bloom"],
  "Quilladin":["Quill Ball","gale thorn"],
  "Chesnaught":["Spiked Bastion","fortify thorn allyHaste"],
  "Fennekin":["Earflame Flash","burn blink rush"],
  "Braixen":["Twig Torch","burn spark rally"],
  "Delphox":["Oracle Flame","burn sap shred"],
  "Froakie":["Foam Decoy","blink snare gale"],
  "Frogadier":["Foam Pellet Ambush","volley blink"],
  "Greninja":["Water Shuriken Barrage","volley rush execute"],
  "Fletchling":["Robin Dash","rush gale rally"],
  "Fletchinder":["Ember Glide","burn gale rally"],
  "Talonflame":["Gale Flame Dive","burn execute recoil"],
  "Scatterbug":["Powder Trail","weaken blink snare"],
  "Spewpa":["Powder Cocoon","shield snare"],
  "Vivillon":["Patterned Powder","spread snare cleanse"],
  "Flabébé":["First Flower Gift","heal spark allyHaste"],
  "Floette":["Flower Wish","heal veil allyHaste"],
  "Florges":["Garden Sanctuary","fortify tide"],
  "Honedge":["Haunted Blade","leech sunder thorn"],
  "Doublade":["Crossed Spectral Blades","volley thorn shield"],
  "Aegislash":["Royal Shield Stance","shield thorn weaken"],
  "Goomy":["Slime Bubble","weaken veil gale"],
  "Sliggoo":["Slime Armor","shield bloom rally"],
  "Goodra":["Dragon Sap Shelter","cover bloom"],
  "Rowlet":["Silent Leaf Quill","volley blink bloom"],
  "Dartrix":["Quill Flourish","volley rally"],
  "Decidueye":["Spirit Quill Snare","snare execute leech"],
  "Litten":["Furball Flame","burn rush wound"],
  "Torracat":["Bellflame Pounce","burn rally wound"],
  "Incineroar":["Wrestler's Lariat","gale sunder execute burn"],
  "Popplio":["Balloon Salve","heal veil ward"],
  "Brionne":["Bubble Step","heal rally veil"],
  "Primarina":["Sea Aria","heal tide spark cleanse"],
  "Grubbin":["Pincer Current","sunder spark"],
  "Charjabug":["Battery Pack","cover spark cleanse"],
  "Vikavolt":["Railbolt","volley shred spark"],
  "Bounsweet":["Sweet Scent","weaken bloom"],
  "Steenee":["Aromatic Heel","rush weaken"],
  "Tsareena":["Royal Heel","execute rush weaken"],
  "Jangmo-o":["Clanging Scale","thorn quake gale"],
  "Hakamo-o":["Scale Dance","thorn rally gale"],
  "Kommo-o":["Clangorous Chorus","spread rally thorn"],
  "Cosmog":["Nebula Shelter","cover tide"],
  "Cosmoem":["Stillpoint Shell","fortify allyHaste"],
  "Solgaleo":["Solar Mane Charge","rush sunder spread sap"],
  "Lunala":["Moongeist Sweep","spread shred sap snare"],
  "Grookey":["Rhythm Stick","spark rally bloom"],
  "Thwackey":["Twin-Beat Rally","rally spark leech"],
  "Rillaboom":["Canopy Drumline","quake spread spark"],
  "Scorbunny":["Scorching Kickoff","burn rush execute"],
  "Raboot":["Ember Footwork","burn blink rush rally"],
  "Cinderace":["Pyro Orb Strike","burn volley execute"],
  "Sobble":["Tearscreen","weaken blink volley"],
  "Drizzile":["Water Trap","snare blink volley"],
  "Inteleon":["Hidden Scope","execute shred rush"],
  "Rookidee":["Scrappy Peck","rush"],
  "Corvisquire":["Stone Tool Drop","gale sunder blink"],
  "Corviknight":["Ironwing Escort","cover thorn veil"],
  "Blipbug":["Antenna Scan","sap weaken snare"],
  "Dottler":["Radar Shell","shield spark"],
  "Orbeetle":["Gravity Disc","quake snare spread"],
  "Hatenna":["Quiet Signal","heal veil tide bloom"],
  "Hattrem":["Hush Sweep","gale snare shred"],
  "Hatterene":["Silent Room","quake weaken sap"],
  "Impidimp":["Prank Swipe","sap rush weaken"],
  "Morgrem":["False Surrender","blink execute sap"],
  "Grimmsnarl":["Living Hair Bind","snare sunder weaken"],
  "Zigzagoon":["Zigzag Rush","blink rush rally"],
  "Linoone":["Straight-Line Chase","rush execute rally"],
  "Obstagoon":["Cross-Arm Obstruction","shield thorn sunder sap"],
  "Dreepy":["Drift Dart","volley blink gale"],
  "Drakloak":["Guardian Dart","volley veil"],
  "Dragapult":["Twin Dreepy Darts","volley execute rush gale"],
  "Teddiursa":["Honey Swipe","leech bloom rally"],
  "Ursaring":["Crescent Claw","sunder wound rally rush"],
  "Ursaluna":["Peatland Breaker","quake shield sunder thorn"],
  "Sprigatito":["Catmint Feint","blink rush bloom"],
  "Floragato":["Bud Yo-Yo","snare rush bloom"],
  "Meowscarada":["Flower Trick","execute spread blink"],
  "Fuecoco":["Pepper Ember","burn bloom"],
  "Crocalor":["Eggfire Guard","shield burn"],
  "Skeledirge":["Torch Song Finale","burn spread rally weaken"],
  "Quaxly":["Dapper Step","rush cleanse"],
  "Quaxwell":["Torrent Footwork","rally gale"],
  "Quaquaval":["Carnival Kick","volley rally gale"],
  "Pawmi":["Palm Static","spark snare volley"],
  "Pawmo":["Double Palm Shock","volley spark"],
  "Pawmot":["Revival Pulse","heal spark cleanse veil"],
  "Smoliv":["Bitter Oil Splash","weaken blink bloom"],
  "Dolliv":["Olive Gift","heal tide allyHaste"],
  "Arboliva":["Orchard Haven","heal tide cleanse bloom"],
  "Nacli":["Salt Rub","bloom thorn sunder"],
  "Naclstack":["Salt Block Wall","cover thorn spark"],
  "Garganacl":["Salt Cure","wound weaken thorn"],
  "Tinkatink":["Scrap Hammer","sunder rush veil"],
  "Tinkatuff":["Forged Hammer","gale sunder veil"],
  "Tinkaton":["Gigaton Hammer","quake sunder windup"],
  "Mankey":["Tantrum Swing","rally rush quake"],
  "Primeape":["Frenzy Fist","rally execute sunder"],
  "Annihilape":["Rage Fist","execute leech weaken"],
 };
 const signaturePowerByTier=[[90,150,245],[105,175,280],[120,200,320],[135,225,365],[150,255,420]];
 const signatureColors={
  Grass:'#8af47b',Fire:'#ff8146',Water:'#6de1ff',Electric:'#ffe15b',Bug:'#d1fa77',
  Normal:'#fff0cc',Flying:'#b5d9ff',Dark:'#bf91ff',Rock:'#ecba77',Ground:'#f3a764',
  Psychic:'#ff91dc',Fighting:'#ff595e',Ghost:'#bd79ff',Poison:'#ea7efa',
  Fairy:'#ffb7e3',Ice:'#adf9ff',Dragon:'#9890ff',Steel:'#e1ecff'
 };
 const signatureEffects={
  Bulbasaur:'sunder sap',
  Charmander:'rally burn',
  Squirtle:'teamShield',
  Pikachu:'rush snare',
  Caterpie:'snare sap',
  Rattata:'execute leech',
  Pidgey:'volley gale',
  Zubat:'leech weaken',
  Geodude:'shield sunder',
  Sandshrew:'sunder rush',
  Oddish:'sap bloom',
  Abra:'sap blink',
  Machop:'rally sunder',
  Gastly:'weaken spread',
  Eevee:'rally blink',
  Ivysaur:'volley thorn',
  Charmeleon:'burn sunder',
  Wartortle:'cover',
  Raichu:'volley snare',
  Pidgeotto:'gale execute',
  Golbat:'shield spread',
  Graveler:'spread wound',
  Machoke:'snare sunder',
  Kadabra:'sap shred',
  Haunter:'weaken blink',
  Vulpix:'burn sap',
  Psyduck:'snare shred',
  Magnemite:'shred spark',
  Growlithe:'rally leech',
  Ninetales:'burn weaken',
  Golduck:'volley sap',
  Magneton:'shred spread',
  Arcanine:'burn rush',
  Clefable:'heal cleanse',
  Scyther:'volley rush',
  Pinsir:'snare execute',
  Rhydon:'sunder spread',
  Hypno:'sap weaken',
  Lapras:'heal frost',
  Jolteon:'rush spark',
  Vaporeon:'heal tide',
  Flareon:'burn rally leech',
  Leafeon:'thorn rush',
  Glaceon:'frost spread',
  Venusaur:'thorn bloom',
  Charizard:'burn spread rally',
  Blastoise:'fortify',
  Alakazam:'sap spread shred',
  Machamp:'rally spread sunder',
  Golem:'shield thorn',
  Gengar:'execute blink',
  Snorlax:'shield bloom',
  Dragonite:'rally spark',
  Tyranitar:'spread sunder weaken',
  Gardevoir:'snare spread',
  Metagross:'shield rally',
  Espeon:'shred execute',
  Umbreon:'weaken veil',
  Sylveon:'heal rally',
  Regice:'shield frost',
  Regirock:'shield quake',
  Registeel:'shield cleanse',
  Articuno:'frost gale',
  Zapdos:'spread spark',
  Moltres:'burn gale',
  Mewtwo:'sap execute',
  Lugia:'aegis',
  'Ho-Oh':'burn cleanse',
  Rayquaza:'volley gale rush',
  Raikou:'spark snare',
  Entei:'rally burn execute',
  Suicune:'heal veil',
  Kyogre:'tide spread',
  Groudon:'quake sunder',
  Rhyhorn:'rush quake',
  Boldore:'thorn frost',
 };
 const signatureEffectText={
  shield:'Shields itself for 20% / 30% / 45% of max HP for 5 seconds.',
  teamShield:'Shields every living ally for the listed amount for 5 seconds.',
  rally:'Gains 15% / 25% / 40% attack speed for 5 seconds.',
  execute:'Deals 25% / 40% / 60% more damage against targets below half HP.',
  volley:'Hits the target and the nearest other enemy within 2 tiles of it for 30% / 45% / 60% splash damage.',
  burst:'Deals concentrated damage to one enemy.',
  heal:'Heals the two living allies with the lowest HP percentage for 10% / 16% / 25% of their max HP.',
  snare:'Hits and delays the target’s next action by 0.5 / 0.75 / 1 second.',
  weaken:'Hits and reduces the target’s damage by 15% / 25% / 35% for 4 seconds.'
 };
 const extraSignatureText={
  recoil:'After a damaging hit, loses 8% / 10% / 12% of its own max HP.',
  brace:'Shields itself for 20% / 30% / 45% of max HP for 5 seconds.',
  windup:'Takes an extra half-second to recover after swinging.',
  allyHaste:'Gives the weakest teammate an attack-speed boost for 5 seconds.',
  ward:'The next hit against the weakest teammate is blocked.',
  sunder:'Reduces the target’s DEF by 30% for 4 seconds.',shred:'Reduces the target’s S.DEF by 30% for 4 seconds.',
  sap:'Drains 8 / 12 / 18 mana from the target.',burn:'Burns for 1% max HP per second and Wounds for 5 seconds.',
  rush:'Shortens the caster’s next attack cooldown by 20% / 30% / 45%.',leech:'Heals the caster for 20% / 30% / 45% of damage dealt.',
  gale:'Pushes the target away from the caster.',spread:'Deals 18% / 26% / 38% splash damage to other enemies within 1.5 tiles.',
  bloom:'Heals the caster for 8% / 12% / 18% of missing HP.',blink:'Repositions away from the nearest enemy after casting.',
  thorn:'Grants the caster 15 / 25 / 40 DEF and S.DEF for 4 seconds.',
  wound:'Reduces healing received by the target by 33% for 6 seconds.',
  spark:'Gives 8 / 12 / 18 mana to the ally with the highest current mana.',
  cleanse:'Clears Burn, Wound, Sunder, Shred and damage reduction from the caster and its nearest teammate.',
  frost:'Slows the target’s attack speed for 4 seconds.',tide:'Heals all living allies for 3% / 5% / 8% of their max HP.',
  veil:'Grants the caster and weakest ally 15% / 22% / 30% attack damage reduction for 4 seconds.',
  quake:'Delays all enemies near the caster by 0.3 / 0.5 / 0.8 seconds.',
  cover:'Shields the weakest ally for the listed amount and the caster for half that amount.',
  fortify:'Shields up to 3 allies nearest the caster for the listed amount.',
  aegis:'Shields backline allies and the caster for the listed amount and clears their damage-over-time effects.'
 };
 const utilitySignature=effect=>['teamShield','heal','cover','fortify','aegis','brace'].includes(effect);
 const roleProfiles={
  Tank:{range:1,hp:1.32,attack:.76,defense:1.25,speed:.82,mana:5,regen:0,rule:'5 mana per hit and 5 when damaged. Draws aggro at equal range.'},
  Fighter:{range:1,hp:1.08,attack:1.03,defense:1.02,speed:1,mana:10,regen:0,rule:'10 mana per hit. Gains 5% attack speed per stage, up to 30%.'},
  Reaper:{range:1,hp:.9,attack:1.18,defense:.91,speed:1.15,mana:10,regen:0,rule:'10 mana per hit. Prioritizes backline damage dealers and takes 15% less attack damage from other enemies.'},
  Caster:{range:3,hp:.86,attack:1.06,defense:.87,speed:.90,mana:7,regen:2,rule:'7 mana per hit and 2 mana per second.'},
  Carry:{range:4,hp:.85,attack:1.13,defense:.84,speed:1.14,mana:10,regen:0,rule:'10 mana per hit. Long range for backline positioning.'},
  Specialist:{range:2,hp:1.02,attack:1.02,defense:1.03,speed:.98,mana:6,regen:3,rule:'6 mana per hit and 3 mana per second.'}
 };
 const specialists={
  Caterpie:{hit:8,incoming:4,rule:'Silk Charge: 8 per hit and 4 when damaged.'},
  Clefable:{regen:6,rule:'Moonlight: regenerates 6 mana per second.'},
  Umbreon:{incoming:10,hit:3,rule:'Moon Charge: 10 mana when damaged and 3 per basic attack.'},
  Rayquaza:{hit:6,travel:3,rule:'Sky Charge: 6 per hit and 3 per movement step.'}
 };
 const roleGroups={
  Tank:['Squirtle','Wartortle','Blastoise','Geodude','Graveler','Golem','Magnemite','Magneton','Lapras','Snorlax','Regice','Regirock','Registeel','Lugia','Rhyhorn','Boldore'],
  Fighter:['Charmander','Charmeleon','Charizard','Machop','Machoke','Machamp','Sandshrew','Arcanine','Rhydon','Flareon','Tyranitar','Metagross','Entei','Groudon','Growlithe','Dragonite','Ho-Oh','Pinsir'],
  Reaper:['Rattata','Zubat','Golbat','Eevee','Pidgey','Pidgeotto','Scyther','Leafeon','Gengar'],
  Caster:['Abra','Kadabra','Alakazam','Gastly','Haunter','Psyduck','Golduck','Hypno','Ninetales','Gardevoir','Espeon','Sylveon','Mewtwo','Bulbasaur','Ivysaur','Venusaur','Oddish','Suicune'],
  Carry:['Pikachu','Raichu','Vulpix','Jolteon','Vaporeon','Glaceon','Articuno','Zapdos','Moltres','Raikou','Kyogre']
 };
 const roles=new Map(Object.entries(roleGroups).flatMap(([role,names])=>names.map(name=>[name,role])));
 const channeledSignatures=new Set(['Glacial Aria','Lunar Chorus','Ribbon Resonance']);
 const rarities=new Map(roster.flatMap((names,index)=>names.map(name=>[name,index])));
 const roleFor=name=>roles.get(name) ?? (()=>{
  const [hp,atk,def,speed,spDef,spAtk]=dexStats[dex[name][0]-1];
  if((hp+def+spDef)/3>=87 && speed<88)return 'Tank';
  if(speed>=100)return spAtk>=atk?'Carry':'Reaper';
  return spAtk>=atk?'Caster':'Fighter';
 })();
 // Shop families keep their role through evolution, with every tier offering all six roles.
 const familyRoleGroups={
  Tank:["Squirtle","Geodude","Oddish","Azurill","Lotad","Rookidee","Honedge","Nacli","Blipbug","Duskull","Totodile","Aron","Spheal","Chespin","Magnemite","Rhyhorn","Mudkip","Teddiursa","Regice","Regirock","Registeel"],
  Fighter:["Charmander","Machop","Poliwag","Seedot","Bellsprout","Nidoran♀","Timburr","Bounsweet","Impidimp","Roggenrola","Tepig","Swinub","Litten","Grookey","Larvitar","Bagon","Beldum","Gible","Ho-Oh","Entei","Groudon"],
  Reaper:["Zubat","Pidgey","Eevee","Weedle","Venipede","Fletchling","Tinkatink","Zigzagoon","Trapinch","Snivy","Treecko","Froakie","Sprigatito","Chimchar","Fennekin","Mankey","Axew","Dreepy","Raikou","Suicune"],
  Caster:["Bulbasaur","Abra","Gastly","Ralts","Solosis","Grubbin","Mareep","Budew","Tynamo","Litwick","Oshawott","Piplup","Rowlet","Fuecoco","Porygon","Vanillite","Horsea","Magby","Deino","Mewtwo","Kyogre"],
  Carry:["Pichu","Scatterbug","Hoppip","Starly","Pawmi","Lillipup","Sewaddle","Nidoran♂","Sandile","Klink","Torchic","Scorbunny","Sobble","Cyndaquil","Elekid","Dratini","Jangmo-o","Slakoth","Articuno","Zapdos","Moltres"],
  Specialist:["Caterpie","Wurmple","Igglybuff","Cleffa","Whismur","Gothita","Tympole","Hatenna","Smoliv","Shinx","Chikorita","Turtwig","Popplio","Quaxly","Happiny","Togepi","Flabébé","Goomy","Cosmog","Lugia","Rayquaza"],
 };
 const familyRoles=new Map(Object.entries(familyRoleGroups).flatMap(([role,names])=>names.map(name=>[name,role])));
 const combatRole=name=>familyRoles.get(familyOf({name})) ?? (specialists[name]?'Specialist':roleFor(name));
 const roleDisplayName=role=>role==='Specialist'?'Support':role;
 const collectionTraits={
  'Marksmen':{role:'Carry',color:'#f6c779',tiers:[[2,{thirdShot:.25}],[4,{thirdShot:.50}],[6,{thirdShot:.80,volleyShot:.45}]]},
  'Spellcraft':{role:'Caster',color:'#e3afff',tiers:[[2,{castRefund:8}],[4,{castRefund:15}],[6,{castRefund:24,echo:1}]]},
  'Warband':{role:'Fighter',color:'#f39f88',tiers:[[2,{strikeHaste:.035}],[4,{strikeHaste:.06}],[6,{strikeHaste:.09,fullStackAmp:.22}]]},
  'Bulwark':{role:'Tank',color:'#9cd1ee',tiers:[[2,{startShield:.15}],[4,{startShield:.27}],[6,{startShield:.40,thresholdShield:.30}]]},
  'Ambush':{role:'Reaper',color:'#cbb4fa',tiers:[[2,{takedownHeal:.15}],[4,{takedownHeal:.26}],[6,{takedownHeal:.38,takedownHaste:5}]]},
  'Relay':{role:'Specialist',color:'#aee0a0',tiers:[[2,{relayMana:10}],[4,{relayMana:18}],[6,{relayMana:25,relayExtra:1}]]},
  'ILoveEevee':{color:'#d8a9dd',members:['Eevee','Vaporeon','Jolteon','Flareon','Espeon','Umbreon','Leafeon','Glaceon','Sylveon'],
   tiers:[[2,{health:.08,power:.08}],[4,{health:.14,power:.16,mana:10}],[6,{health:.22,power:.24,mana:15,regen:1}],[9,{health:.32,power:.36,mana:20,regen:2}]]},
  'Sun Garden':{color:'#ecd76c',members:['Jumpluff','Leavanny','Bellossom','Lilligant','Tsareena'],tiers:[[1,{regen:1}],[2,{health:.16,regen:2}],[3,{health:.24,regen:3}]]},
  'Spore Garden':{color:'#ba8ad7',members:['Victreebel','Arboliva','Vileplume','Venusaur','Amoonguss','Roserade'],tiers:[[1,{spAttack:8}],[2,{spAttack:18,power:.10}],[3,{spAttack:30,power:.16}]]},
  'Marsh Guard':{color:'#67b4cc',members:['Nidoqueen','Nidoking','Poliwrath','Swampert','Seismitoad'],tiers:[[1,{defense:10}],[2,{defense:24,health:.15}]]},
  'Rain Chorus':{color:'#85c5fa',members:['Politoed','Ludicolo','Primarina'],tiers:[[1,{mana:8}],[2,{mana:16,regen:1}],[3,{mana:22,regen:2}]]},
  'Daybreak Wings':{color:'#ffce72',members:['Beautifly','Butterfree','Vivillon','Talonflame'],tiers:[[1,{speed:.06}],[2,{speed:.16,crit:.10}]]},
  'Night Wings':{color:'#b7a1ed',members:['Dustox','Crobat','Chandelure','Gengar','Grimmsnarl','Dusknoir'],tiers:[[2,{spDefense:12}],[4,{spDefense:24,regen:1}],[6,{spDefense:40,regen:3}]]},
  'Mind Ward':{color:'#e3a1d1',members:['Gothitelle','Orbeetle','Gardevoir','Alakazam','Reuniclus','Hatterene'],tiers:[[1,{mana:8}],[2,{mana:16,spAttack:14}],[3,{mana:24,spAttack:22}]]},
  'Blade Guard':{color:'#e3b599',members:['Gallade','Aegislash','Ceruledge','Tinkaton'],tiers:[[1,{attackPct:.08}],[2,{attackPct:.16,defense:15}],[3,{attackPct:.24,defense:25}]]},
  'Solar Heralds':{color:'#ffd188',members:['Magmortar','Solgaleo','Groudon','Ho-Oh'],tiers:[[1,{health:.08}],[2,{health:.18,defense:20}],[3,{health:.24,defense:32}]]},
  'Lunar Heralds':{color:'#aaaeff',members:['Lunala','Lugia','Mewtwo'],tiers:[[1,{regen:1}],[2,{regen:2,spAttack:22}],[3,{regen:3,spAttack:32}]]},
  'Ancient Dragons':{color:'#a5a0ef',members:['Haxorus','Kingdra','Dragonite','Salamence','Garchomp','Hydreigon','Goodra','Kommo-o','Dragapult','Baxcalibur'],tiers:[[2,{health:.12,power:.10}],[4,{health:.22,power:.21}],[6,{health:.30,power:.30,regen:1}]]},
  'Steel Foundry':{color:'#bbcdd1',members:['Aggron','Magnezone','Metagross','Klinklang','Corviknight','Tinkaton'],tiers:[[2,{armor:15,spDefense:15}],[4,{armor:28,spDefense:28,health:.15}]]},
  'Aura Guardians':{color:'#9ac5ed',members:['Clefable','Gallade','Gardevoir','Togekiss','Blastoise'],tiers:[[2,{mana:10,defense:10}],[3,{mana:18,defense:18}]]},
  'Johto Partners':{families:['Chikorita','Cyndaquil','Totodile'],color:'#d9b7a0',
   tiers:[[2,{health:.08}],[3,{health:.14,thresholdGuard:1}]]},
  'Hoenn Partners':{families:['Treecko','Torchic','Mudkip'],color:'#83cbaa',
   tiers:[[2,{regen:1}],[3,{regen:1,echo:1}]]},
  'Sinnoh Partners':{families:['Turtwig','Chimchar','Piplup'],color:'#a6d4ef',
   tiers:[[2,{startShield:.12}],[3,{startShield:.18,thresholdShield:.15}]]},
  'Unova Partners':{families:['Snivy','Tepig','Oshawott'],color:'#d2bbe9',
   tiers:[[2,{hitStack:.008}],[3,{hitStack:.014}]]},
  'Kalos Partners':{families:['Chespin','Fennekin','Froakie'],color:'#e9aacc',
   tiers:[[2,{relayMana:5}],[3,{relayMana:10,mana:8}]]},
  'Alola Partners':{families:['Rowlet','Litten','Popplio'],color:'#efcd8b',
   tiers:[[2,{castRefund:5}],[3,{castRefund:12}]]},
  'Galar Partners':{families:['Grookey','Scorbunny','Sobble'],color:'#bde29f',
   tiers:[[2,{thirdShot:.14}],[3,{thirdShot:.25,speed:.06}]]},
  'Paldea Partners':{families:['Sprigatito','Fuecoco','Quaxly'],color:'#efaa89',
   tiers:[[2,{vamp:.06}],[3,{vamp:.14,healthyGuard:.08}]]},
  'Tower Duo':{members:['Lugia','Ho-Oh'],color:'#f1c873',tiers:[[2,{towerWard:.12}]]},
  'Regi-Trio':{color:'#b2c3cc',members:['Regice','Regirock','Registeel'],tiers:[[3,{health:.18,power:.18,defense:24,mana:15,regen:2,focusArmor:12}]]},
  'Kanto Partners':{color:'#91cf81',members:['Venusaur','Charizard','Blastoise'],tiers:[[3,{health:.16,power:.16,defense:12,thresholdShield:.20}]]},
  'Legendary Birds':{color:'#e4c268',members:['Articuno','Zapdos','Moltres'],tiers:[[3,{power:.20,mana:20,regen:1,thirdShot:.30}]]},
  'Legendary Beasts':{color:'#d69775',members:['Raikou','Entei','Suicune'],tiers:[[3,{health:.18,power:.18,mana:15,takedownHaste:5}]]},
  'Overcharge':{color:'#ffe071',members:['Raichu','Pawmot','Ampharos','Vikavolt','Eelektross','Luxray','Electivire'],tiers:[[2,{chainTargets:2}],[4,{chainTargets:3}],[6,{chainTargets:4}]]},
  'Sandstorm':{color:'#d6b57f',members:['Golem','Gigalith','Garganacl','Krookodile','Flygon','Rhyperior','Tyranitar'],tiers:[[2,{sandstorm:.015,defense:15}],[4,{sandstorm:.03,defense:30}],[6,{sandstorm:.05,defense:50}]]},
  'Guts':{color:'#f39c85',members:['Machamp','Conkeldurr','Obstagoon','Annihilape','Ursaluna','Flareon'],tiers:[[2,{gutsPower:.30,gutsVamp:.15}],[4,{gutsPower:.60,gutsVamp:.25}]]},
  'Gale Force':{color:'#b6dfed',members:['Pidgeot','Staraptor','Shiftry','Exploud','Stoutland'],tiers:[[2,{galeDamage:.12}],[4,{galeDamage:.22}]]},
  'Fairy Ring':{color:'#f3b7d8',members:['Azumarill','Wigglytuff','Blissey','Florges'],tiers:[[2,{fairyPower:.15}],[4,{fairyPower:.30}]]},
  'Permafrost':{color:'#9fdeff',members:['Mamoswine','Walrein','Vanilluxe'],tiers:[[2,{chillSlow:.25,chillCrit:.20}],[3,{chillSlow:.40,chillCrit:.40}]]},
  'Toxic Swarm':{color:'#c1e080',members:['Beedrill','Scolipede'],tiers:[[2,{toxicSwarm:.015}]]},
  'Glitch':{color:'#b9a5ff',members:['Porygon-Z'],tiers:[[1,{glitch:1}]]},
  'Truant':{color:'#dfb889',members:['Slaking'],tiers:[[1,{truant:1}]]},
  'Genetic Apex':{color:'#ceacf2',members:['Mewtwo'],tiers:[[1,{geneticApex:1}]]},
  'Air Lock':{color:'#9fdcbe',members:['Rayquaza'],tiers:[[1,{airLock:1}]]},
  'Tailwind':{color:'#a9e6ed',members:['Pidgeot','Staraptor','Jumpluff','Talonflame','Crobat','Flygon','Dragonite'],tiers:[[2,{travelMana:2,moveSpeed:.15}],[4,{travelMana:4,moveSpeed:.30}],[6,{travelMana:7,moveSpeed:.50}]]},
  'Technician':{color:'#efcf9d',members:['Beedrill','Pawmot','Leavanny','Haxorus'],tiers:[[2,{techRepeat:.50}],[4,{techRepeat:.75}]]},
  'Colossus':{color:'#b6b5c9',members:['Golem','Rhyperior','Garganacl','Gigalith','Ursaluna','Mamoswine','Tyranitar'],tiers:[[2,{health:.15,colossusSlam:.04}],[4,{health:.30,colossusSlam:.07}],[6,{health:.50,colossusSlam:.12}]]},
  'Prankster':{color:'#baa2eb',members:['Gengar','Grimmsnarl','Whimsicott','Chandelure'],tiers:[[2,{mana:25,prankLock:1.5}],[4,{mana:45,prankLock:2.5}]]},
  'Starter Squad':{derived:true,color:'#f4d591',tiers:[[3,{squadVamp:.05,squadMana:5}],[6,{squadVamp:.12,squadMana:12}],[9,{squadVamp:.22,squadMana:20}]]},
  'Rival Duo':{members:['Tyranitar','Garchomp','Alakazam','Gengar','Electivire','Magmortar'],color:'#f59c83',tiers:[[2,{rivalPulse:1}]]},
  'Weather Trio':{color:'#76bcb2',members:['Kyogre','Groudon','Rayquaza'],tiers:[[1,{weather:.015}],[2,{weather:.03}],[3,{weather:.06,weatherBreak:1}]]}
 };
 const playableForms=new Set([...roster.flat(),...Object.values(evolutionFamilies).flat(2)]);
 for(const trait of Object.values(collectionTraits))if(trait.members)trait.members=trait.members.filter(name=>playableForms.has(name));
 const traitsByName=new Map();
 function themesFor(name){
  if(!traitsByName.has(name))traitsByName.set(name,Object.entries(collectionTraits)
   .filter(([,trait])=>!trait.derived && (trait.role?trait.role===combatRole(name):trait.families?trait.families.includes(familyOf({name})):trait.members.includes(name)))
   .map(([label])=>label));
  return traitsByName.get(name);
 }
 const rivalPairs=[['Tyranitar','Garchomp'],['Alakazam','Gengar'],['Electivire','Magmortar']];
 const rivalFor=name=>rivalPairs.find(pair=>pair.includes(name))?.find(member=>member!==name);
 const unitTraits=unit=>{
  const innate=themesFor(unit.name).filter(name=>(name!=='Rival Duo' || unit.star===3) && (!unit.glitchRole || !collectionTraits[name].role));
  return new Set([...innate,...(unit.glitchRole?[unit.glitchRole]:[]),...(unit.items ?? []).map(item=>completedItems.get(item)?.trait).filter(Boolean)]);
 };
 const familyStock=[26,22,18,12,9];
 const benchLimit=9;
 const attackSlowdown=3;
 const overtimeStartMs=40000;
 const combatStepMs=115, combatTicks=Math.floor(60000/combatStepMs), combatDamageScale=.55;
 const maxLevel=9;
 const cells=Array.from({length:56},(_,i)=>({x:i%7,y:Math.floor(i/7)}));
 const levels=[0,0,4,8,12,16,24,32,40,Infinity];
 const makeTrainer=(name)=>({name,hp:100,gold:2,level:2,xp:0,units:[],shop:[],streak:0,items:[],augments:[],mods:{}});
 let run=null, planningTimer=null, dragged=null, draggedItem=null;
 const components={
  Claw:{attackPct:.10}, Wing:{speed:.10}, Orb:{spAttack:10}, Charm:{regen:1},
  Scale:{armor:20}, Shell:{spDefense:20}, Berry:{flatHP:150}, Lens:{crit:.20},
  Crest:{}, Totem:{}
 };
 const recipeKey=(a,b)=>[a,b].sort().join('+');
 const recipes={
  'Claw+Claw':['Razor Claws',{"attackPct":0.30,"amp":0.10}],
  'Claw+Wing':['Predator Pinion',{"attackPct":0.15,"speed":0.15,"tankAmp":0.15}],
  'Claw+Orb':['Aura Fang',{"attackPct":0.12,"spAttack":20,"allyHeal":0.15}],
  'Charm+Claw':['Spirit Talon',{"attackPct":0.15,"regen":1,"hitMana":5}],
  'Claw+Scale':['Night Carapace',{"attackPct":0.15,"defense":25,"thresholdGuard":1}],
  'Claw+Shell':['Drain Fang',{"attackPct":0.15,"spDefense":25,"vamp":0.15}],
  'Berry+Claw':['Bramble Fang',{"attackPct":0.15,"flatHP":220,"thresholdShield":0.30}],
  'Claw+Lens':['Truefang Lens',{"attackPct":0.15,"crit":0.25,"critDamage":0.15}],
  'Wing+Wing':['Cinder Pinions',{"speed":0.25,"burn":5}],
  'Orb+Wing':['Cyclone Core',{"speed":0.12,"spAttack":15,"rampSpeed":0.04}],
  'Charm+Wing':['Rift Feather',{"speed":0.15,"regen":1,"shred":5}],
  'Scale+Wing':['Meteor Plating',{"speed":0.12,"defense":25,"hitStack":0.02}],
  'Shell+Wing':['Storm Carapace',{"speed":0.15,"spDefense":25,"attackStack":0.035}],
  'Berry+Wing':['Nectar Quill',{"speed":0.15,"flatHP":180,"hitMana":2,"critMana":2}],
  'Lens+Wing':['Piercing Quill',{"speed":0.15,"crit":0.20,"sunder":3}],
  'Orb+Orb':['Prism Crown',{"spAttack":45,"amp":0.10}],
  'Charm+Orb':['Astral Battery',{"spAttack":18,"regen":1,"rampPower":12}],
  'Orb+Scale':['Halo Plate',{"spAttack":18,"defense":25,"startShield":0.25}],
  'Orb+Shell':['Dissonant Pearl',{"spAttack":18,"spDefense":25,"shredAura":1}],
  'Berry+Orb':['Scorchbloom',{"spAttack":18,"flatHP":180,"burn":10}],
  'Lens+Orb':['Prism Lens',{"spAttack":18,"crit":0.25,"critDamage":0.15}],
  'Charm+Charm':['Mystic Charm',{"mana":20,"regen":3,"attackPct":0.10,"spAttackPct":0.10}],
  'Charm+Scale':['Guardian Seal',{"mana":20,"defense":30,"thresholdShield":0.20,"thresholdMana":15}],
  'Charm+Shell':['Tidal Seal',{"regen":1,"spDefense":30,"manaRate":0.15}],
  'Berry+Charm':['Renewal Seed',{"regen":1,"flatHP":200,"missingHeal":0.02,"durability":0.05}],
  'Charm+Lens':['Twin-Tide Lens',{"regen":1,"crit":0.20,"stance":1}],
  'Scale+Scale':['Thorn Carapace',{"defense":50,"flatHP":120,"retaliate":30}],
  'Scale+Shell':['Bastion Shell',{"defense":25,"spDefense":25,"focusArmor":10}],
  'Berry+Scale':['Ember Husk',{"defense":25,"flatHP":220,"burnAura":1}],
  'Lens+Scale':['Ironwatch Lens',{"defense":25,"crit":0.20,"durability":0.08,"healthyGuard":0.08}],
  'Shell+Shell':['Pearl Bulwark',{"spDefense":55,"flatHP":120,"maxHeal":0.025}],
  'Berry+Shell':['Dusk Husk',{"spDefense":25,"flatHP":220,"sunderAura":1}],
  'Lens+Shell':['Jetstream Visor',{"spDefense":25,"crit":0.20,"rampSpeed":0.03}],
  'Berry+Berry':['Berry Satchel',{"flatHP":360,"health":0.18}],
  'Berry+Lens':['Wildgrowth Lens',{"flatHP":200,"crit":0.20,"critAmp":0.04}],
  'Lens+Lens':['Mirage Goggles',{"crit":0.25,"randomGear":1}],
 };
 const standardGear=Object.values(recipes).map(([name])=>name).filter(name=>name!=='Mirage Goggles');
 const ordinaryComponents=Object.keys(components).slice(0,8);
 for(const [catalyst,emblems] of [
  ['Crest',['Spore Garden','Daybreak Wings','Mind Ward','Rain Chorus','Steel Foundry','Night Wings','Sun Garden','Aura Guardians']],
  ['Totem',['Warband','Marksmen','Spellcraft','Relay','Bulwark','Ambush','Bulwark','Marksmen']]
 ]){
  ordinaryComponents.forEach((item,index)=>{
   const trait=emblems[index];
   const variant=catalyst==='Totem' && index>=6?' Banner':' Emblem';
   recipes[recipeKey(item,catalyst)]=[trait+variant,{...components[item]},trait];
  });
 }
 for(const [a,b,name] of [['Crest','Crest','Captain’s Crown'],['Totem','Totem','Captain’s Shield'],['Crest','Totem','Captain’s Banner']]){
  recipes[recipeKey(a,b)]=[name,{teamSize:1}];
 }
 const completedItems=new Map(Object.values(recipes).map(([name,stats,trait])=>[name,{stats,trait}]));
 const augments=[
  ['Opening Guard','Each ally blocks the first damaging hit it takes.','guard'],
  ['Echo Cast','Each ally’s first signature move hits again for 35% damage.','echo'],
  ['Second Wind','Each ally heals 12% max HP the first time it falls below half health and survives.','secondWind'],
  ['Overcharge','Each ally restores 10 mana after its first signature move.','overcharge'],
  ['Momentum','Each ally heals 8% max HP whenever it knocks out an opponent.','momentum'],
  ['Weather Surge','While Weather Trio is active, its storm deals an extra 1% of enemy max HP each second.','weatherSurge']
 ];
 const randomComponent=()=>drawRogueChoices(Object.keys(components),1)[0];
 const finalStage=18;
 const finalRound=4+(finalStage-1)*7;
 function stageRound(round){
  return round<=4?{stage:1,step:round}:{stage:2+Math.floor((round-5)/7),step:1+(round-5)%7};
 }
 const stageLabel=round=>{const {stage,step}=stageRound(round);return stage+'-'+step;};
 const openingRound=round=>round===1;
 const wildRound=round=>round>=2 && round<=4;
 const megaRound=round=>round>=5 && stageRound(round).step===7;
 const neutralRound=round=>wildRound(round) || megaRound(round);
 const augmentRound=round=>round===5;
 const carouselRound=round=>round>=5 && stageRound(round).step===4;
 const megaRewardTier=round=>Math.min(5,stageRound(round).stage);
 const megaBosses=[['Charizard','Mega Charizard X'],['Gengar','Mega Gengar'],['Rayquaza','Mega Rayquaza']];
 function grantAugment(trainer,augment){
  const [label,,effect]=augment;
  if(trainer.augments.includes(label))return;
  trainer.augments.push(label);
  trainer.mods[effect]=true;
 }
 function equip(trainer,unit,item){
  const items=unit.items ??= [];
  if(items.includes('Mirage Goggles'))return false;
  if(!Object.hasOwn(components,item)){if(items.length>=3 || item==='Mirage Goggles' && items.length)return false;items.push(item);return true;}
  const component=items.find(name=>Object.hasOwn(components,name));
  if(items.length>=3 && !component)return false;
  if(component){
   const recipe=recipes[recipeKey(component,item)];
   if(recipe[0]==='Mirage Goggles' && items.length>1)return false;
   items[items.indexOf(component)]=recipe[0];
  }else items.push(item);
  return true;
 }
 function itemBonuses(item){
  return components[item] ?? completedItems.get(item)?.stats ?? {};
 }
 function describeBonuses(bonuses){
  const labels={
   attackPct:'ATK',spAttackPct:'S.ATK',speed:'attack speed',crit:'crit chance',critDamage:'crit damage',
   amp:'damage amp',tankAmp:'damage against tanks',vamp:'omnivamp',manaRate:'mana gain',durability:'durability'
  };
  const effects={
   allyHeal:'Heals the lowest-health ally for 15% of damage dealt.',hitMana:' mana per basic attack.',critMana:' extra mana on a critical basic attack.',
   thresholdGuard:'Below 50% HP, blocks the next hit and clears Burn, Wound, Sunder and Shred once.',
   thresholdShield:' max HP shield below half health, once.',thresholdMana:' mana below half health, once.',
   burn:'Burns for 1% max HP per second and reduces healing by 33% for ',rampSpeed:' stacking attack speed per second.',
   shred:'Shreds 30% S.DEF for ',sunder:'Sunders 30% DEF for ',
   hitStack:' ATK and S.ATK per hit dealt or taken, up to 25 stacks.',
   attackStack:' ATK per basic attack, up to 15 stacks.',
   rampPower:' S.ATK every 5 seconds.',startShield:' max HP shield for the first 8 seconds.',
   shredAura:'Shreds 30% S.DEF within range 2.',sunderAura:'Sunders 30% DEF within range 2.',
   missingHeal:' missing HP healed each second.',maxHeal:' max HP healed every 2 seconds.',
   retaliate:' retaliation damage to adjacent attackers, once per 2 seconds.',
   focusArmor:' DEF and S.DEF per enemy targeting this Pokémon.',
   burnAura:'Every 2 seconds, burns and wounds a nearby enemy for 10 seconds.',
   healthyGuard:' extra durability above half health.',stance:'Above half HP, +20% ATK and S.ATK. Below half, +20% omnivamp.',
   critAmp:' stacking damage amp on critical hits until 5 seconds after the last crit.',
   randomGear:'Occupies all 3 slots. Rolls 2 completed items each fight.',
   teamSize:' maximum deployed Pokémon while equipped.'
  };
  const percentages=new Set(['thresholdShield','rampSpeed','hitStack','attackStack','startShield','missingHeal','maxHeal','healthyGuard','critAmp']);
  return Object.entries(bonuses).map(([stat,value])=>{
   if(labels[stat])return '+'+Math.round(value*100)+'% '+labels[stat];
   if(['burn','shred','sunder'].includes(stat))return effects[stat]+value+' seconds.';
   if(effects[stat])return /^[a-zA-Z]/.test(effects[stat])?effects[stat]:(percentages.has(stat)?Math.round(value*100)+'%':value)+effects[stat];
   if(stat==='flatHP')return '+'+value+' max HP';
   if(stat==='spAttack')return '+'+value+' S.ATK';
   if(stat==='spDefense')return '+'+value+' S.DEF';
   if(stat==='armor')return '+'+value+' DEF';
   if(stat==='defense')return '+'+value+' DEF and S.DEF';
   if(stat==='volleyShot')return 'Every third basic attack also hits one nearby enemy for '+Math.round(value*100)+'% of the main hit';
   if(stat==='fullStackAmp')return '+'+Math.round(value*100)+'% damage at full attack-speed stacks';
   if(stat==='takedownHaste')return 'Knockouts trigger a '+value+'-second attack-speed boost';
   if(stat==='relayExtra')return 'Mana relay reaches a second ally';
   if(stat==='travelMana')return '+'+value+' mana per movement step and an opening dash toward the farthest enemy';
   if(stat==='moveSpeed')return '+'+Math.round(value*100)+'% movement speed';
   if(stat==='techRepeat')return 'Low-power or multi-hit damaging signatures repeat for '+Math.round(value*100)+'% damage and lock mana for 0.5 seconds less';
   if(stat==='colossusSlam')return 'Every third basic attack deals bonus physical damage equal to '+Math.round(value*100)+'% of the attacker’s max HP';
   if(stat==='prankLock')return 'First signature mana-locks its target for '+value+' seconds';
   if(stat==='squadVamp')return 'Team gains '+Math.round(value*100)+'% omnivamp';
   if(stat==='squadMana')return 'Team gains '+value+' starting mana';
   if(stat==='rivalPulse')return 'A signature grants the matched rival 15 mana and 20% attack speed for 3 seconds';
   if(stat==='chainTargets')return 'Every fourth basic attack or each cast chains to '+value+' enemies for 35% S.ATK, lowers S.DEF by 20% for 4 seconds, and delays actions by 0.25 seconds';
   if(stat==='sandstorm')return 'Sandstorm deals '+(value*100)+'% enemy max HP per second';
   if(stat==='gutsPower')return '+'+Math.round(value*100)+'% ATK below half HP or while Burned, Wounded, Sundered, or Shredded';
   if(stat==='gutsVamp')return '+'+Math.round(value*100)+'% omnivamp while Guts is active';
   if(stat==='galeDamage')return 'Signature pushes or delays deal '+Math.round(value*100)+'% target max HP bonus damage and grant 25% attack speed for 4 seconds';
   if(stat==='fairyPower')return 'Healing or shielding buffs the recipient’s ATK and S.ATK by '+Math.round(value*100)+'% for 4 seconds';
   if(stat==='chillSlow')return 'Damaging signatures Chill for 4 seconds, lowering attack speed by '+Math.round(value*100)+'%';
   if(stat==='chillCrit')return '+'+Math.round(value*100)+'% crit chance against Chilled enemies';
   if(stat==='toxicSwarm')return 'Hits poison for 1.5% enemy max HP per second and Wound for 5 seconds';
   if(stat==='glitch')return 'At combat start and every second signature, swaps to a random Gold role bonus and gains 25 S.ATK';
   if(stat==='truant')return 'Sleeps until its first signature, with +40 DEF and S.DEF and +8 mana per second. Awakens for 6 seconds with double attack speed and +50% crit damage';
   if(stat==='geneticApex')return 'Copies 25% of the strongest enemy ATK or S.ATK and deals 20% more damage to that enemy';
   if(stat==='airLock')return 'While active, halves enemy weather, damage over time, and opening trait shields';
   if(stat==='weatherBreak')return 'Disperses existing enemy shields on the first storm pulse unless Air Lock protects them';
   if(stat==='towerWard')return 'The first Tower Duo signature shields all living allies for '+Math.round(value*100)+'% of their max HP for 5 seconds';
   if(stat==='echo')return 'First damaging signature echoes for 35% damage';
   if(stat==='thirdShot')return '+'+Math.round(value*100)+'% damage every third basic attack';
   if(stat==='castRefund')return value+' mana retained after casting';
   if(stat==='strikeHaste')return '+'+Number((value*100).toFixed(1))+'% attack speed per basic attack, up to 5 stacks';
   if(stat==='takedownHeal')return 'Recover '+Math.round(value*100)+'% missing HP on a knockout';
   if(stat==='relayMana')return 'On cast, grant '+value+' mana to the lowest-mana ally who can gain mana';
   if(stat==='health')return '+'+Math.round(value*100)+'% max HP';
   if(stat==='power')return '+'+Math.round(value*100)+'% attack power';
   if(stat==='regen')return value+' mana per second';
   if(stat==='weather')return (value*100)+'% enemy max HP per second';
   return '+'+value+(stat==='mana'?' starting mana':' defense');
  }).join(' · ');
 }
 function itemIcon(item){
  const icon=element('span',null,'tactics-item-slot');
  if(item)icon.append(tacticsItemArt(item));
  if(item){
   const trait=completedItems.get(item)?.trait;
   const bonuses=describeBonuses(itemBonuses(item));
   let description=item+(bonuses?' · '+bonuses:' · Fusion catalyst')+(trait?' · Adds the '+trait+' trait.':'');
   if(Object.hasOwn(components,item)){
    const combinations=Object.keys(components).map(partner=>{
     const [result]=recipes[recipeKey(item,partner)];
     return partner+' → '+result;
    });
    description+='\nFuses with\n'+combinations.join('\n');
   }
   const tip=element('span',description,'tactics-trait-tooltip tactics-item-tooltip');
   tip.setAttribute('aria-hidden','true');
   icon.tabIndex=0;
   icon.setAttribute('aria-label',description);
   icon.append(tip);
  }
  return icon;
 }
 function equipFromInventory(player,unit,index){
  if(run.busy || !player.units.includes(unit) || !player.items[index])return;
  if(equip(player,unit,player.items[index])){
   player.items.splice(index,1);render();
  }
 }
 function itemMods(unit,trainer){
  const mods={...trainer.mods};
  for(const item of unit.combatItems ?? unit.items ?? []){
   const bonuses=itemBonuses(item);
   for(const [stat,value] of Object.entries(bonuses))mods[stat]=(mods[stat] ?? 0)+value;
  }
  return mods;
 }
 // A displayed card is already reserved. Buying it transfers that copy to the trainer.
 function drawPoolCard(pool,names){
  const total=names.reduce((sum,name)=>sum+pool.get(name).copies,0);
  if(!total)return null;
  let ticket=Math.random()*total;
  for(const name of names){
   const entry=pool.get(name);
   ticket-=entry.copies;
   if(ticket<0){entry.copies--;return name;}
  }
  return null;
 }
 function carouselOffers(pool,stage){
  const offers=[];
  const tiers=stage===5?[5]:Array.from({length:Math.min(stage,5)},(_,i)=>i+1);
  for(let slot=0;slot<9;slot++){
   const stocked=[...pool].filter(([,entry])=>entry.copies>0 && tiers.includes(entry.tier+1));
   const matching=stocked.filter(([,entry])=>entry.tier+1===tiers[slot%tiers.length]);
   const name=drawPoolCard(pool,(matching.length?matching:stocked).map(([name])=>name));
   if(!name)break;
   const entry=pool.get(name);
   const tier=entry.tier+1;
   const evolved=tier<=2 && slot%3===2 && entry.copies>=2 && evolutionFamilies[name]?.length===1;
   const star=evolved?2:1;
   const poolCopies=evolved?3:1;
   const item=stage===5?drawRogueChoices(standardGear,1)[0]:randomComponent();
   const ball=tier===5?'Master Ball':tier===4?'Ultra Ball':tier===3?'Great Ball':'Poké Ball';
   const unit={name:evolved?evolutionFamilies[name][0][0]:name,family:name,star,position:null,items:[item],poolCopies};
   entry.copies-=poolCopies-1;
   offers.push({slot,name,item,ball,tier,unit});
  }
  return offers;
 }
 function draftCarousel(trainer,offer,branch){
  const plan=fusionPlan(trainer,offer.unit,branch);
  if(plan.overflow)return false;
  if(trainer===run.trainers[0] && plan.displaced.length && !window.confirm(
   'Fusion moves '+plan.displaced.map(unit=>unit.name).join(', ')+' to the bench. Choose this offer?'))return false;
  applyFusion(trainer,plan);
  return true;
 }
 function beginChoices(){
  const player=run.trainers[0];
  const living=run.trainers.filter(t=>t.hp>0);
  if(!player.hp || living.length===1)return;
  if(augmentRound(run.round)){
   for(const ai of living.slice(1)){
    const options=drawRogueChoices(augments.filter(([label])=>!ai.augments.includes(label)),3);
    const counts=traits(field(ai));
    const benefit=([,,effect])=>effect==='weatherSurge'?(counts['Weather Trio']?5:0):
     effect==='echo'?(counts.Spellcraft ?? 0)+1:effect==='secondWind'?(counts.Bulwark ?? 0)+1:2;
    grantAugment(ai,options.sort((a,b)=>benefit(b)-benefit(a))[0]);
   }
   run.choice={kind:'augment',offers:drawRogueChoices(augments.filter(([label])=>!player.augments.includes(label)),3)};
  }else if(carouselRound(run.round)){
   const {stage}=stageRound(run.round);
   const offers=carouselOffers(run.pool,stage);
   const release=()=>{for(const offer of offers)run.pool.get(offer.name).copies+=offer.unit.poolCopies;};
   const order=[...living].sort((a,b)=>a.hp-b.hp);
   const fits=(trainer,offer)=>!fusionPlan(trainer,offer.unit).overflow;
   const aiPick=trainer=>{
    const board=field(trainer),power=aiBoardPower(board);
    let best=null;
    for(const offer of offers){
     const pick=aiOffer(trainer,offer.unit,board,power);
     if(!pick)continue;
     const value=pick.score+offer.tier*.65;
     if(!best || value>best.value)best={offer,branch:pick.branch,value};
    }
    if(best && draftCarousel(trainer,best.offer,best.branch))offers.splice(offers.indexOf(best.offer),1);
   };
   while(order.length && order[0]!==player)aiPick(order.shift());
   if(!offers.some(offer=>fits(player,offer))){
    for(const ai of order.slice(1))aiPick(ai);
    release();
    return false;
   }else run.choice={kind:'carousel',stage,offers,complete:()=>{
    for(const ai of order.slice(1))aiPick(ai);
    release();
   }};
  }
 }
 function renderChoice(choice){
  const player=run.trainers[0];
  const carousel=choice.kind==='carousel';
  const grid=element('div',null,carousel?'tactics-carousel-grid':'shop-grid');
  const slots=carousel?Array.from({length:9},(_,slot)=>choice.offers.find(offer=>offer.slot===slot)):choice.offers;
  for(const [index,offer] of slots.entries()){
   if(!offer){grid.append(element('div','Unavailable','tactics-carousel-empty'));continue;}
   const tile=element('div',null,'bag-item');
   const plan=carousel?fusionPlan(player,offer.unit):null;
   if(plan){
    tile.classList.add('tactics-carousel-ball','tier-'+offer.tier);
    if(choice.stage<=3)tile.classList.add('is-mystery');
    tile.tabIndex=0;
    const preview=element('div',null,'tactics-carousel-preview');
    preview.append(idlePokemonPortrait(offer.unit.name),element('strong',offer.unit.name+' '+'★'.repeat(offer.unit.star)));
    tile.append(bagItemIcon(offer.ball),element('strong',offer.ball),element('small','Tier '+offer.tier),
     preview,itemIcon(offer.item),element('small',offer.item));
    if(plan.overflow)tile.append(element('small','Needs '+plan.overflow+' more bench slot(s).'));
    else if(plan.displaced.length)tile.append(element('small','Moves to bench: '+plan.displaced.map(unit=>unit.name).join(', ')));
    else if(plan.upgrades.length)tile.append(element('small','Fuses immediately.'));
   }
   if(choice.kind==='augment'){tile.classList.add('tactics-augment-card');tile.append(element('span',['✦','◆','✹'][index],'tactics-augment-icon'),element('strong',offer[0]),element('small',offer[1]));}
   tile.append(button('Choose',()=>{
    if(choice.kind==='augment'){
     grantAugment(player,offer);
     run.choice=null;
     startPlanning();
    }else pickFusionBranch(player,offer.unit,branch=>{
     if(!draftCarousel(player,offer,branch))return;
     choice.offers.splice(choice.offers.indexOf(offer),1);
     choice.complete();
     run.choice=null;
     advanceRound();
    });
   },Boolean(plan?.overflow)));
   grid.append(tile);
  }
  const panel=element('section',null,'tactics-choice'+(choice.kind==='augment'?' tactics-augment-screen':''));
  panel.append(choice.kind==='augment'?element('h2','Choose one'):heading(choice.stage===5?'Master Ball Draft':'Poké Ball Carousel'),grid);
  content.replaceChildren(panel);
 }
 function neutralTrainer(){
  if(megaRound(run.round)){
   const {stage}=stageRound(run.round);
   const [name,raidForm]=megaBosses[(stage-2)%megaBosses.length];
   return {name:raidForm,mods:{power:.05+.05*(stage-2),regen:4},units:[{
    name,raidForm,bossHp:1000+180*(stage-2),star:Math.min(3,1+Math.floor((stage-2)/6)),position:cells[31]
   }]};
  }
  const names=['Rattata','Zubat','Geodude'];
  return {name:'Wild Pokémon',mods:{health:-.35,power:-.35},units:names.slice(0,run.round-1).map((name,index)=>({
   name,star:1,position:cells[28+index]
  }))};
 }
 function goldInterest(gold){return Math.min(5,Math.floor(gold/10));}
 function streakGold(streak){
  const count=Math.abs(streak);
  return count>=6?3:count===5?2:count>=2?1:0;
 }
 function passiveGold(){return run.round<=4?run.round:5;}
 function economyTooltip(label,title,lines){
  const wrapper=element('span',null,'tactics-economy-help');
  wrapper.tabIndex=0;
  const tip=element('span',null,'tactics-economy-tooltip');
  tip.append(element('strong',title),...lines.map(line=>element('span',line)));
  wrapper.append(element('span',label),tip);
  wrapper.setAttribute('aria-label',[label,title,...lines].join('. '));
  return wrapper;
 }
 function payRound(trainer,base,win){
  const interest=goldInterest(trainer.gold), streak=streakGold(trainer.streak);
  trainer.income={base,interest,streak,win};
  trainer.gold+=base+interest+streak+win;
 }
 function takeBossReward(trainer,unit,confirmMove=false,branch){
  const plan=fusionPlan(trainer,unit,branch);
  if(!confirmMove && trainer===run.trainers[0] && plan.upgrades.some(upgrade=>upgrade.branchStep))return false;
  if(plan.overflow || (plan.displaced.length && trainer===run.trainers[0] &&
     (!confirmMove || !window.confirm('This reward moves '+plan.displaced.map(unit=>unit.name).join(', ')+' to the bench. Claim it?'))))return false;
  applyFusion(trainer,plan);
  return true;
 }
 function completeNeutral(trainer,won){
  payRound(trainer,passiveGold(),0);
  xp(trainer,2);
  if(wildRound(run.round)){
   trainer.items.push(randomComponent());
   return '';
  }
  if(!won)return '';
  trainer.gold+=15;
  trainer.income.boss=15;
  trainer.items.push(randomComponent(),randomComponent());
  const tier=megaRewardTier(run.round);
  let prizeTier=tier,name=null;
  for(;prizeTier>0;prizeTier--){name=drawPoolCard(run.pool,run.tiers[prizeTier-1]);if(name)break;}
  if(!name)return 'Mega rewards: 2 item components and 15 gold. All eligible Pokémon are drafted.';
  const prize={name,star:1,position:null,poolCopies:1};
  const board=field(trainer);
  const branch=trainer===run.trainers[0]?undefined:aiOffer(trainer,prize,board,aiBoardPower(board))?.branch;
  const deployed=takeBossReward(trainer,prize,false,branch);
  if(!deployed)(trainer.bossRewards ??= []).push(prize);
  return 'Mega rewards: 2 item components, Tier '+prizeTier+' '+name+(deployed?'':' (claim when bench space is available)')+', and 15 gold.';
 }

 function button(label,fn,disabled=false){
  const node=element('button',label);node.type='button';node.onclick=fn;node.disabled=disabled;return node;
 }
 const heading=title=>element('h3',title,'bag-section-title');
 function openTactics(){
  clearInterval(planningTimer);run=null;phase='tactics';showScreen('tactics');
  content.replaceChildren(heading('Poke Fight Tactics'),
   element('p','Draft from a shared shop, position your Pokémon, and outlast seven AI trainers.'),
   element('p','At your progression, fourth place earns '+earnedCoins(tacticsCoinRate()).toLocaleString()+' account coins per credited minute, plus a placement bonus and items.'),
   button('Start match',start));
  const guide=element('details');
  guide.append(element('summary','How to play'),element('p','Buy Pokémon from the shop, then select one and choose a hex on your half of the board. Fusing copies stars up and evolves the Pokémon. Select a branching Pokémon and pick its evolution path before it fuses. Drag items from the left rail to equip them. Focus or hover an item to see its recipes. Lock offers you want to keep for next round. Select a Pokémon to sell it and recover its items. All eight trainers draw from the same supply. Tiers 1 through 5 start with '+familyStock.join(', ')+' copies per Pokémon family, respectively. Shops reserve cards. Selling and elimination return their copies. Mega wins award two components, 15 Tactics gold and a Pokémon from the highest stocked tier up to the stage reward tier.'));
  guide.append(element('p','Completed fights earn credit for simulated combat plus 18 seconds of planning, or 25 on augment and Mega rounds. Finishing pays account coins based on your highest PC level, unlocked Arena speed and placement. First place earns 25% more round coins than fourth. The Lucky Coin doubles your coins.'));
  content.append(guide);
 }
 const placementRewards=[
  [8000,[['vitamins','Rare Candy',2],['balls','Ultra Ball',2]]],
  [6000,[['vitamins','Rare Candy',1],['vitamins','EXP Candy 500',1],['balls','Ultra Ball',1]]],
  [4500,[['vitamins','EXP Candy 500',2],['balls','Ultra Ball',1]]],
  [3500,[['vitamins','EXP Candy 500',1],['vitamins','EXP Candy 250',1],['balls','Cherished Ball',2]]],
  [2000,[['vitamins','EXP Candy 250',2],['balls','Cherished Ball',1]]],
  [1250,[['vitamins','EXP Candy 250',1],['balls','Luxury Ball',2]]],
  [500,[['balls','Great Ball',2]]],
  [250,[['balls','Safari Ball',2]]],
 ];
 const placementRates=[1.25,1.16,1.08,1,.92,.85,.78,.70];
 function tacticsCoinRate(){
  let level=1;
  for(const mon of Object.values(wildProgress.owned ?? {}))level=Math.max(level,mon.level ?? 1);
  for(const group of Object.values(wildProgress.copies ?? {}))
   for(const copy of group)level=Math.max(level,copy.level ?? 1);
  // Match the measured coin pace of 3v3 Trainer auto-repeat at levels 10, 50 and 100.
  const baseRate=20+60*Math.min(level,50)+52*Math.max(0,Math.min(level,100)-50);
  return Math.round(baseRate*(1+.7*(maximumBattleSpeed()-1))/10)*10;
 }
 function creditTacticsRound(match,ticks){
  if(!ticks || openingRound(match.round) || carouselRound(match.round) || match.lastCreditedRound===match.round)return;
  const planning=augmentRound(match.round) || megaRound(match.round)?25:18;
  match.rewardSeconds=(match.rewardSeconds ?? 0)+planning+Math.min(ticks,combatTicks)*combatStepMs/1000;
  match.lastCreditedRound=match.round;
 }
 function awardPlacement(match){
  if(match.placementReward)return;
  const rank=(match.place ?? 1)-1;
  const [baseCoins,placementItems]=placementRewards[rank];
  const roundCoins=Math.round((match.rewardSeconds ?? 0)*(match.coinRate ?? 0)*placementRates[rank]/60);
  const coins=earnedCoins(baseCoins+roundCoins);
  const items=placementItems.map(item=>[...item]);
  const stageBonus=Math.min(3,Math.max(0,(match.completedStage ?? 0)-3));
  if(stageBonus){
   const candy=items.find(([,name])=>name==='EXP Candy 250');
   if(candy)candy[2]+=stageBonus;
   else items.push(['vitamins','EXP Candy 250',stageBonus]);
  }
  for(const item of items)giveArenaItem(...item);
  wildProgress.coins+=coins;
  const breakdown=roundCoins?' ('+earnedCoins(roundCoins).toLocaleString()+' from rounds + '+earnedCoins(baseCoins).toLocaleString()+' placement bonus)':'';
  match.placementReward=[coins.toLocaleString()+' coins'+breakdown,...items.map(([,name,count])=>count+' × '+experienceCandyName(name))].join(' · ');
  saveWildProgress();
 }
 function start(){
  const tiers=roster;
  const pool=new Map(tiers.flatMap((names,tier)=>names.map(name=>[name,{tier,copies:familyStock[tier]}])));
  run={round:1,coinRate:tacticsCoinRate(),rewardSeconds:0,trainers:[makeTrainer('You'),...Array.from({length:7},(_,i)=>makeTrainer('Trainer '+(i+1)))],tiers,pool,selected:null,busy:false,result:''};
  for(const [index,trainer] of run.trainers.entries()){
   const name=drawPoolCard(pool,tiers[0]);
   trainer.units.push({name,star:1,position:index===0?null:cells[31]});
  }
  startPlanning();
 }
 function startPlanning(){
  clearInterval(planningTimer);
  run.deadline=Date.now()+(augmentRound(run.round)||megaRound(run.round)?30:20)*1000;
  render();
  const current=run;
  planningTimer=setInterval(()=>{
   if(run!==current || phase!=='tactics'){clearInterval(planningTimer);return;}
   if(current.branchDialog)return;
   const seconds=Math.max(0,Math.ceil((current.deadline-Date.now())/1000));
   const timer=content.querySelector('.tactics-planning-clock');
   if(timer)timer.textContent=seconds+'s';
   if(seconds===0){
    clearInterval(planningTimer);
    void play();
   }
  },250);
 }
 function signatureKind(stats){return utilitySignature(stats.moveEffect)?'status':stats.moveSpecial?'special':'atk';}
 function signatureDescription(stats){
  const skill=element('p',null,'tactics-signature-description');
  const utility=utilitySignature(stats.moveEffect);
  const effect=stats.moveEffects.map(key=>signatureEffectText[key] ?? extraSignatureText[key]).join(' ');
  if(!utility)skill.append(element('span','Deals damage using '+(stats.moveSpecial?'S.ATK':'ATK'),'tactics-signature-damage'));
  if(effect && !(stats.moveEffects.length===1 && stats.moveEffects[0]==='burst'))skill.append(effect);
  if(stats.manaLockMs>1000)skill.append(' Mana lock: '+(stats.manaLockMs/1000)+'s.');
  if(['heal','brace'].includes(stats.moveEffect))return skill;
  const powers=element('span',utility?'Shield HP ':'Move Power ','tactics-signature-power');
  stats.movePowers.forEach((power,index)=>{
   if(index)powers.append(' / ');
   powers.append(index===stats.star-1?element('strong',String(power)):String(power));
  });
  skill.append(powers);
  return skill;
 }
 function statCard(unit){
  const trainer=run.scout ?? run.trainers[0];
  const stats=unit.hp===undefined?fighter(unit,false,traits(field(trainer)),trainer):unit;
  const details=element('aside',null,'tactics-stat-card');
  const art=element('div',null,'tactics-stat-art');
  art.append(idlePokemonPortrait(unit.name,null,unit.raidForm?spriteVariants(unit.name).mega?.[unit.raidForm]?.[0]:null,true,0));
  const types=element('div',null,'tactics-stat-types');
  for(const type of unitTraits(unit))types.append(element('span',type));
  art.append(types);
  const title=element('header');
  title.append(element('strong',(unit.raidForm ?? unit.name)+' '+ '★'.repeat(unit.star)),
   element('small',run.pool.has(familyOf(unit))?'● '+cost(familyOf(unit)):'Wild'));
  const meter=(value,max,label,style)=>{
   const row=element('div',null,'tactics-stat-meter '+style);
   const bar=element('progress');bar.max=max;bar.value=value;
   bar.setAttribute('aria-label',label);
   row.append(bar,element('span',label+' '+Math.ceil(value)+' / '+max));
   return row;
  };
  const items=element('div',null,'tactics-stat-items');
  for(let i=0;i<3;i++){
   const item=unit.items?.[i];
   items.append(itemIcon(item));
  }
  const numbers=element('div',null,'tactics-stat-numbers');
  const statRows=[
   ['ATK','attack',1,0,''],['S.ATK','specialAttack',1,0,''],
   ['DEF','defense',1,0,''],['S.DEF','specialDefense',1,0,''],
   ['Crit Chance','critChance',100,0,'%'],['Crit Damage','critDamage',100,0,'%'],
   ['ATK Speed','attackSpeed',1,2,'/s']
  ];
  for(const [label,key,scale,precision,suffix] of statRows){
   const base=(stats.baseStats[key]*scale).toFixed(precision);
   const total=(stats[key]*scale).toFixed(precision);
   const bonus=Number((Number(total)-Number(base)).toFixed(precision));
   const value=element('strong',base+suffix);
   if(bonus)value.append(element('b',(bonus>0?' + ':' − ')+Math.abs(bonus)+suffix,'tactics-stat-bonus'));
   const cell=element('span');
   cell.append(element('small',label),value);
   numbers.append(cell);
  }
  details.append(art,title,meter(stats.hp,stats.max,'HP','is-hp'),meter(stats.mana,60,'Mana','is-mana'),
   skillTitle('p',stats.move ?? 'No signature move','',' · '+stats.roleLabel+' · Range '+stats.range,stats.move?signatureKind(stats):null),items,numbers);
  if(stats.move)numbers.before(signatureDescription(stats),element('p',stats.roleRule,'tactics-role-description'));
  return details;
 }
 function inspectUnit(unit){
  const details=element('dialog',null,'tactics-inspect');
  details.append(statCard(unit),button('Done',()=>details.close()));
  details.addEventListener('close',()=>details.remove(),{once:true});
  content.append(details);details.showModal();
 }
 function unitControls(tile,unit,editable,visual){
  tile.oncontextmenu=event=>{event.preventDefault();inspectUnit(unit);};
  let hoverCard;
  const hide=()=>{hoverCard?.remove();hoverCard=null;};
  const show=()=>{
   if(dragged || draggedItem!==null || hoverCard)return;
   hoverCard=statCard(unit);
   hoverCard.classList.add('is-hover');
   content.append(hoverCard);
   const rect=tile.getBoundingClientRect(),box=hoverCard.getBoundingClientRect();
   hoverCard.style.left=Math.max(8,Math.min(rect.right+8,innerWidth-box.width-8))+'px';
   hoverCard.style.top=Math.max(8,Math.min(rect.top,innerHeight-box.height-8))+'px';
  };
  tile.addEventListener('pointerenter',show);
  tile.addEventListener('pointerleave',hide);
  tile.addEventListener('focus',show);
  tile.addEventListener('blur',hide);
  if(!editable || !visual)return;
  visual.draggable=true;
  visual.ondragstart=event=>{
   hide();dragged=unit;event.dataTransfer.setData('text/plain',unit.name);
   event.dataTransfer.setDragImage(visual,visual.offsetWidth/2,visual.offsetHeight/2);
  };
  visual.ondragend=()=>{dragged=null;};
 }
 function unitVisual(unit,direction){
  const visual=element('span',null,'tactics-unit-visual');
  visual.append(idlePokemonPortrait(unit.name,null,unit.raidForm?spriteVariants(unit.name).mega?.[unit.raidForm]?.[0]:null,true,direction),element('small','★'.repeat(unit.star)));
  return visual;
 }
 function tacticsItemArt(item){
  const parts=Object.keys(components);
  const baseIndex=parts.indexOf(item);
  const recipe=Object.entries(recipes).find(([,entry])=>entry[0]===item);
  const oldArt=['Claw','Charm','Berry','Scale','Razor Claws','Spell Claw','Sitrus Blade','Iron Claw','Mystic Charm','Lucky Berry','Runic Scale','Berry Satchel','Berry Armor','Dragon Armor'];
  if(oldArt.includes(item)){
   const sprite=element('span',null,'tactics-item-sprite');
   sprite.style.setProperty('--item-index',String(oldArt.indexOf(item)));
   sprite.setAttribute('aria-hidden','true');
   return sprite;
  }
  const [left,right]=recipe?recipe[0].split('+').map(part=>parts.indexOf(part)):[baseIndex,baseIndex];
  const colors=['#ff8276','#91d9ff','#af8aff','#59a8ff','#b6bdcf','#f2e7b5','#ef7197','#f3bf59','#72ed9f','#e8a2fd'];
  const shape=recipe?['....oo......','...ocgo.....','..occggo....','.occlgggo...','.occcgo.....','..ooo.......']:
   ['....oo......','...ocdo.....','..oclco.....','..occco.....','...ooo......'];
  return collectionPixelArt(shape,colors[left],colors[right]);
 }
 function dropUnit(tile,callback,unit){
  tile.ondragover=event=>{if(dragged || (unit && draggedItem!==null))event.preventDefault();};
  tile.ondrop=event=>{
   event.preventDefault();
   if(unit && draggedItem!==null)equipFromInventory(run.trainers[0],unit,draggedItem);
   else if(dragged)callback(dragged);
   dragged=null;draggedItem=null;
  };
 }
 function returnShopCards(trainer,keepLocks){
  trainer.shop.forEach((name,index)=>{
   if(!name || (keepLocks && trainer.lockedOffers?.has(index)))return;
   run.pool.get(name).copies++;trainer.shop[index]=null;
  });
 }
 function fillShop(trainer){
  const chances=odds[trainer.level-1],held=trainer.shop;
  trainer.shop=Array.from({length:5},(_,i)=>{
   if(held[i])return held[i];
   const available=chances.map((chance,tier)=>chance && run.tiers[tier].some(name=>run.pool.get(name).copies>0)?chance:0);
   const total=available.reduce((sum,chance)=>sum+chance,0);
   if(!total)return null;
   let ticket=Math.random()*total;
   const tier=available.findIndex(chance=>(ticket-=chance)<0);
   return drawPoolCard(run.pool,run.tiers[tier]);
  });
 }
 function roll(trainer){returnShopCards(trainer,true);fillShop(trainer);}
 function releaseShop(trainer){
  returnShopCards(trainer,false);trainer.shop=[];trainer.lockedOffers?.clear();
 }
 const field=trainer=>trainer.units.filter(unit=>unit.position!==null);
 const teamSize=trainer=>trainer.level+trainer.units.reduce((total,unit)=>total+
  (unit.items ?? []).reduce((sum,item)=>sum+(itemBonuses(item).teamSize ?? 0),0),0);

 function fusionPlan(trainer,incoming,chosenBranch){
  const family=familyOf(incoming);
  const units=[...trainer.units,incoming];
  const returned=[];
  const upgrades=[];
  for(const star of [1,2]){
   const group=units.filter(unit=>familyOf(unit)===family && unit.star===star);
   if(group.length<3)continue;
   const [keeper,...used]=[...group.filter(unit=>unit.position!==null),...group.filter(unit=>unit.position===null)].slice(0,3);
   const equipped=[keeper,...used].flatMap(unit=>unit.items ?? []);
   const items=equipped.includes('Mirage Goggles')?['Mirage Goggles']:equipped.slice(0,3);
   const retained=[...items];
   for(const item of equipped){
    const index=retained.indexOf(item);
    if(index>=0)retained.splice(index,1);
    else returned.push(item);
   }
   const paths=evolutionFamilies[family];
   const branchStep=paths?.length>1 && (star===1?paths.some(path=>path[0]!==paths[0][0]):
    paths.every(path=>path[0]===paths[0][0]));
   const branch=(branchStep?chosenBranch:undefined) ?? keeper.branch ?? used.find(unit=>unit.branch!==undefined)?.branch ?? 0;
   const name=paths?.[branch]?.[star-1] ?? keeper.name;
   const locked=paths && (star===2 || paths.some(path=>path[0]!==paths[0][0]));
   const upgraded={...keeper,name,family,poolCopies:[keeper,...used].reduce((total,unit)=>total+familyCopies(unit),0),branch:locked?branch:keeper.branch ?? used.find(unit=>unit.branch!==undefined)?.branch,star:star+1,items};
   upgrades.push({keeper,used,upgraded,branchStep});
   units[units.indexOf(keeper)]=upgraded;
   for(const unit of used)units.splice(units.indexOf(unit),1);
  }
  const capacity=teamSize({...trainer,units});
  const deployed=units.filter(unit=>unit.position!==null);
  const displaced=deployed.slice(capacity);
  const overflow=Math.max(0,units.length-deployed.length+displaced.length-benchLimit);
  return {units,upgrades,returned,displaced,overflow};
 }
 function pickFusionBranch(trainer,incoming,commit){
  if(run.busy || run.branchDialog)return;
  const plan=fusionPlan(trainer,incoming);
  if(plan.overflow)return;
  const split=plan.upgrades.find(upgrade=>upgrade.branchStep);
  if(!split){commit(undefined);return;}
  const current=run;
  const entered=Date.now();
  const dialog=element('dialog',null,'tactics-inspect tactics-branch-dialog');
  const grid=element('div',null,'shop-grid');
  dialog.append(element('h2','Choose '+familyOf(incoming)+' evolution'),grid,button('Cancel',()=>dialog.close()));
  for(const [index,path] of branchPaths(incoming).entries()){
   const form=path[split.upgraded.star-2];
   const card=button('',()=>{
    dialog.close();
    // Resume before applying the selection so the normal purchase path can render.
    if(finish())commit(index);
   });
   card.className='tactics-branch-option';
   card.append(idlePokemonPortrait(form),element('strong',form),element('small',themesFor(form).join(' · ')));
   if(path[1]!==form)card.append(element('small','3★ '+path[1]+' · '+themesFor(path[1]).join(' · ')));
   grid.append(card);
  }
  function finish(){
   if(current.branchDialog!==dialog)return false;
   current.branchDialog=null;
   dialog.remove();
   if(run!==current || phase!=='tactics')return false;
   current.deadline+=(Date.now()-entered);
   return true;
  }
  current.branchDialog=dialog;
  dialog.addEventListener('close',finish,{once:true});
  content.append(dialog);
  dialog.showModal();
 }
 function applyFusion(trainer,plan){
  trainer.units=plan.units;
  trainer.items.push(...plan.returned);
  for(const unit of plan.displaced)unit.position=null;
  for(const {keeper,used,upgraded} of plan.upgrades){
   if(run.selected===keeper || used.includes(run.selected))run.selected=upgraded;
  }
 }
 function buy(trainer,index,branch){
  const name=trainer.shop[index];
  if(!name || trainer.gold<cost(name))return false;
  const plan=fusionPlan(trainer,{name,star:1,position:null},branch);
  if(plan.overflow || (trainer===run.trainers[0] && plan.displaced.length && !window.confirm(
   'Fusion reduces your deployment limit and moves '+plan.displaced.map(unit=>unit.name).join(', ')+' to the bench. Buy anyway?')))
   return false;
  trainer.gold-=cost(name);trainer.shop[index]=null;trainer.lockedOffers?.delete(index);
  applyFusion(trainer,plan);
  return true;
 }
 function salePlan(trainer,unit){
  const lostSlots=(unit.items ?? []).reduce((sum,item)=>sum+(itemBonuses(item).teamSize ?? 0),0);
  const remaining=trainer.units.filter(other=>other!==unit);
  const displaced=remaining.filter(other=>other.position!==null).slice(teamSize(trainer)-lostSlots);
  const benchCount=remaining.filter(other=>other.position===null).length;
  return {displaced,overflow:Math.max(0,benchCount+displaced.length-benchLimit)};
 }
 function sell(trainer,unit){
  if(!trainer.units.includes(unit))return false;
  const plan=salePlan(trainer,unit);
  if(plan.overflow)return false;
  trainer.gold+=cost(familyOf(unit))*unit.star;
  run.pool.get(familyOf(unit)).copies+=familyCopies(unit);
  trainer.items.push(...(unit.items ?? []));
  trainer.units.splice(trainer.units.indexOf(unit),1);
  for(const extra of plan.displaced)extra.position=null;
  if(run.selected===unit)run.selected=null;
  return true;
 }
 const cost=name=>run.pool.get(name).tier+1;
 function xp(trainer,amount){
  if(trainer.level>=maxLevel)return;
  trainer.xp+=amount;
  while(trainer.level<maxLevel && trainer.xp>=levels[trainer.level]){
   trainer.xp-=levels[trainer.level];trainer.level++;
  }
 }
 function moveUnit(player,position,unit=run.selected){
  if(!unit || unit.position===position)return;
  const occupied=player.units.find(other=>other.position===position);
  if(unit.position===null && !occupied && field(player).length>=teamSize(player))return;
  if(occupied)occupied.position=unit.position;
  unit.position=position;run.selected=null;render();
 }
 function traits(units){
  const members=new Map();
  for(const unit of units)for(const trait of unitTraits(unit)){
   if(!members.has(trait))members.set(trait,new Set());
   members.get(trait).add(trait==='ILoveEevee'?unit.name:familyOf(unit));
  }
  const counts=Object.fromEntries([...members].map(([trait,keys])=>[trait,keys.size]));
  const activeRival=rivalPairs.some(pair=>pair.every(name=>units.some(unit=>unit.name===name && unit.star===3)));
  if(counts['Rival Duo'])counts['Rival Duo']=activeRival?2:1;
  const starterCount=Object.entries(counts).filter(([label,count])=>label.endsWith(' Partners') &&
   collectionTraits[label].tiers.some(([threshold])=>count>=threshold)).reduce((sum,[,count])=>sum+count,0);
  if(starterCount)counts['Starter Squad']=starterCount;
  return counts;
 }
 const battlerCanvases=new WeakMap();
 function battlerSprite(unit){
  let canvas=battlerCanvases.get(unit);
  if(!canvas){
   canvas=element('canvas',null,'tactics-battler');
   canvas.width=64;canvas.height=52;
   canvas.setAttribute('aria-hidden','true');
   battlerCanvases.set(unit,canvas);
  }
  paintBattler(unit,performance.now());
  return canvas;
 }
 function paintBattler(unit,now){
  const canvas=battlerCanvases.get(unit);
  if(!canvas)return;
  const action=unit.animation;
  const elapsed=action?Math.max(0,now-action.started):0;
  const clip=action && elapsed<action.duration?pmdMotion(unit,action.motion):null;
  const motion=clip ?? pmdMotion(unit,'idle');
  const ticks=clip?Math.min(clip.duration-.001,elapsed*.06):(now*.06+dex[unit.name][0])%(motion?.duration || 1);
  const frame=motion?.frames.find(frame=>ticks<frame.end) ?? pmdReference(unit.name,unit.direction,unit.raidForm?spriteVariants(unit.name).mega?.[unit.raidForm]?.[0]:null);
  const sheet=frame?pmdImage(frame.page):null;
  const fallback=getSprite(unit.name);
  const source=sheet?.naturalWidth?frame:fallback;
  const image=sheet?.naturalWidth?sheet:fallback.image;
  const context=canvas.getContext('2d');
  context.clearRect(0,0,canvas.width,canvas.height);
  if(!image.naturalWidth)return;
  context.imageSmoothingEnabled=false;
  const scale=Math.min(1.25,60/source.width,44/source.height);
  const x=source===frame && Number.isFinite(frame.x)?32+frame.x*scale:32-source.width*scale/2;
  const y=source===frame && Number.isFinite(frame.y)?46+frame.y*scale:46-source.height*scale;
  context.drawImage(image,source.sx,source.sy,source.width,source.height,
   Math.round(x),Math.round(y),Math.round(source.width*scale),Math.round(source.height*scale));
 }
 function setBattlerMotion(unit,target,motion,now){
  const dx=target.x-unit.position.x;
  const dy=target.y-unit.position.y;
  unit.direction=pmdDirection(dx,dy);
  const clip=pmdMotion(unit,motion);
  unit.animation={motion,started:now,duration:motion==='walk'?170:Math.min(380,(clip?.duration ?? 16)/.06)};
 }
 function placeOnField(node,x,y){
  node.style.left=(12+x/6.5*76)+'%';
  node.style.top=(9+y/5.95*82)+'%';
 }
 function board(units,player,scouting=false){
  const grid=element('div',null,'tactics-board tactics-planning-space tactics-combat-space');
  for(const position of cells){
   const {x,y}=position;
   const unit=units.find(unit=>unit.position?.x===x && unit.position?.y===y);
   const tile=button('',()=>{
    if(run.selected && run.selected!==unit)moveUnit(player,position);
    else if(unit){run.selected=unit;render();}
   },scouting || y<4);
   tile.className='tactics-hex'+(unit?' is-occupied':'');
   tile.setAttribute('aria-label',unit?unit.name+' '+unit.star+' star':'Empty hex '+(x+1)+', '+(y+1));
   const center=combatPosition(position,false);
   placeOnField(tile,center.x,center.y);
   if(!scouting && y>=4)dropUnit(tile,moving=>moveUnit(player,position,moving),unit);
   if(unit){
    const visual=unitVisual(unit,unit.opponent?0:4);
    unitControls(tile,unit,!scouting,visual);
    tile.append(visual);
    if(unit.items?.length)tile.append(equippedItems(unit,true));
    tile.setAttribute('aria-pressed',String(run.selected===unit));
   }
   grid.append(tile);
  }
  return grid;
 }
 function standingsPanel(){
  const standings=element('ol',null,'tactics-standings');
  for(const trainer of [...run.trainers].sort((a,b)=>b.hp-a.hp)){
   const entry=element('li',null,trainer===run.trainers[0]?'is-you':'');
   const health=element('progress');
   health.max=100;health.value=trainer.hp;health.setAttribute('aria-label',trainer.name+' HP');
   const name=button(trainer.name,()=>{if(run.busy)run.spectate?.(trainer);else {run.scout=trainer===run.trainers[0]?null:trainer;render();}},!trainer.hp);
   entry.append(name,element('strong',String(trainer.hp)),health);
   standings.append(entry);
  }
  return standings;
 }
 function stageHeader(player,mode){
  const header=element('header',null,'tactics-stage');
  header.append(element('strong','Stage '+stageLabel(run.round)),element('span',mode),
   element('span',field(player).length+' / '+teamSize(player)+' deployed'));
  if(openingRound(run.round))header.append(element('span',player.gold+' gold'));
  if(!run.busy){
   const timer=element('span',Math.max(0,Math.ceil((run.deadline-Date.now())/1000))+'s','tactics-planning-clock');
   header.append(timer,button('Ready',()=>{void play();},Boolean(run.branchDialog)));
  }
  const timeline=element('div',null,'tactics-timeline');
  for(let round=run.round;round<run.round+5;round++){
   if(round>finalRound)break;
   const kind=openingRound(round)?'Opening':wildRound(round)?'Wild':megaRound(round)?'Mega boss':
    carouselRound(round)?'Carousel':augmentRound(round)?'Augment + Duel':'Duel';
   const marker=element('span',stageLabel(round)+' '+kind);
   if(round===run.round)marker.setAttribute('aria-current','step');
   timeline.append(marker);
  }
  header.append(timeline);
  return header;
 }
 function damageChart(report){
  const panel=element('section',null,'tactics-damage-chart');
  const controls=element('div',null,'tactics-damage-tabs');
  const rows=element('div',null,'tactics-damage-rows');
  const metrics=['damageDealt','damageTaken','healingDone','shieldedDamage'];
  const labels=['Damage dealt','Damage taken','Healing','Shielding'];
  const tabs=labels.map((label,index)=>{
   const tab=element('button',label);
   tab.type='button';
   tab.onclick=()=>{run.damageMode=index;update();};
   return tab;
  });
  const entries=report.units.filter(unit=>!unit.opponent).map(unit=>{
   const row=element('div',null,'tactics-damage-row');
   const bar=element('progress');
   const value=element('small');
   row.append(element('strong',unit.name+' '+'★'.repeat(unit.star)),value,bar);
   return {unit,row,value,bar};
  });
  function update(){
   const mode=run.damageMode ?? 0;
   const metric=metrics[mode];
   tabs.forEach((tab,index)=>tab.setAttribute('aria-pressed',String(index===mode)));
   const total=entries.reduce((sum,entry)=>sum+(entry.unit[metric] ?? 0),0);
   const seconds=report.ticks*combatStepMs/1000;
   for(const {unit,value,bar} of entries){
    const amount=unit[metric] ?? 0;
    const rate=seconds>0?amount/seconds:0;
    value.textContent=amount.toLocaleString()+(mode<2?' damage · '+rate.toFixed(1)+(mode===0?' DPS':' /s'):mode===2?' HP restored':' damage blocked');
    bar.setAttribute('aria-label',unit.name+' · '+labels[mode]);
    bar.max=total || 1;
    bar.value=amount;
   }
  }
  controls.append(...tabs);
  rows.append(...entries.map(entry=>entry.row));
  panel.append(element('h3','Your team combat report'),controls,rows);
  update();
  return {panel,update};
 }
 function battleLayout(player,units,rival=null,traitTrainer=null){
  const inspected=traitTrainer ?? run.scout ?? player;
  const layout=element('div',null,'tactics-layout'+(rival?' is-combat':''));
  const sidebar=element('aside',null,'tactics-sidebar');
  sidebar.classList.add('tactics-loadout');
  const inventory=element('div',null,'tactics-item-rail');
  inventory.setAttribute('aria-label','Item inventory');
  for(let i=0;i<Math.max(9,inspected.items.length);i++){
   const item=inspected.items[i];
   const slot=itemIcon(item);
   if(item){
    if(!rival && !run.scout){
     slot.draggable=true;
     slot.ondragstart=event=>{
      draggedItem=i;event.dataTransfer.setData('text/plain',item);
     };
     slot.ondragend=()=>{draggedItem=null;};
    }
   }
   inventory.append(slot);
  }
  const traitList=element('div',null,'tactics-trait-list');
  traitList.append(heading(inspected===run.trainers[0]?'Traits':inspected.name+' traits'));
  sidebar.append(inventory,traitList);
  const types=Object.entries(traits(field(inspected))).filter(([,count])=>count>0).sort((a,b)=>b[1]-a[1]);
  for(const [type,count] of types){
   const group=collectionTraits[type];
   const tier=group.tiers.findLast(([threshold])=>count>=threshold);
   const entry=element('div',null,'tactics-trait'+(tier?' is-active':''));
   const badge=element('span',type,'home-type-badge');
   badge.style.setProperty('--type-color',group.color);
   const nextTier=group.tiers.find(([threshold])=>threshold>count);
   const next=nextTier?.[0];
   const progress=next?count+' / '+next:count+' · Max';
   const needed=next?' Next tier: '+(next-count)+' more.':' Maximum tier reached.';
   const description=(group.derived?'Counts members of active regional Partners traits. ':type==='Rival Duo'?'Field both 3★ Pokémon in a matching pair. ':group.role?roleDisplayName(group.role)+' role. ':group.families?'Families: '+group.families.join(', ')+'. ':'Members: '+group.members.join(', ')+'. ')+
    (tier?(type==='Weather Trio'?'Field effect: ':'Current member bonus: ')+describeBonuses(tier[1])+'.':'Inactive.')+
    (nextTier?' At '+nextTier[0]+': '+describeBonuses(nextTier[1])+'.':'');
   const tip=element('span',description+needed,'tactics-trait-tooltip');
   entry.tabIndex=0;
   entry.setAttribute('aria-label',type+' trait. '+tip.textContent);
   entry.append(badge,element('span',progress),tip);
   traitList.append(entry);
  }
  if(!types.length)traitList.append(element('small','No active traits.'));
  if(inspected.augments.length)traitList.append(heading('Augments'),element('small',inspected.augments.join(' · ')));
  const middle=element('div',null,'tactics-center');
  const arena=element('div',null,'tactics-field');
  if(!rival){
   const preview=neutralRound(run.round)?neutralTrainer().units.map(unit=>({...unit,opponent:true,
    position:{x:6-unit.position.x,y:7-unit.position.y}})):[];
   arena.append(board([...(run.scout?run.scout.units:units),...preview],player,Boolean(run.scout)));
  }
  let timer=null, countdown=null;
  if(rival){
   const banner=element('header',null,'tactics-combat-banner');
   timer=element('progress');
   timer.max=100;timer.value=100;timer.setAttribute('aria-label','Combat time remaining');
   countdown=element('span',Math.ceil(combatTicks*combatStepMs/1000)+'s','tactics-combat-countdown');
   const title=element('div',null,'tactics-combat-title');
   title.append(element('strong','Combat'),countdown);
   banner.append(timer,title,element('small','Stage '+stageLabel(run.round)+' · '+rival));
   arena.append(benchView(player,true));
   arena.prepend(banner);
   middle.append(arena);
   const summary=element('div',null,'tactics-combat-wallet');
   summary.append(element('span','Level '+player.level),element('strong',player.gold+' gold'));
   middle.append(summary);
  }else middle.append(stageHeader(player,run.scout?'Scouting · '+run.scout.name:megaRound(run.round)?'Planning · '+neutralTrainer().name+' · Tier '+megaRewardTier(run.round)+' reward':wildRound(run.round)?'Planning · Wild Pokémon':openingRound(run.round)?'Opening · Prepare your starter':'Planning'),arena);
  const left=element('div',null,'tactics-left-column');
  left.append(sidebar);
  if(!rival && run.damageReport)left.append(damageChart(run.damageReport).panel);
  const rankings=element('aside',null,'tactics-sidebar');
  rankings.append(heading('Standings'),standingsPanel());
  layout.append(left,middle,rankings);
  return {layout,left,middle,arena,timer,countdown};
 }
 function benchView(player,combat=false){
  const bench=element('div',null,'tactics-bench');
  const benched=player.units.filter(unit=>unit.position===null);
  for(let i=0;i<benchLimit;i++){
   const unit=benched[i];
   const tile=unit?button('',()=>{
    if(combat)inspectUnit(unit);else {run.selected=unit;render();}
   }):element('div');
   tile.className='tactics-bench-slot';
   if(!combat)dropUnit(tile,draggedUnit=>{
    if(draggedUnit.position===null)return;
    if(unit)unit.position=draggedUnit.position;
    else if(benched.length>=benchLimit)return;
    draggedUnit.position=null;run.selected=null;render();
   },unit);
   tile.setAttribute('aria-label',unit?'Select '+unit.name:'Empty bench slot');
   if(unit){
    const visual=unitVisual(unit,0);
    unitControls(tile,unit,!combat,visual);
    tile.setAttribute('aria-pressed',String(run.selected===unit));
    tile.append(visual);
    if(unit.items?.length)tile.append(equippedItems(unit,true));
   }
   bench.append(tile);
  }
  return bench;
 }
 function render(){
  const player=run.trainers[0];
  if(run.finished || player.hp<=0 || run.trainers.every(t=>t===player || !t.hp)){
   content.replaceChildren(heading((run.place ?? 1)===1?'First place':'Place '+run.place),element('p',run.result),element('p','Placement rewards · '+run.placementReward),standingsPanel(),...(run.damageReport?[damageChart(run.damageReport).panel]:[]),button('Play again',start),button('Back to Poke Fight Tactics',openTactics));
   return;
  }
  if(run.choice){renderChoice(run.choice);return;}
  const {layout,middle,arena}=battleLayout(player,player.units);
  const bench=benchView(player);
  const benched=player.units.filter(unit=>unit.position===null);
  const shop=element('section',null,'tactics-shop');
  shop.setAttribute('aria-label','Pokémon shop');
  const bar=element('div',null,'tactics-shop-bar');
  const level=element('div',null,'tactics-shop-level');
  level.append(element('strong','Lvl. '+player.level),element('small',player.level>=maxLevel?'Max':player.xp+'/'+levels[player.level]+' XP'));
  const progress=element('progress');
  progress.max=player.level>=maxLevel?1:levels[player.level];
  progress.value=player.level>=maxLevel?1:player.xp;
  progress.setAttribute('aria-label','Level progress');
  level.append(progress);
  const chances=element('div',null,'tactics-shop-odds');
  odds[player.level-1].forEach((chance,i)=>{
   const label=element('span',chance+'%','tier-'+(i+1));
   label.title='Tier '+(i+1)+' shop odds';
   label.setAttribute('aria-label',label.title+' '+chance+' percent');
   chances.append(label);
  });
  const base=passiveGold(),interest=goldInterest(player.gold);
  const bonus=streakGold(player.streak);
  const win=run.round>3?1:0;
  const nextWinBonus=neutralRound(run.round)?bonus:streakGold(Math.max(1,player.streak+1));
  const nextLossBonus=neutralRound(run.round)?bonus:streakGold(Math.min(-1,player.streak-1));
  const possible=Math.max(nextWinBonus+win,nextLossBonus);
  const gold=economyTooltip(player.gold+' gold','Total income possible · '+(base+interest+possible),[
   'Passive income +'+base,'Interest (max 5) +'+interest,
   'Win/loss streak · +'+nextWinBonus+' on a win / +'+nextLossBonus+' on a loss','Gold per win +'+win
  ]);
  gold.classList.add('tactics-shop-gold');
  const streakName=player.streak<0?'Loss streak':player.streak>0?'Win streak':'Win/loss streak';
  const streak=economyTooltip('🔥 '+Math.abs(player.streak),streakName,[
   'Earn extra gold for consecutive wins or losses.','2–4 rounds · +1 gold','5 rounds · +2 gold',
   '6+ rounds · +3 gold','Current bonus · +'+bonus+' gold'
  ]);
  bar.append(level,chances,gold,streak);
  shop.append(bar);
  const economy=element('div',null,'tactics-economy');
  economy.append(button('Buy XP · 4 gold',()=>{player.gold-=4;xp(player,4);render();},player.gold<4 || player.level>=maxLevel),
   button('Reroll · 2 gold',()=>{player.gold-=2;roll(player);render();},player.gold<2));
  shop.append(economy);
  const fieldTraits=traits(field(run.scout ?? player));
  for(const [index,name] of player.shop.entries()){
   const tile=button('',()=>pickFusionBranch(player,{name,star:1,position:null},branch=>{if(buy(player,index,branch))render();}),!name || player.gold<cost(name) ||
    Boolean(name && fusionPlan(player,{name,star:1,position:null}).overflow));
   tile.className='tactics-offer'+(name?' tier-'+cost(name):'');
   if(name && player.units.some(unit=>familyOf(unit)===name)){
    tile.classList.add('is-owned-family');
    tile.dataset.ownedFamily='true';
   }
   const matching=name?themesFor(name).filter(trait=>fieldTraits[trait]>0):[];
   if(matching.length){
    tile.classList.add('is-matching-trait');
    tile.dataset.matchingTraits=matching.join(', ');
   }
   if(name){
    const preview=fusionPlan(player,{name,star:1,position:null});
    const paths=branchPaths({name});
    if(paths.length)tile.title=paths.map(([middle,final])=>name+' → '+middle+(middle===final?'':' → '+final)+
     (themesFor(final).length?' · '+themesFor(final).join(' / '):'')).join('\n');
    if(preview.displaced.length)tile.title=preview.overflow
     ?'Free '+preview.overflow+' bench slot(s) before this fusion.'
     :'Fusion moves '+preview.displaced.map(unit=>unit.name).join(', ')+' to the bench.';
   }
   if(name){
    const types=themesFor(name);
    const art=element('span',null,'tactics-offer-art');
    art.style.setProperty('--offer-type',moveColors[types[0]] ?? '#72958a');
    const labels=element('span',null,'tactics-offer-types');
    labels.append(...types.map(type=>element('small',type)));
    art.append(pokemonPortrait(name,null,true,0),labels);
    const footer=element('span',null,'tactics-offer-footer');
    footer.append(element('strong',name),element('span','● '+cost(name),'tactics-offer-cost'));
    tile.append(art,footer);
    const indicators=[run.pool.get(name).copies+' unreserved '+name+' copies left in the shared pool'];
    if(tile.dataset.ownedFamily)indicators.push('Owned family');
    if(matching.length)indicators.push('Matching traits: '+matching.join(', '));
    tile.setAttribute('aria-label',['Buy '+name+' for '+cost(name)+' gold',...indicators].join('. '));
    if(indicators.length)tile.title=[...indicators,tile.title].filter(Boolean).join('\n');
   }else tile.append(element('small','Sold'));
   const offer=element('div',null,'tactics-shop-slot');
   offer.append(tile);
   if(name){
    const locked=player.lockedOffers ??= new Set();
    const lock=button(locked.has(index)?'🔒':'🔓',()=>{
     if(locked.has(index))locked.delete(index);else locked.add(index);
     render();
    });
    lock.className='tactics-offer-lock';
    lock.title=locked.has(index)?'Unlock offer':'Keep this offer for next round';
    lock.setAttribute('aria-label',(locked.has(index)?'Unlock ':'Lock ')+name);
    lock.setAttribute('aria-pressed',String(locked.has(index)));
    offer.append(lock);
   }
   if(name){offer.tabIndex=0;unitControls(offer,{name,star:1,position:null},false);}
   shop.append(offer);
  }
  const controls=element('div',null,'tactics-unit-actions');
  for(const prize of player.bossRewards ?? []){
   const plan=fusionPlan(player,prize);
   controls.append(button('Claim Tier '+cost(prize.name)+' '+prize.name,()=>pickFusionBranch(player,prize,branch=>{
    if(!takeBossReward(player,prize,true,branch))return;
    player.bossRewards.splice(player.bossRewards.indexOf(prize),1);
    render();
   }),Boolean(plan.overflow)));
  }
  if(run.round===1 && !run.scout)controls.append(element('small','Select a Pokémon, then a hex to deploy. Drag items from the left rail.','tactics-hint'));
  if(run.scout)controls.append(button('Return to your board',()=>{run.scout=null;render();}));
  if(!run.scout)arena.append(bench);
  middle.append(controls);
  const selected=run.selected;
  if(selected){
   const paths=branchPaths(selected);
   const family=familyOf(selected);
   const branchLocked=selected.star>1 && paths.some(path=>path[0]!==paths[0][0]);
   if(paths.length>1 && selected.star<3 && !branchLocked && !(selected.star===2 && family==='Eevee')){
    const label=element('label','Evolution path ');
    const select=element('select');
    for(const [index,[middle,final]] of paths.entries()){
     const traits=themesFor(final);
     const types=themesFor(middle).filter(trait=>!traits.includes(trait));
     const option=element('option',(middle===final?final:middle+' → '+final)+' · '+[...types,...traits].join(' / '));
     option.value=String(index);
     select.append(option);
    }
    select.value=String(selected.branch ?? 0);
    select.onchange=()=>{selected.branch=Number(select.value);};
    label.append(select);
    controls.append(label);
   }
   const plan=salePlan(player,selected);
   if(plan.displaced.length){
    const detail=plan.overflow?'Free '+plan.overflow+' bench '+(plan.overflow===1?'slot':'slots')+' before selling. Select a benched Pokémon to sell or deploy it.':
     'Selling moves '+plan.displaced.map(unit=>unit.name).join(', ')+' to the bench.';
    controls.append(element('p',detail,'tactics-hint'));
   }
   controls.append(button('Sell '+selected.name,()=>{
    if(!run.busy && sell(player,selected))render();
   },Boolean(plan.overflow)));
   player.items.forEach((item,index)=>controls.append(button('Equip '+item,()=>{
    equipFromInventory(player,selected,index);
   })));
   if(selected.position!==null)controls.append(button('Move to bench',()=>{
    selected.position=null;run.selected=null;render();
   },player.units.filter(unit=>unit.position===null).length>=benchLimit));
  }
  const hint=element('p',run.result || 'Select a Pokémon, then choose a hex on your side.','tactics-hint');
  const income=player.income;
  if(income)hint.append(' · Income: '+income.base+' base, +'+income.interest+' interest, +'+income.streak+' streak'+(income.win?', +1 win':''));
  content.replaceChildren(layout,...(run.round>1?[shop]:[]),hint);
 }
 const aiBasePower=new Map();
 function aiUnitPower(unit){
  const key=unit.name+'|'+unit.star;
  if(!aiBasePower.has(key)){
   const [hp,attack,defense,speed,resist,special]=dexStats[dex[unit.name][0]-1];
   const tier=rarities.get(familyOf(unit))+1;
   const stats=(hp+defense+resist+speed+2*Math.max(attack,special))/105;
   aiBasePower.set(key,(4+2.2*tier+stats)*[0,1,1.55,2.45][unit.star]);
  }
  return aiBasePower.get(key)+(unit.items ?? []).reduce((sum,item)=>sum+(Object.hasOwn(components,item)?1:2.8),0);
 }
 function aiBoardPower(board){
  let power=0,front=0,back=0;
  for(const unit of board){
   power+=aiUnitPower(unit);
   const role=combatRole(unit.name);
   if(role==='Tank' || role==='Fighter')front++;
   if(role==='Carry' || role==='Caster')back++;
  }
  power+=3*Math.min(front,Math.ceil(board.length/3))+2.5*Math.min(back,Math.ceil(board.length/4));
  for(const [label,count] of Object.entries(traits(board))){
   const tiers=collectionTraits[label].tiers;
   const rank=tiers.findLastIndex(([threshold])=>count>=threshold);
   if(rank>=0){
    const affected=label==='Weather Trio' || label==='Starter Squad'?board.length:count;
    const bonus=tiers[rank][1];
    const stats=(bonus.health ?? 0)+(bonus.power ?? 0)+(bonus.speed ?? 0)+(bonus.defense ?? 0)/100+(bonus.mana ?? 0)/100;
    power+=(1+rank*.8)*(2.4+affected*1.25)+.7*tiers[rank][0]+affected*Math.min(.7,stats);
   }
   const next=tiers[rank+1]?.[0];
   if(count+1===next)power+=1.1;
  }
  return power;
 }
 function aiAdmission(board,unit,capacity){
  if(board.length<capacity)return {score:aiBoardPower([...board,unit]),slot:board.length};
  let score=-Infinity,slot=-1;
  const trial=[...board];
  for(let i=0;i<board.length;i++){
   trial[i]=unit;const value=aiBoardPower(trial);trial[i]=board[i];
   if(value>score){score=value;slot=i;}
  }
  return {score,slot};
 }
 const aiHexes=[4,5,7].map(row=>cells.filter(cell=>cell.y>=4).sort((a,b)=>
  Math.abs(a.y-row)-Math.abs(b.y-row) || Math.abs(a.x-3)-Math.abs(b.x-3) || a.x-b.x));
 function deployAI(trainer){
  const capacity=Math.min(teamSize(trainer),trainer.units.length,aiHexes[0].length);
  const board=field(trainer).slice(0,capacity);
  const reserves=trainer.units.filter(unit=>!board.includes(unit));
  // Fill new slots, then improve the existing board one exchange at a time.
  while(reserves.length){
   const current=board.length<capacity?-Infinity:aiBoardPower(board);
   let choice=null;
   for(const unit of reserves){
    const pick=aiAdmission(board,unit,capacity);
    if(pick.score>current+.01 && (!choice || pick.score>choice.score))choice={...pick,unit};
   }
   if(!choice)break;
   const outgoing=board[choice.slot];board[choice.slot]=choice.unit;
   reserves.splice(reserves.indexOf(choice.unit),1);if(outgoing)reserves.push(outgoing);
  }
  for(const unit of trainer.units)unit.position=null;
  const taken=new Set();
  for(const unit of board.sort((a,b)=>aiUnitPower(b)-aiUnitPower(a))){
   const range=roleProfiles[combatRole(unit.name)].range;
   const hex=aiHexes[range===1?0:range===2?1:2].find(cell=>!taken.has(cell));
   unit.position=hex;taken.add(hex);
  }
 }
 function aiOffer(trainer,incoming,board,boardPower,fromShop=false){
  const family=familyOf(incoming);
  const initial=fusionPlan(trainer,incoming);
  const splits=initial.upgrades.some(upgrade=>upgrade.branchStep);
  const paths=splits?branchPaths(incoming).length:1;
  let best=null;
  for(let branch=0;branch<paths;branch++){
   const plan=splits?fusionPlan(trainer,incoming,branch):initial;
   if(plan.overflow)continue;
   const upgraded=plan.upgrades.at(-1)?.upgraded;
   const unit=upgraded ?? incoming;
   const deployed=plan.units.filter(member=>member.position!==null && !plan.displaced.includes(member));
   const capacity=teamSize({...trainer,units:plan.units});
   let score;
   if(upgraded){
    // A fusion can free several hexes. Include the bench replacements the trainer could field immediately.
    const bench=plan.units.filter(member=>!deployed.includes(member));
    while(deployed.length<capacity && bench.length){
     let pick=0,bestPower=-Infinity;
     for(let i=0;i<bench.length;i++){
      const power=aiBoardPower([...deployed,bench[i]]);
      if(power>bestPower){pick=i;bestPower=power;}
     }
     deployed.push(bench.splice(pick,1)[0]);
    }
    score=aiBoardPower(deployed);
    if(!deployed.includes(unit))score=Math.max(score,aiAdmission(deployed,unit,capacity).score);
    const openSlots=Math.max(0,Math.min(board.length,capacity)-deployed.length);
    score+=3.5*plan.upgrades.length+2*openSlots-boardPower;
   }else {
    score=aiAdmission(deployed,unit,capacity).score-boardPower;
    const copies=trainer.units.filter(other=>familyOf(other)===family);
    const singles=copies.filter(other=>other.star===1).length;
    const doubles=copies.filter(other=>other.star===2).length;
    const available=run.pool.get(family).copies+trainer.shop.filter(name=>name===family).length-(fromShop?1:0);
    if(!copies.some(other=>other.star===3) && available>=1){
     const onBoard=board.some(other=>familyOf(other)===family);
     // A pair has bench value even when the duplicate adds no trait. A contested long chase has less.
     const potential=singles===1?6:doubles && available>=8-3*doubles-singles?2.8:0;
     const benchValue=potential*(onBoard?1:.55);
     if(benchValue)score=Math.max(score,0)+benchValue;
    }
   }
   if(!best || score>best.score)best={score,branch:splits?branch:undefined};
  }
  return best;
 }
 function clearAIBench(trainer){
  const bench=trainer.units.filter(unit=>unit.position===null);
  if(bench.length<benchLimit-1)return;
  const fielded=field(trainer);
  const disposable=bench.filter(unit=>unit.star===1 && !(unit.items?.length) &&
   (!trainer.units.some(other=>other!==unit && familyOf(other)===familyOf(unit)) ||
    fielded.some(other=>familyOf(other)===familyOf(unit) && other.star===3)));
  disposable.sort((a,b)=>aiUnitPower(a)-aiUnitPower(b));
  for(const unit of disposable.slice(0,bench.length-(benchLimit-2)))sell(trainer,unit);
  if(bench.length===benchLimit && !disposable.length){
   const retention=unit=>aiUnitPower(unit)+(fielded.some(other=>familyOf(other)===familyOf(unit))?8:0);
   const lowest=[...bench].filter(unit=>!salePlan(trainer,unit).displaced.length).sort((a,b)=>retention(a)-retention(b))[0];
   if(lowest)sell(trainer,lowest);
  }
 }
 function shopAI(trainer){
  for(;;){
   const board=field(trainer),current=aiBoardPower(board);
   let best=null;
   for(const [index,name] of trainer.shop.entries()){
    if(!name || trainer.gold<cost(name))continue;
    const offer=aiOffer(trainer,{name,star:1,position:null},board,current,true);
    if(!offer)continue;
    const value=offer.score-.55*cost(name);
    if(value>.15 && (!best || value>best.value))best={index,branch:offer.branch,value};
   }
   if(!best || !buy(trainer,best.index,best.branch))break;
   deployAI(trainer);
  }
 }
 function lockAIUpgrade(trainer){
  const board=field(trainer),power=aiBoardPower(board);
  const nextGold=trainer.gold+passiveGold()+goldInterest(trainer.gold)+streakGold(trainer.streak);
  let best=null;
  for(const [index,name] of trainer.shop.entries()){
   if(!name || cost(name)<=trainer.gold || cost(name)>nextGold)continue;
   const offer=aiOffer(trainer,{name,star:1,position:null},board,power,true);
   if(offer && offer.score>4 && (!best || offer.score>best.score))best={index,score:offer.score};
  }
  if(best)(trainer.lockedOffers ??=new Set()).add(best.index);
 }
 function equipAI(trainer){
  for(let i=trainer.items.length-1;i>=0;i--){
   const item=trainer.items[i],stats=itemBonuses(item);
   const defensive=stats.armor || stats.spDefense || stats.health || stats.flatHP || stats.startShield;
   const magical=stats.spAttack || stats.regen || stats.mana;
   const score=unit=>{
    const role=combatRole(unit.name);
    const fit=defensive?role==='Tank' || role==='Fighter':magical?role==='Caster' || role==='Specialist':role==='Carry' || role==='Reaper' || role==='Fighter';
    return aiUnitPower(unit)*.25+(fit?6:0);
   };
   const candidates=field(trainer).sort((a,b)=>score(b)-score(a));
   if(candidates.some(unit=>equip(trainer,unit,item)))trainer.items.splice(i,1);
  }
 }
 function planAI(trainer){
  const stage=stageRound(run.round).stage;
  const reserve=trainer.hp<=35?0:Math.min(30,10*(stage-1));
  trainer.lockedOffers?.clear();
  deployAI(trainer);clearAIBench(trainer);
  if(trainer.bossRewards?.length){
   trainer.bossRewards=trainer.bossRewards.filter(prize=>{
    const board=field(trainer),offer=aiOffer(trainer,prize,board,aiBoardPower(board));
    if(!offer || !takeBossReward(trainer,prize,false,offer.branch))return true;
    deployAI(trainer);return false;
   });
  }
  shopAI(trainer);
  for(let i=0;i<2 && trainer.level<maxLevel && trainer.gold>=4;i++){
   const immediate=levels[trainer.level]-trainer.xp<=4 && trainer.units.length>teamSize(trainer);
   if(!immediate && trainer.gold<reserve+12)break;
   const before=trainer.level;trainer.gold-=4;xp(trainer,4);
   if(trainer.level!==before)deployAI(trainer);
  }
  const pairs=trainer.units.some(u=>u.star===1 && trainer.units.some(v=>v!==u && v.star===1 && familyOf(v)===familyOf(u)));
  const rolls=trainer.hp<=35?3:pairs || trainer.level===maxLevel?2:1;
  for(let i=0;i<rolls && trainer.gold>=reserve+6;i++){
   trainer.gold-=2;roll(trainer);shopAI(trainer);
  }
  equipAI(trainer);deployAI(trainer);lockAIUpgrade(trainer);
 }
 function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
 function combatPosition(position,opponent){
  if(!position)return null;
  const x=opponent?6-position.x:position.x;
  const y=opponent?7-position.y:position.y;
  return {x:x+(y%2)*.5,y:y*.85};
 }
 function fighter(unit,opponent,types,trainer){
  const base=dexStats[dex[unit.name][0]-1];
  const mods=itemMods(unit,trainer);
  const squad=collectionTraits['Starter Squad'].tiers.findLast(([threshold])=>types['Starter Squad']>=threshold)?.[1];
  if(squad){
   mods.vamp=(mods.vamp ?? 0)+squad.squadVamp;
   mods.mana=(mods.mana ?? 0)+squad.squadMana;
  }
  const itemStartShield=mods.startShield ?? 0;
  let roleBonus={};
  for(const label of unitTraits(unit)){
   const tier=collectionTraits[label].tiers.findLast(([threshold])=>types[label]>=threshold);
   if(!tier)continue;
   if(collectionTraits[label].role===combatRole(unit.name))roleBonus=tier[1];
   for(const [stat,value] of Object.entries(tier[1]))mods[stat]=(mods[stat] ?? 0)+value;
  }
  const role=combatRole(unit.name);
  const specialist=role==='Specialist'?specialists[unit.name]:null;
  const profile=roleProfiles[role];
  const rarity=rarities.get(familyOf(unit)) ?? 0;
  const hp=unit.bossHp ?? Math.round(((base[0]*4+180)*profile.hp*(1+rarity*.045)*(branchPaths(unit).length?1.36:1.65)**(unit.star-1)+(mods.flatHP ?? 0))*(1+(mods.health ?? 0)));
  const custom=expandedSignatures[unit.name];
  const [move,moveType,moveSpecial]=signatures[unit.name] ?? [custom[0],dex[unit.name][1],base[5]>=base[1]];
  const moveEffects=(signatureEffects[unit.name] ?? custom[1]).split(' ');
  const moveEffect=moveEffects[0];
  const movePowers=unit.name==='Squirtle'?[150,255,450]:signaturePowerByTier[rarity];
  const attackScale=profile.attack*(1+rarity*.055)*(branchPaths(unit).length?1.26:1.5)**(unit.star-1);
  const powerMultiplier=1+(mods.power ?? 0);
  const {stage}=stageRound(run.round);
  const stageSpeed=role==='Fighter'?1+Math.min(6,stage)*.05:1;
  const attackSpeed=stageSpeed*Math.max(2.3,Math.min(5.4,(2.75+base[3]*.013)*profile.speed+rarity*.055))/attackSlowdown;
  const defenseScale=profile.defense*(1+rarity*.035)*1.13**(unit.star-1);
  const baseDefense=base[2]*defenseScale,baseSpecialDefense=base[4]*defenseScale;
  const baseStats={
   attack:(base[1]*.35+12)*attackScale,specialAttack:(base[5]*.35+12)*attackScale,
   defense:Math.round(baseDefense),specialDefense:Math.round(baseSpecialDefense),
   attackSpeed,critChance:.10,critDamage:1.5
  };
  return {...unit,...baseStats,baseStats,opponent,hp,max:hp,mana:Math.min(60,mods.mana ?? 0),role,roleLabel:roleDisplayName(role),roleBonus,roleRule:specialist?.rule ?? profile.rule,range:profile.range,
   attack:baseStats.attack*(powerMultiplier+(mods.attackPct ?? 0)),
   specialAttack:baseStats.specialAttack*(powerMultiplier+(mods.spAttackPct ?? 0))+(mods.spAttack ?? 0),
   attackSpeed:attackSpeed*(1+(mods.speed ?? 0)),critChance:Math.min(1,baseStats.critChance+(mods.crit ?? 0)),
   critDamage:baseStats.critDamage+(mods.critDamage ?? 0),gear:mods,
   elapsed:0,gearStacks:0,attackStacks:0,critStacks:0,shield:hp*(mods.startShield ?? 0),traitShield:hp*((mods.startShield ?? 0)-itemStartShield),shieldUntil:8000,
   defense:Math.round(baseDefense+(mods.defense ?? 0)+(mods.armor ?? 0)),specialDefense:Math.round(baseSpecialDefense+(mods.defense ?? 0)+(mods.spDefense ?? 0)),
   direction:opponent?0:4,move,moveType,moveSpecial,moveEffect,moveEffects,movePowers,wait:0,manaRegen:(specialist?.regen ?? profile.regen)+(mods.regen ?? 0),
   manaOnHit:specialist?.hit ?? profile.mana,manaOnDamage:specialist?.incoming ?? (role==='Tank'?5:0),
   manaOnTravel:(specialist?.travel ?? 0)+(mods.travelMana ?? 0),manaLock:0,manaLockMs:
    (channeledSignatures.has(move)?1500:1000)-(mods.techRepeat && !utilitySignature(moveEffect) &&
     (movePowers[0]<=150 || moveEffects.some(effect=>effect==='volley' || effect==='spread'))?500:0),
   guard:mods.guard,echo:mods.echo,secondWind:mods.secondWind,overcharge:mods.overcharge,momentum:mods.momentum,
   position:combatPosition(unit.position,opponent)};
 }
 const battleEffects=new WeakMap();
 function battle(a,b){
  const first=field(a),second=field(b), firstTraits=traits(first),secondTraits=traits(second);
  const build=(unit,opponent,counts,trainer)=>{
   const combatItems=unit.items?.includes('Mirage Goggles')?drawRogueChoices(standardGear,2):unit.items;
   return fighter({...unit,combatItems},opponent,counts,trainer);
  };
  const units=[...first.map(unit=>build(unit,false,firstTraits,a)),...second.map(unit=>build(unit,true,secondTraits,b))];
  const storm=(trainer,counts)=>{
   const base=collectionTraits['Weather Trio'].tiers.findLast(([count])=>(counts['Weather Trio'] ?? 0)>=count)?.[1];
   return {rate:(base?.weather ?? 0)+(base && trainer.mods.weatherSurge ? .01 : 0),breakShield:Boolean(base?.weatherBreak)};
  };
  const effects={elapsed:0,weather:[storm(a,firstTraits),storm(b,secondTraits)]};
  battleEffects.set(units,effects);
  const openingPositions=new Map(units.map(unit=>[unit,unit.position]));
  for(const unit of units){
   if(unit.gear.travelMana){
    const origin=openingPositions.get(unit);
    const enemy=units.filter(other=>other.opponent!==unit.opponent).sort((a,b)=>
     distance(origin,openingPositions.get(b))-distance(origin,openingPositions.get(a)))[0];
    if(enemy){
     for(let step=0;step<18 && distance(unit.position,enemy.position)>Math.max(.9,unit.range);step++){
      const next=nextStep(unit,enemy,units);
      if(!next)break;
      unit.position=next;
     }
    }
   }
   if(enemiesHaveAirLock(unit,units))unit.shield-=unit.traitShield*.5;
   if(unit.gear.geneticApex){
    const enemy=units.filter(other=>other.opponent!==unit.opponent)
     .sort((a,b)=>Math.max(b.attack,b.specialAttack)-Math.max(a.attack,a.specialAttack))[0];
    if(enemy){
     unit.geneticTarget=enemy;
     const stat=enemy.attack>=enemy.specialAttack?'attack':'specialAttack';
     unit[stat]+=enemy[stat]*.25;
    }
   }
   if(unit.shield>0)grantFairyPower(unit,unit);
   if(unit.gear.truant)unit.truantAsleep=true;
   if(unit.gear.glitch)scrambleRole(unit);
  }
  return units;
 }
 function enemiesHaveAirLock(unit,units){
  return units.some(other=>other.opponent!==unit.opponent && other.hp>0 && other.gear.airLock);
 }
 function scrambleRole(unit){
  const traits=Object.entries(collectionTraits).filter(([name,trait])=>trait.role && (unit.glitchRole?name!==unit.glitchRole:trait.role!==unit.role));
  const [name,trait]=traits[Math.floor(Math.random()*traits.length)];
  for(const [key,value] of Object.entries(unit.glitchBonus ?? unit.roleBonus))unit.gear[key]=(unit.gear[key] ?? 0)-value;
  unit.glitchBonus=trait.tiers[1][1];
  unit.glitchRole=name;
  for(const [key,value] of Object.entries(unit.glitchBonus))unit.gear[key]=(unit.gear[key] ?? 0)+value;
  if(unit.glitchBonus.startShield){
   unit.shield+=unit.max*unit.glitchBonus.startShield;
   unit.shieldUntil=unit.elapsed+8000;
  }
  unit.specialAttack+=25;
 }
 function tickWeather(units,now){
  const effects=battleEffects.get(units);
  if(!effects)return;
  effects.elapsed+=combatStepMs;
  if(effects.elapsed<1000)return;
  effects.elapsed-=1000;
  const weather=[false,true].map(opponent=>units.filter(unit=>unit.opponent===opponent && unit.hp>0 &&
   collectionTraits['Weather Trio'].members.includes(unit.name)));
  const sand=[false,true].map(opponent=>units.filter(unit=>unit.opponent===opponent && unit.hp>0 && unit.gear.sandstorm));
  const pulse=(target,rate,credit,airLock)=>{
   if(!rate || !credit.length || target.hp<=0)return;
   const actual=receiveDamage(target,target.max*rate*(airLock?.5:1),now,false,null,true);
   credit.forEach((member,index)=>{
    const share=Math.floor(actual/credit.length)+(index<actual%credit.length?1:0);
    member.damageDealt=(member.damageDealt ?? 0)+share;
   });
  };
  for(const target of units){
   const side=target.opponent?0:1;
   const storm=effects.weather[side];
   const airLock=units.some(unit=>unit.opponent===target.opponent && unit.hp>0 && unit.gear.airLock);
   if(storm.breakShield && !storm.broke && weather[side].length && !airLock){
    target.shield=0;
    target.signatureShield=0;
   }
   pulse(target,storm.rate,weather[side],airLock);
   pulse(target,sand[side][0]?.gear.sandstorm,sand[side],airLock);
  }
  for(const [side,storm] of effects.weather.entries())if(weather[side].length)storm.broke=true;
 }
 function grantFairyPower(unit,source){
  if(!source.gear?.fairyPower || source.opponent!==unit.opponent)return;
  unit.fairyPower=Math.max(unit.fairyUntil>unit.elapsed?unit.fairyPower:0,source.gear.fairyPower);
  unit.fairyUntil=unit.elapsed+4000;
 }
 function heal(unit,amount,source=unit){
  if(unit.hp<=0 || amount<=0)return;
  const restored=Math.min(unit.max-unit.hp,Math.round(amount*(unit.woundUntil>unit.elapsed?.67:1)));
  unit.hp+=restored;
  if(restored>0)grantFairyPower(unit,source);
  source.healingDone=(source.healingDone ?? 0)+restored;
 }
 function gainMana(unit,amount){
  if(unit.manaLock<=0)unit.mana=Math.min(60,unit.mana+amount*(1+(unit.gear.manaRate ?? 0)));
 }
 function receiveDamage(target,damage,now=null,critical=false,source=null,periodic=false){
  if(damage<=0 || target.hp<=0)return 0;
  if(target.guard){target.guard=false;target.shieldedDamage=(target.shieldedDamage ?? 0)+damage;return 0;}
  if(source && !periodic && target.role==='Reaper' && target.target!==source)damage*=.85;
  if(source && !periodic)damage*=1-Math.min(.75,(target.gear.durability ?? 0)+(target.veilUntil>target.elapsed?target.veilAmount:0)+(target.hp>target.max/2?(target.gear.healthyGuard ?? 0):0));
  damage=Math.max(1,Math.round(damage));
  if(target.signatureShieldUntil>target.elapsed && target.signatureShield>0){
   const blocked=Math.min(target.signatureShield,damage);
   target.signatureShield-=blocked;
   const provider=target.shieldProvider ?? target;
   provider.shieldedDamage=(provider.shieldedDamage ?? 0)+blocked;
   damage-=blocked;
  }
  if(target.shield>0){
   const blocked=Math.min(target.shield,damage);
   target.shield-=blocked;
   target.shieldedDamage=(target.shieldedDamage ?? 0)+blocked;
   damage-=blocked;
  }
  const actualDamage=Math.min(target.hp,Math.ceil(damage));
  target.hp-=actualDamage;
  target.damageTaken=(target.damageTaken ?? 0)+actualDamage;
  if(source)source.damageDealt=(source.damageDealt ?? 0)+actualDamage;
  if(actualDamage && now!==null)(target.damageEvents ??= []).push({amount:actualDamage,critical,started:now});
  if(target.hp<=0 || !actualDamage)return actualDamage;
  if(target.gear.hitStack)target.gearStacks=Math.min(25,target.gearStacks+1);
  if(target.hp<=target.max/2){
   if(target.secondWind){
    target.secondWind=false;
    heal(target,target.max*.12);
   }
   if(!target.thresholdUsed){
    target.thresholdUsed=true;
    if(target.gear.thresholdGuard){target.guard=true;target.woundUntil=target.burnUntil=target.shredUntil=target.sunderUntil=0;}
    if(target.gear.thresholdShield){
     target.shield+=target.max*target.gear.thresholdShield;
     target.shieldUntil=target.elapsed+4000;
     grantFairyPower(target,target);
    }
    gainMana(target,target.gear.thresholdMana ?? 0);
   }
  }
  gainMana(target,target.manaOnDamage);
  return actualDamage;
 }
 function ignite(target,seconds,source){
  if(target.hp<=0)return;
  const expires=target.elapsed+seconds*1000;
  target.burnUntil=Math.max(target.burnUntil ?? 0,expires);
  target.woundUntil=Math.max(target.woundUntil ?? 0,expires);
  target.nextBurn ??= target.elapsed+1000;
  target.burnSource=source;
 }
 function updateGear(unit,units,now){
  unit.elapsed+=combatStepMs;
  const elapsed=unit.elapsed;
  if(elapsed>=unit.shieldUntil)unit.shield=0;
  if(unit.critUntil<=elapsed)unit.critStacks=0;
  if(unit.nextPoison!==undefined && elapsed>=unit.nextPoison){
   if(unit.poisonUntil>=elapsed){
    receiveDamage(unit,unit.max*.015*(unit.airLocked?.5:1),now,false,unit.poisonSource,true);
    unit.nextPoison+=1000;
   }else unit.nextPoison=undefined;
  }
  if(unit.nextBurn!==undefined && elapsed>=unit.nextBurn){
   if(unit.burnUntil>=elapsed){
    receiveDamage(unit,Math.max(1,Math.round(unit.max*.01*(unit.airLocked?.5:1))),now,false,unit.burnSource,true);
    unit.nextBurn+=1000;
   }else unit.nextBurn=undefined;
  }
  const previous=elapsed-combatStepMs;
  if(Math.floor(previous/1000)!==Math.floor(elapsed/1000))heal(unit,(unit.max-unit.hp)*(unit.gear.missingHeal ?? 0));
  if(Math.floor(previous/2000)!==Math.floor(elapsed/2000)){
   heal(unit,unit.max*(unit.gear.maxHeal ?? 0));
   if(unit.gear.burnAura){
    const victim=units.find(other=>other.opponent!==unit.opponent && other.hp>0 && distance(unit.position,other.position)<=2);
    if(victim)ignite(victim,10,unit);
   }
  }
 }
 function gearHit(unit,target,units,dealt,cast,critical,now){
  const gear=unit.gear;
  if(gear.hitStack)unit.gearStacks=Math.min(25,unit.gearStacks+1);
  if(gear.attackStack && !cast)unit.attackStacks=Math.min(15,unit.attackStacks+1);
  if(gear.critAmp && critical){unit.critStacks++;unit.critUntil=unit.elapsed+5000;}
  if(gear.burn)ignite(target,gear.burn,unit);
  if(gear.shred)target.shredUntil=target.elapsed+gear.shred*1000;
  if(gear.sunder)target.sunderUntil=target.elapsed+gear.sunder*1000;
  heal(unit,dealt*((gear.vamp ?? 0)+(gear.stance && unit.hp<=unit.max/2?.20:0)));
  if(gear.allyHeal){
   const ally=units.filter(other=>other.opponent===unit.opponent && other.hp>0).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];
   if(ally)heal(ally,dealt*gear.allyHeal,unit);
  }
  if(!cast && target.hp>0 && target.gear.retaliate && (target.retaliateAfter ?? 0)<=target.elapsed &&
     distance(unit.position,target.position)<=1.5){
   target.retaliateAfter=target.elapsed+2000;
   receiveDamage(unit,target.gear.retaliate,now,false,target);
  }
 }
 function nextStep(unit,target,units){
  const {x,y}=unit.position;
  const heading=Math.atan2(target.position.y-y,target.position.x-x);
  const step=Math.min(.34*(1+(unit.gear.moveSpeed ?? 0)),Math.max(.08,distance(unit.position,target.position)-unit.range+.04));
  for(const offset of [0,.6,-.6,1.15,-1.15,1.65,-1.65]){
   const angle=heading+offset;
   const point={x:Math.max(0,Math.min(6.5,x+Math.cos(angle)*step)),
    y:Math.max(0,Math.min(5.95,y+Math.sin(angle)*step))};
   if(distance(point,unit.position)<.01)continue;
   if(!units.some(other=>other!==unit && other.hp>0 && distance(point,other.position)<.55))return point;
  }
  return null;
 }
 function chooseTarget(unit,units){
  const targets=units.filter(other=>other.hp>0 && other.opponent!==unit.opponent);
  const isBackline=target=>target.role==='Carry' || target.role==='Caster';
  return targets.sort((a,b)=>
   (unit.role==='Reaper'?Number(isBackline(b))-Number(isBackline(a)):0) ||
   distance(unit.position,a.position)-distance(unit.position,b.position) ||
   Number(b.role==='Tank')-Number(a.role==='Tank') || a.hp-b.hp)[0];
 }
 function applySignature(unit,target,units,damage,now,dealt=damage){
  const star=unit.star-1;
  const allies=units.filter(other=>other.hp>0 && other.opponent===unit.opponent);
  const others=allies.filter(ally=>ally!==unit);
  const enemies=units.filter(other=>other.hp>0 && other.opponent!==unit.opponent);
  const weakest=[...others].sort((a,b)=>a.hp/a.max-b.hp/b.max)[0] ?? unit;
  const byDistance=(a,b)=>distance(unit.position,a.position)-distance(unit.position,b.position);
  const barrier=(ally,amount)=>{
   const existing=ally.signatureShieldUntil>ally.elapsed?ally.signatureShield:0;
   if(amount>=existing)ally.shieldProvider=unit;
   ally.signatureShield=Math.max(existing,amount);
   ally.signatureShieldUntil=ally.elapsed+5000;
   if(amount>=existing && amount>0)grantFairyPower(ally,unit);
  };
  const cleanse=ally=>{for(const key of ['burnUntil','poisonUntil','woundUntil','shredUntil','sunderUntil','weakenUntil','chillUntil','lightningUntil'])ally[key]=0;};
  const disrupted=new Set();
  const delay=(enemy,ms)=>{enemy.wait=Math.max(0,enemy.wait)+ms;disrupted.add(enemy);};
  const displace=(actor,away,amount)=>{
   const heading=Math.atan2(actor.position.y-away.position.y,actor.position.x-away.position.x);
   const position={x:Math.max(0,Math.min(6.5,actor.position.x+Math.cos(heading)*amount)),
    y:Math.max(0,Math.min(5.95,actor.position.y+Math.sin(heading)*amount))};
   if(distance(position,actor.position)<.01 || units.some(other=>other!==actor && other.hp>0 && distance(position,other.position)<.55))return false;
   if(now!==null){actor.moveFrom=actor.position;actor.moveStarted=now;}
   actor.position=position;
   return true;
  };
  const power=unit.movePowers[star];
  for(const effect of unit.moveEffects){
   switch(effect){
    case 'recoil': {
     if(dealt<=0)break;
     const amount=Math.min(unit.hp,Math.round(unit.max*[.08,.10,.12][star]));
     unit.hp-=amount;
     unit.damageTaken=(unit.damageTaken ?? 0)+amount;
     if(now!==null && amount)(unit.damageEvents ??= []).push({amount,critical:false,started:now});
     break;
    }
    case 'teamShield': for(const ally of allies)barrier(ally,power);break;
    case 'allyHaste': weakest.rallyUntil=Math.max(weakest.rallyUntil ?? 0,weakest.elapsed+5000);break;
    case 'ward': weakest.guard=true;break;
    case 'windup': unit.wait+=500;break;
    case 'brace':
    case 'shield': barrier(unit,Math.round(unit.max*[.2,.3,.45][star]));break;
    case 'cover': barrier(weakest,power);barrier(unit,Math.round(power/2));break;
    case 'fortify': for(const ally of [...allies].sort(byDistance).slice(0,3))barrier(ally,power);break;
    case 'aegis': for(const ally of allies.filter(ally=>ally===unit || ally.range>=3)){barrier(ally,power);cleanse(ally);}break;
    case 'heal': for(const ally of [...allies].sort((a,b)=>a.hp/a.max-b.hp/b.max).slice(0,2))heal(ally,ally.max*[.10,.16,.25][star],unit);break;
    case 'tide': for(const ally of allies)heal(ally,ally.max*[.03,.05,.08][star],unit);break;
    case 'bloom': heal(unit,(unit.max-unit.hp)*[.08,.12,.18][star]);break;
    case 'leech': heal(unit,dealt*[.2,.3,.45][star]);break;
    case 'rally': unit.rallyUntil=unit.elapsed+5000;break;
    case 'rush': unit.signatureRush=[.20,.30,.45][star];break;
    case 'snare': delay(target,[500,750,1000][star]);break;
    case 'quake': for(const enemy of enemies)if(distance(unit.position,enemy.position)<=2)delay(enemy,[300,500,800][star]);break;
    case 'weaken': target.weakenUntil=target.elapsed+4000;target.weakenAmount=[.15,.25,.35][star];break;
    case 'sunder': target.sunderUntil=target.elapsed+4000;break;
    case 'shred': target.shredUntil=target.elapsed+4000;break;
    case 'frost': target.frostUntil=target.elapsed+4000;break;
    case 'sap': target.mana=Math.max(0,target.mana-[8,12,18][star]);break;
    case 'spark': gainMana([...others].sort((a,b)=>b.mana-a.mana)[0] ?? unit,[8,12,18][star]);break;
    case 'burn': ignite(target,5,unit);break;
    case 'wound': target.woundUntil=Math.max(target.woundUntil ?? 0,target.elapsed+6000);break;
    case 'cleanse': cleanse(unit);cleanse([...others].sort(byDistance)[0] ?? unit);break;
    case 'thorn': unit.thornUntil=unit.elapsed+4000;unit.thornArmor=[15,25,40][star];break;
    case 'veil': for(const ally of [unit,weakest]){ally.veilUntil=ally.elapsed+4000;ally.veilAmount=[.15,.22,.30][star];}break;
    case 'blink': displace(unit,target,[.6,.9,1.2][star]);break;
    case 'gale': if(target.hp>0 && displace(target,unit,[.5,.75,1][star]))disrupted.add(target);break;
    case 'volley':
    case 'spread': {
     const nearby=enemies.filter(enemy=>enemy!==target && distance(target.position,enemy.position)<=(effect==='volley'?2:1.5));
     const victims=effect==='volley'?nearby.sort((a,b)=>distance(a.position,target.position)-distance(b.position,target.position)).slice(0,1):nearby;
     for(const victim of victims)receiveDamage(victim,damage*(effect==='volley'?[.30,.45,.60][star]:[.18,.26,.38][star]),now,false,unit);
     break;
    }
   }
  }
  if(unit.gear.galeDamage && disrupted.size){
   unit.galeUntil=unit.elapsed+4000;
   for(const enemy of disrupted)receiveDamage(enemy,enemy.max*unit.gear.galeDamage,now,false,unit,true);
  }

 }
 function grantTowerWard(unit,units){
  const strength=unit.gear.towerWard;
  const battle=battleEffects.get(units);
  if(!strength || !battle)return;
  const side=Number(unit.opponent);
  battle.towerWard ??= [false,false];
  if(battle.towerWard[side])return;
  battle.towerWard[side]=true;
  for(const ally of units){
   if(ally.hp<=0 || ally.opponent!==unit.opponent)continue;
   const amount=Math.round(ally.max*strength);
   const remaining=ally.signatureShieldUntil>ally.elapsed?ally.signatureShield:0;
   if(amount<=remaining)continue;
   ally.signatureShield=amount;
   ally.signatureShieldUntil=ally.elapsed+5000;
   ally.shieldProvider=unit;
  }
 }
 function tick(units,now=null){
  tickWeather(units,now);
  for(const unit of units)if(unit.hp>0){unit.airLocked=enemiesHaveAirLock(unit,units);updateGear(unit,units,now);}
  for(const unit of units)if(unit.hp>0)unit.target=chooseTarget(unit,units);
  for(const unit of units){
   if(unit.hp<=0)continue;
   unit.manaLock=Math.max(0,unit.manaLock-combatStepMs);
   gainMana(unit,(unit.manaRegen+(unit.truantAsleep?8:0))*combatStepMs/1000);
   const target=unit.target;
   if(!target || target.hp<=0)continue;
   unit.wait=Math.max(-combatStepMs,unit.wait-combatStepMs);
   if(unit.wait>0)continue;
   const gap=distance(unit.position,target.position);
   const cast=unit.manaLock===0 && unit.mana>=60 && unit.move;
   if(unit.truantAsleep && !cast)continue;
   const utility=cast && utilitySignature(unit.moveEffect);
   if(gap>unit.range && !utility && !unit.truantAsleep){
    const step=nextStep(unit,target,units);
    if(step){
     if(now!==null)setBattlerMotion(unit,step,'walk',now);
     if(now!==null){unit.moveFrom=unit.position;unit.moveStarted=now;}
     unit.position=step;
     gainMana(unit,unit.manaOnTravel);
    }
    continue;
   }
   const special=cast?unit.moveSpecial:unit.role==='Carry' && unit.moveSpecial;
   const gear=unit.gear;
   const stackBonus=unit.gearStacks*(gear.hitStack ?? 0);
   const stance=gear.stance && unit.hp>unit.max/2?.2:0;
   const guts=unit.hp<unit.max/2 || ['burnUntil','woundUntil','sunderUntil','shredUntil'].some(key=>unit[key]>unit.elapsed);
   const fairy=unit.fairyUntil>unit.elapsed?unit.fairyPower:0;
   const offense=special?(unit.specialAttack+Math.floor(unit.elapsed/5000)*(gear.rampPower ?? 0))*(1+stackBonus+stance+fairy):
    unit.attack*(1+stackBonus+stance+fairy+(guts?(gear.gutsPower ?? 0):0)+unit.attackStacks*(gear.attackStack ?? 0));
   const aura=special?'shredAura':'sunderAura';
   const defenseDown=(special?target.shredUntil:target.sunderUntil)>target.elapsed ||
    units.some(other=>other.hp>0 && other.opponent===unit.opponent && other.gear[aura] && distance(target.position,other.position)<=2);
   const focus=target.gear.focusArmor?units.filter(other=>other.hp>0 && other.target===target).length*target.gear.focusArmor:0;
   const resistance=target.truantAsleep?40:0;
   const defense=((special?target.specialDefense:target.defense)+focus+resistance+(target.thornUntil>target.elapsed?target.thornArmor:0))*
    (defenseDown?.7:special && target.lightningUntil>target.elapsed?.8:1);
   const critChance=Math.min(1,unit.critChance+(target.chillUntil>target.elapsed?(gear.chillCrit ?? 0):0));
   const critical=Math.random()<critChance?unit.critDamage+(unit.truantUntil>unit.elapsed?.5:0):1;
   const amp=1+(gear.amp ?? 0)+unit.critStacks*(gear.critAmp ?? 0)+(target.role==='Tank'?(gear.tankAmp ?? 0):0);
   const execute=cast && unit.moveEffects.includes('execute') && target.hp<target.max/2?1+[.25,.40,.60][unit.star-1]:1;
   const weaken=unit.weakenUntil>unit.elapsed?1-unit.weakenAmount:1;
   const overtime=1+Math.max(0,unit.elapsed-overtimeStartMs)/15000;
   if(!cast)unit.basicHits=(unit.basicHits ?? 0)+1;
   const thirdAttack=!cast && unit.basicHits%3===0;
   const thirdShot=thirdAttack?1+(gear.thirdShot ?? 0):1;
   const fullStackAmp=unit.basicHits>=5?1+(gear.fullStackAmp ?? 0):1;
   const genetic=unit.geneticTarget===target?1.2:1;
   const damage=utility?0:Math.max(1,Math.round(genetic*overtime*execute*weaken*combatDamageScale*offense*(cast?1.8+unit.movePowers[unit.star-1]/120:1)*thirdShot*fullStackAmp*critical*amp*100/(100+defense)));
   if(now!==null){
    setBattlerMotion(unit,target.position,cast?'cast':unit.range>1?'attack':'lunge',now);
    if(cast)unit.lastCast={started:now,move:unit.move,from:unit.position,to:utility?unit.position:target.position};
    if(!utility && (!target.animation || now-target.animation.started>=target.animation.duration || target.animation.motion==='walk'))
     setBattlerMotion(target,unit.position,'hit',now);
   }
   let dealt=receiveDamage(target,damage,now,critical>1,unit);
   if(thirdAttack && gear.volleyShot){
    const extra=units.filter(other=>other!==target && other.hp>0 && other.opponent!==unit.opponent &&
     distance(target.position,other.position)<=2).sort((a,b)=>distance(target.position,a.position)-distance(target.position,b.position))[0];
    if(extra)dealt+=receiveDamage(extra,damage*gear.volleyShot,now,false,unit);
   }
   if(thirdAttack && gear.colossusSlam)dealt+=receiveDamage(target,unit.max*gear.colossusSlam*100/(100+target.defense),now,false,unit);
   const technician=cast && !utility && gear.techRepeat &&
    (unit.movePowers[0]<=150 || unit.moveEffects.some(effect=>effect==='volley' || effect==='spread'));
   if(technician)dealt+=receiveDamage(target,damage*gear.techRepeat,now,critical>1,unit);
   if(cast && !utility && unit.echo){
    unit.echo=false;
    dealt+=receiveDamage(target,Math.max(1,Math.round(damage*.35)),now,critical>1,unit);
   }
   if(!utility)gearHit(unit,target,units,dealt,cast,critical>1,now);
   if(guts && gear.gutsVamp)heal(unit,dealt*gear.gutsVamp);
   if(!utility && gear.toxicSwarm && target.hp>0){
    target.poisonUntil=target.elapsed+5000;
    target.nextPoison ??= target.elapsed+1000;
    target.poisonSource=unit;
    target.woundUntil=Math.max(target.woundUntil ?? 0,target.poisonUntil);
   }
   if(cast && dealt>0 && gear.chillSlow){
    target.chillUntil=target.elapsed+4000;
    target.chillSlow=gear.chillSlow;
   }
   if(gear.chainTargets && (cast || unit.basicHits%4===0)){
    const victims=units.filter(other=>other.hp>0 && other.opponent!==unit.opponent)
     .sort((a,b)=>distance(target.position,a.position)-distance(target.position,b.position)).slice(0,gear.chainTargets);
    for(const victim of victims){
     receiveDamage(victim,unit.specialAttack*.35*100/(100+victim.specialDefense),now,false,unit);
     victim.lightningUntil=victim.elapsed+4000;
     victim.wait=Math.max(0,victim.wait)+250;
    }
   }
   if(cast){
    applySignature(unit,target,units,damage,now,dealt);
    if(gear.prankLock && !unit.prankUsed){
     unit.prankUsed=true;
     target.manaLock=Math.max(target.manaLock,gear.prankLock*1000);
    }
    if(gear.rivalPulse){
     const rival=units.find(other=>other.hp>0 && other.opponent===unit.opponent && other.star===3 && other.name===rivalFor(unit.name));
     if(rival){gainMana(rival,15);rival.rivalUntil=rival.elapsed+3000;}
    }
    if(unit.truantAsleep){unit.truantAsleep=false;unit.truantUntil=unit.elapsed+6000;}
    if(gear.glitch){
     unit.glitchCasts=(unit.glitchCasts ?? 0)+1;
     if(unit.glitchCasts%2===0)scrambleRole(unit);
    }
    grantTowerWard(unit,units);
   }
   if(target.hp<=0 && (unit.momentum || gear.takedownHeal))
    heal(unit,(unit.momentum?unit.max*.08:0)+(unit.max-unit.hp)*(gear.takedownHeal ?? 0));
   if(target.hp<=0 && gear.takedownHaste)unit.rallyUntil=unit.elapsed+gear.takedownHaste*1000;
   if(cast){
    if(gear.relayMana){
     const allies=units.filter(other=>other!==unit && other.hp>0 && other.opponent===unit.opponent && other.manaLock<=0)
      .sort((a,b)=>a.mana-b.mana).slice(0,1+(gear.relayExtra ?? 0));
     for(const ally of allies)gainMana(ally,gear.relayMana);
    }
    unit.mana=Math.min(60,(unit.overcharge?10:0)+(gear.castRefund ?? 0));
    unit.overcharge=false;
    unit.manaLock=unit.manaLockMs;
   }else gainMana(unit,unit.manaOnHit+(gear.hitMana ?? 0)+(critical>1?(gear.critMana ?? 0):0));
   const rally=unit.rallyUntil>unit.elapsed?[.15,.25,.40][unit.star-1]:0;
   const frost=1-Math.max(unit.frostUntil>unit.elapsed?.25:0,unit.chillUntil>unit.elapsed?unit.chillSlow:0);
   const traitHaste=(unit.galeUntil>unit.elapsed?.25:0)+(unit.truantUntil>unit.elapsed?1:0)+(unit.rivalUntil>unit.elapsed?.20:0);
   unit.wait+=1000*(1-(unit.signatureRush ?? 0))/(frost*unit.attackSpeed*(1+rally+traitHaste+Math.min(5,unit.basicHits ?? 0)*(gear.strikeHaste ?? 0)+Math.floor(unit.elapsed/1000)*(gear.rampSpeed ?? 0)));
   unit.signatureRush=0;
  }
 }
 function outcome(units){
  const ours=units.filter(u=>u.hp>0&&!u.opponent),theirs=units.filter(u=>u.hp>0&&u.opponent);
  if(!ours.length || !theirs.length)return Math.sign(ours.length-theirs.length);
  return null;
 }
 function result(a,b,units,sign){
  const losers=sign===0?[a,b]:[sign>0?b:a];
  const damage=2+Math.floor(run.round/3)+units.filter(u=>u.hp>0 && u.opponent===(sign<0)).length;
  for(const trainer of [a,b]){
   const lost=losers.includes(trainer);
   trainer.streak=lost?Math.min(-1,trainer.streak-1):Math.max(1,trainer.streak+1);
   payRound(trainer,passiveGold(),lost?0:1);
   xp(trainer,2);
   if(lost)trainer.hp=Math.max(0,trainer.hp-damage);
   if(!trainer.hp){
    trainer.eliminated=run.round;
    releaseShop(trainer);
    for(const unit of [...trainer.units,...(trainer.bossRewards ?? [])])run.pool.get(familyOf(unit)).copies+=familyCopies(unit);
    trainer.bossRewards=[];
    trainer.units=[];
   }
  }
 }
 function resolve(units){
  for(let i=0;i<combatTicks && outcome(units)===null;i++)tick(units);
  return outcome(units) ?? 0;
 }
 function equippedItems(unit,onTile=false){
  const row=element('div',null,'tactics-live-items'+(onTile?' tactics-placement-items':''));
  row.append(...unit.items.map(itemIcon));
  return row;
 }
 function paintSignatureEffects(canvas,units,now){
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width || !height)return;
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,width,height);
  for(const unit of units){
   const cast=unit.lastCast;
   if(!cast)continue;
   const time=(now-cast.started)/620;
   if(time<0 || time>=1)continue;
   const x=point=>width*(.12+point.x/6.5*.76);
   const y=point=>height*(.09+point.y/5.95*.82);
   const seed=Array.from(cast.move).reduce((sum,char)=>sum*31+char.charCodeAt(0)>>>0,0);
   const travel=Math.min(1,time*2.5);
   const burst=Math.max(0,(time-.4)/.6);
   const color=signatureColors[unit.moveType];
   const radius=(16+unit.star*9)*burst;
   ctx.fillStyle=color;
   ctx.shadowColor=color;
   ctx.shadowBlur=7;
   ctx.globalAlpha=1-time;
   for(let i=0;i<8+unit.star*4;i++){
    const angle=i*2.4+(seed%360)*Math.PI/180;
    const distance=radius*(.45+.55*((i*13+seed)%11)/10);
    const offset=(1-travel)*Math.sin(angle)*(3+seed%8);
    const px=x(cast.from)+(x(cast.to)-x(cast.from))*travel+Math.cos(angle)*distance;
    const py=y(cast.from)+(y(cast.to)-y(cast.from))*travel+Math.sin(angle)*distance+offset;
    const size=2+(i+seed)%4;
    ctx.fillRect(Math.round(px),Math.round(py),size,size);
   }
  }
  ctx.globalAlpha=1;
 }
 const effectLabels={
  teamShield:'Team shield',shield:'Shield',cover:'Cover shield',fortify:'Nearby shields',aegis:'Backline shield',
  recoil:'Recoil',brace:'Self shield',windup:'Recovery',allyHaste:'Ally speed up',ward:'Hit blocked',heal:'Ally heal',tide:'Team heal',bloom:'Self heal',leech:'Lifesteal',sap:'Mana drain',spark:'Mana granted',
  sunder:'DEF down',shred:'S.DEF down',burn:'Burn',wound:'Wound',frost:'Attack speed down',snare:'Action delayed',
  weaken:'Damage down',rally:'Attack speed up',rush:'Faster next attack',veil:'Damage reduction',
  thorn:'Defense up',cleanse:'Cleanse',volley:'Splash',spread:'Area damage',gale:'Knockback',blink:'Repositioned',quake:'Area delay'
 };
 function combatLayer(units){
  const layer=element('div',null,'tactics-combat-space');
  const effects=element('canvas',null,'tactics-signature-effects');
  effects.setAttribute('aria-hidden','true');
  const damageLayer=element('div',null,'tactics-damage-layer');
  const damageLabels=new Map();
  const views=units.map(unit=>{
   const node=element('div',null,'tactics-live-unit'+(unit.opponent?' is-opponent':''));
   const bars=element('div',null,'tactics-live-bars');
   const hp=element('progress'),mana=element('progress');
   hp.max=unit.max;mana.max=60;
   hp.value=unit.hp;mana.value=unit.mana;
   hp.setAttribute('aria-label',unit.name+' health');
   mana.setAttribute('aria-label',unit.name+' mana');
   const health=element('div',null,'tactics-live-health');
   const shield=element('span',null,'tactics-shield-fill');
   shield.setAttribute('aria-hidden','true');
   health.append(hp,shield);
   bars.append(health,mana);
   if(unit.combatItems?.length)node.append(equippedItems({...unit,items:unit.combatItems}));
   const bubble=element('span',null,'tactics-cast-bubble');
   const status=element('span',null,'tactics-effect-summary');
   bubble.hidden=true;
      const sprite=battlerSprite(unit);
   if(unit.gear.colossusSlam || unit.bossHp){
    const scale=unit.bossHp?1.5:1+({'0.04':.15,'0.07':.30,'0.12':.50}[unit.gear.colossusSlam] ?? 0);
    sprite.style.scale=String(scale);
    sprite.style.transformOrigin='center bottom';
   }
   node.append(bars,sprite,element('span','★'.repeat(unit.star),'tactics-combat-stars'),bubble,status);
   unitControls(node,unit,false);
   layer.append(node);
   return {unit,node,hp,mana,bubble,shield,status,shownShield:0};
  });
  layer.append(effects,damageLayer);
  let lastPaint=performance.now();
  function easeMeter(meter,target,weight){
   const difference=target-meter.value;
   meter.value=Math.abs(difference)<.1?target:meter.value+difference*weight;
  }
  function paint(now){
   const weight=1-Math.exp(-Math.max(0,now-lastPaint)/55);
   lastPaint=now;
   paintSignatureEffects(effects,units,now);
   const visibleDamage=new Set();
   for(const unit of units){
    if(!unit.damageEvents)continue;
    unit.damageEvents=unit.damageEvents.filter(event=>now-event.started<850);
    for(const [index,event] of unit.damageEvents.entries()){
     visibleDamage.add(event);
     let label=damageLabels.get(event);
     if(!label){
      label=element('span',String(event.amount),'tactics-damage-number'+(event.critical?' is-critical':''));
      damageLabels.set(event,label);
      damageLayer.append(label);
     }
     const progress=Math.max(0,(now-event.started)/850);
     placeOnField(label,unit.position.x+(index%3-1)*.22,unit.position.y-.3-progress*.8);
     label.style.opacity=String(Math.min(1,(1-progress)*3));
    }
   }
   for(const [event,label] of damageLabels){
    if(visibleDamage.has(event))continue;
    label.remove();
    damageLabels.delete(event);
   }
   for(const view of views){
    const {unit,node,hp,mana,bubble,shield,status}=view;
    easeMeter(hp,unit.hp,weight);
    const activeShield=unit.hp>0?unit.shield+(unit.signatureShieldUntil>unit.elapsed?unit.signatureShield:0):0;
    view.shownShield+=(activeShield-view.shownShield)*weight;
    if(Math.abs(view.shownShield-activeShield)<.1)view.shownShield=activeShield;
    const capacity=Math.max(unit.max,hp.value+view.shownShield);
    hp.max=capacity;
    shield.style.left=(100*hp.value/capacity)+'%';
    shield.style.width=(100*view.shownShield/capacity)+'%';
    easeMeter(mana,unit.mana,weight);
    if(unit.hp<=0 && hp.value===0){node.hidden=true;continue;}
    const at=unit.position,from=unit.moveFrom ?? at;
    const progress=Math.min(1,Math.max(0,(now-(unit.moveStarted ?? now))/combatStepMs));
    const x=from.x+(at.x-from.x)*progress,y=from.y+(at.y-from.y)*progress;
    placeOnField(node,x,y);
    node.style.zIndex=String(1+Math.floor(y*10));
    const cast=unit.lastCast;
    const casting=Boolean(cast && now-cast.started<950);
    bubble.hidden=!casting;
    if(casting){
     const effects=unit.moveEffects.map(key=>effectLabels[key]).filter(Boolean).join(' · ');
     const label=cast.move+(effects?' — '+effects:'');
     if(bubble.dataset.castLabel!==label){bubble.dataset.castLabel=label;bubble.replaceChildren(skillTitle('span',cast.move,'',effects?' — '+effects:'',signatureKind(unit)));}
    }
    const condition=[activeShield>0?'Shield':null,unit.truantAsleep?'Asleep':null,...[
     ['burnUntil','Burn'],['woundUntil','Wound'],['sunderUntil','DEF ↓'],['shredUntil','S.DEF ↓'],
     ['rallyUntil','Speed ↑'],['frostUntil','Speed ↓'],['weakenUntil','Damage ↓'],['chillUntil','Chill'],['poisonUntil','Poison'],['fairyUntil','ATK ↑'],['truantUntil','Awake']
    ].filter(([key])=>unit[key]>unit.elapsed).map(([,label])=>label)].filter(Boolean).join(' · ');
    if(status.textContent!==condition)status.textContent=condition;
    status.hidden=!condition;
    node.classList.toggle('is-casting',Boolean(cast && now-cast.started<380));
    paintBattler(unit,now);
   }
  }
  paint(performance.now());
  return {layer,paint};
 }
 function advanceRound(){
  run.round++;
  const living=run.trainers.filter(trainer=>trainer.hp>0);
  for(const trainer of living)returnShopCards(trainer,true);
  // Return the whole lobby's unlocked offers before dealing any new shops.
  for(const trainer of drawRogueChoices(living,living.length))fillShop(trainer);
  run.selected=null;
  run.busy=false;
  run.spectate=null;
  beginChoices();
  if(run.choice)render();
  else if(carouselRound(run.round))advanceRound();
  else startPlanning();
 }
 async function play(){
  if(run.busy || run.finished || run.branchDialog || run.choice)return;
  clearInterval(planningTimer);
  if(openingRound(run.round)){run.result='Opening complete. Wild battles begin at 1-2.';advanceRound();return;}
  const current=run;
  run.busy=true;
  run.scout=null;
  const player=run.trainers[0];
  if(!field(player).length && player.units.length)player.units[0].position=cells[31];
  const opponents=drawRogueChoices(run.trainers.slice(1).filter(t=>t.hp>0),7);
  for(const trainer of opponents)planAI(trainer);
  const neutral=neutralRound(run.round);
  const rival=neutral?neutralTrainer():opponents.shift();
  const ghost={units:field(rival).map(unit=>({...unit})),mods:rival.mods};
  const matches=[];
  const addMatch=(a,b,mirror=false)=>{
   const match={a,b,units:battle(a,b),mirror,sign:null,ticks:0};
   match.sign=outcome(match.units);
   matches.push(match);
  };
  addMatch(player,rival);
  if(neutral)for(const trainer of opponents)addMatch(trainer,rival);
  else {
   for(let i=0;i+1<opponents.length;i+=2)addMatch(opponents[i],opponents[i+1]);
   if(opponents.length%2)addMatch(opponents.at(-1),ghost,true);
  }
  let watched, watchedTrainer, view, timer, countdown, chart, frame=0;
  run.spectate=trainer=>{
   const match=matches.find(entry=>entry.a===trainer || entry.b===trainer);
   if(!match || match===watched && trainer===watchedTrainer)return;
   watched=match;watchedTrainer=trainer;
   const opponent=match.b.name ?? 'Mirror team';
   const battleView=battleLayout(match.a,match.units,match.a.name+' vs '+opponent,trainer);
   timer=battleView.timer;
   countdown=battleView.countdown;
   view=combatLayer(match.units);
   battleView.arena.insertBefore(view.layer,battleView.arena.querySelector('.tactics-bench'));
   chart=damageChart(matches[0]);
   battleView.left.append(chart.panel);
   content.replaceChildren(battleView.layout);
  };
  run.spectate(player);
  const animate=now=>{
   if(run!==current || !current.busy || phase!=='tactics')return;
   view.paint(now);
   requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
  for(;frame<combatTicks && matches.some(match=>match.sign===null);frame++){
   await new Promise(resolve=>setTimeout(resolve,combatStepMs));
   if(run!==current || phase!=='tactics')return;
   for(const match of matches)if(match.sign===null){
    tick(match.units,performance.now());
    match.ticks++;
    match.sign=outcome(match.units);
   }
   chart.update();
   timer.value=100*(1-(frame+1)/combatTicks);
   countdown.textContent=(frame*combatStepMs>=overtimeStartMs?'Overtime · ':'')+Math.ceil((combatTicks-frame-1)*combatStepMs/1000)+'s';
   timer.title=matches.filter(match=>match.sign===null).length+' battles still in progress';
  }
  const lastVisibleCast=Math.max(0,...(watched?.units ?? []).map(unit=>unit.lastCast?.started ?? 0));
  const remainingEffect=lastVisibleCast+620-performance.now();
  if(remainingEffect>0)await new Promise(resolve=>setTimeout(resolve,remainingEffect));
  if(run!==current || phase!=='tactics')return;
  run.damageReport=matches[0];
  if(matches[0].units.some(unit=>!unit.opponent) && matches[0].units.some(unit=>unit.opponent))creditTacticsRound(run,frame);
  const sign=matches[0].sign ?? 0;
  let loot='';
  if(neutral){
   for(const match of matches){
    const reward=completeNeutral(match.a,match.sign>0);
    if(match.a===player)loot=reward;
   }
  }else{
   for(const match of matches){
    const enemy=match.mirror?{units:[],shop:[],hp:100,gold:0,level:maxLevel,streak:0}:match.b;
    result(match.a,enemy,match.units,match.sign ?? 0);
   }
   if(!player.hp)run.place=1+run.trainers.filter(t=>t.hp>0).length+
    run.trainers.slice(1).filter(t=>t.eliminated===run.round && t.name.localeCompare(player.name)<0).length;
  }
  run.result=(sign>0?'Victory against '+rival.name:sign<0?'Defeat against '+rival.name:'Draw against '+rival.name)+(loot?' · '+loot:'');
  if(run.round===finalRound && player.hp){
   const ranked=[...run.trainers].filter(trainer=>trainer.hp>0).sort((a,b)=>b.hp-a.hp || b.gold-a.gold);
   run.place=ranked.indexOf(player)+1;
   run.finished=true;
  }
  if(megaRound(run.round))run.completedStage=stageRound(run.round).stage;
  if(run.finished || !player.hp || run.trainers.filter(t=>t.hp>0).length<=1){
   run.finished=true;
   awardPlacement(run);
   const note=recordBattlePass({battles:1,wins:!run.place || run.place===1?1:0,tacticsMatches:1});
   if(note)showPassBattleNotice(note+' · '+battlePassProgressText());
   run.busy=false;
   run.spectate=null;
   render();
  }else advanceRound();
  void checkGameVersion();
 }
 window.hasActiveTacticsRun=()=>phase==='tactics' && !run?.finished && Boolean(run?.trainers[0].hp && run.trainers.filter(trainer=>trainer.hp>0).length>1);
 byId('home-tactics').onclick=openTactics;
 byId('tactics-back').onclick=()=>{clearInterval(planningTimer);run=null;openMenu();};
})();
