import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Music } from 'lucide-react';

interface MediaPlayerProps {
  width: number;
  height: number;
}

export function MediaPlayer({ width, height }: MediaPlayerProps) {
  const minDim = Math.min(width, height);

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-2xl flex flex-col"
      style={{ width, height, padding: `${minDim * 0.05}px` }}
    >
      {/* Album Art Placeholder */}
      <div 
        className="bg-white/10 backdrop-blur rounded-2xl mb-2 flex items-center justify-center"
        style={{ height: `${minDim * 0.35}px` }}
      >
        <Music className="text-white/40" style={{ width: `${minDim * 0.12}px`, height: `${minDim * 0.12}px` }} />
      </div>

      {/* Track Info - Serial Joins */}
      <div className="text-center mb-2">
        <h4 
          className="text-white truncate font-semibold" 
          style={{ fontSize: `${minDim * 0.05}px` }}
          data-join-type="serial"
          data-join="1"
          title="Track Title (Serial Join 1)"
        >
          Song Title
        </h4>
        <p 
          className="text-white/70 truncate" 
          style={{ fontSize: `${minDim * 0.038}px` }}
          data-join-type="serial"
          data-join="2"
          title="Artist Name (Serial Join 2)"
        >
          Artist Name
        </p>
        <p 
          className="text-white/50 truncate" 
          style={{ fontSize: `${minDim * 0.032}px` }}
          data-join-type="serial"
          data-join="3"
          title="Album Name (Serial Join 3)"
        >
          Album Name
        </p>
      </div>

      {/* Progress Bar - Analog Join */}
      <div className="mb-2">
        <div className="relative">
          <div 
            className="w-full bg-white/20 rounded-full overflow-hidden"
            style={{ height: `${minDim * 0.015}px` }}
          >
            <div 
              className="h-full bg-white rounded-full transition-all"
              style={{ width: '45%' }}
              data-join-type="analog"
              data-join="1"
              title="Progress (Analog Join 1)"
            />
          </div>
          {/* Seekable overlay */}
          <div 
            className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100"
            data-join-type="analog"
            data-join="2"
            title="Seek Position (Analog Join 2)"
          />
        </div>
        <div 
          className="flex justify-between text-white/50 mt-1" 
          style={{ fontSize: `${minDim * 0.03}px` }}
        >
          <span 
            data-join-type="serial"
            data-join="4"
            title="Current Time (Serial Join 4)"
          >
            2:14
          </span>
          <span 
            data-join-type="serial"
            data-join="5"
            title="Total Time (Serial Join 5)"
          >
            4:32
          </span>
        </div>
      </div>

      {/* Main Transport Controls */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {/* Previous */}
        <button
          className="bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-95 flex items-center justify-center"
          style={{
            width: `${minDim * 0.12}px`,
            height: `${minDim * 0.12}px`,
          }}
          data-join-type="digital"
          data-join="1"
          title="Previous Track (Digital Join 1)"
        >
          <SkipBack className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
        </button>

        {/* Play/Pause */}
        <button
          className="bg-white hover:bg-white/90 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-lg"
          style={{
            width: `${minDim * 0.16}px`,
            height: `${minDim * 0.16}px`,
          }}
          data-join-type="digital"
          data-join="2"
          title="Play/Pause (Digital Join 2)"
        >
          <Play className="text-indigo-600 ml-1" style={{ width: `${minDim * 0.07}px`, height: `${minDim * 0.07}px` }} />
        </button>

        {/* Next */}
        <button
          className="bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-95 flex items-center justify-center"
          style={{
            width: `${minDim * 0.12}px`,
            height: `${minDim * 0.12}px`,
          }}
          data-join-type="digital"
          data-join="3"
          title="Next Track (Digital Join 3)"
        >
          <SkipForward className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
        </button>
      </div>

      {/* Volume Control - Analog Join */}
      <div className="flex items-center gap-2 mb-2">
        <Volume2 className="text-white" style={{ width: `${minDim * 0.045}px`, height: `${minDim * 0.045}px` }} />
        <div className="flex-1 relative">
          <div 
            className="w-full bg-white/20 rounded-full overflow-hidden"
            style={{ height: `${minDim * 0.012}px` }}
          >
            <div 
              className="h-full bg-white rounded-full transition-all"
              style={{ width: '70%' }}
              data-join-type="analog"
              data-join="3"
              title="Volume (Analog Join 3)"
            />
          </div>
          {/* Clickable overlay */}
          <div 
            className="absolute inset-0 cursor-pointer"
            data-join-type="analog"
            data-join="4"
            title="Set Volume (Analog Join 4)"
          />
        </div>
        <span 
          className="text-white/70 min-w-0" 
          style={{ fontSize: `${minDim * 0.035}px` }}
          data-join-type="analog-fb"
          data-join="3"
          title="Volume Feedback (Analog Join 3)"
        >
          70%
        </span>
      </div>

      {/* Additional Controls */}
      <div className="grid grid-cols-2 gap-2">
        {/* Shuffle */}
        <button
          className="bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center justify-center gap-1"
          style={{ padding: `${minDim * 0.025}px` }}
          data-join-type="digital"
          data-join="4"
          title="Shuffle (Digital Join 4)"
        >
          <Shuffle className="text-white" style={{ width: `${minDim * 0.04}px`, height: `${minDim * 0.04}px` }} />
          <span className="text-white" style={{ fontSize: `${minDim * 0.035}px` }}>Shuffle</span>
        </button>

        {/* Repeat */}
        <button
          className="bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center justify-center gap-1"
          style={{ padding: `${minDim * 0.025}px` }}
          data-join-type="digital"
          data-join="5"
          title="Repeat (Digital Join 5)"
        >
          <Repeat className="text-white" style={{ width: `${minDim * 0.04}px`, height: `${minDim * 0.04}px` }} />
          <span className="text-white" style={{ fontSize: `${minDim * 0.035}px` }}>Repeat</span>
        </button>
      </div>
    </div>
  );
}
