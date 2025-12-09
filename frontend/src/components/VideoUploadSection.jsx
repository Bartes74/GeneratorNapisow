import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { apiPath } from '../api'

function VideoUploadSection({ onVideoUpload, onTranscriptionComplete }) {
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState(null)
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [isDragging, setIsDragging] = useState(false)

  // New state for flow control
  const [uploadedVideoData, setUploadedVideoData] = useState(null)

  const fileInputRef = useRef(null)
  const srtInputRef = useRef(null)

  // Cleanup URL.createObjectURL on unmount or when videoPreviewUrl changes
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
    }
  }, [videoPreviewUrl])

  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
      setError(null)
      setUploadedVideoData(null) // Reset uploaded state if file changes
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
      setError(null)
      setUploadedVideoData(null) // Reset uploaded state if file changes
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  // Step 1: Upload Video
  const handleUpload = async () => {
    if (!videoFile) return
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', videoFile)

    try {
      const uploadResponse = await axios.post(apiPath('/api/upload'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      // Set uploaded data but don't notify parent yet about completion (wait for transcribed/srt)
      const data = uploadResponse.data
      setUploadedVideoData(data)
      onVideoUpload(data) // Notify parent that video exists
      setUploading(false)

    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Błąd podczas przesyłania wideo')
      setUploading(false)
    }
  }

  // Step 2a: Auto Transcribe
  const handleTranscribe = async () => {
    if (!uploadedVideoData) return
    setTranscribing(true)
    setError(null)

    try {
      await axios.post(
        apiPath(`/api/transcribe/${uploadedVideoData.video_id}?language=${selectedLanguage === 'auto' ? '' : selectedLanguage}`),
        null,
        { timeout: 300000 }
      )

      onTranscriptionComplete()
      setTranscribing(false)

    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Błąd podczas transkrypcji')
      setTranscribing(false)
    }
  }

  // Step 2b: Upload SRT
  const handleSrtUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !uploadedVideoData) return

    setTranscribing(true) // Re-use spinner state for feedback
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post(apiPath(`/api/upload-srt/${uploadedVideoData.video_id}`), formData)

      onTranscriptionComplete()
      setTranscribing(false)
    } catch (err) {
      console.error('Błąd wgrywania SRT:', err)
      setError('Błąd podczas wgrywania pliku SRT. Upewnij się, że format jest poprawny.')
      setTranscribing(false)
    }

    // Reset inputs
    if (srtInputRef.current) srtInputRef.current.value = ''
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {uploadedVideoData ? 'Wybierz metodę napisów' : 'Wczytaj plik wideo'}
      </h2>

      <div className="space-y-4">
        {/* Only show drop zone if video not yet uploaded successfully */}
        {!uploadedVideoData && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !videoFile && fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              ${isDragging
                ? 'border-[#006575] bg-[#006575]/5'
                : 'border-gray-300 dark:border-gray-600 hover:border-[#006575]'
              }
              ${videoFile ? 'cursor-default' : ''}
            `}
          >
            {!videoFile ? (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Wczytaj lub przeciągnij tutaj plik wideo
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  (obsługiwane formaty: MP4, MOV, AVI)
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {videoFile.name}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="text-sm text-[#006575] hover:underline"
                >
                  Zmień plik
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
            />
          </div>
        )}

        {videoPreviewUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <video
              src={videoPreviewUrl}
              controls
              className="w-full max-h-48 object-contain bg-black"
            />
          </div>
        )}

        {/* --- STEP 1: UPLOAD --- */}
        {!uploadedVideoData && (
          <div className="space-y-4">
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Przesyłanie...</span>
                  <span className="text-gray-900 dark:text-white font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-[#006575] h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !videoFile}
              className="w-full py-3 px-4 bg-[#006575] hover:bg-[#004A55] text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading && (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {uploading ? 'Wysyłanie...' : 'Wgraj wideo'}
            </button>
          </div>
        )}

        {/* --- STEP 2: DECISION --- */}
        {uploadedVideoData && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-300 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Wideo przesłane pomyślnie! Co chcesz zrobić dalej?
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OPTION A: AUTO TRANSCRIBE */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-[#006575] transition-all">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  🤖 Automatyczna transkrypcja
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Użyj AI, aby wygenerować napisy z audio.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Język:
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="auto">Wykryj (Auto)</option>
                      <option value="pl">Polski</option>
                      <option value="en">Angielski</option>
                      <option value="fr">Francuski</option>
                    </select>
                  </div>

                  <button
                    onClick={handleTranscribe}
                    disabled={transcribing}
                    className="w-full py-2 px-4 bg-[#006575] hover:bg-[#004A55] text-white rounded-lg transition-all disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {transcribing ? 'Generowanie...' : 'Generuj napisy'}
                  </button>
                </div>
              </div>

              {/* OPTION B: UPLOAD SRT */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-[#006575] transition-all">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  📄 Mam już plik napisów
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Wgraj gotowy plik .srt i przejdź do edycji.
                </p>

                <div className="mt-auto">
                  <input
                    type="file"
                    ref={srtInputRef}
                    accept=".srt"
                    onChange={handleSrtUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => srtInputRef.current?.click()}
                    disabled={transcribing}
                    className="w-full py-2 px-4 border border-[#006575] text-[#006575] hover:bg-[#006575]/10 rounded-lg transition-all disabled:opacity-50 text-sm font-medium"
                  >
                    Wgraj plik .srt
                  </button>
                </div>
              </div>
            </div>

            {transcribing && (
              <div className="flex justify-center py-4">
                <svg className="animate-spin h-8 w-8 text-[#006575]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoUploadSection