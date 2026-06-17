'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

export default function Home() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div
      className="relative flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Subtle hidden menu — top right */}
      <div ref={menuRef} className="absolute right-5 top-5">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          className="text-[#3a3a3a] transition-colors duration-200 hover:text-[#666] text-base tracking-[0.25em] leading-none select-none"
        >
          •••
        </button>

        {open && (
          <div
            className="absolute right-0 mt-2 w-28 overflow-hidden rounded-lg shadow-xl"
            style={{
              backgroundColor: '#242424',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-gray-200"
            >
              Log in
            </Link>
          </div>
        )}
      </div>

      {/* Centred logo — large */}
      <div className="relative h-[70vh] w-[90vw] max-w-[1100px]">
        <Image
          src="/Coming Soon Logo.png"
          alt="Formula14"
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  )
}
