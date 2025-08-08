"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, X, Send, Bot, User, 
  MapPin, Calendar, Clock, DollarSign,
  Minimize2, Maximize2, Star, Phone
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: string[]
  tripData?: any
}

interface ChatbotProps {
  className?: string
  isOpen?: boolean
  onToggle?: () => void
}

export function AIChatbot({ className, isOpen: controlledIsOpen, onToggle }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! I\'m your RideWave AI assistant. I can help you find trips, answer questions about bookings, and provide travel recommendations. How can I assist you today?',
      timestamp: new Date(),
      suggestions: [
        'Find trips to Mombasa',
        'Check my bookings',
        'Best time to travel',
        'Payment options'
      ]
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationContext, setConversationContext] = useState<any>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const generateResponse = async (userMessage: string): Promise<Message> => {
    // Simulate AI processing delay
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    setIsTyping(false)

    const lowerMessage = userMessage.toLowerCase()
    let response = ''
    let suggestions: string[] = []
    let tripData: any = null

    // Intent recognition and response generation
    if (lowerMessage.includes('trip') || lowerMessage.includes('travel') || lowerMessage.includes('book')) {
      if (lowerMessage.includes('find') || lowerMessage.includes('search')) {
        // Extract destination if mentioned
        const cities = ['mombasa', 'nairobi', 'kisumu', 'nakuru', 'eldoret', 'thika', 'malindi']
        const mentionedCity = cities.find(city => lowerMessage.includes(city))
        
        if (mentionedCity) {
          response = `I found several trips to ${mentionedCity.charAt(0).toUpperCase() + mentionedCity.slice(1)}! Here are some options:`
          tripData = [
            {
              id: '1',
              route: `Nairobi → ${mentionedCity.charAt(0).toUpperCase() + mentionedCity.slice(1)}`,
              time: '08:00 AM',
              price: '$45',
              duration: '6h 30m',
              operator: 'SafariLink Express',
              rating: 4.8,
              seats: 12
            },
            {
              id: '2',
              route: `Nairobi → ${mentionedCity.charAt(0).toUpperCase() + mentionedCity.slice(1)}`,
              time: '02:00 PM',
              price: '$42',
              duration: '7h 15m',
              operator: 'Coastal Travels',
              rating: 4.6,
              seats: 8
            }
          ]
          suggestions = [
            'Book the 8 AM trip',
            'Show more departure times',
            'Check seat availability',
            'Compare operators'
          ]
        } else {
          response = 'I\'d be happy to help you find trips! Which city would you like to travel to? I can show you options for destinations like Mombasa, Kisumu, Nakuru, and more.'
          suggestions = [
            'Trips to Mombasa',
            'Trips to Kisumu',
            'Trips to Nakuru',
            'Show all destinations'
          ]
        }
      } else if (lowerMessage.includes('book') || lowerMessage.includes('reserve')) {
        response = 'To help you book a trip, I\'ll need a few details:\n\n1. Where would you like to travel?\n2. What date are you planning to travel?\n3. How many passengers?\n\nYou can also use our search page to find and book trips directly!'
        suggestions = [
          'Search trips now',
          'Nairobi to Mombasa',
          'Tomorrow\'s trips',
          'Weekend travel'
        ]
      }
    } else if (lowerMessage.includes('booking') || lowerMessage.includes('reservation')) {
      if (lowerMessage.includes('check') || lowerMessage.includes('my') || lowerMessage.includes('status')) {
        response = 'I can help you check your bookings! To view your booking history and current reservations, please visit your account dashboard or provide your confirmation code.'
        suggestions = [
          'View my bookings',
          'Find by confirmation code',
          'Cancel a booking',
          'Modify my trip'
        ]
      } else if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) {
        response = 'For booking cancellations:\n\n• Free cancellation up to 24 hours before departure\n• 50% refund for cancellations 12-24 hours before\n• No refund for cancellations less than 12 hours before\n\nWould you like me to help you cancel a specific booking?'
        suggestions = [
          'Cancel my booking',
          'Check cancellation policy',
          'Request refund',
          'Modify instead of cancel'
        ]
      }
    } else if (lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
      response = 'RideWave accepts multiple payment methods:\n\n💳 Credit/Debit Cards (Visa, Mastercard, Amex)\n📱 M-Pesa (for Kenyan customers)\n💰 Mobile Money\n🔒 All payments are secured with SSL encryption\n\nWhich payment method would you prefer?'
      suggestions = [
        'Pay with M-Pesa',
        'Use credit card',
        'Payment security info',
        'Billing questions'
      ]
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('fare')) {
      response = 'Trip prices vary based on:\n\n📍 Route distance\n🕐 Departure time (peak vs off-peak)\n🚌 Vehicle type and amenities\n📅 Booking advance (early booking discounts)\n⭐ Operator service level\n\nFor exact pricing, please search for your specific route and date.'
      suggestions = [
        'Search trip prices',
        'Compare operators',
        'Early booking discounts',
        'Price alerts'
      ]
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('time') || lowerMessage.includes('departure')) {
      response = 'Our buses run throughout the day with departures typically:\n\n🌅 Early Morning: 6:00 AM - 9:00 AM\n🌞 Morning: 9:00 AM - 12:00 PM\n🌤️ Afternoon: 12:00 PM - 6:00 PM\n🌆 Evening: 6:00 PM - 10:00 PM\n\nExact schedules depend on the route. Which route are you interested in?'
      suggestions = [
        'Nairobi departures',
        'Mombasa schedule',
        'Weekend timetables',
        'Night bus options'
      ]
    } else if (lowerMessage.includes('operator') || lowerMessage.includes('company')) {
      response = 'We partner with top-rated operators including:\n\n🏆 SafariLink Express (4.8★)\n🚌 Coastal Travels (4.6★)\n⭐ Modern Shuttle (4.7★)\n🛣️ Highway Express (4.5★)\n\nAll operators are verified for safety, punctuality, and customer service.'
      suggestions = [
        'Compare operators',
        'Operator ratings',
        'Safety standards',
        'Fleet information'
      ]
    } else if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('contact')) {
      response = 'I\'m here to help! You can also reach our support team:\n\n📞 Phone: +254 700 123 456\n📧 Email: support@ridewave.com\n💬 Live Chat: Available 24/7\n🕐 Response time: Usually under 1 hour\n\nWhat specific help do you need?'
      suggestions = [
        'Technical issues',
        'Booking problems',
        'Payment issues',
        'General inquiries'
      ]
    } else if (lowerMessage.includes('safety') || lowerMessage.includes('covid') || lowerMessage.includes('health')) {
      response = 'Your safety is our priority:\n\n😷 Regular vehicle sanitization\n🧴 Hand sanitizer provided\n🌡️ Health screenings for drivers\n🪟 Improved ventilation systems\n🎫 Contactless booking and payments\n\nAll operators follow strict safety protocols.'
      suggestions = [
        'Safety measures',
        'Vehicle cleanliness',
        'Driver health checks',
        'Passenger guidelines'
      ]
    } else if (lowerMessage.includes('destination') || lowerMessage.includes('where') || lowerMessage.includes('city')) {
      response = 'We connect major cities across Kenya:\n\n🏙️ **Major Routes:**\n• Nairobi ↔ Mombasa\n• Nairobi ↔ Kisumu\n• Nairobi ↔ Nakuru\n• Mombasa ↔ Malindi\n• Nairobi ↔ Eldoret\n\nAnd many more destinations! Where would you like to go?'
      suggestions = [
        'Popular routes',
        'Coastal destinations',
        'Upcountry travel',
        'Cross-country trips'
      ]
    } else if (lowerMessage.includes('discount') || lowerMessage.includes('promotion') || lowerMessage.includes('offer')) {
      response = 'Current offers and discounts:\n\n🎉 Early Bird: 15% off bookings 7+ days ahead\n👥 Group Discount: 10% off for 4+ passengers\n🔄 Return Trip: 20% off round-trip bookings\n🎂 Birthday Special: 25% off during your birthday month\n\nPromo codes are applied automatically at checkout!'
      suggestions = [
        'Apply promo code',
        'Group booking discount',
        'Student discounts',
        'Loyalty program'
      ]
    } else {
      // General/greeting responses
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        response = 'Hello! Welcome to RideWave. I\'m here to help make your travel planning easy and convenient. What can I assist you with today?'
      } else if (lowerMessage.includes('thank')) {
        response = 'You\'re very welcome! I\'m glad I could help. Is there anything else you\'d like to know about your travel plans?'
      } else {
        response = 'I understand you\'re looking for information. I can help you with:\n\n🔍 Finding and booking trips\n📋 Managing your bookings\n💳 Payment options\n📞 Customer support\n🛡️ Safety information\n\nWhat would you like to know more about?'
      }
      
      suggestions = [
        'Find trips',
        'Check bookings',
        'Payment options',
        'Contact support'
      ]
    }

    // Update conversation context
    setConversationContext((prev: any) => ({
      ...prev,
      lastIntent: lowerMessage.includes('trip') ? 'trip_search' : 
                  lowerMessage.includes('booking') ? 'booking_management' :
                  lowerMessage.includes('payment') ? 'payment_info' : 'general',
      mentionedDestination: response.includes('Mombasa') ? 'mombasa' : 
                           response.includes('Kisumu') ? 'kisumu' : null
    }))

    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: response,
      timestamp: new Date(),
      suggestions,
      tripData
    }
  }

  const handleSend = async (message?: string) => {
    const messageToSend = message || inputValue.trim()
    if (!messageToSend) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Generate and add AI response
    const assistantMessage = await generateResponse(messageToSend)
    setMessages(prev => [...prev, assistantMessage])
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => (onToggle ? onToggle() : setIsOpen(true))}
        className={`fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 bg-[#FFD700] hover:bg-[#FFD700]/90 text-black shadow-lg ${className}`}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className={`fixed bottom-4 right-4 z-50 w-96 shadow-2xl border-zinc-700 bg-zinc-900 ${isMinimized ? 'h-16' : 'h-[600px]'} ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-zinc-800 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-white">
          <Bot className="h-5 w-5 text-[#FFD700]" />
          <span className="text-sm font-medium">RideWave Assistant</span>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (onToggle ? onToggle() : setIsOpen(false))}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(600px-60px)]">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-[#FFD700] text-black' 
                      : 'bg-zinc-800 text-white'
                  }`}>
                    <div className="flex items-start gap-2 mb-2">
                      {message.type === 'assistant' ? (
                        <Bot className="h-4 w-4 text-[#FFD700] mt-0.5 flex-shrink-0" />
                      ) : (
                        <User className="h-4 w-4 text-zinc-700 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <span className={`text-xs ${message.type === 'user' ? 'text-zinc-700' : 'text-zinc-400'} mt-1 block`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Trip Data Cards */}
                    {message.tripData && (
                      <div className="space-y-2 mt-3">
                        {message.tripData.map((trip: any) => (
                          <div key={trip.id} className="bg-zinc-700 rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{trip.route}</span>
                              <span className="text-[#FFD700] font-bold">{trip.price}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-300">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {trip.time}
                              </span>
                              <span>{trip.duration}</span>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-[#FFD700]" />
                                {trip.rating}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-zinc-400">{trip.operator}</span>
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                {trip.seats} seats left
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs h-7 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-[#FFD700]" />
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-zinc-700 p-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about trips, bookings, or travel info..."
                className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                disabled={isTyping}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-zinc-500 mt-2 text-center">
              Powered by AI • Available 24/7
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}