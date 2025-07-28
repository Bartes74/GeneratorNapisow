import { useState } from 'react'
import { Loader, Download, AlertCircle } from 'lucide-react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function Transcription({ videoData, onTranscriptionComplete }) {
  const [transcribing, setTranscribing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [transcriptionResult, setTranscriptionResult] = useState(null)

  const languages = [
    { code: 'auto', name: 'Auto-wykryj' },
    { code: 'pl', name: 'Polski' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' }
  ]

  const startTranscription = async () => {
    setTranscribing(true)
    setError('')
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 5
      })
    }, 1000)

    try {
      const language = selectedLanguage === 'auto' ? null : selectedLanguage
      const response = await axios.post(
        `${API_URL}/api/transcribe/${videoData.video_id}`,
        null,
        {
          params: { language },
          timeout: 10 * 60 * 1000 // timeout ustawiony na 10 minut
        }
      )

      clearInterval(progressInterval)
      setProgress(100)
      setTranscriptionResult(response.data)

      setTimeout(() => {
        onTranscriptionComplete(response.data)
      }, 1500)
    } catch (err) {
      clearInterval(progressInterval)
      setError(err.response?.data?.detail || 'Błąd podczas transkrypcji')
    } finally {
      setTranscribing(false)
    }
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
      link.setAttribute(
        'download',
        `${videoData.filename.replace(/\.[^/.]+$/, '')}_napisy.srt`
      )
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
          Transkrypcja audio
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Wideo: {videoData.filename} ({videoData.size_mb} MB)
        </p>
      </div>

      <div className="flex justify-center">
        <select
          className="rounded-lg border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          value={selectedLanguage}
          onChange={e => setSelectedLanguage(e.target.value)}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {transcribing && (
        <div className="space-y-2">
          <Loader className="animate-spin text-primary mx-auto" size={48} />
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Transkrypcja trwa... ({Math.floor(progress)}%)
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!transcribing && transcriptionResult && (
        <div className="space-y-4 text-center">
          <p className="text-success font-semibold">✅ Transkrypcja zakończona!</p>
          <button
            onClick={downloadSRT}
            className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center"
          >
            <Download size={20} className="mr-2" />
            Pobierz napisy .srt
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-danger mt-0.5 mr-3 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {!transcribing && !transcriptionResult && (
        <button
          onClick={startTranscription}
          className="w-full py-3 px-4 rounded-lg font-medium bg-primary hover:bg-primary/90 text-white transition-colors"
        >
          Rozpocznij transkrypcję
        </button>
      )}
    </div>
  )
}

export default Transcription
