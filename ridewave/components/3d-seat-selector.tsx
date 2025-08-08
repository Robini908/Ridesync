'use client'

import React, { useMemo, useRef, useState, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF, Text, Environment, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useGesture } from 'use-gesture'
import { PermissionChecker, PERMISSIONS } from '@/lib/rbac'

// Types
interface SeatData {
  id: string
  number: number
  position: [number, number, number]
  status: 'available' | 'selected' | 'occupied' | 'blocked'
  isAccessible?: boolean
  type: 'regular' | 'premium' | 'emergency'
  priceMultiplier?: number
}

interface VehicleConfig {
  type: 'BUS' | 'MINIBUS' | 'SHUTTLE'
  rows: number
  seatsPerRow: number
  aisleWidth: number
  seatSpacing: number
  hasEmergencyExits?: boolean
}

interface Seat3DProps {
  seat: SeatData
  onSeatClick: (seat: SeatData) => void
  isHighlighted: boolean
  canSelect: boolean
}

// Optimized Seat Component with instanced rendering
const Seat3D: React.FC<Seat3DProps> = React.memo(({ seat, onSeatClick, isHighlighted, canSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const seatColor = useMemo(() => {
    if (!canSelect) return '#666666'
    switch (seat.status) {
      case 'available':
        return isHighlighted ? '#00ff88' : '#4CAF50'
      case 'selected':
        return '#2196F3'
      case 'occupied':
        return '#f44336'
      case 'blocked':
        return '#9E9E9E'
      default:
        return '#4CAF50'
    }
  }, [seat.status, isHighlighted, canSelect])

  const handleClick = useCallback((e: THREE.Event) => {
    e.stopPropagation()
    if (canSelect && (seat.status === 'available' || seat.status === 'selected')) {
      onSeatClick(seat)
    }
  }, [seat, onSeatClick, canSelect])

  // Optimized geometry - reuse across instances
  const seatGeometry = useMemo(() => {
    return new THREE.BoxGeometry(0.8, 0.9, 0.8)
  }, [])

  return (
    <group position={seat.position}>
      {/* Seat Base */}
      <mesh
        ref={meshRef}
        geometry={seatGeometry}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={seatColor}
          emissive={hovered ? seatColor : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
          metalness={0.1}
          roughness={0.7}
        />
      </mesh>

      {/* Seat Back */}
      <mesh position={[0, 0.3, -0.3]} castShadow>
        <boxGeometry args={[0.8, 0.6, 0.1]} />
        <meshStandardMaterial
          color={seatColor}
          metalness={0.1}
          roughness={0.7}
        />
      </mesh>

      {/* Premium Indicator */}
      {seat.type === 'premium' && (
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.2}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
        >
          PREMIUM
        </Text>
      )}

      {/* Accessibility Symbol */}
      {seat.isAccessible && (
        <Html position={[0, 0.8, 0]} center>
          <div className="text-blue-500 text-lg">♿</div>
        </Html>
      )}

      {/* Seat Number */}
      <Text
        position={[0, 0.1, 0.45]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {seat.number}
      </Text>
    </group>
  )
})

Seat3D.displayName = 'Seat3D'

// Vehicle Interior Component
const VehicleInterior: React.FC<{
  vehicleConfig: VehicleConfig
  seats: SeatData[]
  selectedSeats: string[]
  onSeatClick: (seat: SeatData) => void
  canSelectSeats: boolean
}> = ({ vehicleConfig, seats, selectedSeats, onSeatClick, canSelectSeats }) => {
  
  // Generate vehicle shell
  const vehicleShell = useMemo(() => {
    const width = Math.max(vehicleConfig.seatsPerRow * 0.9 + vehicleConfig.aisleWidth, 3)
    const length = vehicleConfig.rows * vehicleConfig.seatSpacing + 2
    const height = 2.5

    return { width, length, height }
  }, [vehicleConfig])

  return (
    <group>
      {/* Vehicle Floor */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[vehicleShell.width, 0.1, vehicleShell.length]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>

      {/* Vehicle Walls */}
      <mesh position={[-vehicleShell.width/2, vehicleShell.height/2, 0]} receiveShadow>
        <boxGeometry args={[0.1, vehicleShell.height, vehicleShell.length]} />
        <meshStandardMaterial color="#e0e0e0" transparent opacity={0.3} />
      </mesh>
      <mesh position={[vehicleShell.width/2, vehicleShell.height/2, 0]} receiveShadow>
        <boxGeometry args={[0.1, vehicleShell.height, vehicleShell.length]} />
        <meshStandardMaterial color="#e0e0e0" transparent opacity={0.3} />
      </mesh>

      {/* Vehicle Ceiling */}
      <mesh position={[0, vehicleShell.height, 0]} receiveShadow>
        <boxGeometry args={[vehicleShell.width, 0.1, vehicleShell.length]} />
        <meshStandardMaterial color="#f5f5f5" transparent opacity={0.7} />
      </mesh>

      {/* Aisle */}
      <mesh position={[0, -0.4, 0]} receiveShadow>
        <boxGeometry args={[vehicleConfig.aisleWidth, 0.02, vehicleShell.length]} />
        <meshStandardMaterial color="#2196F3" opacity={0.3} transparent />
      </mesh>

      {/* Render Seats */}
      {seats.map((seat) => (
        <Seat3D
          key={seat.id}
          seat={seat}
          onSeatClick={onSeatClick}
          isHighlighted={selectedSeats.includes(seat.id)}
          canSelect={canSelectSeats}
        />
      ))}
    </group>
  )
}

// Main 3D Seat Selector Component
interface Seat3DSelectorProps {
  vehicleId: string
  vehicleType: 'BUS' | 'MINIBUS' | 'SHUTTLE'
  totalSeats: number
  occupiedSeats: string[]
  selectedSeats: string[]
  onSeatSelect: (seatId: string) => void
  maxSeatsToSelect: number
  userPermissions: PermissionChecker
  pricePerSeat: number
  currency?: string
}

const Scene: React.FC<{
  vehicleConfig: VehicleConfig
  seats: SeatData[]
  selectedSeats: string[]
  onSeatClick: (seat: SeatData) => void
  canSelectSeats: boolean
}> = ({ vehicleConfig, seats, selectedSeats, onSeatClick, canSelectSeats }) => {
  const { camera } = useThree()

  // Auto-position camera for optimal viewing
  useEffect(() => {
    if (camera) {
      const vehicleLength = vehicleConfig.rows * vehicleConfig.seatSpacing + 2
      camera.position.set(0, 8, vehicleLength * 0.8)
      camera.lookAt(0, 0, 0)
    }
  }, [camera, vehicleConfig])

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 10]} fov={50} />
      <Environment preset="studio" />
      
      {/* Optimized lighting for performance */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      <VehicleInterior
        vehicleConfig={vehicleConfig}
        seats={seats}
        selectedSeats={selectedSeats}
        onSeatClick={onSeatClick}
        canSelectSeats={canSelectSeats}
      />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={20}
      />
    </>
  )
}

export const Seat3DSelector: React.FC<Seat3DSelectorProps> = ({
  vehicleId,
  vehicleType,
  totalSeats,
  occupiedSeats,
  selectedSeats,
  onSeatSelect,
  maxSeatsToSelect,
  userPermissions,
  pricePerSeat,
  currency = 'USD'
}) => {
  // Generate vehicle configuration based on type
  const vehicleConfig = useMemo((): VehicleConfig => {
    switch (vehicleType) {
      case 'BUS':
        return {
          type: 'BUS',
          rows: Math.ceil(totalSeats / 4),
          seatsPerRow: 4,
          aisleWidth: 1,
          seatSpacing: 1.2,
          hasEmergencyExits: true
        }
      case 'MINIBUS':
        return {
          type: 'MINIBUS',
          rows: Math.ceil(totalSeats / 3),
          seatsPerRow: 3,
          aisleWidth: 0.7,
          seatSpacing: 1,
          hasEmergencyExits: false
        }
      case 'SHUTTLE':
        return {
          type: 'SHUTTLE',
          rows: Math.ceil(totalSeats / 2),
          seatsPerRow: 2,
          aisleWidth: 0.8,
          seatSpacing: 1.1,
          hasEmergencyExits: false
        }
      default:
        return {
          type: 'BUS',
          rows: Math.ceil(totalSeats / 4),
          seatsPerRow: 4,
          aisleWidth: 1,
          seatSpacing: 1.2
        }
    }
  }, [vehicleType, totalSeats])

  // Generate seat layout
  const seats = useMemo((): SeatData[] => {
    const seatList: SeatData[] = []
    let seatNumber = 1

    for (let row = 0; row < vehicleConfig.rows; row++) {
      const zPos = (row - vehicleConfig.rows / 2) * vehicleConfig.seatSpacing

      // Left side seats
      const leftSeats = Math.floor(vehicleConfig.seatsPerRow / 2)
      for (let seat = 0; seat < leftSeats; seat++) {
        const xPos = -(vehicleConfig.aisleWidth / 2 + 0.5 + seat * 0.9)
        
        if (seatNumber <= totalSeats) {
          seatList.push({
            id: `seat-${seatNumber}`,
            number: seatNumber,
            position: [xPos, 0, zPos],
            status: occupiedSeats.includes(`seat-${seatNumber}`) ? 'occupied' :
                   selectedSeats.includes(`seat-${seatNumber}`) ? 'selected' : 'available',
            type: row < 2 ? 'premium' : 'regular',
            isAccessible: row === 0 && seat === 0, // First seat is accessible
            priceMultiplier: row < 2 ? 1.5 : 1
          })
          seatNumber++
        }
      }

      // Right side seats
      const rightSeats = Math.ceil(vehicleConfig.seatsPerRow / 2)
      for (let seat = 0; seat < rightSeats; seat++) {
        const xPos = vehicleConfig.aisleWidth / 2 + 0.5 + seat * 0.9
        
        if (seatNumber <= totalSeats) {
          seatList.push({
            id: `seat-${seatNumber}`,
            number: seatNumber,
            position: [xPos, 0, zPos],
            status: occupiedSeats.includes(`seat-${seatNumber}`) ? 'occupied' :
                   selectedSeats.includes(`seat-${seatNumber}`) ? 'selected' : 'available',
            type: row < 2 ? 'premium' : 'regular',
            priceMultiplier: row < 2 ? 1.5 : 1
          })
          seatNumber++
        }
      }
    }

    return seatList
  }, [vehicleConfig, totalSeats, occupiedSeats, selectedSeats])

  // Check if user can select seats
  const canSelectSeats = userPermissions.hasPermission(PERMISSIONS.BOOKING_CREATE)

  const handleSeatClick = useCallback((seat: SeatData) => {
    if (!canSelectSeats) return

    if (seat.status === 'selected') {
      // Deselect seat
      onSeatSelect(seat.id)
    } else if (seat.status === 'available') {
      // Select seat if under limit
      if (selectedSeats.length < maxSeatsToSelect) {
        onSeatSelect(seat.id)
      }
    }
  }, [canSelectSeats, selectedSeats.length, maxSeatsToSelect, onSeatSelect])

  // Calculate total price
  const totalPrice = useMemo(() => {
    return seats
      .filter(seat => selectedSeats.includes(seat.id))
      .reduce((total, seat) => total + (pricePerSeat * (seat.priceMultiplier || 1)), 0)
  }, [seats, selectedSeats, pricePerSeat])

  return (
    <div className="w-full h-full relative">
      {/* 3D Canvas */}
      <div className="w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
        <Canvas
          shadows
          gl={{ 
            antialias: true,
            powerPreference: "high-performance",
            alpha: false
          }}
          performance={{ min: 0.8 }}
        >
          <Suspense fallback={null}>
            <Scene
              vehicleConfig={vehicleConfig}
              seats={seats}
              selectedSeats={selectedSeats}
              onSeatClick={handleSeatClick}
              canSelectSeats={canSelectSeats}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Seat Selection Info */}
      <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Seat Selection</h3>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {selectedSeats.length} of {maxSeatsToSelect} selected
            </div>
            <div className="text-lg font-bold">
              {currency} {totalPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Premium (+50%)</span>
          </div>
        </div>

        {/* Selected Seats List */}
        {selectedSeats.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Selected Seats:</h4>
            <div className="flex flex-wrap gap-2">
              {seats
                .filter(seat => selectedSeats.includes(seat.id))
                .map(seat => (
                  <span
                    key={seat.id}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                  >
                    #{seat.number} {seat.type === 'premium' && '(Premium)'}
                  </span>
                ))}
            </div>
          </div>
        )}

        {!canSelectSeats && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            You don't have permission to select seats. Please contact support.
          </div>
        )}
      </div>
    </div>
  )
}

export default Seat3DSelector