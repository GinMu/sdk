/* eslint-disable camelcase */

import OffchainSignatures from './offchain-signatures';
import PSPublicKey from '../offchain-signatures/public-keys/ps';
import PSParams from '../offchain-signatures/params/ps';

/** Class to write `Pointcheval-Sanders` parameters and keys on chain */
export default class PSModule extends OffchainSignatures {
  /**
   * sets the dock api for this module
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param {Function} signAndSend - Callback signing and sending
   */
  constructor(...args) {
    super(...args);
  }

  static buildParams(params) {
    return new PSParams(params)
  }

  static buildPublicKey(publicKey) {
    return new PSPublicKey(publicKey)
  }

  async queryParamsFromChain(hexDid, counter) {
    const params = await super.queryParamsFromChain(hexDid, counter);

    if (params?.isPs) {
      return params.asPs;
    } else {
      return null;
    }
  }

  async queryPublicKeyFromChain(hexDid, keyId) {
    const key = await super.queryPublicKeyFromChain(hexDid, keyId);

    if (key?.isPs) {
      return key.asPs
    } else {
      return null
    }
  }
}
