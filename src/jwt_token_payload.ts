import { playlist_configuration } from "./playlist"
import { getUserId, User } from "./User"

export const JWT_TOKEN_VERSION = 1

export interface jwt_token_payload {
    token_version: number
    user_id: string
    display_name: string
    playlists: playlist_configuration[]
}

export function createJwtTokenPayload(user: User): jwt_token_payload {
    return {
        token_version: JWT_TOKEN_VERSION,
        user_id: getUserId(user),
        display_name: user.display_name,
        playlists: user.playlists,
    }
}

export function isJwtTokenPayload(obj: any): boolean {
    return typeof obj.token_version === "number" &&
           typeof obj.user_id === "string" &&
           typeof obj.display_name === "string" &&
           typeof obj.playlists === "object"
}
