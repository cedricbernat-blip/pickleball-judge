import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let { imageBase64, imageMediaType } = req.body

    if (!imageBase64 || !imageMediaType) {
      return res.status(400).json({ error: 'Missing image data' })
    }

    // Force JPEG for unsupported formats (HEIC, etc.)
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!supportedTypes.includes(imageMediaType)) {
      imageMediaType = 'image/jpeg'
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType,
                data: imageBase64
              }
            },
            {
              type: "text",
              text: `You are an expert pickleball line judge with 20 years of experience. Your job is to determine if a ball is IN or OUT.

# OFFICIAL PICKLEBALL RULES
1. A ball is IN if any part of it touches a line (even by 1 millimeter)
2. A ball is OUT if it lands completely outside the lines
3. The playing court is bounded by: 2 baselines + 2 sidelines
4. The non-volley zone ("kitchen") is the area between the net and the line 7 feet from the net

# ANALYSIS METHOD
Follow these steps rigorously:
1. Image quality check (clear? whole court visible? lighting?)
2. Court identification (color, all visible lines, perspective)
3. Ball detection (find the GAME ball, ignore warm-up balls/logos/reflections)
4. Position analysis (where is the ball vs the lines? touching?)
5. Final verdict (IN / OUT / UNCLEAR)

# CONFIDENCE LEVEL
- 90-100%: very clear case
- 70-89%: clear with minor uncertainty
- 50-69%: limit case
- Below 50%: too uncertain, prefer UNCLEAR

# RESPONSE FORMAT
Respond ONLY with valid JSON in this EXACT format (no other text, no markdown):
{
  "verdict": "IN" or "OUT" or "UNCLEAR",
  "confidence": number from 0 to 100,
  "reasoning": {
    "image_quality": "good" or "average" or "poor",
    "ball_visible": true or false,
    "ball_location": "brief description of the ball's position",
    "nearest_line": "which line is closest to the ball",
    "touching_line": true or false
  },
  "explanation": "Clear explanation in 1-2 sentences for the user"
}`
            }
          ]
        }
      ]
    })

    const aiText = response.content[0].text
    const cleanedText = aiText.replace(/```json|```/g, '').trim()
    const parsedResult = JSON.parse(cleanedText)

    return res.status(200).json(parsedResult)

  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({
      error: error.message,
      verdict: 'ERROR',
      confidence: 0,
      explanation: 'Server error: ' + error.message
    })
  }
}