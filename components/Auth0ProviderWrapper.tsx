"use client"

import { Auth0Provider } from "@auth0/auth0-react"
import { appOrigin, auth0ClientId, auth0Domain } from "@/lib/auth0-public"

export function Auth0ProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{ redirect_uri: appOrigin }}
    >
      {children}
    </Auth0Provider>
  )
}
