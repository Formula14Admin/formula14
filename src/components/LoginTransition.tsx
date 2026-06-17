'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginTransition() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2100)
    return () => clearTimeout(t)
  }, [router])

  return (
    <>
      <style>{`
        @keyframes logoReveal {
          0% {
            transform: perspective(900px) scale(0.06) rotateY(0deg);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          65% {
            transform: perspective(900px) scale(1) rotateY(540deg);
            opacity: 1;
          }
          80% {
            transform: perspective(900px) scale(1.06) rotateY(555deg);
            opacity: 1;
          }
          100% {
            transform: perspective(900px) scale(4.5) rotateY(570deg);
            opacity: 0;
          }
        }
        .logo-reveal {
          animation: logoReveal 2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#1a1a1a', zIndex: 9999 }}
      >
        <div className="logo-reveal relative h-[70vh] w-[90vw] max-w-[1100px]">
          <Image
            src="/Secondary Logo.png"
            alt="Formula14"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
    </>
  )
}
