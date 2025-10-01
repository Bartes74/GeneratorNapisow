import { useState, useRef, useMemo } from 'react'
import axios from 'axios'
import { apiPath } from '../api'

function SubtitleEditor({ videoId, subtitleStyles, onStylesChange, onComplete }) {
    const [fontFamily, setFontFamily] = useState(subtitleStyles?.fontFamily || 'Arial')
    const [fontSize, setFontSize] = useState(subtitleStyles?.fontSize || 24)
    const [color, setColor] = useState(subtitleStyles?.color || '#FFFFFF')
    const [strokeColor, setStrokeColor] = useState(subtitleStyles?.strokeColor || '#000000')
    const [strokeWidth, setStrokeWidth] = useState(subtitleStyles?.strokeWidth || 2)
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef(null)

    const fonts = [
        'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
        'Courier New', 'Verdana', 'Trebuchet MS', 'Impact'
    ]

    const handleSubtitleUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)
        try {
            await axios.post(apiPath(`/api/upload-srt/${videoId}`), formData)
            alert('Plik SRT został zaktualizowany!')
        } catch (err) {
            console.error('Błąd wgrywania SRT:', err)
            alert('Błąd podczas wgrywania pliku SRT')
        }
    }

    const generateSample = async () => {
        setLoading(true)
        try {
            const stylesData = {
                fontFamily,
                fontSize,
                color,
                strokeColor,
                strokeWidth
            }
            
            console.log('Wysyłanie stylów próbki:', stylesData)
            
            const response = await axios.post(
                apiPath(`/api/render-preview/${videoId}`),
                { 
                    subtitle_styles: stylesData
                },
                { 
                    responseType: 'blob',
                    timeout: 60000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            )
            
            console.log('Próbka wygenerowana, otwieranie...')
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'video/mp4' }))
            
            // Utwórz element video zamiast otwierania w nowej karcie
            const videoElement = document.createElement('video')
            videoElement.src = url
            videoElement.controls = true
            videoElement.autoplay = true
            videoElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                max-width: 80vw;
                max-height: 80vh;
                background: black;
                border: 2px solid #006575;
                border-radius: 8px;
            `
            
            // Dodaj overlay
            const overlay = document.createElement('div')
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `
            
            // Przycisk zamknij
            const closeButton = document.createElement('button')
            closeButton.textContent = '✕ Zamknij'
            closeButton.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: #006575;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                z-index: 10001;
            `
            
            const closePreview = () => {
                document.body.removeChild(overlay)
                window.URL.revokeObjectURL(url)
            }
            
            closeButton.onclick = closePreview
            overlay.onclick = (e) => {
                if (e.target === overlay) closePreview()
            }
            
            document.body.appendChild(overlay)
            overlay.appendChild(videoElement)
            overlay.appendChild(closeButton)
            
        } catch (err) {
            console.error('Błąd generowania próbki:', err)
            const errorMessage = err.response?.data?.detail || err.message || 'Nieznany błąd'
            alert(`Błąd generowania próbki: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    const generateFinalVideo = async () => {
        setLoading(true)
        try {
            const stylesData = {
                fontFamily,
                fontSize,
                color,
                strokeColor,
                strokeWidth
            }
            
            console.log('Wysyłanie stylów filmu:', stylesData)
            
            const response = await axios.post(
                apiPath(`/api/render-final/${videoId}`),
                { 
                    subtitle_styles: stylesData
                },
                { 
                    timeout: 300000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            )
            
            console.log('Odpowiedź renderowania:', response.data)
            
            // Czekaj chwilę i otwórz link do pobrania
            setTimeout(() => {
                window.open(apiPath(`/api/download/video/${videoId}`), '_blank')
            }, 1000)
            
            alert('Film został wygenerowany pomyślnie! Pobieranie rozpocznie się za chwilę.')
            
        } catch (err) {
            console.error('Błąd renderowania filmu:', err)
            const errorMessage = err.response?.data?.detail || err.message || 'Nieznany błąd'
            alert(`Błąd renderowania filmu: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    const textShadow = useMemo(() => {
        if (strokeWidth === 0) return 'none'
        const shadows = []
        const steps = 16
        for (let i = 0; i < steps; i++) {
            const angle = (i * Math.PI * 2) / steps
            const x = Math.cos(angle) * strokeWidth
            const y = Math.sin(angle) * strokeWidth
            shadows.push(`${x.toFixed(2)}px ${y.toFixed(2)}px 0 ${strokeColor}`)
        }
        for (let i = 0; i < steps; i++) {
            const angle = (i * Math.PI * 2) / steps + (Math.PI / steps)
            const x = Math.cos(angle) * (strokeWidth * 0.7)
            const y = Math.sin(angle) * (strokeWidth * 0.7)
            shadows.push(`${x.toFixed(2)}px ${y.toFixed(2)}px 0 ${strokeColor}`)
        }
        return shadows.join(', ')
    }, [strokeColor, strokeWidth])

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Konfiguracja napisów</h2>
                
                <button
                    onClick={() => fileInputRef.current.click()}
                    className="w-full py-3 px-4 bg-[#006575] text-white rounded-lg hover:bg-[#004A55] transition-all font-medium flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Wczytaj plik z napisami
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".srt"
                    hidden
                    onChange={handleSubtitleUpload}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Czcionka</label>
                        <select
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                        >
                            {fonts.map(font => (
                                <option key={font} value={font}>{font}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Rozmiar: {fontSize}px
                        </label>
                        <input
                            type="range"
                            min={16}
                            max={48}
                            value={fontSize}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Kolor tekstu</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="h-10 w-20 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                            />
                            <input
                                type="text"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Kolor obwódki</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="h-10 w-20 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                                value={strokeColor}
                                onChange={(e) => setStrokeColor(e.target.value)}
                            />
                            <input
                                type="text"
                                value={strokeColor}
                                onChange={(e) => setStrokeColor(e.target.value)}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Grubość obwódki: {strokeWidth}px
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={5}
                            step={0.5}
                            value={strokeWidth}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl p-8 flex items-center justify-center min-h-[120px]">
                    <p
                        style={{
                            fontFamily,
                            fontSize: `${fontSize}px`,
                            color,
                            textShadow,
                            lineHeight: 1.2,
                            fontWeight: 500
                        }}
                        className="text-center"
                    >
                        To jest przykładowy tekst napisów.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={generateSample}
                        disabled={loading}
                        className="py-3 px-4 border-2 border-[#006575] text-[#006575] rounded-lg hover:bg-[#006575]/10 transition-all font-medium disabled:opacity-50"
                    >
                        {loading ? 'Generowanie próbki...' : 'Wygeneruj próbkę'}
                    </button>
                    <button
                        onClick={generateFinalVideo}
                        disabled={loading}
                        className="py-3 px-4 bg-[#006575] text-white rounded-lg hover:bg-[#004A55] transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading && (
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {loading ? 'Renderowanie filmu...' : 'Generuj film z napisami'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SubtitleEditor