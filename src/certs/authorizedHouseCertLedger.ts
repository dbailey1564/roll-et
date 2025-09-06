import { HouseCert } from './houseCert'

export interface AuthorizedHouseCertLedgerEntry {
  houseId: string
  kid: string
  signature: string
}

export const authorizedHouseCertLedger: AuthorizedHouseCertLedgerEntry[] = []

export const houseCertRootPublicKeyJwk: JsonWebKey = {
  kty: 'EC',
  crv: 'P-256',
  x: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  y: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  ext: true,
}

export function isAuthorizedHouseCert(cert: HouseCert): boolean {
  return authorizedHouseCertLedger.some(
    entry =>
      entry.houseId === cert.payload.houseId &&
      entry.kid === cert.payload.kid &&
      entry.signature === cert.signature
  )
}
