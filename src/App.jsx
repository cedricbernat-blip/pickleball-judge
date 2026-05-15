import { useState, useRef, useEffect } from 'react'

function App() {
  const [mode, setMode] = useState('standby')
  const [frames, setFrames] = useState([])
  const [bestFrame, setBestFrame] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const captureBufferRef = useRef([])
  const captureIntervalRef = useRef(null)

  // Continuously capture frames while camera is active
  const startFrameCapture = () => {
    captureBufferRef.current = []
    captureIntervalRef.current = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const canvas = document.createElement('canvas')
        const maxSize = 640
        let width = videoRef.current.videoWidth
        let height = videoRef.current.videoHeight

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(videoRef.current, 0, 0, width, height)

        const frameData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]

        // Keep rolling buffer of last 45 frames (1.5 seconds at ~30fps)
        captureBufferRef.current.push({
          data: frameData,
          timestamp: Date.now()
        })

        // Keep only last 90 frames (3 seconds)
        if (captureBufferRef.current.length > 90) {
          captureBufferRef.current.shift()
        }
      }
    }, 100) // Capture every 100ms = ~10fps
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        // Force display on iOS
videoRef.current.setAttribute('playsinline', true)
videoRef.current.setAttribute('webkit-playsinline', true)
await videoRef.current.play()
      }
      setMode('watching')
      startFrameCapture()
    } catch (error) {
      alert('Cannot access camera: ' + error.message)
    }
  }

  const stopCamera = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setMode('standby')
    setRecordingTime(0)
  }

  const handleBounceButton = () => {
    // Grab frames from buffer: 1.5s before to now
    const now = Date.now()
    const windowMs = 3000 // 3 seconds total window
    
    const relevantFrames = captureBufferRef.current
      .filter(f => now - f.timestamp <= windowMs)
      .map(f => f.data)

    if (relevantFrames.length === 0) {
      alert('No frames captured yet. Wait a moment after starting the camera.')
      return
    }

    // Take max 12 evenly spaced frames
    const maxFrames = 12
    const step = Math.max(1, Math.floor(relevantFrames.length / maxFrames))
    const selectedFrames = relevantFrames.filter((_, i) => i % step === 0).slice(0, maxFrames)

    setFrames(selectedFrames)
    analyzeFrames(selectedFrames)
  }

  const analyzeFrames = async (framesToAnalyze) => {
    setLoading(true)
    setLoadingMessage('Analyzing bounce...')
    setResult(null)
    setBestFrame(null)

    try {
      const response = await fetch('/api/analyze-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames: framesToAnalyze })
      })

      const data = await response.json()

      // Show best frame
      if (data.bestFrameIndex !== undefined && framesToAnalyze[data.bestFrameIndex]) {
        setBestFrame('data:image/jpeg;base64,' + framesToAnalyze[data.bestFrameIndex])
      }

      setResult(data)
    } catch (error) {
      setResult({
        verdict: 'ERROR',
        confidence: 0,
        explanation: 'Error: ' + error.message,
        reasoning: null
      })
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  const resetAnalysis = () => {
    setResult(null)
    setBestFrame(null)
    setFrames([])
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const getVerdictColor = (verdict) => {
    if (verdict === 'IN') return '#1b5e20'
    if (verdict === 'OUT') return '#b71c1c'
    if (verdict === 'UNCLEAR') return '#f57c00'
    return '#424242'
  }

  const getVerdictEmoji = (verdict) => {
    if (verdict === 'IN') return '✅'
    if (verdict === 'OUT') return '❌'
    if (verdict === 'UNCLEAR') return '❓'
    return '⚠️'
  }

  const getConfidenceLabel = (c) => {
    if (c >= 90) return 'Very High'
    if (c >= 70) return 'High'
    if (c >= 50) return 'Medium'
    return 'Low'
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '15px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>

        <h1 style={{ fontSize: '2em', marginBottom: '5px', marginTop: '10px' }}>
          🏓 Pickleball Judge
        </h1>
        <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.9em' }}>
          AI-powered line calls
        </p>

        {/* STANDBY MODE */}
        {mode === 'standby' && (
          <div style={{
            border: '2px dashed #555',
            borderRadius: '15px',
            padding: '40px 20px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>📱</div>
            <p style={{ color: '#bbb', marginBottom: '10px', fontSize: '1.1em' }}>
              Mount your phone on a tripod behind the baseline
            </p>
            <p style={{ color: '#666', marginBottom: '30px', fontSize: '0.85em' }}>
              Point the camera to cover your half of the court
            </p>
            <button
              onClick={startCamera}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '1.3em',
                fontWeight: 'bold',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              🎥 Start Watching
            </button>
          </div>
        )}

        {/* WATCHING MODE */}
        {mode === 'watching' && (
          <div style={{ marginBottom: '20px' }}>
            {/* Live camera feed */}
            <div style={{
              position: 'relative',
              borderRadius: '15px',
              overflow: 'hidden',
              marginBottom: '15px',
              backgroundColor: '#000'
            }}>
              <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  controls={false}
  style={{
    width: '100%',
    display: 'block',
    borderRadius: '15px',
    transform: 'scaleX(1)'
  }}
/>
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: 'rgba(255,0,0,0.8)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.8em',
                fontWeight: 'bold'
              }}>
                🔴 LIVE
              </div>
            </div>

            {/* BOUNCE button - big and easy to tap */}
            <button
              onClick={handleBounceButton}
              style={{
                width: '100%',
                padding: '25px',
                fontSize: '1.5em',
                fontWeight: 'bold',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                marginBottom: '12px',
                letterSpacing: '2px'
              }}
            >
              🎾 BOUNCE !
            </button>

            <button
              onClick={stopCamera}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1em',
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #555',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              ⏹ Stop camera
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{
            padding: '30px',
            backgroundColor: '#2a2a2a',
            borderRadius: '15px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>🔄</div>
            <p style={{ color: '#bbb' }}>{loadingMessage || 'Analyzing...'}</p>
          </div>
        )}

        {/* BEST FRAME + RESULT */}
        {bestFrame && !loading && (
          <div style={{
            backgroundColor: '#2a2a2a',
            borderRadius: '15px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <p style={{ color: '#888', fontSize: '0.85em', marginBottom: '8px' }}>
              🎯 Best frame at bounce
            </p>
            <img
              src={bestFrame}
              alt="Bounce frame"
              style={{ maxWidth: '100%', borderRadius: '10px' }}
            />
          </div>
        )}

        {result && !loading && (
          <div style={{
            padding: '20px',
            borderRadius: '15px',
            backgroundColor: getVerdictColor(result.verdict),
            textAlign: 'left',
            marginBottom: '15px'
          }}>
            <div style={{
              fontSize: '2.5em', fontWeight: 'bold',
              textAlign: 'center', marginBottom: '15px'
            }}>
              {getVerdictEmoji(result.verdict)} {result.verdict}
            </div>

            <div style={{
              fontSize: '1.1em', marginBottom: '15px', textAlign: 'center',
              padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px'
            }}>
              Confidence: <strong>{result.confidence}%</strong> ({getConfidenceLabel(result.confidence)})
            </div>

            <div style={{
              fontSize: '1em', color: '#fff', marginBottom: '15px',
              padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '8px', lineHeight: '1.5'
            }}>
              <strong>📝 Explanation:</strong><br />{result.explanation}
            </div>

            {result.reasoning && (
              <details style={{
                padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '5px 0' }}>
                  🔬 Analysis details
                </summary>
                <div style={{ marginTop: '12px', fontSize: '0.95em', lineHeight: '1.7' }}>
                  <p style={{ margin: '5px 0' }}>📷 <strong>Image quality:</strong> {result.reasoning.image_quality}</p>
                  <p style={{ margin: '5px 0' }}>🏐 <strong>Ball visible:</strong> {result.reasoning.ball_visible ? 'Yes' : 'No'}</p>
                  <p style={{ margin: '5px 0' }}>📍 <strong>Location:</strong> {result.reasoning.ball_location}</p>
                  <p style={{ margin: '5px 0' }}>📏 <strong>Nearest line:</strong> {result.reasoning.nearest_line}</p>
                  <p style={{ margin: '5px 0' }}>✏️ <strong>Touching line:</strong> {result.reasoning.touching_line ? 'Yes' : 'No'}</p>
                </div>
              </details>
            )}

            {result.confidence < 60 && result.verdict !== 'ERROR' && (
              <div style={{
                marginTop: '15px', padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: '8px', fontSize: '0.95em'
              }}>
                💡 <strong>Tip:</strong> Low confidence. Try a higher camera position.
              </div>
            )}

            <button
              onClick={resetAnalysis}
              style={{
                width: '100%', marginTop: '15px', padding: '14px',
                fontSize: '1em', backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px', cursor: 'pointer'
              }}
            >
              🔄 Continue watching
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default App