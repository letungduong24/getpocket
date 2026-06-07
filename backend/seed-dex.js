const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'gts_bot',
};

// Versions from Gen 7 and below
const GEN7_AND_BELOW_VERSIONS = new Set([
  'red-blue', 'yellow', 'gold-silver', 'crystal', 'ruby-sapphire', 'emerald',
  'firered-leafgreen', 'colosseum', 'xd', 'diamond-pearl', 'platinum',
  'heartgold-soulsilver', 'black-white', 'black-2-white-2', 'x-y',
  'omega-ruby-alpha-sapphire', 'sun-moon', 'ultra-sun-ultra-moon'
]);

const abilityCache = new Map();

async function fetchJson(url) {
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      retries--;
      if (retries === 0) throw e;
      console.log(`Error fetching ${url}, retrying in 2 seconds... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function isAbilityGen7OrBelow(abilityName, abilityUrl) {
  if (abilityCache.has(abilityName)) {
    return abilityCache.get(abilityName);
  }

  try {
    const data = await fetchJson(abilityUrl);
    if (!data) {
      abilityCache.set(abilityName, false);
      return false;
    }
    
    const genName = data.generation.name;
    const isGen7 = !['generation-viii', 'generation-ix', 'generation-x'].includes(genName);
    
    abilityCache.set(abilityName, isGen7);
    return isGen7;
  } catch (e) {
    console.error(`Failed to check generation for ability ${abilityName}:`, e.message);
    return false;
  }
}

function getPokeApiName(csvName) {
  let name = csvName.toLowerCase().trim();
  
  // Special PokeAPI form mappings
  if (name === 'meowstic') return 'meowstic-male';
  if (name === 'aegislash') return 'aegislash-shield';
  if (name === 'gourgeist') return 'gourgeist-average';
  if (name === 'lycanroc') return 'lycanroc-midday';
  if (name === 'mimikyu') return 'mimikyu-disguised';
  
  if (name.includes('(alolan)')) {
    name = name.replace('(alolan)', '').trim().replace(/\s+/g, '-') + '-alola';
  }
  name = name.replace(/[^a-z0-9\-]/g, '');
  name = name.replace(/\-+/g, '-');
  return name;
}

async function run() {
  console.log('--- Pokémon Seeder Started ---');
  
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('Connected to database.');

    console.log('Truncating pokemon_dex table to rebuild with native Gen 7 moves...');
    await client.query('TRUNCATE TABLE pokemon_dex CASCADE;');
    
    console.log('Reading CSV file...');
    const csvPath = path.join(__dirname, '..', 'Pokemon_Champions_Dex_Final.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);

    const rows = lines.slice(1);
    console.log(`Found ${rows.length} rows in CSV.`);

    let seedCount = 0;
    for (const row of rows) {
      const parts = row.split(',');
      if (parts.length < 2) continue;

      const natDex = parseInt(parts[0], 10);
      const name = parts[1].trim();
      const typeOne = parts[2].trim();
      const typeTwo = parts[3] ? parts[3].trim() : 'N/A';

      if (natDex > 809) continue;
      if (name.toLowerCase().startsWith('mega ')) continue;
      if (name.toLowerCase().includes('(galar)') || 
          name.toLowerCase().includes('(hisuian)') || 
          name.toLowerCase().includes('(paldean)')) {
        continue;
      }

      // Check if already seeded to save API calls
      const checkRes = await client.query('SELECT 1 FROM pokemon_dex WHERE name = $1', [name]);
      if (checkRes.rowCount > 0) {
        // Already seeded
        continue;
      }

      console.log(`Processing missing: #${natDex} ${name} ...`);

      const pokeApiName = getPokeApiName(name);
      const pokemonData = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${pokeApiName}`);
      
      if (!pokemonData) {
        console.warn(`⚠️ Warning: Could not find ${name} (${pokeApiName}) in PokeAPI. Skipping.`);
        continue;
      }

      const validAbilities = [];
      for (const abilityInfo of pokemonData.abilities) {
        const abName = abilityInfo.ability.name;
        const abUrl = abilityInfo.ability.url;
        
        const isGen7 = await isAbilityGen7OrBelow(abName, abUrl);
        if (isGen7) {
          const formattedAbility = abName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          validAbilities.push(formattedAbility);
        }
      }

      const validMoves = [];
      for (const moveInfo of pokemonData.moves) {
        const mvName = moveInfo.move.name;
        
        const hasGen7Version = moveInfo.version_group_details.some(detail => 
          ['sun-moon', 'ultra-sun-ultra-moon'].includes(detail.version_group.name)
        );

        if (hasGen7Version) {
          const formattedMove = mvName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          validMoves.push(formattedMove);
        }
      }

      // Prefer official-artwork sprite (works for regional forms). Fallback to
      // the front_default sprite that the PokeAPI entry returns.
      const spriteUrl =
        pokemonData.sprites?.other?.['official-artwork']?.front_default ||
        pokemonData.sprites?.front_default ||
        null;

      await client.query(
        `INSERT INTO pokemon_dex (nat_dex, name, type_one, type_two, abilities, moves, sprite_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [natDex, name, typeOne, typeTwo, validAbilities, validMoves, spriteUrl]
      );

      seedCount++;
      console.log(`Successfully seeded #${natDex} ${name}. (Abilities: ${validAbilities.length}, Moves: ${validMoves.length})`);
      
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    console.log(`\n--- Seeding Completed! Seeded ${seedCount} new Pokémon. ---`);

  } catch (err) {
    console.error('Fatal Error during seeding:', err);
  } finally {
    await client.end();
  }
}

run();
