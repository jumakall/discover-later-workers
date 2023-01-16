export interface playlist_configuration {
    source:      playlist // ID of the source playlist
    destination: playlist // ID of the destination playlist
}

export interface playlist {
    id?: string
    name: string
}
