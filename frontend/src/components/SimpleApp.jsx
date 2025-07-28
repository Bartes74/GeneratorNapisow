import { useState, useRef } from 'react'
import { Upload, Download, FileText, Film, Loader, X, AlertCircle } from 'lucide-react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function SimpleApp() {
  const [file, setFile] = useState(null)
  const [videoData, setVideoData] = useState(null)
  const [transcriptionData, setTranscriptionData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [subtitleStyles, setSubtitleStyles] = useState({
    fontFamily: 'Arial',
    fontSize: 24,
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 2
  })
  const fileInputRef = useRef(null)
  const srtInputRef = useRef(null)

  const languages = [
    { code: 'auto', name: 'Wykryj język automatycznie' },
    { code: 'pl', name: 'Polski' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' }
  ]

  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 
    'Courier New', 'Verdana', 'Trebuchet MS', 'Impact'
  ]

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    const fileExt = selectedFile.name.toLowerCase().substr(selectedFile.name.lastIndexOf('.'))
    if (!['.mp4', '.mov', '.avi'].includes(fileExt)) {
      setError(`Format ${fileExt} nie jest obsługiwany`)
      return
    }

    setFile(selectedFile)
    setError('')
  }

  const handleUploadAndTranscribe = async () => {
    if (!file) return

    setLoading(true)
    setLoadingMessage('Przesyłanie pliku...')
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Upload with timeout
      const uploadResponse = await axios.post(`${API_URL}/api/upload`, formData, {
        timeout: 30000 // 30 seconds
      })
      setVideoData(uploadResponse.data)
      console.log('Upload successful:', uploadResponse.data)

      // Transcribe with longer timeout
      setLoadingMessage('Generowanie transkrypcji... (to może potrwać kilka minut)')
      
      const transcribeResponse = await axios.post(
        `${API_URL}/api/transcribe/${uploadResponse.data.video_id}?language=${selectedLanguage === 'auto' ? '' : selectedLanguage}`,
        null,
        {
          timeout: 300000 // 5 minutes
        }
      )
      console.log('Transcription successful:', transcribeResponse.data)
      setTranscriptionData(transcribeResponse.data)
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      if (err.code === 'ECONNABORTED') {
        setError('Przekroczono limit czasu. Spróbuj z krótszym filmem.')
      } else {
        setError(err.response?.data?.detail || err.message || 'Błąd podczas przetwarzania')
      }
      setLoading(false)
    }
  }

  const downloadSRT = async () => {
    if (!videoData) return
    
    window.open(`${API_URL}/api/download/srt/${videoData.video_id}`, '_blank')
  }

  const handleSRTUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !videoData) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post(`${API_URL}/api/upload-srt/${videoData.video_id}`, formData)
      setError('')
      alert('Plik SRT został zaktualizowany!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Błąd przesyłania SRT')
    }
  }

  const generatePreview = async () => {
    if (!videoData) return

    setLoading(true)
    setLoadingMessage('Generowanie podglądu...')

    try {
      const response = await axios.post(
        `${API_URL}/api/render-preview/${videoData.video_id}`,
        { subtitle_styles: subtitleStyles },
        { responseType: 'blob' }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      window.open(url, '_blank')
      setLoading(false)
    } catch (err) {
      setError('Błąd generowania podglądu')
      setLoading(false)
    }
  }

  const generateFinalVideo = async () => {
    if (!videoData) return

    setLoading(true)
    setLoadingMessage('Renderowanie filmu z napisami...')

    try {
      await axios.post(
        `${API_URL}/api/render-final/${videoData.video_id}`,
        { subtitle_styles: subtitleStyles }
      )
      
      setLoading(false)
      window.open(`${API_URL}/api/download/video/${videoData.video_id}`, '_blank')
    } catch (err) {
      setError('Błąd renderowania filmu')
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setVideoData(null)
    setTranscriptionData(null)
    setError('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Section */}
      {!videoData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Upload wideo</h2>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-700 dark:text-gray-300">{file ? file.name : 'Kliknij aby wybrać plik'}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {file && (
            <div className="mt-4 space-y-4">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
              
              <button
                onClick={handleUploadAndTranscribe}
                disabled={loading}
                className="w-full py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Przygotuj transkrypcję
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {transcriptionData && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Transkrypcja ukończona</h3>
            <button
              onClick={downloadSRT}
              className="w-full py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              Pobierz plik napisów
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Konfiguracja napisów</h3>
            
            <div className="space-y-4">
              <button
                onClick={() => srtInputRef.current?.click()}
                className="w-full py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
              >
                Wczytaj plik z napisami
              </button>
              <input
                ref={srtInputRef}
                type="file"
                accept=".srt"
                onChange={handleSRTUpload}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Czcionka</label>
                  <select
                    value={subtitleStyles.fontFamily}
                    onChange={(e) => setSubtitleStyles({...subtitleStyles, fontFamily: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {fonts.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Rozmiar: {subtitleStyles.fontSize}px</label>
                  <input
                    type="range"
                    min="16"
                    max="48"
                    value={subtitleStyles.fontSize}
                    onChange={(e) => setSubtitleStyles({...subtitleStyles, fontSize: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kolor tekstu</label>
                  <input
                    type="color"
                    value={subtitleStyles.color}
                    onChange={(e) => setSubtitleStyles({...subtitleStyles, color: e.target.value})}
                    className="w-full h-10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kolor obwódki</label>
                  <input
                    type="color"
                    value={subtitleStyles.strokeColor}
                    onChange={(e) => setSubtitleStyles({...subtitleStyles, strokeColor: e.target.value})}
                    className="w-full h-10"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={generatePreview}
                  disabled={loading}
                  className="flex-1 py-2 border border-primary text-primary rounded hover:bg-primary/10 disabled:opacity-50 transition-colors"
                >
                  Wygeneruj próbkę
                </button>
                <button
                  onClick={generateFinalVideo}
                  disabled={loading}
                  className="flex-1 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Generuj film z napisami
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Zacznij od nowa
          </button>
        </>
      )}

      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
            <Loader className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-gray-900 dark:text-white">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-red-500 dark:text-red-400 mr-2 flex-shrink-0" size={20} />
          <p className="text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  )
}

export default SimpleApp