import {
  issueCredential,
  verifyCredential,
  createPresentation,
  verifyPresentation,
  signPresentation
} from '../../src/utils/vc';
import VerifiableCredential from '../../src/verifiable-credential';
import VerifiablePresentation from '../../src/verifiable-presentation';

function getSampleCredential(signed=false){
  let cred = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ],
    id: 'https://example.com/credentials/1872',
    type: ['VerifiableCredential', 'AlumniCredential'],
    issuanceDate: '2010-01-01T19:23:24Z',
    credentialSubject: {
      id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
      alumniOf: 'Example University'
    }
  };
  if (signed) {
    cred = {
      ...cred,
      issuer: 'https://gist.githubusercontent.com/faustow/3b48e353a9d5146e05a9c344e02c8c6f/raw',
      proof: {
        type: 'EcdsaSecp256k1Signature2019',
        created: '2020-03-27T17:44:28Z',
        jws: 'eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ..MEQCIAS8ZNVYIni3oShb0TFz4SMAybJcz3HkQPaTdz9OSszoAiA01w9ZkS4Zx5HEZk45QzxbqOr8eRlgMdhgFsFs1FnyMQ',
        proofPurpose: 'assertionMethod',
        verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
      }
    };
  }
  return cred;
}

function getSamplePres(signed=false){
  let vp = {
    '@context': [ 'https://www.w3.org/2018/credentials/v1' ],
    type: [ 'VerifiablePresentation' ],
    verifiableCredential: presentationCredentials,
    id: vpId,
    holder: vpHolder
  };
  if (signed){
    vp = {
      ...vp,
      proof: {
        type: 'EcdsaSecp256k1Signature2019',
        created: expect.anything(),
        challenge: 'some_challenge',
        domain: 'some_domain',
        jws: expect.anything(),
        proofPurpose: 'authentication',
        verificationMethod: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw'
      }
    };
  }
  return vp;
}

function getSampleKey() {
  return {
    id: 'https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw',
    controller: 'https://gist.githubusercontent.com/faustow/3b48e353a9d5146e05a9c344e02c8c6f/raw',
    type: 'EcdsaSecp256k1VerificationKey2019',
    privateKeyBase58: 'D1HHZntuEUXuQm56VeHv1Ae1c4Rd1mdVeamm2BPKom3y',
    publicKeyBase58: 'zXwDsGkuq5gTLVMnb3jGUaW8vvzAjfZfNuJmP2PkZGJy'
  };
}
const vpId = 'https://example.com/credentials/12345';
const vpHolder = 'https://example.com/credentials/1234567890';
const presentationCredentials = [getSampleCredential(true), getSampleCredential(true)];

const fakeContext = {
  '@context': {
    '@protected': true,

    'id': '@id',
    'type': '@type',
  }
};

describe('Verifiable Credential Issuing', () => {
  test('Issuing should return an object with a proof, and it must pass validation.', async () => {
    const credential = await issueCredential(getSampleKey(), getSampleCredential());
    expect(credential.id).toBe('https://example.com/credentials/1872');
    expect(credential.type).toContain('VerifiableCredential');
    expect(credential.type).toContain('AlumniCredential');
    expect(credential.issuanceDate).toBe('2010-01-01T19:23:24Z');
    expect(credential.credentialSubject.id).toBe('did:example:ebfeb1f712ebc6f1c276e12ec21');
    expect(credential.credentialSubject.alumniOf).toBe('Example University');
    expect(credential.issuer).toBe('https://gist.githubusercontent.com/faustow/3b48e353a9d5146e05a9c344e02c8c6f/raw');
    expect(credential.proof.type).toBe('EcdsaSecp256k1Signature2019');
    expect(credential.proof.created).toBeDefined();
    expect(credential.proof.jws).toBeDefined();
    expect(credential.proof.proofPurpose).toBe('assertionMethod');
    expect(credential.proof.verificationMethod).toBe('https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw');

    const result = await verifyCredential(credential);
    expect(result.verified).toBe(true);
    expect(result.results[0].proof).toBeDefined();
    expect(result.results[0].verified).toBe(true);

  }, 30000);
});

describe('Verifiable Credential Verification', () => {
  test('The sample signed credential should pass verification.', async () => {
    const result = await verifyCredential(getSampleCredential(true));
    expect(result.verified).toBe(true);
    expect(result.results[0].proof['@context']).toBe('https://w3id.org/security/v2');
    expect(result.results[0].proof.created).toBeDefined();
    expect(result.results[0].proof.jws).toBeDefined();
    expect(result.results[0].proof.proofPurpose).toBe('assertionMethod');
    expect(result.results[0].proof.type).toBe('EcdsaSecp256k1Signature2019');
    expect(result.results[0].proof.verificationMethod).toBe('https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw');
    expect(result.results[0].verified).toBe(true);
  }, 30000);
});

describe('Verifiable Presentation creation', () => {
  test('A proper verifiable presentation should be created from two valid sample credentials.', async () => {
    const presentation = createPresentation(
      presentationCredentials,
      vpId,
      vpHolder
    );
    expect(presentation).toMatchObject(getSamplePres());
  }, 30000);

  test('A verifiable presentation should contain a proof once signed, and it should pass verification.', async () => {
    const signedVp = await signPresentation(
      getSamplePres(),
      getSampleKey(),
      'some_challenge',
      'some_domain',
    );
    expect(signedVp).toMatchObject(getSamplePres(true));
    const results = await verifyPresentation(
      signedVp,
      'some_challenge',
      'some_domain'
    );


    expect(results.presentationResult.verified).toBe(true);
    expect(results.presentationResult.results[0].proof['@context']).toBe('https://w3id.org/security/v2');
    expect(results.presentationResult.results[0].proof.type).toBe('EcdsaSecp256k1Signature2019');
    expect(results.presentationResult.results[0].proof.created).toBeDefined();
    expect(results.presentationResult.results[0].proof.challenge).toBe('some_challenge');
    expect(results.presentationResult.results[0].proof.domain).toBe('some_domain');
    expect(results.presentationResult.results[0].proof.jws).toBeDefined();
    expect(results.presentationResult.results[0].proof.proofPurpose).toBe('authentication');
    expect(results.presentationResult.results[0].proof.verificationMethod).toBe('https://gist.githubusercontent.com/faustow/13f43164c571cf839044b60661173935/raw');
    expect(results.presentationResult.results[0].verified).toBe(true);
    expect(results.verified).toBe(true);
    expect(results.credentialResults[0].verified).toBe(true);
    expect(results.credentialResults[0].results).toBeDefined();
    expect(results.credentialResults[1].verified).toBe(true);
    expect(results.credentialResults[1].results).toBeDefined();
    expect(results.error).toBe(undefined);
  }, 30000);
});

describe('Verifiable Credential incremental creation', () => {
  test('VC creation with only id should be possible, yet bring default values', async () => {
    let credential = new VerifiableCredential('blabla');
    expect(credential.id).toBe('blabla');
    expect(credential.context).toEqual(['https://www.w3.org/2018/credentials/v1']);
    expect(credential.type).toEqual(['VerifiableCredential']);
    expect(credential.issuanceDate).toEqual(expect.anything());
  });

  test('VC creation with an object context should be possible', async () => {
    let credential = new VerifiableCredential('blabla');
    credential.addContext(fakeContext);
    expect(credential.context).toEqual(['https://www.w3.org/2018/credentials/v1', fakeContext]);
  });

  test('JSON representation of a VC should bring the proper keys', async () => {
    let credential = new VerifiableCredential('blabla');
    const credentialJSON = credential.toJSON();
    expect(credentialJSON['@context']).toContain('https://www.w3.org/2018/credentials/v1');
    expect(credentialJSON.id).toBe('blabla');
    expect(credentialJSON.credentialSubject).toEqual([]);
    expect(credentialJSON.type).toEqual(['VerifiableCredential']);
    expect(credentialJSON.issuanceDate).toBeDefined();
  });

  test('Incremental VC creation should be possible', async () => {
    let credential = new VerifiableCredential('blabla');
    expect(credential.id).toBe('blabla');

    credential.addContext('https://www.w3.org/2018/credentials/examples/v1');
    expect(credential.context).toEqual([
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ]);
    credential.addType('some_type');
    expect(credential.type).toEqual([
      'VerifiableCredential',
      'some_type'
    ]);
    credential.addSubject({id: 'some_subject_id'});
    expect(credential.subject).toEqual([{id: 'some_subject_id'}]);
    credential.setStatus({id: 'some_status_id', type: 'CredentialStatusList2017'});
    expect(credential.status).toEqual({id: 'some_status_id', type: 'CredentialStatusList2017'});
    credential.setIssuanceDate('2020-03-18T19:23:24Z');
    expect(credential.issuanceDate).toEqual('2020-03-18T19:23:24Z');
    credential.setExpirationDate('2021-03-18T19:23:24Z');
    expect(credential.expirationDate).toEqual('2021-03-18T19:23:24Z');
  });

  test('Incremental VC creations runs basic validation', async () => {
    expect(() => {
      new VerifiableCredential({key: 'value'});
    }).toThrowError('needs to be a string.');

    let credential = new VerifiableCredential('blabla');
    expect(() => {
      credential.addContext(123);
    }).toThrowError('needs to be a string.');

    expect(() => {
      credential.addType(123);
    }).toThrowError('needs to be a string.');

    expect(() => {
      credential.addSubject({some: 'value'});
    }).toThrowError('"credentialSubject" must include the \'id\' property.');

    expect(() => {
      credential.setStatus({some: 'value', type: 'something'});
    }).toThrowError('"credentialStatus" must include the \'id\' property.');
    expect(() => {
      credential.setStatus({id: 'value', some: 'value'});
    }).toThrowError('"credentialStatus" must include a type.');

    expect(() => {
      credential.setIssuanceDate('2020');
    }).toThrowError('needs to be a valid datetime.');

    expect(() => {
      credential.setExpirationDate('2020');
    }).toThrowError('needs to be a valid datetime.');

    await expect(credential.verify()).rejects.toThrowError('The current Verifiable Credential has no proof.');

  });

  test('Issuing an incrementally-created VC should return an object with a proof, and it must pass validation.', async () => {
    let unsignedCredential = new VerifiableCredential('https://example.com/credentials/1872');
    unsignedCredential.addContext('https://www.w3.org/2018/credentials/examples/v1');
    const signedCredential = await unsignedCredential.sign(getSampleKey());
    expect(signedCredential.proof).toBeDefined();
    const result = await signedCredential.verify();
    expect(result.verified).toBe(true);
    expect(result.results[0].proof).toBeDefined();
    expect(result.results[0].verified).toBe(true);
  }, 30000);
});

describe('Verifiable Presentation incremental creation', () => {
  test('VP creation with only id should be possible, yet bring default values', async () => {
    let vp = new VerifiablePresentation('blabla');
    expect(vp.id).toBe('blabla');
    expect(vp.context).toEqual(['https://www.w3.org/2018/credentials/v1']);
    expect(vp.type).toEqual(['VerifiablePresentation']);
    expect(vp.credentials).toEqual([]);
  });

  test('VP creation with an object context should be possible', async () => {
    let vp = new VerifiablePresentation('blabla');
    vp.addContext(fakeContext);
    expect(vp.context).toEqual(['https://www.w3.org/2018/credentials/v1', fakeContext]);
  });

  test('The JSON representation of a VP should bring the proper keys', async () => {
    let vp = new VerifiablePresentation('blabla');
    const vpJSON = vp.toJSON();
    expect(vpJSON['@context']).toContain('https://www.w3.org/2018/credentials/v1');
    expect(vpJSON.id).toBe('blabla');
    expect(vpJSON.type).toEqual(['VerifiablePresentation']);
    expect(vpJSON.verifiableCredential).toEqual([]);
  });

  test('Incremental VP creation should be possible', async () => {
    let vp = new VerifiablePresentation('blabla');
    expect(vp.id).toBe('blabla');

    vp.addContext('https://www.w3.org/2018/credentials/examples/v1');
    expect(vp.context).toEqual([
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ]);
    vp.addType('some_type');
    expect(vp.type).toEqual([
      'VerifiablePresentation',
      'some_type'
    ]);
    vp.addCredential({id: 'some_credential_id'});
    expect(vp.credentials).toEqual([{id: 'some_credential_id'}]);
  });

  test('Incremental VP creations runs basic validation', async () => {
    expect(() => {
      new VerifiablePresentation({key: 'value'});
    }).toThrowError('needs to be a string.');

    let vp = new VerifiablePresentation('blabla');
    expect(() => {
      vp.addContext(123);
    }).toThrowError('needs to be a string.');
    expect(() => {
      vp.addContext('123');
    }).toThrowError('needs to be a valid URI.');

    expect(() => {
      vp.addType(123);
    }).toThrowError('needs to be a string.');

    expect(() => {
      vp.addCredential({some: 'value'});
    }).toThrowError('"credential" must include the \'id\' property.');

    await expect(vp.verify()).rejects.toThrowError('The current VerifiablePresentation has no proof.');

  });

  test('Incremental VP creation from external VCs should be possible', async () => {
    let vp = new VerifiablePresentation(vpId);
    vp.addCredential(getSampleCredential(true));
    expect(vp.credentials).toEqual([getSampleCredential(true)]);
    await vp.sign(
      getSampleKey(),
      'some_challenge',
      'some_domain',
    );
    expect(vp.proof).toMatchObject({type: 'EcdsaSecp256k1Signature2019'});
    expect(vp.proof).toMatchObject({created: expect.anything()});
    expect(vp.proof).toMatchObject({challenge: 'some_challenge'});
    expect(vp.proof).toMatchObject({domain: 'some_domain'});
    expect(vp.proof).toMatchObject({jws: expect.anything()});
    expect(vp.proof).toMatchObject({proofPurpose: 'authentication'});
    expect(vp.proof).toMatchObject({verificationMethod: expect.anything()});

    // TODO: fix test is hanging here
    const results = await vp.verify(
      'some_challenge',
      'some_domain'
    );
    expect(results.presentationResult).toMatchObject({verified: true});
    expect(results.presentationResult.results[0]).toMatchObject({verified: true});
    expect(results.presentationResult.results[0]).toMatchObject({proof: expect.anything()});
    expect(results.credentialResults[0]).toMatchObject({verified: true});
    expect(results.credentialResults[0]).toMatchObject({results: expect.anything()});
  });


  test('Issuing an incrementally-created VP from an incrementally created VC should return an object with a proof, and it must pass validation.', async () => {
    let vc = new VerifiableCredential('https://example.com/credentials/1872');
    vc.addContext('https://www.w3.org/2018/credentials/examples/v1');
    vc.addType('AlumniCredential');
    vc.addSubject({
      id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
      alumniOf: 'Example University'
    });
    await vc.sign(getSampleKey());
    const vcVerificationResult = await vc.verify();
    expect(vcVerificationResult).toMatchObject({'verified': true});

    let vp = new VerifiablePresentation(vpId);
    vp.setHolder(vpHolder);
    vp.addCredential(vc);
    await vp.sign(
      getSampleKey(),
      'some_challenge',
      'some_domain',
    );
    expect(vp.proof).toMatchObject({type: 'EcdsaSecp256k1Signature2019'});
    expect(vp.proof).toMatchObject({created: expect.anything()});
    expect(vp.proof).toMatchObject({challenge: 'some_challenge'});
    expect(vp.proof).toMatchObject({domain: 'some_domain'});
    expect(vp.proof).toMatchObject({jws: expect.anything()});
    expect(vp.proof).toMatchObject({proofPurpose: 'authentication'});
    expect(vp.proof).toMatchObject({verificationMethod: expect.anything()});

    const results = await vp.verify(
      'some_challenge',
      'some_domain'
    );
    expect(results.presentationResult).toMatchObject({verified: true});
    expect(results.presentationResult.results[0]).toMatchObject({verified: true});
    expect(results.presentationResult.results[0]).toMatchObject({proof: expect.anything()});
    expect(results.credentialResults[0]).toMatchObject({verified: true});
    expect(results.credentialResults[0]).toMatchObject({results: expect.anything()});
  }, 30000);

});
