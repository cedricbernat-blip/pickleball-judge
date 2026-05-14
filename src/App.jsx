import { useState } from 'react'

function App() {
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageMediaType, setImageMediaType] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const fullDataUrl = e.target.result
        setImage(fullDataUrl)
        const base64Data = fullDataUrl.split(',')[1]
        setImageBase64(base64Data)
        setImageMediaType(file.type)
        setResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetAnalysis = () => {
    setImage(null)
    setImageBase64(null)
    setImageMediaType(null)
    setResult(null)
  }

  const analyzeImage = async () => {
    if (!imageBase64) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64,
          imageMediaType
        })
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      console.error('Error:', error)
      setResult({
        verdict: 'ERROR',
        confidence: 0,
        explanation: 'Network error: ' + error.message,
        reasoning: null
      })
    } finally {
      setLoading(false)
    }
  }

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

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 90) return 'Very High'
    if (confidence >= 70) return 'High'
    if (confidence >= 50) return 'Medium'
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
        <p style={{ color: '#888', marginBottom: '25px', fontSize: '0.95em' }}>
          AI-powered line calls
        </p>

        {!image && (
          <div style={{
            border: '2px dashed #555',
            borderRadius: '15px',
            padding: '30px 20px',
            marginBottom: '20px'
          }}>
            <p style={{ marginBottom: '25px', color: '#bbb', fontSize: '1em' }}>
              Take a photo or upload one to analyze
            </p>

            <label style={{
              display: 'block',
              padding: '18px',
              backgroundColor: '#2196F3',
              color: 'white',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.2em',
              fontWeight: 'bold',
              marginBottom: '15px',
              userSelect: 'none'
            }}>
              📸 Take a photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>

            <label style={{
              display: 'block',
              padding: '18px',
              backgroundColor: '#555',
              color: 'white',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.2em',
              fontWeight: 'bold',
              userSelect: 'none'
            }}>
              🖼️ Choose from gallery
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}

        {image && (
          <div style={{
            borderRadius: '15px',
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#2a2a2a'
          }}>
            <img
              src={image}
              alt="Court"
              style={{
                maxWidth: '100%',
                borderRadius: '10px',
                marginBottom: '15px'
              }}
            />

            <button
              onClick={analyzeImage}
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '1.2em',
                fontWeight: 'bold',
                backgroundColor: loading ? '#666' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '10px'
              }}
            >
              {loading ? '🔄 Analyzing...' : '🔍 Analyze the ball'}
            </button>

            <button
              onClick={resetAnalysis}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1em',
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #555',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              🔄 New photo
            </button>
          </div>
        )}

        {result && (
          <div style={{
            padding: '20px',
            borderRadius: '15px',
            backgroundColor: getVerdictColor(result.verdict),
            textAlign: 'left',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '2.5em',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '15px'
            }}>
              {getVerdictEmoji(result.verdict)} {result.verdict}
            </div>

            <div style={{
              fontSize: '1.1em',
              marginBottom: '15px',
              textAlign: 'center',
              padding: '12px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '8px'
            }}>
              Confidence: <strong>{result.confidence}%</strong> ({getConfidenceLabel(result.confidence)})
            </div>

            <div style={{
              fontSize: '1em',
              color: '#fff',
              marginBottom: '15px',
              padding: '12px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              lineHeight: '1.5'
            }}>
              <strong>📝 Explanation:</strong><br />
              {result.explanation}
            </div>

            {result.reasoning && (
              <details style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '8px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '5px 0' }}>
                  🔬 Analysis details
                </summary>
                <div style={{ marginTop: '12px', fontSize: '0.95em', lineHeight: '1.7' }}>
                  <p style={{ margin: '5px 0' }}>📷 <strong>Image quality:</strong> {result.reasoning.image_quality}</p>
                  <p style={{ margin: '5px 0' }}>🏐 <strong>Ball visible:</strong> {result.reasoning.ball_visible ? 'Yes' : 'No'}</p>
                  <p style={{ margin: '5px 0' }}>📍 <strong>Location:</strong> {result.reasoning.ball_location}</p>
                  <p style={{ margin: '5px 0' }}>📏 <strong>Nearest line:</strong> {result.reasoning.nearest_line}</p>
                  <p style={{ margin: '5px 0' }}>✏️ <strong>Touching the line:</strong> {result.reasoning.touching_line ? 'Yes' : 'No'}</p>
                </div>
              </details>
            )}

            {result.confidence < 60 && result.verdict !== 'ERROR' && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                fontSize: '0.95em',
                lineHeight: '1.5'
              }}>
                💡 <strong>Tip:</strong> Confidence is low. Try a clearer photo with a better angle.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App