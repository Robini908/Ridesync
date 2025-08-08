import { NextRequest, NextResponse } from 'next/server'
import { grokChat } from '@/lib/ai'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    const { messages, userId: clientUserId } = await req.json()

    // Get user context for personalized responses
    let userContext = ''
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { externalId: userId },
        include: {
          bookings: {
            include: {
              trip: {
                include: {
                  route: true,
                  operator: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })

      if (user) {
        userContext = `
User Context:
- Name: ${user.firstName} ${user.lastName}
- Email: ${user.email}
- Total trips: ${user.totalTrips}
- Loyalty points: ${user.loyaltyPoints}
- Recent bookings: ${user.bookings.map(b => 
          `${b.trip.route.fromCity} → ${b.trip.route.toCity} on ${b.trip.departureDate} (${b.status})`
        ).join(', ')}
        `
      }
    }

    // System prompt for RideBot
    const systemPrompt = `You are RideBot, an AI travel assistant for RideWave, a premium vehicle booking platform for buses, minibuses, and shuttles. You are helpful, friendly, and knowledgeable about travel, transportation, and the RideWave platform.

${userContext}

Key Information about RideWave:
- We offer booking for buses, minibuses, and shuttles globally
- We have a loyalty program with Bronze, Silver, Gold, and Platinum tiers
- Users earn 10 points per $1 spent
- We support multiple payment methods including Stripe, PayPal, and M-Pesa
- We offer real-time tracking, AI recommendations, and 24/7 support
- Our platform features a dark theme with golden (#FFD700) and blue (#1E3A8A) accents

Your capabilities:
1. Help users find and book trips
2. Provide information about existing bookings
3. Explain policies, refunds, and cancellations
4. Give travel recommendations and tips
5. Answer questions about the loyalty program
6. Provide general customer support

Guidelines:
- Be conversational and helpful
- Use emojis occasionally to be friendly
- Keep responses concise but informative
- If you need to perform actions (like booking), explain that they need to use the website interface
- For complex issues, suggest contacting human support
- Always prioritize user safety and satisfaction

Respond naturally and helpfully to user queries. If appropriate, suggest 2-3 quick action suggestions at the end of your response.`

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    const response = await grokChat(chatMessages)
    
    if (!response?.choices?.[0]?.message?.content) {
      throw new Error('No response from AI')
    }

    let aiResponse = response.choices[0].message.content
    let suggestions: string[] = []

    // Extract suggestions if the AI provided them
    const suggestionMatch = aiResponse.match(/SUGGESTIONS?:\s*(.*?)$/im)
    if (suggestionMatch) {
      suggestions = suggestionMatch[1].split(',').map((s: string) => s.trim()).slice(0, 3)
      aiResponse = aiResponse.replace(/SUGGESTIONS?:\s*.*$/im, '').trim()
    }

    // Generate context-aware suggestions based on the conversation
    if (suggestions.length === 0) {
      const lastUserMessage = messages[messages.length - 1]?.content.toLowerCase() || ''
      
      if (lastUserMessage.includes('book') || lastUserMessage.includes('trip') || lastUserMessage.includes('travel')) {
        suggestions = ['Search for trips', 'View popular routes', 'Check travel tips']
      } else if (lastUserMessage.includes('cancel') || lastUserMessage.includes('refund')) {
        suggestions = ['View cancellation policy', 'Contact support', 'Check my bookings']
      } else if (lastUserMessage.includes('loyalty') || lastUserMessage.includes('points')) {
        suggestions = ['Check my points', 'View rewards', 'Learn about tiers']
      } else {
        suggestions = ['Find trips', 'My bookings', 'Help center']
      }
    }

    return NextResponse.json({
      success: true,
      message: aiResponse,
      suggestions: suggestions.filter(s => s.length > 0)
    })

  } catch (error) {
    console.error('AI Chat error:', error)
    
    // Fallback response for when AI is unavailable
    const fallbackResponse = {
      success: true,
      message: "I'm currently experiencing some technical difficulties. However, I'm here to help! You can:\n\n• Use the search page to find trips\n• Check your bookings in the dashboard\n• Contact our support team for immediate assistance\n\nIs there something specific I can help you with? 🚍",
      suggestions: ['Search trips', 'My dashboard', 'Contact support']
    }

    return NextResponse.json(fallbackResponse)
  }
}

export async function GET(req: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    status: 'online',
    service: 'RideBot AI Chat',
    timestamp: new Date().toISOString()
  })
}