# Discover Later Workers
> This project is still under heavy development, big changes are expected!

This repository contains code for Discover Later API, which runs on top on Cloudflare Workers.

## Register Spotify Developer application
Spotify integration requires registering an Spotify Developer app, register one here: (Spotify for Developers Dashboard) [https://developer.spotify.com/dashboard/]. You need Client ID and Client Secret, these should be set to SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET variables respectively.

## Generate APP_SECRET
APP_SECRET variable is required for JWT signatures, you can generate it like this.
> openssl rand -base64 128
