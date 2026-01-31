"use client"

import { useState } from "react"
import Image from "next/image"

interface RecipientAvatarProps {
  picture?: string
  name: string
  size?: number
}

export function RecipientAvatar({ picture, name, size = 48 }: RecipientAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const initial = name.charAt(0).toUpperCase()

  if (picture && !imageError) {
    return (
      <div 
        className="relative shrink-0 overflow-hidden rounded-full border-2 border-amber-500"
        style={{ width: size, height: size }}
      >
        <Image
          src={picture || "/placeholder.svg"}
          alt={`${name}のアバター`}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      </div>
    )
  }

  return (
    <div 
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted text-lg font-medium text-muted-foreground"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${name}のアバター`}
    >
      {initial}
    </div>
  )
}
