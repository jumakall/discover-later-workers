import jwt from '@tsndr/cloudflare-worker-jwt'
import { isJwtTokenPayload, jwt_token_payload, JWT_TOKEN_VERSION } from './jwt_token_payload';

export class middleware {
    static async authenticate(request, env): Promise<jwt_token_payload> {
        const { search } = new URL(request.url);
        const params = new URLSearchParams(search);

        // authentication gate, everything after this must be authenticated with a valid token
        if (!params.has('token')) {
            throw new Error('token is missing');
        }

        // get the token
        const token = params.get('token') as string;

        // validate token
        if (!await jwt.verify(token, env.APP_SECRET)) {
            throw new Error('invalid token');
        }

        // decode payload
        const rawPayload = jwt.decode(token).payload;

        if (!isJwtTokenPayload(rawPayload)) {
            throw new Error('invalid token payload');
        }

        const payload = rawPayload as jwt_token_payload

        if (payload.token_version !== JWT_TOKEN_VERSION) {
            throw new Error('token version mismatch')
        }

        return payload
    }
}