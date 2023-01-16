import { constructOAuthTokens, isOAuthToken, oauth_tokens } from "./oauth_token"
import { User } from "./User"

interface SpotifyProfile {
    display_name: string
    id: string
}

export class Spotify {
    SCOPE: string
    CLIENT_ID: string
    CLIENT_SECRET: string
    REDIRECT_URI: string

    OAUTH_TOKEN?: oauth_tokens

    constructor(scope: string, client_id: string, client_secret: string, redirect_uri: string) {
        this.SCOPE = scope
        this.CLIENT_ID = client_id
        this.CLIENT_SECRET = client_secret
        this.REDIRECT_URI = "http://127.0.0.1:8787/callback/spotify" //redirect_uri
    }

    private async makeRequest(url: string, init?: RequestInit<RequestInitCfProperties>): Promise<any> {
        const rawResponse =  await fetch(url, init)
        const jsonResponse = await rawResponse.json() as any

        if (jsonResponse.error || (rawResponse.status >= 400 && rawResponse.status < 600)) 
            throw new Error('Spotify API returned an error: ' + jsonResponse?.error?.status + " " + jsonResponse?.error?.message)

        return jsonResponse
    }

    private getClientAuthorizationHeaders(): Headers {
        const headers = new Headers();
        headers.append('Authorization', "Basic " + btoa(this.CLIENT_ID + ':' + this.CLIENT_SECRET));
        headers.append('Accept', 'application/json')
        return headers
    }

    private getUserAuthorizationHeaders(): Headers {
        // make sure the ACCESS_TOKEN is set
        if (!this.OAUTH_TOKEN) {
            throw new Error('Not logged in to Spotify API');
        }

        const headers = new Headers();
        headers.append('Authorization', "Bearer " + this.OAUTH_TOKEN.access_token);
        headers.append('Content-Type', 'application/json')
        headers.append('Accept', 'application/json');
        return headers
    }

    getLoginURL(): string {
        const qparam = new URLSearchParams({
            response_type: 'code',
            client_id: this.CLIENT_ID,
            scope: this.SCOPE,
            redirect_uri: this.REDIRECT_URI
        });
  
        return "https://accounts.spotify.com/authorize?" + qparam.toString()
    }

    async getAccessToken(code: string): Promise<oauth_tokens> {
        const headers = this.getClientAuthorizationHeaders()
        headers.append('Content-Type', 'application/x-www-form-urlencoded');

        const body = new URLSearchParams();
        body.append('grant_type', 'authorization_code');
        body.append('code', code);
        body.append('redirect_uri', this.REDIRECT_URI)

        const init = {
            method: 'post',
            headers: headers,
            body: body,
        }

        // send API request
        const resp = await this.makeRequest("https://accounts.spotify.com/api/token", init)

        // validate API response
        if (!isOAuthToken(resp)) {
            throw new Error('Unexpected response from Spotify API')
        }

        const tokens = constructOAuthTokens(resp)
        this.setAuthorization(tokens)

        return tokens
    }

    setAuthorization(authorization: oauth_tokens) {
        this.OAUTH_TOKEN = authorization
    }

    async getCurrentProfile(): Promise<SpotifyProfile> {
        const headers = this.getUserAuthorizationHeaders()

        const opts = {
            headers: headers,
        }

        return await this.makeRequest("https://api.spotify.com/v1/me", opts) as SpotifyProfile
    }

    async createPlaylist(userID: string, name: string, publicVisibility: boolean = false, description?: string): Promise<string> {
        const headers = this.getUserAuthorizationHeaders()

        const body = {
            name: name,
            public: publicVisibility,
            description: description
        }

        const opts = {
            method: 'post',
            headers: headers,
            body: JSON.stringify(body)
        }

        const resp = await this.makeRequest("https://api.spotify.com/v1/users/" + userID + "/playlists", opts)
        return resp.id
    }
}
