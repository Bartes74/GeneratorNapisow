import { useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

const API_URL = 'http://localhost:8000'

function VideoPreview({ videoData, transcriptionData, subtitleStyles, onNext, onBack }) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)

  useEffect(() => {
    // Inicjalizacja Video.js
    if (!playerRef.current && videoRef.current) {
      const player = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        language: 'pl',
        playbackRates: [0.5, 1, 1.5, 2],
        controlBar: {
          playToggle: true,
          volumePanel: {
            inline: false,
          },
          currentTimeDisplay: true,
          timeDivider: true,
          durationDisplay: true,
          progressControl: true,
          remainingTimeDisplay: false,
          fullscreenToggle: true,
        }
      })

      // Dodaj ścieżkę napisów
      player.addRemoteTextTrack({
        kind: 'subtitles',
        src: `${API_URL}/api/download/srt/${videoData.video_id}`,
        srclang: transcriptionData.language || 'pl',
        label: 'Polski',
        default: true
      }, false)

      // Ustaw źródło wideo
      player.src({
        src: `${API_URL}/uploads/${videoData.video_id}${videoData.format}`,
        type: `video/${videoData.format.substring(1)}`
      })

      playerRef.current = player

      // Zastosuj style napisów
      const textTrackDisplay = player.el().querySelector('.vjs-text-track-display')
      if (textTrackDisplay) {
        const style = document.createElement('style')
        style.textContent = `
          .vjs-text-track-display {
            font-family: ${subtitleStyles.fontFamily} !important;
          }
          .vjs-text-track-cue > div {
            font-size: ${subtitleStyles.fontSize}px !important;
            color: ${subtitleStyles.color} !important;
            text-shadow: 
              -${subtitleStyles.strokeWidth}px -${subtitleStyles.strokeWidth}px 0 ${subtitleStyles.strokeColor},
              ${subtitleStyles.strokeWidth}px -${subtitleStyles.strokeWidth}px 0 ${subtitleStyles.strokeColor},
              -${subtitleStyles.strokeWidth}px ${subtitleStyles.strokeWidth}px 0 ${subtitleStyles.strokeColor},
              ${subtitleStyles.strokeWidth}px ${subtitleStyles.strokeWidth}px 0 ${subtitleStyles.strokeColor} !important;
            background: none !important;
            padding: 0.2em !important;
          }
        `
        document.head.appendChild(style)
      }
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose()
        playerRef.current = null
      }
    }
  }, [videoData, transcriptionData, subtitleStyles])

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Podgląd wideo z napisami
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sprawdź jak wyglądają napisy na wideo
        </p>
      </div>

      {/* Video Player */}
      <div className="bg-black rounded-lg overflow-hidden">
        <div data-vjs-player>
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered vjs-theme-city"
          />
        </div>
      </div>

      {/* Subtitle Segments */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          Segmenty napisów ({transcriptionData.segments?.length || 0})
        </h3>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {transcriptionData.segments?.map((segment, index) => (
            <div
              key={index}
              className="flex items-start gap-3 text-sm border-b border-gray-200 dark:border-gray-600 pb-2 last:border-0"
            >
              <span className="text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                {formatTime(segment.timestamp[0])} - {formatTime(segment.timestamp[1])}
              </span>
              <span className="text-gray-700 dark:text-gray-300 flex-1">
                {segment.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft size={20} />
          Wróć do edycji
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          Przejdź do renderowania
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Style Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Wskazówka:</strong> Użyj kontrolek odtwarzacza aby sprawdzić synchronizację napisów. 
          Jeśli napisy wymagają poprawek, wróć do poprzedniego kroku.
        </p>
      </div>
    </div>
  )
}

// Helper function to format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default VideoPreview