export interface oauth_tokens {
    access_token: string
    token_type: string
    scope: string
    expires: number
    refresh_token: string
}

export function isOAuthToken(obj: any): boolean {
    return typeof obj.refresh_token === "string" &&
           typeof obj.access_token  === "string" &&
           typeof obj.token_type    === "string" &&
           typeof obj.expires_in    === "number" &&
           typeof obj.scope         === "string"
}

export function constructOAuthTokens(obj: any): oauth_tokens {
    if (!isOAuthToken(obj))
        throw new Error('Not an OAuth token')

    return {
        access_token: obj.access_token,
        token_type: obj.token_type,
        scope: obj.scope,
        expires: obj.expires_in * 1000 + Date.now(),
        refresh_token: obj.refresh_token,
    }
}
