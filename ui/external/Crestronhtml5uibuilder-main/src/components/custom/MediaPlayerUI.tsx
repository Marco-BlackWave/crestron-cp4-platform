// EXAMPLE: Media Player UI Component
// 100% UI FIDELITY - No Crestron logic here, just pure design!

import { Play, Pause, SkipBack, SkipForward, Music, Volume2 } from 'lucide-react';

export interface MediaPlayerUIProps {
  // Visual props (controlled from outside)
  title?: string;
  artist?: string;
  album?: string;
  isPlaying?: boolean;
  volume?: number; // 0-100
  progress?: number; // 0-100
  duration?: string;
  currentTime?: string;

  // Callbacks (will be mapped to Crestron joins)
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onVolumeChange?: (value: number) => void;
  onSeek?: (value: number) => void;
}

export function MediaPlayerUI({
  title = 'Now Playing',
  artist = 'Artist Name',
  album = 'Album Name',
  isPlaying = false,
  volume = 65,
  progress = 35,
  duration = '3:45',
  currentTime = '1:20',
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onVolumeChange,
  onSeek,
}: MediaPlayerUIProps) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950 rounded-3xl p-8 flex flex-col">
      {/* Album Art */}
      <div className="flex-shrink-0 w-full aspect-square max-h-[200px] bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
        <Music className="w-20 h-20 text-white/50" />
      </div>

      {/* Track Info */}
      <div className="flex-shrink-0 mb-6 text-center">
        <h3 className="text-white text-xl mb-1 truncate">{title}</h3>
        <p className="text-zinc-400 text-sm truncate">{artist}</p>
        <p className="text-zinc-500 text-xs truncate mt-1">{album}</p>
      </div>

      {/* Progress Bar */}
      <div className="flex-shrink-0 mb-6">
        <div className="relative h-1 bg-zinc-700 rounded-full cursor-pointer group">
          <div 
            className="absolute h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%`, marginLeft: '-6px' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span>{currentTime}</span>
          <span>{duration}</span>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 mb-6">
        <button
          onClick={onPrevious}
          className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 flex items-center justify-center text-white transition-all shadow-lg shadow-purple-500/30"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7" fill="currentColor" />
          ) : (
            <Play className="w-7 h-7 ml-1" fill="currentColor" />
          )}
        </button>
        
        <button
          onClick={onNext}
          className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex-shrink-0 flex items-center gap-3">
        <Volume2 className="w-5 h-5 text-zinc-400 flex-shrink-0" />
        <div className="flex-1 relative h-1 bg-zinc-700 rounded-full cursor-pointer group">
          <div 
            className="absolute h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${volume}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${volume}%`, marginLeft: '-6px' }}
          />
        </div>
        <span className="text-xs text-zinc-400 w-8 text-right flex-shrink-0">{volume}%</span>
      </div>
    </div>
  );
}
