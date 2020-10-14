import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import { verifyCredential, checkCredential } from './credentials';
import DIDResolver from '../../did-resolver'; // eslint-disable-line

import defaultDocumentLoader from './document-loader';
import { getSuiteFromKeyDoc, expandJSONLD } from './helpers';
import { isRevocationCheckNeeded, checkRevocationStatus } from '../revocation';
import { getAndValidateSchemaIfPresent } from './schema';

import {
  expandedCredentialProperty,
  credentialContextField,
  DEFAULT_CONTEXT_V1_URL,
} from './constants';

import {
  EcdsaSepc256k1Signature2019, Ed25519Signature2018, Sr25519Signature2020,
} from './custom_crypto';

const { AuthenticationProofPurpose } = jsigs.purposes;

/**
 * @typedef {object} VerifiablePresentation Representation of a Verifiable Presentation.
 */

/**
 * @param {object} presentation - An object that could be a presentation.
 * @throws {Error}
 * @private
 */
function checkPresentation(presentation) {
  // normalize to an array to allow the common case of context being a string
  const context = Array.isArray(presentation['@context'])
    ? presentation['@context'] : [presentation['@context']];

  // ensure first context is 'https://www.w3.org/2018/credentials/v1'
  if (context[0] !== DEFAULT_CONTEXT_V1_URL) {
    throw new Error(
      `"${DEFAULT_CONTEXT_V1_URL}" needs to be first in the `
      + 'list of contexts.',
    );
  }

  const types = jsonld.getValues(presentation, 'type');

  // check type presence
  if (!types.includes('VerifiablePresentation')) {
    throw new Error('"type" must include "VerifiablePresentation".');
  }
}

export async function verifyPresentationCredentials(presentation, options = {}) {
  let verified = true;
  let credentialResults = [];
  const credentials = jsonld.getValues(presentation, 'verifiableCredential');
  if (credentials.length > 0) {
    // verify every credential in `verifiableCredential`
    credentialResults = await Promise.all(credentials.map((credential) => verifyCredential(credential, { ...options })));

    for (const [i, credentialResult] of credentialResults.entries()) {
      credentialResult.credentialId = credentials[i].id;
    }

    const allCredentialsVerified = credentialResults.every((r) => r.verified);
    if (!allCredentialsVerified) {
      verified = false;
    }
  }

  return {
    verified,
    credentialResults,
  };
}

/**
* @typedef {object} VerifiableParams The Options to verify credentials and presentations.
* @property {string} [challenge] - proof challenge Required.
* @property {string} [domain] - proof domain (optional)
* @property {DIDResolver} [resolver] - Resolver to resolve the issuer DID (optional)
* @property {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
* @property {Boolean} [forceRevocationCheck] - Whether to force revocation check or not.
* Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
* @property {object} [revocationApi] - An object representing a map. "revocation type -> revocation API". The API is used to check
* revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
* as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
* @property {object} [schemaApi] - An object representing a map. "schema type -> schema API". The API is used to get
* a schema doc. For now, the object specifies the type as key and the value as the API, but the structure can change
* as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
* @property {object} [documentLoader] - A document loader, can be null and use the default
*/

/**
 * Verify a Verifiable Presentation. Returns the verification status and error in an object
 * @param {object} presentation The verifiable presentation
 * @param {VerifiableParams} Verify parameters
 * @return {Promise<object>} verification result. The returned object will have a key `verified` which is true if the
 * presentation is valid and all the credentials are valid and not revoked and false otherwise. The `error` will
 * describe the error if any.
 */
export async function verifyPresentation(presentation, {
  challenge,
  domain,
  resolver = null,
  compactProof = true,
  forceRevocationCheck = true,
  revocationApi = null,
  schemaApi = null,
  unsignedPresentation = false,
  presentationPurpose = null,
  controller = null,
} = {}) {
  if (!presentation) {
    throw new TypeError('"presentation" property is required',);
  }

  checkPresentation(presentation);

  let result;
  const options = {
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020()],
    challenge,
    controller,
    domain,
    documentLoader: defaultDocumentLoader(resolver),
    compactProof,
    resolver,
    forceRevocationCheck,
    revocationApi,
    schemaApi,
  };

  // TODO: verify proof then credentials
  let { verified, credentialResults } = await verifyPresentationCredentials(presentation, options);
  try {
    // Skip proof validation for unsigned
    if (unsignedPresentation) {
      result = { verified, results: [presentation], credentialResults };
    } else {
      // early out incase credentials arent verified
      if (!verified) {
        result = { verified, results: [presentation], credentialResults };
      } else {
        // Get proof purpose
        if (!presentationPurpose && !challenge) {
          throw new Error(
            'A "challenge" param is required for AuthenticationProofPurpose.',
          );
        }

        const purpose = presentationPurpose || new AuthenticationProofPurpose({ controller, domain, challenge });
        const presentationResult = await jsigs.verify(
          presentation, { purpose, ...options },
        );

        result = {
          presentationResult,
          credentialResults,
          verified: verified && presentationResult.verified,
          error: presentationResult.error,
        };
      }
    }
  } catch (error) {
    result = {
      verified: false,
      results: [{ verified: false, error }],
      error,
    };
  }

  return result;
}

/**
 * Sign a Verifiable Presentation
 * @param {object} presentation - the one to be signed
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {string} challenge - proof challenge Required.
 * @param {string} domain - proof domain (optional)
 * @param {DIDResolver} [resolver] - Resolver for DIDs.
 * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @return {Promise<VerifiablePresentation>} A VerifiablePresentation with a proof.
 */
export async function signPresentation(presentation, keyDoc, challenge, domain, resolver = null, compactProof = true) {
  // TODO: support other purposes than the default of "authentication"
  const suite = getSuiteFromKeyDoc(keyDoc);
  const options = {
    suite,
    domain,
    challenge,
    compactProof,
  };

  const purpose = options.purpose || new AuthenticationProofPurpose({
    domain,
    challenge,
  });

  const documentLoader = defaultDocumentLoader(resolver);
  return jsigs.sign(presentation, { purpose, documentLoader, ...options });
}
