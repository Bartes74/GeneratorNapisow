import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import VideoUploadSection from './components/VideoUploadSection'
import SubtitleEditor from './components/SubtitleEditor'

function App() {
    const [darkMode, setDarkMode] = useState(false)
    const [transcriptionDone, setTranscriptionDone] = useState(false)
    const [videoData, setVideoData] = useState(null)
    const [transcriptionData, setTranscriptionData] = useState(null)
    const [subtitleStyles, setSubtitleStyles] = useState({
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2
    })

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
        if (!darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const handleVideoUpload = (data) => {
        setVideoData(data)
    }

    const handleTranscriptionComplete = () => {
        setTranscriptionDone(true)
    }

    const handleReset = () => {
        setTranscriptionDone(false)
        setVideoData(null)
        setTranscriptionData(null)
    }

    const handleSubtitleComplete = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/render-final/${videoData.video_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subtitle_styles: subtitleStyles })
            })
            if (response.ok) {
                window.open(`http://localhost:8000/api/download/video/${videoData.video_id}`, '_blank')
            }
        } catch (err) {
            alert('Błąd podczas renderowania filmu')
        }
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
                {/* Navbar */}
                <nav className="bg-gradient-to-r from-[#006575] to-[#004A55] shadow-xl">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <h1
                                className="text-xl font-semibold text-white tracking-tight cursor-pointer"
                                onClick={handleReset}
                            >
                                Generator napisów
                            </h1>
                            <button
                                onClick={toggleDarkMode}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
                            >
                                {darkMode ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-white" />}
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                    {!transcriptionDone && (
                        <VideoUploadSection
                            onVideoUpload={handleVideoUpload}
                            onTranscriptionComplete={handleTranscriptionComplete}
                        />
                    )}

                    {transcriptionDone && videoData && (
                        <>
                            {/* Sekcja pobierania napisów */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Transkrypcja ukończona</h3>
                                <button
                                    onClick={() => window.open(`http://localhost:8000/api/download/srt/${videoData.video_id}`, '_blank')}
                                    className="w-full py-3 bg-[#006575] text-white rounded-lg hover:bg-[#004A55] transition-all duration-200 font-medium"
                                >
                                    Pobierz plik napisów
                                </button>
                            </div>

                            {/* Sekcja edycji napisów */}
                            <SubtitleEditor
                                videoId={videoData.video_id}
                                subtitleStyles={subtitleStyles}
                                onStylesChange={setSubtitleStyles}
                                onComplete={handleSubtitleComplete}
                            />

                            <div className="text-center">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                                >
                                    Zacznij od nowa
                                </button>
                            </div>
                        </>
                    )}
                </main>

                {/* Footer */}
                 <footer className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 mt-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 bg-gradient-to-r from-[#e81cff] to-[#40c9ff] rounded-full animate-pulse"></span>
                                Vibe coded by 
                                <span className="font-semibold bg-gradient-to-r from-[#006575] to-[#99CC01] bg-clip-text text-transparent">
                                    Innovation LAB
                                </span>
                                <span className="text-gray-500 dark:text-gray-500">•</span>
                                <span className="font-medium">2025 r.</span>
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}

export default App