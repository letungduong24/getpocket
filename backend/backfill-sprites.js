const { Client } = require('pg');

// Database configuration (mirrors seed-dex.js)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'gts_bot',
};

// Custom delay (ms) between PokeAPI requests. Default matches seed-dex.js.
const REQUEST_DELAY_MS = parseInt(process.env.BACKFILL_DELAY_MS || '150', 10);

// Whether to also re-resolve rows that already have a sprite_url
// (useful after changing the sprite-resolution logic).
const FORCE_REFETCH = process.env.BACKFILL_FORCE === '1';

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
      console.log(`  Error fetching ${url}, retrying in 2 seconds... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

function getPokeApiName(csvName) {
  let name = csvName.toLowerCase().trim();

  // Special PokeAPI form mappings (mirrors seed-dex.js)
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

function resolveSprite(pokemonData) {
  // Prefer official-artwork sprite (works for regional forms). Fallback to the
  // front_default sprite that the PokeAPI entry returns.
  return (
    pokemonData?.sprites?.other?.['official-artwork']?.front_default ||
    pokemonData?.sprites?.front_default ||
    null
  );
}

async function run() {
  console.log('--- Pokémon Sprite Backfill Started ---');
  console.log(`Mode: ${FORCE_REFETCH ? 'force-refetch ALL rows' : 'rows with NULL sprite_url only'}`);

  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('Connected to database.');

    const whereClause = FORCE_REFETCH ? '' : 'WHERE sprite_url IS NULL';
    const { rows } = await client.query(
      `SELECT id, nat_dex, name FROM pokemon_dex ${whereClause} ORDER BY nat_dex ASC`
    );

    console.log(`Found ${rows.length} row(s) to process.`);
    if (rows.length === 0) {
      console.log('Nothing to do.');
      return;
    }

    let updated = 0;
    let missing = 0;
    let failed = 0;

    for (const row of rows) {
      const pokeApiName = getPokeApiName(row.name);
      try {
        const pokemonData = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${pokeApiName}`);
        if (!pokemonData) {
          console.warn(`  ⚠️  No PokeAPI data for #${row.nat_dex} ${row.name} (${pokeApiName}) — leaving sprite_url unchanged.`);
          missing++;
          continue;
        }

        const spriteUrl = resolveSprite(pokemonData);
        await client.query(
          'UPDATE pokemon_dex SET sprite_url = $1 WHERE id = $2',
          [spriteUrl, row.id]
        );
        updated++;
        console.log(`  ✓ #${row.nat_dex} ${row.name} → ${spriteUrl ?? '(null)'}`);
      } catch (e) {
        failed++;
        console.error(`  ✗ #${row.nat_dex} ${row.name} failed: ${e.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    }

    console.log(
      `\n--- Backfill done. Updated: ${updated}, missing-on-PokeAPI: ${missing}, failed: ${failed} ---`
    );
  } catch (err) {
    console.error('Fatal Error during backfill:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
