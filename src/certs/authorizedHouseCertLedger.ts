import { HouseCert } from './houseCert';
import rootPublicKeyJwk from '../../.sec/root_public_jwk.json';

export interface AuthorizedHouseCertLedgerEntry {
  houseId: string;
  kid: string;
  signature: string;
}

export const authorizedHouseCertLedger: AuthorizedHouseCertLedgerEntry[] = [
  {
    houseId: 'house-1',
    kid: 'k1',
    signature:
      'OJ2s-h_XV1ryLjfZdr41msgSw9umYKHpHPKlHn9KbRCOq75eht4DnuxauDgKVOyC3Fela_KWCRE1WxDFoVMj-Q',
  },
];

export const houseCertRootPublicKeyJwk = rootPublicKeyJwk as JsonWebKey;

export function isAuthorizedHouseCert(cert: HouseCert): boolean {
  return authorizedHouseCertLedger.some(
    (entry) =>
      entry.houseId === cert.payload.houseId &&
      entry.kid === cert.payload.kid &&
      entry.signature === cert.signature,
  );
}
