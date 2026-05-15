export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb'
    }
  }
}

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { frames } = req.body

    if (!frames || frames.length === 0) {
      return res.status(400).json({ error: 'No frames provided' })
    }

    // Build content with all frames
    const content = []

    frames.forEach((frame, index) => {
      content.push({
        type: 'text',
        text: `Frame ${index + 1} of ${frames.length}:`
      })
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: frame
        }
      })
    })

    content.push({
      type: 'text',
      text: `You are an expert pickleball line judge. These frames were captured around a bounce moment.

Find the frame where the ball is closest to or touching the ground (the bounce frame).
Then determine if the ball is IN or OUT based on that frame.

PICKLEBALL RULES:
- Ball touching ANY line = IN
- Ball completely outside all lines = OUT
- Court boundaries: 2 baselines + 2 sidelines

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "bestFrameIndex": 0,
  "verdict": "IN" or "OUT" or "UNCLEAR",
  "confidence": 85,
  "reasoning": {
    "image_quality": "good",
    "ball_visible": true,
    "ball_location": "near right sideline",
    "nearest_line": "right sideline",
    "touching_line": false
  },
  "explanation": "The ball landed clearly outside the right sideline."
}`
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content }]
    })

    const aiText = response.content[0].text
    const cleanedText = aiText.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleanedText)

    return res.status(200).json(result)

  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({
      verdict: 'ERROR',
      confidence: 0,
      explanation: 'Server error: ' + error.message,
      reasoning: null
    })
  }
}