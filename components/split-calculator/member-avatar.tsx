"use client"

import { useState } from "react"
import Image from "next/image"
import type { Member } from "@/types/split-calculator"

interface MemberAvatarProps {
  member: Member
  size?: number
}

export function MemberAvatar({ member, size = 32 }: MemberAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const initials = member.name.slice(0, 2)

  if (member.nostrProfile?.picture && !imageError) {
    return (
      <div 
        className="relative shrink-0 overflow-hidden rounded-full border-2 border-border"
        style={{ width: size, height: size }}
      >
        <Image
          src={member.nostrProfile.picture || "/placeholder.svg"}
          alt={`${member.name}のアバター`}
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
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${member.name}のアバター`}
    >
      {initials}
    </div>
  )
}
