import { oauth_tokens } from "./oauth_token"
import { playlist_configuration } from "./playlist"

export interface User {
    service: string // eg. spotify
    external_user_id: string
    display_name: string
    email: string

    oauth_token: oauth_tokens

    playlists: playlist_configuration[]
}

export async function saveUser(user: User, kv: any) {
    await kv.put(getUserId(user), JSON.stringify(user))
}

export async function loadUser(userID: string, kv: any): Promise<User> {
    return JSON.parse(await kv.get(userID))
}

export function getUserId(user: User): string {
    return user.service + '-' + user.external_user_id
}
