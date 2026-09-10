import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Animated Counter component that animates numeric value with tabular numerals.
 * Respects prefers-reduced-motion.
 */
interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 0.8,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const shouldReduceMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? value : 0)

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value)
      return
    }

    let startTimestamp: number | null = null
    const startValue = 0
    const endValue = value

    if (endValue === 0) {
      setDisplayValue(0)
      return
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1)
      // Ease out quartic — elegant deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 4)
      const current = Math.floor(easedProgress * (endValue - startValue) + startValue)
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setDisplayValue(endValue)
      }
    }

    const animFrame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animFrame)
  }, [value, duration, shouldReduceMotion])

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

/**
 * Page transition wrapper that smoothly animates page mounting with subtle fade.
 * Zero aggressive bouncing.
 */
export function PageTransition({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Stagger container for animating lists sequentially on mount.
 */
export function StaggerContainer({
  children,
  staggerChildren = 0.04,
  delayChildren = 0.02,
  className = '',
}: {
  children: React.ReactNode
  staggerChildren?: number
  delayChildren?: number
  className?: string
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Stagger item child of StaggerContainer
 */
export function StaggerItem({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 6 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Interactive card with subtle lift and tactile press on click/tap
 */
export function MotionCard({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return (
      <div onClick={onClick} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  )
}
