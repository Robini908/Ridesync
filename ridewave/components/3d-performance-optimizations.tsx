'use client'

import React, { useMemo, useRef, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Performance monitoring and optimization utilities
export class Performance3DMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 60
  private frameTimeThreshold = 16.67 // 60 FPS = 16.67ms per frame
  private onPerformanceAlert?: (fps: number) => void

  constructor(onPerformanceAlert?: (fps: number) => void) {
    this.onPerformanceAlert = onPerformanceAlert
  }

  update() {
    this.frameCount++
    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime

    if (deltaTime >= 1000) {
      this.fps = (this.frameCount * 1000) / deltaTime
      this.frameCount = 0
      this.lastTime = currentTime

      // Alert if performance drops below 30 FPS
      if (this.fps < 30 && this.onPerformanceAlert) {
        this.onPerformanceAlert(this.fps)
      }
    }

    return {
      fps: this.fps,
      frameTime: deltaTime,
      isPerformant: deltaTime <= this.frameTimeThreshold
    }
  }

  getFPS() {
    return this.fps
  }
}

// Optimized geometry pool for seat instances
export class GeometryPool {
  private static instance: GeometryPool
  private geometries: Map<string, THREE.BufferGeometry> = new Map()
  private materials: Map<string, THREE.Material> = new Map()

  static getInstance() {
    if (!GeometryPool.instance) {
      GeometryPool.instance = new GeometryPool()
    }
    return GeometryPool.instance
  }

  getSeatGeometry(): THREE.BufferGeometry {
    const key = 'seat-base'
    if (!this.geometries.has(key)) {
      const geometry = new THREE.BoxGeometry(0.8, 0.9, 0.8)
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      this.geometries.set(key, geometry)
    }
    return this.geometries.get(key)!
  }

  getSeatBackGeometry(): THREE.BufferGeometry {
    const key = 'seat-back'
    if (!this.geometries.has(key)) {
      const geometry = new THREE.BoxGeometry(0.8, 0.6, 0.1)
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      this.geometries.set(key, geometry)
    }
    return this.geometries.get(key)!
  }

  getMaterial(color: string, type: 'standard' | 'basic' = 'standard'): THREE.Material {
    const key = `${type}-${color}`
    if (!this.materials.has(key)) {
      let material: THREE.Material
      if (type === 'basic') {
        material = new THREE.MeshBasicMaterial({ 
          color,
          transparent: true,
          opacity: 0.9
        })
      } else {
        material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.1,
          roughness: 0.7,
          transparent: true,
          opacity: 0.9
        })
      }
      this.materials.set(key, material)
    }
    return this.materials.get(key)!
  }

  dispose() {
    this.geometries.forEach(geometry => geometry.dispose())
    this.materials.forEach(material => material.dispose())
    this.geometries.clear()
    this.materials.clear()
  }
}

// Level of Detail (LOD) manager for seats
export class SeatLODManager {
  private static readonly LOD_DISTANCES = [5, 15, 30]
  private static readonly LOD_GEOMETRIES = ['high', 'medium', 'low']

  static getLODLevel(distance: number): number {
    for (let i = 0; i < this.LOD_DISTANCES.length; i++) {
      if (distance < this.LOD_DISTANCES[i]) {
        return i
      }
    }
    return this.LOD_DISTANCES.length - 1
  }

  static shouldRenderDetails(distance: number): boolean {
    return distance < this.LOD_DISTANCES[1] // Show details only at close distance
  }

  static shouldUseLowPoly(distance: number): boolean {
    return distance > this.LOD_DISTANCES[0]
  }
}

// Frustum culling optimization
export const useFrustumCulling = () => {
  const { camera } = useThree()
  const frustum = useMemo(() => new THREE.Frustum(), [])
  const cameraMatrix = useMemo(() => new THREE.Matrix4(), [])

  const isInFrustum = useCallback((position: THREE.Vector3, radius = 1) => {
    cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(cameraMatrix)
    
    const sphere = new THREE.Sphere(position, radius)
    return frustum.intersectsSphere(sphere)
  }, [camera, frustum, cameraMatrix])

  return isInFrustum
}

// Performance monitoring hook
export const usePerformanceMonitor = (onPerformanceAlert?: (fps: number) => void) => {
  const monitor = useMemo(() => new Performance3DMonitor(onPerformanceAlert), [onPerformanceAlert])
  const performanceRef = useRef({ fps: 60, frameTime: 16.67, isPerformant: true })

  useFrame(() => {
    performanceRef.current = monitor.update()
  })

  return performanceRef.current
}

// Instanced rendering for identical objects
export const useInstancedSeats = (positions: THREE.Vector3[], colors: string[]) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geometryPool = GeometryPool.getInstance()

  const instancedData = useMemo(() => {
    const count = positions.length
    const matrix = new THREE.Matrix4()
    const colorAttribute = new Float32Array(count * 3)
    
    positions.forEach((position, index) => {
      matrix.setPosition(position)
      
      // Set color for this instance
      const color = new THREE.Color(colors[index] || '#4CAF50')
      colorAttribute[index * 3] = color.r
      colorAttribute[index * 3 + 1] = color.g
      colorAttribute[index * 3 + 2] = color.b
    })

    return { count, colorAttribute, matrix }
  }, [positions, colors])

  useEffect(() => {
    if (meshRef.current) {
      // Set instance matrices
      positions.forEach((position, index) => {
        const matrix = new THREE.Matrix4()
        matrix.setPosition(position)
        meshRef.current!.setMatrixAt(index, matrix)
      })
      
      meshRef.current.instanceMatrix.needsUpdate = true
      
      // Set instance colors
      meshRef.current.geometry.setAttribute(
        'color',
        new THREE.InstancedBufferAttribute(instancedData.colorAttribute, 3)
      )
    }
  }, [positions, colors, instancedData])

  return {
    meshRef,
    geometry: geometryPool.getSeatGeometry(),
    count: instancedData.count
  }
}

// Optimized seat component with LOD and frustum culling
interface OptimizedSeat3DProps {
  position: [number, number, number]
  color: string
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
  seatNumber: number
  cameraPosition: THREE.Vector3
}

export const OptimizedSeat3D: React.FC<OptimizedSeat3DProps> = React.memo(({
  position,
  color,
  isSelected,
  isHovered,
  onClick,
  seatNumber,
  cameraPosition
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometryPool = GeometryPool.getInstance()
  const isInFrustum = useFrustumCulling()

  // Calculate distance to camera
  const distance = useMemo(() => {
    const seatPos = new THREE.Vector3(...position)
    return seatPos.distanceTo(cameraPosition)
  }, [position, cameraPosition])

  // LOD level determination
  const lodLevel = SeatLODManager.getLODLevel(distance)
  const shouldRenderDetails = SeatLODManager.shouldRenderDetails(distance)
  const shouldUseLowPoly = SeatLODManager.shouldUseLowPoly(distance)

  // Frustum culling check
  const seatPosition = useMemo(() => new THREE.Vector3(...position), [position])
  const isVisible = isInFrustum(seatPosition, 1)

  // Don't render if outside frustum
  if (!isVisible) {
    return null
  }

  // Use basic material for distant seats
  const material = shouldUseLowPoly 
    ? geometryPool.getMaterial(color, 'basic')
    : geometryPool.getMaterial(color, 'standard')

  return (
    <group position={position}>
      {/* Seat Base */}
      <mesh
        ref={meshRef}
        geometry={geometryPool.getSeatGeometry()}
        material={material}
        onClick={onClick}
        castShadow={!shouldUseLowPoly}
        receiveShadow={!shouldUseLowPoly}
      />

      {/* Seat Back - only render at close distance */}
      {shouldRenderDetails && (
        <mesh 
          position={[0, 0.3, -0.3]}
          geometry={geometryPool.getSeatBackGeometry()}
          material={material}
          castShadow
        />
      )}

      {/* Seat Number - only render when very close */}
      {distance < 8 && (
        <mesh position={[0, 0.1, 0.45]}>
          {/* Simple text rendering for performance */}
          <planeGeometry args={[0.3, 0.2]} />
          <meshBasicMaterial 
            color="white" 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  )
})

OptimizedSeat3D.displayName = 'OptimizedSeat3D'

// Performance settings manager
export class Performance3DSettings {
  static settings = {
    enableShadows: true,
    maxShadowDistance: 15,
    enableAntialiasing: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    enableFrustumCulling: true,
    enableLOD: true,
    maxRenderDistance: 50,
    targetFPS: 60,
    enableInstancedRendering: true
  }

  static adjustForPerformance(fps: number) {
    if (fps < 30) {
      // Aggressive optimizations
      this.settings.enableShadows = false
      this.settings.enableAntialiasing = false
      this.settings.pixelRatio = 1
      this.settings.maxRenderDistance = 25
    } else if (fps < 45) {
      // Moderate optimizations
      this.settings.maxShadowDistance = 10
      this.settings.pixelRatio = Math.min(window.devicePixelRatio, 1.5)
      this.settings.maxRenderDistance = 35
    } else {
      // High quality settings
      this.settings.enableShadows = true
      this.settings.enableAntialiasing = true
      this.settings.pixelRatio = Math.min(window.devicePixelRatio, 2)
      this.settings.maxRenderDistance = 50
    }
  }

  static getOptimalSettings() {
    return { ...this.settings }
  }
}

// Batch processing for seat updates
export class SeatUpdateBatcher {
  private updateQueue: Array<{ id: string, updates: any }> = []
  private batchSize = 50
  private processingInterval?: NodeJS.Timeout

  constructor(batchSize = 50) {
    this.batchSize = batchSize
  }

  queueUpdate(id: string, updates: any) {
    this.updateQueue.push({ id, updates })
    
    if (!this.processingInterval) {
      this.processingInterval = setTimeout(() => {
        this.processBatch()
      }, 16) // Process at next frame
    }
  }

  private processBatch() {
    const batch = this.updateQueue.splice(0, this.batchSize)
    
    // Process batch updates
    batch.forEach(({ id, updates }) => {
      // Apply updates efficiently
      this.applyUpdates(id, updates)
    })

    if (this.updateQueue.length > 0) {
      this.processingInterval = setTimeout(() => {
        this.processBatch()
      }, 16)
    } else {
      this.processingInterval = undefined
    }
  }

  private applyUpdates(id: string, updates: any) {
    // Implementation depends on the update type
    // This would be connected to the seat rendering system
  }

  dispose() {
    if (this.processingInterval) {
      clearTimeout(this.processingInterval)
    }
    this.updateQueue = []
  }
}

// Memory management utilities
export const use3DMemoryManagement = () => {
  const geometryPool = GeometryPool.getInstance()

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      geometryPool.dispose()
    }
  }, [geometryPool])

  const cleanupUnusedResources = useCallback(() => {
    // Force garbage collection of unused Three.js objects
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }
  }, [])

  return { cleanupUnusedResources }
}

// All classes are already exported at their declaration