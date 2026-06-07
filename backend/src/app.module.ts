import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { PokedexModule } from './pokedex/pokedex.module';
import { ShopModule } from './shop/shop.module';
import { AuthModule } from './auth/auth.module';
import { Pokedex } from './pokedex/pokedex.entity';
import { PricingConfig } from './shop/pricing-config.entity';
import { Order } from './shop/order.entity';
import { OrderItem } from './shop/order-item.entity';
import { User } from './auth/user.entity';
import { CartItem } from './shop/cart-item.entity';
import { Pack } from './shop/pack.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'gts_bot',
      entities: [Pokedex, PricingConfig, Order, OrderItem, User, CartItem, Pack],
      synchronize: true, // Schema created via init.sql / seed-dex.js / raw query below
      logging: true,
    }),
    PokedexModule,
    ShopModule,
    AuthModule,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    console.log('[AppModule] Checking and running database seeds...');
    try {
      // 1. Seed pricing config if not exists
      const pricingCount = await this.dataSource.query(`SELECT COUNT(*) FROM pricing_config;`);
      if (parseInt(pricingCount[0].count, 10) === 0) {
        await this.dataSource.query(`
          INSERT INTO pricing_config (key, value, description) VALUES
          ('retail_price', 15000.00, 'Giá bán lẻ cho mỗi con Pokémon (VND)'),
          ('wholesale_price', 10000.00, 'Giá bán sỉ cho mỗi con Pokémon khi đơn hàng đạt số lượng sỉ (VND)'),
          ('wholesale_threshold', 5.00, 'Số lượng Pokémon tối thiểu trong đơn để được tính giá sỉ (con)');
        `);
        console.log('[AppModule] Seeding of pricing config completed.');
      } else {
        console.log('[AppModule] Pricing config is already seeded.');
      }

      // 2. Seed default admin and user if not exists
      const usersCount = await this.dataSource.query(`SELECT COUNT(*) FROM users;`);
      if (parseInt(usersCount[0].count, 10) === 0) {
        const adminUser = process.env.ADMIN_USERNAME || 'admin';
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        const adminHash = await bcrypt.hash(adminPass, 10);
        await this.dataSource.query(`
          INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'ADMIN');
        `, [adminUser, adminHash]);
        console.log(`[AppModule] Seeded default ADMIN user: ${adminUser}`);

        const normalUser = 'user';
        const normalHash = await bcrypt.hash('user123', 10);
        await this.dataSource.query(`
          INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'USER');
        `, [normalUser, normalHash]);
        console.log(`[AppModule] Seeded default USER user: ${normalUser}`);
      } else {
        console.log('[AppModule] Users table is already seeded.');
      }

      // 3. Seed default Event Pack if not exists
      // First, clean up old mythical event pack if it exists
      await this.dataSource.query(`DELETE FROM packs WHERE name = 'Gen 1-7 Mythical Event Pack';`);

      const packCheck = await this.dataSource.query(`SELECT COUNT(*) FROM packs WHERE name = $1;`, ['Pack Pokémon Champions']);
      if (parseInt(packCheck[0].count, 10) === 0) {
        console.log('[AppModule] Pack Pokémon Champions not found. Starting save file seeder...');
        
        // Find main save file path
        let saveFilePath = '';
        const pathsToTry = [
          path.join(process.cwd(), '..', 'main'),
          path.join(process.cwd(), 'main'),
          path.join(__dirname, '..', '..', 'main'),
          'C:\\Study\\trade\\main'
        ];

        for (const p of pathsToTry) {
          if (fs.existsSync(p)) {
            saveFilePath = p;
            break;
          }
        }

        if (saveFilePath) {
          console.log(`[AppModule] Found save file at: ${saveFilePath}`);
          try {
            const saveBuffer = fs.readFileSync(saveFilePath);
            const base64 = saveBuffer.toString('base64');

            // Fetch allowed species from database
            const allowedRows = await this.dataSource.query('SELECT DISTINCT nat_dex FROM pokemon_dex;');
            const allowedSpecies = allowedRows.map((r: any) => r.nat_dex);
            console.log(`[AppModule] Loaded ${allowedSpecies.length} allowed species from database.`);

            const workerUrl = process.env.MICROSERVICE_URL || 'http://localhost:5001';
            console.log(`[AppModule] Calling worker to filter save and extract Pokémon list at ${workerUrl}/api/filter-save...`);
            
            const response = await fetch(`${workerUrl}/api/filter-save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                SaveDataBase64: base64,
                AllowedSpecies: allowedSpecies
              })
            });

            if (!response.ok) {
              const err = await response.text();
              throw new Error(`Worker returned error: ${err}`);
            }

            const result = await response.json() as any;
            if (result.success) {
              console.log(`[AppModule] Successfully filtered save file. Received ${result.pokemonList.length} unique Pokémon.`);

              // Write the filtered save file back to disk at main_filtered
              const filteredBuffer = Buffer.from(result.filteredSaveBase64, 'base64');
              const filteredWritePath = path.join(path.dirname(saveFilePath), 'main_filtered');
              fs.writeFileSync(filteredWritePath, filteredBuffer);
              console.log(`[AppModule] Saved filtered 3DS save file to: ${filteredWritePath}`);

              // Seed the Pack Pokémon Champions
              await this.dataSource.query(`
                INSERT INTO packs (name, price, description, items)
                VALUES ($1, $2, $3, $4);
              `, [
                'Pack Pokémon Champions',
                300000.00,
                'Bộ sưu tập 152 Pokémon Champions độc nhất, được trích xuất hoàn chỉnh từ file save 3DS của bạn. Hoàn toàn hợp lệ để lưu trữ trong Pokémon Bank và chuyển lên Pokémon Home.',
                JSON.stringify(result.pokemonList)
              ]);
              console.log('[AppModule] Seeding of Pack Pokémon Champions completed successfully.');
            } else {
              console.error('[AppModule] Worker reported failure:', result.error);
            }
          } catch (err) {
            console.error('[AppModule] Error seeding from save file:', err.message);
          }
        } else {
          console.warn('[AppModule] Save file (main) not found. Skipping Pack Pokémon Champions seeding.');
        }
      } else {
        console.log('[AppModule] Pack Pokémon Champions is already seeded.');
      }

      // 4. Seed Pokedex if empty
      const dexCount = await this.dataSource.query(`SELECT COUNT(*) FROM pokemon_dex;`);
      if (parseInt(dexCount[0].count, 10) === 0) {
        console.log('[AppModule] pokemon_dex is empty. Starting Pokedex seeder...');
        await this.seedPokedex();
      } else {
        console.log(`[AppModule] Pokedex is already seeded with ${dexCount[0].count} entries.`);
      }

      // 5. Clean up removed moves from pokemon_dex if they exist
      const removedMoves = [
        'Razor Wind', 'Karate Chop', 'Double Slap', 'Comet Punch', 'Jump Kick', 'Rolling Kick', 'Twineedle', 'Sonic Boom',
        'Dragon Rage', 'Meditate', 'Rage', 'Barrier', 'Bide', 'Mirror Move', 'Egg Bomb', 'Bone Club', 'Clamp', 'Spike Cannon',
        'Constrict', 'Kinesis', 'Barrage', 'Bubble', 'Dizzy Punch', 'Flash', 'Psywave', 'Sharpen', 'Nightmare', 'Foresight',
        'Magnitude', 'Secret Power', 'Snatch', 'Refresh', 'Signal Beam', 'Silver Wind', 'Sky Uppercut', 'Pursuit', 'Hidden Power',
        'Return', 'Frustration', 'Spider Web', 'Feint Attack', 'Heart Stamp', 'Rototiller', 'Ion Deluge', 'Odor Sleuth',
        'Grass Whistle', 'Water Sport', 'Mud Sport', 'Miracle Eye', 'Wake Up Slap', 'Natural Gift', 'Embargo', 'Trump Card',
        'Heal Block', 'Wring Out', 'Lucky Chant', 'Me First', 'Punishment', 'Mud Bomb', 'Mirror Shot', 'Rock Climb', 'Magnet Bomb',
        'Captivate', 'Heal Order', 'Ominous Wind', 'Telekinesis', 'Flame Burst', 'Synchronoise', 'Chip Away', 'Sky Drop', 'Bestow',
        'Steamroller', 'Ice Ball', 'Needle Arm', 'Smelling Salts', 'Assist', 'Camouflage'
      ];
      console.log('[AppModule] Cleaning up deprecated/removed moves from Pokédex database...');
      for (const move of removedMoves) {
        await this.dataSource.query(
          `UPDATE pokemon_dex SET moves = array_remove(moves, $1) WHERE $1 = ANY(moves);`,
          [move]
        );
      }
      console.log('[AppModule] Deprecated/removed moves cleanup finished.');

    } catch (err) {
      console.error('[AppModule] Failed to run database seeds:', err.message);
    }
  }

  private async seedPokedex() {
    const csvPath = path.join(__dirname, '..', '..', 'Pokemon_Champions_Dex_Final.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`[AppModule] CSV file not found at: ${csvPath}`);
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
    const rows = lines.slice(1);
    console.log(`[AppModule] Found ${rows.length} rows in CSV.`);

    let seedCount = 0;
    const abilityCache = new Map<string, boolean>();

    const fetchJson = async (url: string) => {
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
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      return null;
    };

    const isAbilityGen7OrBelow = async (abilityName: string, abilityUrl: string): Promise<boolean> => {
      if (abilityCache.has(abilityName)) {
        return abilityCache.get(abilityName)!;
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
    };

    const getPokeApiName = (csvName: string): string => {
      let name = csvName.toLowerCase().trim();
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
    };

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

      const checkRes = await this.dataSource.query('SELECT 1 FROM pokemon_dex WHERE name = $1', [name]);
      if (checkRes.length > 0) {
        continue;
      }

      const pokeApiName = getPokeApiName(name);
      const pokemonData = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${pokeApiName}`);
      if (!pokemonData) {
        console.warn(`[AppModule] ⚠️ Warning: Could not find ${name} (${pokeApiName}) in PokeAPI. Skipping.`);
        continue;
      }

      const validAbilities: string[] = [];
      for (const abilityInfo of pokemonData.abilities) {
        const abName = abilityInfo.ability.name;
        const abUrl = abilityInfo.ability.url;
        const isGen7 = await isAbilityGen7OrBelow(abName, abUrl);
        if (isGen7) {
          const formattedAbility = abName.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          validAbilities.push(formattedAbility);
        }
      }

      const validMoves: string[] = [];
      const removedMoves = [
        'Razor Wind', 'Karate Chop', 'Double Slap', 'Comet Punch', 'Jump Kick', 'Rolling Kick', 'Twineedle', 'Sonic Boom',
        'Dragon Rage', 'Meditate', 'Rage', 'Barrier', 'Bide', 'Mirror Move', 'Egg Bomb', 'Bone Club', 'Clamp', 'Spike Cannon',
        'Constrict', 'Kinesis', 'Barrage', 'Bubble', 'Dizzy Punch', 'Flash', 'Psywave', 'Sharpen', 'Nightmare', 'Foresight',
        'Magnitude', 'Secret Power', 'Snatch', 'Refresh', 'Signal Beam', 'Silver Wind', 'Sky Uppercut', 'Pursuit', 'Hidden Power',
        'Return', 'Frustration', 'Spider Web', 'Feint Attack', 'Heart Stamp', 'Rototiller', 'Ion Deluge', 'Odor Sleuth',
        'Grass Whistle', 'Water Sport', 'Mud Sport', 'Miracle Eye', 'Wake Up Slap', 'Natural Gift', 'Embargo', 'Trump Card',
        'Heal Block', 'Wring Out', 'Lucky Chant', 'Me First', 'Punishment', 'Mud Bomb', 'Mirror Shot', 'Rock Climb', 'Magnet Bomb',
        'Captivate', 'Heal Order', 'Ominous Wind', 'Telekinesis', 'Flame Burst', 'Synchronoise', 'Chip Away', 'Sky Drop', 'Bestow',
        'Steamroller', 'Ice Ball', 'Needle Arm', 'Smelling Salts', 'Assist', 'Camouflage'
      ];
      for (const moveInfo of pokemonData.moves) {
        const mvName = moveInfo.move.name;
        const hasGen7Version = moveInfo.version_group_details.some((detail: any) => 
          ['sun-moon', 'ultra-sun-ultra-moon'].includes(detail.version_group.name)
        );
        if (hasGen7Version) {
          const formattedMove = mvName.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          if (!removedMoves.includes(formattedMove)) {
            validMoves.push(formattedMove);
          }
        }
      }

      const spriteUrl =
        pokemonData.sprites?.other?.['official-artwork']?.front_default ||
        pokemonData.sprites?.front_default ||
        null;

      await this.dataSource.query(
        `INSERT INTO pokemon_dex (nat_dex, name, type_one, type_two, abilities, moves, sprite_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [natDex, name, typeOne, typeTwo, validAbilities, validMoves, spriteUrl]
      );

      seedCount++;
      console.log(`[AppModule] Seeded #${natDex} ${name}. (${validAbilities.length} Ab, ${validMoves.length} Mv)`);
      
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    console.log(`[AppModule] Pokedex seeding completed! Seeded ${seedCount} Pokémon.`);
  }
}
