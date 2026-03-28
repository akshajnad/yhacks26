"use client"

import { Auth0Provider } from "@auth0/auth0-react"
import { auth0ClientId, auth0Domain, auth0RedirectUri } from "@/lib/auth0-public"

export function Auth0ProviderWrapper({ children }: { children: React.ReactNode }) {
  if (!auth0Domain || !auth0ClientId) {
    return <>{children}</>
  }

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{ redirect_uri: auth0RedirectUri }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0Provider>
  )
}
