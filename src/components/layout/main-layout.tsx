"use client"

import { ReactNode } from "react"
import Navbar from "./navbar"

interface MainLayoutProps {
  children: ReactNode
  user?: {
    name: string
    email: string
    role: string
  } | null
}

export default function MainLayout({ children, user }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}