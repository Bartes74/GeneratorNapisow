import { useState, useRef } from 'react'
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
  const fileInputRef = useRef(null)

  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
      setError(null)
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

  const handleUploadAndTranscribe = async () => {
    if (!videoFile) return
    setUploading(true)
    setTranscribing(false)
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

      onVideoUpload(uploadResponse.data)
      setUploading(false)
      setTranscribing(true)

      const transcribeResponse = await axios.post(
        apiPath(`/api/transcribe/${uploadResponse.data.video_id}?language=${selectedLanguage === 'auto' ? '' : selectedLanguage}`),
        null,
        { timeout: 300000 }
      )

      onTranscriptionComplete()
      setTranscribing(false)

    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Błąd podczas przetwarzania')
      setUploading(false)
      setTranscribing(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        {/* Ikona wideo */}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Wczytaj plik wideo
      </h2>

      <div className="space-y-4">
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
              {/* Ikona upload */}
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

        {videoPreviewUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <video
              src={videoPreviewUrl}
              controls
              className="w-full max-h-48 object-contain bg-black"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Ikona języka */}
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Język oryginalny:
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="auto">Wykryj automatycznie</option>
            <option value="pl">Polski</option>
            <option value="en">Angielski</option>
            <option value="fr">Francuski</option>
          </select>
        </div>

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
          onClick={handleUploadAndTranscribe}
          disabled={uploading || transcribing || !videoFile}
          className="w-full py-3 px-4 bg-[#006575] hover:bg-[#004A55] text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {(uploading || transcribing) && (
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {uploading ? 'Wysyłanie...' : transcribing ? 'Generowanie transkrypcji...' : 'Wygeneruj napisy'}
        </button>

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