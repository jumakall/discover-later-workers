import jwt from '@tsndr/cloudflare-worker-jwt'
import { createJwtTokenPayload } from './jwt_token_payload'

import { middleware } from './middleware'
import { playlist_configuration } from './playlist'
import { Spotify } from "./Spotify"
import { loadUser, saveUser, User } from './User'

const CONFIG = {
    Playlists: [
        { 
            source:      { name: "Discover Weekly", id: "37i9dQZEVXcLIrN8xZwJsJ" },
            destination: { name: "Discover Later" },
        } as playlist_configuration,
        { 
            source:      { name: "Release Radar", id: "37i9dQZEVXbuwV3df6MMCY" },
            destination: { name: "Already Released" },
        } as playlist_configuration,
    ],
}

function _respond(status: number = 200, message?: string, body?: object): Response {
    // response headers
    const opts = {
        headers: {
            'Content-Type': 'application/json'
        },
        status: status,
    }

    // response body
    const resp = {
        success: status >= 200 && status < 300,
        message: message,
        ...body
    }

    // send response
    return new Response(
        JSON.stringify(resp),
        opts
    )
}

function respond(status: number = 200, message?: string): Response {
    return _respond(status, message)
}

async function respondWithUser(secret: string, user: User, status: number = 200, message?: string): Promise<Response> {
    return _respond(status, message, {
        token: await jwt.sign(createJwtTokenPayload(user), secret)
    })
}

export default {
    async fetch(request, env) {
        try {
            // make sure app secret is set
            if (!env.APP_SECRET) {
                throw new Error('APP_SECRET not set')
            }

            // initialize Spotify API
            const spotify = new Spotify(
                "playlist-read-private playlist-modify-private",
                env.SPOTIFY_CLIENT_ID,
                env.SPOTIFY_CLIENT_SECRET,
                (new URL(request.url)).origin + "/callback/spotify",
            )

            // parse url
            const { search, pathname } = new URL(request.url);
            const params = new URLSearchParams(search)

            // initiate OAuth flow
            if (pathname.startsWith("/login/spotify")) {
                return Response.redirect(spotify.getLoginURL(), 302);
            }

            // process callback
            if (pathname.startsWith("/callback/spotify")) {
                // handle Spotify error
                if (params.has('error'))
                    return respond(401, 'Spotify API returned an error: ' + params.get('error'))

                // make sure the code is included in the request
                if (!params.has('code'))
                    return respond(400, 'Code is required')

                const code = params.get('code') as string

                // exchange authorization code for access token and refresh token
                const oauth_token = await spotify.getAccessToken(code)

                // get current user profile
                const profile = await spotify.getCurrentProfile()

                // to do: get playlists from kv

                const user = {
                    service: 'spotify',
                    external_user_id: profile.id,
                    display_name: profile.display_name,
                    oauth_token: oauth_token,
                    playlists: [],
                } as User

                // save user info to KV
                await saveUser(user, env.discover_later_kv)

                const playlists: playlist_configuration[] = []
                for (let pl of CONFIG.Playlists) {
                    // to do: check if configuration already exists
                    playlists.push(JSON.parse(JSON.stringify(pl)))
                }
                user.playlists = playlists

                // generate token
                const jwtToken = await jwt.sign(
                    createJwtTokenPayload(user),
                    env.APP_SECRET
                )

                return Response.redirect((new URL(request.url)).origin + '/dump-token?token=' + jwtToken, 302);

                // return a response
                return respondWithUser(env.APP_SECRET, user, 200)
            }

            // a valid jwt token is required from this point forward
            const payload = await middleware.authenticate(request, env)
            
            // load user details from kv
            const user = await loadUser(payload.user_id, env.discover_later_kv)

            // check that the user exists
            if (user === null) {
                throw new Error('external_user_id is missing, please login again')
            }

            // set oauth token for Spotify API
            console.log(JSON.stringify(user))
            console.log(JSON.stringify(user.oauth_token))
            spotify.setAuthorization(user.oauth_token)

            // for debugging purposes
            if (pathname.startsWith("/dump-token")) {
                return new Response(
                    JSON.stringify(
                        jwt.decode(params.get('token') as string)
                    ), {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                )
            }

            if (pathname.startsWith("/enable-playlist")) {
                // find settings from global list
                if (!params.has('id'))
                    return respond(400, 'id is required')

                const config = CONFIG.Playlists.filter(pl => pl.source.id === params.get('id'))
                
                // create (to do: or find) target playlist id
                for (let c of config) {
                    const id = await spotify.createPlaylist(user.external_user_id, c.destination.name, false, "Contains songs from your Discover Weekly playlist, so you can get back to these at any time.")
                    c.destination.id = id
                }

                // attach configuration to user
                user.playlists.push(...config)

                // save user info to KV
                await env.discover_later_kv.put(payload.user_id, JSON.stringify(user))

                // return user
                return respondWithUser(env.APP_SECRET, user, 200, 'Playlist enabled')
            }

            return new Response("FALL THROUGH!")
        } catch (err: any) {
            return respond(400, err.message)
        }
    }
}