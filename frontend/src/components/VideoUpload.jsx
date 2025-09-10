import { useState, useRef } from 'react'
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import axios from 'axios'
import { apiPath } from '../api'

function VideoUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)

  const allowedFormats = ['.mp4', '.mov', '.avi']
  const maxSize = 500 // MB

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    // Validate file type
    const fileExt = selectedFile.name.toLowerCase().substr(selectedFile.name.lastIndexOf('.'))
    if (!allowedFormats.includes(fileExt)) {
      setError(`Format ${fileExt} nie jest obsługiwany. Dozwolone: ${allowedFormats.join(', ')}`)
      return
    }

    // Validate file size
    const sizeMB = selectedFile.size / 1024 / 1024
    if (sizeMB > maxSize) {
      setError(`Plik jest za duży (${sizeMB.toFixed(1)}MB). Maksymalny rozmiar: ${maxSize}MB`)
      return
    }

    setFile(selectedFile)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError('')
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(apiPath('/api/upload'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      onUploadComplete(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Błąd podczas przesyłania pliku')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect({ target: { files: [droppedFile] } })
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Upload wideo
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Przeciągnij plik lub kliknij aby wybrać
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          {file ? file.name : 'Kliknij lub przeciągnij plik wideo'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Obsługiwane formaty: {allowedFormats.join(', ')} (max {maxSize}MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedFormats.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File Info */}
      {file && !uploading && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={() => {
              setFile(null)
              setError('')
            }}
            className="text-danger hover:text-danger/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Przesyłanie...</span>
            <span className="text-gray-900 dark:text-white font-medium">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-danger mt-0.5 mr-3 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          !file || uploading
            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-primary hover:bg-primary/90 text-white'
        }`}
      >
        {uploading ? 'Przesyłanie...' : 'Prześlij wideo'}
      </button>
    </div>
  )
}

export default VideoUpload