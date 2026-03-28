"use client"

import { Auth0Provider } from "@auth0/auth0-react"
import { useEffect, useState } from "react"

export function Auth0ProviderWrapper({ children }: { children: React.ReactNode }) {
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  if (!origin) {
    return <>{children}</>
  }

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{ redirect_uri: origin }}
    >
      {children}
    </Auth0Provider>
  )
}
