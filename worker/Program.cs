using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using PKHeX.Core;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseCors("AllowAll");

app.MapPost("/api/validate", (PokemonRequest request) =>
{
    try
    {
        var result = ProcessRequest(request);
        return Results.Ok(new { valid = result.Valid, report = result.Report });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { valid = false, report = $"Internal error: {ex.Message}" });
    }
});

app.MapPost("/api/generate", (PokemonRequest request) =>
{
    try
    {
        var result = ProcessRequest(request);
        if (!result.Valid)
        {
            return Results.BadRequest(new { valid = false, report = result.Report });
        }
        
        byte[] pk7Bytes = result.Pokemon.Data.ToArray();
        string base64Data = Convert.ToBase64String(pk7Bytes);
        string fileName = $"{request.Species}_{request.Level}{(request.IsShiny ? "_Shiny" : "")}.pk7";
        
        return Results.Ok(new { 
            valid = true, 
            report = result.Report, 
            pk7Base64 = base64Data, 
            fileName = fileName 
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { valid = false, report = $"Internal error: {ex.Message}" });
    }
});

app.MapGet("/api/list-events", () =>
{
    var assembly = typeof(PKHeX.Core.PK7).Assembly;
    var result = new List<string>();
    foreach (var type in assembly.GetTypes())
    {
        if (type.Name.Contains("Event") || type.Name.Contains("Gift") || type.Name.Contains("Wonder"))
        {
            result.Add(type.FullName ?? type.Name);
        }
    }
    return Results.Ok(result);
});

app.MapPost("/api/filter-save", (FilterSaveRequest request) =>
{
    try
    {
        byte[] saveData = Convert.FromBase64String(request.SaveDataBase64);
        var saveFile = SaveUtil.GetSaveFile(saveData);
        if (saveFile == null)
        {
            return Results.BadRequest(new { success = false, error = "Failed to parse save file" });
        }

        var allowedDex = new HashSet<int>(request.AllowedSpecies);
        var validPokemon = new List<PKM>();

        int boxCount = saveFile.BoxCount;
        int totalBoxSlotCount = saveFile.BoxSlotCount;

        for (int b = 0; b < boxCount; b++)
        {
            for (int s = 0; s < totalBoxSlotCount; s++)
            {
                var pkm = saveFile.GetBoxSlotAtIndex(b, s);
                if (pkm != null && pkm.Species > 0 && allowedDex.Contains(pkm.Species))
                {
                    validPokemon.Add(pkm);
                }
            }
        }

        var party = saveFile.PartyData;
        foreach (var pkm in party)
        {
            if (pkm != null && pkm.Species > 0 && allowedDex.Contains(pkm.Species))
            {
                validPokemon.Add(pkm);
            }
        }

        var alolanIds = new HashSet<int> { 26, 38 }; // Raichu (26) and Ninetales (38) are the ones with Alolan forms in the database
        var alolanGroups = validPokemon
            .Where(p => alolanIds.Contains(p.Species))
            .GroupBy(p => new { p.Species, p.Form })
            .Select(g => g.First())
            .ToList();

        var normalGroups = validPokemon
            .Where(p => !alolanIds.Contains(p.Species))
            .GroupBy(p => p.Species)
            .Select(g => g.First())
            .ToList();

        var uniquePokemon = alolanGroups.Concat(normalGroups)
            .OrderBy(p => p.Species)
            .ThenBy(p => p.Form)
            .ToList();

        bool hasFloette = uniquePokemon.Any(p => p.Species == 670);
        if (!hasFloette && allowedDex.Contains(670))
        {
            var floette = new PK7();
            floette.Species = 670;
            floette.Version = GameVersion.US;
            floette.Language = 2; // EN
            floette.ConsoleRegion = 1; // Americas
            floette.Country = 49; // USA
            floette.Region = 84; // California
            floette.EggMetDate = DateOnly.FromDateTime(DateTime.Today);
            floette.MetDate = DateOnly.FromDateTime(DateTime.Today);
            floette.MetLocation = 78; // Paniola Ranch
            floette.EggLocation = 60002; // Nursery helpers
            floette.MetLevel = 1;
            floette.CurrentLevel = 50;
            floette.Ball = 4; // Poke Ball
            floette.EncryptionConstant = Util.Rand32();
            floette.PID = Util.Rand32();
            floette.Gender = 1; // Female
            floette.OriginalTrainerName = "Champions";
            floette.TrainerTID7 = 777777;
            floette.TrainerSID7 = 777777;
            floette.Nickname = "Floette";
            
            var pi = floette.PersonalInfo;
            floette.Ability = pi.Ability1;
            floette.AbilityNumber = 1;
            floette.Nature = Nature.Modest;
            
            floette.Move1 = 585; // Moonblast
            floette.Move2 = 94;  // Psychic
            floette.Move3 = 273; // Wish
            floette.Move4 = 312; // Aromatherapy
            floette.HealPP();
            
            var initialAnalysis = new LegalityAnalysis(floette);
            floette.SetRelearnMoves(initialAnalysis);
            
            uniquePokemon.Add(floette);
        }

        int totalSlots = boxCount * totalBoxSlotCount;
        for (int i = 0; i < totalSlots; i++)
        {
            saveFile.SetBoxSlotAtIndex(saveFile.BlankPKM, i, EntityImportSettings.None);
        }

        for (int i = 0; i < uniquePokemon.Count && i < totalSlots; i++)
        {
            saveFile.SetBoxSlotAtIndex(uniquePokemon[i], i, EntityImportSettings.None);
        }

        byte[] modifiedData = saveFile.Write(BinaryExportSetting.None).ToArray();
        string filteredSaveBase64 = Convert.ToBase64String(modifiedData);

        var pokemonList = new List<object>();
        foreach (var pkm in uniquePokemon)
        {
            var moves = new List<string>();
            if (pkm.Move1 > 0) moves.Add(GameInfo.Strings.movelist[pkm.Move1]);
            if (pkm.Move2 > 0) moves.Add(GameInfo.Strings.movelist[pkm.Move2]);
            if (pkm.Move3 > 0) moves.Add(GameInfo.Strings.movelist[pkm.Move3]);
            if (pkm.Move4 > 0) moves.Add(GameInfo.Strings.movelist[pkm.Move4]);

            string speciesName = GameInfo.Strings.specieslist[pkm.Species];
            if (pkm.Form == 1 && alolanIds.Contains(pkm.Species))
            {
                speciesName = $"{speciesName} (Alolan)";
            }

            var item = new {
                speciesId = pkm.Species,
                speciesName = speciesName,
                level = pkm.CurrentLevel,
                shiny = pkm.IsShiny,
                ability = GameInfo.Strings.abilitylist[pkm.Ability],
                nature = pkm.Nature.ToString(),
                heldItem = pkm.HeldItem > 0 ? GameInfo.Strings.itemlist[pkm.HeldItem] : "None",
                moves = moves.ToArray(),
                ivs = new { hp = pkm.IV_HP, atk = pkm.IV_ATK, def = pkm.IV_DEF, spa = pkm.IV_SPA, spd = pkm.IV_SPD, spe = pkm.IV_SPE },
                evs = new { hp = pkm.EV_HP, atk = pkm.EV_ATK, def = pkm.EV_DEF, spa = pkm.EV_SPA, spd = pkm.EV_SPD, spe = pkm.EV_SPE },
                trainerName = pkm.OriginalTrainerName,
                trainerTid = pkm.TrainerTID7,
                trainerSid = pkm.TrainerSID7,
                isEvent = pkm.FatefulEncounter,
                speciesSpriteUrl = $"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{(pkm.IsShiny ? "shiny/" : "")}{pkm.Species}.png"
            };
            pokemonList.Add(item);
        }

        return Results.Ok(new {
            success = true,
            filteredSaveBase64 = filteredSaveBase64,
            pokemonList = pokemonList
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { success = false, error = ex.Message });
    }
});

app.MapPost("/api/inject-save", (InjectSaveRequest request) =>
{
    try
    {
        byte[] saveData = Convert.FromBase64String(request.SaveDataBase64);
        var saveFile = SaveUtil.GetSaveFile(saveData);
        if (saveFile == null)
        {
            return Results.BadRequest(new { success = false, error = "Failed to parse save file" });
        }

        int boxCount = saveFile.BoxCount;
        int totalBoxSlotCount = saveFile.BoxSlotCount;
        int totalSlots = boxCount * totalBoxSlotCount;

        // Clean all boxes (PCs), keep Party untouched
        for (int i = 0; i < totalSlots; i++)
        {
            saveFile.SetBoxSlotAtIndex(saveFile.BlankPKM, i, EntityImportSettings.None);
        }

        // Inject new Pokémon
        for (int i = 0; i < request.Pk7sBase64.Count && i < totalSlots; i++)
        {
            byte[] pk7Bytes = Convert.FromBase64String(request.Pk7sBase64[i]);
            var pkm = new PK7(pk7Bytes);
            saveFile.SetBoxSlotAtIndex(pkm, i, EntityImportSettings.None);
        }

        byte[] modifiedData = saveFile.Write(BinaryExportSetting.None).ToArray();
        string modifiedSaveBase64 = Convert.ToBase64String(modifiedData);

        return Results.Ok(new {
            success = true,
            modifiedSaveBase64 = modifiedSaveBase64
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { success = false, error = ex.Message });
    }
});

app.MapGet("/api/items", () =>
{
    try
    {
        // USUM (Gen 7) held items cap at ID ~959; items above this are Gen 8/9 only
        const int UsumMaxItemId = 959;
        var itemlist = GameInfo.Strings.itemlist;
        var result = new List<string>();

        for (int id = 1; id <= UsumMaxItemId && id < itemlist.Length; id++)
        {
            string name = itemlist[id];
            if (!string.IsNullOrWhiteSpace(name)
                && !name.StartsWith("★")
                && !name.StartsWith("???")
                && name != "(None)"
                && !name.EndsWith(" Z"))
            {
                result.Add(name);
            }
        }

        result = result.Distinct().OrderBy(i => i).ToList();
        result.Insert(0, "None");

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.Run("http://*:5001");

static LegalityResult ProcessRequest(PokemonRequest request)
{
    // Initialize a blank Gen 7 Pokémon (PK7)
    var pkm = new PK7();

    // 1. Set species and form
    string speciesName = request.Species;
    byte form = 0;

    if (speciesName.Contains("(Alolan)", StringComparison.OrdinalIgnoreCase) || speciesName.Contains("Alolan", StringComparison.OrdinalIgnoreCase))
    {
        speciesName = speciesName.Replace("(Alolan)", "").Replace("Alolan", "").Trim();
        form = 1;
    }
    else if (speciesName.StartsWith("Mega ", StringComparison.OrdinalIgnoreCase))
    {
        speciesName = speciesName.Substring(5).Trim();
        if (speciesName.EndsWith(" X", StringComparison.OrdinalIgnoreCase))
        {
            speciesName = speciesName.Substring(0, speciesName.Length - 2).Trim();
        }
        else if (speciesName.EndsWith(" Y", StringComparison.OrdinalIgnoreCase))
        {
            speciesName = speciesName.Substring(0, speciesName.Length - 2).Trim();
        }
        form = 0; // Megas revert to form 0 in the box
    }
    else if (speciesName.Contains("(Hisuian)", StringComparison.OrdinalIgnoreCase) || speciesName.Contains("Hisuian", StringComparison.OrdinalIgnoreCase))
    {
        speciesName = speciesName.Replace("(Hisuian)", "").Replace("Hisuian", "").Trim();
        form = 0;
    }
    else if (speciesName.Contains("(Galar)", StringComparison.OrdinalIgnoreCase) || speciesName.Contains("Galar", StringComparison.OrdinalIgnoreCase) || speciesName.Contains("(Galarian)", StringComparison.OrdinalIgnoreCase) || speciesName.Contains("Galarian", StringComparison.OrdinalIgnoreCase))
    {
        speciesName = speciesName.Replace("(Galar)", "").Replace("Galar", "").Replace("(Galarian)", "").Replace("Galarian", "").Trim();
        form = 0;
    }
    else if (speciesName.Contains("(Paldean)", StringComparison.OrdinalIgnoreCase) || speciesName.Contains("Paldean", StringComparison.OrdinalIgnoreCase))
    {
        speciesName = speciesName.Replace("(Paldean)", "").Replace("Paldean", "").Trim();
        form = 0;
    }

    int speciesId = FindIndexIgnoreCase(GameInfo.Strings.specieslist, speciesName);
    if (speciesId <= 0)
    {
        throw new ArgumentException($"Unknown species: {request.Species}");
    }
    pkm.Species = (ushort)speciesId;
    pkm.Form = form;

    // 2. Set default valid origin properties
    pkm.Version = GameVersion.US; // Ultra Sun
    pkm.Language = 2; // English (EN)
    pkm.ConsoleRegion = 1; // Americas
    pkm.Country = 49; // USA
    pkm.Region = 84; // California
    pkm.MetDate = DateOnly.FromDateTime(DateTime.Today);
    
    // Check if species is legendary, mythical, sub-legendary, or ultra beast (cannot breed/hatch at level 1)
    if (request.IsEvent)
    {
        pkm.FatefulEncounter = true;
        pkm.MetLocation = 30001; // Event
        pkm.EggLocation = 0; // Not an egg
        pkm.EggMetDate = null;
        pkm.MetLevel = (byte)request.Level;
        pkm.Ball = 16; // Cherish Ball
    }
    else if (IsSpecial(speciesId))
    {
        pkm.MetLocation = 222; // Ultra Space Wilds
        pkm.EggLocation = 0; // Not an egg
        pkm.EggMetDate = null;
        pkm.MetLevel = 60; // Caught at level 60
        pkm.Ball = 4; // Poke Ball
    }
    else
    {
        pkm.EggMetDate = DateOnly.FromDateTime(DateTime.Today);
        pkm.MetLocation = 78; // Paniola Ranch (Hatch Location)
        pkm.EggLocation = 60002; // Nursery helpers (Egg Met Location)
        pkm.MetLevel = 1; // Hatched at level 1
        pkm.Ball = 4; // Poke Ball
    }
    
    // Randomize PID and Encryption Constant to prevent mismatch
    pkm.EncryptionConstant = Util.Rand32();
    pkm.PID = Util.Rand32();
    pkm.CurrentHandler = 0; // OT is current owner

    // Force correct gender rules to prevent validation errors on gender-locked species
    var personalInfo = pkm.PersonalInfo;
    if (personalInfo.Gender == 255) // 100% Genderless
    {
        pkm.Gender = 2;
    }
    else if (personalInfo.Gender == 254) // 100% Female
    {
        pkm.Gender = 1;
    }
    else if (personalInfo.Gender == 0) // 100% Male
    {
        pkm.Gender = 0;
    }
    else
    {
        // Normal species, map gender
        pkm.Gender = request.Gender switch
        {
            "M" => 0,
            "F" => 1,
            _ => 2
        };
    }

    // 3. Level & OT Info
    pkm.CurrentLevel = (byte)request.Level;
    pkm.OriginalTrainerName = request.TrainerName;
    pkm.TrainerTID7 = (uint)request.TrainerTID;
    pkm.TrainerSID7 = (uint)request.TrainerSID;
    
    // In Gen 7 PK7, set the nickname explicitly to avoid "Nickname is empty" error
    pkm.Nickname = speciesName;

    // 4. Ability
    if (!string.IsNullOrEmpty(request.Ability))
    {
        int abId = FindIndexIgnoreCase(GameInfo.Strings.abilitylist, request.Ability);
        if (abId >= 0)
        {
            pkm.Ability = abId;
            var pi = pkm.PersonalInfo;
            if (pi.Ability1 == abId)
            {
                pkm.AbilityNumber = 1;
            }
            else if (pi.Ability2 == abId)
            {
                pkm.AbilityNumber = 2;
            }
            else if (pi.AbilityH == abId)
            {
                pkm.AbilityNumber = 4; // Hidden Ability (slot 4 in PKHeX)
            }
            else
            {
                pkm.AbilityNumber = 1; // Fallback
            }
        }
    }

    // 5. Nature
    if (!string.IsNullOrEmpty(request.Nature))
    {
        int natId = FindIndexIgnoreCase(GameInfo.Strings.natures, request.Nature);
        if (natId >= 0) pkm.Nature = (Nature)natId;
    }

    // 6. Held Item
    if (!string.IsNullOrEmpty(request.HeldItem) && !request.HeldItem.Equals("None", StringComparison.OrdinalIgnoreCase))
    {
        int itemId = FindIndexIgnoreCase(GameInfo.Strings.itemlist, request.HeldItem);
        if (itemId >= 0) pkm.HeldItem = itemId;
    }

    // 7. Shiny
    if (request.IsShiny)
    {
        pkm.SetShiny();
    }
    else
    {
        pkm.SetUnshiny();
    }

    // 8. IVs
    pkm.IV_HP = request.IVs.HP;
    pkm.IV_ATK = request.IVs.Atk;
    pkm.IV_DEF = request.IVs.Def;
    pkm.IV_SPA = request.IVs.SpA;
    pkm.IV_SPD = request.IVs.SpD;
    pkm.IV_SPE = request.IVs.Spe;

    // 9. EVs
    pkm.EV_HP = request.EVs.HP;
    pkm.EV_ATK = request.EVs.Atk;
    pkm.EV_DEF = request.EVs.Def;
    pkm.EV_SPA = request.EVs.SpA;
    pkm.EV_SPD = request.EVs.SpD;
    pkm.EV_SPE = request.EVs.Spe;

    // 10. Moves (Max 4)
    var moveList = new List<ushort>();
    if (request.Moves != null)
    {
        foreach (var moveName in request.Moves)
        {
            if (string.IsNullOrWhiteSpace(moveName)) continue;
            int mvId = FindIndexIgnoreCase(GameInfo.Strings.movelist, moveName);
            if (mvId >= 0) moveList.Add((ushort)mvId);
        }
    }

    pkm.Move1 = moveList.Count > 0 ? moveList[0] : (ushort)0;
    pkm.Move2 = moveList.Count > 1 ? moveList[1] : (ushort)0;
    pkm.Move3 = moveList.Count > 2 ? moveList[2] : (ushort)0;
    pkm.Move4 = moveList.Count > 3 ? moveList[3] : (ushort)0;
    pkm.HealPP();

    // Automatically set default legal relearn moves
    var initialAnalysis = new LegalityAnalysis(pkm);
    pkm.SetRelearnMoves(initialAnalysis);

    // Legality analysis
    var analysis = new LegalityAnalysis(pkm);
    bool isValid = analysis.Valid;
    string report = analysis.Report();
    
    // If it is a mythical/event pokemon or request.IsEvent is true or request.BypassLegality is true, bypass legality validation
    if (IsMythical(pkm.Species) || request.IsEvent || request.BypassLegality)
    {
        isValid = true;
        report = "Legal (Bypassed)";
    }
    
    return new LegalityResult(pkm, isValid, report);
}

static int FindIndexIgnoreCase(string[] list, string value)
{
    if (string.IsNullOrWhiteSpace(value)) return -1;
    string normalized = value.Replace(" ", "").Replace("-", "").Replace("_", "").ToLowerInvariant();
    for (int i = 0; i < list.Length; i++)
    {
        if (list[i] != null)
        {
            string itemNorm = list[i].Replace(" ", "").Replace("-", "").Replace("_", "").ToLowerInvariant();
            if (itemNorm == normalized)
            {
                return i;
            }
        }
    }
    return -1;
}

static bool IsSpecial(int speciesId)
{
    // Legendaries & Sub-legendaries & Ultra Beasts
    if (speciesId >= 144 && speciesId <= 146) return true; // Articuno, Zapdos, Moltres
    if (speciesId == 150) return true; // Mewtwo
    if (speciesId >= 243 && speciesId <= 245) return true; // Raikou, Entei, Suicune
    if (speciesId == 249 || speciesId == 250) return true; // Lugia, Ho-Oh
    if (speciesId >= 377 && speciesId <= 384) return true; // Regis, Latis, Weather trio
    if (speciesId >= 480 && speciesId <= 488) return true; // Lake trio, Dialga, Palkia, Heatran, Regigigas, Giratina, Cresselia
    if (speciesId >= 638 && speciesId <= 646) return true; // Swords of Justice, Forces of Nature, Tao trio
    if (speciesId >= 716 && speciesId <= 718) return true; // Aura trio
    if (speciesId == 772 || speciesId == 773) return true; // Type: Null, Silvally
    if (speciesId >= 785 && speciesId <= 800) return true; // Tapus, Cosmog line, Necrozma, Ultra Beasts
    if (speciesId >= 803 && speciesId <= 806) return true; // Poipole line, Stakataka, Blacephalon
    
    // Mythicals are also special (cannot breed/hatch)
    return IsMythical(speciesId);
}

static bool IsMythical(int speciesId)
{
    if (speciesId == 151) return true; // Mew
    if (speciesId == 251) return true; // Celebi
    if (speciesId == 385 || speciesId == 386) return true; // Jirachi, Deoxys
    if (speciesId >= 489 && speciesId <= 493) return true; // Phione, Manaphy, Darkrai, Shaymin, Arceus
    if (speciesId == 494) return true; // Victini
    if (speciesId >= 647 && speciesId <= 649) return true; // Keldeo, Meloetta, Genesect
    if (speciesId >= 719 && speciesId <= 721) return true; // Diancie, Hoopa, Volcanion
    if (speciesId == 801 || speciesId == 802 || speciesId == 807 || speciesId == 808 || speciesId == 809) return true; // Magearna, Marshadow, Zeraora, Meltan, Melmetal
    return false;
}

public class LegalityResult
{
    public PK7 Pokemon { get; }
    public bool Valid { get; }
    public string Report { get; }

    public LegalityResult(PK7 pkm, bool valid, string report)
    {
        Pokemon = pkm;
        Valid = valid;
        Report = report;
    }
}

public class PokemonRequest
{
    public string Species { get; set; } = "";
    public string Gender { get; set; } = "M";
    public int Level { get; set; } = 100;
    public string TrainerName { get; set; } = "Champions";
    public string Ability { get; set; } = "";
    public string Nature { get; set; } = "";
    public string? HeldItem { get; set; }
    public bool IsShiny { get; set; }
    public string[] Moves { get; set; } = Array.Empty<string>();
    public StatDict IVs { get; set; } = new StatDict();
    public StatDict EVs { get; set; } = new StatDict { HP = 0, Atk = 0, Def = 0, SpA = 0, SpD = 0, Spe = 0 };
    public int TrainerTID { get; set; } = 777777;
    public int TrainerSID { get; set; } = 777777;
    public bool IsEvent { get; set; }
    public bool BypassLegality { get; set; }
}

public class StatDict
{
    public int HP { get; set; } = 31;
    public int Atk { get; set; } = 31;
    public int Def { get; set; } = 31;
    public int SpA { get; set; } = 31;
    public int SpD { get; set; } = 31;
    public int Spe { get; set; } = 31;
}

public class FilterSaveRequest
{
    public string SaveDataBase64 { get; set; } = "";
    public int[] AllowedSpecies { get; set; } = Array.Empty<int>();
}

public class InjectSaveRequest
{
    public string SaveDataBase64 { get; set; } = "";
    public List<string> Pk7sBase64 { get; set; } = new List<string>();
}
