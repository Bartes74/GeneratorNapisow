import { useState } from 'react'
import { Download, Loader, Film, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function FinalRender({ videoData, subtitleStyles, onComplete }) {
  const [rendering, setRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [renderComplete, setRenderComplete] = useState(false)
  const [error, setError] = useState('')
  const [downloadOptions, setDownloadOptions] = useState({
    video: true,
    srt: true
  })

  const startRender = async () => {
    setRendering(true)
    setError('')
    setProgress(0)
    setRenderComplete(false)

    // Symulacja postępu renderowania
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev
        return prev + Math.random() * 5
      })
    }, 2000)

    try {
      // Tu normalnie byłoby wywołanie API do renderowania
      // const response = await axios.post(`${API_URL}/api/render/${videoData.video_id}`, {
      //   subtitleStyles
      // })

      // Symulacja renderowania
      await new Promise(resolve => setTimeout(resolve, 15000))

      clearInterval(progressInterval)
      setProgress(100)
      setRenderComplete(true)
    } catch (err) {
      clearInterval(progressInterval)
      setError(err.response?.data?.detail || 'Błąd podczas renderowania wideo')
    } finally {
      setRendering(false)
    }
  }

  const downloadVideo = () => {
    // Symulacja pobierania
    alert('Pobieranie wideo z napisami...')
    // Tu normalnie byłoby:
    // window.open(`${API_URL}/api/download/video/${videoData.video_id}`, '_blank')
  }

  const downloadSRT = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/download/srt/${videoData.video_id}`,
        { responseType: 'blob' }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${videoData.filename.replace(/\.[^/.]+$/, '')}_subtitles.srt`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Błąd podczas pobierania pliku SRT')
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Renderowanie finalne
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Wygeneruj wideo z wypalonymi napisami
        </p>
      </div>

      {/* Render Settings */}
      {!rendering && !renderComplete && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Informacje o renderze
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Plik wideo:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{videoData.filename}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Rozmiar:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{videoData.size_mb} MB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Format:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{videoData.format.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Czcionka napisów:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{subtitleStyles.fontFamily}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Rozmiar czcionki:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{subtitleStyles.fontSize}px</dd>
              </div>
            </dl>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Uwaga:</strong> Renderowanie może potrwać kilka minut w zależności od długości wideo.
              Nie zamykaj przeglądarki podczas tego procesu.
            </p>
          </div>

          <button
            onClick={startRender}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
          >
            Rozpocznij renderowanie
          </button>
        </div>
      )}

      {/* Rendering Progress */}
      {rendering && (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Loader className="animate-spin h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Renderowanie wideo z napisami...
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            To może potrwać kilka minut. Proszę czekać...
          </p>
        </div>
      )}

      {/* Render Complete */}
      {renderComplete && !rendering && (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start">
            <CheckCircle className="text-success mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Renderowanie zakończone pomyślnie!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Twoje wideo z napisami jest gotowe do pobrania.
              </p>
            </div>
          </div>

          {/* Download Options */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Opcje pobierania:
            </h3>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={downloadOptions.video}
                onChange={(e) => setDownloadOptions({ ...downloadOptions, video: e.target.checked })}
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Wideo z wypalonymi napisami (.mp4)
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={downloadOptions.srt}
                onChange={(e) => setDownloadOptions({ ...downloadOptions, srt: e.target.checked })}
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Plik napisów (.srt)
              </span>
            </label>
          </div>

          {/* Download Buttons */}
          <div className="flex gap-3">
            {downloadOptions.video && (
              <button
                onClick={downloadVideo}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Film size={20} />
                Pobierz wideo
              </button>
            )}
            {downloadOptions.srt && (
              <button
                onClick={downloadSRT}
                className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={20} />
                Pobierz napisy
              </button>
            )}
          </div>

          <button
            onClick={onComplete}
            className="w-full py-2 px-4 bg-success hover:bg-success/90 text-white rounded-lg font-medium transition-colors"
          >
            Zakończ i stwórz nowy projekt
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-danger mt-0.5 mr-3 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  )
}

export default FinalRender