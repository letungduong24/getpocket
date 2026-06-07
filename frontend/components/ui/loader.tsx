"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function PokemonLoader({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#26080c] select-none", className)}>
      <style>{`
        @keyframes pokeball-wobble {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          15% { transform: rotate(-15deg) translateY(-8px); }
          30% { transform: rotate(15deg) translateY(-4px); }
          45% { transform: rotate(-10deg) translateY(-2px); }
          60% { transform: rotate(10deg) translateY(0); }
          75% { transform: rotate(-5deg) translateY(0); }
        }
        .animate-wobble {
          animation: pokeball-wobble 1.5s infinite ease-in-out;
        }
      `}</style>
      {/* Glowing backdrop blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-[#ff4655] opacity-20 blur-[100px] pointer-events-none animate-pulse" />
      
      {/* Pokemon Pokéball Loader */}
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative h-24 w-24 animate-wobble hover:scale-105 transition-transform cursor-pointer">
          {/* Upper Half - Red */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#ff4655] to-[#ff6b7a] rounded-t-full border-4 border-[#1a070b] border-b-0" />
          {/* Lower Half - White */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-white rounded-b-full border-4 border-[#1a070b] border-t-0" />
          {/* Middle Line */}
          <div className="absolute top-1/2 left-0 w-full h-2 bg-[#1a070b] -translate-y-1/2" />
          {/* Center Button Outer */}
          <div className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#1a070b] bg-white flex items-center justify-center shadow-lg" />
          {/* Center Button Inner (glowing core) */}
          <div className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff4655] animate-ping" />
          <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff4655] shadow-[0_0_8px_#ff4655]" />
        </div>
      </div>
    </div>
  )
}
