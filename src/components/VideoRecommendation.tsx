'use client'
import { useState } from 'react'
import { motion }   from 'framer-motion'

interface VideoRecommendationProps {
  youtubeId: string
  title:     string
}

export default function VideoRecommendation({ youtubeId, title }: VideoRecommendationProps) {
  const [loaded,   setLoaded]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Build embed URL with privacy-friendly params
  // - modestbranding=1  hides YouTube logo
  // - rel=0             disables related videos from other channels
  // - origin            prevents cross-origin issues
  // - enablejsapi=0     no JS API needed (simpler, safer)
  const embedUrl = [
    `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    '?modestbranding=1',
    '&rel=0',
    '&origin=',
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '',
  ].join('')

  return (
    <motion.div
      className="mt-6 border-t border-white/[0.06] pt-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.4 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎬</span>
          <span className="text-[11px] font-mono tracking-widest font-bold text-white/50 uppercase">
            Recommended Video
          </span>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[10px] font-mono text-white/30 hover:text-white/60
                     border border-white/[0.08] px-3 py-1 rounded-lg transition-colors"
        >
          {expanded ? 'Hide ▲' : 'Watch ▼'}
        </button>
      </div>

      {/* Collapsed preview — always visible */}
      <div
        className="flex items-center gap-3 bg-surface border border-white/[0.08]
                   rounded-xl p-3 cursor-pointer hover:border-white/15 transition-all group"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Thumbnail placeholder */}
        <div className="w-20 h-14 rounded-lg bg-raised border border-white/[0.06]
                        flex items-center justify-center flex-shrink-0 overflow-hidden relative">
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
            alt={title}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 flex items-center justify-center
                          bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-lg">▶</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/80 truncate mb-0.5">{title}</p>
          <p className="text-[10px] font-mono text-white/30">
            {expanded ? 'Click to collapse' : 'Click to watch'}
          </p>
        </div>

        {/* YouTube badge */}
        <div className="flex-shrink-0 bg-[#FF0000]/15 border border-[#FF0000]/25
                        rounded px-2 py-0.5">
          <span className="text-[10px] font-bold text-[#FF0000]">YT</span>
        </div>
      </div>

      {/* Expanded iframe */}
      {expanded && (
        <motion.div
          className="mt-3 rounded-xl overflow-hidden border border-white/[0.08]
                     bg-black relative"
          style={{ paddingBottom: '56.25%', height: 0 }}   // 16:9 aspect ratio
          initial={{ opacity: 0, scaleY: 0.9 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.25 }}
        >
          {/* Loading skeleton */}
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-raised">
              <motion.div
                className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              />
            </div>
          )}

          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            onLoad={() => setLoaded(true)}
            // Security: sandbox with only required permissions
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </motion.div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-white/15 font-mono mt-2 text-center">
        Curated video from our library · Matches your current topic
      </p>
    </motion.div>
  )
}
