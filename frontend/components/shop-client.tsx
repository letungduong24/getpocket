"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  AlertTriangle,
  Sparkles,
  Dna,
  ShieldCheck,
  Search,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import SidebarLayout from "@/components/sidebar-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import {
  SectionHeader,
  Pill,
  IconBadge,
  SearchBar,
} from "@/components/system/primitives";
import { GameTile } from "@/components/system/dashboard";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/components/ui/toast";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Pokemon {
  id: number;
  natDex: number;
  name: string;
  typeOne: string;
  typeTwo: string;
  abilities: string[];
  moves: string[];
  spriteUrl: string | null;
}

interface StatDict {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface CustomConfig {
  speciesId: number;
  speciesName: string;
  speciesSpriteUrl?: string | null;
  shiny: boolean;
  level: number;
  gender: string;
  ability: string;
  nature: string;
  heldItem: string;
  moves: string[];
  ivs: StatDict;
  evs: StatDict;
  trainerName: string;
  trainerTid: number;
  trainerSid: number;
}



/* ------------------------------------------------------------------ */
/* Zod Schemas                                                        */
/* ------------------------------------------------------------------ */
const statSchema = z.object({
  hp: z.number().min(0).max(31, "IV từ 0 đến 31"),
  atk: z.number().min(0).max(31, "IV từ 0 đến 31"),
  def: z.number().min(0).max(31, "IV từ 0 đến 31"),
  spa: z.number().min(0).max(31, "IV từ 0 đến 31"),
  spd: z.number().min(0).max(31, "IV từ 0 đến 31"),
  spe: z.number().min(0).max(31, "IV từ 0 đến 31"),
});

const evSchema = z.object({
  hp: z.number().min(0).max(252, "EV tối đa 252"),
  atk: z.number().min(0).max(252, "EV tối đa 252"),
  def: z.number().min(0).max(252, "EV tối đa 252"),
  spa: z.number().min(0).max(252, "EV tối đa 252"),
  spd: z.number().min(0).max(252, "EV tối đa 252"),
  spe: z.number().min(0).max(252, "EV tối đa 252"),
});

const pokemonConfigSchema = z.object({
  level: z.number().min(1, "Level tối thiểu là 1").max(100, "Level tối đa là 100"),
  trainerName: z.string().min(1, "Tên OT không được để trống"),
  trainerTid: z.number().min(0).max(999999, "TID từ 0 đến 999999"),
  trainerSid: z.number().min(0).max(999999, "SID từ 0 đến 999999"),
  ivs: statSchema,
  evs: evSchema,
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const NATURES = [
  "Adamant", "Jolly", "Modest", "Timid", "Bold", "Impish", "Calm", "Careful",
  "Hardy", "Brave", "Quiet", "Relaxed", "Sassy", "Hasty", "Naive", "Mild",
  "Rash", "Gentle", "Lax", "Lonely", "Naughty", "Docile", "Serious", "Bashful", "Quirky",
];

const POKEMON_TYPES = [
  "All", "Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting",
  "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon",
  "Dark", "Steel", "Fairy",
];

const TYPE_ICON: Record<string, LucideIcon> = {};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function getPokeApiName(name: string): string {
  let lowerName = name.toLowerCase().trim();
  if (lowerName === "meowstic") return "meowstic-male";
  if (lowerName === "aegislash") return "aegislash-shield";
  if (lowerName === "gourgeist") return "gourgeist-average";
  if (lowerName === "lycanroc") return "lycanroc-midday";
  if (lowerName === "mimikyu") return "mimikyu-disguised";
  if (lowerName.includes("(alolan)")) {
    lowerName = lowerName.replace("(alolan)", "").trim().replace(/\s+/g, "-") + "-alola";
  }
  return lowerName.replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-");
}

function pokemonSpriteUrl(natDex: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${natDex}.png`;
}

function resolveSprite(pokemon: { spriteUrl?: string | null; natDex: number; name?: string; shiny?: boolean }) {
  if (pokemon.name) {
    const nameLower = pokemon.name.toLowerCase();
    if (nameLower.includes("alolan") || nameLower.includes("alola")) {
      const shinyPath = pokemon.shiny ? "shiny/" : "";
      // Map Alolan forms to PokéAPI species variant IDs (10091+)
      const alolaMappings: Record<number, number> = {
        19: 10091,  // Rattata (Alolan)
        20: 10092,  // Raticate (Alolan)
        26: 10100,  // Raichu (Alolan)
        27: 10101,  // Sandshrew (Alolan)
        28: 10102,  // Sandslash (Alolan)
        37: 10103,  // Vulpix (Alolan)
        38: 10104,  // Ninetales (Alolan)
        50: 10105,  // Diglett (Alolan)
        51: 10106,  // Dugtrio (Alolan)
        52: 10107,  // Meowth (Alolan)
        53: 10108,  // Persian (Alolan)
        74: 10109,  // Geodude (Alolan)
        75: 10110,  // Graveler (Alolan)
        76: 10111,  // Golem (Alolan)
        88: 10112,  // Grimer (Alolan)
        89: 10113,  // Muk (Alolan)
        103: 10114, // Exeggutor (Alolan)
        105: 10115, // Marowak (Alolan)
      };

      const mappedId = alolaMappings[pokemon.natDex];
      if (mappedId) {
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shinyPath}${mappedId}.png`;
      }
    }
  }

  if (pokemon.spriteUrl) {
    if (pokemon.shiny && !pokemon.spriteUrl.includes("/shiny/")) {
      // Adjust standard artwork path for shiny variants
      if (pokemon.spriteUrl.includes("/sprites/pokemon/other/official-artwork/")) {
        return pokemon.spriteUrl.replace(
          "/sprites/pokemon/other/official-artwork/",
          "/sprites/pokemon/other/official-artwork/shiny/"
        );
      } else {
        return pokemon.spriteUrl.replace(
          "/sprites/pokemon/",
          "/sprites/pokemon/shiny/"
        );
      }
    }
    return pokemon.spriteUrl;
  }
  return pokemonSpriteUrl(pokemon.natDex);
}

function totalEvs(evs: StatDict) {
  return Object.values(evs).reduce((a, b) => a + b, 0);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function ShopClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const debouncedSearch = useDebounce(searchTerm.trim(), 300);

  // Customizer state
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [pokemonSprite, setPokemonSprite] = useState<string | null>(null);
  const [config, setConfig] = useState<CustomConfig>(() => emptyConfig());

  // Legality state
  const [validationResult, setValidationResult] = useState<{ valid: boolean; report: string } | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { toast } = useToast();

  // Order dialog state
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderName, setOrderName] = useState("");
  const [orderContact, setOrderContact] = useState("");
  const [orderErrors, setOrderErrors] = useState<Partial<Record<"customerName" | "contactInfo", string>>>({});

  // Pokemon detail (read-only view from pack data)
  const [viewingPokemon, setViewingPokemon] = useState<any | null>(null);

  // Server-side pokedex query (filter happens in the backend)
  const { data: pokemonList = [], isLoading: isLoadingPokedex } = useQuery<Pokemon[]>({
    queryKey: ["pokedex", debouncedSearch, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter && typeFilter !== "All") params.set("type", typeFilter);
      const qs = params.toString();
      const url = `${API_BASE}/api/pokemon${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Không thể tải danh sách Pokédex.");
      return res.json();
    },
  });

  const { data: notes = [] } = useQuery<any[]>({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/notes`);
      if (!res.ok) throw new Error("Không thể tải ghi chú.");
      return res.json();
    },
  });

  // Sprite fetch — uses async .then() callbacks (not synchronous setState in effect body)
  useEffect(() => {
    if (!selectedPokemon) return;

    const apiName = getPokeApiName(selectedPokemon.name);
    const target = selectedPokemon;
    const isShiny = config.shiny;
    let cancelled = false;

    fetch(`https://pokeapi.co/api/v2/pokemon/${apiName}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data) {
          const artwork = data.sprites?.other?.["official-artwork"]?.front_default;
          const sprite = isShiny
            ? data.sprites?.front_shiny
            : data.sprites?.front_default;
          setPokemonSprite(artwork || sprite || pokemonSpriteUrl(target.natDex));
        } else {
          setPokemonSprite(pokemonSpriteUrl(target.natDex));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPokemonSprite(pokemonSpriteUrl(target.natDex));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPokemon, config.shiny]);

  // Reset sprite when dialog closes
  useEffect(() => {
    if (!selectedPokemon) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on close
      setPokemonSprite(null);
    }
  }, [selectedPokemon]);

  /* ----- Handlers ----- */
  const handleSelectPokemon = (pk: Pokemon) => {
    setSelectedPokemon(pk);
    setIsValidated(false);
    setValidationResult(null);
    setValidationErrors([]);
    setConfig({
      ...emptyConfig(),
      speciesId: pk.natDex,
      speciesName: pk.name,
      speciesSpriteUrl: pk.spriteUrl,
      ability: pk.abilities[0] || "",
      moves: [
        pk.moves[0] || "",
        pk.moves[1] || "",
        pk.moves[2] || "",
        pk.moves[3] || "",
      ],
    });
  };

  const handleConfigChange = (
    field: keyof CustomConfig,
    value: string | number | boolean | string[] | StatDict
  ) => {
    setIsValidated(false);
    setValidationResult(null);
    setValidationErrors([]);
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatChange = (
    statType: "ivs" | "evs",
    stat: keyof StatDict,
    value: number
  ) => {
    setIsValidated(false);
    setValidationResult(null);
    setValidationErrors([]);
    setConfig((prev) => ({
      ...prev,
      [statType]: { ...prev[statType], [stat]: value },
    }));
  };

  const handleMoveChange = (index: number, val: string) => {
    setIsValidated(false);
    setValidationResult(null);
    setValidationErrors([]);
    const newMoves = [...config.moves];
    newMoves[index] = val;
    setConfig((prev) => ({ ...prev, moves: newMoves }));
  };

  // Validate mutation
  const validateMutation = useMutation<
    { valid: boolean; report: string },
    Error,
    Record<string, unknown>
  >({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/api/pokemon/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.report || "Không thể kiểm định Pokémon.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setValidationResult({ valid: data.valid, report: data.report });
      setIsValidated(data.valid);
      if (data.valid) {
        toast({
          title: "Hợp lệ",
          description: "Pokémon hợp pháp! Bạn có thể đặt hàng ngay.",
          variant: "success",
        });
      } else {
        toast({
          title: "Không hợp lệ",
          description: "Pokémon không hợp lệ. Vui lòng kiểm tra báo cáo chi tiết.",
          variant: "warning",
        });
      }
    },
    onError: (err) => {
      setValidationResult({ valid: false, report: err.message });
      toast({
        title: "Lỗi kiểm định",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleValidate = () => {
    setValidationErrors([]);
    setValidationResult(null);

    const zodResult = pokemonConfigSchema.safeParse(config);
    const errorsList: string[] = [];

    if (!zodResult.success) {
      zodResult.error.issues.forEach((issue) => {
        errorsList.push(`${issue.path.join(".")}: ${issue.message}`);
      });
    }

    const total = totalEvs(config.evs);
    if (total > 510) {
      errorsList.push(`Tổng chỉ số EVs (${total}) vượt quá giới hạn cho phép (510)`);
    }

    if (errorsList.length > 0) {
      setValidationErrors(errorsList);
      return;
    }

    validateMutation.mutate({
      species: config.speciesName,
      level: config.level,
      shiny: config.shiny,
      gender: config.gender,
      ability: config.ability,
      nature: config.nature,
      heldItem: config.heldItem,
      moves: config.moves.filter((m) => m.trim() !== ""),
      ivs: config.ivs,
      evs: config.evs,
      trainerName: config.trainerName,
      trainerTid: config.trainerTid,
      trainerSid: config.trainerSid,
    });
  };

  const simpleOrderMutation = useMutation<
    { orderId: number; totalPrice: number },
    Error,
    Record<string, unknown>
  >({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/api/orders/simple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đặt hàng thất bại.");
      return data;
    },
    onSuccess: () => {
      setShowOrderDialog(false);
      setOrderName("");
      setOrderContact("");
      setOrderErrors({});
      toast({
        title: "Đặt hàng thành công",
        description: "Shop sẽ liên hệ lại cho bạn trong thời gian sớm nhất.",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Lỗi gửi đơn hàng",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSimpleOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Partial<Record<"customerName" | "contactInfo", string>> = {};
    if (!orderName.trim()) errors.customerName = "Vui lòng nhập tên của bạn";
    if (!orderContact.trim()) errors.contactInfo = "Vui lòng nhập phương thức liên hệ (Zalo, Facebook, SĐT)";
    setOrderErrors(errors);
    if (Object.keys(errors).length > 0) return;

    simpleOrderMutation.mutate({
      customerName: orderName,
      contactInfo: orderContact,
    });
  };

  const totalEv = totalEvs(config.evs);
  const evsOver = totalEv > 510;

  return (
    <SidebarLayout>
      <div className="space-y-6">
          {/* Thông báo Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0e12] via-[#1c070a] to-[#120406] p-6 ring-1 ring-white/[0.08] transition-all duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display text-2xl font-black tracking-tight text-white uppercase mt-1.5">
                    Thông báo
                  </h3>
                </div>
              </div>

              <div className="flex-1 mt-3 space-y-3">
                {notes.map((note: any) => (
                  <p key={note.id} className="text-sm text-white/60 leading-relaxed">
                    {note.content}
                  </p>
                ))}
              </div>

              <div className="mt-6">
                <Button
                  size="sm"
                  type="button"
                  className="w-full bg-[#ff4655] hover:bg-[#e03e4c] text-white font-bold"
                  onClick={() => setShowOrderDialog(true)}
                >
                  Đặt hàng
                </Button>
              </div>
            </div>

            {/* ROW 2: Pokédex Nhà Vô Địch — search + type filter + full grid */}
            <div className="space-y-4">
              <SectionHeader
                title="Danh sách Pokemon trong Pack Pokémon Champions"
                description="Toàn bộ Pokémon khả dụng, lọc theo tên, hệ hoặc số Dex"
                action={
                  <Pill tone="soft">
                    {isLoadingPokedex ? "Đang tải..." : `${pokemonList.length} kết quả`}
                  </Pill>
                }
              />

              <SearchBar
                icon={<Search className="h-4 w-4" />}
                placeholder="Tìm Pokémon theo tên hoặc số Dex..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                {POKEMON_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t];
                  return (
                    <IconBadge
                      key={t}
                      icon={Icon ? <Icon className="h-3.5 w-3.5" /> : undefined}
                      label={t}
                      active={typeFilter === t}
                      onClick={() => setTypeFilter(t)}
                    />
                  );
                })}
              </div>

              {isLoadingPokedex ? (
                <div className="flex h-72 items-center justify-center text-white/40">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
                </div>
              ) : pokemonList.length === 0 ? (
                <div className="flex h-72 items-center justify-center rounded-2xl bg-white/[0.04] text-white/40">
                  Không tìm thấy Pokémon nào khớp với bộ lọc.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {pokemonList.map((pk) => (
                    <GameTile
                      key={pk.id}
                      className="h-64"
                      title={pk.name}
                      description={`#${pk.natDex} · ${pk.typeOne}${
                        pk.typeTwo !== "N/A" ? ` / ${pk.typeTwo}` : ""
                      }`}
                      cover={
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveSprite({ ...pk, shiny: true })}
                          alt={pk.name}
                          className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-110"
                        />
                      }
                      onClick={() => setViewingPokemon({ ...pk, shiny: true })}
                    />
                  ))}
                </div>
              )}
            </div>


      </div>

      {/* ---------------- Pokemon Detail Dialog (from Pack data) ---------------- */}
      {viewingPokemon && (
        <Dialog open={!!viewingPokemon} onOpenChange={(o) => !o && setViewingPokemon(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="border-b border-white/5 pb-4">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                <Dna className="h-5 w-5 text-accent" />
                {viewingPokemon.name}
              </DialogTitle>
              <DialogDescription>
                #{viewingPokemon.natDex} · {viewingPokemon.typeOne}
                {viewingPokemon.typeTwo !== "N/A" && ` / ${viewingPokemon.typeTwo}`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4 scrollbar-thin">
              <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06] space-y-3">
                <div className="flex gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/35 border border-white/5">
                    <img
                      src={resolveSprite(viewingPokemon)}
                      alt={viewingPokemon.name}
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display text-base font-bold text-white">{viewingPokemon.name}</h4>
                      {viewingPokemon.isEvent && (
                        <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300 ring-1 ring-amber-400/20">Event</span>
                      )}
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-white/50">Lv.{viewingPokemon.level}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-white/50">
                      <p>Đặc tính: <strong className="text-white">{viewingPokemon.ability}</strong></p>
                      <p>Tính cách: <strong className="text-white">{viewingPokemon.nature}</strong></p>
                      <p>Vật phẩm: <strong className="text-white">{viewingPokemon.heldItem || "None"}</strong></p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-white/40 mb-1.5 tracking-wider">Chiêu thức</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(viewingPokemon.moves || []).map((move: string, mIdx: number) => (
                      <div key={mIdx} className="rounded-lg bg-black/20 px-2 py-1 text-center text-[11px] font-medium text-white/70 border border-white/5">
                        {move || "—"}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider">IVs</span>
                    <div className="flex gap-1 text-[10px] mt-0.5">
                      {Object.entries(viewingPokemon.ivs || {}).map(([stat, val]: any) => (
                        <div key={stat} className="flex-1 text-center bg-white/5 rounded py-0.5">
                          <span className="block text-[8px] uppercase text-white/40">{stat}</span>
                          <span className="font-bold text-white">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider">EVs</span>
                    <div className="flex gap-1 text-[10px] mt-0.5">
                      {Object.entries(viewingPokemon.evs || {}).map(([stat, val]: any) => (
                        <div key={stat} className="flex-1 text-center bg-white/5 rounded py-0.5">
                          <span className="block text-[8px] uppercase text-white/40">{stat}</span>
                          <span className="font-bold text-white">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-2 text-[10px]">
                  <div><span className="block text-white/40">OT</span><strong className="text-white/80">{viewingPokemon.trainerName}</strong></div>
                  <div><span className="block text-white/40">TID</span><strong className="text-white/80">{viewingPokemon.trainerTid}</strong></div>
                  <div><span className="block text-white/40">SID</span><strong className="text-white/80">{viewingPokemon.trainerSid}</strong></div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <Button className="w-full" variant="outline" onClick={() => setViewingPokemon(null)}>
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ---------------- Simple Order Dialog ---------------- */}
      {showOrderDialog && (
        <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Đặt hàng</DialogTitle>
              <DialogDescription>
                Nhập thông tin liên hệ của bạn, shop sẽ liên hệ để xác nhận đơn hàng.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSimpleOrder} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-white/60 uppercase">
                  Tên của bạn
                </label>
                <Input
                  placeholder="Nhập họ và tên..."
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  className={cn(
                    orderErrors.customerName &&
                      "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                {orderErrors.customerName && (
                  <span className="text-xs text-destructive">
                    {orderErrors.customerName}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-white/60 uppercase">
                  Liên hệ (Zalo / Facebook / SĐT)
                </label>
                <Input
                  placeholder="Link Facebook hoặc SĐT Zalo..."
                  value={orderContact}
                  onChange={(e) => setOrderContact(e.target.value)}
                  className={cn(
                    orderErrors.contactInfo &&
                      "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                {orderErrors.contactInfo && (
                  <span className="text-xs text-destructive">
                    {orderErrors.contactInfo}
                  </span>
                )}
              </div>

              <div className="rounded-2xl bg-white/[0.04] p-4 text-xs text-white/60">
                <p className="font-semibold text-white">Hướng dẫn:</p>
                <p className="mt-1">
                  Sau khi gửi đơn hàng, Admin sẽ liên hệ sớm nhất để tiến hành giao dịch và hỗ trợ bạn qua phương thức liên hệ bạn đã cung cấp.
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={simpleOrderMutation.isPending}
              >
                {simpleOrderMutation.isPending ? "Đang gửi..." : "Gửi đơn hàng"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ---------------- Checkout Dialog ---------------- */}
    </SidebarLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Configurator body (split out to keep file readable)                */
/* ------------------------------------------------------------------ */
interface ConfiguratorBodyProps {
  selectedPokemon: Pokemon;
  config: CustomConfig;
  pokemonSprite: string | null;
  validationResult: { valid: boolean; report: string } | null;
  validationErrors: string[];
  isValidating: boolean;
  isValidated: boolean;
  totalEv: number;
  evsOver: boolean;
  onConfigChange: (
    field: keyof CustomConfig,
    value: string | number | boolean | string[] | StatDict
  ) => void;
  onStatChange: (statType: "ivs" | "evs", stat: keyof StatDict, value: number) => void;
  onMoveChange: (index: number, val: string) => void;
  onValidate: () => void;
}

function ConfiguratorBody({
  selectedPokemon,
  config,
  pokemonSprite,
  validationResult,
  validationErrors,
  isValidating,
  isValidated,
  totalEv,
  evsOver,
  onConfigChange,
  onStatChange,
  onMoveChange,
  onValidate,
}: ConfiguratorBodyProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (validationResult || validationErrors.length > 0) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [validationResult, validationErrors]);

  return (
    <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1 scrollbar-thin">
      {/* Preview */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.04]">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
          {pokemonSprite ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pokemonSprite} alt={selectedPokemon.name} className="h-12 w-12 object-contain" />
          ) : (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
          )}
        </div>
        <div className="flex-1">
          <Pill tone="accent">Gen 7</Pill>
          <h3 className="mt-1 font-display text-lg font-semibold text-white">
            {selectedPokemon.name}
          </h3>
        </div>
        <Button
          size="sm"
          variant={config.shiny ? "default" : "outline"}
          onClick={() => onConfigChange("shiny", !config.shiny)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Shiny
        </Button>
      </div>

      {/* Errors / result */}
      {validationErrors.length > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive space-y-1">
          <p className="flex items-center gap-1 font-bold">
            <AlertTriangle className="h-4 w-4" /> Lỗi nhập liệu:
          </p>
          {validationErrors.map((err, i) => (
            <p key={i}>• {err}</p>
          ))}
        </div>
      )}

      {/* Basic config */}
      <div className="grid grid-cols-2 gap-3">
        <ConfigField label="Cấp độ (1-100)">
          <Input
            type="number"
            value={config.level}
            onChange={(e) => onConfigChange("level", parseInt(e.target.value) || 0)}
          />
        </ConfigField>
        <ConfigField label="Giới tính">
          <ConfigSelect
            value={config.gender}
            onChange={(v) => onConfigChange("gender", v)}
            options={[
              { value: "M", label: "Male (Đực)" },
              { value: "F", label: "Female (Cái)" },
              { value: "U", label: "Genderless" },
            ]}
          />
        </ConfigField>
        <ConfigField label="Đặc tính (Ability)">
          <ConfigSelect
            value={config.ability}
            onChange={(v) => onConfigChange("ability", v)}
            options={selectedPokemon.abilities.map((a) => ({ value: a, label: a }))}
          />
        </ConfigField>
        <ConfigField label="Tính cách (Nature)">
          <ConfigSelect
            value={config.nature}
            onChange={(v) => onConfigChange("nature", v)}
            options={NATURES.map((n) => ({ value: n, label: n }))}
          />
        </ConfigField>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-white/60 uppercase">
          <Dna className="h-4 w-4" /> Chiêu thức (tối đa 4)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((index) => (
            <ConfigSelect
              key={index}
              value={config.moves[index] || ""}
              onChange={(v) => onMoveChange(index, v)}
              options={[
                { value: "", label: "None (Trống)" },
                ...selectedPokemon.moves.map((m) => ({ value: m, label: m })),
              ]}
            />
          ))}
        </div>
      </div>

      {/* Trainer info */}
      <div className="space-y-2 border-t border-white/5 pt-4">
        <label className="text-xs font-semibold tracking-wider text-white/60 uppercase">
          Thông tin Trainer
        </label>
        <div className="grid grid-cols-3 gap-3">
          <ConfigField label="Tên OT">
            <Input
              value={config.trainerName}
              onChange={(e) => onConfigChange("trainerName", e.target.value)}
            />
          </ConfigField>
          <ConfigField label="TID (0-65535)">
            <Input
              type="number"
              value={config.trainerTid}
              onChange={(e) => onConfigChange("trainerTid", parseInt(e.target.value) || 0)}
            />
          </ConfigField>
          <ConfigField label="SID (0-65535)">
            <Input
              type="number"
              value={config.trainerSid}
              onChange={(e) => onConfigChange("trainerSid", parseInt(e.target.value) || 0)}
            />
          </ConfigField>
        </div>
      </div>

      {/* IVs & EVs */}
      <div className="grid grid-cols-1 gap-6 border-t border-white/5 pt-4 sm:grid-cols-2">
        <StatSliderGroup
          title="Chỉ số IVs (0-31)"
          stats={config.ivs}
          max={31}
          onChange={(s, v) => onStatChange("ivs", s, v)}
        />
        <StatSliderGroup
          title="Chỉ số EVs (0-252)"
          stats={config.evs}
          max={252}
          step={4}
          badge={
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                evsOver
                  ? "border border-destructive/40 bg-destructive/20 text-destructive"
                  : "border border-white/10 bg-white/[0.04] text-white/60"
              )}
            >
              {totalEv}/510
            </span>
          }
          onChange={(s, v) => onStatChange("evs", s, v)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-white/5 pt-4">
        <Button
          variant="outline"
          className="w-full"
          disabled={isValidating}
          onClick={onValidate}
        >
          {isValidating ? "Đang kiểm định..." : "Kiểm tra hợp lệ"}
        </Button>
      </div>

      {/* Validation result (below the actions, as requested) */}
      {validationResult && (
        <div
          className={cn(
            "rounded-2xl border p-4 text-sm space-y-1.5",
            validationResult.valid
              ? "border-emerald-400/30 bg-emerald-400/10"
              : "border-destructive/40 bg-destructive/10"
          )}
        >
          <p className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
            {validationResult.valid ? (
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            Kết quả: {validationResult.valid ? "Hợp lệ" : "Không hợp lệ"}
          </p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-white/80">
            {validationResult.report}
          </p>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Configurator helpers                                                */
/* ------------------------------------------------------------------ */
function ConfigField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function ConfigSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Combobox
      options={options}
      value={value}
      onChange={(v) => onChange(String(v))}
      placeholder="Chọn..."
      searchPlaceholder="Tìm kiếm..."
    />
  );
}

function StatSliderGroup({
  title,
  stats,
  max,
  step = 1,
  badge,
  onChange,
}: {
  title: string;
  stats: StatDict;
  max: number;
  step?: number;
  badge?: React.ReactNode;
  onChange: (stat: keyof StatDict, value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold tracking-wider text-white/60 uppercase">
          {title}
        </h4>
        {badge}
      </div>
      {(Object.keys(stats) as Array<keyof StatDict>).map((s) => (
        <div key={s} className="flex items-center gap-2 text-sm">
          <span className="w-8 text-[11px] font-bold uppercase text-white/40">{s}</span>
          <input
            type="range"
            min="0"
            max={max}
            step={step}
            value={stats[s]}
            onChange={(e) => onChange(s, parseInt(e.target.value) || 0)}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[#f47e8a]"
          />
          <span className="w-6 text-right text-xs font-bold text-white">{stats[s]}</span>
        </div>
      ))}
    </div>
  );
}

function SuccessCard({
  order,
  onContinue,
}: {
  order: { id: number; totalPrice: number };
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/[0.04] p-12 text-center ring-1 ring-white/[0.06] surface-ring">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
        <CheckCircle className="h-9 w-9" />
      </div>
      <h2 className="font-display text-3xl font-bold text-white">
        Đơn hàng #{order.id} ghi nhận thành công!
      </h2>
      <p className="max-w-lg text-sm text-white/60">
        Tổng thanh toán{" "}
        <strong className="text-white">{order.totalPrice.toLocaleString()} đ</strong>.
        Admin sẽ liên hệ với bạn trong thời gian sớm nhất qua Zalo/Facebook/SĐT để tiến hành giao dịch.
      </p>
      <Button size="lg" onClick={onContinue}>
        Tiếp tục chọn Pokémon
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */
function emptyConfig(): CustomConfig {
  return {
    speciesId: 0,
    speciesName: "",
    speciesSpriteUrl: null,
    shiny: false,
    level: 100,
    gender: "M",
    ability: "",
    nature: "Adamant",
    heldItem: "None",
    moves: ["", "", "", ""],
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    trainerName: "Champions",
    trainerTid: 777777,
    trainerSid: 777777,
  };
}


